"use client";

import { useState } from "react";
import { User, Mail, ArrowRight, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CompleteProfileStepProps {
  phone: string;
  initialName?: string;
  initialEmail?: string;
  onComplete: (user: any) => void;
}

export function CompleteProfileStep({
  phone,
  initialName = "",
  initialEmail = "",
  onComplete,
}: CompleteProfileStepProps) {
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 2) {
      toast.error("Please enter your full name");
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
        body: JSON.stringify({ phone, name: name.trim(), email: email.trim() }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        toast.error(data.error || "Failed to update profile details");
        return;
      }

      toast.success("Profile completed successfully! Welcome to ROAD.");
      onComplete(data.user);
    } catch (err: any) {
      toast.error("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 mb-2">
        <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
        <span>Almost there! Please complete your name and email address to continue.</span>
      </div>

      {/* Full Name */}
      <div className="space-y-1">
        <label className="text-xs text-text-secondary font-medium ml-1">Full Name</label>
        <div className="relative">
          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <Input
            required
            type="text"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-bg-primary/50 border-border-default/60 pl-11 h-12 rounded-xl focus:border-amber-primary"
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Email Address */}
      <div className="space-y-1">
        <label className="text-xs text-text-secondary font-medium ml-1">Email Address</label>
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <Input
            required
            type="email"
            placeholder="john@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-bg-primary/50 border-border-default/60 pl-11 h-12 rounded-xl focus:border-amber-primary"
            disabled={isLoading}
          />
        </div>
      </div>

      <Button
        type="submit"
        variant="amber"
        disabled={isLoading || !name.trim() || !email.trim()}
        className="w-full h-13 rounded-xl text-base font-extrabold shadow-amber-glow gap-2 cursor-pointer transition-all active:scale-[0.98] mt-2"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
            Saving Details...
          </span>
        ) : (
          <>
            <span>Complete & Continue</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </Button>
    </form>
  );
}
