"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, MessageSquare, ShieldCheck, Lock } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { PhoneInput } from "@/components/auth/phone-input";
import { OTPInput } from "@/components/auth/otp-input";
import { useWhatsAppAuth } from "@/hooks/useWhatsAppAuth";

interface WhatsAppAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: any) => void;
}

export function WhatsAppAuthModal({ isOpen, onClose, onSuccess }: WhatsAppAuthModalProps) {
  const {
    step,
    phone,
    isLoading,
    isSending,
    isVerifying,
    canResend,
    resendTimer,
    error,
    sendOTP,
    verifyOTP,
    reset,
  } = useWhatsAppAuth();

  if (!isOpen) return null;

  const handlePhoneSubmit = async (targetPhone: string) => {
    await sendOTP(targetPhone);
  };

  const handleVerifySubmit = async (otpCode: string) => {
    const res = await verifyOTP(otpCode);
    if (res && res.success) {
      if (onSuccess) onSuccess(res.user);
      setTimeout(() => {
        reset();
        onClose();
        if (typeof window !== "undefined") {
          window.location.reload();
        }
      }, 800);
    }
  };

  const handleResend = async () => {
    if (phone) {
      await sendOTP(phone);
    }
  };

  const handleClose = () => {
    reset();
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
            <Logo size="md" className="mb-4" />
            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-400" />
              <span>WhatsApp Login</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              {step === "phone"
                ? "Enter your mobile number to receive a secure WhatsApp verification code."
                : `Enter 6-digit code sent to ${phone}`}
            </p>
          </div>

          {/* Body Content Steps */}
          {step === "phone" ? (
            <PhoneInput
              onSubmit={handlePhoneSubmit}
              isLoading={isSending}
              initialValue={phone}
              error={error}
            />
          ) : (
            <OTPInput
              phone={phone}
              onVerify={handleVerifySubmit}
              onResend={handleResend}
              onBack={() => reset()}
              isLoading={isVerifying}
              canResend={canResend}
              resendTimer={resendTimer}
              error={error}
            />
          )}

          {/* Footer Security Badge */}
          <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
            <Lock className="w-3.5 h-3.5 text-amber-500" />
            <span>End-to-End Encrypted & Secured by WasenderAPI</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
