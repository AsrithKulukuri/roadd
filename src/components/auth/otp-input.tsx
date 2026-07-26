"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowLeft, RotateCcw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OTPInputProps {
  phone: string;
  onVerify: (otp: string) => void;
  onResend: () => void;
  onBack: () => void;
  isLoading: boolean;
  canResend: boolean;
  resendTimer: number;
  error?: string | null;
}

export function OTPInput({
  phone,
  onVerify,
  onResend,
  onBack,
  isLoading,
  canResend,
  resendTimer,
  error,
}: OTPInputProps) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input box on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Handle single digit change
  const handleChange = (index: number, value: string) => {
    const numericVal = value.replace(/\D/g, "");
    if (!numericVal) {
      // Cleared input
      const newDigits = [...digits];
      newDigits[index] = "";
      setDigits(newDigits);
      return;
    }

    // Take last entered character if multiple typed
    const singleDigit = numericVal.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = singleDigit;
    setDigits(newDigits);

    // Auto focus next input
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto submit if all 6 digits completed
    const fullCode = newDigits.join("");
    if (fullCode.length === 6 && !newDigits.includes("")) {
      onVerify(fullCode);
    }
  };

  // Handle Backspace navigation
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  // Handle Clipboard Paste (Paste 6 digits anywhere)
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pastedData) return;

    const newDigits = Array(6).fill("");
    for (let i = 0; i < pastedData.length; i++) {
      newDigits[i] = pastedData[i];
    }
    setDigits(newDigits);

    // Focus last filled box or next box
    const focusIndex = Math.min(pastedData.length, 5);
    inputRefs.current[focusIndex]?.focus();

    // Auto-submit if complete 6 digits pasted
    if (pastedData.length === 6) {
      onVerify(pastedData);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = digits.join("");
    if (fullCode.length === 6) {
      onVerify(fullCode);
    }
  };

  const isComplete = digits.join("").length === 6;

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6">
      {/* Header Info */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            disabled={isLoading}
            className="flex items-center gap-1 text-xs text-amber-primary font-semibold hover:underline cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Change Number</span>
          </button>
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
            WhatsApp OTP
          </span>
        </div>
        <p className="text-xs text-text-secondary pt-1">
          Enter the 6-digit code sent to <strong className="text-text-primary font-mono">{phone}</strong>
        </p>
      </div>

      {/* 6 OTP Input Boxes */}
      <div className="flex items-center justify-between gap-2 sm:gap-3 my-4">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            pattern="\d*"
            maxLength={1}
            value={digit}
            disabled={isLoading}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            className={`w-11 sm:w-12 h-14 text-center text-xl font-extrabold font-mono rounded-xl border bg-bg-primary/80 transition-all focus:outline-none focus:ring-2 focus:ring-amber-primary ${
              digit
                ? "border-amber-primary text-text-primary shadow-amber-glow/20 bg-amber-500/10"
                : "border-border-default/60 text-text-primary focus:border-amber-primary"
            }`}
          />
        ))}
      </div>

      {error && (
        <p className="text-xs text-red-500 font-medium text-center animate-fadeIn">
          {error}
        </p>
      )}

      {/* Verify Button */}
      <Button
        type="submit"
        variant="amber"
        disabled={isLoading || !isComplete}
        className="w-full h-13 rounded-xl text-base font-extrabold shadow-amber-glow gap-2 cursor-pointer transition-all active:scale-[0.98]"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
            Verifying Code...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            Verify & Continue
          </span>
        )}
      </Button>

      {/* Resend Countdown Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-border-default/40 text-xs">
        <span className="text-text-tertiary">Didn't receive code?</span>
        {canResend ? (
          <button
            type="button"
            onClick={onResend}
            disabled={isLoading}
            className="flex items-center gap-1.5 font-bold text-amber-primary hover:underline cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Resend WhatsApp OTP</span>
          </button>
        ) : (
          <span className="text-text-tertiary font-mono font-medium">
            Resend code in <strong className="text-amber-primary font-bold">{resendTimer}s</strong>
          </span>
        )}
      </div>
    </form>
  );
}
