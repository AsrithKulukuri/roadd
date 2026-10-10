"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Cookie, X, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const COOKIE_STORAGE_KEY = "road_facing_cookie_consent";

export function CookieConsentBanner() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const consent = localStorage.getItem(COOKIE_STORAGE_KEY);
      if (!consent) {
        // Small delay to prevent layout jump on immediate load
        const timer = setTimeout(() => {
          setVisible(true);
        }, 1200);
        return () => clearTimeout(timer);
      }
    } catch {
      // Ignore localStorage read errors in private browsing
    }
  }, []);

  const handleAcceptAll = () => {
    try {
      localStorage.setItem(COOKIE_STORAGE_KEY, "accepted");
    } catch {}
    setVisible(false);
  };

  const handleEssentialOnly = () => {
    try {
      localStorage.setItem(COOKIE_STORAGE_KEY, "essential");
    } catch {}
    setVisible(false);
  };

  if (!mounted || !visible) return null;

  return (
    <div
      role="region"
      aria-label="Cookie and Privacy Consent"
      className="fixed bottom-20 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-[9990] animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="relative rounded-2xl bg-bg-card/95 backdrop-blur-xl border border-border-default shadow-2xl p-5 text-text-primary">
        <button
          onClick={handleEssentialOnly}
          aria-label="Dismiss cookie notice"
          className="absolute top-3.5 right-3.5 p-1 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3.5 pr-6">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center flex-shrink-0 text-amber-500">
            <Cookie className="w-5 h-5" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-sm font-bold tracking-tight text-text-primary flex items-center gap-1.5">
              Cookie & Privacy Preferences
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              We use cookies to save your favorite projects, remember filter preferences, and ensure verified browsing. We never sell your personal data.
            </p>
          </div>
        </div>

        <div className="mt-4 pt-3.5 border-t border-border-default flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <Link
            href="/cookies"
            className="text-[11px] font-semibold text-text-tertiary hover:text-amber-500 transition-colors underline sm:no-underline sm:hover:underline"
          >
            Read Cookie Policy
          </Link>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleEssentialOnly}
              className="w-1/2 sm:w-auto text-xs font-semibold rounded-xl border-border-default hover:bg-bg-hover"
            >
              Essential Only
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleAcceptAll}
              className="w-1/2 sm:w-auto text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl shadow-xs"
            >
              Accept All
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
