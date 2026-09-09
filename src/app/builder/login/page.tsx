"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  Lock,
  Mail,
  Phone,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  Sparkles,
  Award,
  CheckCircle2,
  Zap,
  ArrowLeft
} from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBuilderStore, BuilderProfile } from "@/stores/builder-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function BuilderLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedRedirect = searchParams.get("redirect") || "/builder";
  const redirectTarget = requestedRedirect === "/builder" || requestedRedirect.startsWith("/builder/") ? requestedRedirect : "/builder";

  const { builders, setCurrentBuilderId, logoutBuilder, logActivity, fetchFromSupabase } = useBuilderStore();

  const [authMode, setAuthMode] = useState<"credentials" | "phone">("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [existingSession, setExistingSession] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    fetch("/api/builder/session", { cache: "no-store" }).then(async response => {
      if (!response.ok) return;
      const data = await response.json();
      const builder = data.builders?.find((b: BuilderProfile) => b.id === data.currentBuilderId);
      if (builder) setExistingSession({ id: builder.id, name: builder.companyName });
    }).catch(() => {});

  }, [fetchFromSupabase]);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setInterval(() => setResendSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  // Complete builder sign in
  const completeBuilderSignIn = (builder: BuilderProfile) => {
    setCurrentBuilderId(builder.id);

    const builderSession = {
      id: builder.id,
      name: builder.companyName,
      email: builder.contactEmail,
      phone: builder.contactPhone,
      role: "developer",
      builderId: builder.id,
      isLoggedIn: true,
      isVerified: builder.isVerified,
    };

    if (typeof window !== "undefined") {
      localStorage.setItem("road_builder_user", JSON.stringify(builderSession));
      localStorage.setItem(
        "road_user",
        JSON.stringify({
          isLoggedIn: true,
          id: builder.id,
          phone: builder.contactPhone,
          name: builder.companyName,
          email: builder.contactEmail,
          role: "developer",
          isProfileComplete: true,
          isVerified: builder.isVerified,
        })
      );
      document.cookie = `road_builder_id=${builder.id}; path=/; max-age=2592000`;
      document.cookie = `road_user=true; path=/; max-age=2592000`;
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("road_auth_changed"));
    }

    logActivity(builder.id, "login", {
      method: authMode,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "Desktop",
    });

    toast.success(`Welcome back, ${builder.companyName}!`);
    setTimeout(() => {
      window.location.href = redirectTarget;
    }, 400);
  };

  // Submit credentials login
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your registered builder email.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/builder/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();

      if (data.success && data.builder) {
        completeBuilderSignIn(data.builder);
      } else {
        toast.error(data.error || "Invalid builder credentials. Please verify with ROAD admin.");
      }
    } catch (err: any) {
      toast.error("Login service unavailable. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-foreground flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-amber-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-amber-400 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Return to ROAD Facing Public
        </Link>

        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <Logo size="md" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Building2 className="h-3.5 w-3.5" />
            Enterprise Builder Portal
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Developer Partner Sign In
          </h1>
          <p className="text-xs text-zinc-400">
            Access your assigned project inventory, real-time analytics, site visit tours, and admin concierge requests.
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-zinc-900/90 border border-zinc-800 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          {/* Active Session Notification if already signed in */}
          {existingSession && (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Currently active session:</span>
                <span className="font-bold text-amber-300">{existingSession.name}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-amber-500/20">
                <Link
                  href="/builder"
                  className="inline-flex items-center gap-1 font-bold text-amber-400 hover:text-amber-300 underline"
                >
                  Continue to Dashboard <ArrowRight className="h-3 w-3" />
                </Link>
                <button
                  type="button"
                  onClick={async () => {
                    try { await logoutBuilder(); } catch { toast.error("Sign out failed. Please retry."); return; }
                    setExistingSession(null);
                    toast.info("Session cleared. Enter credentials to log in.");
                  }}
                  className="text-zinc-400 hover:text-red-400 text-[11px] underline"
                >
                  Sign Out & Switch Account
                </button>
              </div>
            </div>
          )}

          {/* Auth Mode Tabs */}
          <div className="grid grid-cols-2 p-1 bg-zinc-950/80 rounded-xl border border-zinc-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setAuthMode("credentials")}
              className={cn(
                "py-2 rounded-lg transition-all flex items-center justify-center gap-1.5",
                authMode === "credentials"
                  ? "bg-amber-500 text-zinc-950 shadow-md font-bold"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              <Mail className="h-3.5 w-3.5" />
              Email & Password
            </button>
            <button
              type="button"
              onClick={() => setAuthMode("phone")}
              className={cn(
                "py-2 rounded-lg transition-all flex items-center justify-center gap-1.5",
                authMode === "phone"
                  ? "bg-amber-500 text-zinc-950 shadow-md font-bold"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              <Phone className="h-3.5 w-3.5" />
              WhatsApp OTP
            </button>
          </div>

          {/* Credentials Form */}
          {authMode === "credentials" && (
            <form onSubmit={handleCredentialsSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-zinc-300 font-semibold">Official Contact / Portal Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input
                    required
                    type="email"
                    placeholder="director@sriadityahomes.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-zinc-300 font-semibold">Portal Access Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input
                    required
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-10 bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold py-2.5 text-xs shadow-lg shadow-amber-500/20"
              >
                {isLoading ? "Authenticating Partner..." : "Sign In to Builder Portal"}
              </Button>
            </form>
          )}

          {/* WhatsApp OTP Form */}
          {authMode === "phone" && (
            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-zinc-300 font-semibold">Registered Builder WhatsApp Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input
                    placeholder="+91 98490 12345"
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); setIsOtpSent(false); setOtpCode(""); }}
                    className="pl-9 bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-amber-500"
                  />
                </div>
              </div>

              {!isOtpSent ? (
                <Button
                  disabled={isLoading}
                  onClick={async () => {
                    if (!phone.trim()) {
                      toast.error("Please enter registered phone number");
                      return;
                    }
                    setIsLoading(true);
                    try {
                      const response = await fetch("/api/auth/send-otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: phone.trim() }) });
                      const data = await response.json();
                      if (!response.ok || !data.success) throw new Error(data.error?.message || data.error || "Could not send code.");
                    setIsOtpSent(true);
                      setResendSeconds(60);
                      toast.success("Verification code dispatched via WhatsApp");
                    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not send code."); }
                    finally { setIsLoading(false); }
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 text-xs"
                >
                  Send WhatsApp Code
                </Button>
              ) : (
                <div className="space-y-3">
                  <Input
                    autoFocus
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="Enter 6-digit OTP code"
                    value={otpCode}
                    onChange={(e) => {
                      const value = e.target.value.replace(/D/g, "").slice(0, 6);
                      setOtpCode(value);
                    }}
                    className="bg-zinc-950 border-zinc-800 text-white text-center font-mono tracking-widest text-base"
                  />
                  <Button
                    disabled={isLoading}
                    onClick={async () => {
                      if (!/^\d{6}$/.test(otpCode.trim())) {
                        toast.error("Please enter a valid 6-digit verification code.");
                        return;
                      }
                      setIsLoading(true);
                      try {
                        const res = await fetch("/api/builder/login", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ phone: phone.trim(), otp: otpCode.trim() }),
                        });
                        const data = await res.json();
                        if (data.success && data.builder) {
                          completeBuilderSignIn(data.builder);
                        } else {
                          toast.error(data.error || "Verification failed. Unregistered phone number.");
                        }
                      } catch {
                        toast.error("Verification failed. Please try again.");
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold py-2.5 text-xs"
                  >
                    Verify & Enter Portal
                  </Button>
                  <div className="flex items-center justify-between text-[11px] text-zinc-500">
                    <button type="button" className="underline hover:text-white" onClick={() => {
                      setIsOtpSent(false);
                      setOtpCode("");
                      setResendSeconds(0);
                    }}>Change number</button>
                    {resendSeconds > 0 ? (
                      <span>Resend code in {resendSeconds}s</span>
                    ) : (
                      <button type="button" className="underline text-amber-400 hover:text-amber-300" onClick={async () => {
                        setIsLoading(true);
                        try {
                          const response = await fetch("/api/auth/send-otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: phone.trim() }) });
                          const data = await response.json();
                          if (!response.ok || !data.success) throw new Error(data.error?.message || data.error || "Could not resend code.");
                          setOtpCode("");
                          setResendSeconds(60);
                          toast.success("A new verification code was sent.");
                        } catch (error) { toast.error(error instanceof Error ? error.message : "Could not resend code."); }
                        finally { setIsLoading(false); }
                      }}>Resend code</button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Disclaimer */}
        <div className="text-center text-[11px] text-zinc-500 space-y-1">
          <p>Protected by Enterprise Role-Based Access Control (RBAC).</p>
          <p>
            Need access for your construction venture?{" "}
            <Link href="/admin" className="text-amber-400 hover:underline">
              Contact ROAD Admin Support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
