"use client";

import { useState, useEffect, useCallback } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export interface SessionUser {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  isLoggedIn?: boolean;
}

function isValidSessionUser(data: unknown): data is SessionUser {
  if (!data || typeof data !== "object") return false;
  const user = data as Record<string, unknown>;
  if (user.isLoggedIn !== true) return false;

  const hasPhone = typeof user.phone === "string" && user.phone.trim().length >= 8;
  const hasEmail = typeof user.email === "string" && user.email.includes("@");
  const hasId =
    typeof user.id === "string" &&
    user.id.trim().length > 0 &&
    user.id !== "undefined" &&
    user.id !== "null";

  return Boolean(hasPhone || hasEmail || hasId);
}

export async function logoutUser() {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch (error) {
    console.error("Server session logout error:", error);
  }

  if (isSupabaseConfigured()) {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Supabase sign out error:", e);
    }
  }

  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem("road_user");
      localStorage.removeItem("road_admin_user");
      // Clear cookie session flags
      document.cookie = "road_user=; Max-Age=0; path=/; SameSite=Lax";
    } catch {}

    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new CustomEvent("road_auth_changed"));
  }
}

export function useAuthSession() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    // 1. Check active Supabase Auth session first
    if (isSupabaseConfigured()) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          const u = session.user;
          const sessionUser: SessionUser = {
            id: u.id,
            name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split("@")[0] || "User",
            email: u.email || "",
            phone: u.phone || u.user_metadata?.phone || "",
            role: u.user_metadata?.role || "buyer",
            isLoggedIn: true,
          };
          setUser(sessionUser);
          setIsLoggedIn(true);
          setIsLoading(false);
          return;
        }
      } catch (e) {
        console.error("Error reading Supabase session:", e);
      }
    }

    // 2. Check localStorage fallback (WhatsApp OTP / verified local session)
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("road_user");
        if (raw && raw !== "true" && raw !== "null" && raw !== "undefined") {
          const parsed = JSON.parse(raw);
          if (isValidSessionUser(parsed)) {
            setUser({
              id: parsed.id,
              name: parsed.name || "User",
              email: parsed.email || "",
              phone: parsed.phone || "",
              role: parsed.role || "buyer",
              isLoggedIn: true,
            });
            setIsLoggedIn(true);
            setIsLoading(false);
            return;
          }
        }
      } catch (e) {
        console.error("Error parsing local storage auth session:", e);
      }
    }

    setUser(null);
    setIsLoggedIn(false);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    checkAuth();

    // Listen for storage events (e.g. login/logout in another tab or window)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "road_user" || !e.key) {
        checkAuth();
      }
    };
    const handleCustomAuth = () => {
      checkAuth();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("road_auth_changed", handleCustomAuth);

    // Listen for Supabase auth state changes
    let unsubscribeSupabase: (() => void) | undefined;
    if (isSupabaseConfigured()) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user?.id) {
          const u = session.user;
          setUser({
            id: u.id,
            name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split("@")[0] || "User",
            email: u.email || "",
            phone: u.phone || u.user_metadata?.phone || "",
            role: u.user_metadata?.role || "buyer",
            isLoggedIn: true,
          });
          setIsLoggedIn(true);
          setIsLoading(false);
        } else {
          // If Supabase signed out, verify if local storage still has verified session
          const raw = typeof window !== "undefined" ? localStorage.getItem("road_user") : null;
          if (!raw) {
            setUser(null);
            setIsLoggedIn(false);
            setIsLoading(false);
          } else {
            try {
              const parsed = JSON.parse(raw);
              if (!isValidSessionUser(parsed)) {
                setUser(null);
                setIsLoggedIn(false);
                setIsLoading(false);
              }
            } catch {
              setUser(null);
              setIsLoggedIn(false);
              setIsLoading(false);
            }
          }
        }
      });
      unsubscribeSupabase = () => subscription.unsubscribe();
    }

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("road_auth_changed", handleCustomAuth);
      if (unsubscribeSupabase) unsubscribeSupabase();
    };
  }, [checkAuth]);

  /**
   * Helper to construct login redirect URL preserving return destination
   */
  const getLoginUrl = useCallback((returnPath?: string) => {
    const target = returnPath || (typeof window !== "undefined" ? (window.location.pathname + window.location.search) : "/");
    return `/login?redirect=${encodeURIComponent(target)}`;
  }, []);

  return {
    isLoggedIn,
    user,
    isLoading,
    getLoginUrl,
    refreshAuth: checkAuth,
  };
}
