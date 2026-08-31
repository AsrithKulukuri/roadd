import { WasenderAPIResponse } from "@/types/auth";
import { formatWhatsAppPhone } from "@/lib/whatsapp/whatsapp-share";

export type WasenderMode = "disabled" | "mock" | "live";

export interface WasenderSendOptions {
  requestId?: string;
}

export interface WasenderExecutionResult extends WasenderAPIResponse {
  statusCode?: number;
  errorCategory?:
    | "CONFIG_ERROR"
    | "AUTH_ERROR"
    | "RATE_LIMITED"
    | "INVALID_PHONE"
    | "PROVIDER_UNAVAILABLE"
    | "TIMEOUT"
    | "NETWORK_ERROR";
  durationMs?: number;
}

/**
 * Sanitizes environment variable by trimming quotes, whitespace, and rejecting placeholder values.
 */
export function getSanitizedEnv(key: string): string {
  const raw = process.env[key];
  if (!raw) return "";
  const cleaned = raw.trim().replace(/^["']|["']$/g, "").trim();
  if (!cleaned) return "";

  // Reject generic placeholders
  const lower = cleaned.toLowerCase();
  if (
    lower.includes("placeholder") ||
    lower.includes("your_api_key") ||
    lower.includes("your_key") ||
    lower.startsWith("xxx")
  ) {
    return "";
  }

  return cleaned;
}

/**
 * Resolves Wasender mode specifically for Login/Authentication OTP delivery.
 * WASENDER_OTP_MODE takes precedence over WASENDER_MODE.
 */
export function getWasenderOtpMode(): WasenderMode {
  const specific = getSanitizedEnv("WASENDER_OTP_MODE").toLowerCase();
  if (specific === "live" || specific === "mock" || specific === "disabled") {
    return specific as WasenderMode;
  }

  const legacy = getSanitizedEnv("WASENDER_MODE").toLowerCase();
  if (legacy === "live" || legacy === "mock" || legacy === "disabled") {
    return legacy as WasenderMode;
  }

  // Automated test environment
  if (process.env.NODE_ENV === "test" || process.env.VITEST) {
    return "mock";
  }

  // In production, OTP delivery must default to live
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    return "live";
  }

  // In local dev, live is enabled when credentials exist; otherwise mock
  if (getSanitizedEnv("WASENDER_API_KEY")) {
    return "live";
  }

  return "mock";
}

/**
 * Resolves Wasender mode for builder/project-owner view notifications.
 * WASENDER_NOTIFICATION_MODE takes precedence over WASENDER_MODE.
 */
export function getWasenderNotificationMode(): WasenderMode {
  const specific = getSanitizedEnv("WASENDER_NOTIFICATION_MODE").toLowerCase();
  if (specific === "live" || specific === "mock" || specific === "disabled") {
    return specific as WasenderMode;
  }

  const legacy = getSanitizedEnv("WASENDER_MODE").toLowerCase();
  if (legacy === "live" || legacy === "mock" || legacy === "disabled") {
    return legacy as WasenderMode;
  }

  // In production, notifications default to live if credentials exist
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    return getSanitizedEnv("WASENDER_API_KEY") ? "live" : "disabled";
  }

  // In local development / test, default notifications to mock to prevent spamming real builders
  return "mock";
}

/**
 * Backward compatibility alias for legacy callers
 */
export function getWasenderMode(): WasenderMode {
  return getWasenderOtpMode();
}

function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) return "***";
  return `${phone.slice(0, 4)}****${phone.slice(-3)}`;
}

function isPhoneAllowlisted(phone: string): boolean {
  const allowlist = getSanitizedEnv("WASENDER_QA_ALLOWLIST")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  if (allowlist.length === 0) return true; // Empty allowlist allows all numbers in QA mock

  const clean = phone.replace(/\D/g, "");
  return allowlist.some((a) => clean.includes(a.replace(/\D/g, "")));
}

/**
 * Returns the standard, single documented Wasender send-message endpoint.
 */
export function getWasenderEndpoint(): string {
  const rawUrl = getSanitizedEnv("WASENDER_API_URL") || getSanitizedEnv("WASENDER_BASE_URL");
  if (rawUrl) {
    const cleaned = rawUrl.replace(/\/+$/, "");
    return cleaned.endsWith("/send-message") ? cleaned : `${cleaned}/send-message`;
  }
  return "https://wasenderapi.com/api/send-message";
}

