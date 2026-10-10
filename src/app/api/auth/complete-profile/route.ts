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
    .optional()
    .transform((val) => val || "")
    .refine((val) => !val || (val.includes("@") && val.includes(".")), {
      message: "Please enter a valid email address or leave it blank",
    })
    .default(""),
  role: z
    .enum(["buyer", "agent", "owner", "builder"])
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

    const phone10 = cleanPhone.replace(/\D/g, "").slice(-10);
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let validUserId = uuidRegex.test(authenticatedUser.id) ? authenticatedUser.id : null;

    // 1. If session ID is not a valid UUID, resolve real Supabase Auth UUID
    if (!validUserId) {
      try {
        const { data: p } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .or(`phone.eq.${cleanPhone},phone.eq.+91${phone10},phone.eq.91${phone10},phone.eq.${phone10}`)
          .maybeSingle();

        if (p?.id && uuidRegex.test(p.id)) {
          validUserId = p.id;
        } else {
          const { data: up } = await supabaseAdmin
            .from("user_profiles")
            .select("id")
            .or(`phone.eq.${cleanPhone},phone.eq.+91${phone10},phone.eq.91${phone10},phone.eq.${phone10}`)
            .maybeSingle();

          if (up?.id && uuidRegex.test(up.id)) {
            validUserId = up.id;
          } else {
            const { data: authList } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
            const found = authList?.users?.find((u) => {
              const uPhone = (u.phone || "").replace(/\D/g, "");
              const metaPhone = (String(u.user_metadata?.phone || "")).replace(/\D/g, "");
              return (uPhone && uPhone.includes(phone10)) || (metaPhone && metaPhone.includes(phone10));
            });

            if (found?.id) {
              validUserId = found.id;
            } else {
              const { data: created } = await supabaseAdmin.auth.admin.createUser({
                phone: cleanPhone,
                phone_confirm: true,
                user_metadata: { phone: cleanPhone, role: role || "buyer", name, full_name: name },
              });
              if (created?.user?.id) {
                validUserId = created.user.id;
              }
            }
          }
        }
      } catch (idErr) {
        console.warn("[CompleteProfile] Error resolving auth UUID:", idErr);
      }
    }

    const userId = validUserId || authenticatedUser.id;
    const userRole = authenticatedUser.role === "admin" ? "admin" : (role || "buyer");

    // 2. Upsert profile into public.profiles and user_profiles tables
    // Note: profiles.email has a NOT NULL constraint, so empty emails use internal placeholder
    const cleanEmail = email ? email.toLowerCase() : `${phone10}@road.internal`;

    try {
      if (uuidRegex.test(userId)) {
        await Promise.allSettled([
          supabaseAdmin.from("profiles").upsert(
            {
              id: userId,
              phone: cleanPhone,
              full_name: name,
              email: cleanEmail,
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
              email: cleanEmail,
              role: userRole,
              is_verified: true,
              is_profile_complete: true,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" }
          ),
          supabaseAdmin.auth.admin.updateUserById(userId, {
            user_metadata: {
              name,
              full_name: name,
              role: userRole,
              phone: cleanPhone,
              isProfileComplete: true,
            },
          }),
        ]);
      }
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
      email: email ? email.toLowerCase() : "",
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
