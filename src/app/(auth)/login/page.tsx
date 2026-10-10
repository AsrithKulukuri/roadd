"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Logo } from "@/components/shared/logo";
import { PhoneInput } from "@/components/auth/phone-input";
import { OTPInput } from "@/components/auth/otp-input";
import { CompleteProfileStep } from "@/components/auth/complete-profile-step";
import { useWhatsAppAuth } from "@/hooks/useWhatsAppAuth";
import { MessageSquare, Lock, UserCheck, ShieldCheck, Building2 } from "lucide-react";
import { getRememberedProfile, getLastRememberedPhone, saveRememberedProfile } from "@/lib/user-profile-memory";

function LoginForm() {
  const router = useRouter();
  const {
    phone,
    isSending,
    isVerifying,
    canResend,
    resendTimer,
    error,
    sendOTP,
    verifyOTP,
    reset,
  } = useWhatsAppAuth();

  const [activeStep, setActiveStep] = useState<"phone" | "otp" | "profile">("phone");
  const [currentUser, setCurrentUser] = useState<any>(null);

  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || searchParams.get("redirectTo") || "/";

  // Check if user is already logged in
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("road_user");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.isLoggedIn) {
            router.replace(redirectTarget);
          }
        } catch (e) {}
      }
    }
  }, [router, redirectTarget]);

  const [rememberedPhone, setRememberedPhone] = useState("");

  useEffect(() => {
    setRememberedPhone(getLastRememberedPhone());
  }, []);

  const handlePhoneSubmit = async (targetPhone: string) => {
    const ok = await sendOTP(targetPhone);
    if (ok) {
      setActiveStep("otp");
    }
  };

  const handleVerifySubmit = async (otpCode: string) => {
    const res = await verifyOTP(otpCode);
    if (res && res.success) {
      const user = res.user;
      setCurrentUser(user);

      // 1. Check if backend database already holds full profile details
      let isComplete = Boolean(
        res.isProfileComplete ||
        (user?.name && user.name.trim().length >= 2 && !user.name.toLowerCase().includes("user"))
      );

      let effectiveUser = user;

      // 2. Fallback: If backend was missing profile, check if this user is remembered on this device!
      if (!isComplete) {
        const remembered = getRememberedProfile(user?.phone || phone);
        if (remembered && remembered.name && remembered.name.trim().length >= 2) {
          isComplete = true;
          effectiveUser = {
            id: user?.id || "",
            phone: user?.phone || phone,
            name: remembered.name,
            email: remembered.email || user?.email || "",
            role: remembered.role || user?.role || "buyer",
            isProfileComplete: true,
            isVerified: true,
          };

          // Synchronize remembered profile to the backend database
          fetch("/api/auth/complete-profile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              phone: user?.phone || phone,
              name: remembered.name,
              email: remembered.email || "",
              role: remembered.role || "buyer",
            }),
          }).catch((e) => console.warn("Background profile sync warning:", e));
        }
      }

      if (typeof window !== "undefined") {
        const sessionPayload = {
          isLoggedIn: true,
          id: effectiveUser?.id,
          phone: effectiveUser?.phone || phone,
          name: effectiveUser?.name,
          email: effectiveUser?.email || "",
          role: effectiveUser?.role || "buyer",
          isProfileComplete: isComplete,
          isVerified: (effectiveUser as any)?.isVerified ?? true,
        };
        localStorage.setItem("road_user", JSON.stringify(sessionPayload));
        if (isComplete) {
          saveRememberedProfile(sessionPayload.phone, sessionPayload);
        }
        window.dispatchEvent(new Event("road_auth_changed"));
      }

      if (isComplete) {
        // User has full details! Redirect straight away without asking again
        setTimeout(() => {
          if (typeof window !== "undefined") {
            window.location.href = redirectTarget;
          } else {
            router.push(redirectTarget);
          }
        }, 400);
      } else {
        // Only brand-new users who have never set a name are prompted
        setActiveStep("profile");
      }
    }
  };

  const handleProfileComplete = (updatedUser: any) => {
    if (typeof window !== "undefined") {
      const sessionPayload = {
        isLoggedIn: true,
        id: updatedUser?.id,
        phone: updatedUser?.phone || phone,
        name: updatedUser?.name,
        email: updatedUser?.email || "",
        role: updatedUser?.role || "buyer",
        isProfileComplete: true,
        isVerified: updatedUser?.isVerified ?? true,
      };
      localStorage.setItem("road_user", JSON.stringify(sessionPayload));
      saveRememberedProfile(sessionPayload.phone, sessionPayload);
      window.dispatchEvent(new Event("road_auth_changed"));
    }
    setTimeout(() => {
      if (typeof window !== "undefined") {
        window.location.href = redirectTarget;
      } else {
        router.push(redirectTarget);
      }
    }, 400);
  };

  const handleResend = async () => {
    if (phone) {
      await sendOTP(phone);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 pt-28 pb-12 relative overflow-hidden">
      {/* Background Ambient Accents */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[150px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-8 shadow-2xl relative z-10"
      >
        {/* ROAD Branding Header */}
        <div className="flex flex-col items-center mb-6 text-center">
          <Logo size="xl" showText={false} className="mb-3" />
          <h1 className="font-heading text-2xl font-black text-slate-950 tracking-tight">
            {activeStep === "profile" ? "Complete Profile" : "Welcome"}
          </h1>
          <p className="text-slate-600 text-sm text-center mt-2 font-medium">
            {activeStep === "phone" && "Enter your mobile number to sign in via WhatsApp OTP."}
            {activeStep === "otp" && `Enter 6-digit code sent to ${phone}`}
            {activeStep === "profile" && "Please enter your name to complete your profile."}
          </p>
        </div>

        {/* Step 1: Phone Input */}
        {activeStep === "phone" && (
          <PhoneInput
            onSubmit={handlePhoneSubmit}
            isLoading={isSending}
            initialValue={phone || rememberedPhone}
            error={error}
          />
        )}

        {/* Step 2: OTP Verification */}
        {activeStep === "otp" && (
          <OTPInput
            phone={phone}
            onVerify={handleVerifySubmit}
            onResend={handleResend}
            onBack={() => {
              reset();
              setActiveStep("phone");
            }}
            isLoading={isVerifying}
            canResend={canResend}
            resendTimer={resendTimer}
            error={error}
          />
        )}

        {/* Step 3: Complete Profile (Name & Email if new/incomplete) */}
        {activeStep === "profile" && (
          <CompleteProfileStep
            phone={phone}
            initialName={currentUser?.name || ""}
            initialEmail={currentUser?.email || ""}
            onComplete={handleProfileComplete}
          />
        )}

        {/* Footer Security Note & Portal Links */}
        <div className="mt-8 pt-4 border-t border-slate-200 flex flex-col items-center gap-2">
          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-600 font-medium">
            <Lock className="w-3.5 h-3.5 text-amber-500 stroke-[2.5]" />
            <span>Encrypted & Secured by WhatsApp Cloud API</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 mt-1">
            <a
              href="/builder/login"
              className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline transition-colors flex items-center gap-1"
            >
              <Building2 className="w-3 h-3" />
              <span>Builder Portal Login →</span>
            </a>
            <span className="text-slate-300 text-xs">•</span>
            <a
              href="/admin/login"
              className="text-[11px] font-bold text-slate-500 hover:text-amber-600 transition-colors flex items-center gap-1"
            >
              <span>Admin Portal →</span>
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-bg-primary p-4 pt-28">
          <div className="w-full max-w-md glass border border-glass-border rounded-3xl p-8 h-[400px] animate-pulse flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-full bg-slate-800 animate-pulse" />
            <div className="w-48 h-6 rounded-lg bg-slate-800 animate-pulse" />
            <div className="w-full h-12 rounded-xl bg-slate-800/60 animate-pulse mt-4" />
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
