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
  Clock,
  Briefcase,
  Users,
  Tv,
  Calendar,
  Warehouse,
  Percent,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatINR, formatINRWords, cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";

export interface FilterState {
  query: string;
  transactionType: "buy" | "rent" | "commercial" | "pg" | "all";
  listingType: string[];
  propertyCategory: "residential" | "commercial" | "land" | "all";
  propertyType: string[];
  subPropertyType: string[];
  bhk: string[];
  bathrooms: string[];
  balconies: string[];
  additionalRooms: string[];
  budget: [number, number];
  coveredArea: [number, number];
  possessionStatus: string[];
  propertyAge: string[];
  saleType: string[];
  postedBy: string[];
  ownership: string[];
  furnished: string[];
  furnishingItems: string[];
  floorRange: string[];
  facing: string[];
  amenities: string[];
  parking: string[];
  verifiedBadges: string[];
  mediaTypes: string[];
  postedSince: string;
  specialFeatures: string[];
  
  // Rent Specific
  tenantPreference: string[];
  petsAllowed: boolean;
  nonVegAllowed: boolean;
  
  // PG Specific
  pgGender: string[];
  pgSharing: string[];
  foodIncluded: boolean;
  
  // Commercial Specific
  commercialType: string[];
  furnishingGrade: string[];
  
  // Agricultural & AP Specific
  waterSource: string[];
  cultivationCrop: string[];
  
  // Quick Toggles
  vastuCompliant: boolean;
  gatedCommunity: boolean;
  reraApproved: boolean;
  ageRange: string[];
  availability: string[];
}

export const initialFilterState: FilterState = {
  query: "",
  transactionType: "all",
  listingType: [],
  propertyCategory: "all",
  propertyType: [],
  subPropertyType: [],
  bhk: [],
  bathrooms: [],
  balconies: [],
  additionalRooms: [],
  budget: [0, 100000000],
  coveredArea: [0, 10000],
  possessionStatus: [],
  propertyAge: [],
  saleType: [],
  postedBy: [],
  ownership: [],
  furnished: [],
  furnishingItems: [],
  floorRange: [],
  facing: [],
  amenities: [],
  parking: [],
  verifiedBadges: [],
  mediaTypes: [],
  postedSince: "any",
  specialFeatures: [],
  
  tenantPreference: [],
  petsAllowed: false,
  nonVegAllowed: false,
  
  pgGender: [],
  pgSharing: [],
  foodIncluded: false,
  
  commercialType: [],
  furnishingGrade: [],
  
  waterSource: [],
  cultivationCrop: [],
  
  vastuCompliant: false,
  gatedCommunity: false,
  reraApproved: false,
  ageRange: [],
  availability: [],
};

interface SearchFiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onApplyFilters: (newFilters: FilterState) => void;
  totalResults: number;
}

// ─── Left Sidebar Category Tabs (MagicBricks Master Hierarchy) ───
const ALL_CATEGORY_TABS = [
  { id: "transaction", label: "Transaction Type", icon: Briefcase },
  { id: "budget", label: "Budget / Price", icon: IndianRupee },
  { id: "propertyType", label: "Property Type", icon: Building2 },
  { id: "bhk", label: "BHK & Space", icon: Home },
  { id: "area", label: "Covered Area (sqft)", icon: SquareDashed },
  { id: "possession", label: "Possession Status", icon: Sparkles },
  { id: "propertyAge", label: "Property Age", icon: Clock },
  { id: "saleType", label: "Sale Type", icon: Layers },
  { id: "postedBy", label: "Posted By", icon: UserCheck },
  { id: "furnishing", label: "Furnishing & Items", icon: DoorOpen },
  { id: "floor", label: "Floor Selection", icon: Layers },
  { id: "facing", label: "Facing & Vastu", icon: Compass },
  { id: "ownership", label: "Ownership Title", icon: Key },
  { id: "amenities", label: "Society Amenities", icon: Car },
  { id: "parking", label: "Parking Space", icon: Car },
  { id: "verified", label: "Verified & RERA", icon: ShieldCheck },
  { id: "media", label: "Photos & Videos", icon: Video },
  { id: "postedSince", label: "Posted Date", icon: Calendar },
  { id: "rentSpecific", label: "Rental Preferences", icon: Users },
  { id: "pgSpecific", label: "PG & Co-living", icon: Users },
  { id: "commercialSpecific", label: "Commercial Office/Shop", icon: Warehouse },
  { id: "agriculture", label: "Water & Agriculture", icon: Sprout },
] as const;

type TabId = (typeof ALL_CATEGORY_TABS)[number]["id"];

