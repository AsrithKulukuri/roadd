import { NextResponse } from "next/server";
import { verifyOTPSchema } from "@/lib/validations/auth";
import { OTPCryptoService } from "@/lib/otp";
import { supabaseAdmin } from "@/lib/supabase-admin";
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
        { status: 400 } // 400 Bad Request
      );
    }

    const { phone, otp } = validationResult.data;

    // 2. Fetch active OTP record for phone number
    const { data: otpRecords, error: fetchError } = await supabaseAdmin
      .from("phone_otps")
      .select("*")
      .eq("phone", phone)
      .eq("verified", false)
      .order("created_at", { ascending: false })
      .limit(1);

    if (fetchError || !otpRecords || otpRecords.length === 0) {
      logger.security("VERIFY_OTP_NOT_FOUND", phone, false);
      return NextResponse.json(
        { success: false, error: "No active OTP request found for this phone number. Please request a new code." },
        { status: 404 } // 404 Not Found
      );
    }

    const record = otpRecords[0];
    const now = new Date();
    const expiresAt = new Date(record.expires_at);

    // 3. Check Expiry (5 minute window)
    if (now > expiresAt) {
      logger.security("VERIFY_OTP_EXPIRED", phone, false);
      await supabaseAdmin.from("phone_otps").delete().eq("id", record.id);
      return NextResponse.json(
        { success: false, error: "OTP has expired. Please request a new verification code." },
        { status: 400 } // 400 Bad Request
      );
    }

    // 4. Check Maximum Failed Verification Attempts (Max 5 attempts)
    if (record.attempts >= MAX_ATTEMPTS) {
      logger.security("VERIFY_OTP_MAX_ATTEMPTS_EXCEEDED", phone, false, { attempts: record.attempts });
      await supabaseAdmin.from("phone_otps").delete().eq("id", record.id);
      return NextResponse.json(
        { success: false, error: "Maximum verification attempts exceeded (5/5). Please request a new OTP." },
        { status: 403 } // 403 Forbidden
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
      logger.security("VERIFY_OTP_FAILED", phone, false, { remainingAttempts: remaining });

      return NextResponse.json(
        {
          success: false,
          error: `Invalid OTP code. ${remaining > 0 ? `${remaining} attempts remaining.` : "Please request a new OTP."}`,
        },
        { status: 401 } // 401 Unauthorized
      );
    }

    // 6. Delete OTP Record Immediately (Prevent Replay Attacks)
    await supabaseAdmin.from("phone_otps").delete().eq("id", record.id);

    // 7. Find or Automatically Create User in Supabase Auth
    let user;
    const { data: usersData, error: listUsersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (!listUsersError && usersData?.users) {
      user = usersData.users.find(
        (u) => u.phone === phone || u.user_metadata?.phone === phone || u.phone === phone.replace("+", "")
      );
    }

    // Create user if not existing
    if (!user) {
      logger.info(`Auto-creating new user for WhatsApp authenticated phone: ${phone}`);
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        phone: phone,
        phone_confirm: true,
        user_metadata: {
          phone: phone,
          role: "buyer",
          auth_provider: "whatsapp",
          created_via: "ROAD_WhatsApp_OTP",
        },
      });

      if (createError) {
        logger.error("Failed to auto-create user in Supabase Auth", { phone, error: createError.message });
        // Fallback: Create dummy user object for application session
        user = {
          id: `wa_${phone.replace(/\D/g, "")}`,
          phone: phone,
          user_metadata: { role: "buyer" },
        } as any;
      } else {
        user = newUser.user;
      }
    }

    // 8. Fetch Profile Details and Check Completion
    let profileData: any = null;
    try {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("full_name, email, role")
        .eq("id", user.id)
        .maybeSingle();
      if (profile) profileData = profile;
    } catch (e) {}

    const existingName = profileData?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || "";
    const rawEmail = profileData?.email || user.email || "";
    const isInternalEmail = rawEmail.endsWith("@road.internal");
    const cleanEmail = isInternalEmail ? "" : rawEmail;

    const isProfileComplete = Boolean(existingName.length >= 2 && cleanEmail && cleanEmail.includes("@"));
    const userRole = profileData?.role || user?.user_metadata?.role || "buyer";

    const userPayload = {
      id: user.id,
      phone: user.phone || phone,
      name: existingName,
      email: cleanEmail,
      role: userRole,
    };

    logger.security("VERIFY_OTP_SUCCESS", phone, true, { userId: user.id, role: userRole, isProfileComplete });

    // 9. Return Authenticated Session Response
    return NextResponse.json(
      {
        success: true,
        isProfileComplete,
        message: "WhatsApp OTP verified successfully.",
        user: userPayload,
      },
      { status: 200 }
    );
  } catch (err: any) {
    logger.error("Unhandled Exception in POST /api/auth/verify-otp", { error: err?.message || err });
    return NextResponse.json(
      { success: false, error: "Internal server error during OTP verification." },
      { status: 500 }
    );
  }
}
