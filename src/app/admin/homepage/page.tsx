"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Eye,
  EyeOff,
  Layers,
  LayoutList,
  Plus,
  Save,
  Search,
  Sparkles,
  Trash2,
  X,
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
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <Input value={section.title} maxLength={40} aria-label="Shelf title" onChange={(event) => updateSection(section.id, { title: event.target.value })} className="h-10 max-w-md font-extrabold text-sm" />
                      
                      {/* Card Style Selector Button */}
                      <div className="flex items-center gap-2">
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
                      </div>
                    </div>

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
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                      {section.items.map((item) => {
                        const listing = candidateMap.get(`${item.type}:${item.id}`);
                        return <div key={`${item.type}:${item.id}`} className="flex min-w-0 items-center gap-3 rounded-lg border border-border-default p-2.5 bg-white dark:bg-slate-900">
                          <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-md bg-slate-100">{listing?.image && <Image src={listing.image} alt="" fill unoptimized className="object-cover" sizes="64px" />}</div>
                          <div className="min-w-0 flex-1"><p className="truncate text-xs font-extrabold text-text-primary">{listing?.title || "Unavailable listing"}</p><p className="mt-0.5 text-[10px] uppercase text-text-tertiary">{item.type}</p></div>
                          <button type="button" aria-label={`Remove ${listing?.title || "listing"}`} onClick={() => toggleItem(section.id, item)} className="text-text-tertiary hover:text-red-600"><X className="h-4 w-4" /></button>
                        </div>;
                      })}
                    </div>

                    {/* LIVE SHELF PREVIEW */}
                    <div className="pt-3 border-t border-dashed border-border-default">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-[#faad13]" /> Live Shelf Preview ({cardStyleMeta.label})
                        </span>
                        <span className="text-[10px] text-slate-400">Preview with actual card design</span>
                      </div>
                      <div className="w-full overflow-x-auto pb-3 pt-1 flex gap-4 no-scrollbar">
                        {section.items.map((item, idx) => {
                          const prop = properties.find((p) => p.id === item.id);
                          const proj = projects.find((p) => p.id === item.id);
                          if (!prop && !proj) return null;
                          const mixedItem: MixedItem = prop
                            ? { ...prop, itemType: "property" }
                            : { ...proj!, itemType: "project" };

                          return (
                            <div key={`${item.type}:${item.id}-preview`} className="shrink-0 w-[280px] sm:w-[320px] pointer-events-none">
                              <ShelfCard item={mixedItem} cardStyle={currentStyleId} index={idx} />
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

