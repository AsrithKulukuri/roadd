import axios, { AxiosError } from "axios";
import { WasenderAPIResponse } from "@/types/auth";

const DEFAULT_API_KEY = "0f8bd77ed11f256a99c96d8bfc8267d9946996cf01733f547f6a586011961e89";
const WASENDER_API_KEY = (process.env.WASENDER_API_KEY || DEFAULT_API_KEY).trim();

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
 * Sends WhatsApp OTP messages using Axios.
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
    const cleanPhone = phone.replace(/\D/g, "");

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
}
