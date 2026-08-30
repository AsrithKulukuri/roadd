import { NextResponse } from "next/server";
import { verifyOTPSchema } from "@/lib/validations/auth";
import { OTPCryptoService } from "@/lib/otp";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { signSessionPayload } from "@/lib/server-auth-guard";
import { logger } from "@/lib/logger";

const MAX_ATTEMPTS = 5;

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. Input Validation with Zod
    const validationResult = verifyOTPSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues[0]?.message || "Invalid payload format";
      return NextResponse.json(
        { success: false, error: errorMessage },
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
      logger.security("VERIFY_OTP_NOT_FOUND", cleanPhone, false);
      return NextResponse.json(
        { success: false, error: "No active OTP request found for this phone number. Please request a new code." },
        { status: 404 }
      );
    }

    const record = otpRecords[0];
    const now = new Date();
    const expiresAt = new Date(record.expires_at);

    // 3. Check Expiry (5 minute window)
    if (now > expiresAt) {
      logger.security("VERIFY_OTP_EXPIRED", cleanPhone, false);
      await supabaseAdmin.from("phone_otps").delete().eq("id", record.id);
      return NextResponse.json(
        { success: false, error: "OTP has expired. Please request a new verification code." },
        { status: 400 }
      );
    }

    // 4. Check Maximum Failed Verification Attempts (Max 5 attempts)
    if (record.attempts >= MAX_ATTEMPTS) {
      logger.security("VERIFY_OTP_MAX_ATTEMPTS_EXCEEDED", cleanPhone, false, { attempts: record.attempts });
      await supabaseAdmin.from("phone_otps").delete().eq("id", record.id);
      return NextResponse.json(
        { success: false, error: "Maximum verification attempts exceeded (5/5). Please request a new OTP." },
        { status: 403 }
      );
    }

    // 5. Constant-Time Hash Verification
    const isOTPValid = OTPCryptoService.verifyOTP(otp, record.otp_hash);

    if (!isOTPValid) {
      const newAttempts = record.attempts + 1;
      await supabaseAdmin
        .from("phone_otps")
        .update({ attempts: newAttempts })
        .eq("id", record.id);

      const remaining = MAX_ATTEMPTS - newAttempts;
      logger.security("VERIFY_OTP_FAILED", cleanPhone, false, { remainingAttempts: remaining });

      return NextResponse.json(
        {
          success: false,
          error: `Invalid OTP code. ${remaining > 0 ? `${remaining} attempts remaining.` : "Please request a new OTP."}`,
        },
        { status: 401 }
      );
    }

    // 6. Delete OTP Record Immediately (Prevent Replay Attacks)
    await supabaseAdmin.from("phone_otps").delete().eq("id", record.id);

    // 7. High-Speed Indexed User Lookup (Replaced slow listUsers)
    let userPayload: any = null;
    let userId: string | null = null;
    let existingProfile: any = null;

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
    } catch (profileErr) {
      console.warn("[VERIFY OTP] Profile lookup warn:", profileErr);
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
          // If already exists or error, assign deterministic ID
          userId = `wa_${cleanPhone.replace(/\D/g, "")}`;
        }
      } catch (authErr) {
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

    logger.security("VERIFY_OTP_SUCCESS", cleanPhone, true, { userId, role: userRole, isProfileComplete });

    // 8. Return Authenticated Session Response with cookie
    const response = NextResponse.json(
      {
        success: true,
        isProfileComplete,
        message: "WhatsApp OTP verified successfully.",
        user: userPayload,
        token: authToken,
      },
      { status: 200 }
    );

    // Set server-verifiable HTTP-only session cookie
    response.cookies.set("road_auth_token", authToken, {
      path: "/",
      maxAge: 30 * 24 * 3600, // 30 days
      sameSite: "lax",
      httpOnly: true, // HTTP-only to protect against XSS
      secure: process.env.NODE_ENV === "production",
    });

    response.cookies.set("road_user", "true", {
      path: "/",
      maxAge: 30 * 24 * 3600,
      sameSite: "lax",
      httpOnly: false,
    });

    return response;
  } catch (err: any) {
    logger.error("Unhandled Exception in POST /api/auth/verify-otp", { error: err?.message || err });
    return NextResponse.json(
      { success: false, error: "Internal server error during OTP verification." },
      { status: 500 }
    );
  }
}
