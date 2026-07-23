"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Logo } from "@/components/shared/logo";

import { verifyAdminSession } from "@/lib/admin-auth";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const processCallback = async () => {
      console.log("[AUTH DEBUG] AuthCallbackPage processing callback...");
      try {
        // 1. Get session from URL / PKCE exchange
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (session?.user) {
          const u = session.user;
          const adminCheck = await verifyAdminSession();
          console.log("[AUTH DEBUG] AuthCallback admin verification result:", adminCheck);

          const role = adminCheck.isAdmin ? "admin" : (u.user_metadata?.role || "buyer");
          const localUser = {
            name: u.user_metadata?.full_name || u.user_metadata?.name || "User",
            email: u.email || "",
            phone: u.phone || u.user_metadata?.phone || "",
            role: role,
            isProfileComplete: true,
            isLoggedIn: true,
            authMethod: "oauth",
          };

          localStorage.setItem("road_user", JSON.stringify(localUser));
          if (adminCheck.isAdmin) {
            localStorage.setItem("road_admin_user", JSON.stringify(localUser));
          }

          toast.success("Successfully logged in!");
          const targetRoute = adminCheck.isAdmin ? "/admin/dashboard" : "/dashboard";
          console.log("[AUTH DEBUG] Redirecting authenticated user to:", targetRoute);
          router.replace(targetRoute);
          return;
        }

        // 2. Fallback listener for async state resolution
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, currentSession) => {
            console.log("[AUTH DEBUG] AuthCallback onAuthStateChange:", event, currentSession?.user?.email);
            if (currentSession?.user) {
              subscription.unsubscribe();
              const u = currentSession.user;
              const adminCheck = await verifyAdminSession();
              const role = adminCheck.isAdmin ? "admin" : (u.user_metadata?.role || "buyer");

              const localUser = {
                name: u.user_metadata?.full_name || u.user_metadata?.name || "User",
                email: u.email || "",
                phone: u.phone || u.user_metadata?.phone || "",
                role: role,
                isProfileComplete: true,
                isLoggedIn: true,
                authMethod: "oauth",
              };

              localStorage.setItem("road_user", JSON.stringify(localUser));
              if (adminCheck.isAdmin) {
                localStorage.setItem("road_admin_user", JSON.stringify(localUser));
              }

              toast.success("Successfully logged in!");
              const targetRoute = adminCheck.isAdmin ? "/admin/dashboard" : "/dashboard";
              console.log("[AUTH DEBUG] Redirecting from listener to:", targetRoute);
              router.replace(targetRoute);
            } else if (event === "INITIAL_SESSION" && !currentSession) {
              subscription.unsubscribe();
              toast.error("Session verification failed. Please try signing in again.");
              console.log("[AUTH DEBUG] AuthCallback initial session empty. Redirecting to /login");
              router.replace("/login");
            }
          }
        );
      } catch (err: any) {
        console.error("[AUTH DEBUG] Auth callback error:", err);
        toast.error(err.message || "Authentication failed.");
        router.replace("/login");
      }
    };

    processCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary p-4 pt-24 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-amber-primary/5 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm glass border border-glass-border rounded-3xl p-8 shadow-elevated text-center space-y-6 relative z-10"
      >
        <div className="flex flex-col items-center">
          <Logo size="lg" className="mb-4 animate-bounce" />
          <h2 className="font-heading text-xl font-bold text-text-primary">
            Completing Sign In...
          </h2>
          <p className="text-text-secondary text-sm mt-1">
            Please wait while we verify your account credentials.
          </p>
        </div>

        <div className="flex justify-center">
          <span className="w-8 h-8 rounded-full border-3 border-amber-primary border-t-transparent animate-spin" />
        </div>
      </motion.div>
    </div>
  );
}
