"use client";

import { useState } from "react";
import {
  SlidersHorizontal,
  X,
  Building2,
  Check,
  Compass,
  Home,
  Trees,
  Store,
  RotateCcw,
  Sparkles,
  Droplets,
  Sprout,
  ShieldCheck,
  UserCheck,
  ArrowRight,
  Layers,
  Car,
  DoorOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatINR, cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";

export interface FilterState {
  query: string;
  listingType: string[];
  propertyType: string[];
  bhk: string[];
  bathrooms: string[];
  balconies: string[];
  additionalRooms: string[]; // Pooja Room, Study Room, Servant Room
  facing: string[]; // East, West, North, South, etc.
  budget: [number, number];
  ageRange: string[];
  saleType: string[];
  availability: string[]; // Ready to Occupy / Under Construction
  postedBy: string[]; // Owner / Agent / Developer
  furnished: string[];
  waterSource: string[]; // Bore Water, Lake Water, Canal Water
  cultivationCrop: string[]; // Paddy, Chilli, Cotton, Tobacco, Horticulture
  vastuCompliant: boolean;
  gatedCommunity: boolean;
  reraApproved: boolean;
}

export const initialFilterState: FilterState = {
  query: "",
  listingType: [],
  propertyType: [],
  bhk: [],
  bathrooms: [],
  balconies: [],
  additionalRooms: [],
  facing: [],
  budget: [0, 100000000],
  ageRange: [],
  saleType: [],
  availability: [],
  postedBy: [],
  furnished: [],
  waterSource: [],
  cultivationCrop: [],
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

export function SearchFiltersModal({
  isOpen,
  onClose,
  filters,
  onApplyFilters,
  totalResults,
}: SearchFiltersModalProps) {
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);

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

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-t-3xl sm:rounded-3xl w-full max-w-2xl max-h-[90vh] sm:max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 font-extrabold flex items-center justify-center">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-bold text-slate-900 dark:text-white leading-tight">
                Senior Real Estate Search Filters
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Customized according to AP Property Specifications
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-full bg-slate-200 dark:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Filter Content Sections (Logical Senior Agent Order) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-xs no-scrollbar">
          
          {/* 1. POSTED BY (Owner / Verified Agent / Developer) */}
          <div className="space-y-2">
            <label className="font-extrabold uppercase text-slate-400 text-[10px] tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-amber-500" /> Posted By
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Owner (No Broker)", val: "owner" },
                { label: "Verified Agent", val: "agent" },
                { label: "Developer / Builder", val: "builder" },
              ].map((p) => {
                const isSelected = localFilters.postedBy.includes(p.val);
                return (
                  <button
                    key={p.val}
                    type="button"
                    onClick={() => toggleArrayFilter("postedBy", p.val)}
                    className={cn(
                      "py-2.5 px-3 rounded-xl border font-bold text-center transition-all cursor-pointer truncate",
                      isSelected
                        ? "bg-amber-500 text-slate-950 border-amber-500 shadow-sm"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. TRANSACTION TYPE (Buy/Sale, Rent, PG) */}
          <div className="space-y-2">
            <label className="font-extrabold uppercase text-slate-400 text-[10px] tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-amber-500" /> Listing Purpose
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Buy / For Sale", val: "sale" },
                { label: "For Rent", val: "rent" },
                { label: "PG / Co-Living", val: "pg" },
              ].map((item) => {
                const isSelected = localFilters.listingType.includes(item.val);
                return (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => toggleArrayFilter("listingType", item.val)}
                    className={cn(
                      "py-2.5 px-3 rounded-xl border font-bold text-center transition-all cursor-pointer",
                      isSelected
                        ? "bg-amber-500 text-slate-950 border-amber-500 shadow-sm"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                    )}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. PROPERTY CATEGORY & TYPE */}
          <div className="space-y-2">
            <label className="font-extrabold uppercase text-slate-400 text-[10px] tracking-wider flex items-center gap-1.5">
              <Home className="w-3.5 h-3.5 text-amber-500" /> Property Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { label: "Apartment / Flat", val: "apartment" },
                { label: "Villa / House", val: "villa" },
                { label: "Plot / Land (Sq.Yds)", val: "residential-land" },
                { label: "Commercial Space", val: "commercial-spaces" },
                { label: "Agricultural Land", val: "agricultural-lands" },
                { label: "Farm House", val: "farmhouse" },
              ].map((t) => {
                const isSelected = localFilters.propertyType.includes(t.val);
                return (
                  <button
                    key={t.val}
                    type="button"
                    onClick={() => toggleArrayFilter("propertyType", t.val)}
                    className={cn(
                      "py-2.5 px-3 rounded-xl border font-bold text-left transition-all cursor-pointer truncate",
                      isSelected
                        ? "bg-amber-500 text-slate-950 border-amber-500 shadow-sm"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                    )}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. BUDGET & PRICE RANGE */}
          <div className="space-y-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center">
              <label className="font-extrabold uppercase text-slate-400 text-[10px] tracking-wider">
                Budget Range (INR)
              </label>
              <span className="font-black text-amber-500 text-sm">
                {formatINR(localFilters.budget[0])} - {localFilters.budget[1] >= 100000000 ? "₹10+ Crores" : formatINR(localFilters.budget[1])}
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 pt-1">
              {[
                { label: "Under 30L", min: 0, max: 3000000 },
                { label: "30L-60L", min: 3000000, max: 6000000 },
                { label: "60L-1 Cr", min: 6000000, max: 10000000 },
                { label: "1 Cr-2 Cr", min: 10000000, max: 20000000 },
                { label: "Above 2 Cr", min: 20000000, max: 100000000 },
              ].map((p) => {
                const isSelected = localFilters.budget[0] === p.min && localFilters.budget[1] === p.max;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setLocalFilters({ ...localFilters, budget: [p.min, p.max] })}
                    className={cn(
                      "py-1.5 px-2 rounded-lg text-[10px] font-extrabold border text-center transition-all cursor-pointer",
                      isSelected
                        ? "bg-amber-500 text-slate-950 border-amber-500"
                        : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800"
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. BEDROOMS (BHK), BATHROOMS & BALCONIES */}
          <div className="space-y-3">
            <label className="font-extrabold uppercase text-slate-400 text-[10px] tracking-wider">
              Bedrooms (BHK)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {["1", "2", "3", "4+"].map((bhk) => {
                const isSelected = localFilters.bhk.includes(bhk);
                return (
                  <button
                    key={bhk}
                    type="button"
                    onClick={() => toggleArrayFilter("bhk", bhk)}
                    className={cn(
                      "py-2 px-3 rounded-xl border font-extrabold text-center transition-all cursor-pointer",
                      isSelected
                        ? "bg-amber-500 text-slate-950 border-amber-500 shadow-sm"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    )}
                  >
                    {bhk} BHK
                  </button>
                );
              })}
            </div>
          </div>

          {/* 6. ADDITIONAL ROOMS (Pooja Room, Study Room, Servant Room - EXCEL SHEET REQUIREMENT) */}
          <div className="space-y-2">
            <label className="font-extrabold uppercase text-slate-400 text-[10px] tracking-wider flex items-center gap-1.5">
              <DoorOpen className="w-3.5 h-3.5 text-amber-500" /> Additional Rooms (Excel Specs)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Pooja Room", val: "pooja" },
                { label: "Study Room", val: "study" },
                { label: "Servant Room", val: "servant" },
              ].map((rm) => {
                const isSelected = localFilters.additionalRooms.includes(rm.val);
                return (
                  <button
                    key={rm.val}
                    type="button"
                    onClick={() => toggleArrayFilter("additionalRooms", rm.val)}
                    className={cn(
                      "py-2 px-3 rounded-xl border font-bold text-center transition-all cursor-pointer truncate",
                      isSelected
                        ? "bg-amber-500 text-slate-950 border-amber-500"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    )}
                  >
                    {rm.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 7. FACING DIRECTION (East, West, North, South, etc. - EXCEL REQUIREMENT) */}
          <div className="space-y-2">
            <label className="font-extrabold uppercase text-slate-400 text-[10px] tracking-wider flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-amber-500" /> Facing Direction
            </label>
            <div className="grid grid-cols-4 gap-2">
              {["East", "West", "North", "South", "North-East", "North-West", "South-East", "South-West"].map((face) => {
                const val = face.toLowerCase();
                const isSelected = localFilters.facing.includes(val);
                return (
                  <button
                    key={face}
                    type="button"
                    onClick={() => toggleArrayFilter("facing", val)}
                    className={cn(
                      "py-2 px-2 rounded-xl border font-extrabold text-center transition-all text-[11px] cursor-pointer",
                      isSelected
                        ? "bg-amber-500 text-slate-950 border-amber-500"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    )}
                  >
                    {face}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 8. CONSTRUCTION STATUS (Ready to Occupy / Under Construction - EXCEL REQUIREMENT) */}
          <div className="space-y-2">
            <label className="font-extrabold uppercase text-slate-400 text-[10px] tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Construction Status
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Ready to Occupy", val: "ready" },
                { label: "Under Construction", val: "under-construction" },
              ].map((st) => {
                const isSelected = localFilters.availability.includes(st.val);
                return (
                  <button
                    key={st.val}
                    type="button"
                    onClick={() => toggleArrayFilter("availability", st.val)}
                    className={cn(
                      "py-2.5 px-3 rounded-xl border font-bold text-center transition-all cursor-pointer",
                      isSelected
                        ? "bg-amber-500 text-slate-950 border-amber-500"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    )}
                  >
                    {st.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 9. WATER SOURCE & CULTIVATION CROP (AGRICULTURAL & FARM LAND EXCEL REQUIREMENT) */}
          <div className="space-y-3 bg-emerald-500/5 dark:bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/30">
            <label className="font-extrabold uppercase text-emerald-600 dark:text-emerald-400 text-[10px] tracking-wider flex items-center gap-1.5">
              <Sprout className="w-3.5 h-3.5" /> Agricultural & Farm House Options (Excel Specs)
            </label>
            
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-500">Water Source:</span>
              <div className="grid grid-cols-3 gap-2">
                {["Bore Water", "Lake Water", "Canal Water"].map((w) => {
                  const isSelected = localFilters.waterSource.includes(w);
                  return (
                    <button
                      key={w}
                      type="button"
                      onClick={() => toggleArrayFilter("waterSource", w)}
                      className={cn(
                        "py-1.5 px-2 rounded-lg border text-[11px] font-bold text-center transition-all cursor-pointer",
                        isSelected
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800"
                      )}
                    >
                      {w}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-bold text-slate-500">Cultivation Crop:</span>
              <div className="grid grid-cols-4 gap-1.5">
                {["Paddy", "Chilli", "Cotton", "Horticulture"].map((c) => {
                  const isSelected = localFilters.cultivationCrop.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleArrayFilter("cultivationCrop", c)}
                      className={cn(
                        "py-1.5 px-2 rounded-lg border text-[10px] font-extrabold text-center transition-all cursor-pointer",
                        isSelected
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800"
                      )}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 10. SPECIAL AP VERIFICATION & VASTU TOGGLES */}
          <div className="space-y-2 pt-2">
            <label className="font-extrabold uppercase text-slate-400 text-[10px] tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500" /> AP Legal & Vastu Badges
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLocalFilters({ ...localFilters, vastuCompliant: !localFilters.vastuCompliant })}
                className={cn(
                  "py-2.5 px-3 rounded-xl border font-extrabold text-xs text-center transition-all cursor-pointer flex items-center justify-center gap-1.5",
                  localFilters.vastuCompliant
                    ? "bg-amber-500 text-slate-950 border-amber-500"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                )}
              >
                <span>🧭 100% Vastu Compliant</span>
              </button>

              <button
                type="button"
                onClick={() => setLocalFilters({ ...localFilters, reraApproved: !localFilters.reraApproved })}
                className={cn(
                  "py-2.5 px-3 rounded-xl border font-extrabold text-xs text-center transition-all cursor-pointer flex items-center justify-center gap-1.5",
                  localFilters.reraApproved
                    ? "bg-amber-500 text-slate-950 border-amber-500"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                )}
              >
                <span>🛡️ RERA Approved Only</span>
              </button>
            </div>
          </div>

        </div>

        {/* Modal Sticky Action Footer Bar */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="py-3 px-4 rounded-xl font-bold text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset All
          </button>

          <button
            type="button"
            onClick={handleApply}
            className="flex-1 py-3 px-5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <span>Apply Filters ({totalResults} Homes)</span>
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
