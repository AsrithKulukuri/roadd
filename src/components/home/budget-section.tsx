"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { IndianRupee, ArrowRight, Home } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { PropertyCard } from "@/components/property/property-card";
import { ProjectCard } from "@/components/project/project-card";
import { usePropertiesStore } from "@/stores/properties-store";
import { useProjectsStore } from "@/stores/projects-store";
import { formatINR, cn } from "@/lib/utils";

const PRESETS = [
  { label: "Under 30L", min: 0, max: 3000000 },
  { label: "30L–60L", min: 3000000, max: 6000000 },
  { label: "60L–1 Cr", min: 6000000, max: 10000000 },
  { label: "1–2 Cr", min: 10000000, max: 20000000 },
  { label: "2 Cr+", min: 20000000, max: 100000000 },
];

export function BudgetSection() {
  const router = useRouter();
  const properties = usePropertiesStore((s) => s.properties);
  const projects = useProjectsStore((s) => s.projects);
  const [budget, setBudget] = useState<[number, number]>([0, 100000000]);

  const filtered = useMemo(() => {
    const validProps = properties.filter(
      (p) =>
        p.status !== "sold" &&
        p.price >= budget[0] &&
        p.price <= budget[1]
    ).map(p => ({ type: 'property' as const, data: p, price: p.price, createdAt: p.createdAt }));

    const validProjs = projects.filter(
      (p) => {
        if (!p.configurations || p.configurations.length === 0) return false;
        return p.configurations.some(cfg => cfg.priceMin <= budget[1] && cfg.priceMax >= budget[0]);
      }
    ).map(p => ({ type: 'project' as const, data: p, price: p.configurations[0]?.priceMin || 0, createdAt: p.createdAt }));

    const combined = [...validProps, ...validProjs];
    
    // Sort by newest first just to have a nice default mix
    combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return combined.slice(0, 6);
  }, [properties, projects, budget]);

  const handleViewAll = () => {
    router.push(`/search?budget=${budget[0]},${budget[1]}`);
  };

  const isDefault = budget[0] === 0 && budget[1] === 100000000;

  return (
    <section className="py-10 sm:py-14 px-4 sm:px-6 max-w-7xl mx-auto w-full">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center">
            <IndianRupee className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
              Find by Budget
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Drag the slider to explore properties in your range
            </p>
          </div>
        </div>
        <button
          onClick={handleViewAll}
          className="hidden sm:flex items-center gap-1 text-amber-500 font-bold text-sm hover:text-amber-600 transition-colors cursor-pointer"
        >
          View all <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Budget Slider Card */}
      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 mb-7 shadow-sm">
        {/* Live Price Label */}
        <div className="flex justify-between items-center mb-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Budget Range (INR)
          </span>
          <span className="text-base font-black text-amber-500">
            {isDefault
              ? "Any Price"
              : `${formatINR(budget[0])} – ${budget[1] >= 100000000 ? "₹10+ Cr" : formatINR(budget[1])}`}
          </span>
        </div>

        {/* Dual-handle Slider */}
        <Slider
          min={0}
          max={100000000}
          step={500000}
          value={budget}
          onValueChange={(val) => setBudget(val as [number, number])}
          className="w-full mb-3"
        />

        {/* Axis labels */}
        <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-4">
          <span>₹0</span>
          <span>₹10+ Crores</span>
        </div>

        {/* Quick preset chips */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setBudget([0, 100000000])}
            className={cn(
              "py-1 px-3 rounded-full text-[11px] font-extrabold border transition-all cursor-pointer",
              isDefault
                ? "bg-amber-500 text-slate-950 border-amber-500"
                : "text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400"
            )}
          >
            Any Price
          </button>
          {PRESETS.map((p) => {
            const isSelected = budget[0] === p.min && budget[1] === p.max;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => setBudget([p.min, p.max])}
                className={cn(
                  "py-1 px-3 rounded-full text-[11px] font-extrabold border transition-all cursor-pointer",
                  isSelected
                    ? "bg-amber-500 text-slate-950 border-amber-500"
                    : "text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400"
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <Home className="w-4 h-4 text-amber-500" />
          <span>
            <strong className="text-slate-900 dark:text-white">
              {filtered.length}
            </strong>{" "}
            {filtered.length === 1 ? "property" : "properties"} found
            {!isDefault && (
              <span className="text-slate-400 ml-1">in this range</span>
            )}
          </span>
        </div>
        <button
          onClick={handleViewAll}
          className="sm:hidden flex items-center gap-1 text-amber-500 font-bold text-xs cursor-pointer"
        >
          View all <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Property Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item, idx) => (
            item.type === "property" 
              ? <PropertyCard key={`prop-${item.data.id}-${idx}`} property={item.data as any} />
              : <ProjectCard key={`proj-${item.data.id}-${idx}`} project={item.data as any} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-14 text-center gap-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <IndianRupee className="w-6 h-6 text-slate-400" />
          </div>
          <p className="font-bold text-slate-700 dark:text-slate-300">
            No properties in this range
          </p>
          <p className="text-xs text-slate-400">
            Try adjusting the slider to find available homes
          </p>
          <button
            onClick={() => setBudget([0, 100000000])}
            className="mt-1 px-4 py-1.5 bg-amber-500 text-slate-950 font-bold text-xs rounded-full cursor-pointer hover:bg-amber-600 transition-colors"
          >
            Show all properties
          </button>
        </div>
      )}

      {/* View All CTA */}
      {filtered.length > 0 && (
        <div className="flex justify-center mt-6">
          <button
            onClick={handleViewAll}
            className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 font-bold text-sm rounded-full hover:bg-slate-700 dark:hover:bg-amber-600 transition-all shadow-md cursor-pointer"
          >
            View all {isDefault ? "listings" : "listings in this budget"}{" "}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </section>
  );
}
