import { supabaseAdmin } from "@/lib/supabase-admin";

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  retryAfterSeconds?: number;
}

/**
 * Rate Limiter Service for Phone OTP Requests
 * Enforces security constraints:
 * 1. Maximum 1 OTP request per 60 seconds.
 * 2. Maximum 5 OTP requests per hour.
 */
export class RateLimiterService {
  private static COOLDOWN_SECONDS = 60; // 60 seconds between OTP requests
  private static MAX_HOURLY_REQUESTS = 5; // Max 5 requests per hour

  /**
   * Checks if phone number is allowed to request a new OTP.
   * 
   * @param phone - E.164 formatted phone number
   */
  static async checkRateLimit(phone: string): Promise<RateLimitResult> {
    const now = new Date();
    const sixtySecondsAgo = new Date(now.getTime() - this.COOLDOWN_SECONDS * 1000).toISOString();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

    try {
      // 1. Check 60-second cooldown rule
      const { data: recentOTPs, error: recentError } = await supabaseAdmin
        .from("phone_otps")
        .select("created_at")
        .eq("phone", phone)
        .gte("created_at", sixtySecondsAgo)
        .order("created_at", { ascending: false })
        .limit(1);

      if (recentError) {
        console.error("[RATE LIMIT CHECK ERROR 60s]:", recentError);
      } else if (recentOTPs && recentOTPs.length > 0) {
        const lastCreated = new Date(recentOTPs[0].created_at).getTime();
        const elapsedSeconds = Math.floor((now.getTime() - lastCreated) / 1000);
        const retryAfter = Math.max(1, this.COOLDOWN_SECONDS - elapsedSeconds);

        return {
          allowed: false,
          reason: `Please wait ${retryAfter} seconds before requesting a new OTP.`,
          retryAfterSeconds: retryAfter,
        };
      }

      // 2. Check 5 requests per hour limit rule
      const { count, error: countError } = await supabaseAdmin
        .from("phone_otps")
        .select("id", { count: "exact", head: true })
        .eq("phone", phone)
        .gte("created_at", oneHourAgo);

      if (countError) {
        console.error("[RATE LIMIT CHECK ERROR 1hr]:", countError);
      } else if (count !== null && count >= this.MAX_HOURLY_REQUESTS) {
        return {
          allowed: false,
          reason: "Too many OTP requests. Maximum 5 requests allowed per hour. Please try again later.",
          retryAfterSeconds: 3600,
        };
      }

      return { allowed: true };
    } catch (err) {
      console.error("[RATE LIMITER UNEXPECTED EXCEPTION]:", err);
      // Default to allowed if DB query fails to prevent complete lockout, but log critical error
      return { allowed: true };
    }
  }
}
