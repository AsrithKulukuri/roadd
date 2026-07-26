import axios, { AxiosError } from "axios";
import { WasenderAPIResponse } from "@/types/auth";

const WASENDER_BASE_URL = process.env.WASENDER_BASE_URL || "https://wasenderapi.com/api";
const WASENDER_API_KEY = process.env.WASENDER_API_KEY || "";

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

    // Ensure phone is formatted cleanly for WhatsApp API (digits only with country code)
    const cleanPhone = phone.replace(/\D/g, "");

    // Fallback mode if WASENDER_API_KEY is not configured in local environment
    if (!WASENDER_API_KEY) {
      console.warn(`[WASENDER MOCK MODE] WASENDER_API_KEY missing. Simulating sending OTP ${otp} to ${phone}`);
      console.log(`[WASENDER MOCK MESSAGE]:\n${formattedMessage}`);
      return {
        success: true,
        message: "OTP sent successfully (Simulated mode: check server logs for OTP code)",
        id: `mock_${Date.now()}`,
      };
    }

    try {
      const response = await axios.post<WasenderAPIResponse>(
        `${WASENDER_BASE_URL}/send-message`,
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
          timeout: 10000, // 10s timeout
        }
      );

      console.log(`[WASENDER SUCCESS] Sent OTP to ${cleanPhone}:`, response.data);
      return {
        success: true,
        message: response.data.message || "WhatsApp OTP sent successfully",
        id: response.data.id,
      };
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const axiosErr = err as AxiosError<any>;
        const errorMessage = axiosErr.response?.data?.message || axiosErr.response?.data?.error || axiosErr.message;
        console.error(`[WASENDER API ERROR] Status ${axiosErr.response?.status}:`, errorMessage);
        
        return {
          success: false,
          error: `Failed to send WhatsApp message: ${errorMessage}`,
        };
      }

      console.error("[WASENDER UNKNOWN ERROR]:", err);
      return {
        success: false,
        error: "An unexpected error occurred while contacting WasenderAPI",
      };
    }
  }
}