/**
 * Sanitized diagnostic logger for server-side auditing.
 * Never logs API keys, full phone numbers, OTP values, or Authorization headers.
 */
function logWasenderDiagnostic(meta: {
  requestId: string;
  runtime: string;
  mode: WasenderMode;
  endpointHost: string;
  status: number | string;
  contentType?: string;
  errorCategory?: string;
  durationMs: number;
  success: boolean;
}) {
  console.log(
    `[WASENDER DIAGNOSTIC] [${new Date().toISOString()}] req=${meta.requestId} env=${meta.runtime} mode=${meta.mode} host=${meta.endpointHost} status=${meta.status} success=${meta.success} duration=${meta.durationMs}ms${meta.errorCategory ? ` category=${meta.errorCategory}` : ""}`
  );
}

/**
 * WasenderAPI Service
 * Industrial-grade WhatsApp OTP and notification client with separate OTP/Notification modes,
 * bounded retries with exponential backoff, and sanitized diagnostics.
 */
export class WasenderService {
  /**
   * Send WhatsApp OTP Message via WasenderAPI
   *
   * @param phone - Recipient phone number (e.g. +91XXXXXXXXXX)
   * @param otp - 6-digit OTP string
   * @param options - Additional options including requestId
   */
  static async sendOTPMessage(
    phone: string,
    otp: string,
    options?: WasenderSendOptions
  ): Promise<WasenderExecutionResult> {
    const startTime = Date.now();
    const requestId = options?.requestId || `otp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const cleanPhone = formatWhatsAppPhone(phone);

    if (!cleanPhone || cleanPhone.length < 10) {
      return {
        success: false,
        error: "Invalid recipient phone number",
        errorCategory: "INVALID_PHONE",
        durationMs: Date.now() - startTime,
      };
    }

    const mode = getWasenderOtpMode();
    const endpoint = getWasenderEndpoint();
    const endpointHost = new URL(endpoint).hostname;
    const runtime = process.env.VERCEL ? "vercel-production" : process.env.NODE_ENV || "development";

    if (mode === "disabled") {
      logWasenderDiagnostic({
        requestId,
        runtime,
        mode,
        endpointHost,
        status: "DISABLED",
        errorCategory: "CONFIG_ERROR",
        durationMs: Date.now() - startTime,
        success: false,
      });

      return {
        success: false,
        error: "WhatsApp OTP messaging is currently disabled.",
        errorCategory: "CONFIG_ERROR",
        durationMs: Date.now() - startTime,
      };
    }

    if (mode === "mock") {
      if (!isPhoneAllowlisted(cleanPhone)) {
        logWasenderDiagnostic({
          requestId,
          runtime,
          mode,
          endpointHost,
          status: "MOCK_REJECTED",
          errorCategory: "CONFIG_ERROR",
          durationMs: Date.now() - startTime,
          success: false,
        });

        return {
          success: false,
          error: "Phone number not permitted in mock mode.",
          errorCategory: "CONFIG_ERROR",
          durationMs: Date.now() - startTime,
        };
      }

      console.log(`[WASENDER MOCK OTP] Simulated OTP delivery to ${maskPhone(cleanPhone)} (QA mode)`);
      logWasenderDiagnostic({
        requestId,
        runtime,
        mode,
        endpointHost,
        status: 200,
        durationMs: Date.now() - startTime,
        success: true,
      });

      return {
        success: true,
        message: "WhatsApp OTP delivery simulated (QA mode)",
        id: `mock-${Date.now()}`,
        durationMs: Date.now() - startTime,
      };
    }

    // mode === "live"
    const apiKey = getSanitizedEnv("WASENDER_API_KEY");
    if (!apiKey) {
      logWasenderDiagnostic({
        requestId,
        runtime,
        mode,
        endpointHost,
        status: "MISSING_API_KEY",
        errorCategory: "CONFIG_ERROR",
        durationMs: Date.now() - startTime,
        success: false,
      });

      return {
        success: false,
        error: "WhatsApp provider configuration is missing.",
        errorCategory: "CONFIG_ERROR",
        durationMs: Date.now() - startTime,
      };
    }

    const message = `ROAD Verification\n\nYour OTP is:\n*${otp}*\n\nValid for 5 minutes.\nNever share this code with anyone.`;
    const payload = {
      to: cleanPhone,
      text: message,
    };

    return this.executeWithRetry(endpoint, apiKey, payload, {
      requestId,
      runtime,
      mode,
      endpointHost,
      startTime,
      logPrefix: "OTP",
    });
  }

  /**
   * Send Generic Text Message via WasenderAPI (for Builder view notifications)
   *
   * @param phone - Recipient phone number
   * @param message - Message body to send
   * @param options - Additional options
   */
  static async sendTextMessage(
    phone: string,
    message: string,
    options?: WasenderSendOptions
  ): Promise<WasenderExecutionResult> {
    const startTime = Date.now();
    const requestId = options?.requestId || `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const cleanPhone = formatWhatsAppPhone(phone);

    if (!cleanPhone || cleanPhone.length < 10) {
      return {
        success: false,
        error: "Invalid recipient phone number",
        errorCategory: "INVALID_PHONE",
        durationMs: Date.now() - startTime,
      };
    }

    const mode = getWasenderNotificationMode();
    const endpoint = getWasenderEndpoint();
    const endpointHost = new URL(endpoint).hostname;
    const runtime = process.env.VERCEL ? "vercel-production" : process.env.NODE_ENV || "development";

    if (mode === "disabled") {
      logWasenderDiagnostic({
        requestId,
        runtime,
        mode,
        endpointHost,
        status: "DISABLED",
        errorCategory: "CONFIG_ERROR",
        durationMs: Date.now() - startTime,
        success: false,
      });

      return {
        success: false,
        error: "WhatsApp notification messaging is disabled.",
        errorCategory: "CONFIG_ERROR",
        durationMs: Date.now() - startTime,
      };
    }

    if (mode === "mock") {
      console.log(`[WASENDER MOCK NOTIF] Simulated notification to ${maskPhone(cleanPhone)}`);
      logWasenderDiagnostic({
        requestId,
        runtime,
        mode,
        endpointHost,
        status: 200,
        durationMs: Date.now() - startTime,
        success: true,
      });

      return {
        success: true,
        message: "WhatsApp notification delivery simulated (QA mode)",
        id: `mock-notif-${Date.now()}`,
        durationMs: Date.now() - startTime,
      };
    }

    const apiKey = getSanitizedEnv("WASENDER_API_KEY");
    if (!apiKey) {
      logWasenderDiagnostic({
        requestId,
        runtime,
        mode,
        endpointHost,
        status: "MISSING_API_KEY",
        errorCategory: "CONFIG_ERROR",
        durationMs: Date.now() - startTime,
        success: false,
      });

      return {
        success: false,
        error: "Wasender service configuration error",
        errorCategory: "CONFIG_ERROR",
        durationMs: Date.now() - startTime,
      };
    }

    const payload = {
      to: cleanPhone,
      text: message,
    };

    return this.executeWithRetry(endpoint, apiKey, payload, {
      requestId,
      runtime,
      mode,
      endpointHost,
      startTime,
      logPrefix: "NOTIF",
    });
  }

