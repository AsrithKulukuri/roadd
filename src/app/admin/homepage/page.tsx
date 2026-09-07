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
  type HomeSectionIconName,
} from "@/types/home-section";
import { CardStyleGalleryModal } from "@/components/home/shelves/card-style-preview";
import { ShelfCard } from "@/components/home/shelves/shelf-card";
import { IconPicker } from "@/components/admin/icon-picker";
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
    {
      id: "recommended",
      title: "Recommended",
      icon: "ThumbsUp",
      isActive: true,
      cardStyle: "compact-marketplace",
      cardBgColor: "#ffffff",
      cardTextColor: "#0f172a",
      cardAccentColor: "#faad13",
      enableCarousel: true,
      carouselInterval: 4,
      items: makeItems("recommended"),
    },
    {
      id: "featured",
      title: "Featured",
      icon: "Star",
      isActive: true,
      cardStyle: "tall-portrait",
      cardBgColor: "#ffffff",
      cardTextColor: "#0f172a",
      cardAccentColor: "#faad13",
      enableCarousel: true,
      carouselInterval: 4,
      items: makeItems("featured"),
    },
    {
      id: "budget-friendly",
      title: "Budget Friendly",
      icon: "IndianRupee",
      isActive: true,
      cardStyle: "bottom-floating",
      cardBgColor: "#ffffff",
      cardTextColor: "#0f172a",
      cardAccentColor: "#faad13",
      enableCarousel: true,
      carouselInterval: 4,
      items: makeItems("budget_friendly"),
    },
  ];
}

function getPreviewShelfCardWidthClass(cardStyle?: HomeCardStyleId) {
  switch (cardStyle) {
    case "classic-default":
      return "w-[260px] sm:w-[300px]";
    case "luxury-banner":
      return "w-[720px] sm:w-[820px]";
    case "split-feature":
      return "w-[620px] sm:w-[720px]";
    case "dark-editorial":
      return "w-[520px] sm:w-[600px]";
    case "bottom-floating":
      return "w-[360px] sm:w-[440px]";
    case "modern-villa":
      return "w-[340px] sm:w-[420px]";
    case "compact-marketplace":
      return "w-[320px] sm:w-[380px]";
    case "tall-portrait":
      return "w-[260px] sm:w-[300px]";
    case "construction-progress":
      return "w-[280px] sm:w-[320px]";
    default:
      return "w-[260px] sm:w-[300px]";
  }
}

