import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  retryAfterSeconds?: number;
}

export class RateLimiterService {
  private static readonly PHONE_COOLDOWN_SECONDS = 60;
  private static readonly MAX_PHONE_HOURLY_REQUESTS = 5;
  private static readonly MAX_IP_HOURLY_REQUESTS = 20;

  static hashRequestIp(request: Request): string {
    const rawIp =
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-real-ip") ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "local-development";
    const secret = process.env.RATE_LIMIT_HASH_SECRET || process.env.SESSION_SECRET;
    if (!secret || secret.length < 32) {
      throw new Error("RATE_LIMIT_HASH_SECRET or SESSION_SECRET must be configured with at least 32 characters.");
    }
    return crypto.createHmac("sha256", secret).update(rawIp).digest("hex");
  }

  static async checkRateLimit(phone: string, requestIpHash: string): Promise<RateLimitResult> {
    const now = new Date();
    const cooldownStart = new Date(now.getTime() - this.PHONE_COOLDOWN_SECONDS * 1000).toISOString();
    const hourStart = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

    try {
      const { data: recent, error: recentError } = await supabaseAdmin
        .from("phone_otps")
        .select("created_at")
        .eq("phone", phone)
        .gte("created_at", cooldownStart)
        .order("created_at", { ascending: false })
        .limit(1);
      if (recentError) throw recentError;
      if (recent?.length) {
        const elapsed = Math.floor((now.getTime() - new Date(recent[0].created_at).getTime()) / 1000);
        const retryAfter = Math.max(1, this.PHONE_COOLDOWN_SECONDS - elapsed);
        return {
          allowed: false,
          reason: `Please wait ${retryAfter} seconds before requesting another OTP.`,
          retryAfterSeconds: retryAfter,
        };
      }

      const [{ count: phoneCount, error: phoneError }, { count: ipCount, error: ipError }] = await Promise.all([
        supabaseAdmin
          .from("phone_otps")
          .select("id", { count: "exact", head: true })
          .eq("phone", phone)
          .gte("created_at", hourStart),
        supabaseAdmin
          .from("phone_otps")
          .select("id", { count: "exact", head: true })
          .eq("request_ip_hash", requestIpHash)
          .gte("created_at", hourStart),
      ]);
      if (phoneError) throw phoneError;
      if (ipError) throw ipError;

      if ((phoneCount || 0) >= this.MAX_PHONE_HOURLY_REQUESTS) {
        return {
          allowed: false,
          reason: "Too many OTP requests for this number. Please try again in one hour.",
          retryAfterSeconds: 3600,
        };
      }
      if ((ipCount || 0) >= this.MAX_IP_HOURLY_REQUESTS) {
        return {
          allowed: false,
          reason: "Too many OTP requests from this network. Please try again later.",
          retryAfterSeconds: 3600,
        };
      }

      return { allowed: true };
    } catch (error: unknown) {
      console.error("[OTP RATE LIMITER ERROR]", error);
      return {
        allowed: false,
        reason: "Verification protection is temporarily unavailable. Please try again shortly.",
        retryAfterSeconds: 60,
      };
    }
  }
}
