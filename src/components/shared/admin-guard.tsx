"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { verifyAdminSession } from "@/lib/admin-auth";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  // Exclude /admin/login from protection
  const isAdminLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (isAdminLoginPage) {
      console.log("[AUTH DEBUG] AdminGuard: /admin/login page detected. Bypassing guard.");
      setIsLoading(false);
      setIsAuthorized(true);
      return;
    }

    let isMounted = true;

    const runAuthCheck = async () => {
      console.log("[AUTH DEBUG] AdminGuard evaluating route:", pathname);
      setIsLoading(true);

      const result = await verifyAdminSession();
      console.log("[AUTH DEBUG] AdminGuard verification result:", result);

      if (!isMounted) return;

      if (result.isAdmin) {
        console.log("[AUTH DEBUG] AdminGuard: Access granted to admin route");
        setIsAuthorized(true);
      } else {
        console.log("[AUTH DEBUG] AdminGuard: Access denied. Redirecting to /admin/login");
        setIsAuthorized(false);
        router.push("/admin/login");
      }

      setIsLoading(false);
    };

    runAuthCheck();

    // Subscribe to Supabase Auth changes
    if (isSupabaseConfigured()) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log("[AUTH DEBUG] AdminGuard onAuthStateChange event:", event, session?.user?.email);
        if (event === "SIGNED_OUT") {
          console.log("[AUTH DEBUG] AdminGuard: User signed out. Redirecting to /admin/login");
          setIsAuthorized(false);
          router.push("/admin/login");
        } else if (session?.user) {
          const res = await verifyAdminSession();
          if (res.isAdmin) {
            setIsAuthorized(true);
          } else {
            setIsAuthorized(false);
            router.push("/admin/login");
          }
        }
      });

      return () => {
        isMounted = false;
        subscription.unsubscribe();
      };
    }

    return () => {
      isMounted = false;
    };
  }, [pathname, router, isAdminLoginPage]);

  // If viewing the admin login page, return children directly
  if (isAdminLoginPage) {
    return <>{children}</>;
  }

  // Loading spinner during initial session hydration
  if (isLoading || isAuthorized === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white space-y-4">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Verifying Admin Credentials...
        </p>
      </div>
    );
  }

  // Un-authorized redirecting state
  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}