function getPreviewCardWidthClass(cardStyle?: HomeCardStyleId) {
  switch (cardStyle) {
    case "classic-default":
      return "w-[280px] sm:w-[320px] max-w-full";
    case "luxury-banner":
      return "w-[760px] sm:w-[820px] max-w-full";
    case "split-feature":
      return "w-[680px] sm:w-[740px] max-w-full";
    case "dark-editorial":
      return "w-[560px] sm:w-[620px] max-w-full";
    case "bottom-floating":
      return "w-[420px] sm:w-[460px] max-w-full";
    case "modern-villa":
      return "w-[400px] sm:w-[440px] max-w-full";
    case "compact-marketplace":
      return "w-[360px] sm:w-[400px] max-w-full";
    case "tall-portrait":
      return "w-[300px] sm:w-[330px] max-w-full";
    case "construction-progress":
      return "w-[300px] sm:w-[340px] max-w-full";
    default:
      return "w-[320px] max-w-full";
  }
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
  const [editingCardTarget, setEditingCardTarget] = useState<{
    sectionId: string;
    itemId: string;
    itemType: "property" | "project";
  } | null>(null);
  const [activeCardEditField, setActiveCardEditField] = useState<
    "badge" | "headline" | "tagline" | "price" | "location" | "bhk" | "area" | "developer" | "status" | "cta" | "bgColor" | "textColor" | "accentColor" | null
  >("headline");
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

  const [isAddShelfOpen, setIsAddShelfOpen] = useState(false);
  const [newShelfTitle, setNewShelfTitle] = useState("");
  const [newShelfIcon, setNewShelfIcon] = useState<HomeSectionIconName>("Sparkles");
  const [newShelfCardStyle, setNewShelfCardStyle] = useState<HomeCardStyleId>(DEFAULT_CARD_STYLE);

  const handleOpenAddShelf = () => {
    if (sections.length >= MAX_HOME_SECTIONS) {
      return toast.error(`You can add up to ${MAX_HOME_SECTIONS} homepage shelves.`);
    }
    setNewShelfTitle("");
    setNewShelfIcon("Sparkles");
    setNewShelfCardStyle(DEFAULT_CARD_STYLE);
    setIsAddShelfOpen(true);
  };

  const handleConfirmAddShelf = () => {
    const title = newShelfTitle.trim();
    if (!title) {
      return toast.error("Please enter a title for the shelf.");
    }
    if (sections.length >= MAX_HOME_SECTIONS) {
      return toast.error(`You can add up to ${MAX_HOME_SECTIONS} homepage shelves.`);
    }
    const id = `section-${Date.now()}`;
    setSections((current) => [
      ...current,
      {
        id,
        title,
        icon: newShelfIcon,
        isActive: true,
        cardStyle: newShelfCardStyle,
        cardBgColor: "#ffffff",
        cardTextColor: "#0f172a",
        cardAccentColor: "#faad13",
        enableCarousel: true,
        carouselInterval: 4,
        items: [],
      },
    ]);
    setIsAddShelfOpen(false);
    toast.success(`Added shelf "${title}" with ${newShelfIcon} icon.`);
  };

  const addSection = () => {
    handleOpenAddShelf();
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
          <Button variant="outline" onClick={handleOpenAddShelf} disabled={sections.length >= MAX_HOME_SECTIONS}><Plus className="h-4 w-4" /> Add shelf</Button>
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

                            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                              <div className="space-y-1">
                                <label className="text-xs font-bold text-text-primary block">Default Price</label>
                                <Input
                                  value={section.customPrice || ""}
                                  placeholder="e.g. ₹1.4 Cr"
                                  onChange={(e) => updateSection(section.id, { customPrice: e.target.value })}
                                  className="h-8 text-xs font-medium"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs font-bold text-text-primary block">Default Location</label>
                                <Input
                                  value={section.customLocation || ""}
                                  placeholder="e.g. Vijayawada"
                                  onChange={(e) => updateSection(section.id, { customLocation: e.target.value })}
                                  className="h-8 text-xs font-medium"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <label className="text-xs font-bold text-text-primary block">Default BHK</label>
                                <Input
                                  value={section.customBhk || ""}
                                  placeholder="e.g. 3 BHK"
                                  onChange={(e) => updateSection(section.id, { customBhk: e.target.value })}
                                  className="h-8 text-xs font-medium"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs font-bold text-text-primary block">Default CTA Button</label>
                                <Input
                                  value={section.customCtaText || ""}
                                  placeholder="e.g. Explore"
                                  onChange={(e) => updateSection(section.id, { customCtaText: e.target.value })}
                                  className="h-8 text-xs font-medium"
                                />
                              </div>
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

                    <div className="pt-2">
                      <IconPicker
                        value={section.icon}
                        onChange={(name) => updateSection(section.id, { icon: name as HomeSectionIconName })}
                        label="Shelf Icon (Header Badge)"
                        compact
                      />
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
                        const hasCustomStyling = Boolean(
                          item.cardBgColor ||
                          item.cardTextColor ||
                          item.cardAccentColor ||
                          item.customBadge ||
                          item.customHeadline ||
                          item.customTagline
                        );

                        return (
                          <div
                            key={`${item.type}:${item.id}`}
                            className="flex flex-col min-w-0 rounded-xl border border-border-default hover:border-amber-400/80 p-3 bg-white dark:bg-slate-900 shadow-xs space-y-2.5 transition-all"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <div
                                onClick={() => setEditingCardTarget({ sectionId: section.id, itemId: item.id, itemType: item.type })}
                                className="relative h-12 w-16 shrink-0 overflow-hidden rounded-md bg-slate-100 cursor-pointer hover:opacity-90"
                                title="Click to customize text & colors"
                              >
                                {listing?.image && <Image src={listing.image} alt="" fill unoptimized className="object-cover" sizes="64px" />}
                              </div>
                              <div
                                onClick={() => setEditingCardTarget({ sectionId: section.id, itemId: item.id, itemType: item.type })}
                                className="min-w-0 flex-1 cursor-pointer group"
                                title="Click to customize text & colors"
                              >
                                <p className="truncate text-xs font-extrabold text-text-primary group-hover:text-amber-500 transition-colors">
                                  {listing?.title || "Unavailable listing"}
                                </p>
                                <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                                  <span className={cn("px-1.5 py-0.2 rounded text-[9px] font-black uppercase", item.type === "project" ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300")}>
                                    {item.type}
                                  </span>
                                  <span className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200">{listing?.price}</span>
                                  {hasCustomStyling && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                                      Customized
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button type="button" aria-label={`Remove ${listing?.title || "listing"}`} onClick={() => toggleItem(section.id, item)} className="text-text-tertiary hover:text-red-600 cursor-pointer">
                                <X className="h-4 w-4" />
                              </button>
                            </div>

                            {/* Customize Card Button */}
                            <button
                              type="button"
                              onClick={() => setEditingCardTarget({ sectionId: section.id, itemId: item.id, itemType: item.type })}
                              className="w-full py-1.5 px-2.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-black flex items-center justify-center gap-1.5 transition-colors border border-amber-500/30 cursor-pointer"
                            >
                              <Palette className="w-3.5 h-3.5" />
                              <span>Customize Card (Text & Colors)</span>
                            </button>

                            {/* Construction Progress Slider - ONLY SHOW WHEN CONSTRUCTION PROGRESS SHELF IS SELECTED! */}
                            {section.cardStyle === "construction-progress" && (
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
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* LIVE SHELF PREVIEW (Cards are clickable to customize text & colors) */}
                    <div className="pt-3 border-t border-dashed border-border-default">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-[#faad13]" /> Live Shelf Preview ({cardStyleMeta.label})
                        </span>
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                          💡 Click any card below to edit its text &amp; colors
                        </span>
                      </div>
                      <div className="w-full overflow-x-auto pb-3 pt-1 flex gap-4 no-scrollbar">
                        {section.items.map((item, idx) => {
                          const prop = properties.find((p) => p.id === item.id);
                          const proj = projects.find((p) => p.id === item.id);
                          if (!prop && !proj) return null;
                          const mixedItem: MixedItem = prop
                            ? {
                                ...prop,
                                itemType: "property",
                                progressPercentage: item.progressPercentage,
                                customBadge: item.customBadge,
                                customHeadline: item.customHeadline,
                                customTagline: item.customTagline,
                                customPrice: item.customPrice,
                                customLocation: item.customLocation,
                                customBhk: item.customBhk,
                                customArea: item.customArea,
                                customDeveloper: item.customDeveloper,
                                customStatus: item.customStatus,
                                customCtaText: item.customCtaText,
                                cardBgColor: item.cardBgColor,
                                cardTextColor: item.cardTextColor,
                                cardAccentColor: item.cardAccentColor,
                              }
                            : {
                                ...proj!,
                                itemType: "project",
                                progressPercentage: item.progressPercentage,
                                customBadge: item.customBadge,
                                customHeadline: item.customHeadline,
                                customTagline: item.customTagline,
                                customPrice: item.customPrice,
                                customLocation: item.customLocation,
                                customBhk: item.customBhk,
                                customArea: item.customArea,
                                customDeveloper: item.customDeveloper,
                                customStatus: item.customStatus,
                                customCtaText: item.customCtaText,
                                cardBgColor: item.cardBgColor,
                                cardTextColor: item.cardTextColor,
                                cardAccentColor: item.cardAccentColor,
                              };

                          return (
                            <div
                              key={`${item.type}:${item.id}-preview`}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setEditingCardTarget({ sectionId: section.id, itemId: item.id, itemType: item.type });
                              }}
                              className={cn(
                                "relative shrink-0 cursor-pointer group/previewCard rounded-3xl transition-all hover:scale-[1.01] hover:ring-2 hover:ring-amber-500 shadow-sm select-none",
                                getPreviewShelfCardWidthClass(currentStyleId)
                              )}
                              title="Click this card to edit text and colors"
                            >
                              <div className="absolute top-3 right-3 z-30 px-2.5 py-1 rounded-full bg-slate-950/85 backdrop-blur-md text-[11px] font-black text-white flex items-center gap-1.5 opacity-0 group-hover/previewCard:opacity-100 transition-opacity shadow-lg pointer-events-none">
                                <Palette className="w-3.5 h-3.5 text-amber-400" /> Click to edit card
                              </div>
                              <div className="pointer-events-none w-full h-full">
                                <ShelfCard
                                  item={mixedItem}
                                  cardStyle={currentStyleId}
                                  cardBgColor={item.cardBgColor || section.cardBgColor}
                                  cardTextColor={item.cardTextColor || section.cardTextColor}
                                  cardAccentColor={item.cardAccentColor || section.cardAccentColor}
                                  customBadge={item.customBadge || section.customBadge}
                                  customHeadline={item.customHeadline || section.customHeadline}
                                  customTagline={item.customTagline || section.customTagline}
                                  customPrice={item.customPrice || section.customPrice}
                                  customLocation={item.customLocation || section.customLocation}
                                  customBhk={item.customBhk || section.customBhk}
                                  customArea={item.customArea || section.customArea}
                                  customDeveloper={item.customDeveloper || section.customDeveloper}
                                  customStatus={item.customStatus || section.customStatus}
                                  customCtaText={item.customCtaText || section.customCtaText}
                                  progressPercentage={item.progressPercentage}
                                  index={idx}
                                  isEditable={true}
                                />
                              </div>
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

      {/* INDIVIDUAL CARD CUSTOMIZATION MODAL */}
      {editingCardTarget && (() => {
        const targetSection = sections.find((s) => s.id === editingCardTarget.sectionId);
        const targetItem = targetSection?.items.find((i) => i.id === editingCardTarget.itemId && i.type === editingCardTarget.itemType);
        const targetListing = candidateMap.get(`${editingCardTarget.itemType}:${editingCardTarget.itemId}`);
        const targetProp = editingCardTarget.itemType === "property" ? properties.find((p) => p.id === editingCardTarget.itemId) : undefined;
        const targetProj = editingCardTarget.itemType === "project" ? projects.find((p) => p.id === editingCardTarget.itemId) : undefined;

        if (!targetSection || !targetItem) return null;

        const currentStyle = targetSection.cardStyle || DEFAULT_CARD_STYLE;
        const currentProgress = targetItem.progressPercentage ?? 70;
        const targetCardStyleMeta = HOME_CARD_STYLES.find((s) => s.id === currentStyle) || HOME_CARD_STYLES[0];

        const liveMixedItem: MixedItem | null = targetProp
          ? {
              ...targetProp,
              itemType: "property",
              progressPercentage: targetItem.progressPercentage,
              customBadge: targetItem.customBadge,
              customHeadline: targetItem.customHeadline,
              customTagline: targetItem.customTagline,
              customPrice: targetItem.customPrice,
              customLocation: targetItem.customLocation,
              customBhk: targetItem.customBhk,
              customArea: targetItem.customArea,
              customDeveloper: targetItem.customDeveloper,
              customStatus: targetItem.customStatus,
              customCtaText: targetItem.customCtaText,
              cardBgColor: targetItem.cardBgColor,
              cardTextColor: targetItem.cardTextColor,
              cardAccentColor: targetItem.cardAccentColor,
            }
          : targetProj
          ? {
              ...targetProj,
              itemType: "project",
              progressPercentage: targetItem.progressPercentage,
              customBadge: targetItem.customBadge,
              customHeadline: targetItem.customHeadline,
              customTagline: targetItem.customTagline,
              customPrice: targetItem.customPrice,
              customLocation: targetItem.customLocation,
              customBhk: targetItem.customBhk,
              customArea: targetItem.customArea,
              customDeveloper: targetItem.customDeveloper,
              customStatus: targetItem.customStatus,
              customCtaText: targetItem.customCtaText,
              cardBgColor: targetItem.cardBgColor,
              cardTextColor: targetItem.cardTextColor,
              cardAccentColor: targetItem.cardAccentColor,
            }
          : null;

        return (
          <div
            className="fixed inset-0 z-[320] flex items-center justify-center bg-slate-950/75 p-3 sm:p-6 backdrop-blur-md overflow-y-auto"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex max-h-[94vh] w-full max-w-6xl xl:max-w-7xl flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-border-default px-5 py-4 bg-slate-50 dark:bg-slate-950/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
                    <Palette className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-slate-950 dark:text-white line-clamp-1">
                      Customize Card: {targetListing?.title || "Listing"}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Shelf: &ldquo;{targetSection.title}&rdquo; &bull; Customize text, badge &amp; colors for this card only
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingCardTarget(null)}
                  className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body: Controls & Live Card Preview */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-5 overflow-y-auto max-h-[calc(94vh-130px)]">
                {/* Left Controls (5 cols) */}
                <div className="lg:col-span-5 space-y-5">
                  {/* Section 1: Colors */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-4">
                    <p className="text-xs font-black uppercase text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5" /> Card Colors (Individual Override)
                    </p>

                    {/* Card Background Color */}
                    <div
                      className={cn(
                        "space-y-1.5 p-2.5 rounded-xl border transition-all",
                        activeCardEditField === "bgColor"
                          ? "border-amber-500 bg-amber-50/40 dark:bg-amber-950/20 ring-1 ring-amber-500/40"
                          : "border-transparent"
                      )}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-slate-900 dark:text-white">Card Background</span>
                        <span className="font-mono text-[11px] text-slate-500">
                          {targetItem.cardBgColor || `Shelf: ${targetSection.cardBgColor || "#ffffff"}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          type="color"
                          value={targetItem.cardBgColor || targetSection.cardBgColor || "#ffffff"}
                          onChange={(e) =>
                            updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                              cardBgColor: e.target.value,
                            })
                          }
                          className="h-8 w-8 rounded-lg cursor-pointer border border-slate-300 dark:border-slate-700 p-0.5 bg-transparent"
                        />
                        {[
                          { label: "White", color: "#ffffff", textColor: "#0f172a" },
                          { label: "Dark Luxury", color: "#090d16", textColor: "#ffffff" },
                          { label: "Midnight", color: "#0f172a", textColor: "#ffffff" },
                          { label: "Deep Indigo", color: "#1e1b4b", textColor: "#ffffff" },
                        ].map((c) => (
                          <button
                            key={c.color}
                            type="button"
                            onClick={() =>
                              updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                                cardBgColor: c.color,
                              })
                            }
                            className="px-2.5 py-1 text-xs font-bold rounded-lg border shadow-xs transition-all cursor-pointer"
                            style={{
                              backgroundColor: c.color,
                              color: c.textColor,
                              borderColor: (targetItem.cardBgColor || "").toLowerCase() === c.color.toLowerCase() ? "#faad13" : "#cbd5e1",
                            }}
                          >
                            {c.label}
                          </button>
                        ))}
                        {targetItem.cardBgColor && (
                          <button
                            type="button"
                            onClick={() =>
                              updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                                cardBgColor: undefined,
                              })
                            }
                            className="px-2 py-1 text-[11px] font-bold text-slate-500 hover:text-red-500 underline cursor-pointer"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Text Color */}
                    <div
                      className={cn(
                        "space-y-1.5 p-2.5 rounded-xl border transition-all",
                        activeCardEditField === "textColor"
                          ? "border-amber-500 bg-amber-50/40 dark:bg-amber-950/20 ring-1 ring-amber-500/40"
                          : "border-transparent"
                      )}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-slate-900 dark:text-white">Text Color</span>
                        <span className="font-mono text-[11px] text-slate-500">
                          {targetItem.cardTextColor || `Shelf: ${targetSection.cardTextColor || "#0f172a"}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          type="color"
                          value={targetItem.cardTextColor || targetSection.cardTextColor || "#0f172a"}
                          onChange={(e) =>
                            updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                              cardTextColor: e.target.value,
                            })
                          }
                          className="h-8 w-8 rounded-lg cursor-pointer border border-slate-300 dark:border-slate-700 p-0.5 bg-transparent"
                        />
                        {[
                          { label: "Black", color: "#0f172a" },
                          { label: "White", color: "#ffffff" },
                          { label: "Slate", color: "#334155" },
                        ].map((c) => (
                          <button
                            key={c.color}
                            type="button"
                            onClick={() =>
                              updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                                cardTextColor: c.color,
                              })
                            }
                            className="px-2.5 py-1 text-xs font-bold rounded-lg border shadow-xs transition-all cursor-pointer"
                            style={{
                              backgroundColor: c.color,
                              color: c.color === "#ffffff" ? "#0f172a" : "#ffffff",
                              borderColor: (targetItem.cardTextColor || "").toLowerCase() === c.color.toLowerCase() ? "#faad13" : "#cbd5e1",
                            }}
                          >
                            {c.label}
                          </button>
                        ))}
                        {targetItem.cardTextColor && (
                          <button
                            type="button"
                            onClick={() =>
                              updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                                cardTextColor: undefined,
                              })
                            }
                            className="px-2 py-1 text-[11px] font-bold text-slate-500 hover:text-red-500 underline cursor-pointer"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Logo & Accent Color */}
                    <div
                      className={cn(
                        "space-y-1.5 p-2.5 rounded-xl border transition-all",
                        activeCardEditField === "accentColor"
                          ? "border-amber-500 bg-amber-50/40 dark:bg-amber-950/20 ring-1 ring-amber-500/40"
                          : "border-transparent"
                      )}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-slate-900 dark:text-white">Logo & Accent Icons</span>
                        <span className="font-mono text-[11px] text-slate-500">
                          {targetItem.cardAccentColor || `Shelf: ${targetSection.cardAccentColor || "#faad13"}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          type="color"
                          value={targetItem.cardAccentColor || targetSection.cardAccentColor || "#faad13"}
                          onChange={(e) =>
                            updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                              cardAccentColor: e.target.value,
                            })
                          }
                          className="h-8 w-8 rounded-lg cursor-pointer border border-slate-300 dark:border-slate-700 p-0.5 bg-transparent"
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
                            onClick={() =>
                              updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                                cardAccentColor: c.color,
                              })
                            }
                            className="px-2.5 py-1 text-xs font-bold rounded-lg border text-white shadow-xs transition-all cursor-pointer"
                            style={{
                              backgroundColor: c.color,
                              borderColor: (targetItem.cardAccentColor || "").toLowerCase() === c.color.toLowerCase() ? "#000" : "transparent",
                            }}
                          >
                            {c.label}
                          </button>
                        ))}
                        {targetItem.cardAccentColor && (
                          <button
                            type="button"
                            onClick={() =>
                              updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                                cardAccentColor: undefined,
                              })
                            }
                            className="px-2 py-1 text-[11px] font-bold text-slate-500 hover:text-red-500 underline cursor-pointer"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Text & Labels */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-3.5">
                    <p className="text-xs font-black uppercase text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Card Text & Badges
                    </p>

                    {/* Badge Pill */}
                    <div
                      className={cn(
                        "space-y-1.5 p-3 rounded-xl border transition-all",
                        activeCardEditField === "badge"
                          ? "border-amber-500 bg-amber-50/40 dark:bg-amber-950/30 ring-1 ring-amber-500/40"
                          : "border-slate-200/60 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60"
                      )}
                    >
                      <label className="text-xs font-extrabold text-slate-900 dark:text-white block">Badge Pill Text</label>
                      <Input
                        value={targetItem.customBadge ?? targetSection.customBadge ?? ""}
                        placeholder="e.g. Hot Deal, ✨ Premium, New Launch"
                        onChange={(e) =>
                          updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                            customBadge: e.target.value,
                          })
                        }
                        className="h-10 text-xs font-bold bg-white dark:bg-slate-950 text-slate-950 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 border-slate-300 dark:border-slate-700 focus:border-amber-500"
                      />
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {[
                          "Hot Deal",
                          "✨ Premium",
                          "⚡ UNDER CONSTRUCTION",
                          "Featured Campaign",
                          "New Launch",
                        ].map((preset) => {
                          const isSelected = (targetItem.customBadge || targetSection.customBadge) === preset;
                          return (
                            <button
                              key={preset}
                              type="button"
                              onClick={() =>
                                updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                                  customBadge: preset,
                                })
                              }
                              className={cn(
                                "px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer shadow-xs",
                                isSelected
                                  ? "bg-amber-500 text-slate-950 border-amber-500 font-black shadow-sm ring-2 ring-amber-400/40"
                                  : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-300 dark:border-slate-700 hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400"
                              )}
                            >
                              {preset}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Title / Headline Override */}
                    <div
                      className={cn(
                        "space-y-1.5 p-3 rounded-xl border transition-all",
                        activeCardEditField === "headline"
                          ? "border-amber-500 bg-amber-50/40 dark:bg-amber-950/30 ring-1 ring-amber-500/40"
                          : "border-slate-200/60 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60"
                      )}
                    >
                      <label className="text-xs font-extrabold text-slate-900 dark:text-white block">Card Headline / Title Override</label>
                      <Input
                        value={targetItem.customHeadline ?? ""}
                        placeholder={targetListing?.title || "Custom card title or headline..."}
                        onChange={(e) =>
                          updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                            customHeadline: e.target.value,
                          })
                        }
                        className="h-10 text-xs font-bold bg-white dark:bg-slate-950 text-slate-950 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 border-slate-300 dark:border-slate-700 focus:border-amber-500"
                      />
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Leave blank to use default listing title: &ldquo;{targetListing?.title}&rdquo;</p>
                    </div>

                    {/* Price Override */}
                    <div
                      className={cn(
                        "space-y-1.5 p-3 rounded-xl border transition-all",
                        activeCardEditField === "price"
                          ? "border-amber-500 bg-amber-50/40 dark:bg-amber-950/30 ring-1 ring-amber-500/40"
                          : "border-slate-200/60 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60"
                      )}
                    >
                      <label className="text-xs font-extrabold text-slate-900 dark:text-white block">Price Override</label>
                      <Input
                        value={targetItem.customPrice ?? targetSection.customPrice ?? ""}
                        placeholder="e.g. ₹1.4 Cr, ₹45 Lakhs, Price on Request"
                        onChange={(e) =>
                          updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                            customPrice: e.target.value,
                          })
                        }
                        className="h-10 text-xs font-bold bg-white dark:bg-slate-950 text-slate-950 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 border-slate-300 dark:border-slate-700 focus:border-amber-500"
                      />
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {["₹45 Lakhs", "₹85 Lakhs", "₹1.4 Cr", "₹2.2 Cr", "Price on Request"].map((preset) => {
                          const isSelected = (targetItem.customPrice || targetSection.customPrice) === preset;
                          return (
                            <button
                              key={preset}
                              type="button"
                              onClick={() =>
                                updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                                  customPrice: preset,
                                })
                              }
                              className={cn(
                                "px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer shadow-xs",
                                isSelected
                                  ? "bg-amber-500 text-slate-950 border-amber-500 font-black ring-2 ring-amber-400/40"
                                  : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-300 dark:border-slate-700 hover:border-amber-500"
                              )}
                            >
                              {preset}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Location Override */}
                    <div
                      className={cn(
                        "space-y-1.5 p-3 rounded-xl border transition-all",
                        activeCardEditField === "location"
                          ? "border-amber-500 bg-amber-50/40 dark:bg-amber-950/30 ring-1 ring-amber-500/40"
                          : "border-slate-200/60 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60"
                      )}
                    >
                      <label className="text-xs font-extrabold text-slate-900 dark:text-white block">Location Override</label>
                      <Input
                        value={targetItem.customLocation ?? targetSection.customLocation ?? ""}
                        placeholder="e.g. Poranki, Vijayawada"
                        onChange={(e) =>
                          updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                            customLocation: e.target.value,
                          })
                        }
                        className="h-10 text-xs font-bold bg-white dark:bg-slate-950 text-slate-950 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 border-slate-300 dark:border-slate-700 focus:border-amber-500"
                      />
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {["Poranki, Vijayawada", "Benz Circle", "Bhavanipuram", "Guntur", "Amaravati"].map((preset) => {
                          const isSelected = (targetItem.customLocation || targetSection.customLocation) === preset;
                          return (
                            <button
                              key={preset}
                              type="button"
                              onClick={() =>
                                updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                                  customLocation: preset,
                                })
                              }
                              className={cn(
                                "px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer shadow-xs",
                                isSelected
                                  ? "bg-amber-500 text-slate-950 border-amber-500 font-black ring-2 ring-amber-400/40"
                                  : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-300 dark:border-slate-700 hover:border-amber-500"
                              )}
                            >
                              {preset}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* BHK / Configuration Override */}
                    <div
                      className={cn(
                        "space-y-1.5 p-3 rounded-xl border transition-all",
                        activeCardEditField === "bhk"
                          ? "border-amber-500 bg-amber-50/40 dark:bg-amber-950/30 ring-1 ring-amber-500/40"
                          : "border-slate-200/60 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60"
                      )}
                    >
                      <label className="text-xs font-extrabold text-slate-900 dark:text-white block">BHK / Configuration</label>
                      <Input
                        value={targetItem.customBhk ?? targetSection.customBhk ?? ""}
                        placeholder="e.g. 2 BHK, 3 BHK, Luxury Villas, Plots"
                        onChange={(e) =>
                          updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                            customBhk: e.target.value,
                          })
                        }
                        className="h-10 text-xs font-bold bg-white dark:bg-slate-950 text-slate-950 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 border-slate-300 dark:border-slate-700 focus:border-amber-500"
                      />
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {["2 BHK", "3 BHK", "3 & 4 BHK", "Luxury Villas", "Plots"].map((preset) => {
                          const isSelected = (targetItem.customBhk || targetSection.customBhk) === preset;
                          return (
                            <button
                              key={preset}
                              type="button"
                              onClick={() =>
                                updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                                  customBhk: preset,
                                })
                              }
                              className={cn(
                                "px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer shadow-xs",
                                isSelected
                                  ? "bg-amber-500 text-slate-950 border-amber-500 font-black ring-2 ring-amber-400/40"
                                  : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-300 dark:border-slate-700 hover:border-amber-500"
                              )}
                            >
                              {preset}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Area / Size Override */}
                    <div
                      className={cn(
                        "space-y-1.5 p-3 rounded-xl border transition-all",
                        activeCardEditField === "area"
                          ? "border-amber-500 bg-amber-50/40 dark:bg-amber-950/30 ring-1 ring-amber-500/40"
                          : "border-slate-200/60 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60"
                      )}
                    >
                      <label className="text-xs font-extrabold text-slate-900 dark:text-white block">Area / Size</label>
                      <Input
                        value={targetItem.customArea ?? targetSection.customArea ?? ""}
                        placeholder="e.g. 1450 sq.ft., 2500 sq.ft., 200 sq.yds"
                        onChange={(e) =>
                          updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                            customArea: e.target.value,
                          })
                        }
                        className="h-10 text-xs font-bold bg-white dark:bg-slate-950 text-slate-950 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 border-slate-300 dark:border-slate-700 focus:border-amber-500"
                      />
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {["1200 sq.ft.", "1650 sq.ft.", "2200 sq.ft.", "200 sq.yds"].map((preset) => {
                          const isSelected = (targetItem.customArea || targetSection.customArea) === preset;
                          return (
                            <button
                              key={preset}
                              type="button"
                              onClick={() =>
                                updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                                  customArea: preset,
                                })
                              }
                              className={cn(
                                "px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer shadow-xs",
                                isSelected
                                  ? "bg-amber-500 text-slate-950 border-amber-500 font-black ring-2 ring-amber-400/40"
                                  : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-300 dark:border-slate-700 hover:border-amber-500"
                              )}
                            >
                              {preset}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Developer / Partner Override */}
                    <div
                      className={cn(
                        "space-y-1.5 p-3 rounded-xl border transition-all",
                        activeCardEditField === "developer"
                          ? "border-amber-500 bg-amber-50/40 dark:bg-amber-950/30 ring-1 ring-amber-500/40"
                          : "border-slate-200/60 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60"
                      )}
                    >
                      <label className="text-xs font-extrabold text-slate-900 dark:text-white block">Developer / Partner Text</label>
                      <Input
                        value={targetItem.customDeveloper ?? targetSection.customDeveloper ?? ""}
                        placeholder="e.g. Verified Partner, Vertex Homes, Owner Listed"
                        onChange={(e) =>
                          updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                            customDeveloper: e.target.value,
                          })
                        }
                        className="h-10 text-xs font-bold bg-white dark:bg-slate-950 text-slate-950 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 border-slate-300 dark:border-slate-700 focus:border-amber-500"
                      />
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {["Verified Partner", "Vertex Homes", "Owner Listed", "Premium Developer"].map((preset) => {
                          const isSelected = (targetItem.customDeveloper || targetSection.customDeveloper) === preset;
                          return (
                            <button
                              key={preset}
                              type="button"
                              onClick={() =>
                                updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                                  customDeveloper: preset,
                                })
                              }
                              className={cn(
                                "px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer shadow-xs",
                                isSelected
                                  ? "bg-amber-500 text-slate-950 border-amber-500 font-black ring-2 ring-amber-400/40"
                                  : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-300 dark:border-slate-700 hover:border-amber-500"
                              )}
                            >
                              {preset}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* CTA Button Text Override */}
                    <div
                      className={cn(
                        "space-y-1.5 p-3 rounded-xl border transition-all",
                        activeCardEditField === "cta"
                          ? "border-amber-500 bg-amber-50/40 dark:bg-amber-950/30 ring-1 ring-amber-500/40"
                          : "border-slate-200/60 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60"
                      )}
                    >
                      <label className="text-xs font-extrabold text-slate-900 dark:text-white block">CTA Button Text</label>
                      <Input
                        value={targetItem.customCtaText ?? targetSection.customCtaText ?? ""}
                        placeholder="e.g. Explore, View Details, Enquire Now"
                        onChange={(e) =>
                          updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                            customCtaText: e.target.value,
                          })
                        }
                        className="h-10 text-xs font-bold bg-white dark:bg-slate-950 text-slate-950 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 border-slate-300 dark:border-slate-700 focus:border-amber-500"
                      />
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {["Explore", "View Details", "Enquire Now", "Book Visit"].map((preset) => {
                          const isSelected = (targetItem.customCtaText || targetSection.customCtaText) === preset;
                          return (
                            <button
                              key={preset}
                              type="button"
                              onClick={() =>
                                updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                                  customCtaText: preset,
                                })
                              }
                              className={cn(
                                "px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer shadow-xs",
                                isSelected
                                  ? "bg-amber-500 text-slate-950 border-amber-500 font-black ring-2 ring-amber-400/40"
                                  : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-300 dark:border-slate-700 hover:border-amber-500"
                              )}
                            >
                              {preset}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Tagline Override */}
                    <div
                      className={cn(
                        "space-y-1.5 p-3 rounded-xl border transition-all",
                        activeCardEditField === "tagline"
                          ? "border-amber-500 bg-amber-50/40 dark:bg-amber-950/30 ring-1 ring-amber-500/40"
                          : "border-slate-200/60 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60"
                      )}
                    >
                      <label className="text-xs font-extrabold text-slate-900 dark:text-white block">Card Tagline Override</label>
                      <Input
                        value={targetItem.customTagline ?? ""}
                        placeholder="e.g. Verified Luxury Residence, Prime Lakeview Property"
                        onChange={(e) =>
                          updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                            customTagline: e.target.value,
                          })
                        }
                        className="h-10 text-xs font-bold bg-white dark:bg-slate-950 text-slate-950 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 border-slate-300 dark:border-slate-700 focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Section 3: Construction Progress Bar (ONLY SHOW WHEN PROGRESS SHELF IS SELECTED!) */}
                  {targetSection.cardStyle === "construction-progress" && (
                    <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-amber-500" /> Construction Progress Tracker
                        </span>
                        <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">
                          {currentProgress}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={currentProgress}
                        onChange={(e) =>
                          updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                            progressPercentage: Number(e.target.value),
                          })
                        }
                        className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      />
                      <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-emerald-400 transition-all"
                          style={{ width: `${currentProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Reset card to shelf defaults */}
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                          cardBgColor: undefined,
                          cardTextColor: undefined,
                          cardAccentColor: undefined,
                          customBadge: undefined,
                          customHeadline: undefined,
                          customTagline: undefined,
                          customPrice: undefined,
                          customLocation: undefined,
                          customBhk: undefined,
                          customArea: undefined,
                          customDeveloper: undefined,
                          customStatus: undefined,
                          customCtaText: undefined,
                        });
                        toast.success("Card reset to shelf default styling.");
                      }}
                      className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-red-500 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Card to Shelf Defaults</span>
                    </button>
                  </div>
                </div>

                {/* Right Preview Column (7 cols) */}
                <div className="lg:col-span-7 flex flex-col items-center justify-start p-4 sm:p-6 rounded-2xl border border-border-default bg-slate-100/70 dark:bg-slate-950/70 space-y-4 min-w-0">
                  <div className="w-full flex items-center justify-between flex-wrap gap-2 border-b border-slate-200/80 dark:border-slate-800/80 pb-3">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" /> Full Card Live Preview ({targetCardStyleMeta.label})
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-800">
                      {targetCardStyleMeta.minWidth}–{targetCardStyleMeta.maxWidth}px &bull; Exact Shelf Dimensions
                    </span>
                  </div>

                  {/* Interactive WYSIWYG Header & Quick Selector Pills */}
                  <div className="w-full space-y-2.5 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-amber-500/30 shadow-xs">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-black text-amber-600 dark:text-amber-400">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Interactive Card WYSIWYG:</span>
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        Click directly on any text, badge, or color on the card below to edit!
                      </span>
                    </div>

                    {/* Quick Target Switcher Tabs */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[
                        { id: "headline", label: "✏️ Title / Headline", active: activeCardEditField === "headline" },
                        { id: "price", label: "💰 Price", active: activeCardEditField === "price" },
                        { id: "location", label: "📍 Location", active: activeCardEditField === "location" },
                        { id: "badge", label: "🏷️ Badge Pill", active: activeCardEditField === "badge" },
                        { id: "bhk", label: "🛏️ BHK", active: activeCardEditField === "bhk" },
                        { id: "area", label: "📐 Area", active: activeCardEditField === "area" },
                        { id: "developer", label: "🏢 Developer", active: activeCardEditField === "developer" },
                        { id: "cta", label: "👉 Button / CTA", active: activeCardEditField === "cta" },
                        { id: "tagline", label: "💬 Tagline", active: activeCardEditField === "tagline" },
                        { id: "bgColor", label: "🎨 Card Bg", active: activeCardEditField === "bgColor" },
                        { id: "textColor", label: "🔤 Text Color", active: activeCardEditField === "textColor" },
                        { id: "accentColor", label: "✨ Accent / Button", active: activeCardEditField === "accentColor" },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveCardEditField(tab.id as any)}
                          className={cn(
                            "px-2.5 py-1 text-xs font-black rounded-lg border transition-all cursor-pointer flex items-center gap-1",
                            tab.active
                              ? "bg-amber-500 text-slate-950 border-amber-500 shadow-xs ring-2 ring-amber-400/40"
                              : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400"
                          )}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Active Field Live Inline Editor */}
                    {activeCardEditField === "headline" && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <label className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                            ✏️ Edit Headline Text:
                          </label>
                          <span className="text-[10px] text-slate-400">Updates live on card below</span>
                        </div>
                        <div className="flex gap-2 items-center">
                          <Input
                            value={targetItem.customHeadline ?? ""}
                            placeholder={targetListing?.title || "e.g. A Higher Standard of Living"}
                            onChange={(e) =>
                              updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                                customHeadline: e.target.value,
                              })
                            }
                            className="h-9 text-xs font-bold flex-1 bg-white dark:bg-slate-950 text-slate-950 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 border border-slate-300 dark:border-slate-700 focus:border-amber-500"
                          />
                          {targetItem.customHeadline && (
                            <button
                              type="button"
                              onClick={() =>
                                updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                                  customHeadline: undefined,
                                })
                              }
                              className="px-2 py-1 text-[11px] font-bold text-slate-500 hover:text-red-500 underline cursor-pointer shrink-0"
                            >
                              Reset
                            </button>
                          )}
                        </div>

                        {/* Quick Text Color in Headline Editor */}
                        <div className="flex items-center gap-2 pt-0.5 flex-wrap text-xs">
                          <span className="font-bold text-slate-600 dark:text-slate-300 text-[11px]">Choose Text Color:</span>
                          <input
                            type="color"
                            value={targetItem.cardTextColor || targetSection.cardTextColor || "#0f172a"}
                            onChange={(e) =>
                              updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                                cardTextColor: e.target.value,
                              })
                            }
                            className="h-6 w-6 rounded cursor-pointer border border-slate-300 dark:border-slate-700 p-0.5 bg-transparent"
                            title="Pick custom text color"
                          />
                          {[
                            { label: "Black", color: "#0f172a" },
                            { label: "White", color: "#ffffff" },
                            { label: "Slate", color: "#334155" },
                            { label: "Amber", color: "#d97706" },
                            { label: "Navy", color: "#1e3a8a" },
                          ].map((c) => (
                            <button
                              key={c.color}
                              type="button"
                              onClick={() =>
                                updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                                  cardTextColor: c.color,
                                })
                              }
                              className="px-2 py-0.5 text-[10px] font-extrabold rounded border transition-all cursor-pointer shadow-2xs"
                              style={{
                                backgroundColor: c.color,
                                color: c.color === "#ffffff" ? "#0f172a" : "#ffffff",
                                borderColor: (targetItem.cardTextColor || "").toLowerCase() === c.color.toLowerCase() ? "#faad13" : "#cbd5e1",
                              }}
                            >
                              {c.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeCardEditField === "price" && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <label className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                            💰 Edit Card Price:
                          </label>
                          <span className="text-[10px] text-slate-400">Updates live on card price</span>
                        </div>
                        <div className="flex gap-2 items-center">
                          <Input
                            value={targetItem.customPrice ?? targetSection.customPrice ?? ""}
                            placeholder="e.g. ₹1.4 Cr, ₹45 Lakhs, Price on Request"
                            onChange={(e) =>
                              updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                                customPrice: e.target.value,
                              })
                            }
                            className="h-9 text-xs font-bold flex-1 bg-white dark:bg-slate-950 text-slate-950 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 border border-slate-300 dark:border-slate-700 focus:border-amber-500"
                          />
                          {(targetItem.customPrice || targetSection.customPrice) && (
                            <button
                              type="button"
                              onClick={() =>
                                updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                                  customPrice: undefined,
                                })
                              }
                              className="px-2 py-1 text-[11px] font-bold text-slate-500 hover:text-red-500 underline cursor-pointer shrink-0"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5 items-center pt-0.5">
                          <span className="text-[10px] font-bold text-slate-400 mr-1">Quick Values:</span>
                          {["₹45 Lakhs", "₹85 Lakhs", "₹1.4 Cr", "₹2.2 Cr", "Price on Request"].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() =>
                                updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                                  customPrice: preset,
                                })
                              }
                              className={cn(
                                "px-2 py-0.5 text-[11px] font-bold rounded border transition-all cursor-pointer",
                                (targetItem.customPrice || targetSection.customPrice) === preset
                                  ? "bg-amber-500 text-slate-950 border-amber-500 ring-1 ring-amber-400/40"
                                  : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                              )}
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeCardEditField === "location" && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <label className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                            📍 Edit Card Location:
                          </label>
                          <span className="text-[10px] text-slate-400">Updates live on card location</span>
                        </div>
                        <div className="flex gap-2 items-center">
                          <Input
                            value={targetItem.customLocation ?? targetSection.customLocation ?? ""}
                            placeholder="e.g. Poranki, Vijayawada"
                            onChange={(e) =>
                              updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                                customLocation: e.target.value,
                              })
                            }
                            className="h-9 text-xs font-bold flex-1 bg-white dark:bg-slate-950 text-slate-950 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 border border-slate-300 dark:border-slate-700 focus:border-amber-500"
                          />
                          {(targetItem.customLocation || targetSection.customLocation) && (
                            <button
                              type="button"
                              onClick={() =>
                                updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                                  customLocation: undefined,
                                })
                              }
                              className="px-2 py-1 text-[11px] font-bold text-slate-500 hover:text-red-500 underline cursor-pointer shrink-0"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5 items-center pt-0.5">
                          <span className="text-[10px] font-bold text-slate-400 mr-1">Quick Values:</span>
                          {["Poranki, Vijayawada", "Benz Circle", "Bhavanipuram", "Guntur", "Amaravati"].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() =>
                                updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                                  customLocation: preset,
                                })
                              }
                              className={cn(
                                "px-2 py-0.5 text-[11px] font-bold rounded border transition-all cursor-pointer",
                                (targetItem.customLocation || targetSection.customLocation) === preset
                                  ? "bg-amber-500 text-slate-950 border-amber-500 ring-1 ring-amber-400/40"
                                  : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                              )}
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeCardEditField === "badge" && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <label className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                            🏷️ Edit Badge Pill Text:
                          </label>
                          <span className="text-[10px] text-slate-400">Updates live on card badge</span>
                        </div>
                        <div className="flex gap-2 items-center">
                          <Input
                            value={targetItem.customBadge ?? targetSection.customBadge ?? ""}
                            placeholder="e.g. Hot Deal, ✨ Premium, New Launch"
                            onChange={(e) =>
                              updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                                customBadge: e.target.value,
                              })
                            }
                            className="h-9 text-xs font-bold flex-1 bg-white dark:bg-slate-950 text-slate-950 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 border border-slate-300 dark:border-slate-700 focus:border-amber-500"
                          />
                          {(targetItem.customBadge || targetSection.customBadge) && (
                            <button
                              type="button"
                              onClick={() =>
                                updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                                  customBadge: undefined,
                                })
                              }
                              className="px-2 py-1 text-[11px] font-bold text-slate-500 hover:text-red-500 underline cursor-pointer shrink-0"
                            >
                              Reset
                            </button>
                          )}
                        </div>

                        {/* Badge suggestions */}
                        <div className="flex flex-wrap gap-1.5 items-center pt-0.5">
                          <span className="text-[10px] font-bold text-slate-400 mr-1">Suggestions:</span>
                          {["Hot Deal", "✨ Premium", "⚡ UNDER CONSTRUCTION", "Featured Campaign", "New Launch", "Ready to Move"].map((preset) => {
                            const isSelected = (targetItem.customBadge || targetSection.customBadge) === preset;
                            return (
                              <button
                                key={preset}
                                type="button"
                                onClick={() =>
                                  updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                                    customBadge: preset,
                                  })
                                }
                                className={cn(
                                  "px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer shadow-xs",
                                  isSelected
                                    ? "bg-amber-500 text-slate-950 border-amber-500 font-black shadow-sm ring-1 ring-amber-400/40"
                                    : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-300 dark:border-slate-700 hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400"
                                )}
                              >
                                {preset}
                              </button>
                            );
                          })}
                        </div>

                        {/* Badge / Accent Color */}
                        <div className="flex items-center gap-2 pt-0.5 flex-wrap text-xs">
                          <span className="font-bold text-slate-600 dark:text-slate-300 text-[11px]">Badge &amp; Accent Color:</span>
                          <input
                            type="color"
                            value={targetItem.cardAccentColor || targetSection.cardAccentColor || "#faad13"}
                            onChange={(e) =>
                              updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                                cardAccentColor: e.target.value,
                              })
                            }
                            className="h-6 w-6 rounded cursor-pointer border border-slate-300 dark:border-slate-700 p-0.5 bg-transparent"
                          />
                          {[
                            { label: "Gold", color: "#faad13" },
                            { label: "Purple", color: "#9333ea" },
                            { label: "Emerald", color: "#10b981" },
                            { label: "Sky", color: "#0284c7" },
                            { label: "Rose", color: "#f43f5e" },
                          ].map((c) => (
                            <button
                              key={c.color}
                              type="button"
                              onClick={() =>
                                updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                                  cardAccentColor: c.color,
                                })
                              }
                              className="px-2.5 py-1 text-xs font-bold rounded-lg border text-white shadow-xs transition-all cursor-pointer"
                              style={{
                                backgroundColor: c.color,
                                borderColor: (targetItem.cardAccentColor || "").toLowerCase() === c.color.toLowerCase() ? "#000" : "transparent",
                              }}
                            >
                              {c.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeCardEditField === "bhk" && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <label className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                            🛏️ Edit BHK / Configuration:
                          </label>
                          <span className="text-[10px] text-slate-400">Updates live on card specs</span>
                        </div>
                        <div className="flex gap-2 items-center">
                          <Input
                            value={targetItem.customBhk ?? targetSection.customBhk ?? ""}
                            placeholder="e.g. 2 BHK, 3 BHK, Luxury Villas, Plots"
                            onChange={(e) =>
                              updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                                customBhk: e.target.value,
                              })
                            }
                            className="h-9 text-xs font-bold flex-1 bg-white dark:bg-slate-950 text-slate-950 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 border border-slate-300 dark:border-slate-700 focus:border-amber-500"
                          />
                          {(targetItem.customBhk || targetSection.customBhk) && (
                            <button
                              type="button"
                              onClick={() =>
                                updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                                  customBhk: undefined,
                                })
                              }
                              className="px-2 py-1 text-[11px] font-bold text-slate-500 hover:text-red-500 underline cursor-pointer shrink-0"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5 items-center pt-0.5">
                          <span className="text-[10px] font-bold text-slate-400 mr-1">Quick Values:</span>
                          {["2 BHK", "3 BHK", "3 & 4 BHK", "Luxury Villas", "Plots"].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() =>
                                updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                                  customBhk: preset,
                                })
                              }
                              className={cn(
                                "px-2 py-0.5 text-[11px] font-bold rounded border transition-all cursor-pointer",
                                (targetItem.customBhk || targetSection.customBhk) === preset
                                  ? "bg-amber-500 text-slate-950 border-amber-500 ring-1 ring-amber-400/40"
                                  : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                              )}
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeCardEditField === "area" && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <label className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                            📐 Edit Area / Size:
                          </label>
                          <span className="text-[10px] text-slate-400">Updates live on card specs</span>
                        </div>
                        <div className="flex gap-2 items-center">
                          <Input
                            value={targetItem.customArea ?? targetSection.customArea ?? ""}
                            placeholder="e.g. 1450 sq.ft., 2500 sq.ft., 200 sq.yds"
                            onChange={(e) =>
                              updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                                customArea: e.target.value,
                              })
                            }
                            className="h-9 text-xs font-bold flex-1 bg-white dark:bg-slate-950 text-slate-950 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 border border-slate-300 dark:border-slate-700 focus:border-amber-500"
                          />
                          {(targetItem.customArea || targetSection.customArea) && (
                            <button
                              type="button"
                              onClick={() =>
                                updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                                  customArea: undefined,
                                })
                              }
                              className="px-2 py-1 text-[11px] font-bold text-slate-500 hover:text-red-500 underline cursor-pointer shrink-0"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5 items-center pt-0.5">
                          <span className="text-[10px] font-bold text-slate-400 mr-1">Quick Values:</span>
                          {["1200 sq.ft.", "1650 sq.ft.", "2200 sq.ft.", "200 sq.yds"].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() =>
                                updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                                  customArea: preset,
                                })
                              }
                              className={cn(
                                "px-2 py-0.5 text-[11px] font-bold rounded border transition-all cursor-pointer",
                                (targetItem.customArea || targetSection.customArea) === preset
                                  ? "bg-amber-500 text-slate-950 border-amber-500 ring-1 ring-amber-400/40"
                                  : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                              )}
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeCardEditField === "developer" && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <label className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                            🏢 Edit Developer / Partner:
                          </label>
                          <span className="text-[10px] text-slate-400">Footer partner label</span>
                        </div>
                        <div className="flex gap-2 items-center">
                          <Input
                            value={targetItem.customDeveloper ?? targetSection.customDeveloper ?? ""}
                            placeholder="e.g. Verified Partner, Vertex Homes, Owner Listed"
                            onChange={(e) =>
                              updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                                customDeveloper: e.target.value,
                              })
                            }
                            className="h-9 text-xs font-bold flex-1 bg-white dark:bg-slate-950 text-slate-950 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 border border-slate-300 dark:border-slate-700 focus:border-amber-500"
                          />
                          {(targetItem.customDeveloper || targetSection.customDeveloper) && (
                            <button
                              type="button"
                              onClick={() =>
                                updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                                  customDeveloper: undefined,
                                })
                              }
                              className="px-2 py-1 text-[11px] font-bold text-slate-500 hover:text-red-500 underline cursor-pointer shrink-0"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5 items-center pt-0.5">
                          <span className="text-[10px] font-bold text-slate-400 mr-1">Quick Values:</span>
                          {["Verified Partner", "Vertex Homes", "Owner Listed", "Premium Developer"].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() =>
                                updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                                  customDeveloper: preset,
                                })
                              }
                              className={cn(
                                "px-2 py-0.5 text-[11px] font-bold rounded border transition-all cursor-pointer",
                                (targetItem.customDeveloper || targetSection.customDeveloper) === preset
                                  ? "bg-amber-500 text-slate-950 border-amber-500 ring-1 ring-amber-400/40"
                                  : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                              )}
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeCardEditField === "cta" && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <label className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                            👉 Edit Button / CTA Text:
                          </label>
                          <span className="text-[10px] text-slate-400">Card action button</span>
                        </div>
                        <div className="flex gap-2 items-center">
                          <Input
                            value={targetItem.customCtaText ?? targetSection.customCtaText ?? ""}
                            placeholder="e.g. Explore, View Details, Enquire Now"
                            onChange={(e) =>
                              updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                                customCtaText: e.target.value,
                              })
                            }
                            className="h-9 text-xs font-bold flex-1 bg-white dark:bg-slate-950 text-slate-950 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 border border-slate-300 dark:border-slate-700 focus:border-amber-500"
                          />
                          {(targetItem.customCtaText || targetSection.customCtaText) && (
                            <button
                              type="button"
                              onClick={() =>
                                updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                                  customCtaText: undefined,
                                })
                              }
                              className="px-2 py-1 text-[11px] font-bold text-slate-500 hover:text-red-500 underline cursor-pointer shrink-0"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5 items-center pt-0.5">
                          <span className="text-[10px] font-bold text-slate-400 mr-1">Quick Values:</span>
                          {["Explore", "View Details", "Enquire Now", "Book Visit"].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() =>
                                updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                                  customCtaText: preset,
                                })
                              }
                              className={cn(
                                "px-2 py-0.5 text-[11px] font-bold rounded border transition-all cursor-pointer",
                                (targetItem.customCtaText || targetSection.customCtaText) === preset
                                  ? "bg-amber-500 text-slate-950 border-amber-500 ring-1 ring-amber-400/40"
                                  : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                              )}
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeCardEditField === "tagline" && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <label className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                            💬 Edit Card Tagline:
                          </label>
                          <span className="text-[10px] text-slate-400">Subtitle under headline</span>
                        </div>
                        <div className="flex gap-2 items-center">
                          <Input
                            value={targetItem.customTagline ?? ""}
                            placeholder="e.g. Verified Luxury Residence, Prime Lakeview Property"
                            onChange={(e) =>
                              updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                                customTagline: e.target.value,
                              })
                            }
                            className="h-9 text-xs font-bold flex-1 bg-white dark:bg-slate-950 text-slate-950 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 border border-slate-300 dark:border-slate-700 focus:border-amber-500"
                          />
                          {targetItem.customTagline && (
                            <button
                              type="button"
                              onClick={() =>
                                updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                                  customTagline: undefined,
                                })
                              }
                              className="px-2 py-1 text-[11px] font-bold text-slate-500 hover:text-red-500 underline cursor-pointer shrink-0"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {activeCardEditField === "bgColor" && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <label className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                            🎨 Choose Card Background Color:
                          </label>
                          <span className="font-mono text-[10px] text-slate-500">
                            {targetItem.cardBgColor || `Shelf default: ${targetSection.cardBgColor || "#ffffff"}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <input
                            type="color"
                            value={targetItem.cardBgColor || targetSection.cardBgColor || "#ffffff"}
                            onChange={(e) =>
                              updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                                cardBgColor: e.target.value,
                              })
                            }
                            className="h-8 w-8 rounded-lg cursor-pointer border border-slate-300 dark:border-slate-700 p-0.5 bg-transparent"
                          />
                          {[
                            { label: "White", color: "#ffffff", textColor: "#0f172a" },
                            { label: "Dark Luxury", color: "#090d16", textColor: "#ffffff" },
                            { label: "Midnight", color: "#0f172a", textColor: "#ffffff" },
                            { label: "Deep Indigo", color: "#1e1b4b", textColor: "#ffffff" },
                            { label: "Warm Cream", color: "#faf8f5", textColor: "#0f172a" },
                            { label: "Emerald Mist", color: "#064e3b", textColor: "#ffffff" },
                          ].map((c) => (
                            <button
                              key={c.color}
                              type="button"
                              onClick={() =>
                                updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                                  cardBgColor: c.color,
                                })
                              }
                              className="px-2.5 py-1 text-xs font-bold rounded-lg border shadow-xs transition-all cursor-pointer"
                              style={{
                                backgroundColor: c.color,
                                color: c.textColor,
                                borderColor: (targetItem.cardBgColor || "").toLowerCase() === c.color.toLowerCase() ? "#faad13" : "#cbd5e1",
                              }}
                            >
                              {c.label}
                            </button>
                          ))}
                          {targetItem.cardBgColor && (
                            <button
                              type="button"
                              onClick={() =>
                                updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                                  cardBgColor: undefined,
                                })
                              }
                              className="px-2 py-1 text-[11px] font-bold text-slate-500 hover:text-red-500 underline cursor-pointer"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {activeCardEditField === "textColor" && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <label className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                            🔤 Choose Card Text Color:
                          </label>
                          <span className="font-mono text-[10px] text-slate-500">
                            {targetItem.cardTextColor || `Shelf default: ${targetSection.cardTextColor || "#0f172a"}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <input
                            type="color"
                            value={targetItem.cardTextColor || targetSection.cardTextColor || "#0f172a"}
                            onChange={(e) =>
                              updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                                cardTextColor: e.target.value,
                              })
                            }
                            className="h-8 w-8 rounded-lg cursor-pointer border border-slate-300 dark:border-slate-700 p-0.5 bg-transparent"
                          />
                          {[
                            { label: "Black", color: "#0f172a" },
                            { label: "White", color: "#ffffff" },
                            { label: "Slate", color: "#334155" },
                            { label: "Amber", color: "#d97706" },
                            { label: "Navy", color: "#1e3a8a" },
                          ].map((c) => (
                            <button
                              key={c.color}
                              type="button"
                              onClick={() =>
                                updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                                  cardTextColor: c.color,
                                })
                              }
                              className="px-2.5 py-1 text-xs font-bold rounded-lg border shadow-xs transition-all cursor-pointer"
                              style={{
                                backgroundColor: c.color,
                                color: c.color === "#ffffff" ? "#0f172a" : "#ffffff",
                                borderColor: (targetItem.cardTextColor || "").toLowerCase() === c.color.toLowerCase() ? "#faad13" : "#cbd5e1",
                              }}
                            >
                              {c.label}
                            </button>
                          ))}
                          {targetItem.cardTextColor && (
                            <button
                              type="button"
                              onClick={() =>
                                updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                                  cardTextColor: undefined,
                                })
                              }
                              className="px-2 py-1 text-[11px] font-bold text-slate-500 hover:text-red-500 underline cursor-pointer"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {activeCardEditField === "accentColor" && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <label className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                            ✨ Choose Button &amp; Accent Color:
                          </label>
                          <span className="font-mono text-[11px] text-slate-500">
                            {targetItem.cardAccentColor || `Shelf default: ${targetSection.cardAccentColor || "#faad13"}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <input
                            type="color"
                            value={targetItem.cardAccentColor || targetSection.cardAccentColor || "#faad13"}
                            onChange={(e) =>
                              updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                                cardAccentColor: e.target.value,
                              })
                            }
                            className="h-8 w-8 rounded-lg cursor-pointer border border-slate-300 dark:border-slate-700 p-0.5 bg-transparent"
                          />
                          {[
                            { label: "Gold", color: "#faad13" },
                            { label: "Purple", color: "#9333ea" },
                            { label: "Emerald", color: "#10b981" },
                            { label: "Sky", color: "#0284c7" },
                            { label: "Rose", color: "#f43f5e" },
                          ].map((c) => (
                            <button
                              key={c.color}
                              type="button"
                              onClick={() =>
                                updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                                  cardAccentColor: c.color,
                                })
                              }
                              className="px-2.5 py-1 text-xs font-bold rounded-lg border text-white shadow-xs transition-all cursor-pointer"
                              style={{
                                backgroundColor: c.color,
                                borderColor: (targetItem.cardAccentColor || "").toLowerCase() === c.color.toLowerCase() ? "#000" : "transparent",
                              }}
                            >
                              {c.label}
                            </button>
                          ))}
                          {targetItem.cardAccentColor && (
                            <button
                              type="button"
                              onClick={() =>
                                updateSectionItem(targetSection.id, targetItem.id, targetItem.type, {
                                  cardAccentColor: undefined,
                                })
                              }
                              className="px-2 py-1 text-[11px] font-bold text-slate-500 hover:text-red-500 underline cursor-pointer"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="w-full overflow-x-auto py-2 px-1 flex justify-center items-center">
                    {liveMixedItem && (
                      <div className={cn("transition-all duration-300", getPreviewCardWidthClass(currentStyle))}>
                        <ShelfCard
                          item={liveMixedItem}
                          cardStyle={currentStyle}
                          cardBgColor={targetItem.cardBgColor || targetSection.cardBgColor}
                          cardTextColor={targetItem.cardTextColor || targetSection.cardTextColor}
                          cardAccentColor={targetItem.cardAccentColor || targetSection.cardAccentColor}
                          customBadge={targetItem.customBadge || targetSection.customBadge}
                          customHeadline={targetItem.customHeadline || targetSection.customHeadline}
                          customTagline={targetItem.customTagline || targetSection.customTagline}
                          customPrice={targetItem.customPrice || targetSection.customPrice}
                          customLocation={targetItem.customLocation || targetSection.customLocation}
                          customBhk={targetItem.customBhk || targetSection.customBhk}
                          customArea={targetItem.customArea || targetSection.customArea}
                          customDeveloper={targetItem.customDeveloper || targetSection.customDeveloper}
                          customStatus={targetItem.customStatus || targetSection.customStatus}
                          customCtaText={targetItem.customCtaText || targetSection.customCtaText}
                          progressPercentage={targetItem.progressPercentage}
                          isEditable={true}
                          onEditBadge={() => setActiveCardEditField("badge")}
                          onEditHeadline={() => setActiveCardEditField("headline")}
                          onEditTagline={() => setActiveCardEditField("tagline")}
                          onEditPrice={() => setActiveCardEditField("price")}
                          onEditLocation={() => setActiveCardEditField("location")}
                          onEditBhk={() => setActiveCardEditField("bhk")}
                          onEditArea={() => setActiveCardEditField("area")}
                          onEditDeveloper={() => setActiveCardEditField("developer")}
                          onEditStatus={() => setActiveCardEditField("status" as any)}
                          onEditCtaText={() => setActiveCardEditField("cta")}
                          onEditBgColor={() => setActiveCardEditField("bgColor")}
                          onEditTextColor={() => setActiveCardEditField("textColor")}
                          onEditAccentColor={() => setActiveCardEditField("accentColor")}
                        />
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 text-center font-medium">
                    This is the exact full card as it will appear in the &ldquo;{targetSection.title}&rdquo; shelf on the homepage.
                  </p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="border-t border-border-default px-5 py-3.5 bg-slate-50 dark:bg-slate-950/50 flex justify-end">
                <Button
                  onClick={() => setEditingCardTarget(null)}
                  className="bg-slate-950 dark:bg-white text-white dark:text-slate-950 font-extrabold hover:bg-slate-800 cursor-pointer"
                >
                  Done Customizing
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ADD SHELF MODAL WITH ICON OPTIONS */}
      {isAddShelfOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl rounded-2xl bg-bg-card border border-border-default shadow-2xl p-5 sm:p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border-default pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-[#faad13]">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-text-primary">Add New Homepage Shelf</h3>
                  <p className="text-xs text-text-secondary">Configure the title, card style, and icon for this shelf</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddShelfOpen(false)}
                className="w-8 h-8 rounded-lg border border-border-default flex items-center justify-center text-text-secondary hover:text-text-primary cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Shelf Title */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-text-primary">Shelf Title *</label>
              <Input
                value={newShelfTitle}
                onChange={(e) => setNewShelfTitle(e.target.value)}
                placeholder="e.g. Luxury Villas & Estates"
                maxLength={40}
                className="font-extrabold text-sm"
                autoFocus
              />

              {/* Quick Title Suggestion Pills */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] font-bold text-text-tertiary">Quick ideas:</span>
                {[
                  "Featured Residences",
                  "Luxury Villas",
                  "Under ₹50 Lakhs",
                  "Ready to Move",
                  "New Launches",
                  "Gated Communities",
                ].map((sugg) => (
                  <button
                    key={sugg}
                    type="button"
                    onClick={() => setNewShelfTitle(sugg)}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-text-secondary hover:text-amber-500 hover:border-amber-500/40 border border-border-default cursor-pointer transition-colors"
                  >
                    {sugg}
                  </button>
                ))}
              </div>
            </div>

            {/* Icon Picker */}
            <div className="space-y-2">
              <IconPicker
                value={newShelfIcon}
                onChange={(icon) => setNewShelfIcon(icon as HomeSectionIconName)}
                label="Choose Shelf Icon *"
              />
            </div>

            {/* Card Style Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-text-primary">Initial Card Layout Style</label>
              <select
                value={newShelfCardStyle}
                onChange={(e) => setNewShelfCardStyle(e.target.value as HomeCardStyleId)}
                className="w-full h-10 px-3 border border-border-default rounded-xl bg-bg-surface text-xs font-bold text-text-primary outline-none cursor-pointer"
              >
                {HOME_CARD_STYLES.map((style) => (
                  <option key={style.id} value={style.id}>
                    {style.label} ({style.recommendedUse})
                  </option>
                ))}
              </select>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border-default">
              <Button variant="outline" onClick={() => setIsAddShelfOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirmAddShelf}
                className="bg-[#faad13] font-black text-slate-950 hover:bg-[#e89d08] shadow-md px-5"
              >
                <Plus className="w-4 h-4 mr-1 stroke-[3]" /> Add Shelf
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

