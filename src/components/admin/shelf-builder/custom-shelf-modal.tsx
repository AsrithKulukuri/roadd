"use client";

import React, { useState } from "react";
import {
  X,
  Sparkles,
  Layers,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sliders,
  LayoutGrid,
  Filter,
  Eye,
  Type,
  Square,
} from "lucide-react";
import type {
  ShelfDefinition,
  ShelfType,
  ContentSourceType,
  ShelfLayoutType,
} from "@/types/shelf-builder";
import type { HomeCardStyleId } from "@/types/home-section";
import {
  DEFAULT_ELEMENT_ORDER,
  DEFAULT_ELEMENTS_CONFIG,
  DEFAULT_BORDER_PRESETS,
} from "@/lib/shelf-builder-defaults";
import { cn } from "@/lib/utils";

interface CustomShelfModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateShelf: (newShelf: ShelfDefinition) => void;
  existingShelves: ShelfDefinition[];
}

export function CustomShelfModal({
  isOpen,
  onClose,
  onCreateShelf,
  existingShelves,
}: CustomShelfModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // New Shelf State
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [shelfType, setShelfType] = useState<ShelfType>("custom");
  const [contentSource, setContentSource] = useState<ContentSourceType>("hybrid");
  const [cardStyle, setCardStyle] = useState<HomeCardStyleId>("classic-default");
  const [layoutType, setLayoutType] = useState<ShelfLayoutType>("carousel");
  const [filterCity, setFilterCity] = useState("");
  const [filterReadyToMove, setFilterReadyToMove] = useState(false);
  const [filterRera, setFilterRera] = useState(false);

  if (!isOpen) return null;

  const handleCreate = () => {
    if (!name.trim() || !title.trim()) return;

    const newShelfId = `shelf-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}`;

    const newShelf: ShelfDefinition = {
      id: newShelfId,
      name: name.trim(),
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      icon: "Sparkles",
      shelfType,
      isActive: true,
      status: "draft",
      isCustom: true,
      contentSource,
      autoFilters: {
        city: filterCity.trim() || undefined,
        readyToMove: filterReadyToMove || undefined,
        reraApproved: filterRera || undefined,
      },
      maxItems: 8,
      items: [],
      cardStyle,
      layoutType,
      gridColumnsDesktop: 3,
      gridColumnsTablet: 2,
      gridColumnsMobile: 1,
      cardSizeDesktop: "medium",
      cardSizeMobile: "medium",
      enableCarousel: layoutType === "carousel",
      carouselInterval: 4,
      cardBgColor: "#ffffff",
      cardTextColor: "#0f172a",
      cardAccentColor: "#faad13",
      cardBorder: DEFAULT_BORDER_PRESETS[0].config,
      imageArrangement: {
        preset: "single",
        splitRatio: "50/50",
        aspectRatio: "16/10",
        cropMode: "cover",
      },
      elementOrder: [...DEFAULT_ELEMENT_ORDER],
      elements: { ...DEFAULT_ELEMENTS_CONFIG },
      updatedAt: new Date().toISOString(),
    };

    onCreateShelf(newShelf);
    onClose();
  };

  const CARD_STYLES: { id: HomeCardStyleId; name: string; desc: string }[] = [
    { id: "classic-default", name: "1. Classic Default", desc: "Balanced landscape, overlay badges & specs" },
    { id: "compact-marketplace", name: "2. Compact Marketplace", desc: "Horizontal split card for high density" },
    { id: "tall-portrait", name: "3. Tall Luxury Portrait", desc: "Cinematic portrait with luxury specs" },
    { id: "luxury-banner", name: "4. Luxury Banner", desc: "Extra wide panoramic banner with developer logo" },
    { id: "split-feature", name: "5. Split Feature Showcase", desc: "Dual stacked images with amenities grid" },
    { id: "bottom-floating", name: "6. Bottom Floating Card", desc: "Overlapping floating card with logo badge" },
    { id: "modern-villa", name: "7. Modern Villa Showcase", desc: "Gated villa photo with 3-amenity icons" },
    { id: "construction-progress", name: "8. Construction Tracker", desc: "Completion percentage bar & updates" },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" /> Create Custom Shelf
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Step {step} of 5: {step === 1 ? "Shelf Identity" : step === 2 ? "Content Sourcing" : step === 3 ? "Card Style" : step === 4 ? "Layout Type" : "Summary & Finish"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {/* STEP 1: IDENTITY */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  Internal Name (For Admin Dashboard) *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Waterfront Residences"
                  className="w-full py-2 px-3 rounded-xl border border-slate-700 bg-slate-800 text-white font-bold"
                />
              </div>

              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  Public Shelf Heading (Shown on Homepage) *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Exclusive Lakefront Living"
                  className="w-full py-2 px-3 rounded-xl border border-slate-700 bg-slate-800 text-white font-bold"
                />
              </div>

              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  Subtitle / Description
                </label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="e.g. Hand-picked luxury villas and apartments overlooking scenic waters"
                  className="w-full py-2 px-3 rounded-xl border border-slate-700 bg-slate-800 text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                  Shelf Classification
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["custom", "properties", "projects", "rentals", "commercial"] as ShelfType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setShelfType(t)}
                      className={cn(
                        "p-2.5 rounded-xl border font-bold capitalize text-xs transition-all cursor-pointer",
                        shelfType === t
                          ? "border-amber-500 bg-amber-500/10 text-amber-400 ring-1 ring-amber-400"
                          : "border-slate-800 bg-slate-950 text-slate-400 hover:text-white"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: CONTENT SOURCING */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                  How should listings be selected?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "hybrid", label: "Hybrid (Recommended)", desc: "Pinned items first, plus auto-matched properties" },
                    { id: "automatic", label: "Automatic Filters", desc: "Dynamically matches by city, price, BHK & status" },
                    { id: "manual", label: "Manual Curation", desc: "Pick and arrange specific listings one-by-one" },
                  ].map((src) => (
                    <button
                      key={src.id}
                      type="button"
                      onClick={() => setContentSource(src.id as ContentSourceType)}
                      className={cn(
                        "p-3 rounded-xl border text-left transition-all cursor-pointer",
                        contentSource === src.id
                          ? "border-amber-500 bg-amber-500/10 text-white ring-1 ring-amber-400"
                          : "border-slate-800 bg-slate-950 text-slate-400 hover:text-white"
                      )}
                    >
                      <span className="font-extrabold text-xs block">{src.label}</span>
                      <span className="text-[10px] text-slate-400 block mt-1 leading-tight">{src.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {(contentSource === "automatic" || contentSource === "hybrid") && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Filter className="w-4 h-4 text-amber-400" /> Filter Criteria
                  </span>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Target City or Region</label>
                    <input
                      type="text"
                      value={filterCity}
                      onChange={(e) => setFilterCity(e.target.value)}
                      placeholder="e.g. Amaravati, Vijayawada, Guntur"
                      className="w-full py-1.5 px-3 rounded-xl border border-slate-700 bg-slate-800 text-white"
                    />
                  </div>

                  <div className="flex items-center gap-4 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filterReadyToMove}
                        onChange={(e) => setFilterReadyToMove(e.target.checked)}
                        className="accent-amber-500 w-4 h-4"
                      />
                      <span>Ready to Move Only</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filterRera}
                        onChange={(e) => setFilterRera(e.target.checked)}
                        className="accent-amber-500 w-4 h-4"
                      />
                      <span>RERA Approved Only</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: STARTING CARD STYLE */}
          {step === 3 && (
            <div className="space-y-4">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                Select Starting Card Composition
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                {CARD_STYLES.map((cs) => (
                  <button
                    key={cs.id}
                    type="button"
                    onClick={() => setCardStyle(cs.id)}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all cursor-pointer",
                      cardStyle === cs.id
                        ? "border-amber-500 bg-amber-500/10 text-white ring-1 ring-amber-400"
                        : "border-slate-800 bg-slate-950 text-slate-400 hover:text-white"
                    )}
                  >
                    <span className="font-extrabold text-xs block text-slate-200">{cs.name}</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">{cs.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: LAYOUT & CAROUSEL */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                  Shelf Layout Presentation
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setLayoutType("carousel")}
                    className={cn(
                      "p-4 rounded-2xl border text-left transition-all cursor-pointer",
                      layoutType === "carousel"
                        ? "border-amber-500 bg-amber-500/10 text-white ring-1 ring-amber-400"
                        : "border-slate-800 bg-slate-950 text-slate-400 hover:text-white"
                    )}
                  >
                    <span className="font-black text-sm block">Horizontal Carousel</span>
                    <span className="text-[11px] text-slate-400 block mt-1">
                      Smooth swipeable carousel with infinite loop and desktop navigation arrows.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLayoutType("grid")}
                    className={cn(
                      "p-4 rounded-2xl border text-left transition-all cursor-pointer",
                      layoutType === "grid"
                        ? "border-amber-500 bg-amber-500/10 text-white ring-1 ring-amber-400"
                        : "border-slate-800 bg-slate-950 text-slate-400 hover:text-white"
                    )}
                  >
                    <span className="font-black text-sm block">Responsive Grid</span>
                    <span className="text-[11px] text-slate-400 block mt-1">
                      Multi-column grid (3 columns desktop, 2 columns tablet, 1 column mobile).
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: SUMMARY & CONFIRMATION */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                <span className="font-black text-white text-sm block">Configuration Summary</span>
                <div className="grid grid-cols-2 gap-2 text-slate-300">
                  <div>
                    <span className="text-slate-500 block">Name:</span>
                    <span className="font-bold">{name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Public Title:</span>
                    <span className="font-bold text-amber-400">{title}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Card Composition:</span>
                    <span className="font-bold">{cardStyle}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Content Source:</span>
                    <span className="font-bold capitalize">{contentSource}</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                Once created, the shelf will open in the 3-panel Visual Shelf Builder where you can fine-tune typography, borders, and pin listings.
              </p>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="p-5 border-t border-slate-800 flex items-center justify-between bg-slate-950/60">
          <button
            type="button"
            onClick={() => (step > 1 ? setStep((step - 1) as any) : onClose())}
            className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer hover:bg-slate-700"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{step === 1 ? "Cancel" : "Back"}</span>
          </button>

          {step < 5 ? (
            <button
              type="button"
              disabled={step === 1 && (!name.trim() || !title.trim())}
              onClick={() => setStep((step + 1) as any)}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span>Continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCreate}
              className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Create Shelf & Open Builder</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
