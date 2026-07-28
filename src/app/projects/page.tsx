"use client";

import { useEffect, useState } from "react";
import { useProjectsStore } from "@/stores/projects-store";
import { ProjectCard } from "@/components/project/project-card";
import { Building2, Home, Landmark, Search, SlidersHorizontal } from "lucide-react";
import type { ProjectType } from "@/types/project";

const FILTERS: { value: ProjectType | "all"; label: string; icon: React.ElementType }[] = [
  { value: "all",       label: "All Projects", icon: Building2 },
  { value: "apartment", label: "Apartments",   icon: Building2 },
  { value: "villa",     label: "Villas",       icon: Home },
  { value: "venture",   label: "Ventures",     icon: Landmark },
];

const STATUS_LABELS: Record<string, string> = {
  "all":               "Any Status",
  "new-launch":        "New Launch",
  "under-construction":"Under Construction",
  "ready-to-move":     "Ready to Move",
};

export default function ProjectsPage() {
  const { projects, fetchProjects, isLoading } = useProjectsStore();
  const [activeType, setActiveType]     = useState<ProjectType | "all">("all");
  const [activeStatus, setActiveStatus] = useState("all");
  const [query, setQuery]               = useState("");

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const published = projects.filter((p) => p.isPublished);

  const filtered = published.filter((p) => {
    if (activeType !== "all" && p.projectType !== activeType) return false;
    if (activeStatus !== "all" && p.constructionStatus !== activeStatus) return false;
    if (query.trim()) {
      const q = query.toLowerCase();
      const searchable = `${p.name} ${p.builderName} ${p.location.locality} ${p.location.city} ${p.tagline ?? ""}`.toLowerCase();
      if (!searchable.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-bg-primary pt-20 pb-20">
      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-16 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-primary/20 border border-amber-primary/30 text-amber-primary text-sm font-medium mb-5">
            <Building2 className="w-4 h-4" />
            Builder Projects
          </div>
          <h1 className="text-4xl md:text-5xl font-bold font-heading mb-4 tracking-tight">
            Discover Premium Projects
          </h1>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Apartments, Villas & Ventures from top builders across Andhra Pradesh.
          </p>

          {/* Search bar */}
          <div className="relative mt-8 max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search project name, builder, location…"
              className="w-full h-14 pl-12 pr-4 rounded-2xl bg-white dark:bg-bg-card border border-border-default text-text-primary placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-primary/40 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="sticky top-16 z-20 bg-white/90 dark:bg-bg-card/90 backdrop-blur border-b border-border-default shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center gap-2 sm:gap-4">
          {/* Type filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {FILTERS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setActiveType(value)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                  activeType === value
                    ? "bg-amber-primary text-slate-950 border-amber-primary shadow-sm"
                    : "bg-white dark:bg-bg-card border-border-default text-text-secondary hover:border-amber-primary/40"
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            ))}
          </div>

          <div className="h-5 w-px bg-border-default hidden sm:block" />

          {/* Status filter */}
          <div className="flex items-center gap-2 flex-wrap">
            {Object.entries(STATUS_LABELS).map(([val, lbl]) => (
              <button
                key={val}
                onClick={() => setActiveStatus(val)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  activeStatus === val
                    ? "bg-slate-900 text-white border-slate-900"
                    : "border-border-default text-text-secondary hover:border-slate-400"
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 mt-8">
        <div className="flex items-center justify-between mb-6">
          <p className="text-text-secondary text-sm">
            <span className="font-semibold text-text-primary">{filtered.length}</span> project{filtered.length !== 1 ? "s" : ""} found
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-3xl overflow-hidden border border-border-default bg-bg-card animate-pulse">
                <div className="aspect-[16/9] bg-border-default" />
                <div className="p-4 space-y-3">
                  <div className="h-5 bg-border-default rounded-full w-3/4" />
                  <div className="h-4 bg-border-default rounded-full w-1/2" />
                  <div className="h-4 bg-border-default rounded-full w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-24 text-center">
            <Building2 className="w-12 h-12 mx-auto mb-4 text-text-tertiary/40" />
            <h3 className="text-xl font-bold text-text-primary mb-2">No projects found</h3>
            <p className="text-text-secondary text-sm">Try adjusting your filters or search terms.</p>
            <button onClick={() => { setActiveType("all"); setActiveStatus("all"); setQuery(""); }}
              className="mt-4 px-5 py-2 rounded-full bg-amber-primary text-slate-950 font-semibold text-sm hover:bg-amber-500 transition-colors">
              Clear Filters
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
