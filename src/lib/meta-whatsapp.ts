import axios, { AxiosError } from "axios";
import { formatWhatsAppPhone } from "@/lib/whatsapp/whatsapp-share";
import { resolveExternalMediaUrl } from "@/lib/aws/presign";
import type { WhatsAppExecutionResult, WhatsAppMode, WhatsAppSendOptions } from "@/lib/whatsapp-types";

export type MetaWhatsAppMode = WhatsAppMode;

export interface MetaSendOptions extends WhatsAppSendOptions {
  templateName?: string;
  languageCode?: string;
  components?: Array<Record<string, any>>;
}

export interface MetaTemplateComponent {
  type: "header" | "body" | "button";
  sub_type?: "url" | "quick_reply" | "catalog";
  index?: string | number;
  parameters: Array<{
    type: "text" | "currency" | "date_time" | "image" | "document" | "video";
    text?: string;
    image?: { link: string };
    document?: { link: string; filename?: string };
    [key: string]: any;
  }>;
}

function getSanitizedEnv(key: string): string {
  const raw = process.env[key];
  if (!raw) return "";
  const cleaned = raw.trim().replace(/^["']|["']$/g, "").trim();
  if (!cleaned) return "";
  const lower = cleaned.toLowerCase();
  if (
    lower.includes("placeholder") ||
    lower.includes("your_api_key") ||
    lower.includes("your_token") ||
    lower.startsWith("xxx")
  ) {
    return "";
  }
  return cleaned;
}

function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return "***";
  const start = phone.slice(0, phone.length > 10 ? 4 : 2);
  const end = phone.slice(-3);
  return `${start}****${end}`;
}

export function getMetaWhatsAppMode(type: "otp" | "notification" = "otp"): MetaWhatsAppMode {
  const metaSpecific = getSanitizedEnv("META_WHATSAPP_MODE").toLowerCase();
  if (metaSpecific === "live" || metaSpecific === "mock" || metaSpecific === "disabled") {
    return metaSpecific as MetaWhatsAppMode;
  }

  const mode = getSanitizedEnv(type === "otp" ? "META_OTP_MODE" : "META_NOTIFICATION_MODE").toLowerCase();
  if (mode === "live" || mode === "mock" || mode === "disabled") return mode;
  if (process.env.NODE_ENV === "test") return "mock";
  return getMetaConfig().accessToken ? "live" : "disabled";
}

function getMetaConfig(): {
  phoneNumberId: string;
  accessToken: string;
  apiVersion: string;
} {
  const phoneNumberId =
    getSanitizedEnv("META_WHATSAPP_PHONE_NUMBER_ID") ||
    getSanitizedEnv("META_PHONE_NUMBER_ID") ||
    getSanitizedEnv("WHATSAPP_PHONE_NUMBER_ID") ||
    getSanitizedEnv("PHONE_NUMBER_ID");

  const accessToken =
    getSanitizedEnv("META_WHATSAPP_ACCESS_TOKEN") ||
    getSanitizedEnv("META_ACCESS_TOKEN") ||
    getSanitizedEnv("WHATSAPP_ACCESS_TOKEN") ||
    getSanitizedEnv("META_WHATSAPP_TOKEN") ||
    getSanitizedEnv("WHATSAPP_TOKEN");

  const apiVersion =
    getSanitizedEnv("META_WHATSAPP_API_VERSION") ||
    getSanitizedEnv("META_API_VERSION") ||
    "v21.0";

  return { phoneNumberId, accessToken, apiVersion };
}

function classifyMetaError(err: unknown): {
  error: string;
  errorCategory: WhatsAppExecutionResult["errorCategory"];
  statusCode: number;
} {
  if (axios.isAxiosError(err)) {
    const axiosErr = err as AxiosError<any>;
    const status = axiosErr.response?.status || 500;
    const errorData = axiosErr.response?.data?.error;
    const metaCode = errorData?.code;
    const metaMessage = errorData?.message || errorData?.error_data?.details || axiosErr.message;

    // Meta error codes mapping:
    // 190: Invalid or expired access token
    if (metaCode === 190 || status === 401) {
      return {
        error: `Meta auth error (code ${metaCode}): ${metaMessage}`,
        errorCategory: "AUTH_ERROR",
        statusCode: 401,
      };
    }

    // 130429, 80007, or HTTP 429: Rate limit
    if (metaCode === 130429 || metaCode === 80007 || status === 429) {
      return {
        error: `Meta rate limit reached (code ${metaCode}): ${metaMessage}`,
        errorCategory: "RATE_LIMITED",
        statusCode: 429,
      };
    }

    // 131026: Undeliverable message / invalid phone
    if (metaCode === 131026 || metaCode === 131009) {
      return {
        error: `Recipient phone number is invalid or cannot receive WhatsApp messages (code ${metaCode})`,
        errorCategory: "INVALID_PHONE",
        statusCode: 400,
      };
    }

    // 131047: Re-engagement message outside 24h window (requires template)
    if (metaCode === 131047) {
      return {
        error: `Message outside 24-hour customer window. Pre-approved template required. (${metaMessage})`,
        errorCategory: "CONFIG_ERROR",
        statusCode: 403,
      };
    }

    // 132000, 132001: Template not found or not approved
    if (metaCode === 132000 || metaCode === 132001) {
      return {
        error: `Meta template not found or not approved (code ${metaCode}): ${metaMessage}`,
        errorCategory: "CONFIG_ERROR",
        statusCode: 404,
      };
    }

    if (axiosErr.code === "ECONNABORTED" || axiosErr.message.includes("timeout")) {
      return {
        error: "Meta Graph API request timed out.",
        errorCategory: "TIMEOUT",
        statusCode: 504,
      };
    }

    return {
      error: `Meta API error (${status} / ${metaCode || "UNKNOWN"}): ${metaMessage}`,
      errorCategory: "PROVIDER_UNAVAILABLE",
      statusCode: status,
    };
  }

  const genericMsg = err instanceof Error ? err.message : "Unknown error connecting to Meta Cloud API";
  return {
    error: genericMsg,
    errorCategory: "NETWORK_ERROR",
    statusCode: 500,
  };
}

export class MetaWhatsAppService {
  /**
   * Dispatches an HTTP request to Meta Graph API v21.0 with automatic retry for transient errors.
   */
  private static async executeGraphApi(
    payload: Record<string, any>,
    meta: {
      requestId: string;
      mode: MetaWhatsAppMode;
      startTime: number;
      logPrefix: string;
    }
  ): Promise<WhatsAppExecutionResult> {
    const { phoneNumberId, accessToken, apiVersion } = getMetaConfig();

    if (!phoneNumberId || !accessToken) {
      console.warn(
        `[META WHATSAPP ${meta.logPrefix}] Missing META_WHATSAPP_PHONE_NUMBER_ID or META_WHATSAPP_ACCESS_TOKEN`
      );
      return {
        success: false,
        error: "Meta WhatsApp credentials are not configured in environment variables.",
        errorCategory: "CONFIG_ERROR",
        statusCode: 503,
        durationMs: Date.now() - meta.startTime,
      };
    }

    const endpoint = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const response = await axios.post(endpoint, payload, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        });

        const data = response.data;
        const messageId = data?.messages?.[0]?.id;
        if (!messageId) return { success: false, error: "Meta did not return a message ID", errorCategory: "PROVIDER_UNAVAILABLE", statusCode: 502 };

        return {
          success: true,
          message: "Message dispatched via Meta WhatsApp Cloud API",
          id: messageId,
          statusCode: 200,
          durationMs: Date.now() - meta.startTime,
        };
      } catch (err: unknown) {
        const classified = classifyMetaError(err);

        // Retry only on HTTP 429 or 5xx server errors on the first attempt
        const isRetryable =
          attempts < maxAttempts &&
          (classified.statusCode === 429 ||
            (classified.statusCode >= 500 && classified.statusCode <= 599));

        if (isRetryable) {
          const delayMs = 1000 * attempts;
          console.warn(
            `[META WHATSAPP ${meta.logPrefix}] Request failed with ${classified.statusCode}. Retrying in ${delayMs}ms (attempt ${attempts}/${maxAttempts})...`
          );
          await new Promise((r) => setTimeout(r, delayMs));
          continue;
        }

        console.error(`[META WHATSAPP ${meta.logPrefix}] Failed:`, classified.error);
        return {
          success: false,
          error: classified.error,
          errorCategory: classified.errorCategory,
          statusCode: classified.statusCode,
          durationMs: Date.now() - meta.startTime,
        };
      }
    }

    return {
      success: false,
      error: "Meta WhatsApp Cloud API request failed after retry attempts.",
      errorCategory: "PROVIDER_UNAVAILABLE",
      statusCode: 502,
      durationMs: Date.now() - meta.startTime,
    };
  }

  /**
   * Send WhatsApp OTP Message via Meta WhatsApp Cloud API.
   * Uses the pre-approved AUTHENTICATION template if configured, or falls back to free-form text in dev.
   */
  static async sendOTPMessage(
    phone: string,
    otp: string,
    options?: MetaSendOptions
  ): Promise<WhatsAppExecutionResult> {
    const startTime = Date.now();
    const requestId = options?.requestId || `meta-otp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const cleanPhone = formatWhatsAppPhone(phone);

    if (!cleanPhone || cleanPhone.length < 10) {
      return {
        success: false,
        error: "Invalid recipient phone number",
        errorCategory: "INVALID_PHONE",
        durationMs: Date.now() - startTime,
      };
    }

    const mode = getMetaWhatsAppMode("otp");

    if (mode === "disabled") {
      return {
        success: false,
        error: "Meta WhatsApp OTP messaging is disabled.",
        errorCategory: "CONFIG_ERROR",
        durationMs: Date.now() - startTime,
      };
    }

    if (mode === "mock") {
      console.log(`[META MOCK OTP] Simulated OTP delivery to ${maskPhone(cleanPhone)} (Code: ${otp})`);
      return {
        success: true,
        message: "Meta WhatsApp OTP delivery simulated (QA mode)",
        id: `mock-meta-otp-${Date.now()}`,
        simulated: true,
        statusCode: 200,
        durationMs: Date.now() - startTime,
      };
    }

    const templateName =
      options?.templateName || getSanitizedEnv("META_OTP_TEMPLATE_NAME") || "road_auth_otp";
    const languageCode = options?.languageCode || getSanitizedEnv("META_TEMPLATE_LANGUAGE") || "en_US";
    const hasButton = getSanitizedEnv("META_OTP_HAS_BUTTON") !== "false";

    // Standard Meta WhatsApp OTP template format
    const components: MetaTemplateComponent[] = [
      {
        type: "body",
        parameters: [{ type: "text", text: otp }],
      },
    ];

    if (hasButton) {
      components.push({
        type: "button",
        sub_type: "url",
        index: "0",
        parameters: [{ type: "text", text: otp }],
      });
    }

    const templatePayload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: cleanPhone,
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
        components,
      },
    };

    const templateResult = await this.executeGraphApi(templatePayload, {
      requestId,
      mode,
      startTime,
      logPrefix: "OTP_TEMPLATE",
    });

    // If template succeeds, return immediately
    if (templateResult.success) {
      return templateResult;
    }

    // Optional dev/sandbox fallback: If template is not found (132000) and META_ALLOW_FREEFORM_OTP is true
    const allowFreeform = getSanitizedEnv("META_ALLOW_FREEFORM_OTP") === "true";
    if (allowFreeform && templateResult.errorCategory === "CONFIG_ERROR") {
      console.warn(
        `[META WHATSAPP OTP] Template '${templateName}' failed. Falling back to freeform text (dev mode)...`
      );
      return this.sendTextMessage(
        cleanPhone,
        `Your ROAD verification code is: *${otp}*. Valid for 5 minutes. Do not share this OTP.`,
        { requestId }
      );
    }

    return templateResult;
  }

  /**
   * Send Text / Notification Message via Meta WhatsApp Cloud API.
   *
   * Note on Meta Cloud API 24-Hour Policy:
   * - Business-initiated messages outside the 24-hour service window MUST use an approved template.
   * - Free-form text (type: "text") is dropped asynchronously by Meta if the recipient hasn't messaged within 24h.
   * - When allowFreeformOnly is true, sends direct freeform text (for active 24h chat replies).
   * - Otherwise, formats and delivers the notification via the pre-approved template (road_listing_update),
   *   falling back to freeform text if the template is not accessible.
   */
  static async sendTextMessage(
    phone: string,
    message: string,
    options?: MetaSendOptions
  ): Promise<WhatsAppExecutionResult> {
    const startTime = Date.now();
    const requestId = options?.requestId || `meta-txt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const cleanPhone = formatWhatsAppPhone(phone);

    if (!cleanPhone || cleanPhone.length < 10) {
      return {
        success: false,
        error: "Invalid recipient phone number",
        errorCategory: "INVALID_PHONE",
        durationMs: Date.now() - startTime,
      };
    }

    const mode = getMetaWhatsAppMode("notification");

    if (mode === "disabled") {
      return {
        success: false,
        error: "Meta WhatsApp messaging is disabled.",
        errorCategory: "CONFIG_ERROR",
        durationMs: Date.now() - startTime,
      };
    }

    if (mode === "mock") {
      console.log(`[META MOCK NOTIF] Simulated text to ${maskPhone(cleanPhone)}: "${message.slice(0, 60)}..."`);
      return {
        success: true,
        message: "Meta WhatsApp text delivery simulated (QA mode)",
        id: `mock-meta-txt-${Date.now()}`,
        simulated: true,
        statusCode: 200,
        durationMs: Date.now() - startTime,
      };
    }

    // 1. Explicit template requested
    if (options?.templateName) {
      return this.sendTemplateMessage(cleanPhone, options.templateName, {
        languageCode: options.languageCode,
        components: options.components as any,
        requestId,
      });
    }

    // 2. Explicit freeform requested (e.g. Concierge / active 24h chat conversation)
    if (options?.allowFreeformOnly) {
      const payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanPhone,
        type: "text",
        text: {
          preview_url: true,
          body: message,
        },
      };

      return this.executeGraphApi(payload, {
        requestId,
        mode,
        startTime,
        logPrefix: "TEXT_FREEFORM",
      });
    }

    // 3. Outbound Business Notification:
    // Sanitize parameter to comply with Meta's strict template rules:
    // Positional parameters cannot have newlines (\n, \r), tabs (\t), or 4+ consecutive spaces.
    const sanitizedParam = message
      .replace(/\r?\n+/g, " • ")
      .replace(/\s{2,}/g, " ")
      .replace(/[•\s]+$/, "")
      .trim()
      .slice(0, 1024);

    const templateName =
      getSanitizedEnv("META_NOTIFICATION_TEMPLATE_NAME") || "road_listing_update";
    const languageCode = options?.languageCode || getSanitizedEnv("META_TEMPLATE_LANGUAGE") || "en_US";

    const templatePayload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: cleanPhone,
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
        components: [
          {
            type: "body",
            parameters: [{ type: "text", text: sanitizedParam }],
          },
        ],
      },
    };

    const templateResult = await this.executeGraphApi(templatePayload, {
      requestId,
      mode,
      startTime,
      logPrefix: "NOTIF_TEMPLATE",
    });

    if (templateResult.success) {
      return templateResult;
    }

    // If template failed, fall back to direct freeform text
    console.warn(
      `[META WHATSAPP] Notification template '${templateName}' delivery failed (${templateResult.error}). Falling back to freeform text...`
    );

    const fallbackPayload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: cleanPhone,
      type: "text",
      text: {
        preview_url: true,
        body: message,
      },
    };

    return this.executeGraphApi(fallbackPayload, {
      requestId,
      mode,
      startTime,
      logPrefix: "FALLBACK_TEXT",
    });
  }

  /**
   * Send Image Message with Caption via Meta WhatsApp Cloud API.
   * The image URL must be publicly accessible over HTTPS.
   */
  static async sendImageMessage(
    phone: string,
    imageUrl: string,
    caption: string,
    options?: MetaSendOptions
  ): Promise<WhatsAppExecutionResult> {
    const rawUrl = (imageUrl || "").trim();
    const resolvedUrl = await resolveExternalMediaUrl(rawUrl).catch(() => rawUrl);

    try {
      const parsed = new URL(resolvedUrl);
      if (parsed.protocol !== "https:") throw new Error("HTTPS required");
    } catch {
      return {
        success: false,
        error: "Meta WhatsApp image must use a valid public HTTPS URL.",
        errorCategory: "CONFIG_ERROR",
      };
    }

    const startTime = Date.now();
    const requestId = options?.requestId || `meta-img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const cleanPhone = formatWhatsAppPhone(phone);

    if (!cleanPhone || cleanPhone.length < 10) {
      return {
        success: false,
        error: "Invalid recipient phone number",
        errorCategory: "INVALID_PHONE",
        durationMs: Date.now() - startTime,
      };
    }

    const mode = getMetaWhatsAppMode("notification");

    if (mode === "disabled") {
      return {
        success: false,
        error: "Meta WhatsApp image messaging is disabled.",
        errorCategory: "CONFIG_ERROR",
        durationMs: Date.now() - startTime,
      };
    }

    if (mode === "mock") {
      console.log(`[META MOCK IMAGE] Simulated image delivery to ${maskPhone(cleanPhone)}`);
      return {
        success: true,
        message: "Meta WhatsApp image delivery simulated (QA mode)",
        id: `mock-meta-img-${Date.now()}`,
        simulated: true,
        statusCode: 200,
        durationMs: Date.now() - startTime,
      };
    }

    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: cleanPhone,
      type: "image",
      image: {
        link: resolvedUrl,
        caption: caption || undefined,
      },
    };

    return this.executeGraphApi(payload, {
      requestId,
      mode,
      startTime,
      logPrefix: "IMAGE",
    });
  }

  /**
   * Send Pre-Approved Template Message via Meta WhatsApp Cloud API.
   * Used for business-initiated communications outside the 24-hour window (e.g. notifications, broadcasts).
   */
  static async sendTemplateMessage(
    phone: string,
    templateName: string,
    options?: {
      languageCode?: string;
      components?: MetaTemplateComponent[];
      requestId?: string;
    }
  ): Promise<WhatsAppExecutionResult> {
    const startTime = Date.now();
    const requestId = options?.requestId || `meta-tpl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const cleanPhone = formatWhatsAppPhone(phone);

    if (!cleanPhone || cleanPhone.length < 10) {
      return {
        success: false,
        error: "Invalid recipient phone number",
        errorCategory: "INVALID_PHONE",
        durationMs: Date.now() - startTime,
      };
    }

    const mode = getMetaWhatsAppMode("notification");

    if (mode === "disabled") {
      return {
        success: false,
        error: "Meta WhatsApp template messaging is disabled.",
        errorCategory: "CONFIG_ERROR",
        durationMs: Date.now() - startTime,
      };
    }

    if (mode === "mock") {
      console.log(`[META MOCK TPL] Simulated template '${templateName}' to ${maskPhone(cleanPhone)}`);
      return {
        success: true,
        message: "Meta WhatsApp template simulated (QA mode)",
        id: `mock-meta-tpl-${Date.now()}`,
        simulated: true,
        statusCode: 200,
        durationMs: Date.now() - startTime,
      };
    }

    const languageCode = options?.languageCode || getSanitizedEnv("META_TEMPLATE_LANGUAGE") || "en_US";

    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: cleanPhone,
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
        components: options?.components || [],
      },
    };

    return this.executeGraphApi(payload, {
      requestId,
      mode,
      startTime,
      logPrefix: "TEMPLATE",
    });
  }
}
