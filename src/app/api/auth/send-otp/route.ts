import { NextResponse } from "next/server";
import { sendOTPSchema } from "@/lib/validations/auth";
import { RateLimiterService } from "@/lib/rate-limiter";
import { OTPCryptoService } from "@/lib/otp";
import { supabaseAdmin, isServiceRoleConfigured } from "@/lib/supabase-admin";
import { WasenderService } from "@/lib/wasender";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

function classifySupabaseError(error: { code?: string; message?: string; details?: string }): {
  code: string;
  category: "MISSING_CONFIG" | "MISSING_TABLE" | "SCHEMA_MISMATCH" | "RLS_VIOLATION" | "NETWORK_FAILURE" | "DATABASE_ERROR";
} {
  const msg = (error.message || "").toLowerCase();
  const code = error.code || "";

  if (msg.includes("service_role") || msg.includes("configuration") || !isServiceRoleConfigured()) {
    return { code: "CONFIG_ERROR", category: "MISSING_CONFIG" };
  }
  if (code === "42P01" || msg.includes("relation") || msg.includes("does not exist")) {
    return { code: "TABLE_NOT_FOUND", category: "MISSING_TABLE" };
  }
  if (code === "42703" || msg.includes("column") || msg.includes("schema")) {
    return { code: "SCHEMA_MISMATCH", category: "SCHEMA_MISMATCH" };
  }
  if (code === "42501" || msg.includes("row-level security") || msg.includes("permission denied")) {
    return { code: "RLS_VIOLATION", category: "RLS_VIOLATION" };
  }
  if (msg.includes("fetch failed") || msg.includes("eacces") || msg.includes("enotfound") || msg.includes("network")) {
    return { code: "NETWORK_FAILURE", category: "NETWORK_FAILURE" };
  }
  return { code: "DATABASE_ERROR", category: "DATABASE_ERROR" };
}

export async function POST(request: Request) {
  const requestId = `req_otp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_JSON_PAYLOAD",
            message: "Invalid JSON payload provided.",
          },
          requestId,
        },
        { status: 400 }
      );
    }

    // 1. Input Validation using Zod
    const validationResult = sendOTPSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues[0]?.message || "Please enter a valid 10-digit mobile number.";
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_PHONE_NUMBER",
            message: errorMessage,
          },
          requestId,
        },
        { status: 400 }
      );
    }

    const { phone } = validationResult.data;

    // 2. Rate Limiting Check (Max 1 per 60s, Max 5 per hour)
    try {
      const rateLimit = await RateLimiterService.checkRateLimit(phone);
      if (!rateLimit.allowed) {
        logger.security("SEND_OTP_RATE_LIMITED", phone, false, { reason: rateLimit.reason, requestId });
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "RATE_LIMIT_EXCEEDED",
              message: rateLimit.reason || "Rate limit exceeded. Please wait before requesting another OTP.",
            },
            retryAfterSeconds: rateLimit.retryAfterSeconds || 60,
            requestId,
          },
          { status: 429 }
        );
      }
    } catch (rateLimitErr: unknown) {
      const msg = rateLimitErr instanceof Error ? rateLimitErr.message : String(rateLimitErr);
      console.warn("[RATE_LIMIT_BYPASS_ON_ERROR]", msg);
    }

    // 3. Delete any previous unverified OTP records for this phone number
    try {
      await supabaseAdmin.from("phone_otps").delete().eq("phone", phone);
    } catch (cleanupErr: unknown) {
      const msg = cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr);
      console.warn("[CLEANUP_OTP_WARNING]", msg);
    }

    // 4. Generate Cryptographically Secure 6-Digit OTP
    const rawOTP = OTPCryptoService.generateOTP();
    const otpHash = OTPCryptoService.hashOTP(rawOTP);
    const expiresInSeconds = 300; // Exactly 5 minutes
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

    // 5. Store Hashed OTP in Supabase Database
    const targetSupabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
      : "unknown";

    let dbError: { code?: string; message?: string; details?: string; hint?: string } | null = null;

    try {
      const insertRes = await supabaseAdmin.from("phone_otps").insert({
        phone,
        otp_hash: otpHash,
        expires_at: expiresAt,
        attempts: 0,
        verified: false,
      });
      if (insertRes.error) {
        dbError = insertRes.error;
      }
    } catch (err: unknown) {
      dbError = {
        message: err instanceof Error ? err.message : String(err),
      };
    }

    if (dbError) {
      const classification = classifySupabaseError(dbError);
      console.error(
        `[SUPABASE PERSISTENCE ERROR] req=${requestId} host=${targetSupabaseHost} hasServiceRole=${isServiceRoleConfigured()} category=${classification.category} code=${dbError.code || "N/A"} msg=${dbError.message || "Unknown"} details=${dbError.details || "None"}`
      );

      logger.error("Failed to store OTP in database", {
        phone: `${phone.slice(0, 4)}****${phone.slice(-3)}`,
        category: classification.category,
        error: dbError.message,
        details: dbError.details,
        requestId,
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            code: classification.code,
            message: "Unable to initialize verification session. Please try again shortly.",
          },
          requestId,
        },
        { status: 503 }
      );
    }

    // 6. Mandatory exact log before Wasender invocation
    console.log("[OTP_FLOW] Database persistence succeeded; invoking Wasender");

    // 7. Send OTP via WasenderAPI (WhatsApp)
    const wasenderResult = await WasenderService.sendOTPMessage(phone, rawOTP, { requestId });

    // 8. Mandatory exact log after Wasender completion
    console.log(
      `[OTP_FLOW] Wasender completed status=${wasenderResult.statusCode || (wasenderResult.success ? 200 : "ERROR")} success=${wasenderResult.success} requestId=${requestId}`
    );

    if (!wasenderResult.success) {
      // Invalidate stored OTP if delivery failed to prevent orphan unusable active record
      try {
        await supabaseAdmin.from("phone_otps").delete().eq("phone", phone);
      } catch (cleanupErr: unknown) {
        const msg = cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr);
        console.warn("[CLEANUP_FAILED_OTP_WARNING]", msg);
      }

      logger.error("WasenderAPI failed to deliver WhatsApp OTP", {
        phone: `${phone.slice(0, 4)}****${phone.slice(-3)}`,
        error: wasenderResult.error,
        category: wasenderResult.errorCategory,
        requestId,
      });

      const statusCode =
        wasenderResult.statusCode === 429
          ? 429
          : wasenderResult.errorCategory === "CONFIG_ERROR"
          ? 503
          : wasenderResult.errorCategory === "TIMEOUT"
          ? 504
          : 502;

      return NextResponse.json(
        {
          success: false,
          error: {
            code: wasenderResult.errorCategory || "OTP_PROVIDER_UNAVAILABLE",
            message: wasenderResult.error || "Failed to dispatch WhatsApp OTP message.",
          },
          requestId,
        },
        { status: statusCode }
      );
    }

    logger.security("SEND_OTP_SUCCESS", `${phone.slice(0, 4)}****${phone.slice(-3)}`, true, {
      expiresInSeconds,
      requestId,
    });

    // 9. Return JSON Success Response (Never return raw OTP!)
    return NextResponse.json(
      {
        success: true,
        message: "OTP sent successfully to your WhatsApp number.",
        expiresInSeconds,
        requestId,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("Unhandled Exception in POST /api/auth/send-otp", { error: msg, requestId });

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred while processing your request. Please try again shortly.",
        },
        requestId,
      },
      { status: 500 }
    );
  }
}
