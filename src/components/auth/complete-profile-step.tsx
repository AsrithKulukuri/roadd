"use client";

import { useState } from "react";
import { User, Mail, ArrowRight, ArrowLeft, Sparkles, Building2, Home, Briefcase, HardHat } from "lucide-react";
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

const ROLES = [
  {
    id: "buyer",
    title: "Buyer / Tenant",
    desc: "Looking to buy, rent, or invest in properties",
    icon: Home,
  },
  {
    id: "owner",
    title: "Property Owner",
    desc: "List, sell, or rent your own private properties",
    icon: Building2,
  },
  {
    id: "agent",
    title: "Real Estate Agent",
    desc: "Represent clients and manage property portfolios",
    icon: Briefcase,
  },
  {
    id: "builder",
    title: "Builder / Developer",
    desc: "Advertise master new construction projects",
    icon: HardHat,
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
  const [role, setRole] = useState(initialRole);
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
    if (!name.trim() || name.trim().length < 2) {
      toast.error("Please enter your full name (minimum 2 characters)");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/complete-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          phone, 
          name: name.trim(), 
          email: email.trim().toLowerCase(),
          role: role || "buyer"
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

  return (
    <div className="space-y-4">
      {/* Progress Header */}
      <div className="space-y-1.5 pb-2">
        <div className="flex justify-between items-center text-[11px] text-amber-400 font-bold uppercase tracking-wider">
          <span>Account Setup</span>
          <span>Phase {step} of 2</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-300 ${step >= 1 ? "bg-amber-400" : "bg-transparent"}`} />
          <div className={`h-full rounded-full transition-all duration-300 ${step >= 2 ? "bg-amber-400" : "bg-transparent"}`} />
        </div>
      </div>

      {step === 1 ? (
        <form onSubmit={handleNext} className="space-y-4">
          <div className="space-y-1">
            <h3 className="font-heading text-base font-bold text-white leading-tight">Phase 1: Choose Your Role</h3>
            <p className="text-slate-400 text-xs leading-normal">
              Select the classification that best matches your real estate needs.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {ROLES.map((r) => {
              const Icon = r.icon;
              const isSelected = role === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRole(r.id)}
                  className={`p-3 text-left rounded-2xl border transition-all flex items-start gap-3 active:scale-[0.98] cursor-pointer ${
                    isSelected
                      ? "bg-amber-500/15 border-amber-500 text-amber-300 shadow-md shadow-amber-500/10"
                      : "bg-slate-800/60 border-slate-700/80 text-slate-400 hover:text-white hover:border-slate-600 hover:bg-slate-800"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    isSelected ? "bg-amber-500/25 text-amber-400" : "bg-slate-900 text-slate-400"
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5 leading-normal">
                    <div className="font-bold text-xs text-white">{r.title}</div>
                    <div className="text-[10px] text-slate-400 leading-tight">{r.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>

          <Button
            type="submit"
            className="w-full h-12 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-sm font-extrabold gap-2 cursor-pointer transition-all active:scale-[0.98] mt-4 shadow-lg shadow-amber-500/20"
          >
            <span>Next: Name & Email</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <h3 className="font-heading text-base font-bold text-white leading-tight">Phase 2: Contact Details</h3>
            <p className="text-slate-400 text-xs leading-normal">
              Enter your name and email. Password is not required—login anytime securely with WhatsApp OTP.
            </p>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Signing in as: <strong className="text-white capitalize">{ROLES.find(r => r.id === role)?.title || role}</strong></span>
          </div>

          {/* Full Name */}
          <div className="space-y-1">
            <label htmlFor="profile-full-name" className="text-xs text-slate-300 font-medium ml-1">Full Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="profile-full-name"
                name="name"
                required
                type="text"
                placeholder="e.g. Ramesh Kumar"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-slate-950 border-slate-700 text-white pl-11 h-12 rounded-xl focus:border-amber-400"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Email Address */}
          <div className="space-y-1">
            <label htmlFor="profile-email" className="text-xs text-slate-300 font-medium ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="profile-email"
                name="email"
                required
                type="email"
                placeholder="ramesh@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-slate-950 border-slate-700 text-white pl-11 h-12 rounded-xl focus:border-amber-400"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(1)}
              disabled={isLoading}
              className="h-12 px-4 rounded-xl border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 gap-1.5 cursor-pointer font-semibold text-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !name.trim() || !email.trim()}
              className="flex-1 h-12 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-sm font-extrabold gap-2 cursor-pointer transition-all active:scale-[0.98] shadow-lg shadow-amber-500/20"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                  Saving Profile...
                </span>
              ) : (
                <>
                  <span>Complete & Start Browsing</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
