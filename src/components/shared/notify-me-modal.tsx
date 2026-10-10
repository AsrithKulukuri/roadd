"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Bell,
  CheckCircle2,
  X,
  Phone,
  User,
  Sparkles,
  ShieldCheck,
  TrendingDown,
  Building,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export interface NotifyMeModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName?: string;
  projectId?: string;
  location?: string;
  initialType?: "price_drop" | "new_launch" | "inventory";
}

export function NotifyMeModal({
  isOpen,
  onClose,
  projectName,
  projectId,
  location,
  initialType = "new_launch",
}: NotifyMeModalProps) {
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notifyType, setNotifyType] = useState<"new_launch" | "price_drop" | "inventory">(initialType);
  const [bhk, setBhk] = useState<string>("Any");
  const [websiteTrap, setWebsiteTrap] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [phoneError, setPhoneError] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError("");

    if (!name.trim()) {
      toast.error("Please enter your name.");
      return;
    }

    const cleanPhone = phone.replace(/[\s-]/g, "");
    if (!cleanPhone || !/^\+?[0-9]{10,14}$/.test(cleanPhone)) {
      setPhoneError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/leads/notify-me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: cleanPhone,
          projectName: projectName || "Capital Region Updates",
          projectId,
          location: location || "Vijayawada & Amaravati Corridor",
          notifyType,
          bhk,
          websiteTrap,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to set up alerts.");
      }

      setSubmitted(true);
      toast.success("Alert active! You will be notified via WhatsApp.");
    } catch (err: any) {
      toast.error(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setName("");
    setPhone("");
    setPhoneError("");
    onClose();
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="notify-modal-title"
      onClick={handleReset}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl bg-bg-card border border-border-default shadow-2xl p-6 sm:p-7 text-text-primary"
      >
        {/* Subtle Gold Ambient Corner */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={handleReset}
          aria-label="Close dialog"
          className="absolute top-4 right-4 p-2 rounded-xl text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {submitted ? (
          <div className="py-6 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-heading text-xl font-black text-text-primary tracking-tight">
                Notifications Enabled!
              </h3>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                We will send instant WhatsApp alerts for <strong className="text-text-primary">{projectName || "this area"}</strong> as soon as new updates or price movements occur.
              </p>
            </div>
            <div className="pt-2">
              <Button
                variant="amber"
                onClick={handleReset}
                className="w-full font-black rounded-xl text-xs sm:text-sm"
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-500 shrink-0">
                <Bell className="w-5 h-5 animate-bounce" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-500 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Priority Real Estate Alert
                </span>
                <h2 id="notify-modal-title" className="font-heading text-lg sm:text-xl font-black text-text-primary tracking-tight truncate">
                  Notify Me: {projectName || "Pre Projects"}
                </h2>
              </div>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed">
              Get notified immediately on WhatsApp when new towers launch, units become available, or prices change. No spam, ever.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Invisible Honeypot Trap */}
              <div className="sr-only" aria-hidden="true" style={{ display: "none" }}>
                <input
                  type="text"
                  name="websiteTrap"
                  tabIndex={-1}
                  autoComplete="off"
                  value={websiteTrap}
                  onChange={(e) => setWebsiteTrap(e.target.value)}
                />
              </div>

              {/* Alert Category Selection */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                  What do you want to be alerted on?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNotifyType("new_launch")}
                    className={`px-2.5 py-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 text-center ${
                      notifyType === "new_launch"
                        ? "bg-amber-500/15 border-amber-500 text-amber-600 dark:text-amber-400"
                        : "border-border-default hover:bg-bg-hover text-text-secondary"
                    }`}
                  >
                    <Building className="w-3.5 h-3.5" />
                    <span className="text-[10.5px]">New Launch</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNotifyType("price_drop")}
                    className={`px-2.5 py-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 text-center ${
                      notifyType === "price_drop"
                        ? "bg-amber-500/15 border-amber-500 text-amber-600 dark:text-amber-400"
                        : "border-border-default hover:bg-bg-hover text-text-secondary"
                    }`}
                  >
                    <TrendingDown className="w-3.5 h-3.5" />
                    <span className="text-[10.5px]">Price Drops</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNotifyType("inventory")}
                    className={`px-2.5 py-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 text-center ${
                      notifyType === "inventory"
                        ? "bg-amber-500/15 border-amber-500 text-amber-600 dark:text-amber-400"
                        : "border-border-default hover:bg-bg-hover text-text-secondary"
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span className="text-[10.5px]">Units Ready</span>
                  </button>
                </div>
              </div>

              {/* Preferred BHK Chips */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                  Preferred Configuration
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {["2 BHK", "3 BHK", "4 BHK", "Any"].map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setBhk(item)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        bhk === item
                          ? "bg-amber-500 text-slate-950 font-black shadow-xs"
                          : "bg-bg-hover text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name Input */}
              <div className="space-y-1.5">
                <label htmlFor="notifyName" className="text-xs font-bold text-text-secondary">
                  Your Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                  <Input
                    id="notifyName"
                    required
                    placeholder="e.g. Anand Kumar"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10 text-xs sm:text-sm"
                  />
                </div>
              </div>

              {/* Phone Input with WhatsApp indicator */}
              <div className="space-y-1.5">
                <label htmlFor="notifyPhone" className="text-xs font-bold text-text-secondary">
                  WhatsApp Mobile Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs font-bold text-text-tertiary">
                    <Phone className="w-3.5 h-3.5 text-emerald-500" />
                    <span>+91</span>
                  </div>
                  <Input
                    id="notifyPhone"
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="98765 43210"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value.replace(/\D/g, ""));
                      if (phoneError) setPhoneError("");
                    }}
                    className={`pl-14 text-xs sm:text-sm ${phoneError ? "border-red-500 focus:ring-red-500" : ""}`}
                  />
                </div>
                {phoneError && (
                  <p className="text-[11px] text-red-500 font-semibold">{phoneError}</p>
                )}
              </div>

              {/* Submit CTA */}
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl shadow-md gap-2"
                >
                  <Bell className="w-4 h-4" />
                  {submitting ? "Activating Alerts..." : "Notify Me via WhatsApp"}
                </Button>
                <p className="text-[10px] text-center text-text-tertiary mt-2">
                  🔒 We respect your privacy. No spam. You can unsubscribe anytime.
                </p>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
