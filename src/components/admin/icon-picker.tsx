"use client";

import { useState, useMemo } from "react";
import { Search, Check } from "lucide-react";
import {
  ICON_OPTIONS_META,
  HOME_SECTION_ICONS,
  getLucideIcon,
  type IconOptionMeta,
} from "@/lib/home-section-icons";
import type { HomeSectionIconName } from "@/types/home-section";
import { cn } from "@/lib/utils";

interface IconPickerProps {
  value?: string;
  onChange: (iconName: string) => void;
  label?: string;
  className?: string;
  compact?: boolean;
}

export function IconPicker({
  value = "Building2",
  onChange,
  label = "Choose Icon",
  className,
  compact = false,
}: IconPickerProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");

  const categories = ["All", "Properties", "Badges", "Finance", "Lifestyle"];

  const filteredIcons = useMemo(() => {
    return ICON_OPTIONS_META.filter((opt) => {
      const matchesCat = activeCategory === "All" || opt.category === activeCategory;
      const matchesQuery =
        !search.trim() ||
        opt.name.toLowerCase().includes(search.toLowerCase()) ||
        opt.label.toLowerCase().includes(search.toLowerCase());
      return matchesCat && matchesQuery;
    });
  }, [search, activeCategory]);

  const SelectedIcon = getLucideIcon(value);
  const selectedMeta = ICON_OPTIONS_META.find((m) => m.name === value);

  return (
    <div className={cn("space-y-2.5", className)}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-text-primary flex items-center gap-1.5">
            <span>{label}</span>
          </label>
          {selectedMeta && (
            <span className="text-[11px] font-semibold text-amber-500 flex items-center gap-1">
              Selected: <span className="font-bold text-text-primary">{selectedMeta.label}</span>
            </span>
          )}
        </div>
      )}

      {/* Selected Icon Showcase Header */}
      <div className="flex items-center gap-3 p-2.5 bg-slate-900 border border-slate-800 rounded-xl shadow-xs">
        <div className="w-10 h-10 rounded-full bg-white shadow-md border border-slate-100 flex items-center justify-center text-[#78350f] shrink-0">
          <SelectedIcon className="w-5 h-5 stroke-[2.2]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-white">{selectedMeta?.label || value}</span>
            <span className="font-mono text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
              {value}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Renders in circular badge on cards and headers
          </p>
        </div>
      </div>

      {/* Search and Category Filter */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search icons (e.g. villa, rupee, key, project)..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-bg-surface border border-border-default rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-2.5 py-1 rounded-md text-[11px] font-bold shrink-0 transition-all cursor-pointer",
                activeCategory === cat
                  ? "bg-amber-500 text-slate-950 shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Icon Grid */}
      <div
        className={cn(
          "grid gap-1.5 p-2 bg-slate-950/40 border border-border-default rounded-xl overflow-y-auto max-h-[180px] scrollbar-thin",
          compact
            ? "grid-cols-4 sm:grid-cols-6"
            : "grid-cols-3 sm:grid-cols-4 md:grid-cols-6"
        )}
      >
        {filteredIcons.length === 0 ? (
          <div className="col-span-full py-4 text-center text-xs text-text-tertiary">
            No icons found matching "{search}"
          </div>
        ) : (
          filteredIcons.map((opt) => {
            const IconComp = HOME_SECTION_ICONS[opt.name];
            const isSelected = value === opt.name;

            return (
              <button
                key={opt.name}
                type="button"
                title={`${opt.label} (${opt.name})`}
                onClick={() => onChange(opt.name)}
                className={cn(
                  "group relative flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all cursor-pointer",
                  isSelected
                    ? "bg-amber-500/15 border-amber-500 text-amber-500 shadow-sm ring-1 ring-amber-500/50"
                    : "bg-bg-surface hover:bg-slate-100 dark:hover:bg-slate-800/80 border-border-default hover:border-amber-500/40 text-text-secondary hover:text-text-primary"
                )}
              >
                <div
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center mb-1 transition-transform group-hover:scale-110",
                    isSelected
                      ? "bg-amber-500 text-slate-950"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                  )}
                >
                  <IconComp className="w-3.5 h-3.5 stroke-[2.2]" />
                </div>
                <span className="text-[10px] font-bold truncate max-w-full leading-tight">
                  {opt.label}
                </span>

                {isSelected && (
                  <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
