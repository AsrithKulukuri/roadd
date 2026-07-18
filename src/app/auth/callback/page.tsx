"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Logo } from "@/components/shared/logo";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      // If Supabase is not configured, redirect to login
      if (!isSupabaseConfigured()) {
        toast.error("Supabase environment variables are missing.");
        router.push("/login");
        return;
      }

      try {
        // Exchange session and check
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (session && session.user) {
          const user = session.user;
          
          // Determine if profile is complete (e.g. they have role and phone number)
          const fullName = user.user_metadata?.full_name || user.user_metadata?.name || "Google User";
          const phone = user.phone || user.user_metadata?.phone || "";
          const role = user.user_metadata?.role || "buyer";
          
          // Complete if they have both role and phone number
          const isComplete = phone.length > 0 && role.length > 0;
          
          const localUser = {
            name: fullName,
            email: user.email || "",
            phone: phone,
            role: role,
            isProfileComplete: isComplete,
            isLoggedIn: true,
            authMethod: "google"
          };
          
          // Sync with local storage
          localStorage.setItem("road_user", JSON.stringify(localUser));
          
          toast.success("Successfully logged in via Google!");
          router.push("/dashboard");
        } else {
          // If no session found immediately, wait a brief second for onAuthStateChange to capture it
          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, currentSession) => {
              if (currentSession && currentSession.user) {
                subscription.unsubscribe();
                const u = currentSession.user;
                const localUser = {
                  name: u.user_metadata?.full_name || u.user_metadata?.name || "Google User",
                  email: u.email || "",
                  phone: u.phone || u.user_metadata?.phone || "",
                  role: u.user_metadata?.role || "buyer",
                  isProfileComplete: (u.phone || u.user_metadata?.phone) ? true : false,
                  isLoggedIn: true,
                  authMethod: "google"
                };
                localStorage.setItem("road_user", JSON.stringify(localUser));
                toast.success("Successfully logged in via Google!");
                router.push("/dashboard");
              } else if (event === "INITIAL_SESSION" && !currentSession) {
                // If it resolves initial check and still no session, redirect to login
                subscription.unsubscribe();
                toast.error("Failed to retrieve Google Auth session");
                router.push("/login");
              }
            }
          );
        }
      } catch (err: any) {
        console.error("Error in auth callback:", err);
        toast.error(err.message || "An authentication error occurred.");
        router.push("/login");
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary p-4 pt-24 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-amber-primary/5 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm glass border border-glass-border rounded-3xl p-8 shadow-elevated text-center space-y-6 relative z-10"
      >
        <div className="flex justify-center">
          <Logo size="md" showText={false} />
        </div>
        
        <div className="space-y-2">
          <h2 className="font-heading text-xl font-bold text-text-primary">Authenticating</h2>
          <p className="text-text-secondary text-sm leading-relaxed">
            Completing sign in... Retrieving your profile and setting up session.
          </p>
        </div>

        <div className="flex justify-center py-2">
          <span className="w-8 h-8 rounded-full border-3 border-amber-primary border-t-transparent animate-spin" />
        </div>
      </motion.div>
    </div>
  );
}
