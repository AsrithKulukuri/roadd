"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageSquare, Lock, UserCheck } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { PhoneInput } from "@/components/auth/phone-input";
import { OTPInput } from "@/components/auth/otp-input";
import { CompleteProfileStep } from "@/components/auth/complete-profile-step";
import { useWhatsAppAuth } from "@/hooks/useWhatsAppAuth";

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

      // Save session to localStorage
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
        // User details exist! Complete login immediately
        if (onSuccess) onSuccess(user);
        setTimeout(() => {
          handleClose();
          if (typeof window !== "undefined") {
            window.location.href = "/dashboard";
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
    if (onSuccess) onSuccess(updatedUser);
    setTimeout(() => {
      handleClose();
      if (typeof window !== "undefined") {
        window.location.href = "/dashboard";
      }
    }, 500);
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
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
          className="relative z-10 w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden"
        >
          {/* Ambient Glow Accents */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Close Button */}
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/50 hover:bg-slate-800 transition-colors z-20 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <Logo size="md" isDarkBg={true} className="mb-4" />
            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              {activeStep === "profile" ? (
                <>
                  <UserCheck className="w-5 h-5 text-amber-400" />
                  <span>Complete Profile</span>
                </>
              ) : (
                <>
                  <MessageSquare className="w-5 h-5 text-emerald-400" />
                  <span>WhatsApp Sign In</span>
                </>
              )}
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              {activeStep === "phone" && "Enter your mobile number to receive a WhatsApp OTP code."}
              {activeStep === "otp" && `Enter 6-digit code sent to ${phone}`}
              {activeStep === "profile" && "Please enter your name and email to complete your account."}
            </p>
          </div>

          {/* Body Content Steps */}
          {activeStep === "phone" && (
            <PhoneInput
              onSubmit={handlePhoneSubmit}
              isLoading={isSending}
              initialValue={phone}
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
          <div className="mt-6 pt-4 border-t border-slate-800/60 flex flex-col items-center gap-1.5 text-[11px] text-slate-500">
            <div className="flex items-center justify-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-500" />
              <span>End-to-End Encrypted & Secured by WasenderAPI</span>
            </div>
            <a
              href="/admin/login"
              className="text-[11px] font-bold text-slate-400 hover:text-amber-400 transition-colors mt-0.5"
            >
              Admin Portal Login (Email & Password) →
            </a>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
