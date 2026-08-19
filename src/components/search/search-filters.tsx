"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  SlidersHorizontal,
  X,
  Building2,
  Check,
  Plus,
  Compass,
  Home,
  Trees,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  UserCheck,
  ArrowRight,
  Layers,
  Car,
  DoorOpen,
  IndianRupee,
  SquareDashed,
  Key,
  ShieldAlert,
  Droplets,
  Sprout,
  Video,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatINR, formatINRWords, cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";

export interface FilterState {
  query: string;
  listingType: string[];
  propertyType: string[];
  subPropertyType: string[];
  bhk: string[];
  bathrooms: string[];
  balconies: string[];
  additionalRooms: string[];
  budget: [number, number];
  coveredArea: [number, number];
  possessionStatus: string[];
  saleType: string[];
  postedBy: string[];
  ownership: string[];
  furnished: string[];
  facing: string[];
  floorRange: string[];
  amenities: string[];
  verifiedBadges: string[];
  waterSource: string[];
  cultivationCrop: string[];
  ageRange: string[];
  availability: string[];
  vastuCompliant: boolean;
  gatedCommunity: boolean;
  reraApproved: boolean;
}

export const initialFilterState: FilterState = {
  query: "",
  listingType: [],
  propertyType: [],
  subPropertyType: [],
  bhk: [],
  bathrooms: [],
  balconies: [],
  additionalRooms: [],
  budget: [0, 100000000],
  coveredArea: [0, 10000],
  possessionStatus: [],
  saleType: [],
  postedBy: [],
  ownership: [],
  furnished: [],
  facing: [],
  floorRange: [],
  amenities: [],
  verifiedBadges: [],
  waterSource: [],
  cultivationCrop: [],
  ageRange: [],
  availability: [],
  vastuCompliant: false,
  gatedCommunity: false,
  reraApproved: false,
};

interface SearchFiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onApplyFilters: (newFilters: FilterState) => void;
  totalResults: number;
}

// Category Tabs Definition (MagicBricks Left Navigation)
const CATEGORY_TABS = [
  { id: "budget", label: "Budget / Price", icon: IndianRupee },
  { id: "area", label: "Covered Area (sqft)", icon: SquareDashed },
  { id: "bhk", label: "BHK & Space", icon: Home },
  { id: "propertyType", label: "Sub Property Type", icon: Building2 },
  { id: "possession", label: "Possession Status", icon: Sparkles },
  { id: "saleType", label: "Sale Type", icon: Layers },
  { id: "postedBy", label: "Posted By", icon: UserCheck },
  { id: "ownership", label: "Ownership", icon: Key },
  { id: "furnishing", label: "Furnishing", icon: DoorOpen },
  { id: "facing", label: "Facing & Vastu", icon: Compass },
  { id: "amenities", label: "Amenities", icon: Car },
  { id: "verified", label: "Verified & Trust", icon: ShieldCheck },
  { id: "agriculture", label: "Water & Agriculture", icon: Sprout },
] as const;

type TabId = (typeof CATEGORY_TABS)[number]["id"];

