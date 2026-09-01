export interface UserRoleInfo {
  isAdmin: boolean;
  role: string;
  user: unknown;
  source: string;
}

interface SessionPayload {
  authenticated?: boolean;
  user?: {
    id?: string;
    email?: string | null;
    phone?: string | null;
    role?: string;
  };
}

/**
 * Admin authority is resolved by the server from the authenticated session and
 * the profiles table. Client storage and email naming are never authorization.
 */
export async function verifyAdminSession(): Promise<UserRoleInfo> {
  try {
    const response = await fetch("/api/auth/session", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => null)) as SessionPayload | null;
    const isAdmin = response.ok && payload?.authenticated === true && payload.user?.role === "admin";

    return {
      isAdmin,
      role: isAdmin ? "admin" : payload?.user?.role || "guest",
      user: payload?.user ?? null,
      source: isAdmin ? "server_session" : "unauthenticated",
    };
  } catch {
    return {
      isAdmin: false,
      role: "guest",
      user: null,
      source: "unavailable",
    };
  }
}
