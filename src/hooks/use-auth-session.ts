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

export function useAuthSession() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    // 1. Check Supabase Auth session first
    if (isSupabaseConfigured()) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
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

    // 2. Check localStorage session (WhatsApp OTP / unified login / dev session)
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("road_user");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.isLoggedIn) {
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

        // 3. Check intentional admin bypass session
        const adminStored = localStorage.getItem("road_admin_user");
        if (adminStored) {
          const parsedAdmin = JSON.parse(adminStored);
          if (parsedAdmin.isLoggedIn || parsedAdmin.isAdmin || parsedAdmin.role === "admin") {
            setUser({
              id: parsedAdmin.id || "admin",
              name: parsedAdmin.name || "Admin",
              email: parsedAdmin.email || "admin@road.com",
              phone: parsedAdmin.phone || "",
              role: "admin",
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

    // Listen for storage events (e.g. login in another tab or modal)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "road_user" || e.key === "road_admin_user") {
        checkAuth();
      }
    };
    window.addEventListener("storage", handleStorage);

    // Listen for Supabase auth state changes if configured
    let unsubscribeSupabase: (() => void) | undefined;
    if (isSupabaseConfigured()) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
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
          // If Supabase signed out, verify if local storage still has session
          const stored = typeof window !== "undefined" ? localStorage.getItem("road_user") : null;
          if (!stored) {
            setUser(null);
            setIsLoggedIn(false);
          }
        }
      });
      unsubscribeSupabase = () => subscription.unsubscribe();
    }

    return () => {
      window.removeEventListener("storage", handleStorage);
      if (unsubscribeSupabase) unsubscribeSupabase();
    };
  }, [checkAuth]);

  /**
   * Helper to construct login redirect URL
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
