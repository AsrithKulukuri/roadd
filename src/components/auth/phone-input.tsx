"use client";

import { useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
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
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Project Privacy Notice Banner */}
      <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-left shadow-2xs">
        <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 stroke-[2.5]" />
        <p className="text-xs text-amber-950 font-medium leading-relaxed">
          <strong className="font-black text-amber-900">Project Privacy Notice:</strong> By viewing project details, your name and phone may be shared with the builder for follow-up.
        </p>
      </div>

      <div className="space-y-2 text-left">
        <label htmlFor="whatsapp-phone-input" className="text-xs font-black uppercase tracking-wider text-slate-950 ml-1">
          WhatsApp Mobile Number
        </label>
        
        <div className="relative flex items-center">
          {/* India Flag & Prefix Badge */}
          <div className="absolute left-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 border border-slate-300 text-sm font-black text-slate-950 z-10 select-none shadow-2xs">
            <span>🇮🇳</span>
            <span>+91</span>
          </div>

          <Input
            id="whatsapp-phone-input"
            name="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            required
            autoFocus
            disabled={isLoading}
            placeholder="98765 43210"
            value={rawPhone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            className="h-13 !bg-white !border-slate-300 !text-slate-950 placeholder:text-slate-400 pl-24 pr-4 rounded-xl text-base font-bold tracking-wide focus:!border-amber-500 focus:ring-2 focus:ring-amber-500/20 shadow-xs"
          />
        </div>

        {displayError && (
          <p id="phone-input-error" role="alert" aria-live="polite" className="text-xs text-red-600 font-bold ml-1 animate-fadeIn break-words">
            {displayError}
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isLoading || rawPhone.length !== 10}
        className="w-full h-13 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black rounded-xl text-base shadow-md shadow-amber-500/20 gap-2 cursor-pointer transition-all active:scale-[0.98]"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 rounded-full border-2 border-slate-950 border-t-amber-500 animate-spin" />
            <span>Sending WhatsApp Code...</span>
          </span>
        ) : (
          <>
            <span>Send OTP via WhatsApp</span>
            <ArrowRight className="w-4 h-4 text-slate-950 stroke-[2.5]" />
          </>
        )}
      </Button>

      <p className="text-xs text-slate-500 text-center leading-relaxed font-medium">
        We will send a secure 6-digit verification code directly to your WhatsApp app.
      </p>
    </form>
  );
}
