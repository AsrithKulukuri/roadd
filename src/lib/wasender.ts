import axios, { AxiosError } from "axios";
import { WasenderAPIResponse } from "@/types/auth";
import { formatWhatsAppPhone } from "@/lib/whatsapp/whatsapp-share";

export type WasenderMode = "disabled" | "mock" | "live";

export function getWasenderMode(): WasenderMode {
  const rawMode = (process.env.WASENDER_MODE || "").trim().toLowerCase();
  if (rawMode === "live") return "live";
  if (rawMode === "mock") return "mock";
  // The server must default to disabled when the value is missing or invalid
  return "disabled";
}

function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) return "***";
  return `${phone.slice(0, 4)}****${phone.slice(-3)}`;
}

function isPhoneAllowlisted(phone: string): boolean {
  const allowlist = (process.env.WASENDER_QA_ALLOWLIST || "").split(",").map(p => p.trim()).filter(Boolean);
  if (allowlist.length === 0) return true; // If no specific allowlist is set, all QA test numbers are permitted
  const clean = phone.replace(/\D/g, "");
  return allowlist.some(a => clean.includes(a.replace(/\D/g, "")));
}

const WASENDER_API_KEY = (process.env.WASENDER_API_KEY || "").trim();

// Normalize base URL to prevent duplicate /send-message or trailing slash 404 errors on Vercel
function getEndpointUrls(): string[] {
  const envUrl = process.env.WASENDER_BASE_URL;
  const urls: string[] = [];

  if (envUrl) {
    const cleaned = envUrl.trim().replace(/\/+$/, "");
    if (cleaned.endsWith("/send-message")) {
      urls.push(cleaned);
    } else {
      urls.push(`${cleaned}/send-message`);
    }
  }

  // Canonical WasenderAPI endpoints
  urls.push("https://www.wasenderapi.com/api/send-message");
  urls.push("https://wasenderapi.com/api/send-message");

  return Array.from(new Set(urls));
}

/**
 * WasenderAPI Service
 * Sends WhatsApp OTP and generic notifications using Axios with strict WASENDER_MODE controls.
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
    const mode = getWasenderMode();

    if (mode === "disabled") {
      console.log(`[WASENDER DISABLED] Suppressed OTP to ${maskPhone(cleanPhone)} (WASENDER_MODE=disabled)`);
      return {
        success: true,
        message: "WhatsApp OTP simulated (development mode)",
        id: `dev-${Date.now()}`,
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

    const endpoints = getEndpointUrls();
    let lastError = "";

    for (const endpoint of endpoints) {
      try {
        console.log(`[WASENDER] Attempting to send OTP via ${endpoint}`);
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
            timeout: 12000,
          }
        );

        console.log(`[WASENDER SUCCESS] Sent OTP to ${cleanPhone} via ${endpoint}:`, response.data);
        return {
          success: true,
          message: response.data.message || "WhatsApp OTP sent successfully",
          id: response.data.id,
        };
      } catch (err: unknown) {
        if (axios.isAxiosError(err)) {
          const axiosErr = err as AxiosError<any>;
          const status = axiosErr.response?.status;
          const msg = axiosErr.response?.data?.message || axiosErr.response?.data?.error || axiosErr.message;
          console.warn(`[WASENDER ENDPOINT FAIL] ${endpoint} returned status ${status}: ${msg}`);
          lastError = `Status ${status}: ${msg}`;

          // If 404, loop and try next canonical endpoint URL
          if (status === 404) {
            continue;
          }
        } else {
          console.warn(`[WASENDER UNKNOWN ENDPOINT FAIL] ${endpoint}:`, err);
        }
      }
    }

    return {
      success: false,
      error: `Failed to send WhatsApp message: ${lastError || "All WasenderAPI endpoints failed"}`,
    };
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
        success: true,
        message: "WhatsApp notification simulated (development mode)",
        id: `dev-notif-${Date.now()}`,
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

    const endpoints = getEndpointUrls();
    let lastError = "";

    // Mimic human pacing with randomized delay (800ms - 2000ms) to maintain high account health
    const jitterMs = Math.floor(Math.random() * 1200) + 800;
    await new Promise((resolve) => setTimeout(resolve, jitterMs));

    for (const endpoint of endpoints) {
      try {
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
            timeout: 12000,
          }
        );

        console.log(`[WASENDER SUCCESS] Notification sent to ${cleanPhone}`);
        return {
          success: true,
          message: response.data.message || "WhatsApp notification sent successfully",
          id: response.data.id,
        };
      } catch (err: unknown) {
        if (axios.isAxiosError(err)) {
          const axiosErr = err as AxiosError<any>;
          const status = axiosErr.response?.status;
          const msg = axiosErr.response?.data?.message || axiosErr.response?.data?.error || axiosErr.message;
          console.warn(`[WASENDER NOTIFICATION FAIL] ${endpoint} status ${status}: ${msg}`);
          lastError = `Status ${status}: ${msg}`;

          if (status === 404) {
            continue;
          }
        } else {
          console.warn(`[WASENDER UNKNOWN FAIL] ${endpoint}:`, err);
        }
      }
    }

    return {
      success: false,
      error: `Failed to send WhatsApp notification: ${lastError || "All WasenderAPI endpoints failed"}`,
    };
  }
}

