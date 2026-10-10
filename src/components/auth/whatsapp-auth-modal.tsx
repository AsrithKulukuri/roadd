"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageSquare, Lock, UserCheck } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { PhoneInput } from "@/components/auth/phone-input";
import { OTPInput } from "@/components/auth/otp-input";
import { CompleteProfileStep } from "@/components/auth/complete-profile-step";
import { useWhatsAppAuth } from "@/hooks/useWhatsAppAuth";
import { getRememberedProfile, getLastRememberedPhone, saveRememberedProfile } from "@/lib/user-profile-memory";

interface WhatsAppAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: any) => void;
}

export function WhatsAppAuthModal({ isOpen, onClose, onSuccess }: WhatsAppAuthModalProps) {
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
  const [rememberedPhone, setRememberedPhone] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setRememberedPhone(getLastRememberedPhone());
    }
  }, []);

  if (!isOpen) return null;

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

      // Save session to localStorage
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
        // User details exist or were remembered! Complete login immediately
        if (onSuccess) onSuccess(effectiveUser);
        setTimeout(() => {
          handleClose();
          if (!onSuccess && typeof window !== "undefined") {
            window.location.reload();
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
    if (onSuccess) onSuccess(updatedUser);
    setTimeout(() => {
      handleClose();
      if (!onSuccess && typeof window !== "undefined") {
        window.location.reload();
      }
    }, 400);
  };

  const handleResend = async () => {
    if (phone) {
      await sendOTP(phone);
    }
  };

  const handleClose = () => {
    reset();
    setActiveStep("phone");
    setCurrentUser(null);
    onClose();
  };

  return (
    <AnimatePresence>
      <div role="dialog" aria-modal="true" aria-label="Verify your phone" className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        {/* Backdrop click */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 cursor-pointer"
          onClick={handleClose}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative z-10 w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden"
        >
          {/* Ambient Glow Accents */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Close Button */}
          <button
            type="button"
            aria-label="Close login"
            onClick={handleClose}
            className="absolute top-5 right-5 p-2 text-slate-500 hover:text-slate-950 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors z-20 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <Logo size="lg" showText={false} className="mb-3" />
            <h2 className="text-xl font-black text-slate-950 tracking-tight">
              {activeStep === "profile" ? "Complete Profile" : "Welcome"}
            </h2>
            <p className="text-xs text-slate-600 mt-1 max-w-xs font-medium">
              {activeStep === "phone" && "Enter your mobile number to receive a WhatsApp OTP code."}
              {activeStep === "otp" && `Enter 6-digit code sent to ${phone}`}
              {activeStep === "profile" && "Please enter your name to complete your profile."}
            </p>
          </div>

          {/* Body Content Steps */}
          {activeStep === "phone" && (
            <PhoneInput
              onSubmit={handlePhoneSubmit}
              isLoading={isSending}
              initialValue={phone || rememberedPhone}
              error={error}
            />
          )}

          {activeStep === "otp" && (
            <OTPInput
              phone={phone}
              onVerify={handleVerifySubmit}
              onResend={handleResend}
              onBack={() => setActiveStep("phone")}
              isLoading={isVerifying}
              canResend={canResend}
              resendTimer={resendTimer}
              error={error}
            />
          )}

          {activeStep === "profile" && (
            <CompleteProfileStep
              phone={phone}
              initialName={currentUser?.name || ""}
              initialEmail={currentUser?.email || ""}
              onComplete={handleProfileComplete}
            />
          )}

          {/* Footer Security Badge & Admin Link */}
          <div className="mt-6 pt-4 border-t border-slate-200 flex flex-col items-center gap-1.5 text-xs text-slate-600 font-medium">
            <div className="flex items-center justify-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-500 stroke-[2.5]" />
              <span>End-to-End Encrypted & Secured by WhatsApp Cloud API</span>
            </div>
            <a
              href="/admin/login"
              className="text-[11px] font-bold text-slate-500 hover:text-amber-600 transition-colors mt-0.5"
            >
              Admin Portal Login (Email & Password) →
            </a>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
