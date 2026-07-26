import { NextResponse } from "next/server";
import { sendOTPSchema } from "@/lib/validations/auth";
import { RateLimiterService } from "@/lib/rate-limiter";
import { OTPCryptoService } from "@/lib/otp";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { WasenderService } from "@/lib/wasender";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. Input Validation using Zod
    const validationResult = sendOTPSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues[0]?.message || "Invalid input data";
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 } // 400 Bad Request
      );
    }

    const { phone } = validationResult.data;

    // 2. Rate Limiting Check (Max 1 per 60s, Max 5 per hour)
    const rateLimit = await RateLimiterService.checkRateLimit(phone);
    if (!rateLimit.allowed) {
      logger.security("SEND_OTP_RATE_LIMITED", phone, false, { reason: rateLimit.reason });
      return NextResponse.json(
        {
          success: false,
          error: rateLimit.reason || "Rate limit exceeded. Please wait before requesting another OTP.",
          retryAfterSeconds: rateLimit.retryAfterSeconds || 60,
        },
        { status: 429 } // 429 Too Many Requests
      );
    }

    // 3. Delete any previous unverified OTP records for this phone number
    await supabaseAdmin.from("phone_otps").delete().eq("phone", phone);

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
      logger.error("Failed to store OTP in database", { phone, error: dbError.message });
      return NextResponse.json(
        { success: false, error: "Failed to initialize OTP request. Please try again." },
        { status: 500 }
      );
    }

    // 6. Send OTP via WasenderAPI (WhatsApp)
    const wasenderResult = await WasenderService.sendOTPMessage(phone, rawOTP);

    if (!wasenderResult.success) {
      logger.error("WasenderAPI failed to deliver WhatsApp OTP", { phone, error: wasenderResult.error });
      return NextResponse.json(
        {
          success: false,
          error: wasenderResult.error || "Failed to dispatch WhatsApp OTP message.",
        },
        { status: 502 } // 502 Bad Gateway
      );
    }

    logger.security("SEND_OTP_SUCCESS", phone, true, { expiresInSeconds });

    // 7. Return JSON Success Response (Never return raw OTP!)
    return NextResponse.json(
      {
        success: true,
        message: "OTP sent successfully to your WhatsApp number.",
        expiresInSeconds,
      },
      { status: 200 }
    );
  } catch (err: any) {
    logger.error("Unhandled Exception in POST /api/auth/send-otp", { error: err?.message || err });
    return NextResponse.json(
      { success: false, error: "Internal server error while processing OTP request." },
      { status: 500 }
    );
  }
}
