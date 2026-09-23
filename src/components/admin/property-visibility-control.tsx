"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useSiteFeatures } from "@/components/providers/site-features-provider";

export function PropertyVisibilityControl() {
  const { propertiesEnabled, ready, error, refresh, save } = useSiteFeatures();
  const [saving, setSaving] = useState(false);
  async function toggle() {
    setSaving(true);
    try {
      await save(!propertiesEnabled);
      toast.success(propertiesEnabled ? "Properties hidden. Projects-only mode is live." : "Properties are visible again.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save settings."); }
    finally { setSaving(false); }
  }
  return <section className="rounded-2xl border border-border-default bg-bg-card p-5 sm:p-6" aria-labelledby="property-visibility-title">
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-amber-500/10 p-3 text-amber-600">{propertiesEnabled ? <Eye size={22} /> : <EyeOff size={22} />}</div>
        <div><p className="text-xs font-bold uppercase tracking-widest text-text-secondary">Website visibility</p>
          <h2 id="property-visibility-title" className="mt-1 text-lg font-bold">Properties</h2>
          <p className="mt-1 max-w-xl text-sm text-text-secondary">Hide property listings, navigation, search filters and actions across the website. Projects stay available. Your property data is preserved.</p>
        </div>
      </div>
      <button type="button" role="switch" aria-checked={propertiesEnabled} aria-label="Show properties on website" disabled={!ready || saving || !!error} onClick={toggle}
        className="flex min-h-12 shrink-0 cursor-pointer items-center justify-center gap-3 rounded-xl border border-border-default px-4 py-3 text-sm font-semibold transition-colors hover:bg-amber-500/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-500 disabled:cursor-wait disabled:opacity-60">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        <span>{saving ? "Saving…" : !ready ? "Loading…" : propertiesEnabled ? "Visible" : "Hidden"}</span>
        <span aria-hidden className={`flex h-6 w-11 items-center rounded-full p-1 ${propertiesEnabled ? "bg-emerald-600" : "bg-slate-400"}`}><span className={`h-4 w-4 rounded-full bg-white transition-transform motion-reduce:transition-none ${propertiesEnabled ? "translate-x-5" : ""}`} /></span>
      </button>
    </div>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border-default pt-4 text-xs text-text-secondary">
      <p role="status">{error || (ready ? propertiesEnabled ? "Full experience · Properties and projects" : "Projects-only experience · Property features hidden" : "Checking current website mode…")}</p>
      {error ? <button className="cursor-pointer underline" onClick={() => void refresh()}>Retry</button> : <Link href="/" target="_blank" className="font-semibold underline underline-offset-4">Preview website</Link>}
    </div>
  </section>;
}
