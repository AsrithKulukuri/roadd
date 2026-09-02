import { NextResponse } from "next/server";
import { signSessionPayload, verifySignedSessionToken } from "@/lib/server-auth-guard";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const ADMIN_EMAILS = [
  "admin@road.com",
  "admin@roadapp.com",
  "aasrith@road.com",
  "kulukuri@road.com",
];

function isAdminEmail(email?: string): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  return ADMIN_EMAILS.includes(normalized) || normalized.endsWith("@road.com");
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    let token: string | null = null;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
    }

    if (!token) {
      // Fallback: check cookie
      const cookieHeader = request.headers.get("cookie") || "";
      const match = cookieHeader.match(/road_auth_token=([^;]+)/);
      if (match) token = match[1];
    }

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Authentication token required." },
        { status: 401 }
      );
    }

    let authUser: any = null;

    // 1. Check Supabase Auth with Bearer token
    try {
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      if (!error && data?.user) {
        authUser = data.user;
      }
    } catch (err) {
      console.warn("[ADMIN-SESSION] Supabase getUser failed, falling back to HMAC token check:", err);
    }

    // 2. Check if HMAC session token
    if (!authUser) {
      const session = verifySignedSessionToken(token);
      if (session) {
        authUser = {
          id: session.id,
          email: session.email,
          phone: session.phone,
          user_metadata: { name: session.name, role: session.role },
        };
      }
    }

    if (!authUser) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired administrator token." },
        { status: 401 }
      );
    }

    const userEmail = (authUser.email || "").toLowerCase().trim();
    const userPhone = (authUser.phone || "").trim();
    const userId = authUser.id;

    // 3. Verify Admin Status
    let isAuthorizedAdmin = false;

    // Check 3a: Explicit admin email or domain
    if (isAdminEmail(userEmail)) {
      isAuthorizedAdmin = true;
    }

    // Check 3b: User metadata or app metadata
    if (
      authUser.user_metadata?.role === "admin" ||
      authUser.app_metadata?.role === "admin" ||
      authUser.role === "admin"
    ) {
      isAuthorizedAdmin = true;
    }

    // Check 3c: Database profiles / user_profiles table
    if (!isAuthorizedAdmin) {
      try {
        const { data: p } = await supabaseAdmin
          .from("profiles")
          .select("id, role")
          .or(`id.eq.${userId}${userEmail ? `,email.eq.${userEmail}` : ""}`)
          .maybeSingle();
        if (p?.role === "admin") {
          isAuthorizedAdmin = true;
        }
      } catch {}
    }

    if (!isAuthorizedAdmin) {
      try {
        const { data: up } = await supabaseAdmin
          .from("user_profiles")
          .select("id, role")
          .or(`id.eq.${userId}${userEmail ? `,email.eq.${userEmail}` : ""}`)
          .maybeSingle();
        if (up?.role === "admin") {
          isAuthorizedAdmin = true;
        }
      } catch {}
    }

    if (!isAuthorizedAdmin) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Admin privileges required to perform this action." },
        { status: 403 }
      );
    }

    // 4. Ensure admin role is persisted in both profiles & user_profiles tables
    const adminName = authUser.user_metadata?.full_name || authUser.user_metadata?.name || "Administrator";
    try {
      await supabaseAdmin.from("profiles").upsert(
        {
          id: userId,
          email: userEmail || "admin@road.com",
          role: "admin",
          full_name: adminName,
          phone: userPhone,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
    } catch {}

    try {
      await supabaseAdmin.from("user_profiles").upsert(
        {
          id: userId,
          email: userEmail || "admin@road.com",
          role: "admin",
          full_name: adminName,
          phone: userPhone,
          is_verified: true,
          is_profile_complete: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
    } catch {}

    // 5. Sign new verified Admin Session Token
    const sessionPayload = {
      id: userId,
      phone: userPhone,
      name: adminName,
      email: userEmail || "admin@road.com",
      role: "admin",
    };

    const sessionToken = signSessionPayload(sessionPayload);

    const response = NextResponse.json({
      success: true,
      user: sessionPayload,
    });

    response.cookies.set("road_auth_token", sessionToken, {
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
      sameSite: "lax",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });

    response.cookies.set("road_user", "true", {
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
      sameSite: "lax",
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch (err: any) {
    console.error("[ADMIN-SESSION ERROR]", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to establish admin session." },
      { status: 500 }
    );
  }
}
