import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sanitizeIndianPhoneNumber } from "@/lib/validations/auth";
import { logger } from "@/lib/logger";
import { signSessionPayload } from "@/lib/server-auth-guard";

const completeProfileSchema = z.object({
  phone: z
    .string()
    .trim()
    .transform((val) => sanitizeIndianPhoneNumber(val)),
  name: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters"),
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const validationResult = completeProfileSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues[0]?.message || "Invalid input details";
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 }
      );
    }

    const { phone, name, email } = validationResult.data;
    const cleanPhone = phone.trim();

    // 1. Find user in Supabase profiles/auth
    let userId: string | null = null;
    let userRole = "buyer";

    try {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id, role")
        .or(`phone.eq.${cleanPhone},phone.eq.${cleanPhone.replace(/\D/g, "")}`)
        .maybeSingle();

      if (profile) {
        userId = profile.id;
        if (profile.role) userRole = profile.role;
      }
    } catch {}

    if (!userId) {
      userId = `wa_${cleanPhone.replace(/\D/g, "")}`;
    }

    // 2. Upsert profile into public.profiles table
    try {
      await supabaseAdmin.from("profiles").upsert(
        {
          id: userId,
          phone: cleanPhone,
          full_name: name,
          email: email,
          role: userRole,
          is_verified: true,
          is_profile_complete: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
    } catch (e) {
      console.warn("Profiles table upsert warning:", e);
    }

    const userPayload = {
      id: userId,
      phone: cleanPhone,
      name: name,
      email: email,
      role: userRole,
      isVerified: true,
      isProfileComplete: true,
    };

    const authToken = signSessionPayload(userPayload);

    logger.security("PROFILE_COMPLETED", cleanPhone, true, { userId, name, email });

    const response = NextResponse.json(
      {
        success: true,
        message: "Profile completed successfully.",
        user: userPayload,
        token: authToken,
      },
      { status: 200 }
    );

    response.cookies.set("road_auth_token", authToken, {
      path: "/",
      maxAge: 30 * 24 * 3600,
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
  } catch (err: any) {
    logger.error("Unhandled Exception in POST /api/auth/complete-profile", { error: err?.message || err });
    return NextResponse.json(
      { success: false, error: "Failed to complete profile" },
      { status: 500 }
    );
  }
}
