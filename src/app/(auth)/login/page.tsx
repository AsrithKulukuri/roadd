"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Logo } from "@/components/shared/logo";
import { PhoneInput } from "@/components/auth/phone-input";
import { OTPInput } from "@/components/auth/otp-input";
import { CompleteProfileStep } from "@/components/auth/complete-profile-step";
import { useWhatsAppAuth } from "@/hooks/useWhatsAppAuth";
import { MessageSquare, Shield, Lock, UserCheck } from "lucide-react";

export default function LoginPage() {
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
  const redirectTarget = searchParams.get("redirect") || searchParams.get("redirectTo") || "/dashboard";

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

      if (typeof window !== "undefined") {
        localStorage.setItem(
          "road_user",
          JSON.stringify({
            isLoggedIn: true,
            id: user?.id,
            phone: user?.phone,
            name: user?.name,
            email: user?.email,
            role: user?.role || "buyer",
          })
        );
      }

      if (res.isProfileComplete) {
        // User has full details (name & email)! Redirect to target property or dashboard
        setTimeout(() => {
          if (typeof window !== "undefined") {
            window.location.href = redirectTarget;
          } else {
            router.push(redirectTarget);
          }
        }, 500);
      } else {
        // Profile incomplete: ask for Name & Email
        setActiveStep("profile");
      }
    }
  };

  const handleProfileComplete = (updatedUser: any) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "road_user",
        JSON.stringify({
          isLoggedIn: true,
          id: updatedUser?.id,
          phone: updatedUser?.phone || phone,
          name: updatedUser?.name,
          email: updatedUser?.email,
          role: updatedUser?.role || "buyer",
        })
      );
    }
    setTimeout(() => {
      if (typeof window !== "undefined") {
        window.location.href = redirectTarget;
      } else {
        router.push(redirectTarget);
      }
    }, 500);
  };

  const handleResend = async () => {
    if (phone) {
      await sendOTP(phone);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary p-4 pt-28 pb-12 relative overflow-hidden">
      {/* Background Ambient Accents */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-primary/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[150px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md glass border border-glass-border rounded-3xl p-8 shadow-elevated relative z-10"
      >
        {/* ROAD Branding Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <Logo size="lg" className="mb-6" />
          <h1 className="font-heading text-2xl font-bold text-text-primary tracking-tight flex items-center gap-2">
            {activeStep === "profile" ? (
              <>
                <UserCheck className="w-6 h-6 text-amber-400" />
                <span>Complete Profile</span>
              </>
            ) : (
              <>
                <MessageSquare className="w-6 h-6 text-emerald-400 fill-emerald-400/20" />
                <span>Welcome</span>
              </>
            )}
          </h1>
          <p className="text-text-secondary text-sm text-center mt-2">
            {activeStep === "phone" && "Enter your mobile number to sign in via WhatsApp OTP."}
            {activeStep === "otp" && `Enter 6-digit code sent to ${phone}`}
            {activeStep === "profile" && "Please enter your name and email to complete your account."}
          </p>
        </div>

        {/* Step 1: Phone Input */}
        {activeStep === "phone" && (
          <PhoneInput
            onSubmit={handlePhoneSubmit}
            isLoading={isSending}
            initialValue={phone}
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

        {/* Footer Security Note */}
        <div className="mt-8 pt-4 border-t border-border-default/40 flex items-center justify-center gap-1.5 text-xs text-text-tertiary">
          <Lock className="w-3.5 h-3.5 text-amber-primary" />
          <span>Encrypted & Secured by WasenderAPI</span>
        </div>
      </motion.div>
    </div>
  );
}
