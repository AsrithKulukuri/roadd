"use client";

import { useState } from "react";
import { Phone, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface PhoneInputProps {
  onSubmit: (phone: string) => void;
  isLoading: boolean;
  initialValue?: string;
  error?: string | null;
}

export function PhoneInput({ onSubmit, isLoading, initialValue = "", error }: PhoneInputProps) {
  const [rawPhone, setRawPhone] = useState(initialValue.replace("+91", "").trim());
  const [localError, setLocalError] = useState("");

  const handlePhoneChange = (val: string) => {
    // Only allow numeric input, max 10 digits
    const digits = val.replace(/\D/g, "").slice(0, 10);
    setRawPhone(digits);
    if (localError) setLocalError("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rawPhone.length !== 10) {
      setLocalError("Please enter a valid 10-digit mobile number");
      return;
    }
    if (!/^[6-9]/.test(rawPhone)) {
      setLocalError("Indian mobile numbers must start with 6, 7, 8, or 9");
      return;
    }
    onSubmit(`+91${rawPhone}`);
  };

  const displayError = localError || error;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary ml-1">
          WhatsApp Mobile Number
        </label>
        
        <div className="relative flex items-center">
          {/* India Flag & Prefix Badge */}
          <div className="absolute left-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-bg-primary/80 border border-border-default/60 text-sm font-bold text-text-primary z-10 select-none">
            <span>🇮🇳</span>
            <span>+91</span>
          </div>

          <Input
            type="tel"
            required
            autoFocus
            disabled={isLoading}
            placeholder="98765 43210"
            value={rawPhone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            className="h-13 bg-bg-primary/50 border-border-default/60 pl-24 pr-4 rounded-xl text-base font-bold tracking-wide focus:border-amber-primary focus:ring-1 focus:ring-amber-primary/50"
          />
        </div>

        {displayError && (
          <p className="text-xs text-red-500 font-medium ml-1 animate-fadeIn">
            {displayError}
          </p>
        )}
      </div>

      <Button
        type="submit"
        variant="amber"
        disabled={isLoading || rawPhone.length !== 10}
        className="w-full h-13 rounded-xl text-base font-extrabold shadow-amber-glow gap-2 cursor-pointer transition-all active:scale-[0.98]"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
            Sending WhatsApp Code...
          </span>
        ) : (
          <>
            <span>Send OTP via WhatsApp</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </Button>

      <p className="text-[11px] text-text-tertiary text-center leading-relaxed">
        We will send a secure 6-digit verification code directly to your WhatsApp app. Standard message rates may apply.
      </p>
    </form>
  );
}
