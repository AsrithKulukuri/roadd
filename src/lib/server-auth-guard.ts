import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase-admin";
import crypto from "crypto";

export interface AuthValidationResult {
  authorized: boolean;
  user: AuthenticatedUser | null;
  role: string;
  error?: string;
}

export interface AuthenticatedUser {
  id: string;
  phone: string;
  name: string;
  email: string;
  role: string;
  user_metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

function getSessionSecret(): string {
  const secret =
    process.env.SESSION_SECRET ||
    process.env.ADMIN_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be configured with at least 32 characters.");
  }

  return secret;
}

function secretsMatch(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

/**
 * Creates a cryptographically signed HMAC token for server-verifiable sessions
 */
export function signSessionPayload(payload: {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  role?: string;
  exp?: number;
}): string {
  const jsonStr = JSON.stringify({
    ...payload,
    exp: payload.exp || Date.now() + 30 * 24 * 3600 * 1000,
  });
  const b64 = Buffer.from(jsonStr).toString("base64url");
  const signature = crypto
    .createHmac("sha256", getSessionSecret())
    .update(b64)
    .digest("base64url");
  return `${b64}.${signature}`;
}

/**
 * Verifies and decodes a signed session token
 */
export function verifySignedSessionToken(token: string): {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  role?: string;
} | null {
  try {
    const [b64, signature] = token.split(".");
    if (!b64 || !signature) return null;
    if (token.length > 4096) return null;
    const expectedSig = crypto
      .createHmac("sha256", getSessionSecret())
      .update(b64)
      .digest("base64url");
    if (!secretsMatch(signature, expectedSig)) return null;
    const parsed = JSON.parse(Buffer.from(b64, "base64url").toString("utf8"));
    if (parsed.exp && Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Server-side helper to verify user and admin authorization.
 * Checks HMAC session token cookie/header, Supabase Bearer token, Supabase SSR cookies, and database role.
 */
export async function authenticateServerRequest(
  request: Request | NextRequest
): Promise<AuthValidationResult> {
  try {
    const authHeader = request.headers.get("authorization");
    let bearerToken: string | null = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      bearerToken = authHeader.substring(7).trim();
    }

    const cookieHeader = request.headers.get("cookie") || "";
    const cookieMap = new Map<string, string>();
    if (cookieHeader) {
      cookieHeader.split(";").forEach((c) => {
        const [name, ...rest] = c.trim().split("=");
        if (name) cookieMap.set(name, rest.join("="));
      });
    }

    const sessionCookieToken = cookieMap.get("road_auth_token");
    let user: AuthenticatedUser | null = null;

    // 1. Explicit Bearer token takes highest priority (Supabase JWT or signed token)
    if (bearerToken) {
      // 1a. Check Supabase Auth JWT
      try {
        const { data, error } = await supabaseAdmin.auth.getUser(bearerToken);
        if (!error && data?.user) {
          user = data.user as unknown as AuthenticatedUser;
        }
      } catch {}

      // 1b. If not Supabase JWT, check if signed HMAC session token
      if (!user) {
        const verifiedSession = verifySignedSessionToken(bearerToken);
        if (verifiedSession) {
          user = {
            id: verifiedSession.id,
            phone: verifiedSession.phone,
            name: verifiedSession.name || "Interested Buyer",
            email: verifiedSession.email || "",
            role: verifiedSession.role || "buyer",
            user_metadata: {
              role: verifiedSession.role || "buyer",
              name: verifiedSession.name,
              phone: verifiedSession.phone,
            },
          };
        }
      }
    }

    // 2. If no Bearer token, check signed HMAC session cookie
    if (!user && sessionCookieToken) {
      const verifiedSession = verifySignedSessionToken(sessionCookieToken);
      if (verifiedSession) {
        user = {
          id: verifiedSession.id,
          phone: verifiedSession.phone,
          name: verifiedSession.name || "Interested Buyer",
          email: verifiedSession.email || "",
          role: verifiedSession.role || "buyer",
          user_metadata: {
            role: verifiedSession.role || "buyer",
            name: verifiedSession.name,
            phone: verifiedSession.phone,
          },
        };
      }
    }

    // 3. Check Supabase SSR cookies if still not resolved
    if (!user && cookieHeader) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (supabaseUrl && supabaseAnonKey) {
        try {
          const ssrClient = createServerClient(supabaseUrl, supabaseAnonKey, {
            cookies: {
              getAll() {
                return Array.from(cookieMap.entries()).map(([name, value]) => ({
                  name,
                  value,
                }));
              },
              setAll() {},
            },
          });

          const {
            data: { user: cookieUser },
          } = await ssrClient.auth.getUser();
          if (cookieUser) {
            user = cookieUser as unknown as AuthenticatedUser;
          }
        } catch {}
      }
    }

    // 4. Check for Admin Secret Header (for server-to-server or secure maintenance calls)
    const adminSecretHeader = request.headers.get("x-admin-secret");
    const configuredAdminSecret = process.env.ADMIN_SECRET_KEY;
    if (
      adminSecretHeader &&
      configuredAdminSecret &&
      secretsMatch(adminSecretHeader.trim(), configuredAdminSecret.trim())
    ) {
      return {
        authorized: true,
        user: { id: "system_admin", phone: "918885005567", name: "System Administrator", email: "admin@road.internal", role: "admin" },
        role: "admin",
      };
    }

    if (!user) {
      return {
        authorized: false,
        user: null,
        role: "guest",
        error: "Authentication required",
      };
    }

    // 5. Resolve verified role & details from Supabase DB profiles or email
    let role = user.role || "buyer";
    let name = user.name || String(user.user_metadata?.name || user.user_metadata?.full_name || "");
    let phone = user.phone || String(user.user_metadata?.phone || "");
    let email = user.email || "";
    let profileFound = false;

    try {
      const profileQuery = supabaseAdmin
        .from("profiles")
        .select("id, role, full_name, phone, email")
        .eq("id", user.id)
        .maybeSingle();

      const { data: profile } = await profileQuery;

      if (profile) {
        profileFound = true;
        role = profile.role === "admin" ? "admin" : profile.role || "buyer";
        if (profile.full_name) name = profile.full_name;
        if (profile.phone) phone = profile.phone;
        if (profile.email && !profile.email.endsWith("@road.internal")) email = profile.email;
      } else if (email) {
        const { data: emailProfile } = await supabaseAdmin
          .from("profiles")
          .select("id, role, full_name, phone, email")
          .eq("email", email.toLowerCase())
          .maybeSingle();
        if (emailProfile) {
          profileFound = true;
          role = emailProfile.role === "admin" ? "admin" : emailProfile.role || "buyer";
          if (emailProfile.full_name) name = emailProfile.full_name;
        }
      }

      // Check user_profiles table as well if not found in profiles
      if (!profileFound) {
        const { data: upProfile } = await supabaseAdmin
          .from("user_profiles")
          .select("id, role, full_name, phone, email")
          .or(`id.eq.${user.id}${email ? `,email.eq.${email.toLowerCase()}` : ""}`)
          .maybeSingle();
        if (upProfile) {
          profileFound = true;
          role = upProfile.role === "admin" ? "admin" : upProfile.role || "buyer";
          if (upProfile.full_name) name = upProfile.full_name;
          if (upProfile.phone) phone = upProfile.phone;
          if (upProfile.email) email = upProfile.email;
        }
      }
    } catch {}

    const isExplicitAdminEmail = Boolean(email && email.toLowerCase().trim() === "admin@road.com");
    const isAdmin =
      (profileFound && role === "admin") ||
      isExplicitAdminEmail ||
      (typeof user.app_metadata === "object" && (user.app_metadata as Record<string, unknown>)?.role === "admin");

    const resolvedUser = {
      ...user,
      id: user.id,
      name: name || user.name || "Interested Buyer",
      phone: phone || user.phone || "",
      email: email || user.email || "",
      role: isAdmin ? "admin" : role,
    };

    return {
      authorized: true,
      user: resolvedUser,
      role: isAdmin ? "admin" : role,
    };
  } catch (err: unknown) {
    return {
      authorized: false,
      user: null,
      role: "guest",
      error: err instanceof Error ? err.message : "Authentication failed",
    };
  }
}

/**
 * Strict Admin Authorization Guard for API Routes
 */
export async function requireAdmin(
  request: Request | NextRequest
): Promise<{ errorResponse?: NextResponse; user?: AuthenticatedUser }> {
  const auth = await authenticateServerRequest(request);

  if (!auth.authorized || auth.role !== "admin" || !auth.user) {
    return {
      errorResponse: NextResponse.json(
        {
          success: false,
          error: "Forbidden: Admin privileges required to perform this action.",
        },
        { status: 403 }
      ),
    };
  }

  return { user: auth.user };
}

/**
 * Logged-in User Authorization Guard for API Routes
 */
export async function requireAuthUser(
  request: Request | NextRequest
): Promise<{ errorResponse?: NextResponse; user?: AuthenticatedUser }> {
  const auth = await authenticateServerRequest(request);

  if (!auth.authorized || !auth.user) {
    return {
      errorResponse: NextResponse.json(
        {
          success: false,
          error: "Unauthorized: Please log in to perform this action.",
        },
        { status: 401 }
      ),
    };
  }

  return { user: auth.user };
}