  /**
   * Helper to perform HTTP request with bounded exponential backoff retry for 429 and temporary 5xx errors.
   */
  private static async executeWithRetry(
    endpoint: string,
    apiKey: string,
    payload: { to: string; text: string },
    ctx: {
      requestId: string;
      runtime: string;
      mode: WasenderMode;
      endpointHost: string;
      startTime: number;
      logPrefix: string;
    }
  ): Promise<WasenderExecutionResult> {
    const maxRetries = 2;
    let attempt = 0;

    while (attempt <= maxRetries) {
      attempt++;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s strict timeout

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const contentType = response.headers.get("content-type") || "";
        let data: Record<string, unknown> = {};
        if (contentType.includes("application/json")) {
          data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
        } else {
          const rawText = await response.text().catch(() => "");
          data = { message: rawText };
        }

        const durationMs = Date.now() - ctx.startTime;

        if (response.ok) {
          logWasenderDiagnostic({
            requestId: ctx.requestId,
            runtime: ctx.runtime,
            mode: ctx.mode,
            endpointHost: ctx.endpointHost,
            status: response.status,
            contentType,
            durationMs,
            success: true,
          });

          const resMsg = typeof data.message === "string" ? data.message : "WhatsApp message sent successfully";
          const rawData = data.data as Record<string, unknown> | undefined;
          const resId = String(data.id || rawData?.msgId || "");

          return {
            success: true,
            message: resMsg,
            id: resId,
            statusCode: response.status,
            durationMs,
          };
        }

        // Handle Rate Limiting (429)
        if (response.status === 429) {
          const retryAfterSec = parseInt(
            response.headers.get("retry-after") || String(data.retry_after || 3),
            10
          );
          const waitMs = Math.min(Math.max(retryAfterSec, 1) * 1000, 5000);

          if (attempt <= maxRetries) {
            console.warn(`[WASENDER 429 RETRY] Attempt ${attempt}/${maxRetries}. Waiting ${waitMs}ms before retry.`);
            await new Promise((r) => setTimeout(r, waitMs));
            continue;
          }

          logWasenderDiagnostic({
            requestId: ctx.requestId,
            runtime: ctx.runtime,
            mode: ctx.mode,
            endpointHost: ctx.endpointHost,
            status: 429,
            contentType,
            errorCategory: "RATE_LIMITED",
            durationMs,
            success: false,
          });

          return {
            success: false,
            error: "WhatsApp gateway rate limit exceeded. Please wait a few seconds.",
            errorCategory: "RATE_LIMITED",
            statusCode: 429,
            durationMs,
          };
        }

        // Handle Server Errors (5xx) with exponential backoff
        if (response.status >= 500 && attempt <= maxRetries) {
          const backoffMs = attempt * 1000;
          console.warn(`[WASENDER ${response.status} RETRY] Attempt ${attempt}/${maxRetries}. Retrying in ${backoffMs}ms.`);
          await new Promise((r) => setTimeout(r, backoffMs));
          continue;
        }

        // Non-retriable client errors (400, 401, 403, 404)
        const errorCategory =
          response.status === 401 || response.status === 403
            ? "AUTH_ERROR"
            : response.status === 400
            ? "INVALID_PHONE"
            : "PROVIDER_UNAVAILABLE";

        const errDetail = typeof data.message === "string" ? data.message : "WhatsApp service returned an error.";
        const safeMessage =
          response.status === 401 || response.status === 403
            ? "Authentication with WhatsApp provider failed."
            : response.status === 400
            ? "Invalid phone number format."
            : errDetail;

        logWasenderDiagnostic({
          requestId: ctx.requestId,
          runtime: ctx.runtime,
          mode: ctx.mode,
          endpointHost: ctx.endpointHost,
          status: response.status,
          contentType,
          errorCategory,
          durationMs,
          success: false,
        });

        return {
          success: false,
          error: safeMessage,
          errorCategory,
          statusCode: response.status,
          durationMs,
        };
      } catch (err: unknown) {
        const isTimeout = err instanceof Error && err.name === "AbortError";
        const errorCategory = isTimeout ? "TIMEOUT" : "NETWORK_ERROR";
        const durationMs = Date.now() - ctx.startTime;
        const errMessage = err instanceof Error ? err.message : String(err);

        if (attempt <= maxRetries && !isTimeout) {
          const backoffMs = attempt * 1000;
          console.warn(`[WASENDER NETWORK RETRY] Attempt ${attempt}/${maxRetries} (${errMessage || "fetch failed"}). Retrying in ${backoffMs}ms.`);
          await new Promise((r) => setTimeout(r, backoffMs));
          continue;
        }

        logWasenderDiagnostic({
          requestId: ctx.requestId,
          runtime: ctx.runtime,
          mode: ctx.mode,
          endpointHost: ctx.endpointHost,
          status: isTimeout ? "TIMEOUT" : "ERROR",
          errorCategory,
          durationMs,
          success: false,
        });

        return {
          success: false,
          error: isTimeout
            ? "WhatsApp provider connection timed out. Please try again."
            : "Unable to connect to WhatsApp provider. Please check network connectivity.",
          errorCategory,
          durationMs,
        };
      } finally {
        clearTimeout(timeoutId);
      }
    }

    return {
      success: false,
      error: "WhatsApp delivery failed after maximum retries.",
      errorCategory: "PROVIDER_UNAVAILABLE",
      durationMs: Date.now() - ctx.startTime,
    };
  }
}
