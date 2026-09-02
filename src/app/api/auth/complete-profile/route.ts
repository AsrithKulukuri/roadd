import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sanitizeIndianPhoneNumber } from "@/lib/validations/auth";
import { logger } from "@/lib/logger";
import { requireAuthUser, signSessionPayload } from "@/lib/server-auth-guard";

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
  role: z
    .enum(["buyer", "owner", "agent", "builder"])
    .optional()
    .default("buyer"),
});

export async function POST(request: Request) {
  try {
    const { errorResponse, user: authenticatedUser } = await requireAuthUser(request);
    if (errorResponse) return errorResponse;
    if (!authenticatedUser) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }

    const body = await request.json();

    const validationResult = completeProfileSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues[0]?.message || "Invalid input details";
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 }
      );
    }

    const { phone, name, email, role } = validationResult.data;
    const cleanPhone = phone.trim();
    const authenticatedPhone = sanitizeIndianPhoneNumber(authenticatedUser.phone || "");
    if (!authenticatedPhone || authenticatedPhone !== cleanPhone) {
      logger.security("PROFILE_PHONE_MISMATCH", cleanPhone, false, { userId: authenticatedUser.id });
      return NextResponse.json(
        { success: false, error: "The profile phone must match the verified OTP session." },
        { status: 403 }
      );
    }

    const userId = authenticatedUser.id;
    const userRole = authenticatedUser.role === "admin" ? "admin" : (role || "buyer");

    // 2. Upsert profile into public.profiles and user_profiles tables
    try {
      await Promise.allSettled([
        supabaseAdmin.from("profiles").upsert(
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
        ),
        supabaseAdmin.from("user_profiles").upsert(
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
        ),
      ]);
    } catch (error) {
      logger.error("Profile persistence failed", {
        error: error instanceof Error ? error.message : String(error),
        userId,
      });
      return NextResponse.json(
        { success: false, error: "Unable to save profile details. Please try again." },
        { status: 503 }
      );
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
  } catch (err: unknown) {
    logger.error("Unhandled Exception in POST /api/auth/complete-profile", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { success: false, error: "Failed to complete profile" },
      { status: 500 }
    );
  }
}
