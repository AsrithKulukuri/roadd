"use client";

import { useState, useRef, useEffect } from "react";
import {
  SlidersHorizontal,
  ChevronDown,
  Check,
  X,
  IndianRupee,
  Home,
  Building2,
  ShieldCheck,
  Clock,
  UserCheck,
  Compass,
  Trees,
  RotateCcw,
} from "lucide-react";
import { cn, formatINR } from "@/lib/utils";
import type { FilterState } from "./search-filters";

interface RealtorFilterBarProps {
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
  onOpenAllFilters: () => void;
  totalResults: number;
}

export function RealtorFilterBar({
  filters,
  onFilterChange,
  onOpenAllFilters,
  totalResults,
}: RealtorFilterBarProps) {
  // Track open dropdown popover/sheet: "price" | "bhk" | "propertyType" | "possession" | "postedBy" | null
  const [openDropdown, setOpenDropdown] = useState<
    "price" | "bhk" | "propertyType" | "possession" | "postedBy" | null
  >(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Detect mobile device (< 768px)
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Close dropdown on click outside on desktop
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Prevent background scroll when mobile sheet is open
  useEffect(() => {
    if (isMobile && openDropdown !== null) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobile, openDropdown]);

  // Active filter counter
  const activeFilterCount =
    (filters.listingType.length > 0 ? 1 : 0) +
    (filters.propertyType.length > 0 ? 1 : 0) +
    (filters.bhk.length > 0 ? 1 : 0) +
    (filters.budget[0] > 0 || filters.budget[1] < 100000000 ? 1 : 0) +
    (filters.availability.length > 0 ? 1 : 0) +
    (filters.postedBy.length > 0 ? 1 : 0) +
    (filters.facing.length > 0 ? 1 : 0) +
    (filters.vastuCompliant ? 1 : 0) +
    (filters.gatedCommunity ? 1 : 0) +
    (filters.reraApproved ? 1 : 0);

  // Indian Price presets (INR)
  const pricePresets = [
    { label: "Any Price", min: 0, max: 100000000 },
    { label: "Under ₹30 Lakhs", min: 0, max: 3000000 },
    { label: "₹30 Lakhs - ₹60 Lakhs", min: 3000000, max: 6000000 },
    { label: "₹60 Lakhs - ₹1 Crore", min: 6000000, max: 10000000 },
    { label: "₹1 Crore - ₹2 Crores", min: 10000000, max: 20000000 },
    { label: "Above ₹2 Crores", min: 20000000, max: 100000000 },
  ];

  // BHK options
  const bhkOptions = [
    { label: "1 BHK", value: "1" },
    { label: "2 BHK", value: "2" },
    { label: "3 BHK", value: "3" },
    { label: "4+ BHK", value: "4+" },
  ];

  // Property Type options
  const propertyTypes = [
    { label: "Apartment / Flat", value: "apartment", icon: Building2 },
    { label: "House / Villa", value: "villa", icon: Home },
    { label: "Plot / Land", value: "residential-land", icon: Compass },
    { label: "Commercial", value: "commercial-spaces", icon: Building2 },
    { label: "PG / Co-living", value: "pg", icon: Home },
    { label: "Farmhouse", value: "farmhouse", icon: Trees },
    { label: "Agricultural Land", value: "agricultural-lands", icon: Compass },
  ];

  // Possession options
  const possessionOptions = [
    { label: "Ready to Occupy", value: "ready", icon: Clock },
    { label: "Under Construction", value: "under-construction", icon: Building2 },
  ];

  // Posted By options
  const postedByOptions = [
    { label: "Direct Owner", value: "owner", icon: UserCheck },
    { label: "Verified Agent", value: "agent", icon: ShieldCheck },
    { label: "Builder / Developer", value: "builder", icon: Building2 },
  ];

  // Price summary label
  const getPriceLabel = () => {
    const [min, max] = filters.budget;
    if (min === 0 && max === 100000000) return "Price";
    const preset = pricePresets.find((p) => p.min === min && p.max === max);
    if (preset && preset.min !== 0) return preset.label;
    if (min > 0 && max < 100000000) return `${formatINR(min)} - ${formatINR(max)}`;
    if (min > 0) return `> ${formatINR(min)}`;
    if (max < 100000000) return `< ${formatINR(max)}`;
    return "Price";
  };

  // BHK summary label
  const getBhkLabel = () => {
    if (filters.bhk.length === 0) return "BHK / Rooms";
    return `${filters.bhk.join(", ")} BHK`;
  };

  // Property Type summary label
  const getPropertyTypeLabel = () => {
    if (filters.propertyType.length === 0) return "Home type";
    if (filters.propertyType.length === 1) {
      const match = propertyTypes.find((p) => p.value === filters.propertyType[0]);
      return match ? match.label : filters.propertyType[0];
    }
    return `${filters.propertyType.length} Types`;
  };

  // Possession summary label
  const getPossessionLabel = () => {
    if (filters.availability.length === 0) return "Possession";
    if (filters.availability.includes("ready")) return "Ready to Move";
    if (filters.availability.includes("under-construction")) return "Under Construction";
    return "Possession";
  };

  // Posted By summary label
  const getPostedByLabel = () => {
    if (filters.postedBy.length === 0) return "Posted By";
    if (filters.postedBy.includes("owner")) return "Owner Direct";
    if (filters.postedBy.includes("agent")) return "Agent";
    if (filters.postedBy.includes("builder")) return "Builder";
    return `${filters.postedBy.length} Selected`;
  };

  // Toggle helpers for multi-select arrays
  const toggleArrayItem = (field: keyof FilterState, value: string) => {
    const current = (filters[field] as string[]) || [];
    const updated = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    onFilterChange({ ...filters, [field]: updated });
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* HORIZONTAL FILTER PILLS SCROLL STRIP */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 px-1 touch-pan-x">
        {/* 1. ALL FILTERS BUTTON */}
        <button
          type="button"
          onClick={onOpenAllFilters}
          className={cn(
            "h-9 px-3.5 rounded-full text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer whitespace-nowrap shrink-0 shadow-xs active:scale-95",
            activeFilterCount > 0
              ? "bg-slate-950 text-white border-slate-950 dark:bg-amber-500 dark:text-slate-950 dark:border-amber-500"
              : "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border-slate-300 dark:border-slate-800 hover:border-slate-400"
          )}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="w-4 h-4 bg-amber-500 text-slate-950 dark:bg-slate-950 dark:text-amber-400 rounded-full text-[10px] font-black flex items-center justify-center ml-0.5">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* 2. PRICE FILTER BUTTON */}
        <button
          type="button"
          onClick={() => setOpenDropdown(openDropdown === "price" ? null : "price")}
          className={cn(
            "h-9 px-3.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer whitespace-nowrap shrink-0 active:scale-95",
            filters.budget[0] > 0 || filters.budget[1] < 100000000 || openDropdown === "price"
              ? "bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400 border-amber-400 dark:border-amber-500/40 font-bold shadow-xs"
              : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-800 hover:border-slate-400"
          )}
        >
          <IndianRupee className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span>{getPriceLabel()}</span>
          <ChevronDown
            className={cn(
              "w-3.5 h-3.5 transition-transform duration-200",
              openDropdown === "price" && "rotate-180"
            )}
          />
        </button>

        {/* 3. BHK FILTER BUTTON */}
        <button
          type="button"
          onClick={() => setOpenDropdown(openDropdown === "bhk" ? null : "bhk")}
          className={cn(
            "h-9 px-3.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer whitespace-nowrap shrink-0 active:scale-95",
            filters.bhk.length > 0 || openDropdown === "bhk"
              ? "bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400 border-amber-400 dark:border-amber-500/40 font-bold shadow-xs"
              : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-800 hover:border-slate-400"
          )}
        >
          <span>{getBhkLabel()}</span>
          <ChevronDown
            className={cn(
              "w-3.5 h-3.5 transition-transform duration-200",
              openDropdown === "bhk" && "rotate-180"
            )}
          />
        </button>

        {/* 4. PROPERTY TYPE BUTTON */}
        <button
          type="button"
          onClick={() =>
            setOpenDropdown(openDropdown === "propertyType" ? null : "propertyType")
          }
          className={cn(
            "h-9 px-3.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer whitespace-nowrap shrink-0 active:scale-95",
            filters.propertyType.length > 0 || openDropdown === "propertyType"
              ? "bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400 border-amber-400 dark:border-amber-500/40 font-bold shadow-xs"
              : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-800 hover:border-slate-400"
          )}
        >
          <span>{getPropertyTypeLabel()}</span>
          <ChevronDown
            className={cn(
              "w-3.5 h-3.5 transition-transform duration-200",
              openDropdown === "propertyType" && "rotate-180"
            )}
          />
        </button>

        {/* 5. POSSESSION / AVAILABILITY BUTTON */}
        <button
          type="button"
          onClick={() =>
            setOpenDropdown(openDropdown === "possession" ? null : "possession")
          }
          className={cn(
            "h-9 px-3.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer whitespace-nowrap shrink-0 active:scale-95",
            filters.availability.length > 0 || openDropdown === "possession"
              ? "bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400 border-amber-400 dark:border-amber-500/40 font-bold shadow-xs"
              : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-800 hover:border-slate-400"
          )}
        >
          <span>{getPossessionLabel()}</span>
          <ChevronDown
            className={cn(
              "w-3.5 h-3.5 transition-transform duration-200",
              openDropdown === "possession" && "rotate-180"
            )}
          />
        </button>

        {/* 6. POSTED BY BUTTON */}
        <button
          type="button"
          onClick={() =>
            setOpenDropdown(openDropdown === "postedBy" ? null : "postedBy")
          }
          className={cn(
            "h-9 px-3.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer whitespace-nowrap shrink-0 active:scale-95",
            filters.postedBy.length > 0 || openDropdown === "postedBy"
              ? "bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400 border-amber-400 dark:border-amber-500/40 font-bold shadow-xs"
              : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-800 hover:border-slate-400"
          )}
        >
          <span>{getPostedByLabel()}</span>
          <ChevronDown
            className={cn(
              "w-3.5 h-3.5 transition-transform duration-200",
              openDropdown === "postedBy" && "rotate-180"
            )}
          />
        </button>

        {/* DIVIDER */}
        <div className="h-5 w-[1px] bg-slate-300 dark:bg-slate-800 shrink-0 mx-0.5" />

        {/* 7. QUICK TOGGLE PILLS */}

        {/* READY TO OCCUPY TOGGLE */}
        <button
          type="button"
          onClick={() => toggleArrayItem("availability", "ready")}
          className={cn(
            "h-9 px-3.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer whitespace-nowrap shrink-0 active:scale-95",
            filters.availability.includes("ready")
              ? "bg-emerald-500 text-slate-950 border-emerald-500 font-extrabold shadow-xs"
              : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-800 hover:border-slate-400"
          )}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Ready to Occupy</span>
          {filters.availability.includes("ready") && <Check className="w-3.5 h-3.5 stroke-[3]" />}
        </button>

        {/* RERA APPROVED TOGGLE */}
        <button
          type="button"
          onClick={() =>
            onFilterChange({ ...filters, reraApproved: !filters.reraApproved })
          }
          className={cn(
            "h-9 px-3.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer whitespace-nowrap shrink-0 active:scale-95",
            filters.reraApproved
              ? "bg-blue-600 text-white border-blue-600 font-extrabold shadow-xs"
              : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-800 hover:border-slate-400"
          )}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>RERA Approved</span>
          {filters.reraApproved && <Check className="w-3.5 h-3.5 stroke-[3]" />}
        </button>

        {/* VASTU COMPLIANT TOGGLE */}
        <button
          type="button"
          onClick={() =>
            onFilterChange({ ...filters, vastuCompliant: !filters.vastuCompliant })
          }
          className={cn(
            "h-9 px-3.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer whitespace-nowrap shrink-0 active:scale-95",
            filters.vastuCompliant
              ? "bg-amber-500 text-slate-950 border-amber-500 font-extrabold shadow-xs"
              : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-800 hover:border-slate-400"
          )}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Vastu Compliant</span>
          {filters.vastuCompliant && <Check className="w-3.5 h-3.5 stroke-[3]" />}
        </button>

        {/* OWNER DIRECT TOGGLE */}
        <button
          type="button"
          onClick={() => toggleArrayItem("postedBy", "owner")}
          className={cn(
            "h-9 px-3.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer whitespace-nowrap shrink-0 active:scale-95",
            filters.postedBy.includes("owner")
              ? "bg-purple-600 text-white border-purple-600 font-extrabold shadow-xs"
              : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-800 hover:border-slate-400"
          )}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Owner Direct</span>
          {filters.postedBy.includes("owner") && <Check className="w-3.5 h-3.5 stroke-[3]" />}
        </button>

        {/* GATED COMMUNITY TOGGLE */}
        <button
          type="button"
          onClick={() =>
            onFilterChange({ ...filters, gatedCommunity: !filters.gatedCommunity })
          }
          className={cn(
            "h-9 px-3.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer whitespace-nowrap shrink-0 active:scale-95",
            filters.gatedCommunity
              ? "bg-teal-600 text-white border-teal-600 font-extrabold shadow-xs"
              : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-800 hover:border-slate-400"
          )}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Gated Community</span>
          {filters.gatedCommunity && <Check className="w-3.5 h-3.5 stroke-[3]" />}
        </button>
      </div>

      {/* DROPDOWN POPOVERS & MOBILE BOTTOM SHEETS */}
      {openDropdown !== null && (
        <>
          {/* BACKDROP FOR MOBILE BOTTOM SHEET */}
          {isMobile && (
            <div
              onClick={() => setOpenDropdown(null)}
              className="fixed inset-0 z-[999] bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
            />
          )}

          {/* DROPDOWN PANEL CONTAINER (Desktop Popover vs Mobile Bottom Sheet) */}
          <div
            className={cn(
              isMobile
                ? "fixed bottom-0 left-0 right-0 z-[1000] bg-white dark:bg-slate-900 rounded-t-3xl border-t border-slate-200 dark:border-slate-800 p-5 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[85vh] overflow-y-auto"
                : "absolute top-full left-0 mt-2 z-[100] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 animate-in fade-in zoom-in-95 duration-150"
            )}
            style={{
              width: !isMobile ? (openDropdown === "price" ? "320px" : "280px") : undefined,
            }}
          >
            {/* MOBILE DRAG/CLOSE HANDLE */}
            {isMobile && (
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white capitalize">
                    {openDropdown === "bhk"
                      ? "Select BHK Configuration"
                      : openDropdown === "price"
                      ? "Select Budget Range (INR)"
                      : openDropdown === "propertyType"
                      ? "Property Type"
                      : openDropdown === "possession"
                      ? "Possession Status"
                      : "Posted By"}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenDropdown(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full bg-slate-100 dark:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* 1. PRICE DROPDOWN CONTENT */}
            {openDropdown === "price" && (
              <div className="space-y-3">
                {!isMobile && (
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                    Select Budget Range (INR)
                  </div>
                )}
                <div className="space-y-1">
                  {pricePresets.map((preset) => {
                    const isSelected =
                      filters.budget[0] === preset.min &&
                      filters.budget[1] === preset.max;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          onFilterChange({
                            ...filters,
                            budget: [preset.min, preset.max],
                          });
                          setOpenDropdown(null);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2.5 text-xs rounded-xl font-medium flex items-center justify-between transition-colors cursor-pointer",
                          isSelected
                            ? "bg-amber-500 text-slate-950 font-bold"
                            : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                        )}
                      >
                        <span>{preset.label}</span>
                        {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      onFilterChange({ ...filters, budget: [0, 100000000] });
                      setOpenDropdown(null);
                    }}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset Price
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpenDropdown(null)}
                    className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-full shadow-xs cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}

            {/* 2. BHK DROPDOWN CONTENT */}
            {openDropdown === "bhk" && (
              <div className="space-y-3">
                {!isMobile && (
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                    Select Bedrooms / BHK
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {bhkOptions.map((opt) => {
                    const isSelected = filters.bhk.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => toggleArrayItem("bhk", opt.value)}
                        className={cn(
                          "px-3 py-3 rounded-xl text-xs font-bold border flex items-center justify-between transition-all cursor-pointer",
                          isSelected
                            ? "bg-amber-500 text-slate-950 border-amber-500 shadow-xs"
                            : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                        )}
                      >
                        <span>{opt.label}</span>
                        {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      onFilterChange({ ...filters, bhk: [] });
                    }}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" /> Clear BHK
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpenDropdown(null)}
                    className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-full shadow-xs cursor-pointer"
                  >
                    Apply ({filters.bhk.length})
                  </button>
                </div>
              </div>
            )}

            {/* 3. PROPERTY TYPE DROPDOWN CONTENT */}
            {openDropdown === "propertyType" && (
              <div className="space-y-3">
                {!isMobile && (
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                    Select Property Type
                  </div>
                )}
                <div className="space-y-1">
                  {propertyTypes.map((pt) => {
                    const isSelected = filters.propertyType.includes(pt.value);
                    const IconComponent = pt.icon;
                    return (
                      <button
                        key={pt.value}
                        type="button"
                        onClick={() => toggleArrayItem("propertyType", pt.value)}
                        className={cn(
                          "w-full text-left px-3 py-2.5 text-xs rounded-xl font-medium flex items-center justify-between transition-colors cursor-pointer",
                          isSelected
                            ? "bg-amber-500 text-slate-950 font-bold"
                            : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <IconComponent className="w-4 h-4 shrink-0" />
                          <span>{pt.label}</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      onFilterChange({ ...filters, propertyType: [] });
                    }}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" /> Clear Types
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpenDropdown(null)}
                    className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-full shadow-xs cursor-pointer"
                  >
                    Apply ({filters.propertyType.length})
                  </button>
                </div>
              </div>
            )}

            {/* 4. POSSESSION DROPDOWN CONTENT */}
            {openDropdown === "possession" && (
              <div className="space-y-3">
                {!isMobile && (
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                    Select Possession Status
                  </div>
                )}
                <div className="space-y-1">
                  {possessionOptions.map((opt) => {
                    const isSelected = filters.availability.includes(opt.value);
                    const IconComponent = opt.icon;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => toggleArrayItem("availability", opt.value)}
                        className={cn(
                          "w-full text-left px-3 py-2.5 text-xs rounded-xl font-medium flex items-center justify-between transition-colors cursor-pointer",
                          isSelected
                            ? "bg-amber-500 text-slate-950 font-bold"
                            : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <IconComponent className="w-4 h-4 shrink-0" />
                          <span>{opt.label}</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      onFilterChange({ ...filters, availability: [] });
                    }}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpenDropdown(null)}
                    className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-full shadow-xs cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}

            {/* 5. POSTED BY DROPDOWN CONTENT */}
            {openDropdown === "postedBy" && (
              <div className="space-y-3">
                {!isMobile && (
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                    Select Advertiser / Posted By
                  </div>
                )}
                <div className="space-y-1">
                  {postedByOptions.map((opt) => {
                    const isSelected = filters.postedBy.includes(opt.value);
                    const IconComponent = opt.icon;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => toggleArrayItem("postedBy", opt.value)}
                        className={cn(
                          "w-full text-left px-3 py-2.5 text-xs rounded-xl font-medium flex items-center justify-between transition-colors cursor-pointer",
                          isSelected
                            ? "bg-amber-500 text-slate-950 font-bold"
                            : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <IconComponent className="w-4 h-4 shrink-0" />
                          <span>{opt.label}</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      onFilterChange({ ...filters, postedBy: [] });
                    }}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpenDropdown(null)}
                    className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-full shadow-xs cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
