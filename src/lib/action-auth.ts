"use client";
import type { SessionUser } from "@/hooks/use-auth-session";

function getLocalVerifiedUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("road_user");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.isLoggedIn && parsed.phone) {
      const cleanPhone = String(parsed.phone).replace(/\D/g, "");
      if (cleanPhone.length >= 10) {
        return parsed as SessionUser;
      }
    }
  } catch {}
  return null;
}

export async function readActionSession(): Promise<SessionUser | null> {
  const localUser = getLocalVerifiedUser();
  try {
    const response = await fetch("/api/auth/session", { cache: "no-store", credentials: "include" });
    if (response.status === 401) return localUser;
    const data = await response.json();
    if (!response.ok) return localUser;
    if (data.authenticated && data.user) {
      const phone = data.user.phone || localUser?.phone;
      if (phone) {
        return {
          ...data.user,
          phone,
          name: data.user.name || localUser?.name || "User",
        };
      }
    }
    return localUser;
  } catch {
    return localUser;
  }
}

let pending: Promise<SessionUser | null> | null = null;
export async function requireActionSession(action: string): Promise<SessionUser | null> {
  const user = await readActionSession();
  if (user && user.phone) return user;
  if (!pending) pending = new Promise<SessionUser | null>(resolve => {
    window.dispatchEvent(new CustomEvent("road_request_action_auth", { detail: { action, resolve } }));
  }).finally(() => { pending = null; });
  return pending;
}
