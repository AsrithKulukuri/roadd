import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sanitizeIndianPhoneNumber } from "@/lib/validations/auth";
import { logger } from "@/lib/logger";

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

    // 1. Find user in Supabase Auth by phone
    const { data: usersData, error: listUsersError } = await supabaseAdmin.auth.admin.listUsers();
    let targetUser = undefined;

    if (!listUsersError && usersData?.users) {
      targetUser = usersData.users.find(
        (u) => u.phone === phone || u.user_metadata?.phone === phone || u.phone === phone.replace("+", "")
      );
    }

    let userId = targetUser?.id;

    // Update metadata if user exists in Supabase Auth
    if (targetUser && userId) {
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        email: email,
        email_confirm: true,
        user_metadata: {
          ...targetUser.user_metadata,
          full_name: name,
          name: name,
          email: email,
          phone: phone,
          role: targetUser.user_metadata?.role || "buyer",
          is_verified: true,
          is_profile_complete: true,
        },
      });
    }

    // 2. Upsert profile into public.profiles table (if table exists)
    try {
      if (userId) {
        await supabaseAdmin.from("profiles").upsert(
          {
            id: userId,
            phone: phone,
            full_name: name,
            email: email,
            role: "buyer",
            is_verified: true,
            is_profile_complete: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );
      }
    } catch (e) {
      console.warn("Profiles table upsert warning:", e);
    }

    const userPayload = {
      id: userId || `wa_${phone.replace(/\D/g, "")}`,
      phone: phone,
      name: name,
      email: email,
      role: "buyer",
      isVerified: true,
      isProfileComplete: true,
    };

    logger.security("PROFILE_COMPLETED", phone, true, { userId, name, email });

    return NextResponse.json(
      {
        success: true,
        message: "Profile details updated successfully",
        user: userPayload,
      },
      { status: 200 }
    );
  } catch (err: any) {
    logger.error("Unhandled Exception in POST /api/auth/complete-profile", { error: err?.message || err });
    return NextResponse.json(
      { success: false, error: "Failed to update profile details. Please try again." },
      { status: 500 }
    );
  }
}
