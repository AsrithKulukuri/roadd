"use client";

import { useState } from "react";
import { Building2, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useSiteFeatures } from "@/components/providers/site-features-provider";
import { cn } from "@/lib/utils";

interface AdminPropertyToggleProps {
  variant?: "header" | "pill" | "banner";
  className?: string;
  onToggled?: (nowEnabled: boolean) => void;
}

export function AdminPropertyToggle({
  variant = "header",
  className = "",
  onToggled,
}: AdminPropertyToggleProps) {
  const { propertiesEnabled, ready, save } = useSiteFeatures();
  const [saving, setSaving] = useState(false);

  const handleToggle = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!ready || saving) return;
    setSaving(true);
    const nextState = !propertiesEnabled;
    try {
      await save(nextState);
      if (nextState) {
        toast.success("All properties are now visible across the admin and public site.");
      } else {
        toast.info("Properties are now hidden. Only projects are shown.");
      }
      onToggled?.(nextState);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update property visibility.");
    } finally {
      setSaving(false);
    }
  };

  // 1. Header Variant (For Admin Navbar / Top Bar on all admin pages)
  if (variant === "header") {
    return (
      <button
        type="button"
        onClick={handleToggle}
        disabled={!ready || saving}
        title={propertiesEnabled ? "Properties are currently VISIBLE. Click to hide all properties." : "Properties are currently HIDDEN. Click to show all properties."}
        className={cn(
          "inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border select-none disabled:opacity-60 disabled:cursor-wait shadow-xs active:scale-95",
          propertiesEnabled
            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
            : "bg-amber-500 text-slate-950 border-amber-500 hover:bg-amber-400 font-extrabold shadow-amber-500/20 shadow-sm",
          className
        )}
      >
        {saving ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
        ) : propertiesEnabled ? (
          <EyeOff className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        ) : (
          <Eye className="w-3.5 h-3.5 text-slate-950 shrink-0" />
        )}
        <span className="whitespace-nowrap font-bold">
          {saving ? "Updating..." : propertiesEnabled ? "Hide Properties" : "Show All Properties"}
        </span>
        <span
          className={cn(
            "w-2 h-2 rounded-full shrink-0 transition-colors",
            propertiesEnabled ? "bg-emerald-500 animate-pulse" : "bg-slate-950"
          )}
        />
      </button>
    );
  }

  // 2. Banner Variant (For Dashboard Overview Cards)
  if (variant === "banner") {
    return (
      <div
        className={cn(
          "p-4 sm:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4",
          propertiesEnabled
            ? "bg-emerald-500/5 border-emerald-500/25"
            : "bg-amber-500/10 border-amber-500/30",
          className
        )}
      >
        <div className="flex items-start sm:items-center gap-3">
          <div
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
              propertiesEnabled
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                : "bg-amber-500 text-slate-950"
            )}
          >
            {propertiesEnabled ? <Building2 className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm text-text-primary">
                {propertiesEnabled ? "Properties Currently Visible" : "Properties Hidden (Projects Mode)"}
              </h3>
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                  propertiesEnabled
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                    : "bg-amber-500 text-slate-950 font-black"
                )}
              >
                {propertiesEnabled ? "Showing" : "Hidden"}
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5 max-w-xl">
              {propertiesEnabled
                ? "Property listings, configurations, and reference IDs are visible on the website and in admin."
                : "All property listings and filters are currently hidden. Click below to show all properties."}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggle}
          disabled={!ready || saving}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0 disabled:opacity-60 shadow-sm",
            propertiesEnabled
              ? "bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200"
              : "bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-amber-500/20"
          )}
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : propertiesEnabled ? (
            <EyeOff className="w-4 h-4" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
          <span>{saving ? "Saving..." : propertiesEnabled ? "Hide Properties" : "Show All Properties"}</span>
        </button>
      </div>
    );
  }

  // 3. Pill Variant (For capsule navigation tab strip)
  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={!ready || saving}
      className={cn(
        "shrink-0 px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer select-none border whitespace-nowrap",
        propertiesEnabled
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
          : "bg-amber-500 text-slate-950 border-amber-500 hover:bg-amber-400 font-extrabold shadow-xs",
        className
      )}
    >
      {saving ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
      ) : propertiesEnabled ? (
        <EyeOff className="w-3.5 h-3.5 shrink-0" />
      ) : (
        <Eye className="w-3.5 h-3.5 text-slate-950 shrink-0" />
      )}
      <span>{saving ? "Updating..." : propertiesEnabled ? "Hide Properties" : "Show All Properties"}</span>
    </button>
  );
}
