import axios, { AxiosError } from "axios";
import { WasenderAPIResponse } from "@/types/auth";
import { formatWhatsAppPhone } from "@/lib/whatsapp/whatsapp-share";

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
 * Sends WhatsApp OTP and generic notifications using Axios.
 */
export class WasenderService {
  /**
   * Send WhatsApp OTP Message via WasenderAPI
   * 
   * @param phone - E.164 formatted phone number e.g. +919876543210
   * @param otp - 6-digit OTP string e.g. 123456
   */
  static async sendOTPMessage(phone: string, otp: string): Promise<WasenderAPIResponse> {
    const formattedMessage = `ROAD Verification\n\nYour OTP is:\n${otp}\n\nValid for 5 minutes.\nNever share this code with anyone.`;
    const cleanPhone = formatWhatsAppPhone(phone);

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

