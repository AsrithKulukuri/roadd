"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  EyeOff,
  Layers,
  LayoutList,
  Palette,
  Plus,
  RotateCcw,
  Save,
  Search,
  Sliders,
  Sparkles,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HOME_SECTION_ICONS } from "@/lib/home-section-icons";
import { cn, formatPriceCompact } from "@/lib/utils";
import { usePropertiesStore } from "@/stores/properties-store";
import { useProjectsStore } from "@/stores/projects-store";
import {
  HOME_SECTION_ICON_NAMES,
  HOME_CARD_STYLES,
  DEFAULT_CARD_STYLE,
  MAX_HOME_SECTION_ITEMS,
  MAX_HOME_SECTIONS,
  type HomeSection,
  type HomeSectionItem,
  type HomeCardStyleId,
} from "@/types/home-section";
import { CardStyleGalleryModal } from "@/components/home/shelves/card-style-preview";
import { ShelfCard } from "@/components/home/shelves/shelf-card";
import type { MixedItem } from "@/components/home/mixed-carousel-row";
import type { Property } from "@/types/property";
import type { Project } from "@/types/project";

type ListingCandidate = {
  id: string;
  type: HomeSectionItem["type"];
  title: string;
  location: string;
  image?: string;
  price: string;
};

function projectPrice(project: Project) {
  const values = project.configurations?.flatMap((config) => [config.priceMin, config.priceMax]).filter((value): value is number => typeof value === "number" && value > 0) ?? [];
  return values.length ? formatPriceCompact(Math.min(...values)) : "Price on request";
}

function createLegacySections(properties: Property[], projects: Project[]): HomeSection[] {
  const activeProperties = properties.filter((property) => property.status !== "sold" && property.status !== "hidden");
  const activeProjects = projects.filter((project) => project.isPublished);
  const makeItems = (category: "recommended" | "featured" | "budget_friendly") => [
    ...activeProperties.filter((property) => property.displayCategory === category || (category === "featured" && property.isFeatured) || (category === "recommended" && property.isRecommended)).map((property) => ({ id: property.id, type: "property" as const })),
    ...activeProjects.filter((project) => project.displayCategory === category || (category === "featured" && project.isFeatured)).map((project) => ({ id: project.id, type: "project" as const })),
  ].slice(0, MAX_HOME_SECTION_ITEMS);

  return [
    { id: "recommended", title: "Recommended", icon: "ThumbsUp", isActive: true, cardStyle: "compact-marketplace", items: makeItems("recommended") },
    { id: "featured", title: "Featured", icon: "Star", isActive: true, cardStyle: "tall-portrait", items: makeItems("featured") },
    { id: "budget-friendly", title: "Budget Friendly", icon: "IndianRupee", isActive: true, cardStyle: "bottom-floating", items: makeItems("budget_friendly") },
  ];
}

