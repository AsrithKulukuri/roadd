"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePropertiesStore } from "@/stores/properties-store";
import { useProjectsStore } from "@/stores/projects-store";
import { missingPlotDetails, needsCrdaReview } from "@/lib/listing-quality";

export function ListingQualityPanel({ scope = "all" }: { scope?: "all" | "properties" | "projects" }) {
  const { properties, fetchProperties, isLoading: loadingProperties, error: propertyError } = usePropertiesStore();
  const { projects, fetchProjects, isLoading: loadingProjects, error: projectError } = useProjectsStore();
  const [expanded, setExpanded] = useState(false);
  useEffect(() => { void fetchProperties(); void fetchProjects(); }, [fetchProperties, fetchProjects]);
  const plots = properties.map(property => ({ property, missing: missingPlotDetails(property) })).filter(item => item.missing.length > 0);
  const approvals = projects.filter(needsCrdaReview);
  const rows = [
    ...(scope !== "projects" ? plots.map(({ property, missing }) => ({ id: `property-${property.id}`, title: property.title, detail: `Missing: ${missing.join(", ")}`, href: `/admin/properties/${property.id}/edit`, action: "Complete plot details" })) : []),
    ...(scope !== "properties" ? approvals.map(project => ({ id: `project-${project.id}`, title: project.name, detail: "Marked CRDA approved; approval reference and review are needed.", href: `/admin/projects/${project.id}/edit`, action: "Review CRDA approval" })) : []),
  ];
  const loading = loadingProperties || loadingProjects;
  return <section aria-label="Listing data quality" className="mb-6 rounded-2xl border border-amber-500/30 bg-bg-card p-4 sm:p-6 space-y-4">
    <div><h2 className="text-lg font-bold text-text-primary">Listing data quality</h2><p className="text-sm text-text-secondary">Complete details from verified records. Review older CRDA flags before confirming approval.</p></div>
    <div className="flex flex-wrap gap-3 text-sm font-semibold">
      {scope !== "projects" && <span className="rounded-xl bg-amber-500/10 px-3 py-2">{plots.length} plots need details</span>}
      {scope !== "properties" && <span className="rounded-xl bg-amber-500/10 px-3 py-2">{approvals.length} CRDA approvals need review</span>}
    </div>
    {propertyError || projectError ? <p role="alert" className="text-sm text-red-500">Could not refresh all listings. Counts may be incomplete. <button type="button" className="underline" onClick={() => { void fetchProperties(); void fetchProjects(); }}>Retry</button></p> : loading ? <p role="status" className="text-sm text-text-secondary">Checking listings…</p> : rows.length === 0 ? <p className="text-sm text-text-secondary">No outstanding items in the loaded listings.</p> : null}
    <ul className="divide-y divide-border-default">{(expanded ? rows : rows.slice(0, 5)).map(row => <li key={row.id} className="flex flex-col sm:flex-row sm:items-center gap-2 py-3"><div className="flex-1 min-w-0"><p className="font-semibold text-text-primary break-words">{row.title}</p><p className="text-xs text-text-secondary">{row.detail}</p></div><Link href={row.href} className="shrink-0 text-sm font-bold text-amber-600 underline underline-offset-4">{row.action}</Link></li>)}</ul>
    {rows.length > 5 && <button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)} className="min-h-11 text-sm font-semibold text-amber-600">{expanded ? "Show fewer" : `Show all ${rows.length} items`}</button>}
  </section>;
}
