"use client";

import { useEffect, useState, useMemo } from "react";
import { useProjectsStore } from "@/stores/projects-store";
import { ProjectCard } from "@/components/project/project-card";
import { BackButton } from "@/components/ui/back-button";
import {
  Building2, Home, Landmark, Search, X, ChevronDown,
  SquareDashed, Trees, SlidersHorizontal,
} from "lucide-react";
import type { ProjectType, ConstructionStatus } from "@/types/project";

// ─── Filter Config ────────────────────────────────────────────────────────────
const TYPE_FILTERS: { value: ProjectType | "all"; label: string; icon: React.ElementType }[] = [
  { value: "all",       label: "All Projects", icon: Building2 },
  { value: "apartment", label: "Apartments",   icon: Building2 },
  { value: "villa",     label: "Villas",       icon: Home },
  { value: "venture",   label: "Ventures",     icon: Landmark },
];

const STATUS_OPTIONS: { value: ConstructionStatus | "all"; label: string }[] = [
  { value: "all",               label: "Any Status" },
  { value: "new-launch",        label: "New Launch" },
  { value: "under-construction",label: "Under Construction" },
  { value: "ready-to-move",     label: "Ready to Move" },
];

const SORT_OPTIONS = [
  { value: "newest",     label: "Newest First" },
  { value: "price-asc",  label: "Price: Low → High" },
  { value: "price-desc", label: "Price: High → Low" },
  { value: "name",       label: "Name A–Z" },
];

function getMinPrice(p: { configurations: { priceMin: number; priceMax: number }[] }): number {
  const prices = p.configurations.flatMap((c) => [c.priceMin, c.priceMax]).filter(Boolean);
  return prices.length ? Math.min(...prices) : 0;
}