export default function HomepageShelvesAdminPage() {
  const { properties, fetchProperties } = usePropertiesStore();
  const { projects, fetchProjects } = useProjectsStore();
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [layoutLoaded, setLayoutLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pickerSectionId, setPickerSectionId] = useState<string | null>(null);
  const [stylePickerSectionId, setStylePickerSectionId] = useState<string | null>(null);
  const [expandedSettingsId, setExpandedSettingsId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "property" | "project">("all");

  useEffect(() => {
    void Promise.all([fetchProperties(), fetchProjects()]);
  }, [fetchProperties, fetchProjects]);

  useEffect(() => {
    let cancelled = false;
    async function loadLayout() {
      try {
        const response = await fetch("/api/home-sections", { cache: "no-store" });
        const data = await response.json();
        if (!cancelled && data.configured && Array.isArray(data.sections)) setSections(data.sections);
      } catch {
        // The legacy category layout is populated after listings finish loading.
      } finally {
        if (!cancelled) setLayoutLoaded(true);
      }
    }
    void loadLayout();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (layoutLoaded && sections.length === 0 && (properties.length > 0 || projects.length > 0)) {
      const timer = window.setTimeout(() => setSections(createLegacySections(properties, projects)), 0);
      return () => window.clearTimeout(timer);
    }
  }, [layoutLoaded, projects, properties, sections.length]);

  const candidates = useMemo<ListingCandidate[]>(() => [
    ...properties
      .filter((property) => property.status !== "sold" && property.status !== "hidden")
      .map((property) => ({
        id: property.id,
        type: "property" as const,
        title: property.title,
        location: [property.location?.locality, property.location?.city].filter(Boolean).join(", "),
        image: property.coverImage || property.images?.[0]?.url,
        price: formatPriceCompact(property.price),
      })),
    ...projects
      .filter((project) => project.isPublished)
      .map((project) => ({
        id: project.id,
        type: "project" as const,
        title: project.name,
        location: [project.location?.locality, project.location?.city].filter(Boolean).join(", "),
        image: project.coverImage,
        price: projectPrice(project),
      })),
  ], [projects, properties]);

  const candidateMap = useMemo(() => new Map(candidates.map((candidate) => [`${candidate.type}:${candidate.id}`, candidate])), [candidates]);
  const pickerSection = sections.find((section) => section.id === pickerSectionId);
  const filteredCandidates = candidates.filter((candidate) => {
    const search = query.trim().toLowerCase();
    return (typeFilter === "all" || candidate.type === typeFilter) && (!search || `${candidate.title} ${candidate.location}`.toLowerCase().includes(search));
  });

  const updateSection = (id: string, updates: Partial<HomeSection>) => {
    setSections((current) => current.map((section) => section.id === id ? { ...section, ...updates } : section));
  };

  const moveSection = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= sections.length) return;
    setSections((current) => {
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const addSection = () => {
    if (sections.length >= MAX_HOME_SECTIONS) return toast.error(`You can add up to ${MAX_HOME_SECTIONS} homepage shelves.`);
    const id = `section-${Date.now()}`;
    setSections((current) => [...current, { id, title: "New collection", icon: "Sparkles", isActive: true, cardStyle: DEFAULT_CARD_STYLE, items: [] }]);
  };

  const toggleItem = (sectionId: string, item: HomeSectionItem) => {
    const section = sections.find((entry) => entry.id === sectionId);
    if (!section) return;
    const exists = section.items.some((entry) => entry.id === item.id && entry.type === item.type);
    if (!exists && section.items.length >= MAX_HOME_SECTION_ITEMS) return toast.error(`Each shelf can contain up to ${MAX_HOME_SECTION_ITEMS} listings.`);
    updateSection(sectionId, {
      items: exists
        ? section.items.filter((entry) => entry.id !== item.id || entry.type !== item.type)
        : [...section.items, item],
    });
  };

  const updateSectionItem = (
    sectionId: string,
    itemId: string,
    itemType: "property" | "project",
    itemUpdates: Partial<HomeSectionItem>
  ) => {
    setSections((current) =>
      current.map((section) => {
        if (section.id !== sectionId) return section;
        return {
          ...section,
          items: section.items.map((item) => {
            if (item.id === itemId && item.type === itemType) {
              return { ...item, ...itemUpdates };
            }
            return item;
          }),
        };
      })
    );
  };

  const saveLayout = async () => {
    if (sections.some((section) => !section.title.trim())) return toast.error("Every shelf needs a title.");
    if (sections.some((section) => section.isActive && section.items.length === 0)) return toast.error("Add at least one listing to every active shelf.");
    setIsSaving(true);
    try {
      const response = await fetch("/api/home-sections", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save layout");
      setSections(data.sections);
      toast.success("Homepage shelves published.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save layout");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-10">
      <header className="flex flex-col gap-4 border-b border-border-default pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-extrabold text-[#faad13]"><LayoutList className="h-5 w-5" /> Homepage merchandising</div>
          <h1 className="text-2xl font-black text-text-primary sm:text-3xl">Homepage Shelves</h1>
          <p className="mt-1 max-w-2xl text-sm text-text-secondary">Create and order up to eight curated shelves. Each shelf can mix up to eight published properties and projects.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={addSection} disabled={sections.length >= MAX_HOME_SECTIONS}><Plus className="h-4 w-4" /> Add shelf</Button>
          <Button onClick={saveLayout} disabled={isSaving} className="bg-[#faad13] font-extrabold text-slate-950 hover:bg-[#e89d08]"><Save className="h-4 w-4" /> {isSaving ? "Publishing..." : "Publish layout"}</Button>
        </div>
      </header>

      <div className="flex items-center justify-between rounded-lg border border-border-default bg-bg-card px-4 py-3 text-sm">
        <span className="font-bold text-text-primary">{sections.length} of {MAX_HOME_SECTIONS} shelves</span>
        <span className="text-text-secondary">Order here matches the homepage</span>
      </div>

      <div className="space-y-4">
        {sections.map((section, index) => {
          const Icon = HOME_SECTION_ICONS[section.icon];
          const currentStyleId = section.cardStyle || DEFAULT_CARD_STYLE;
          const cardStyleMeta = HOME_CARD_STYLES.find((s) => s.id === currentStyleId) || HOME_CARD_STYLES[0];

          return (
            <section key={section.id} className={cn("rounded-2xl border bg-bg-card p-4 shadow-sm sm:p-5 transition-all", section.isActive ? "border-border-default" : "border-dashed border-slate-300 opacity-75")}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-[#faad13] shadow-xs"><Icon className="h-5 w-5" /></div>
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-wrap">
                      <Input value={section.title} maxLength={40} aria-label="Shelf title" onChange={(event) => updateSection(section.id, { title: event.target.value })} className="h-10 max-w-md font-extrabold text-sm" />
                      
                      {/* Card Style Selector Button */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setStylePickerSectionId(section.id)}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-border-default bg-slate-100 dark:bg-slate-800/90 hover:border-[#faad13] text-slate-900 dark:text-white text-xs font-black shadow-xs transition-all cursor-pointer"
                        >
                          <Layers className="w-3.5 h-3.5 text-[#faad13]" />
                          <span>{cardStyleMeta.label}</span>
                          <span className="text-[10px] text-slate-400 font-normal">({cardStyleMeta.minWidth}–{cardStyleMeta.maxWidth}px)</span>
                          <span className="text-amber-500 font-bold ml-1 hover:underline">Change Style ▾</span>
                        </button>

                        {/* Custom Colors, Labels & Carousel Drawer Toggle Button */}
                        <button
                          type="button"
                          onClick={() => setExpandedSettingsId(expandedSettingsId === section.id ? null : section.id)}
                          className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-black shadow-xs transition-all cursor-pointer",
                            expandedSettingsId === section.id
                              ? "bg-amber-500 text-slate-950 border-amber-500 shadow-sm"
                              : "border-border-default bg-slate-100 dark:bg-slate-800/90 hover:border-[#faad13] text-slate-800 dark:text-white"
                          )}
                        >
                          <Palette className="w-3.5 h-3.5 text-[#faad13]" />
                          <span>Custom Colors & Carousel</span>
                          {expandedSettingsId === section.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* EXPANDABLE SHELF CUSTOMIZATION DRAWER */}
                    {expandedSettingsId === section.id && (
                      <div className="mt-2 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10 space-y-4">
                        <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                          <div className="flex items-center gap-2">
                            <Sliders className="w-4 h-4 text-amber-500" />
                            <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                              Shelf Style & Carousel Settings (Admin Only)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              updateSection(section.id, {
                                cardBgColor: undefined,
                                cardTextColor: undefined,
                                cardAccentColor: undefined,
                                customBadge: undefined,
                                customHeadline: undefined,
                                customTagline: undefined,
                                enableCarousel: true,
                                carouselInterval: 4,
                              });
                              toast.success("Reset shelf styles to default (White box, Dark text, Gold logo)");
                            }}
                            className="text-[11px] font-bold text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" /> Reset Defaults
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* 1. Colors */}
                          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-border-default space-y-3 shadow-xs">
                            <p className="text-[11px] font-black uppercase text-slate-500 flex items-center gap-1.5">
                              <Palette className="w-3.5 h-3.5 text-amber-500" /> Colors (Default: White Box)
                            </p>

                            {/* Card Background */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-text-primary">Card Background</span>
                                <span className="font-mono text-[10px] text-text-tertiary">{section.cardBgColor || "#ffffff (default)"}</span>
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <input
                                  type="color"
                                  value={section.cardBgColor || "#ffffff"}
                                  onChange={(e) => updateSection(section.id, { cardBgColor: e.target.value })}
                                  className="h-7 w-7 rounded cursor-pointer border border-border-default p-0.5 bg-transparent"
                                  title="Pick custom card background color"
                                />
                                {[
                                  { label: "White", color: "#ffffff" },
                                  { label: "Dark", color: "#090d16" },
                                  { label: "Navy", color: "#0f172a" },
                                  { label: "Indigo", color: "#1e1b4b" },
                                ].map((c) => (
                                  <button
                                    key={c.color}
                                    type="button"
                                    onClick={() => updateSection(section.id, { cardBgColor: c.color })}
                                    className={cn(
                                      "px-2 py-0.5 text-[10px] font-bold rounded border transition-all cursor-pointer",
                                      (section.cardBgColor || "#ffffff").toLowerCase() === c.color.toLowerCase()
                                        ? "border-amber-500 ring-1 ring-amber-500 font-black"
                                        : "border-slate-200 dark:border-slate-700"
                                    )}
                                    style={{ backgroundColor: c.color, color: c.color === "#ffffff" ? "#000" : "#fff" }}
                                  >
                                    {c.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Text Color */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-text-primary">Text Color</span>
                                <span className="font-mono text-[10px] text-text-tertiary">{section.cardTextColor || "#0f172a (default)"}</span>
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <input
                                  type="color"
                                  value={section.cardTextColor || "#0f172a"}
                                  onChange={(e) => updateSection(section.id, { cardTextColor: e.target.value })}
                                  className="h-7 w-7 rounded cursor-pointer border border-border-default p-0.5 bg-transparent"
                                  title="Pick custom text color"
                                />
                                {[
                                  { label: "Black", color: "#0f172a" },
                                  { label: "White", color: "#ffffff" },
                                  { label: "Slate", color: "#334155" },
                                ].map((c) => (
                                  <button
                                    key={c.color}
                                    type="button"
                                    onClick={() => updateSection(section.id, { cardTextColor: c.color })}
                                    className={cn(
                                      "px-2 py-0.5 text-[10px] font-bold rounded border transition-all cursor-pointer",
                                      (section.cardTextColor || "#0f172a").toLowerCase() === c.color.toLowerCase()
                                        ? "border-amber-500 ring-1 ring-amber-500 font-black"
                                        : "border-slate-200 dark:border-slate-700"
                                    )}
                                    style={{ backgroundColor: c.color, color: c.color === "#ffffff" ? "#000" : "#fff" }}
                                  >
                                    {c.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Logo & Accent Color */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-text-primary">Logo & Accent Icons</span>
                                <span className="font-mono text-[10px] text-text-tertiary">{section.cardAccentColor || "#faad13 (default)"}</span>
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <input
                                  type="color"
                                  value={section.cardAccentColor || "#faad13"}
                                  onChange={(e) => updateSection(section.id, { cardAccentColor: e.target.value })}
                                  className="h-7 w-7 rounded cursor-pointer border border-border-default p-0.5 bg-transparent"
                                  title="Pick custom logo and accent color"
                                />
                                {[
                                  { label: "Gold", color: "#faad13" },
                                  { label: "Purple", color: "#9333ea" },
                                  { label: "Emerald", color: "#10b981" },
                                  { label: "Sky", color: "#0284c7" },
                                ].map((c) => (
                                  <button
                                    key={c.color}
                                    type="button"
                                    onClick={() => updateSection(section.id, { cardAccentColor: c.color })}
                                    className={cn(
                                      "px-2 py-0.5 text-[10px] font-bold rounded border transition-all cursor-pointer",
                                      (section.cardAccentColor || "#faad13").toLowerCase() === c.color.toLowerCase()
                                        ? "border-amber-500 ring-1 ring-amber-500 font-black"
                                        : "border-slate-200 dark:border-slate-700"
                                    )}
                                    style={{ backgroundColor: c.color, color: "#fff" }}
                                  >
                                    {c.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* 2. Labels & Copy */}
                          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-border-default space-y-3 shadow-xs">
                            <p className="text-[11px] font-black uppercase text-slate-500 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Badges & Editorial Copy
                            </p>

                            <div className="space-y-1">
                              <label className="text-xs font-bold text-text-primary block">Badge Pill Label</label>
                              <Input
                                value={section.customBadge || ""}
                                placeholder="e.g. ✨ Premium, Featured Campaign"
                                onChange={(e) => updateSection(section.id, { customBadge: e.target.value })}
                                className="h-8 text-xs font-medium"
                              />
                              <div className="flex flex-wrap gap-1 pt-1">
                                {[
                                  "✨ Premium",
                                  "Featured Campaign",
                                  "⚡ UNDER CONSTRUCTION",
                                  "Hot Deal",
                                ].map((preset) => (
                                  <button
                                    key={preset}
                                    type="button"
                                    onClick={() => updateSection(section.id, { customBadge: preset })}
                                    className="px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-amber-500/20 hover:text-amber-600 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                                  >
                                    {preset}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-xs font-bold text-text-primary block">Editorial Headline</label>
                              <Input
                                value={section.customHeadline || ""}
                                placeholder="e.g. A Higher Standard of Living"
                                onChange={(e) => updateSection(section.id, { customHeadline: e.target.value })}
                                className="h-8 text-xs font-medium"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-xs font-bold text-text-primary block">Editorial Tagline</label>
                              <Input
                                value={section.customTagline || ""}
                                placeholder="e.g. Verified Luxury Residence"
                                onChange={(e) => updateSection(section.id, { customTagline: e.target.value })}
                                className="h-8 text-xs font-medium"
                              />
                            </div>
                          </div>

                          {/* 3. Carousel Settings */}
                          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-border-default space-y-3 shadow-xs">
                            <p className="text-[11px] font-black uppercase text-slate-500 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-amber-500" /> Carousel Settings
                            </p>

                            <div className="space-y-1.5">
                              <span className="text-xs font-bold text-text-primary block">Carousel Mode</span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => updateSection(section.id, { enableCarousel: true })}
                                  className={cn(
                                    "flex-1 py-1.5 px-2 rounded-lg text-xs font-extrabold border transition-all cursor-pointer",
                                    section.enableCarousel !== false
                                      ? "bg-emerald-500 text-white border-emerald-500 shadow-xs"
                                      : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-transparent"
                                  )}
                                >
                                  ✓ Carousel On
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateSection(section.id, { enableCarousel: false })}
                                  className={cn(
                                    "flex-1 py-1.5 px-2 rounded-lg text-xs font-extrabold border transition-all cursor-pointer",
                                    section.enableCarousel === false
                                      ? "bg-rose-500 text-white border-rose-500 shadow-xs"
                                      : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-transparent"
                                  )}
                                >
                                  ✕ Static Row
                                </button>
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-text-primary">Auto-Slide Time</span>
                                <span className="font-black text-amber-600 dark:text-amber-400">{section.carouselInterval || 4}s</span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {[2, 3, 4, 6, 8, 10].map((sec) => (
                                  <button
                                    key={sec}
                                    type="button"
                                    onClick={() => updateSection(section.id, { carouselInterval: sec })}
                                    className={cn(
                                      "px-2.5 py-1 text-xs font-extrabold rounded-lg border transition-all cursor-pointer",
                                      (section.carouselInterval || 4) === sec
                                        ? "bg-[#faad13] text-slate-950 border-[#faad13] shadow-xs"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400"
                                    )}
                                  >
                                    {sec}s
                                  </button>
                                ))}
                              </div>
                            </div>

                            <p className="text-[10px] text-text-tertiary pt-2 border-t border-border-default">
                              {section.enableCarousel !== false
                                ? `Cards auto-slide every ${section.carouselInterval || 4}s and loop infinitely.`
                                : "Carousel auto-slide is paused. Users can still scroll smoothly with arrows or touch."}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="mb-2 text-[11px] font-extrabold uppercase text-text-tertiary">Choose icon</p>
                      <div className="flex flex-wrap gap-1.5">
                        {HOME_SECTION_ICON_NAMES.map((name) => {
                          const ChoiceIcon = HOME_SECTION_ICONS[name];
                          return <button key={name} type="button" title={name} aria-label={`Use ${name} icon`} onClick={() => updateSection(section.id, { icon: name })} className={cn("flex h-8 w-8 items-center justify-center rounded-lg border transition-colors", section.icon === name ? "border-[#faad13] bg-[#faad13] text-slate-950" : "border-border-default text-text-secondary hover:border-[#faad13]")}><ChoiceIcon className="h-3.5 w-3.5" /></button>;
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1 self-end lg:self-start">
                  <button type="button" title={section.isActive ? "Hide shelf" : "Show shelf"} onClick={() => updateSection(section.id, { isActive: !section.isActive })} className="flex h-9 w-9 items-center justify-center rounded-md border border-border-default text-text-secondary hover:text-text-primary">{section.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button>
                  <button type="button" title="Move up" disabled={index === 0} onClick={() => moveSection(index, -1)} className="flex h-9 w-9 items-center justify-center rounded-md border border-border-default text-text-secondary disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                  <button type="button" title="Move down" disabled={index === sections.length - 1} onClick={() => moveSection(index, 1)} className="flex h-9 w-9 items-center justify-center rounded-md border border-border-default text-text-secondary disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                  <button type="button" title="Delete shelf" onClick={() => setSections((current) => current.filter((entry) => entry.id !== section.id))} className="flex h-9 w-9 items-center justify-center rounded-md border border-red-200 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>

              <div className="mt-5 border-t border-border-default pt-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-extrabold text-text-primary">Selected listings <span className="text-text-tertiary">{section.items.length}/{MAX_HOME_SECTION_ITEMS}</span></p>
                  <Button size="sm" variant="outline" onClick={() => { setPickerSectionId(section.id); setQuery(""); setTypeFilter("all"); }}><Plus className="h-4 w-4" /> Add or remove</Button>
                </div>
                {section.items.length === 0 ? (
                  <button type="button" onClick={() => setPickerSectionId(section.id)} className="w-full rounded-lg border border-dashed border-slate-300 py-8 text-sm font-bold text-text-tertiary hover:border-[#faad13] hover:text-text-primary">Choose properties or projects</button>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      {section.items.map((item) => {
                        const listing = candidateMap.get(`${item.type}:${item.id}`);
                        const currentProgress = item.progressPercentage ?? 70;
                        return (
                          <div key={`${item.type}:${item.id}`} className="flex flex-col min-w-0 rounded-xl border border-border-default p-3 bg-white dark:bg-slate-900 shadow-xs space-y-2.5">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-md bg-slate-100">
                                {listing?.image && <Image src={listing.image} alt="" fill unoptimized className="object-cover" sizes="64px" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-extrabold text-text-primary">{listing?.title || "Unavailable listing"}</p>
                                <div className="mt-0.5 flex items-center gap-1.5">
                                  <span className={cn("px-1.5 py-0.2 rounded text-[9px] font-black uppercase", item.type === "project" ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300")}>
                                    {item.type}
                                  </span>
                                  <span className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200">{listing?.price}</span>
                                </div>
                              </div>
                              <button type="button" aria-label={`Remove ${listing?.title || "listing"}`} onClick={() => toggleItem(section.id, item)} className="text-text-tertiary hover:text-red-600">
                                <X className="h-4 w-4" />
                              </button>
                            </div>

                            {/* Construction Progress Slider (Admin can set per Project / Listing) */}
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                  <Zap className="w-3 h-3 text-amber-500" /> Progress Tracker:
                                </span>
                                <span className="font-black text-emerald-600 dark:text-emerald-400">
                                  {currentProgress}%
                                </span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={currentProgress}
                                onChange={(e) => updateSectionItem(section.id, item.id, item.type, { progressPercentage: Number(e.target.value) })}
                                className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                              />
                              <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-emerald-400 transition-all"
                                  style={{ width: `${currentProgress}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* LIVE SHELF PREVIEW */}
                    <div className="pt-3 border-t border-dashed border-border-default">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-[#faad13]" /> Live Shelf Preview ({cardStyleMeta.label})
                        </span>
                        <span className="text-[10px] text-slate-400">Live preview with selected colors, badges & progress</span>
                      </div>
                      <div className="w-full overflow-x-auto pb-3 pt-1 flex gap-4 no-scrollbar">
                        {section.items.map((item, idx) => {
                          const prop = properties.find((p) => p.id === item.id);
                          const proj = projects.find((p) => p.id === item.id);
                          if (!prop && !proj) return null;
                          const mixedItem: MixedItem = prop
                            ? { ...prop, itemType: "property", progressPercentage: item.progressPercentage, customBadge: item.customBadge }
                            : { ...proj!, itemType: "project", progressPercentage: item.progressPercentage, customBadge: item.customBadge };

                          return (
                            <div key={`${item.type}:${item.id}-preview`} className="shrink-0 w-[280px] sm:w-[320px] pointer-events-none">
                              <ShelfCard
                                item={mixedItem}
                                cardStyle={currentStyleId}
                                cardBgColor={section.cardBgColor}
                                cardTextColor={section.cardTextColor}
                                cardAccentColor={section.cardAccentColor}
                                customBadge={section.customBadge}
                                customHeadline={section.customHeadline}
                                customTagline={section.customTagline}
                                progressPercentage={item.progressPercentage}
                                index={idx}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {pickerSection && (
        <div className="fixed inset-0 z-[300] flex items-end justify-center bg-slate-950/65 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={`Select listings for ${pickerSection.title}`}>
          <div className="flex max-h-[88vh] w-full max-w-4xl flex-col rounded-t-lg bg-white shadow-2xl sm:rounded-lg">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 sm:px-6">
              <div><h2 className="font-black text-slate-950">Choose listings</h2><p className="text-xs text-slate-500">{pickerSection.items.length} of {MAX_HOME_SECTION_ITEMS} selected for {pickerSection.title}</p></div>
              <button type="button" aria-label="Close listing picker" onClick={() => setPickerSectionId(null)} className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:px-6">
              <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title or location" className="pl-9" /></div>
              <div className="flex rounded-md bg-slate-100 p-1">{(["all", "property", "project"] as const).map((value) => <button key={value} type="button" onClick={() => setTypeFilter(value)} className={cn("flex-1 rounded px-3 py-2 text-xs font-bold capitalize sm:flex-none", typeFilter === value ? "bg-white text-slate-950 shadow-sm" : "text-slate-500")}>{value === "all" ? "All" : `${value}s`}</button>)}</div>
            </div>
            <div className="grid flex-1 grid-cols-1 gap-2 overflow-y-auto p-4 sm:grid-cols-2 sm:p-6">
              {filteredCandidates.map((candidate) => {
                const selected = pickerSection.items.some((item) => item.id === candidate.id && item.type === candidate.type);
                return <button key={`${candidate.type}:${candidate.id}`} type="button" onClick={() => toggleItem(pickerSection.id, { id: candidate.id, type: candidate.type })} className={cn("flex min-w-0 items-center gap-3 rounded-lg border p-2.5 text-left transition-colors", selected ? "border-[#faad13] bg-[#faad13]/10" : "border-slate-200 hover:border-slate-400")}>
                  <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-md bg-slate-100">{candidate.image && <Image src={candidate.image} alt="" fill unoptimized className="object-cover" sizes="80px" />}</div>
                  <div className="min-w-0 flex-1"><div className="mb-1 flex items-center gap-2"><span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-slate-600">{candidate.type}</span><span className="text-xs font-black text-slate-950">{candidate.price}</span></div><p className="truncate text-sm font-extrabold text-slate-950">{candidate.title}</p><p className="truncate text-xs text-slate-500">{candidate.location}</p></div>
                  <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full border", selected ? "border-[#faad13] bg-[#faad13] text-slate-950" : "border-slate-300 text-transparent")}><Check className="h-3.5 w-3.5" /></span>
                </button>;
              })}
            </div>
            <div className="border-t border-slate-200 p-4 sm:px-6"><Button className="w-full bg-slate-950 font-extrabold text-white hover:bg-slate-800" onClick={() => setPickerSectionId(null)}>Done selecting</Button></div>
          </div>
        </div>
      )}

      {stylePickerSectionId && (
        <CardStyleGalleryModal
          isOpen={Boolean(stylePickerSectionId)}
          shelfTitle={sections.find((s) => s.id === stylePickerSectionId)?.title || "Shelf"}
          currentStyle={sections.find((s) => s.id === stylePickerSectionId)?.cardStyle || DEFAULT_CARD_STYLE}
          onClose={() => setStylePickerSectionId(null)}
          onSelectStyle={(styleId) => {
            if (stylePickerSectionId) {
              updateSection(stylePickerSectionId, { cardStyle: styleId });
              const label = HOME_CARD_STYLES.find((s) => s.id === styleId)?.label;
              toast.success(`Card style set to "${label}"`);
            }
          }}
        />
      )}
    </div>
  );
}

