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

    // 7. Robust Multi-Format Indexed User & Profile Lookup
    let userPayload: { id: string; phone: string; name: string; email: string; role: string } | null = null;
    let userId: string | null = null;
    let existingProfile: { id?: string; full_name?: string; email?: string; role?: string; phone?: string; is_profile_complete?: boolean } | null = null;

    const phone10 = cleanPhone.replace(/\D/g, "").slice(-10);
    const phoneVariants = Array.from(new Set([cleanPhone, `+91${phone10}`, `91${phone10}`, phone10])).filter(Boolean);
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    try {
      // 7a. Look up existing profile in profiles table
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, email, role, phone, is_profile_complete")
        .or(phoneVariants.map((p) => `phone.eq.${p}`).join(","))
        .maybeSingle();

      if (profile) {
        existingProfile = profile;
        if (profile.id && uuidRegex.test(profile.id)) {
          userId = profile.id;
        }
      }
    } catch (profileErr: unknown) {
      console.warn("[VERIFY OTP] profiles table lookup warning:", profileErr);
    }

    // 7b. Fallback: Check user_profiles table if not found in profiles
    if (!existingProfile?.full_name) {
      try {
        const { data: upProfile } = await supabaseAdmin
          .from("user_profiles")
          .select("id, full_name, email, role, phone, is_profile_complete")
          .or(phoneVariants.map((p) => `phone.eq.${p}`).join(","))
          .maybeSingle();

        if (upProfile) {
          existingProfile = { ...existingProfile, ...upProfile };
          if (!userId && upProfile.id && uuidRegex.test(upProfile.id)) {
            userId = upProfile.id;
          }
        }
      } catch (upErr: unknown) {
        console.warn("[VERIFY OTP] user_profiles table lookup warning:", upErr);
      }
    }

    // 7c. Ensure Supabase Auth user exists and resolve real UUID
    let authUserRecord: any = null;
    if (!userId || !uuidRegex.test(userId)) {
      try {
        const { data: authList } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const found = authList?.users?.find((u) => {
          const uPhone = (u.phone || "").replace(/\D/g, "");
          const metaPhone = (String(u.user_metadata?.phone || "")).replace(/\D/g, "");
          return (uPhone && uPhone.includes(phone10)) || (metaPhone && metaPhone.includes(phone10));
        });

        if (found?.id) {
          userId = found.id;
          authUserRecord = found;
        } else {
          // Attempt to create user if does not exist
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

          if (!createError && newUser?.user?.id) {
            userId = newUser.user.id;
            authUserRecord = newUser.user;
          } else if (createError) {
            // If already registered, fetch again
            const { data: retryList } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
            const reFound = retryList?.users?.find((u) => {
              const uPhone = (u.phone || "").replace(/\D/g, "");
              const metaPhone = (String(u.user_metadata?.phone || "")).replace(/\D/g, "");
              return (uPhone && uPhone.includes(phone10)) || (metaPhone && metaPhone.includes(phone10));
            });
            if (reFound?.id) {
              userId = reFound.id;
              authUserRecord = reFound;
            }
          }
        }
      } catch (authErr) {
        console.warn("[VERIFY OTP] Auth user resolution warning:", authErr);
      }
    }

    // Fallback if auth admin API could not generate UUID
    if (!userId) {
      userId = `wa_${cleanPhone.replace(/\D/g, "")}`;
    }

    const existingName =
      existingProfile?.full_name ||
      authUserRecord?.user_metadata?.full_name ||
      authUserRecord?.user_metadata?.name ||
      "";
    const rawEmail = existingProfile?.email || authUserRecord?.email || "";
    const isInternalEmail = rawEmail.endsWith("@road.internal");
    const cleanEmail = isInternalEmail ? "" : rawEmail;
    const userRole = existingProfile?.role || authUserRecord?.user_metadata?.role || "buyer";
    const isProfileComplete = Boolean(
      existingProfile?.is_profile_complete ||
      (existingName && existingName.trim().length >= 2 && !existingName.toLowerCase().includes("user"))
    );

    // 7d. If profile is already complete, ensure both database tables are synchronized
    if (isProfileComplete && userId && uuidRegex.test(userId)) {
      const fallbackEmail = rawEmail || `${phone10}@road.internal`;
      try {
        await Promise.allSettled([
          supabaseAdmin.from("profiles").upsert(
            {
              id: userId,
              phone: cleanPhone,
              full_name: existingName,
              email: fallbackEmail,
              role: userRole,
              is_verified: true,
              is_profile_complete: true,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" }
          ),
          supabaseAdmin.from("user_profiles").upsert(
            {
              id: userId,
              phone: cleanPhone,
              full_name: existingName,
              email: fallbackEmail,
              role: userRole,
              is_verified: true,
              is_profile_complete: true,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" }
          ),
        ]);
      } catch (syncErr) {
        console.warn("[VERIFY OTP] Profile sync warning:", syncErr);
      }
    }

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
