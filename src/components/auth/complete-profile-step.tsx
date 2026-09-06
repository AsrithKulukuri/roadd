"use client";

import { useState } from "react";
import { User, Mail, ArrowRight, ArrowLeft, Sparkles, Home, Briefcase, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CompleteProfileStepProps {
  phone: string;
  initialName?: string;
  initialEmail?: string;
  initialRole?: string;
  onComplete: (user: any) => void;
}

// Exactly two roles: Buyer and Agent
const ROLES = [
  {
    id: "buyer",
    title: "Buyer",
    desc: "Looking to buy or invest in properties",
    icon: Home,
  },
  {
    id: "agent",
    title: "Real Estate Agent",
    desc: "Represent clients and manage property portfolios",
    icon: Briefcase,
  },
] as const;

export function CompleteProfileStep({
  phone,
  initialName = "",
  initialEmail = "",
  initialRole = "buyer",
  onComplete,
}: CompleteProfileStepProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [role, setRole] = useState(initialRole === "agent" ? "agent" : "buyer");
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [isLoading, setIsLoading] = useState(false);

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) {
      toast.error("Please select an account role");
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || cleanName.length < 2) {
      toast.error("Please enter your full name (minimum 2 characters)");
      return;
    }

    // Email is OPTIONAL: validate format only if provided
    if (cleanEmail && (!cleanEmail.includes("@") || !cleanEmail.includes("."))) {
      toast.error("Please enter a valid email address or leave it empty");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/complete-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          name: cleanName,
          email: cleanEmail || "",
          role: role || "buyer",
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        toast.error(data.error || "Failed to update profile details");
        return;
      }

      toast.success("Profile setup complete! Welcome to ROAD.");
      onComplete(data.user);
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const activeRoleObj = ROLES.find((r) => r.id === role) || ROLES[0];

  return (
    <div className="space-y-4">
      {/* Progress Header */}
      <div className="space-y-1.5 pb-2">
        <div className="flex justify-between items-center text-[11px] text-amber-700 font-black uppercase tracking-wider">
          <span>Account Setup</span>
          <span>Phase {step} of 2</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-300 ${step >= 1 ? "bg-amber-500" : "bg-transparent"}`} />
          <div className={`h-full rounded-full transition-all duration-300 ${step >= 2 ? "bg-amber-500" : "bg-transparent"}`} />
        </div>
      </div>

      {step === 1 ? (
        <form onSubmit={handleNext} className="space-y-4">
          <div className="space-y-1 text-left">
            <h3 className="font-heading text-base font-black text-slate-950 leading-tight">
              Phase 1: Choose Your Role
            </h3>
            <p className="text-slate-600 text-xs leading-normal font-medium">
              Select the classification that best matches your real estate needs.
            </p>
          </div>

          {/* Exactly 2 Role Cards: Buyer / Tenant and Real Estate Agent */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {ROLES.map((r) => {
              const Icon = r.icon;
              const isSelected = role === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRole(r.id)}
                  className={`p-3.5 text-left rounded-2xl border-2 transition-all flex items-start gap-3 active:scale-[0.98] cursor-pointer relative ${
                    isSelected
                      ? "!bg-amber-50/80 !border-amber-500 shadow-md ring-2 ring-amber-500/20 !text-slate-950"
                      : "!bg-white hover:!bg-slate-50 !border-slate-200 !text-slate-950 shadow-xs"
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? "bg-amber-500 text-slate-950 shadow-xs"
                        : "bg-amber-500/15 text-amber-600 border border-amber-500/20"
                    }`}
                  >
                    <Icon className="w-4.5 h-4.5 stroke-[2.5]" />
                  </div>
                  <div className="space-y-0.5 leading-normal flex-1 min-w-0 pr-4">
                    <div className="font-black text-sm text-slate-950">
                      {r.title}
                    </div>
                    <div className="text-xs leading-tight text-slate-600 font-medium">
                      {r.desc}
                    </div>
                  </div>

                  {/* Selected Checkmark Badge */}
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-xs">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <Button
            type="submit"
            className="w-full h-12 bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 rounded-xl text-sm font-black gap-2 cursor-pointer transition-all mt-4 shadow-md shadow-amber-500/20"
          >
            <span>Next: Name & Details</span>
            <ArrowRight className="w-4 h-4 text-slate-950 stroke-[2.5]" />
          </Button>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1 text-left">
            <h3 className="font-heading text-base font-black text-slate-950 leading-tight">
              Phase 2: Contact Details
            </h3>
            <p className="text-slate-600 text-xs leading-normal font-medium">
              Enter your name. Password is not required—login anytime securely with WhatsApp OTP.
            </p>
          </div>

          {/* Active Role Capsule */}
          <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-slate-950">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                Signing in as: <strong className="text-slate-950 font-black">{activeRoleObj.title}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-[11px] font-black text-amber-700 hover:text-amber-800 hover:underline cursor-pointer"
            >
              Change
            </button>
          </div>

          {/* Full Name (Required) */}
          <div className="space-y-1 text-left">
            <label htmlFor="profile-full-name" className="text-xs font-black uppercase tracking-wider text-slate-950 ml-1">
              Full Name <span className="text-amber-600">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500 pointer-events-none stroke-[2.5]" />
              <Input
                id="profile-full-name"
                name="name"
                required
                type="text"
                placeholder="e.g. Ramesh Kumar"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="!bg-white !border-slate-300 !text-slate-950 placeholder:text-slate-400 pl-11 h-12 rounded-xl focus:!border-amber-500 focus:ring-2 focus:ring-amber-500/20 font-bold text-sm shadow-xs"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Email Address (OPTIONAL) */}
          <div className="space-y-1 text-left">
            <label htmlFor="profile-email" className="text-xs font-black uppercase tracking-wider text-slate-950 ml-1">
              Email Address <span className="text-slate-500 text-[11px] font-bold normal-case tracking-normal">(Optional)</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500 pointer-events-none stroke-[2.5]" />
              <Input
                id="profile-email"
                name="email"
                type="email"
                placeholder="e.g. ramesh@example.com (optional)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="!bg-white !border-slate-300 !text-slate-950 placeholder:text-slate-400 pl-11 h-12 rounded-xl focus:!border-amber-500 focus:ring-2 focus:ring-amber-500/20 font-bold text-sm shadow-xs"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2.5 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(1)}
              disabled={isLoading}
              className="h-12 px-4 rounded-xl !border-slate-300 !bg-white !text-slate-950 hover:!bg-slate-100 gap-1.5 cursor-pointer font-black text-xs shadow-xs transition-all"
            >
              <ArrowLeft className="w-4 h-4 text-amber-500 stroke-[2.5]" />
              <span>Back</span>
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !name.trim() || name.trim().length < 2}
              className="flex-1 h-12 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-sm font-black gap-2 cursor-pointer transition-all active:scale-[0.98] shadow-md shadow-amber-500/20"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-slate-950 border-t-amber-500 animate-spin" />
                  <span>Saving Profile...</span>
                </span>
              ) : (
                <>
                  <span>Complete & Start Browsing</span>
                  <ArrowRight className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
