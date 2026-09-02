import { NextResponse } from "next/server";
import { verifyOTPSchema } from "@/lib/validations/auth";
import { OTPCryptoService } from "@/lib/otp";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { signSessionPayload } from "@/lib/server-auth-guard";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const MAX_ATTEMPTS = 5;

export async function POST(request: Request) {
  const requestId = `req_ver_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

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

    // 1. Input Validation with Zod
    const validationResult = verifyOTPSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues[0]?.message || "Invalid OTP payload format.";
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_PAYLOAD",
            message: errorMessage,
          },
          requestId,
        },
        { status: 400 }
      );
    }

    const { phone, otp } = validationResult.data;
    const cleanPhone = phone.trim();

    // 2. Fetch active OTP record for phone number
    const { data: otpRecords, error: fetchError } = await supabaseAdmin
      .from("phone_otps")
      .select("*")
      .eq("phone", cleanPhone)
      .eq("verified", false)
      .order("created_at", { ascending: false })
      .limit(1);

    if (fetchError || !otpRecords || otpRecords.length === 0) {
      logger.security("VERIFY_OTP_NOT_FOUND", `${cleanPhone.slice(0, 4)}****${cleanPhone.slice(-3)}`, false, {
        requestId,
      });
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "OTP_NOT_FOUND",
            message: "No active OTP request found for this phone number. Please request a new code.",
          },
          requestId,
        },
        { status: 404 }
      );
    }

    const record = otpRecords[0];
    const now = new Date();
    const expiresAt = new Date(record.expires_at);

    // 3. Check Expiry (5 minute window)
    if (now > expiresAt) {
      logger.security("VERIFY_OTP_EXPIRED", `${cleanPhone.slice(0, 4)}****${cleanPhone.slice(-3)}`, false, {
        requestId,
      });
      await supabaseAdmin
        .from("phone_otps")
        .update({ verified: true, verified_at: now.toISOString(), delivery_status: "expired" })
        .eq("id", record.id);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "OTP_EXPIRED",
            message: "OTP code has expired. Please request a new verification code.",
          },
          requestId,
        },
        { status: 400 }
      );
    }

    // 4. Check Maximum Failed Verification Attempts (Max 5 attempts)
    if (record.attempts >= MAX_ATTEMPTS) {
      logger.security("VERIFY_OTP_MAX_ATTEMPTS_EXCEEDED", `${cleanPhone.slice(0, 4)}****${cleanPhone.slice(-3)}`, false, {
        attempts: record.attempts,
        requestId,
      });
      await supabaseAdmin
        .from("phone_otps")
        .update({ verified: true, verified_at: now.toISOString(), delivery_status: "locked" })
        .eq("id", record.id);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MAX_ATTEMPTS_EXCEEDED",
            message: "Maximum verification attempts exceeded (5/5). Please request a new OTP.",
          },
          requestId,
        },
        { status: 403 }
      );
    }

    // 5. Constant-Time Hash Verification
    const isOTPValid = OTPCryptoService.verifyOTP(otp, record.otp_hash);

    if (!isOTPValid) {
      const { data: attemptRows, error: attemptError } = await supabaseAdmin.rpc(
        "record_failed_phone_otp_attempt",
        { p_otp_id: record.id, p_max_attempts: MAX_ATTEMPTS }
      );
      if (attemptError) {
        logger.error("OTP attempt could not be recorded", { error: attemptError.message, requestId });
        return NextResponse.json(
          {
            success: false,
            error: { code: "OTP_STORAGE_UNAVAILABLE", message: "Verification is temporarily unavailable." },
            requestId,
          },
          { status: 503 }
        );
      }

      const attemptResult = attemptRows?.[0] as { attempts?: number; locked?: boolean } | undefined;
      if (!attemptResult) {
        return NextResponse.json(
          {
            success: false,
            error: { code: "OTP_ALREADY_USED", message: "This OTP is no longer active. Request a new code." },
            requestId,
          },
          { status: 409 }
        );
      }
      const newAttempts = Number(attemptResult.attempts || 0);

      const remaining = Math.max(0, MAX_ATTEMPTS - newAttempts);
      logger.security("VERIFY_OTP_FAILED", `${cleanPhone.slice(0, 4)}****${cleanPhone.slice(-3)}`, false, {
        remainingAttempts: remaining,
        requestId,
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_OTP",
            message: `Invalid OTP code. ${remaining > 0 ? `${remaining} attempts remaining.` : "Please request a new OTP."}`,
          },
          requestId,
        },
        { status: attemptResult.locked ? 403 : 401 }
      );
    }

    // 6. Mark the code consumed to prevent replay while preserving rate-limit history.
    const { data: consumedOtp, error: consumeError } = await supabaseAdmin
      .from("phone_otps")
      .update({ verified: true, verified_at: now.toISOString(), delivery_status: "verified" })
      .eq("id", record.id)
      .eq("verified", false)
      .select("id")
      .maybeSingle();
    if (consumeError) {
      logger.error("OTP could not be consumed", { error: consumeError.message, requestId });
      return NextResponse.json(
        {
          success: false,
          error: { code: "OTP_STORAGE_UNAVAILABLE", message: "Verification is temporarily unavailable." },
          requestId,
        },
        { status: 503 }
      );
    }
    if (!consumedOtp) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "OTP_ALREADY_USED", message: "This OTP has already been used. Request a new code." },
          requestId,
        },
        { status: 409 }
      );
    }

    // 7. Indexed User Lookup
    let userPayload: { id: string; phone: string; name: string; email: string; role: string } | null = null;
    let userId: string | null = null;
    let existingProfile: { id?: string; full_name?: string; email?: string; role?: string; phone?: string } | null = null;

    try {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, email, role, phone")
        .or(`phone.eq.${cleanPhone},phone.eq.${cleanPhone.replace(/\D/g, "")}`)
        .maybeSingle();

      if (profile) {
        existingProfile = profile;
        userId = profile.id;
      }
    } catch (profileErr: unknown) {
      const msg = profileErr instanceof Error ? profileErr.message : String(profileErr);
      console.warn("[VERIFY OTP] Profile lookup warn:", msg);
    }

    // If profile not found, ensure Supabase Auth user exists
    if (!userId) {
      try {
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          phone: cleanPhone,
          phone_confirm: true,
          user_metadata: {
            phone: cleanPhone,
            role: "buyer",
            auth_provider: "whatsapp",
            created_via: "ROAD_WhatsApp_OTP",
          },
        });

        if (!createError && newUser?.user) {
          userId = newUser.user.id;
        } else {
          userId = `wa_${cleanPhone.replace(/\D/g, "")}`;
        }
      } catch {
        userId = `wa_${cleanPhone.replace(/\D/g, "")}`;
      }
    }

    const existingName = existingProfile?.full_name || "";
    const rawEmail = existingProfile?.email || "";
    const isInternalEmail = rawEmail.endsWith("@road.internal");
    const cleanEmail = isInternalEmail ? "" : rawEmail;
    const userRole = existingProfile?.role || "buyer";
    const isProfileComplete = Boolean(existingName.length >= 2 && cleanEmail && cleanEmail.includes("@"));

    userPayload = {
      id: userId,
      phone: cleanPhone,
      name: existingName,
      email: cleanEmail,
      role: userRole,
    };

    const authToken = signSessionPayload(userPayload);

    logger.security("VERIFY_OTP_SUCCESS", `${cleanPhone.slice(0, 4)}****${cleanPhone.slice(-3)}`, true, {
      userId,
      role: userRole,
      isProfileComplete,
      requestId,
    });

    // 8. Return Authenticated Session Response with cookie
    const response = NextResponse.json(
      {
        success: true,
        isProfileComplete,
        message: "WhatsApp OTP verified successfully.",
        user: userPayload,
        token: authToken,
        requestId,
      },
      { status: 200 }
    );

    // Set server-verifiable HTTP-only session cookie
    response.cookies.set("road_auth_token", authToken, {
      path: "/",
      maxAge: 30 * 24 * 3600, // 30 days
      sameSite: "lax",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });

    response.cookies.set("road_user", "true", {
      path: "/",
      maxAge: 30 * 24 * 3600,
      sameSite: "lax",
      httpOnly: false,
    });

    return response;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("Unhandled Exception in POST /api/auth/verify-otp", { error: msg, requestId });

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Internal server error during OTP verification. Please try again.",
        },
        requestId,
      },
      { status: 500 }
    );
  }
}
