"use client";

import React, { useState } from "react";
import {
  X,
  Check,
  Sparkles,
  Layout,
  Maximize2,
  Layers,
  Building,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  HOME_CARD_STYLES,
  type HomeCardStyleId,
} from "@/types/home-section";
import { ShelfCard } from "./shelf-card";
import type { MixedItem } from "@/components/home/mixed-carousel-row";

// Realistic sample mock property for live preview
const SAMPLE_MOCK_PROPERTY: MixedItem = {
  itemType: "property",
  id: "sample-preview-prop-1",
  slug: "urban-nest-residency-hyderabad",
  title: "Urban Nest Residency",
  description: "Ultra-luxury modern 3 BHK flat with panoramic city view and designer fittings.",
  propertyType: "apartment",
  listingType: "sale",
  saleType: "new",
  price: 8350000,
  pricePerSqft: 5758,
  bedrooms: 3,
  bathrooms: 3,
  balconies: 2,
  area: 1450,
  parking: 1,
  furnishing: "semi-furnished",
  facing: "east",
  ageOfProperty: 1,
  floorNumber: 7,
  totalFloors: 14,
  location: {
    address: "Main Road",
    locality: "Miyapur",
    city: "Hyderabad",
    state: "Telangana",
    pincode: "500049",
    latitude: 17.4948,
    longitude: 78.3498,
  },
  coverImage: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1000&q=80",
  images: [
    {
      id: "img-1",
      url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1000&q=80",
      alt: "Living Room",
      isPrimary: true,
      order: 0,
    },
    {
      id: "img-2",
      url: "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?w=1000&q=80",
      alt: "Master Bedroom",
      isPrimary: false,
      order: 1,
    },
  ],
  features: [
    { label: "Community", value: "Gated Community" },
    { label: "Clubhouse", value: "Available" },
    { label: "Security", value: "24/7 Security" },
    { label: "Pool", value: "Swimming Pool" },
  ],
  amenities: [
    { id: "1", name: "Power Backup", icon: "zap", category: "basic" },
    { id: "2", name: "Gym", icon: "dumbbell", category: "lifestyle" },
    { id: "3", name: "Car Parking", icon: "car", category: "parking" },
    { id: "4", name: "Children Play Area", icon: "smile", category: "lifestyle" },
  ],
  status: "published",
  viewsCount: 1240,
  savedCount: 89,
  isFeatured: true,
  isVerified: true,
  isRecommended: true,
  isReadyToMove: true,
  possessionStatus: "ready",
  postedBy: "owner",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Realistic sample mock project for live preview
const SAMPLE_MOCK_PROJECT: MixedItem = {
  itemType: "project",
  id: "sample-preview-proj-1",
  slug: "sattva-lake-ridge-kokapet",
  name: "Sattva Lake Ridge",
  tagline: "Spacious Homes. Greener Living. Better Tomorrows.",
  description: "A luxury high-rise development overlooking the serene lake with premium clubhouse amenities.",
  projectType: "apartment",
  builderName: "Sattva Group",
  builderLogoUrl: "https://images.unsplash.com/photo-1541888946425-d0fbb186156a?w=120&q=80",
  location: {
    address: "Financial District Road",
    locality: "Kokapet",
    city: "Hyderabad",
    state: "Telangana",
    latitude: 17.4112,
    longitude: 78.3328,
  },
  reraApproved: true,
  reraId: "P02400003891",
  constructionStatus: "under-construction",
  coverImage: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&q=80",
  images: [
    {
      id: "proj-img-1",
      url: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&q=80",
      alt: "Exterior Elevation",
      category: "exterior",
      isPrimary: true,
    },
    {
      id: "proj-img-2",
      url: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1000&q=80",
      alt: "Clubhouse & Pool",
      category: "amenity",
      isPrimary: false,
    },
  ],
  configurations: [
    {
      id: "cfg-1",
      label: "3 BHK",
      bedrooms: 3,
      builtUpAreaMin: 1850,
      builtUpAreaMax: 2250,
      priceMin: 18000000,
      priceMax: 24000000,
    },
    {
      id: "cfg-2",
      label: "4 BHK",
      bedrooms: 4,
      builtUpAreaMin: 2800,
      builtUpAreaMax: 3400,
      priceMin: 29000000,
      priceMax: 36000000,
    },
  ],
  phases: [
    {
      id: "phase-1",
      name: "Phase 1 - Tower A & B",
      status: "under-construction",
      possessionDate: "Dec 2026",
    },
  ],
  highlights: [
    "Lake facing premium apartments",
    "Over 50,000 sq.ft. signature clubhouse",
    "Located in prime Kokapet, 5 mins to Financial District",
  ],
  facilities: [
    "Clubhouse",
    "Swimming Pool",
    "24/7 Security",
    "Gym",
    "Private Garden",
    "Power Backup",
  ],
  isPublished: true,
  isFeatured: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

interface CardStyleGalleryModalProps {
  currentStyle?: HomeCardStyleId;
  shelfTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectStyle: (styleId: HomeCardStyleId) => void;
}

export function CardStyleGalleryModal({
  currentStyle = "compact-marketplace",
  shelfTitle,
  isOpen,
  onClose,
  onSelectStyle,
}: CardStyleGalleryModalProps) {
  const [selectedId, setSelectedId] = useState<HomeCardStyleId>(currentStyle);
  const [previewDataType, setPreviewDataType] = useState<"property" | "project">("project");

  if (!isOpen) return null;

  const previewItem = previewDataType === "project" ? SAMPLE_MOCK_PROJECT : SAMPLE_MOCK_PROPERTY;

  const handleConfirm = () => {
    onSelectStyle(selectedId);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Select Card Design Style"
    >
      <div className="flex flex-col w-full max-w-6xl max-h-[92vh] bg-white dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
          <div>
            <div className="flex items-center gap-2 text-amber-500 font-extrabold text-xs uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4" /> Homepage Shelves Design System
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              Choose Card Style for &ldquo;{shelfTitle}&rdquo;
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Select one of the 8 distinct card compositions. All listings in this shelf will render using this design.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Toggle Preview Data Type */}
            <div className="hidden sm:flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => setPreviewDataType("project")}
                className={cn(
                  "px-3 py-1.5 rounded-lg transition-all",
                  previewDataType === "project"
                    ? "bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                )}
              >
                Project View
              </button>
              <button
                type="button"
                onClick={() => setPreviewDataType("property")}
                className={cn(
                  "px-3 py-1.5 rounded-lg transition-all",
                  previewDataType === "property"
                    ? "bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                )}
              >
                Property View
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Gallery Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {HOME_CARD_STYLES.map((style) => {
              const isSelected = selectedId === style.id;
              const isWide =
                style.id === "luxury-banner" ||
                style.id === "split-feature" ||
                style.id === "dark-editorial";

              return (
                <div
                  key={style.id}
                  onClick={() => setSelectedId(style.id)}
                  className={cn(
                    "group relative flex flex-col justify-between rounded-3xl p-5 border-2 transition-all cursor-pointer bg-white dark:bg-slate-950 shadow-sm hover:shadow-xl",
                    isWide && "md:col-span-2",
                    isSelected
                      ? "border-amber-500 ring-4 ring-amber-500/15"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                  )}
                >
                  {/* Top Metadata & Radio */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-heading font-black text-lg text-slate-900 dark:text-white">
                          {style.label}
                        </h3>
                        {isSelected && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black uppercase">
                            Selected
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {style.description}
                      </p>
                    </div>

                    <div
                      className={cn(
                        "w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                        isSelected
                          ? "border-amber-500 bg-amber-500 text-slate-950"
                          : "border-slate-300 dark:border-slate-700 text-transparent"
                      )}
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                  </div>

                  {/* LIVE REAL COMPONENT PREVIEW */}
                  <div className="w-full flex items-center justify-center p-3 sm:p-4 rounded-2xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 overflow-x-auto">
                    <div className={cn("w-full pointer-events-none transform transition-transform group-hover:scale-[1.01]", isWide ? "max-w-3xl" : "max-w-md")}>
                      <ShelfCard
                        item={previewItem}
                        cardStyle={style.id}
                      />
                    </div>
                  </div>

                  {/* Bottom Footer Info */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      Recommended: <strong className="text-slate-600 dark:text-slate-300">{style.recommendedUse}</strong>
                    </span>
                    <span className="font-mono text-[10px]">
                      {style.minWidth}–{style.maxWidth}px
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Selected Style:{" "}
            <strong className="text-slate-900 dark:text-white font-bold">
              {HOME_CARD_STYLES.find((s) => s.id === selectedId)?.label}
            </strong>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose} className="rounded-xl font-bold">
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl shadow-lg px-6"
            >
              Apply Style to Shelf
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
