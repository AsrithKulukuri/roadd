import axios, { AxiosError } from "axios";
import { WasenderAPIResponse } from "@/types/auth";
import { formatWhatsAppPhone } from "@/lib/whatsapp/whatsapp-share";

export type WasenderMode = "disabled" | "mock" | "live";

export function getWasenderMode(): WasenderMode {
  const rawMode = (process.env.WASENDER_MODE || "").trim().toLowerCase();
  if (rawMode === "live") return "live";
  if (rawMode === "mock") return "mock";
  if (rawMode === "disabled") return "disabled";
  // If WASENDER_API_KEY is configured, enable live mode by default
  if ((process.env.WASENDER_API_KEY || "").trim()) return "live";
  return "disabled";
}

function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) return "***";
  return `${phone.slice(0, 4)}****${phone.slice(-3)}`;
}

function isPhoneAllowlisted(phone: string): boolean {
  const allowlist = (process.env.WASENDER_QA_ALLOWLIST || "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  // Missing or empty QA allowlist fails closed
  if (allowlist.length === 0) return false;

  const clean = phone.replace(/\D/g, "");
  return allowlist.some((a) => clean.includes(a.replace(/\D/g, "")));
}

const WASENDER_API_KEY = (process.env.WASENDER_API_KEY || "").trim();

function getEndpointUrl(): string {
  const envUrl = process.env.WASENDER_BASE_URL?.trim();
  if (envUrl) {
    const cleaned = envUrl.replace(/\/+$/, "");
    return cleaned.endsWith("/send-message") ? cleaned : `${cleaned}/send-message`;
  }
  return "https://www.wasenderapi.com/api/send-message";
}

/**
 * WasenderAPI Service
 * Strict WhatsApp OTP and notification client with explicit environment controls.
 */
export class WasenderService {
  /**
   * Send WhatsApp OTP Message via WasenderAPI
   *
   * @param phone - E.164 formatted phone number e.g. +919876543210
   * @param otp - 6-digit OTP string e.g. 123456
   */
  static async sendOTPMessage(phone: string, otp: string): Promise<WasenderAPIResponse> {
    const cleanPhone = formatWhatsAppPhone(phone);
    if (!cleanPhone || cleanPhone.length < 10) {
      return {
        success: false,
        error: "Invalid recipient phone number",
      };
    }

    const mode = getWasenderMode();

    if (mode === "disabled") {
      console.log(`[WASENDER DISABLED] Message suppressed for ${maskPhone(cleanPhone)} (WASENDER_MODE=disabled)`);
      return {
        success: false,
        error: "WhatsApp messaging is disabled in this environment (WASENDER_MODE=disabled)",
      };
    }

    if (mode === "mock") {
      if (!isPhoneAllowlisted(cleanPhone)) {
        console.warn(`[WASENDER MOCK REJECTED] ${maskPhone(cleanPhone)} is not in WASENDER_QA_ALLOWLIST`);
        return {
          success: false,
          error: "Phone number not in QA allowlist for mock delivery",
        };
      }
      console.log(`[WASENDER MOCK] Simulated OTP delivery to ${maskPhone(cleanPhone)} successfully`);
      return {
        success: true,
        message: "WhatsApp OTP delivery simulated (QA mode)",
        id: `mock-${Date.now()}`,
      };
    }

    // mode === "live" (verified production only)
    if (!WASENDER_API_KEY) {
      console.error("[WASENDER LIVE ERROR] WASENDER_API_KEY is missing in production environment");
      return {
        success: false,
        error: "Wasender service configuration error",
      };
    }

    const formattedMessage = `ROAD Verification\n\nYour OTP is:\n${otp}\n\nValid for 5 minutes.\nNever share this code with anyone.`;
    const endpoint = getEndpointUrl();

    try {
      console.log(`[WASENDER LIVE] Dispatching OTP to ${maskPhone(cleanPhone)} via endpoint`);
      const response = await axios.post<WasenderAPIResponse>(
        endpoint,
        {
          to: cleanPhone,
          text: formattedMessage,
          message: formattedMessage,
        },
        {
          headers: {
            Authorization: `Bearer ${WASENDER_API_KEY}`,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );

      console.log(`[WASENDER SUCCESS] Sent OTP to ${maskPhone(cleanPhone)}`);
      return {
        success: true,
        message: response.data.message || "WhatsApp OTP sent successfully",
        id: response.data.id,
      };
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const axiosErr = err as AxiosError<{ message?: string; error?: string }>;
        const status = axiosErr.response?.status;
        const msg =
          axiosErr.response?.data?.message ||
          axiosErr.response?.data?.error ||
          axiosErr.message;
        const retryAfter = axiosErr.response?.headers["retry-after"];
        console.warn(`[WASENDER LIVE FAIL] status ${status}: ${msg}${retryAfter ? ` (retry-after: ${retryAfter})` : ""}`);

        return {
          success: false,
          error: `WhatsApp delivery failed: ${msg}`,
        };
      }

      const unknownMsg = err instanceof Error ? err.message : "Unknown network error";
      console.warn("[WASENDER UNKNOWN FAIL]", unknownMsg);
      return {
        success: false,
        error: "WhatsApp service unavailable",
      };
    }
  }

  /**
   * Send Generic Text Message via WasenderAPI (for Builder view notifications)
   *
   * @param phone - Recipient phone number (normalized to E.164 international standard)
   * @param message - Message body to send
   */
  static async sendTextMessage(phone: string, message: string): Promise<WasenderAPIResponse> {
    const cleanPhone = formatWhatsAppPhone(phone);
    if (!cleanPhone || cleanPhone.length < 10) {
      return {
        success: false,
        error: "Invalid recipient phone number",
      };
    }

    const mode = getWasenderMode();

    if (mode === "disabled") {
      console.log(`[WASENDER DISABLED] Suppressed WhatsApp notification to ${maskPhone(cleanPhone)} (WASENDER_MODE=disabled)`);
      return {
        success: false,
        error: "WhatsApp messaging is disabled in this environment (WASENDER_MODE=disabled)",
      };
    }

    if (mode === "mock") {
      if (!isPhoneAllowlisted(cleanPhone)) {
        console.warn(`[WASENDER MOCK REJECTED] ${maskPhone(cleanPhone)} is not in WASENDER_QA_ALLOWLIST`);
        return {
          success: false,
          error: "Phone number not in QA allowlist for mock notification",
        };
      }
      console.log(`[WASENDER MOCK] Simulated WhatsApp notification delivery to ${maskPhone(cleanPhone)} successfully`);
      return {
        success: true,
        message: "WhatsApp notification delivery simulated (QA mode)",
        id: `mock-notif-${Date.now()}`,
      };
    }

    // mode === "live" (verified production only)
    if (!WASENDER_API_KEY) {
      console.error("[WASENDER LIVE ERROR] WASENDER_API_KEY is missing in production environment");
      return {
        success: false,
        error: "Wasender service configuration error",
      };
    }

    const endpoint = getEndpointUrl();

    try {
      console.log(`[WASENDER LIVE] Dispatching notification to ${maskPhone(cleanPhone)}`);
      const response = await axios.post<WasenderAPIResponse>(
        endpoint,
        {
          to: cleanPhone,
          text: message,
          message: message,
        },
        {
          headers: {
            Authorization: `Bearer ${WASENDER_API_KEY}`,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );

      console.log(`[WASENDER SUCCESS] Notification sent to ${maskPhone(cleanPhone)}`);
      return {
        success: true,
        message: response.data.message || "WhatsApp notification sent successfully",
        id: response.data.id,
      };
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const axiosErr = err as AxiosError<{ message?: string; error?: string }>;
        const status = axiosErr.response?.status;
        const msg =
          axiosErr.response?.data?.message ||
          axiosErr.response?.data?.error ||
          axiosErr.message;
        const retryAfter = axiosErr.response?.headers["retry-after"];
        console.warn(`[WASENDER LIVE FAIL] status ${status}: ${msg}${retryAfter ? ` (retry-after: ${retryAfter})` : ""}`);

        return {
          success: false,
          error: `WhatsApp notification failed: ${msg}`,
        };
      }

      const unknownMsg = err instanceof Error ? err.message : "Unknown network error";
      console.warn("[WASENDER UNKNOWN FAIL]", unknownMsg);
      return {
        success: false,
        error: "WhatsApp notification service unavailable",
      };
    }
  }
}