export function SearchFiltersModal({
  isOpen,
  onClose,
  filters,
  onApplyFilters,
  totalResults,
}: SearchFiltersModalProps) {
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);
  const [activeTab, setActiveTab] = useState<TabId>("budget");
  const [amenitySearch, setAmenitySearch] = useState("");

  // Keep local filters synchronized when modal opens
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

  // Helper: check if a specific tab has any active filter applied
  const isTabActive = (tabId: TabId): boolean => {
    switch (tabId) {
      case "transaction":
        return localFilters.transactionType !== "all" || localFilters.listingType.length > 0;
      case "budget":
        return localFilters.budget[0] > 0 || localFilters.budget[1] < 100000000;
      case "propertyType":
        return localFilters.propertyType.length > 0 || localFilters.subPropertyType.length > 0;
      case "bhk":
        return (
          localFilters.bhk.length > 0 ||
          localFilters.bathrooms.length > 0 ||
          localFilters.balconies.length > 0 ||
          localFilters.additionalRooms.length > 0
        );
      case "area":
        return localFilters.coveredArea[0] > 0 || localFilters.coveredArea[1] < 10000;
      case "possession":
        return localFilters.possessionStatus.length > 0 || localFilters.availability.length > 0;
      case "propertyAge":
        return localFilters.propertyAge.length > 0 || localFilters.ageRange.length > 0;
      case "saleType":
        return localFilters.saleType.length > 0;
      case "postedBy":
        return localFilters.postedBy.length > 0;
      case "furnishing":
        return localFilters.furnished.length > 0 || localFilters.furnishingItems.length > 0;
      case "floor":
        return localFilters.floorRange.length > 0;
      case "facing":
        return localFilters.facing.length > 0 || localFilters.vastuCompliant;
      case "ownership":
        return localFilters.ownership.length > 0;
      case "amenities":
        return localFilters.amenities.length > 0 || localFilters.gatedCommunity;
      case "parking":
        return localFilters.parking.length > 0;
      case "verified":
        return localFilters.verifiedBadges.length > 0 || localFilters.reraApproved;
      case "media":
        return localFilters.mediaTypes.length > 0;
      case "postedSince":
        return localFilters.postedSince !== "any";
      case "rentSpecific":
        return localFilters.tenantPreference.length > 0 || localFilters.petsAllowed || localFilters.nonVegAllowed;
      case "pgSpecific":
        return localFilters.pgGender.length > 0 || localFilters.pgSharing.length > 0 || localFilters.foodIncluded;
      case "commercialSpecific":
        return localFilters.commercialType.length > 0 || localFilters.furnishingGrade.length > 0;
      case "agriculture":
        return localFilters.waterSource.length > 0 || localFilters.cultivationCrop.length > 0;
      default:
        return false;
    }
  };

  const totalActiveCount = ALL_CATEGORY_TABS.filter((t) => isTabActive(t.id)).length;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-t-3xl sm:rounded-3xl w-full max-w-5xl h-[94vh] sm:h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
        
        {/* ─── Header ────────────────────────────────────────────── */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/95 dark:bg-slate-950/95 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center shadow-xs">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  ROAD Discovery Filters
                </h2>
                {totalActiveCount > 0 && (
                  <span className="bg-amber-500/20 text-amber-600 dark:text-amber-400 font-extrabold text-xs px-2.5 py-0.5 rounded-full">
                    {totalActiveCount} active
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                All real estate criteria tailored for Residential, Commercial, Land & Rentals
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

        {/* ─── 2-Column Split Body ───────────────────────────────── */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Sidebar Category Navigation (Scrollable list with active dot) */}
          <div className="w-[145px] sm:w-64 border-r border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 overflow-y-auto shrink-0 divide-y divide-slate-200/60 dark:divide-slate-800/60 no-scrollbar">
            {ALL_CATEGORY_TABS.map((tab) => {
              const active = activeTab === tab.id;
              const hasSelection = isTabActive(tab.id);
              const Icon = tab.icon;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "w-full text-left px-3 sm:px-4 py-3 sm:py-3.5 flex items-center justify-between text-xs font-bold transition-all cursor-pointer relative",
                    active
                      ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 font-black shadow-xs"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900"
                  )}
                >
                  {/* Left accent indicator */}
                  {active && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500 rounded-r-full" />
                  )}

                  <div className="flex items-center gap-2 sm:gap-2.5 truncate">
                    <Icon className={cn("w-4 h-4 shrink-0", active ? "text-amber-500" : "text-slate-400")} />
                    <span className="truncate leading-tight text-[11px] sm:text-xs">{tab.label}</span>
                  </div>

                  {/* Active selection dot indicator */}
                  {hasSelection && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 ml-1 ring-2 ring-white dark:ring-slate-900 shadow-xs" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Content Pane */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-7 space-y-6 text-xs no-scrollbar bg-white dark:bg-slate-900">

            {/* ─── TAB: TRANSACTION TYPE ─── */}
            {activeTab === "transaction" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="font-heading text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-amber-500" /> Transaction Type & Purpose
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Select your purpose: Buy, Rent, Commercial, or PG
                  </p>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  {[
                    { label: "Buy / For Sale", val: "buy", listVal: "sale" },
                    { label: "Rent / To Lease", val: "rent", listVal: "rent" },
                    { label: "Commercial Buy/Lease", val: "commercial", listVal: "commercial" },
                    { label: "PG & Co-Living", val: "pg", listVal: "pg" },
                  ].map((t) => {
                    const isSelected = localFilters.transactionType === t.val || localFilters.listingType.includes(t.listVal);
                    return (
                      <button
                        key={t.val}
                        type="button"
                        onClick={() => {
                          setLocalFilters((prev) => ({
                            ...prev,
                            transactionType: t.val as any,
                            listingType: [t.listVal],
                          }));
                        }}
                        className={cn(
                          "py-3 px-5 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-2",
                          isSelected
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/50 font-black shadow-xs"
                            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                        )}
                      >
                        {isSelected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4 text-slate-400" />}
                        <span>{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── TAB: BUDGET / PRICE ─── */}
            {activeTab === "budget" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="font-heading text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <IndianRupee className="w-4 h-4 text-amber-500" /> Budget & Price Range (INR)
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Drag the dual-handle slider or choose popular price segments
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider">
                      Selected Price Range
                    </span>
                    <span className="font-black text-amber-500 text-sm sm:text-base">
                      {formatINRWords(localFilters.budget[0])} – {formatINRWords(localFilters.budget[1], true)}
                    </span>
                  </div>

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

                  <div className="flex justify-between text-[11px] font-bold text-slate-400 dark:text-slate-500">
                    <span>₹0 (Min)</span>
                    <span>₹10+ Crores (Max)</span>
                  </div>

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
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-amber-500 outline-none"
                      >
                        <option value={0}>₹ 0 (Min)</option>
                        <option value={1000000}>₹ 10 L</option>
                        <option value={2500000}>₹ 25 L</option>
                        <option value={5000000}>₹ 50 L</option>
                        <option value={7500000}>₹ 75 L</option>
                        <option value={10000000}>₹ 1 Cr</option>
                        <option value={15000000}>₹ 1.5 Cr</option>
                        <option value={20000000}>₹ 2 Cr</option>
                        <option value={50000000}>₹ 5 Cr</option>
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
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-amber-500 outline-none"
                      >
                        <option value={100000000}>Any Price (Max)</option>
                        <option value={2500000}>₹ 25 L</option>
                        <option value={5000000}>₹ 50 L</option>
                        <option value={7500000}>₹ 75 L</option>
                        <option value={10000000}>₹ 1 Cr</option>
                        <option value={15000000}>₹ 1.5 Cr</option>
                        <option value={20000000}>₹ 2 Cr</option>
                        <option value={50000000}>₹ 5 Cr</option>
                        <option value={100000000}>₹ 10+ Cr</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="space-y-2">
                  <label className="font-extrabold uppercase text-slate-400 text-[10px] tracking-wider block">
                    Popular Price Segments
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "Any Price", min: 0, max: 100000000 },
                      { label: "Under ₹25 L", min: 0, max: 2500000 },
                      { label: "₹25 L – ₹50 L", min: 2500000, max: 5000000 },
                      { label: "₹50 L – ₹75 L", min: 5000000, max: 7500000 },
                      { label: "₹75 L – ₹1 Cr", min: 7500000, max: 10000000 },
                      { label: "₹1 Cr – ₹2 Cr", min: 10000000, max: 20000000 },
                      { label: "₹2 Cr – ₹5 Cr", min: 20000000, max: 50000000 },
                      { label: "₹5 Cr+", min: 50000000, max: 100000000 },
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
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/50 shadow-xs"
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

            {/* ─── TAB: PROPERTY TYPE ─── */}
            {activeTab === "propertyType" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="font-heading text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-amber-500" /> Property Categories & Types
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Select Residential, Commercial, Land, and specific subtypes
                  </p>
                </div>

                {/* Residential */}
                <div className="space-y-2">
                  <label className="font-extrabold uppercase text-amber-600 dark:text-amber-400 text-[10px] tracking-wider block">
                    Residential Properties
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "Apartment / Flat", val: "apartment" },
                      { label: "Independent House", val: "independent-house" },
                      { label: "Villa / Gated Villa", val: "villa" },
                      { label: "Builder Floor", val: "builder-floor" },
                      { label: "Penthouse / Duplex", val: "penthouse" },
                      { label: "Studio Apartment", val: "studio" },
                      { label: "1 RK", val: "1rk" },
                      { label: "Farm House", val: "farmhouse" },
                      { label: "Serviced Apartment", val: "serviced-apartment" },
                    ].map((item) => {
                      const isSelected = localFilters.propertyType.includes(item.val);
                      return (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => toggleArrayFilter("propertyType", item.val)}
                          className={cn(
                            "py-2 px-3.5 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5",
                            isSelected
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/50 shadow-xs"
                              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                          )}
                        >
                          {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-slate-400" />}
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Land & Plots */}
                <div className="space-y-2 pt-2">
                  <label className="font-extrabold uppercase text-emerald-600 dark:text-emerald-400 text-[10px] tracking-wider block">
                    Plots & Lands (Sq.Yds / Acres)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "Residential Plot / Land", val: "residential-land" },
                      { label: "Commercial Plot", val: "commercial-lands" },
                      { label: "Agricultural Land", val: "agricultural-lands" },
                      { label: "Industrial Land", val: "industrial-lands" },
                    ].map((item) => {
                      const isSelected = localFilters.propertyType.includes(item.val);
                      return (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => toggleArrayFilter("propertyType", item.val)}
                          className={cn(
                            "py-2 px-3.5 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5",
                            isSelected
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/50 shadow-xs"
                              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                          )}
                        >
                          {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-slate-400" />}
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Commercial */}
                <div className="space-y-2 pt-2">
                  <label className="font-extrabold uppercase text-blue-600 dark:text-blue-400 text-[10px] tracking-wider block">
                    Commercial Properties
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "Commercial Office Space", val: "commercial-spaces" },
                      { label: "Shop / Showroom", val: "shops" },
                      { label: "Commercial Building", val: "buildings" },
                      { label: "Warehouse / Godown", val: "warehouse" },
                      { label: "Co-working Space", val: "coworking" },
                    ].map((item) => {
                      const isSelected = localFilters.propertyType.includes(item.val);
                      return (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => toggleArrayFilter("propertyType", item.val)}
                          className={cn(
                            "py-2 px-3.5 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5",
                            isSelected
                              ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/50 shadow-xs"
                              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                          )}
                        >
                          {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-slate-400" />}
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ─── TAB: BHK & SPACE ─── */}
            {activeTab === "bhk" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="font-heading text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Home className="w-4 h-4 text-amber-500" /> BHK Configuration, Baths & Rooms
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Select bedrooms, bathrooms, balconies, and additional rooms
                  </p>
                </div>

                {/* BHK */}
                <div className="space-y-2">
                  <label className="font-extrabold uppercase text-slate-400 text-[10px] tracking-wider block">
                    Bedrooms (BHK)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {["1 RK", "1 BHK", "2 BHK", "3 BHK", "4 BHK", "5 BHK", "5+ BHK"].map((bhk) => {
                      const cleanVal = bhk.replace(" BHK", "").replace(" RK", "rk");
                      const isSelected = localFilters.bhk.includes(cleanVal);
                      return (
                        <button
                          key={bhk}
                          type="button"
                          onClick={() => toggleArrayFilter("bhk", cleanVal)}
                          className={cn(
                            "py-2 px-4 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5",
                            isSelected
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/50 shadow-xs"
                              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                          )}
                        >
                          {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-slate-400" />}
                          <span>{bhk}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Bathrooms */}
                <div className="space-y-2 pt-2">
                  <label className="font-extrabold uppercase text-slate-400 text-[10px] tracking-wider block">
                    Bathrooms
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {["1", "2", "3", "4", "5+"].map((bath) => {
                      const isSelected = localFilters.bathrooms.includes(bath);
                      return (
                        <button
                          key={bath}
                          type="button"
                          onClick={() => toggleArrayFilter("bathrooms", bath)}
                          className={cn(
                            "py-2 px-4 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5",
                            isSelected
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/50 shadow-xs"
                              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                          )}
                        >
                          {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-slate-400" />}
                          <span>{bath} Bath{bath === "1" ? "" : "s"}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Balconies */}
                <div className="space-y-2 pt-2">
                  <label className="font-extrabold uppercase text-slate-400 text-[10px] tracking-wider block">
                    Balconies
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {["No Balcony", "1 Balcony", "2 Balconies", "3 Balconies", "4+ Balconies"].map((balc, i) => {
                      const val = i === 0 ? "0" : i === 4 ? "4+" : i.toString();
                      const isSelected = localFilters.balconies.includes(val);
                      return (
                        <button
                          key={balc}
                          type="button"
                          onClick={() => toggleArrayFilter("balconies", val)}
                          className={cn(
                            "py-2 px-3.5 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5",
                            isSelected
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/50 shadow-xs"
                              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                          )}
                        >
                          {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-slate-400" />}
                          <span>{balc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Additional Rooms */}
                <div className="space-y-2 pt-2">
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
                            "py-2 px-3.5 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5",
                            isSelected
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/50 shadow-xs"
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

            {/* ─── TAB: COVERED AREA ─── */}
            {activeTab === "area" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="font-heading text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <SquareDashed className="w-4 h-4 text-amber-500" /> Covered Area & Unit Sizes
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Filter by carpet, built-up, super built-up, and plot area
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider">
                      Area Range
                    </span>
                    <span className="font-black text-amber-500 text-sm sm:text-base">
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
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-amber-500"
                      >
                        <option value={0}>0 sqft (Min)</option>
                        <option value={500}>500 sqft</option>
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
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-amber-500"
                      >
                        <option value={10000}>10,000+ sqft (Max)</option>
                        <option value={1000}>1,000 sqft</option>
                        <option value={1500}>1,500 sqft</option>
                        <option value={2000}>2,000 sqft</option>
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
                      { label: "500 – 1,000 sqft", min: 500, max: 1000 },
                      { label: "1,000 – 1,500 sqft", min: 1000, max: 1500 },
                      { label: "1,500 – 2,000 sqft", min: 1500, max: 2000 },
                      { label: "2,000 – 3,000 sqft", min: 2000, max: 3000 },
                      { label: "3,000 – 5,000 sqft", min: 3000, max: 5000 },
                      { label: "Above 5,000 sqft", min: 5000, max: 10000 },
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
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/50 shadow-xs"
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

            {/* ─── TAB: POSSESSION STATUS ─── */}
            {activeTab === "possession" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="font-heading text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" /> Possession & Handover Timeline
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Filter by move-in readiness or expected handover dates
                  </p>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  {[
                    { label: "Ready to Move", val: "ready" },
                    { label: "Under Construction", val: "under-construction" },
                    { label: "Immediate Possession", val: "immediate" },
                    { label: "Within 3 Months", val: "3months" },
                    { label: "Within 6 Months", val: "6months" },
                    { label: "Within 1 Year", val: "1year" },
                    { label: "After 1 Year", val: "after1year" },
                  ].map((item) => {
                    const isSelected = localFilters.possessionStatus.includes(item.val);
                    return (
                      <button
                        key={item.val}
                        type="button"
                        onClick={() => toggleArrayFilter("possessionStatus", item.val)}
                        className={cn(
                          "py-2.5 px-4 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5",
                          isSelected
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/50 shadow-xs"
                            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                        )}
                      >
                        {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-slate-400" />}
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── TAB: PROPERTY AGE ─── */}
            {activeTab === "propertyAge" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="font-heading text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500" /> Age of Construction
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Filter by building age since completion
                  </p>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  {[
                    { label: "Brand New (Under 1 Year)", val: "0-1" },
                    { label: "1 – 5 Years Old", val: "1-5" },
                    { label: "5 – 10 Years Old", val: "5-10" },
                    { label: "10 – 15 Years Old", val: "10-15" },
                    { label: "15+ Years Old", val: "15+" },
                  ].map((age) => {
                    const isSelected = localFilters.propertyAge.includes(age.val);
                    return (
                      <button
                        key={age.val}
                        type="button"
                        onClick={() => toggleArrayFilter("propertyAge", age.val)}
                        className={cn(
                          "py-2.5 px-4 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5",
                          isSelected
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/50 shadow-xs"
                            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                        )}
                      >
                        {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-slate-400" />}
                        <span>{age.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── TAB: SALE TYPE ─── */}
            {activeTab === "saleType" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="font-heading text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-500" /> Sale Type
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Choose between new development launches, resales, and developer sales
                  </p>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  {[
                    { label: "New Property / New Launch", val: "new" },
                    { label: "Resale Property", val: "resale" },
                    { label: "Owner Resale", val: "owner-resale" },
                    { label: "Developer / Builder Sale", val: "developer-sale" },
                    { label: "Distress Sale", val: "distress" },
                    { label: "Bank Auction", val: "auction" },
                  ].map((st) => {
                    const isSelected = localFilters.saleType.includes(st.val);
                    return (
                      <button
                        key={st.val}
                        type="button"
                        onClick={() => toggleArrayFilter("saleType", st.val)}
                        className={cn(
                          "py-2.5 px-4 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5",
                          isSelected
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/50 shadow-xs"
                            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                        )}
                      >
                        {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-slate-400" />}
                        <span>{st.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── TAB: POSTED BY ─── */}
            {activeTab === "postedBy" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="font-heading text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-amber-500" /> Posted By (Seller Type)
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Filter by seller classification to eliminate unwanted broker fees
                  </p>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  {[
                    { label: "Owner (Zero Brokerage)", val: "owner" },
                    { label: "Verified Agent", val: "agent" },
                    { label: "Builder / Developer", val: "builder" },
                    { label: "ROAD Certified Agent", val: "certified-agent" },
                  ].map((poster) => {
                    const isSelected = localFilters.postedBy.includes(poster.val);
                    return (
                      <button
                        key={poster.val}
                        type="button"
                        onClick={() => toggleArrayFilter("postedBy", poster.val)}
                        className={cn(
                          "py-2.5 px-4 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5",
                          isSelected
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/50 shadow-xs"
                            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                        )}
                      >
                        {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-slate-400" />}
                        <span>{poster.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── TAB: FURNISHING ─── */}
            {activeTab === "furnishing" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="font-heading text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <DoorOpen className="w-4 h-4 text-amber-500" /> Furnishing Status & Appliances
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Filter by furnishing readiness and installed home appliances
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="font-extrabold uppercase text-slate-400 text-[10px] tracking-wider block">
                    Furnishing Level
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {[
                      { label: "Fully Furnished", val: "furnished" },
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
                            "py-2.5 px-4 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5",
                            isSelected
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/50 shadow-xs"
                              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                          )}
                        >
                          {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-slate-400" />}
                          <span>{furn.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="font-extrabold uppercase text-slate-400 text-[10px] tracking-wider block">
                    Included Furniture & Appliances
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "Bed", "Wardrobe", "Sofa", "Dining Table", "TV", "Air Conditioner (AC)",
                      "Refrigerator", "Washing Machine", "Geyser", "Modular Kitchen", "Chimney", "Microwave"
                    ].map((item) => {
                      const cleanVal = item.toLowerCase();
                      const isSelected = localFilters.furnishingItems.includes(cleanVal);
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => toggleArrayFilter("furnishingItems", cleanVal)}
                          className={cn(
                            "py-2 px-3.5 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5",
                            isSelected
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/50 shadow-xs"
                              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                          )}
                        >
                          {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-slate-400" />}
                          <span>{item}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ─── TAB: FLOOR ─── */}
            {activeTab === "floor" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="font-heading text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-500" /> Floor Preference
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Filter by floor position and unit location
                  </p>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  {[
                    { label: "Ground Floor", val: "ground" },
                    { label: "1st – 4th Floor (Lower)", val: "1-4" },
                    { label: "5th – 10th Floor (Middle)", val: "5-10" },
                    { label: "11th – 20th Floor (Higher)", val: "11-20" },
                    { label: "20th+ Floor (Skyline)", val: "20+" },
                    { label: "Top Floor / Penthouse", val: "top" },
                    { label: "Corner Unit", val: "corner" },
                  ].map((floor) => {
                    const isSelected = localFilters.floorRange.includes(floor.val);
                    return (
                      <button
                        key={floor.val}
                        type="button"
                        onClick={() => toggleArrayFilter("floorRange", floor.val)}
                        className={cn(
                          "py-2.5 px-4 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5",
                          isSelected
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/50 shadow-xs"
                            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                        )}
                      >
                        {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-slate-400" />}
                        <span>{floor.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── TAB: FACING & VASTU ─── */}
            {activeTab === "facing" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="font-heading text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Compass className="w-4 h-4 text-amber-500" /> Facing Direction & Vastu Compliance
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Filter by entrance direction and certified Vastu compliance
                  </p>
                </div>

                <div className="space-y-4">
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
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/50 shadow-xs"
                          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                      )}
                    >
                      {localFilters.vastuCompliant ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4 text-slate-400" />}
                      <span>🧭 100% Vastu Compliant Properties Only</span>
                    </button>
                  </div>

                  <label className="font-extrabold uppercase text-slate-400 text-[10px] tracking-wider block">
                    Entrance Orientation
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {[
                      { label: "East Facing", val: "east" },
                      { label: "North Facing", val: "north" },
                      { label: "North-East Facing", val: "north-east" },
                      { label: "West Facing", val: "west" },
                      { label: "South Facing", val: "south" },
                      { label: "North-West Facing", val: "north-west" },
                      { label: "South-East Facing", val: "south-east" },
                      { label: "South-West Facing", val: "south-west" },
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
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/50 shadow-xs"
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

            {/* ─── TAB: OWNERSHIP ─── */}
            {activeTab === "ownership" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="font-heading text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Key className="w-4 h-4 text-amber-500" /> Property Ownership Title
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Filter by legal title and deed registration type
                  </p>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  {[
                    { label: "Freehold Title", val: "freehold" },
                    { label: "Leasehold Title", val: "leasehold" },
                    { label: "Co-operative Society", val: "society" },
                    { label: "Power of Attorney (POA)", val: "poa" },
                  ].map((own) => {
                    const isSelected = localFilters.ownership.includes(own.val);
                    return (
                      <button
                        key={own.val}
                        type="button"
                        onClick={() => toggleArrayFilter("ownership", own.val)}
                        className={cn(
                          "py-2.5 px-4 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5",
                          isSelected
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/50 shadow-xs"
                            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                        )}
                      >
                        {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-slate-400" />}
                        <span>{own.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── TAB: AMENITIES ─── */}
            {activeTab === "amenities" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="font-heading text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Car className="w-4 h-4 text-amber-500" /> Society Amenities & Facilities
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Filter by clubhouse, security, sports, and parking facilities
                  </p>
                </div>

                {/* Search amenities */}
                <input
                  type="text"
                  placeholder="Search amenities (e.g. Pool, Gym, Lift, Solar)..."
                  value={amenitySearch}
                  onChange={(e) => setAmenitySearch(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-amber-500"
                />

                <div className="space-y-4">
                  {/* Building & Safety */}
                  <div className="space-y-2">
                    <label className="font-extrabold uppercase text-slate-400 text-[10px] tracking-wider block">
                      Building & Safety
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        "Lift / Elevator", "100% Power Backup", "24x7 Security & CCTV",
                        "Intercom Facility", "Fire Safety System", "Visitor Parking",
                        "Service Lift", "Maintenance Staff", "Water Storage Tanks"
                      ].filter((a) => a.toLowerCase().includes(amenitySearch.toLowerCase())).map((item) => {
                        const val = item.toLowerCase();
                        const isSelected = localFilters.amenities.includes(val);
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => toggleArrayFilter("amenities", val)}
                            className={cn(
                              "py-2 px-3.5 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5",
                              isSelected
                                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/50 shadow-xs"
                                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                            )}
                          >
                            {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-slate-400" />}
                            <span>{item}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Lifestyle & Sports */}
                  <div className="space-y-2 pt-2">
                    <label className="font-extrabold uppercase text-slate-400 text-[10px] tracking-wider block">
                      Lifestyle & Clubhouse
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        "Swimming Pool", "Gymnasium / Fitness Center", "Club House",
                        "Park / Landscaped Garden", "Kids Play Area", "Jogging / Walking Track",
                        "Indoor Games Room", "Party / Banquet Hall", "Badminton / Tennis Court"
                      ].filter((a) => a.toLowerCase().includes(amenitySearch.toLowerCase())).map((item) => {
                        const val = item.toLowerCase();
                        const isSelected = localFilters.amenities.includes(val);
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => toggleArrayFilter("amenities", val)}
                            className={cn(
                              "py-2 px-3.5 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5",
                              isSelected
                                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/50 shadow-xs"
                                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                            )}
                          >
                            {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-slate-400" />}
                            <span>{item}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Utilities & Eco */}
                  <div className="space-y-2 pt-2">
                    <label className="font-extrabold uppercase text-slate-400 text-[10px] tracking-wider block">
                      Eco & Utilities
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        "24x7 Water Supply", "Piped Gas Connection", "Rainwater Harvesting",
                        "Solar Power Backup", "Sewage Treatment Plant (STP)", "Waste Disposal"
                      ].filter((a) => a.toLowerCase().includes(amenitySearch.toLowerCase())).map((item) => {
                        const val = item.toLowerCase();
                        const isSelected = localFilters.amenities.includes(val);
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => toggleArrayFilter("amenities", val)}
                            className={cn(
                              "py-2 px-3.5 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5",
                              isSelected
                                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/50 shadow-xs"
                                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                            )}
                          >
                            {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-slate-400" />}
                            <span>{item}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── TAB: PARKING ─── */}
            {activeTab === "parking" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="font-heading text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Car className="w-4 h-4 text-amber-500" /> Parking Space
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Filter by covered, reserved, and open parking availability
                  </p>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  {[
                    { label: "Covered Parking", val: "covered" },
                    { label: "Open Parking", val: "open" },
                    { label: "Reserved Parking Slot", val: "reserved" },
                    { label: "1 Car Parking", val: "1-car" },
                    { label: "2 Cars Parking", val: "2-cars" },
                    { label: "3+ Cars Parking", val: "3-cars" },
                    { label: "Dedicated Bike Parking", val: "bike" },
                  ].map((item) => {
                    const isSelected = localFilters.parking.includes(item.val);
                    return (
                      <button
                        key={item.val}
                        type="button"
                        onClick={() => toggleArrayFilter("parking", item.val)}
                        className={cn(
                          "py-2.5 px-4 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5",
                          isSelected
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/50 shadow-xs"
                            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                        )}
                      >
                        {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-slate-400" />}
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── TAB: VERIFIED & TRUST ─── */}
            {activeTab === "verified" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="font-heading text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-500" /> Verified & Trust Badges
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Filter by official RERA approvals, verified video inspections, and verified owners
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {[
                    { label: "🛡️ RERA Registered Only", val: "rera" },
                    { label: "📹 On-Ground Video Verified", val: "video_verified" },
                    { label: "🤝 Zero Brokerage Listings", val: "zero_brokerage" },
                    { label: "👤 Owner Verified Listings", val: "owner_verified" },
                    { label: "📋 Legal & Title Verified", val: "legal_verified" },
                    { label: "📍 Physically Visited Property", val: "visited" },
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
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/50 shadow-xs"
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

            {/* ─── TAB: PHOTOS & VIDEOS ─── */}
            {activeTab === "media" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="font-heading text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Video className="w-4 h-4 text-amber-500" /> Photos, Videos & Floor Plans
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Filter properties with rich visual media attached
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {[
                    { label: "📸 Properties with Photos", val: "photos" },
                    { label: "🎥 On-Ground Video Tours", val: "video" },
                    { label: "📐 Floor Plan Available", val: "floorplan" },
                    { label: "🌐 360° Virtual Tour", val: "360tour" },
                  ].map((media) => {
                    const isSelected = localFilters.mediaTypes.includes(media.val);
                    return (
                      <button
                        key={media.val}
                        type="button"
                        onClick={() => toggleArrayFilter("mediaTypes", media.val)}
                        className={cn(
                          "py-3 px-5 rounded-full text-xs font-black border transition-all cursor-pointer flex items-center gap-2",
                          isSelected
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/50 shadow-xs"
                            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                        )}
                      >
                        {isSelected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4 text-slate-400" />}
                        <span>{media.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── TAB: POSTED SINCE ─── */}
            {activeTab === "postedSince" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="font-heading text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-500" /> Listing Freshness
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Show properties posted recently
                  </p>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  {[
                    { label: "Any Time", val: "any" },
                    { label: "Last 24 Hours", val: "1day" },
                    { label: "Last 3 Days", val: "3days" },
                    { label: "Last 7 Days (1 Week)", val: "7days" },
                    { label: "Last 15 Days", val: "15days" },
                    { label: "Last 30 Days (1 Month)", val: "30days" },
                  ].map((date) => {
                    const isSelected = localFilters.postedSince === date.val;
                    return (
                      <button
                        key={date.val}
                        type="button"
                        onClick={() => setLocalFilters({ ...localFilters, postedSince: date.val })}
                        className={cn(
                          "py-2.5 px-4 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5",
                          isSelected
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/50 shadow-xs"
                            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                        )}
                      >
                        {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-slate-400" />}
                        <span>{date.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── TAB: RENT SPECIFIC ─── */}
            {activeTab === "rentSpecific" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="font-heading text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-500" /> Tenant & Rental Rules
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Filter by tenant preferences and house rules
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="font-extrabold uppercase text-slate-400 text-[10px] tracking-wider block">
                    Preferred Tenants
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {[
                      { label: "Family Preferred", val: "family" },
                      { label: "Bachelors Allowed", val: "bachelors" },
                      { label: "Working Professionals", val: "professionals" },
                      { label: "Female Tenants Only", val: "female" },
                      { label: "Male Tenants Only", val: "male" },
                      { label: "Company Lease", val: "company" },
                    ].map((item) => {
                      const isSelected = localFilters.tenantPreference.includes(item.val);
                      return (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => toggleArrayFilter("tenantPreference", item.val)}
                          className={cn(
                            "py-2.5 px-4 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5",
                            isSelected
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/50 shadow-xs"
                              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                          )}
                        >
                          {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-slate-400" />}
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <label className="font-extrabold uppercase text-slate-400 text-[10px] tracking-wider block">
                    House Rules
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      onClick={() => setLocalFilters({ ...localFilters, petsAllowed: !localFilters.petsAllowed })}
                      className={cn(
                        "py-2.5 px-4 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5",
                        localFilters.petsAllowed
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/50 shadow-xs"
                          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                      )}
                    >
                      {localFilters.petsAllowed ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-slate-400" />}
                      <span>🐾 Pets Allowed</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setLocalFilters({ ...localFilters, nonVegAllowed: !localFilters.nonVegAllowed })}
                      className={cn(
                        "py-2.5 px-4 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5",
                        localFilters.nonVegAllowed
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/50 shadow-xs"
                          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                      )}
                    >
                      {localFilters.nonVegAllowed ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-slate-400" />}
                      <span>🍗 Non-Veg Cooking Allowed</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ─── TAB: PG & CO-LIVING ─── */}
            {activeTab === "pgSpecific" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="font-heading text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-500" /> PG & Co-Living Options
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Filter by gender occupancy and room sharing
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="font-extrabold uppercase text-slate-400 text-[10px] tracking-wider block">
                    PG For
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {["Boys PG", "Girls PG", "Co-Living Space"].map((item) => {
                      const val = item.toLowerCase();
                      const isSelected = localFilters.pgGender.includes(val);
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => toggleArrayFilter("pgGender", val)}
                          className={cn(
                            "py-2.5 px-4 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5",
                            isSelected
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/50 shadow-xs"
                              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                          )}
                        >
                          {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-slate-400" />}
                          <span>{item}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <label className="font-extrabold uppercase text-slate-400 text-[10px] tracking-wider block">
                    Sharing Type
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {["Single Private Room", "Double Sharing", "Triple Sharing", "4+ Sharing"].map((item) => {
                      const val = item.toLowerCase();
                      const isSelected = localFilters.pgSharing.includes(val);
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => toggleArrayFilter("pgSharing", val)}
                          className={cn(
                            "py-2.5 px-4 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5",
                            isSelected
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/50 shadow-xs"
                              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                          )}
                        >
                          {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-slate-400" />}
                          <span>{item}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ─── TAB: COMMERCIAL SPECIFIC ─── */}
            {activeTab === "commercialSpecific" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="font-heading text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Warehouse className="w-4 h-4 text-amber-500" /> Commercial Fit-Out & Location
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Filter by office fit-out level, retail road facing, and warehouse specifications
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="font-extrabold uppercase text-slate-400 text-[10px] tracking-wider block">
                    Office Fit-Out Grade
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {[
                      { label: "Bare Shell", val: "bare-shell" },
                      { label: "Warm Shell", val: "warm-shell" },
                      { label: "Fully Furnished Office", val: "furnished-office" },
                      { label: "Plug & Play Workstations", val: "plug-play" },
                      { label: "Grade A Building", val: "grade-a" },
                    ].map((item) => {
                      const isSelected = localFilters.furnishingGrade.includes(item.val);
                      return (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => toggleArrayFilter("furnishingGrade", item.val)}
                          className={cn(
                            "py-2.5 px-4 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5",
                            isSelected
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/50 shadow-xs"
                              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                          )}
                        >
                          {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-slate-400" />}
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <label className="font-extrabold uppercase text-slate-400 text-[10px] tracking-wider block">
                    Shop & Warehouse Features
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {[
                      { label: "Main Road Facing", val: "road-facing" },
                      { label: "Ground Floor Shop", val: "ground-shop" },
                      { label: "Mall Retail Space", val: "mall" },
                      { label: "Loading Dock Available", val: "loading-dock" },
                      { label: "Truck Access (40ft Container)", val: "truck-access" },
                      { label: "High Ceiling (20ft+)", val: "high-ceiling" },
                    ].map((item) => {
                      const isSelected = localFilters.commercialType.includes(item.val);
                      return (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => toggleArrayFilter("commercialType", item.val)}
                          className={cn(
                            "py-2.5 px-4 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5",
                            isSelected
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/50 shadow-xs"
                              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                          )}
                        >
                          {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-slate-400" />}
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ─── TAB: WATER & AGRICULTURE (AP SPEC) ─── */}
            {activeTab === "agriculture" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="font-heading text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Sprout className="w-4 h-4 text-amber-500" /> Agricultural & Farm House Criteria
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Tailored for AP Land & Crop Specifications (Water sources & Soil cultivation)
                  </p>
                </div>

                <div className="space-y-2.5">
                  <label className="font-extrabold uppercase text-slate-400 text-[10px] tracking-wider block">
                    Water Source Available
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
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/50 shadow-xs"
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

                <div className="space-y-2.5 pt-2">
                  <label className="font-extrabold uppercase text-slate-400 text-[10px] tracking-wider block">
                    Cultivation Crop Types
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {["Paddy", "Chilli", "Cotton", "Horticulture", "Tobacco", "Organic Farming"].map((crop) => {
                      const isSelected = localFilters.cultivationCrop.includes(crop);
                      return (
                        <button
                          key={crop}
                          type="button"
                          onClick={() => toggleArrayFilter("cultivationCrop", crop)}
                          className={cn(
                            "py-2.5 px-4 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5",
                            isSelected
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/50 shadow-xs"
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

        {/* ─── Sticky Action Footer ───────────────────────────────── */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center justify-between gap-4 shrink-0 shadow-lg">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs font-black text-red-500 hover:underline flex items-center gap-1.5 cursor-pointer py-2 px-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear All</span>
          </button>

          <button
            type="button"
            onClick={handleApply}
            className="py-3 px-8 sm:px-12 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs sm:text-sm rounded-full shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer flex items-center gap-2"
          >
            <span>View {totalResults} Properties</span>
            <ArrowRight className="w-4 h-4 stroke-[3]" />
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
