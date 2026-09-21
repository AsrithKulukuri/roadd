"use client";
import type { SessionUser } from "@/hooks/use-auth-session";

export async function readActionSession(): Promise<SessionUser | null> {
  const response = await fetch("/api/auth/session", { cache: "no-store", credentials: "include" });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error("Unable to verify your session. Please try again.");
  const data = await response.json();
  return data.authenticated && data.user?.phone ? data.user : null;
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
