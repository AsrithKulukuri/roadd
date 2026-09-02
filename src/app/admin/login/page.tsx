"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Shield, Lock, Mail, Eye, EyeOff, Smartphone, MessageSquare, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { PhoneInput } from "@/components/auth/phone-input";
import { OTPInput } from "@/components/auth/otp-input";
import { useWhatsAppAuth } from "@/hooks/useWhatsAppAuth";

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/admin/dashboard";

  const [authMethod, setAuthMethod] = useState<"password" | "whatsapp">("password");

  // Email & Password state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // WhatsApp OTP hook
  const {
    phone,
    isSending,
    isVerifying,
    canResend,
    resendTimer,
    error: otpError,
    sendOTP,
    verifyOTP,
    reset: resetOTP,
  } = useWhatsAppAuth();

  const [otpStep, setOtpStep] = useState<"phone" | "otp">("phone");

  // Auto-check if admin is already authenticated
  useEffect(() => {
    fetch("/api/auth/session", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data?.authenticated && data?.user?.role === "admin") {
          window.location.href = redirectTo;
        }
      })
      .catch(() => {});
  }, [redirectTo]);

  const handleAdminPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const inputEmail = email.trim().toLowerCase();
    if (!inputEmail || !password) {
      setErrorMsg("Please enter both email and password.");
      return;
    }

    setIsLoading(true);

    try {
      if (!isSupabaseConfigured()) {
        throw new Error("Admin authentication is not configured.");
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: inputEmail,
        password,
      });
      if (error || !data.session?.access_token) {
        throw new Error(error?.message || "Invalid administrator credentials.");
      }

      const sessionResponse = await fetch("/api/auth/admin-session", {
        method: "POST",
        headers: { Authorization: `Bearer ${data.session.access_token}` },
      });
      const sessionResult = await sessionResponse.json();
      if (!sessionResponse.ok || !sessionResult.success) {
        await supabase.auth.signOut();
        throw new Error(sessionResult.error || "This account does not have administrator access.");
      }

      const adminSessionPayload = {
        isLoggedIn: true,
        role: "admin",
        email: sessionResult.user.email,
        name: sessionResult.user.name || "Administrator",
        id: sessionResult.user.id,
        timestamp: new Date().toISOString(),
      };

      localStorage.setItem("road_user", JSON.stringify(adminSessionPayload));

      toast.success("Welcome back, Administrator!", {
        description: "Redirecting to Admin Control Center...",
      });

      window.location.href = redirectTo;
    } catch (err: unknown) {
      console.error("[AUTH DEBUG] Admin Login Exception:", err);
      const message = err instanceof Error ? err.message : "An unexpected error occurred during admin authentication.";
      setErrorMsg(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendAdminOTP = async (targetPhone: string) => {
    setErrorMsg("");
    const ok = await sendOTP(targetPhone);
    if (ok) {
      setOtpStep("otp");
    }
  };

  const handleVerifyAdminOTP = async (code: string) => {
    setErrorMsg("");
    const res = await verifyOTP(code);
    if (res && res.success) {
      const user = res.user;
      if (user?.role !== "admin") {
        setErrorMsg("This phone number does not have staff administrator privileges.");
        toast.error("Access denied: Not an administrator account.");
        return;
      }

      const adminSessionPayload = {
        isLoggedIn: true,
        role: "admin",
        email: user.email || "admin@road.com",
        name: user.name || "Administrator",
        phone: user.phone,
        id: user.id,
        timestamp: new Date().toISOString(),
      };

      localStorage.setItem("road_user", JSON.stringify(adminSessionPayload));

      toast.success("Welcome back, Administrator!", {
        description: "Redirecting to Admin Control Center...",
      });

      window.location.href = redirectTo;
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
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 space-y-6"
      >
        {/* Header */}
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 shadow-inner">
            <Shield className="w-7 h-7" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Admin Control Portal
          </h1>
          <p className="text-slate-400 text-xs mt-1 font-medium">
            Authorized administrator credentials required
          </p>
        </div>

        {/* Method Toggle Tabs (Password vs WhatsApp OTP) */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950 rounded-xl text-xs font-bold text-slate-400 border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setAuthMethod("password");
              setErrorMsg("");
            }}
            className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              authMethod === "password"
                ? "bg-amber-500 text-slate-950 shadow-md font-black"
                : "hover:text-white"
            }`}
          >
            <Lock className="w-3.5 h-3.5" /> Password
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMethod("whatsapp");
              setErrorMsg("");
            }}
            className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              authMethod === "whatsapp"
                ? "bg-amber-500 text-slate-950 shadow-md font-black"
                : "hover:text-white"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" /> WhatsApp OTP
          </button>
        </div>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-xs font-semibold text-center leading-relaxed">
            {errorMsg}
          </div>
        )}

        {/* Option 1: Email & Password Form */}
        {authMethod === "password" && (
          <form onSubmit={handleAdminPasswordLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="admin-email" className="text-xs font-bold text-slate-300 ml-1">Admin Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="admin-email"
                  name="email"
                  type="email"
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@road.com"
                  className="bg-slate-800 border-slate-700 text-white pl-11 h-12 rounded-xl focus:border-amber-500 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="admin-password" className="text-xs font-bold text-slate-300 ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="admin-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-slate-800 border-slate-700 text-white pl-11 pr-11 h-12 rounded-xl focus:border-amber-500 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
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
        )}

        {/* Option 2: WhatsApp OTP Form for Mobile Admins */}
        {authMethod === "whatsapp" && (
          <div className="space-y-4">
            {otpStep === "phone" ? (
              <PhoneInput
                onSubmit={handleSendAdminOTP}
                isLoading={isSending}
                initialValue={phone}
                error={otpError}
              />
            ) : (
              <OTPInput
                phone={phone}
                onVerify={handleVerifyAdminOTP}
                onResend={() => handleSendAdminOTP(phone)}
                onBack={() => {
                  resetOTP();
                  setOtpStep("phone");
                }}
                isLoading={isVerifying}
                canResend={canResend}
                resendTimer={resendTimer}
                error={otpError}
              />
            )}
          </div>
        )}

        {/* Back Link */}
        <div className="pt-2 border-t border-slate-800/80 text-center">
          <a
            href="/"
            className="text-xs text-slate-400 hover:text-amber-400 transition-colors inline-flex items-center gap-1 font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Return to ROAD Portal
          </a>
        </div>
      </motion.div>
    </div>
  );
}