export function SearchFiltersModal({
  isOpen,
  onClose,
  filters,
  onApplyFilters,
  totalResults,
}: SearchFiltersModalProps) {
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);
  const [activeTab, setActiveTab] = useState<TabId>("budget");

  // Keep local filters synchronized when modal is opened
  useEffect(() => {
    if (isOpen) {
      setLocalFilters(filters);
    }
  }, [isOpen, filters]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleArrayFilter = (field: keyof FilterState, value: string) => {
    setLocalFilters((prev) => {
      const current = (prev[field] as string[]) || [];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [field]: updated };
    });
  };

  const handleReset = () => {
    setLocalFilters({ ...initialFilterState, query: localFilters.query });
  };

  const handleApply = () => {
    onApplyFilters(localFilters);
    onClose();
  };

  // Helper to check if a specific tab has active filters (for green indicator dot)
  const isTabActive = (tabId: TabId): boolean => {
    switch (tabId) {
      case "budget":
        return localFilters.budget[0] > 0 || localFilters.budget[1] < 100000000;
      case "area":
        return localFilters.coveredArea[0] > 0 || localFilters.coveredArea[1] < 10000;
      case "bhk":
        return (
          localFilters.bhk.length > 0 ||
          localFilters.bathrooms.length > 0 ||
          localFilters.balconies.length > 0 ||
          localFilters.additionalRooms.length > 0
        );
      case "propertyType":
        return (
          localFilters.propertyType.length > 0 ||
          localFilters.subPropertyType.length > 0
        );
      case "possession":
        return (
          localFilters.possessionStatus.length > 0 ||
          localFilters.availability.length > 0
        );
      case "saleType":
        return localFilters.saleType.length > 0;
      case "postedBy":
        return localFilters.postedBy.length > 0;
      case "ownership":
        return localFilters.ownership.length > 0;
      case "furnishing":
        return localFilters.furnished.length > 0;
      case "facing":
        return localFilters.facing.length > 0 || localFilters.vastuCompliant;
      case "amenities":
        return localFilters.amenities.length > 0 || localFilters.gatedCommunity;
      case "verified":
        return (
          localFilters.verifiedBadges.length > 0 || localFilters.reraApproved
        );
      case "agriculture":
        return (
          localFilters.waterSource.length > 0 ||
          localFilters.cultivationCrop.length > 0
        );
      default:
        return false;
    }
  };

  // Count total active filters
  const totalActiveFiltersCount = CATEGORY_TABS.filter((t) => isTabActive(t.id)).length;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-t-3xl sm:rounded-3xl w-full max-w-4xl h-[92vh] sm:h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
        
        {/* ─── Modal Header ────────────────────────────────────────── */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/90 dark:bg-slate-950/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#d8232a] text-white font-extrabold flex items-center justify-center shadow-xs">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Filters
                </h2>
                {totalActiveFiltersCount > 0 && (
                  <span className="bg-[#d8232a]/10 text-[#d8232a] dark:text-red-400 font-extrabold text-xs px-2 py-0.5 rounded-full">
                    {totalActiveFiltersCount} applied
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                Refine properties with MagicBricks-grade granular criteria
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-full bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            aria-label="Close filters"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ─── 2-Column MagicBricks Split Body ─────────────────────── */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Sidebar Category Navigation (w-44 sm:w-60) */}
          <div className="w-[140px] sm:w-64 border-r border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 overflow-y-auto shrink-0 divide-y divide-slate-200/60 dark:divide-slate-800/60 no-scrollbar">
            {CATEGORY_TABS.map((tab) => {
              const active = activeTab === tab.id;
              const hasSelection = isTabActive(tab.id);
              const Icon = tab.icon;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "w-full text-left px-3 sm:px-4 py-3.5 sm:py-4 flex items-center justify-between text-xs font-bold transition-all cursor-pointer relative",
                    active
                      ? "bg-white dark:bg-slate-900 text-[#d8232a] dark:text-red-400 font-extrabold shadow-xs"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900"
                  )}
                >
                  {/* Left accent bar on active */}
                  {active && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#d8232a] rounded-r-full" />
                  )}

                  <div className="flex items-center gap-2 sm:gap-2.5 truncate">
                    <Icon className={cn("w-4 h-4 shrink-0", active ? "text-[#d8232a]" : "text-slate-400")} />
                    <span className="truncate leading-tight">{tab.label}</span>
                  </div>

                  {/* Active selection dot indicator */}
                  {hasSelection && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 ml-1 shadow-xs ring-2 ring-white dark:ring-slate-900" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Interactive Content Pane */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-7 space-y-6 text-xs no-scrollbar bg-white dark:bg-slate-900">
            
            {/* ─── TAB 1: BUDGET / PRICE ─── */}
            {activeTab === "budget" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="font-heading text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <IndianRupee className="w-4 h-4 text-[#d8232a]" /> Budget / Price Range
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Select your exact financial range or pick quick presets
                  </p>
                </div>

                {/* Min to Max Selectors */}
                <div className="bg-slate-50 dark:bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider">
                      Selected Range
                    </span>
                    <span className="font-black text-[#d8232a] text-sm sm:text-base">
                      {formatINRWords(localFilters.budget[0])} – {formatINRWords(localFilters.budget[1], true)}
                    </span>
                  </div>

                  {/* Dual-Handle Slider */}
                  <Slider
                    min={0}
                    max={100000000}
                    step={500000}
                    value={localFilters.budget}
                    onValueChange={(val) =>
                      setLocalFilters({ ...localFilters, budget: val as [number, number] })
                    }
                    className="w-full py-2"
                  />

                  {/* Min / Max labels */}
                  <div className="flex justify-between text-[11px] font-bold text-slate-400 dark:text-slate-500">
                    <span>₹0 (Min)</span>
                    <span>₹10+ Crores (Max)</span>
                  </div>

                  {/* Dropdowns row */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                        Min Price
                      </label>
                      <select
                        value={localFilters.budget[0]}
                        onChange={(e) =>
                          setLocalFilters({
                            ...localFilters,
                            budget: [parseInt(e.target.value, 10), localFilters.budget[1]],
                          })
                        }
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-[#d8232a] outline-none"
                      >
                        <option value={0}>₹ 0 (Min)</option>
                        <option value={1000000}>₹ 10 L</option>
                        <option value={2000000}>₹ 20 L</option>
                        <option value={3000000}>₹ 30 L</option>
                        <option value={4000000}>₹ 40 L</option>
                        <option value={5000000}>₹ 50 L</option>
                        <option value={7500000}>₹ 75 L</option>
                        <option value={10000000}>₹ 1 Cr</option>
                        <option value={15000000}>₹ 1.5 Cr</option>
                        <option value={20000000}>₹ 2 Cr</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                        Max Price
                      </label>
                      <select
                        value={localFilters.budget[1]}
                        onChange={(e) =>
                          setLocalFilters({
                            ...localFilters,
                            budget: [localFilters.budget[0], parseInt(e.target.value, 10)],
                          })
                        }
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-[#d8232a] outline-none"
                      >
                        <option value={100000000}>Any Price (Max)</option>
                        <option value={3000000}>₹ 30 L</option>
                        <option value={5000000}>₹ 50 L</option>
                        <option value={7500000}>₹ 75 L</option>
                        <option value={10000000}>₹ 1 Cr</option>
                        <option value={15000000}>₹ 1.5 Cr</option>
                        <option value={20000000}>₹ 2 Cr</option>
                        <option value={30000000}>₹ 3 Cr</option>
                        <option value={50000000}>₹ 5 Cr</option>
                        <option value={100000000}>₹ 10+ Cr</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Popular Quick Presets */}
                <div className="space-y-2">
                  <label className="font-extrabold uppercase text-slate-400 text-[10px] tracking-wider block">
                    Popular Budget Segments
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "Any Price", min: 0, max: 100000000 },
                      { label: "Under 30L", min: 0, max: 3000000 },
                      { label: "30L – 50L", min: 3000000, max: 5000000 },
                      { label: "50L – 70L", min: 5000000, max: 7000000 },
                      { label: "70L – 90L", min: 7000000, max: 9000000 },
                      { label: "90L – 1.2 Cr", min: 9000000, max: 12000000 },
                      { label: "1.2 Cr – 1.5 Cr", min: 12000000, max: 15000000 },
                      { label: "1.5 Cr – 2 Cr", min: 15000000, max: 20000000 },
                      { label: "Above 2 Cr", min: 20000000, max: 100000000 },
                    ].map((preset) => {
                      const isSelected =
                        localFilters.budget[0] === preset.min &&
                        localFilters.budget[1] === preset.max;
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() =>
                            setLocalFilters({ ...localFilters, budget: [preset.min, preset.max] })
                          }
                          className={cn(
                            "py-2 px-3.5 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5",
                            isSelected
                              ? "bg-[#e6f4f2] text-[#008075] border-[#008075]/40 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-700 shadow-xs"
                              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                          )}
                        >
                          {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-slate-400" />}
                          <span>{preset.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ─── TAB 2: COVERED AREA (SQFT) ─── */}
            {activeTab === "area" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="font-heading text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <SquareDashed className="w-4 h-4 text-[#d8232a]" /> Covered Area (sqft)
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Filter by built-up and carpet area specifications
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider">
                      Area Range
                    </span>
                    <span className="font-black text-[#008075] text-sm sm:text-base">
                      {localFilters.coveredArea[0]} sqft – {localFilters.coveredArea[1] >= 10000 ? "10,000+ sqft" : `${localFilters.coveredArea[1]} sqft`}
                    </span>
                  </div>

                  <Slider
                    min={0}
                    max={10000}
                    step={100}
                    value={localFilters.coveredArea}
                    onValueChange={(val) =>
                      setLocalFilters({ ...localFilters, coveredArea: val as [number, number] })
                    }
                    className="w-full py-2"
                  />

                  {/* Dropdowns row */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                        Min Area
                      </label>
                      <select
                        value={localFilters.coveredArea[0]}
                        onChange={(e) =>
                          setLocalFilters({
                            ...localFilters,
                            coveredArea: [parseInt(e.target.value, 10), localFilters.coveredArea[1]],
                          })
                        }
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-[#008075] outline-none"
                      >
                        <option value={0}>0 sqft (Min)</option>
                        <option value={500}>500 sqft</option>
                        <option value={800}>800 sqft</option>
                        <option value={1000}>1,000 sqft</option>
                        <option value={1500}>1,500 sqft</option>
                        <option value={2000}>2,000 sqft</option>
                        <option value={3000}>3,000 sqft</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                        Max Area
                      </label>
                      <select
                        value={localFilters.coveredArea[1]}
                        onChange={(e) =>
                          setLocalFilters({
                            ...localFilters,
                            coveredArea: [localFilters.coveredArea[0], parseInt(e.target.value, 10)],
                          })
                        }
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-[#008075] outline-none"
                      >
                        <option value={10000}>10,000+ sqft (Max)</option>
                        <option value={1000}>1,000 sqft</option>
                        <option value={1500}>1,500 sqft</option>
                        <option value={2000}>2,000 sqft</option>
                        <option value={2500}>2,500 sqft</option>
                        <option value={3000}>3,000 sqft</option>
                        <option value={5000}>5,000 sqft</option>
                        <option value={10000}>10,000+ sqft</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="font-extrabold uppercase text-slate-400 text-[10px] tracking-wider block">
                    Area Presets
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "Under 500 sqft", min: 0, max: 500 },
                      { label: "500 – 1000 sqft", min: 500, max: 1000 },
                      { label: "1000 – 1500 sqft", min: 1000, max: 1500 },
                      { label: "1500 – 2000 sqft", min: 1500, max: 2000 },
                      { label: "2000 – 3000 sqft", min: 2000, max: 3000 },
                      { label: "3000+ sqft", min: 3000, max: 10000 },
                    ].map((preset) => {
                      const isSelected =
                        localFilters.coveredArea[0] === preset.min &&
                        localFilters.coveredArea[1] === preset.max;
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() =>
                            setLocalFilters({ ...localFilters, coveredArea: [preset.min, preset.max] })
                          }
                          className={cn(
                            "py-2 px-3.5 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5",
                            isSelected
                              ? "bg-[#e6f4f2] text-[#008075] border-[#008075]/40 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-700 shadow-xs"
                              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                          )}
                        >
                          {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-slate-400" />}
                          <span>{preset.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ─── TAB 3: BHK & SPACE ─── */}
            {activeTab === "bhk" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="font-heading text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Home className="w-4 h-4 text-[#d8232a]" /> Bedrooms, Bathrooms & Space
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Select number of bedrooms, bathrooms, and additional utility rooms
                  </p>
                </div>

                {/* BHK Chips */}
                <div className="space-y-2.5">
                  <label className="font-extrabold uppercase text-slate-400 text-[10px] tracking-wider block">
                    Bedrooms (BHK)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {["1", "2", "3", "4", "4+"].map((bhk) => {
                      const isSelected = localFilters.bhk.includes(bhk);
                      return (
                        <button
                          key={bhk}
                          type="button"
                          onClick={() => toggleArrayFilter("bhk", bhk)}
                          className={cn(
                            "py-2 px-4 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5",
                            isSelected
                              ? "bg-[#e6f4f2] text-[#008075] border-[#008075]/40 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-700 shadow-xs"
                              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                          )}
                        >
                          {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-slate-400" />}
                          <span>{bhk === "4+" ? "4+ BHK" : `${bhk} BHK`}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Bathrooms */}
                <div className="space-y-2.5">
                  <label className="font-extrabold uppercase text-slate-400 text-[10px] tracking-wider block">
                    Bathrooms
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {["1", "2", "3", "4+"].map((bath) => {
                      const isSelected = localFilters.bathrooms.includes(bath);
                      return (
                        <button
                          key={bath}
                          type="button"
                          onClick={() => toggleArrayFilter("bathrooms", bath)}
                          className={cn(
                            "py-2 px-4 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5",
                            isSelected
                              ? "bg-[#e6f4f2] text-[#008075] border-[#008075]/40 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-700 shadow-xs"
                              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                          )}
                        >
                          {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-slate-400" />}
                          <span>{bath === "4+" ? "4+ Baths" : `${bath} Bath`}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Additional Rooms */}
                <div className="space-y-2.5">
                  <label className="font-extrabold uppercase text-slate-400 text-[10px] tracking-wider block">
                    Additional Rooms
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "Pooja Room", val: "pooja" },
                      { label: "Study Room", val: "study" },
                      { label: "Servant Room", val: "servant" },
                      { label: "Store Room", val: "store" },
                    ].map((room) => {
                      const isSelected = localFilters.additionalRooms.includes(room.val);
                      return (
                        <button
                          key={room.val}
                          type="button"
                          onClick={() => toggleArrayFilter("additionalRooms", room.val)}
                          className={cn(
                            "py-2 px-4 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5",
                            isSelected
                              ? "bg-[#e6f4f2] text-[#008075] border-[#008075]/40 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-700 shadow-xs"
                              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                          )}
                        >
                          {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-slate-400" />}
                          <span>{room.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ─── TAB 4: SUB PROPERTY TYPE ─── */}
            {activeTab === "propertyType" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="font-heading text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#d8232a]" /> Sub Property Type
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Select specific residential, commercial, or land formats
                  </p>
                </div>

                <div className="space-y-2.5">
                  <div className="flex flex-wrap gap-2.5">
                    {[
                      { label: "ALL RESIDENTIAL", val: "all-residential" },
                      { label: "Multistorey Apartment", val: "apartment" },
                      { label: "Builder Floor Apartment", val: "builder-floor" },
                      { label: "Residential House / Individual House", val: "independent-house" },
                      { label: "Villa / Gated Community Villa", val: "villa" },
                      { label: "Residential Plot / Venture Land", val: "residential-land" },
                      { label: "Penthouse / Duplex", val: "penthouse" },
                      { label: "Studio Apartment", val: "studio" },
                      { label: "Commercial Office / Space", val: "commercial-spaces" },
                      { label: "Commercial Shop / Showroom", val: "shops" },
                      { label: "Agricultural Land", val: "agricultural-lands" },
                      { label: "Farm House", val: "farmhouse" },
                    ].map((type) => {
                      const isSelected =
                        type.val === "all-residential"
                          ? localFilters.propertyType.length === 0 ||
                            ["apartment", "villa", "independent-house"].every((t) =>
                              localFilters.propertyType.includes(t)
                            )
                          : localFilters.propertyType.includes(type.val) ||
                            localFilters.subPropertyType.includes(type.val);

                      return (
                        <button
                          key={type.val}
                          type="button"
                          onClick={() => {
                            if (type.val === "all-residential") {
                              setLocalFilters((prev) => ({
                                ...prev,
                                propertyType: ["apartment", "villa", "independent-house"],
                              }));
                            } else {
                              toggleArrayFilter("propertyType", type.val);
                            }
                          }}
                          className={cn(
                            "py-2.5 px-4 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5",
                            isSelected
                              ? "bg-[#e6f4f2] text-[#008075] border-[#008075]/40 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-700 shadow-xs"
                              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                          )}
                        >
                          {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-slate-400" />}
                          <span>{type.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ─── TAB 5: POSSESSION STATUS ─── */}
            {activeTab === "possession" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="font-heading text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#d8232a]" /> Possession Status
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Filter by move-in readiness or project completion timeline
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {[
                    { label: "Ready To Move", val: "ready" },
                    { label: "Under Construction", val: "under-construction" },
                  ].map((status) => {
                    const isSelected =
                      localFilters.possessionStatus.includes(status.val) ||
                      localFilters.availability.includes(status.val);
                    return (
                      <button
                        key={status.val}
                        type="button"
                        onClick={() => {
                          toggleArrayFilter("possessionStatus", status.val);
                          toggleArrayFilter("availability", status.val);
                        }}
                        className={cn(
                          "py-3 px-5 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-2",
                          isSelected
                            ? "bg-[#e6f4f2] text-[#008075] border-[#008075]/40 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-700 shadow-xs"
                            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                        )}
                      >
                        {isSelected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4 text-slate-400" />}
                        <span>{status.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── TAB 6: SALE TYPE ─── */}
            {activeTab === "saleType" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="font-heading text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#d8232a]" /> Sale Type
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Choose between brand new development launches or verified resale properties
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {[
                    { label: "New Launch / New Projects", val: "new" },
                    { label: "Resale Properties", val: "resale" },
                  ].map((sale) => {
                    const isSelected = localFilters.saleType.includes(sale.val);
                    return (
                      <button
                        key={sale.val}
                        type="button"
                        onClick={() => toggleArrayFilter("saleType", sale.val)}
                        className={cn(
                          "py-3 px-5 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-2",
                          isSelected
                            ? "bg-[#e6f4f2] text-[#008075] border-[#008075]/40 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-700 shadow-xs"
                            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                        )}
                      >
                        {isSelected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4 text-slate-400" />}
                        <span>{sale.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── TAB 7: POSTED BY ─── */}
            {activeTab === "postedBy" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="font-heading text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-[#d8232a]" /> Posted By
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Filter by seller classification to eliminate unwanted broker intermediaries
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {[
                    { label: "Owner (Zero Brokerage)", val: "owner" },
                    { label: "Verified Agent", val: "agent" },
                    { label: "Builder / Developer", val: "builder" },
                  ].map((poster) => {
                    const isSelected = localFilters.postedBy.includes(poster.val);
                    return (
                      <button
                        key={poster.val}
                        type="button"
                        onClick={() => toggleArrayFilter("postedBy", poster.val)}
                        className={cn(
                          "py-3 px-5 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-2",
                          isSelected
                            ? "bg-[#e6f4f2] text-[#008075] border-[#008075]/40 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-700 shadow-xs"
                            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                        )}
                      >
                        {isSelected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4 text-slate-400" />}
                        <span>{poster.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── TAB 8: OWNERSHIP ─── */}
            {activeTab === "ownership" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="font-heading text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Key className="w-4 h-4 text-[#d8232a]" /> Property Ownership Type
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Legal ownership title and deed types
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {[
                    { label: "Freehold", val: "freehold" },
                    { label: "Leasehold", val: "leasehold" },
                    { label: "Power of Attorney (POA)", val: "poa" },
                    { label: "Co-operative Society", val: "society" },
                  ].map((own) => {
                    const isSelected = localFilters.ownership.includes(own.val);
                    return (
                      <button
                        key={own.val}
                        type="button"
                        onClick={() => toggleArrayFilter("ownership", own.val)}
                        className={cn(
                          "py-3 px-5 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-2",
                          isSelected
                            ? "bg-[#e6f4f2] text-[#008075] border-[#008075]/40 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-700 shadow-xs"
                            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                        )}
                      >
                        {isSelected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4 text-slate-400" />}
                        <span>{own.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── TAB 9: FURNISHING ─── */}
            {activeTab === "furnishing" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="font-heading text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <DoorOpen className="w-4 h-4 text-[#d8232a]" /> Furnishing Status
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Filter by interior furnishing and readiness
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {[
                    { label: "Furnished", val: "furnished" },
                    { label: "Semi-Furnished", val: "semi-furnished" },
                    { label: "Unfurnished", val: "unfurnished" },
                  ].map((furn) => {
                    const isSelected = localFilters.furnished.includes(furn.val);
                    return (
                      <button
                        key={furn.val}
                        type="button"
                        onClick={() => toggleArrayFilter("furnished", furn.val)}
                        className={cn(
                          "py-3 px-5 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-2",
                          isSelected
                            ? "bg-[#e6f4f2] text-[#008075] border-[#008075]/40 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-700 shadow-xs"
                            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                        )}
                      >
                        {isSelected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4 text-slate-400" />}
                        <span>{furn.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── TAB 10: FACING & VASTU ─── */}
            {activeTab === "facing" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="font-heading text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Compass className="w-4 h-4 text-[#d8232a]" /> Facing Direction & Vastu
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Filter by home entrance orientation and compliance
                  </p>
                </div>

                <div className="space-y-4">
                  {/* 100% Vastu Compliant Pill */}
                  <div>
                    <button
                      type="button"
                      onClick={() =>
                        setLocalFilters({
                          ...localFilters,
                          vastuCompliant: !localFilters.vastuCompliant,
                        })
                      }
                      className={cn(
                        "py-3 px-5 rounded-full text-xs font-black border transition-all cursor-pointer flex items-center gap-2",
                        localFilters.vastuCompliant
                          ? "bg-[#e6f4f2] text-[#008075] border-[#008075]/40 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-700 shadow-xs"
                          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                      )}
                    >
                      {localFilters.vastuCompliant ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4 text-slate-400" />}
                      <span>🧭 100% Vastu Compliant Properties</span>
                    </button>
                  </div>

                  <label className="font-extrabold uppercase text-slate-400 text-[10px] tracking-wider block">
                    Orientation / Facing
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {[
                      { label: "East Facing", val: "east" },
                      { label: "North Facing", val: "north" },
                      { label: "North-East Facing", val: "north-east" },
                      { label: "West Facing", val: "west" },
                      { label: "South Facing", val: "south" },
                      { label: "North-West", val: "north-west" },
                      { label: "South-East", val: "south-east" },
                      { label: "South-West", val: "south-west" },
                    ].map((face) => {
                      const isSelected = localFilters.facing.includes(face.val);
                      return (
                        <button
                          key={face.val}
                          type="button"
                          onClick={() => toggleArrayFilter("facing", face.val)}
                          className={cn(
                            "py-2.5 px-4 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5",
                            isSelected
                              ? "bg-[#e6f4f2] text-[#008075] border-[#008075]/40 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-700 shadow-xs"
                              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                          )}
                        >
                          {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-slate-400" />}
                          <span>{face.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ─── TAB 11: AMENITIES ─── */}
            {activeTab === "amenities" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="font-heading text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Car className="w-4 h-4 text-[#d8232a]" /> Society Amenities & Security
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Filter by clubhouse, security, sports, and parking facilities
                  </p>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  {[
                    { label: "Gated Security & CCTV", val: "security" },
                    { label: "Lift / Elevator", val: "lift" },
                    { label: "100% Power Backup", val: "power_backup" },
                    { label: "Reserved Car Parking", val: "parking" },
                    { label: "Swimming Pool", val: "pool" },
                    { label: "Clubhouse & Community Hall", val: "clubhouse" },
                    { label: "Gymnasium", val: "gym" },
                    { label: "Children Play Area / Park", val: "park" },
                    { label: "Gas Pipeline", val: "gas" },
                    { label: "Rainwater Harvesting", val: "rainwater" },
                    { label: "Visitor Parking", val: "visitor_parking" },
                  ].map((amenity) => {
                    const isSelected =
                      localFilters.amenities.includes(amenity.val) ||
                      (amenity.val === "security" && localFilters.gatedCommunity);

                    return (
                      <button
                        key={amenity.val}
                        type="button"
                        onClick={() => {
                          if (amenity.val === "security") {
                            setLocalFilters((prev) => ({
                              ...prev,
                              gatedCommunity: !prev.gatedCommunity,
                            }));
                          }
                          toggleArrayFilter("amenities", amenity.val);
                        }}
                        className={cn(
                          "py-2.5 px-4 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5",
                          isSelected
                            ? "bg-[#e6f4f2] text-[#008075] border-[#008075]/40 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-700 shadow-xs"
                            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                        )}
                      >
                        {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-slate-400" />}
                        <span>{amenity.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── TAB 12: VERIFIED & TRUST ─── */}
            {activeTab === "verified" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="font-heading text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#d8232a]" /> Verified & Trust Criteria
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Filter by official RERA approvals, video verified badges, and zero brokerage
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {[
                    { label: "🛡️ RERA Approved Only", val: "rera" },
                    { label: "📹 On-Ground Video Verified", val: "video_verified" },
                    { label: "🤝 Zero Brokerage Properties", val: "zero_brokerage" },
                  ].map((badge) => {
                    const isSelected =
                      localFilters.verifiedBadges.includes(badge.val) ||
                      (badge.val === "rera" && localFilters.reraApproved);

                    return (
                      <button
                        key={badge.val}
                        type="button"
                        onClick={() => {
                          if (badge.val === "rera") {
                            setLocalFilters((prev) => ({
                              ...prev,
                              reraApproved: !prev.reraApproved,
                            }));
                          }
                          toggleArrayFilter("verifiedBadges", badge.val);
                        }}
                        className={cn(
                          "py-3 px-5 rounded-full text-xs font-black border transition-all cursor-pointer flex items-center gap-2",
                          isSelected
                            ? "bg-[#e6f4f2] text-[#008075] border-[#008075]/40 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-700 shadow-xs"
                            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                        )}
                      >
                        {isSelected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4 text-slate-400" />}
                        <span>{badge.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── TAB 13: WATER & AGRICULTURE ─── */}
            {activeTab === "agriculture" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="font-heading text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Sprout className="w-4 h-4 text-[#d8232a]" /> Agricultural & Farm House Criteria
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Tailored for AP Land & Crop Specifications (Water sources & Soil cultivation)
                  </p>
                </div>

                {/* Water Source */}
                <div className="space-y-2.5">
                  <label className="font-extrabold uppercase text-slate-400 text-[10px] tracking-wider block">
                    Water Source
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {["Borewell Water", "Lake Water", "Canal Water", "Municipal Water"].map((w) => {
                      const isSelected = localFilters.waterSource.includes(w);
                      return (
                        <button
                          key={w}
                          type="button"
                          onClick={() => toggleArrayFilter("waterSource", w)}
                          className={cn(
                            "py-2.5 px-4 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5",
                            isSelected
                              ? "bg-[#e6f4f2] text-[#008075] border-[#008075]/40 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-700 shadow-xs"
                              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                          )}
                        >
                          {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-slate-400" />}
                          <span>{w}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Cultivation Crop */}
                <div className="space-y-2.5">
                  <label className="font-extrabold uppercase text-slate-400 text-[10px] tracking-wider block">
                    Cultivation Crop Types
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {["Paddy", "Chilli", "Cotton", "Horticulture", "Tobacco"].map((crop) => {
                      const isSelected = localFilters.cultivationCrop.includes(crop);
                      return (
                        <button
                          key={crop}
                          type="button"
                          onClick={() => toggleArrayFilter("cultivationCrop", crop)}
                          className={cn(
                            "py-2.5 px-4 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5",
                            isSelected
                              ? "bg-[#e6f4f2] text-[#008075] border-[#008075]/40 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-700 shadow-xs"
                              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                          )}
                        >
                          {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-slate-400" />}
                          <span>{crop}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* ─── MagicBricks Bottom Sticky Action Bar ─────────────────── */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center justify-between gap-4 shrink-0 shadow-lg">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs font-black text-[#d8232a] dark:text-red-400 hover:underline flex items-center gap-1.5 cursor-pointer py-2 px-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear All</span>
          </button>

          <button
            type="button"
            onClick={handleApply}
            className="py-3 px-7 sm:px-10 bg-[#d8232a] hover:bg-[#b81d23] text-white font-black text-xs sm:text-sm rounded-full shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer flex items-center gap-2"
          >
            <span>View {totalResults} Properties</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

      </div>
    </div>
  );
}

// Fallback exports for backward compatibility
export function SearchFilters({ filters, setFilters }: any) {
  return null;
}
