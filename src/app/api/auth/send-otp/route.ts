import { NextResponse } from "next/server";
import { sendOTPSchema } from "@/lib/validations/auth";
import { RateLimiterService } from "@/lib/rate-limiter";
import { OTPCryptoService } from "@/lib/otp";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { WasenderService } from "@/lib/wasender";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

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
    const { error: dbError } = await supabaseAdmin.from("phone_otps").insert({
      phone,
      otp_hash: otpHash,
      expires_at: expiresAt,
      attempts: 0,
      verified: false,
    });

    if (dbError) {
      logger.error("Failed to store OTP in database", {
        phone: `${phone.slice(0, 4)}****${phone.slice(-3)}`,
        error: dbError.message,
        details: dbError.details,
        requestId,
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            code: "DATABASE_ERROR",
            message: "Unable to initialize verification session. Please try again shortly.",
          },
          requestId,
        },
        { status: 503 }
      );
    }

    // 6. Send OTP via WasenderAPI (WhatsApp)
    const wasenderResult = await WasenderService.sendOTPMessage(phone, rawOTP, { requestId });

    if (!wasenderResult.success) {
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

    // 7. Return JSON Success Response (Never return raw OTP!)
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
