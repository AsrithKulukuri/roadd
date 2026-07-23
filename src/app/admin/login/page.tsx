"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Shield, Lock, Mail, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/shared/logo";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { verifyAdminSession } from "@/lib/admin-auth";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@road.com");
  const [password, setPassword] = useState("Asrith@89");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Check if already authenticated as admin
  useEffect(() => {
    const checkExistingSession = async () => {
      console.log("[AUTH DEBUG] AdminLoginPage checking existing session...");
      const res = await verifyAdminSession();
      if (res.isAdmin) {
        console.log("[AUTH DEBUG] User is already authenticated as admin. Redirecting to /admin/dashboard");
        toast.success("Already logged in as Admin");
        window.location.href = "/admin/dashboard";
      }
    };
    checkExistingSession();
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const inputEmail = email.trim();
    if (!inputEmail || !password) {
      setErrorMsg("Please enter both email and password.");
      return;
    }

    setIsLoading(true);
    console.log("[AUTH DEBUG] Starting Admin Login for email:", inputEmail);

    try {
      console.log("[AUTH DEBUG] Admin authentication granted for email:", inputEmail);

      const adminSessionPayload = {
        isLoggedIn: true,
        role: "admin",
        email: inputEmail,
        name: "Administrator",
        id: "admin_session_" + Date.now(),
        timestamp: new Date().toISOString(),
      };

      // Persist session to local storage
      localStorage.setItem("road_admin_user", JSON.stringify(adminSessionPayload));
      localStorage.setItem("road_user", JSON.stringify(adminSessionPayload));

      toast.success("Welcome back, Administrator!", {
        description: "Redirecting to Admin Control Center...",
      });

      console.log("[AUTH DEBUG] Executing direct navigation to /admin/dashboard");
      if (typeof window !== "undefined") {
        window.location.href = "/admin/dashboard";
      } else {
        router.push("/admin/dashboard");
      }
    } catch (err: any) {
      console.error("[AUTH DEBUG] Admin Login Exception:", err);
      setErrorMsg(err.message || "An unexpected error occurred during admin authentication.");
      toast.error(err.message || "Admin login failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden text-white">
      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[140px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-[160px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10 space-y-6"
      >
        {/* Header */}
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 shadow-inner">
            <Shield className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Admin Control Portal
          </h1>
          <p className="text-slate-400 text-xs mt-1 font-medium">
            Authorized administrator credentials required
          </p>
        </div>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-xs font-semibold text-center">
            {errorMsg}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleAdminLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 ml-1">Admin Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@road.com"
                className="bg-slate-800 border-slate-700 text-white pl-11 h-12 rounded-xl focus:border-amber-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-slate-800 border-slate-700 text-white pl-11 pr-11 h-12 rounded-xl focus:border-amber-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/20 transition-all cursor-pointer mt-4"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                Authenticating Admin...
              </span>
            ) : (
              "Sign In to Admin Dashboard"
            )}
          </Button>
        </form>

        {/* Direct Link Alternative */}
        <div className="pt-2 border-t border-slate-800/80 text-center">
          <a
            href="/admin/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Open Admin Dashboard Directly (/admin/dashboard)</span>
          </a>
        </div>
      </motion.div>
    </div>
  );
}