export default function ProjectsPage() {
  const { projects, fetchProjects, isLoading } = useProjectsStore();

  const [activeType,   setActiveType]   = useState<ProjectType | "all">("all");
  const [activeStatus, setActiveStatus] = useState<ConstructionStatus | "all">("all");
  const [activeCity,   setActiveCity]   = useState("all");
  const [query,        setQuery]        = useState("");
  const [sortBy,       setSortBy]       = useState("newest");
  const [showFilters,  setShowFilters]  = useState(false);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const published = useMemo(() => projects.filter((p) => p.isPublished), [projects]);

  // Unique cities from published projects
  const cities = useMemo(() => {
    const all = [...new Set(published.map((p) => p.location.city))].sort();
    return ["all", ...all];
  }, [published]);

  // Per-type counts
  const counts = useMemo(() => ({
    all:       published.length,
    apartment: published.filter((p) => p.projectType === "apartment").length,
    villa:     published.filter((p) => p.projectType === "villa").length,
    venture:   published.filter((p) => p.projectType === "venture").length,
  }), [published]);

  // Filtered + sorted
  const filtered = useMemo(() => {
    let list = published.filter((p) => {
      if (activeType   !== "all" && p.projectType        !== activeType)   return false;
      if (activeStatus !== "all" && p.constructionStatus !== activeStatus) return false;
      if (activeCity   !== "all" && p.location.city      !== activeCity)   return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        const s = `${p.name} ${p.builderName} ${p.location.locality} ${p.location.city} ${p.tagline ?? ""}`.toLowerCase();
        if (!s.includes(q)) return false;
      }
      return true;
    });

    switch (sortBy) {
      case "price-asc":  list = [...list].sort((a, b) => getMinPrice(a) - getMinPrice(b)); break;
      case "price-desc": list = [...list].sort((a, b) => getMinPrice(b) - getMinPrice(a)); break;
      case "name":       list = [...list].sort((a, b) => a.name.localeCompare(b.name));     break;
      case "newest":     list = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt)); break;
    }
    return list;
  }, [published, activeType, activeStatus, activeCity, query, sortBy]);

  const hasActiveFilters = activeType !== "all" || activeStatus !== "all" || activeCity !== "all" || query.trim();

  const clearAll = () => {
    setActiveType("all");
    setActiveStatus("all");
    setActiveCity("all");
    setQuery("");
  };

  // ─── Skeleton ───────────────────────────────────────────────────────────────
  const Skeleton = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="rounded-3xl overflow-hidden border border-border-default bg-bg-card animate-pulse">
          <div className="aspect-[16/9] bg-border-default" />
          <div className="p-4 space-y-3">
            <div className="h-5 bg-border-default rounded-full w-3/4" />
            <div className="h-4 bg-border-default rounded-full w-1/2" />
            <div className="flex gap-2">
              <div className="h-6 bg-border-default rounded-full w-16" />
              <div className="h-6 bg-border-default rounded-full w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-bg-primary pt-20 pb-20">

      {/* ─── Hero ──────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-14 px-4 relative">
        <div className="max-w-5xl mx-auto text-center relative">
          <div className="absolute left-0 top-0 hidden sm:block">
            <BackButton className="text-white hover:bg-white/10" />
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-primary/20 border border-amber-primary/30 text-amber-primary text-sm font-semibold mb-5">
            <Building2 className="w-4 h-4" />
            Builder Projects
          </div>
          <h1 className="text-4xl md:text-5xl font-bold font-heading mb-3 tracking-tight">
            Discover Premium Projects
          </h1>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Apartments, Villas &amp; Ventures from top builders across Andhra Pradesh.
          </p>

          {/* Per-type stat pills */}
          <div className="flex items-center justify-center gap-3 flex-wrap mt-6">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">
              <Building2 className="w-3.5 h-3.5" />
              <span className="font-bold">{counts.apartment}</span> Apartments
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">
              <Home className="w-3.5 h-3.5" />
              <span className="font-bold">{counts.villa}</span> Villas
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">
              <Landmark className="w-3.5 h-3.5" />
              <span className="font-bold">{counts.venture}</span> Ventures
            </div>
          </div>

          {/* Search */}
          <div className="relative mt-8 max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search project name, builder, location…"
              className="w-full h-14 pl-12 pr-10 rounded-2xl bg-white/10 border border-white/20 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-primary/50 focus:bg-white/15 text-sm transition-all"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Filter Bar ────────────────────────────────────────────────────── */}
      <div className="sticky top-16 z-20 bg-white/95 dark:bg-bg-card/95 backdrop-blur border-b border-border-default shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          {/* Main filter row */}
          <div className="py-3 flex items-center gap-3 overflow-x-auto scrollbar-none">

            {/* Type filters */}
            {TYPE_FILTERS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setActiveType(value)}
                className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                  activeType === value
                    ? "bg-amber-primary text-slate-950 border-amber-primary shadow-sm"
                    : "bg-white dark:bg-bg-card border-border-default text-text-secondary hover:border-amber-primary/40 hover:text-text-primary"
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                {label}
                {value !== "all" && counts[value] > 0 && (
                  <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 ml-0.5 ${
                    activeType === value ? "bg-slate-950/20" : "bg-border-default text-text-tertiary"
                  }`}>
                    {counts[value]}
                  </span>
                )}
              </button>
            ))}

            <div className="h-5 w-px bg-border-default shrink-0" />

            {/* More filters toggle */}
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                showFilters
                  ? "bg-slate-900 text-white border-slate-900"
                  : "border-border-default text-text-secondary hover:border-slate-400"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filters
              {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-amber-primary" />}
            </button>

            {/* Sort */}
            <div className="shrink-0 flex items-center gap-2 ml-auto">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 rounded-xl border border-border-default bg-white dark:bg-bg-card text-sm text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-amber-primary/30"
              >
                {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* Expanded filter panel */}
          {showFilters && (
            <div className="pb-3 pt-1 flex flex-wrap items-center gap-3 border-t border-border-default">
              {/* Status */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-text-tertiary uppercase tracking-wide shrink-0">Status:</span>
                {STATUS_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setActiveStatus(value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      activeStatus === value
                        ? "bg-slate-900 text-white border-slate-900"
                        : "border-border-default text-text-secondary hover:border-slate-400"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* City filter */}
              {cities.length > 2 && (
                <>
                  <div className="h-5 w-px bg-border-default hidden sm:block" />
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-text-tertiary uppercase tracking-wide shrink-0">City:</span>
                    {cities.slice(0, 8).map((c) => (
                      <button
                        key={c}
                        onClick={() => setActiveCity(c)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all capitalize ${
                          activeCity === c
                            ? "bg-amber-primary text-slate-950 border-amber-primary"
                            : "border-border-default text-text-secondary hover:border-amber-primary/30"
                        }`}
                      >
                        {c === "all" ? "All Cities" : c}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {hasActiveFilters && (
                <button
                  onClick={clearAll}
                  className="ml-auto flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-semibold"
                >
                  <X className="w-3 h-3" /> Clear all
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── Results ───────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 mt-8">
        {/* Result count bar */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-text-secondary text-sm">
            <span className="font-bold text-text-primary">{filtered.length}</span>
            {" "}{activeType === "all" ? "project" : activeType}{filtered.length !== 1 ? "s" : ""} found
            {activeCity !== "all" && ` in ${activeCity}`}
          </p>
          {hasActiveFilters && (
            <button onClick={clearAll} className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary font-medium transition-colors">
              <X className="w-3.5 h-3.5" /> Clear filters
            </button>
          )}
        </div>

        {isLoading ? (
          <Skeleton />
        ) : filtered.length === 0 ? (
          <div className="py-24 text-center">
            <Building2 className="w-14 h-14 mx-auto mb-4 text-text-tertiary/30" />
            <h3 className="text-xl font-bold text-text-primary mb-2">No projects found</h3>
            <p className="text-text-secondary text-sm mb-6">Try adjusting your filters or search terms.</p>
            <button
              onClick={clearAll}
              className="px-6 py-2.5 rounded-full bg-amber-primary text-slate-950 font-bold text-sm hover:bg-amber-500 transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
            {filtered.map((project, i) => (
              <ProjectCard key={project.id} project={project} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
