"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Ignore admin routes completely — AdminGuard handles admin routes
  if (pathname.startsWith("/admin")) {
    return <>{children}</>;
  }

  useEffect(() => {
    const checkAuth = async () => {
      // 1. First check Supabase session if configured
      if (isSupabaseConfigured()) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            setIsAuthenticated(true);
            return;
          }
        } catch (e) {
          console.error("AuthGuard session fetch error:", e);
        }
      }

      // 2. Check localStorage fallback session
      const stored = localStorage.getItem("road_user");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.isLoggedIn) {
            setIsAuthenticated(true);
            return;
          }
        } catch (e) {}
      }

      setIsAuthenticated(false);
    };

    checkAuth();

    // Subscribe to state changes if Supabase is active
    if (isSupabaseConfigured()) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (session?.user) {
          setIsAuthenticated(true);
        } else {
          // If local storage also doesn't show logged in, log out
          const stored = localStorage.getItem("road_user");
          if (!stored) {
            setIsAuthenticated(false);
          }
        }
      });
      return () => subscription.unsubscribe();
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated === false) {
      toast.error("Sign in required", {
        description: "Please sign in to view property listing details.",
      });
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  // Loading state
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <span className="w-8 h-8 rounded-full border-3 border-amber-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // Redirecting state
  if (isAuthenticated === false) {
    return null;
  }

  return <>{children}</>;
}
