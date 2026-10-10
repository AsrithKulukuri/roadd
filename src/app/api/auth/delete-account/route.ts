import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAuthUser } from "@/lib/server-auth-guard";
import { sanitizeIndianPhoneNumber } from "@/lib/validations/auth";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const userIds = new Set<string>();
    const phoneCandidates = new Set<string>();
    const emailCandidates = new Set<string>();

    // 1. Try reading from authenticated session (server cookie / HMAC token)
    try {
      const { user: authenticatedUser } = await requireAuthUser(request);
      if (authenticatedUser) {
        if (authenticatedUser.id) userIds.add(authenticatedUser.id);
        if (authenticatedUser.phone) phoneCandidates.add(authenticatedUser.phone);
        if (authenticatedUser.email) emailCandidates.add(authenticatedUser.email.toLowerCase().trim());
      }
    } catch {}

    // 2. Try inspecting Bearer header if passed directly
    try {
      const authHeader = request.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.substring(7).trim();
        const { data } = await supabaseAdmin.auth.getUser(token);
        if (data?.user) {
          if (data.user.id) userIds.add(data.user.id);
          if (data.user.phone) phoneCandidates.add(data.user.phone);
          if (data.user.email) emailCandidates.add(data.user.email.toLowerCase().trim());
        }
      }
    } catch {}

    // 3. Inspect request body (fallback or explicit client payload)
    try {
      const body = await request.json().catch(() => ({}));
      if (body?.userId) {
        userIds.add(String(body.userId).trim());
      }
      if (body?.phone) {
        phoneCandidates.add(String(body.phone).trim());
      }
      if (body?.email) {
        emailCandidates.add(String(body.email).toLowerCase().trim());
      }
    } catch {}

    // Build all phone variants
    const allPhoneVariants = new Set<string>();
    phoneCandidates.forEach((raw) => {
      const cleaned = sanitizeIndianPhoneNumber(raw);
      if (cleaned) {
        const phone10 = cleaned.replace(/\D/g, "").slice(-10);
        if (phone10.length === 10) {
          allPhoneVariants.add(phone10);
          allPhoneVariants.add(`91${phone10}`);
          allPhoneVariants.add(`+91${phone10}`);
        }
      }
    });

    const phoneVariantsList = Array.from(allPhoneVariants);
    const emailList = Array.from(emailCandidates).filter(Boolean);

    logger.security(
      "ACCOUNT_DELETION_INVOKED",
      phoneVariantsList[0] || Array.from(userIds)[0] || "unknown",
      true,
      {
        userIds: Array.from(userIds),
        phoneVariants: phoneVariantsList,
        emails: emailList,
      }
    );

    // 4. Resolve ANY linked user IDs from profiles, user_profiles, and auth.users
    if (phoneVariantsList.length > 0) {
      try {
        const { data: pList } = await supabaseAdmin
          .from("profiles")
          .select("id, phone, email")
          .in("phone", phoneVariantsList);
        pList?.forEach((p) => {
          if (p.id) userIds.add(p.id);
          if (p.email) emailCandidates.add(p.email.toLowerCase().trim());
        });
      } catch (e) {
        console.warn("[DeleteAccount] Warning checking profiles:", e);
      }

      try {
        const { data: upList } = await supabaseAdmin
          .from("user_profiles")
          .select("id, phone, email")
          .in("phone", phoneVariantsList);
        upList?.forEach((p) => {
          if (p.id) userIds.add(p.id);
          if (p.email) emailCandidates.add(p.email.toLowerCase().trim());
        });
      } catch (e) {
        console.warn("[DeleteAccount] Warning checking user_profiles:", e);
      }
    }

    if (emailList.length > 0) {
      try {
        const { data: pList } = await supabaseAdmin
          .from("profiles")
          .select("id, phone, email")
          .in("email", emailList);
        pList?.forEach((p) => {
          if (p.id) userIds.add(p.id);
        });
      } catch {}

      try {
        const { data: upList } = await supabaseAdmin
          .from("user_profiles")
          .select("id, phone, email")
          .in("email", emailList);
        upList?.forEach((p) => {
          if (p.id) userIds.add(p.id);
        });
      } catch {}
    }

    // Also scan auth.users for any match by phone or email
    try {
      const { data: authList } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      authList?.users?.forEach((u) => {
        const uPhone = (u.phone || "").replace(/\D/g, "").slice(-10);
        const metaPhone = String(u.user_metadata?.phone || "").replace(/\D/g, "").slice(-10);
        const uEmail = (u.email || "").toLowerCase().trim();

        const phoneMatches = phoneVariantsList.some((pv) => {
          const pv10 = pv.replace(/\D/g, "").slice(-10);
          return (uPhone && uPhone === pv10) || (metaPhone && metaPhone === pv10);
        });

        const emailMatches = emailList.includes(uEmail);

        if (phoneMatches || emailMatches) {
          userIds.add(u.id);
        }
      });
    } catch (e) {
      console.warn("[DeleteAccount] Warning listing auth users:", e);
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const resolvedUserIds = Array.from(userIds).filter((id) => uuidRegex.test(id));

    // 5. Delete from dependent / foreign key tables first
    if (resolvedUserIds.length > 0) {
      try {
        await supabaseAdmin.from("saved_properties").delete().in("user_id", resolvedUserIds);
      } catch {}
      try {
        await supabaseAdmin.from("project_site_visits").delete().in("user_id", resolvedUserIds);
      } catch {}
    }

    if (phoneVariantsList.length > 0) {
      try {
        await supabaseAdmin.from("project_leads").delete().in("phone", phoneVariantsList);
      } catch {}
      try {
        await supabaseAdmin.from("phone_otps").delete().in("phone", phoneVariantsList);
      } catch {}
    }

    // 6. Delete from profiles table
    try {
      if (resolvedUserIds.length > 0) {
        await supabaseAdmin.from("profiles").delete().in("id", resolvedUserIds);
      }
      if (phoneVariantsList.length > 0) {
        await supabaseAdmin.from("profiles").delete().in("phone", phoneVariantsList);
      }
      if (emailList.length > 0) {
        await supabaseAdmin.from("profiles").delete().in("email", emailList);
      }
    } catch (e) {
      console.warn("[DeleteAccount] Warning deleting from profiles:", e);
    }

    // 7. Delete from user_profiles table
    try {
      if (resolvedUserIds.length > 0) {
        await supabaseAdmin.from("user_profiles").delete().in("id", resolvedUserIds);
      }
      if (phoneVariantsList.length > 0) {
        await supabaseAdmin.from("user_profiles").delete().in("phone", phoneVariantsList);
      }
      if (emailList.length > 0) {
        await supabaseAdmin.from("user_profiles").delete().in("email", emailList);
      }
    } catch (e) {
      console.warn("[DeleteAccount] Warning deleting from user_profiles:", e);
    }

    // 8. Delete from Supabase Auth (auth.users)
    for (const uid of resolvedUserIds) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(uid);
      } catch (e) {
        console.warn(`[DeleteAccount] Warning deleting auth user ${uid}:`, e);
      }
    }

    const response = NextResponse.json({
      success: true,
      message: "Your account and all associated profile details have been permanently deleted.",
      deletedUserIds: resolvedUserIds,
    });

    // Clear all authentication and session cookies
    for (const cookieName of [
      "road_auth_token",
      "road_user",
      "road_admin_user",
      "road_builder_id",
    ]) {
      response.cookies.set(cookieName, "", {
        path: "/",
        maxAge: 0,
        sameSite: "lax",
        httpOnly: cookieName === "road_auth_token",
        secure: process.env.NODE_ENV === "production",
      });
    }

    return response;
  } catch (error) {
    console.error("[DeleteAccount] Unexpected error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete account. Please try again." },
      { status: 500 }
    );
  }
}
