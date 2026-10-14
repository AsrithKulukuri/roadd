"use client";
import type { SessionUser } from "@/hooks/use-auth-session";

let cachedSession: { user: SessionUser | null; timestamp: number } | null = null;
let inflightSession: Promise<SessionUser | null> | null = null;

if (typeof window !== "undefined") {
  window.addEventListener("road_auth_changed", () => {
    cachedSession = null;
    inflightSession = null;
  });
}

export async function readActionSession(force = false): Promise<SessionUser | null> {
  const now = Date.now();
  if (!force && cachedSession && now - cachedSession.timestamp < 30000) {
    return cachedSession.user;
  }
  if (inflightSession) return inflightSession;

  inflightSession = (async () => {
    try {
      const response = await fetch("/api/auth/session", { cache: "no-store", credentials: "include" });
      if (response.status === 401) {
        cachedSession = { user: null, timestamp: Date.now() };
        return null;
      }
      if (!response.ok) throw new Error("Unable to verify your session. Please try again.");
      const data = await response.json();
      const user = data.authenticated && data.user?.phone ? data.user : null;
      cachedSession = { user, timestamp: Date.now() };
      return user;
    } finally {
      inflightSession = null;
    }
  })();

  return inflightSession;
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

