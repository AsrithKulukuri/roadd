"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
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
  MapPin,
  Search,
  Landmark,
} from "lucide-react";
import { cn, formatINRWords } from "@/lib/utils";
import type { FilterState } from "./search-filters";
import { Slider } from "@/components/ui/slider";
import { ModernBudgetDropdown } from "@/components/ui/modern-budget-dropdown";
import { useLocationsStore } from "@/stores/locations-store";
import { usePropertiesStore } from "@/stores/properties-store";
import { useProjectsStore } from "@/stores/projects-store";
import { evaluatePropertyFilters, evaluateProjectFilters } from "@/lib/search-engine";
import { useIsMounted } from "@/hooks/use-is-mounted";

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
  // Track open dropdown popover/sheet: "propertyType" | "price" | "postedBy" | "location" | null
  const [openDropdown, setOpenDropdown] = useState<
    "propertyType" | "price" | "postedBy" | "location" | null
  >(null);

  const { cities, fetchLocations } = useLocationsStore();
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [localitySearch, setLocalitySearch] = useState("");

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const allProperties = usePropertiesStore((state) => state.properties);
  const allProjects = useProjectsStore((state) => state.projects);

  // Live count summing BOTH matching properties and projects
  const liveTotalCount = useMemo(() => {
    const propMatches = (allProperties || []).filter((p) => evaluatePropertyFilters(p, filters));
    const projMatches = (allProjects || []).filter((proj) => evaluateProjectFilters(proj, filters));

    return propMatches.length + projMatches.length;
  }, [allProperties, allProjects, filters]);

  const activeResultsCount = liveTotalCount;

  // STRICT RULE: If user selected cities, resolve strictly from selected cities
  const selectedCities = useMemo(() => {
    return cities.filter((c) => (filters.cities || []).includes(c.name));
  }, [cities, filters.cities]);

  const activeCity = useMemo(() => {
    if (selectedCities.length > 0) {
      if (selectedCityId && selectedCities.some((c) => c.id === selectedCityId)) {
        return selectedCities.find((c) => c.id === selectedCityId)!;
      }
      return selectedCities[0];
    }
    if (selectedCityId) {
      const found = cities.find((c) => c.id === selectedCityId);
      if (found) return found;
    }
    return cities[0];
  }, [cities, selectedCities, selectedCityId]);

  const containerRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);

  // Mounted check for React Portal
  const mounted = useIsMounted();

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
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        (!portalRef.current || !portalRef.current.contains(target))
      ) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
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
    ((filters.cities?.length || 0) > 0 || (filters.localities?.length || 0) > 0 ? 1 : 0) +
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

  // Location summary label
  const getLocationLabel = () => {
    const cityCount = filters.cities?.length || 0;
    const locCount = filters.localities?.length || 0;
    const total = cityCount + locCount;
    if (total === 0) return "Location";
    if (cityCount === 1 && locCount === 0) return filters.cities[0];
    if (locCount === 1 && cityCount === 0) return filters.localities[0];
    return `Location (${total})`;
  };

  // Indian Price presets (INR) — Concise, clean brackets
  const pricePresets = [
    { label: "Any Price", min: 0, max: 100000000 },
    { label: "Under ₹50L", min: 0, max: 5000000 },
    { label: "₹50L – ₹1 Cr", min: 5000000, max: 10000000 },
    { label: "₹1 Cr – ₹2 Cr", min: 10000000, max: 20000000 },
    { label: "₹2 Cr+", min: 20000000, max: 100000000 },
  ];

  const BUDGET_MIN_OPTIONS = [
    { label: "₹ 0", value: 0 },
    { label: "₹ 5 L", value: 500000 },
    { label: "₹ 10 L", value: 1000000 },
    { label: "₹ 15 L", value: 1500000 },
    { label: "₹ 20 L", value: 2000000 },
    { label: "₹ 25 L", value: 2500000 },
    { label: "₹ 30 L", value: 3000000 },
    { label: "₹ 40 L", value: 4000000 },
    { label: "₹ 50 L", value: 5000000 },
    { label: "₹ 60 L", value: 6000000 },
    { label: "₹ 75 L", value: 7500000 },
    { label: "₹ 90 L", value: 9000000 },
    { label: "₹ 1 Cr", value: 10000000 },
    { label: "₹ 1.25 Cr", value: 12500000 },
    { label: "₹ 1.5 Cr", value: 15000000 },
    { label: "₹ 1.75 Cr", value: 17500000 },
    { label: "₹ 2 Cr", value: 20000000 },
    { label: "₹ 2.5 Cr", value: 25000000 },
    { label: "₹ 3 Cr", value: 30000000 },
    { label: "₹ 4 Cr", value: 40000000 },
    { label: "₹ 5 Cr", value: 50000000 },
    { label: "₹ 7.5 Cr", value: 75000000 },
    { label: "₹ 10 Cr", value: 100000000 },
  ];

  const BUDGET_MAX_OPTIONS = [
    { label: "₹ 15 L", value: 1500000 },
    { label: "₹ 20 L", value: 2000000 },
    { label: "₹ 25 L", value: 2500000 },
    { label: "₹ 30 L", value: 3000000 },
    { label: "₹ 40 L", value: 4000000 },
    { label: "₹ 50 L", value: 5000000 },
    { label: "₹ 60 L", value: 6000000 },
    { label: "₹ 75 L", value: 7500000 },
    { label: "₹ 90 L", value: 9000000 },
    { label: "₹ 1 Cr", value: 10000000 },
    { label: "₹ 1.25 Cr", value: 12500000 },
    { label: "₹ 1.5 Cr", value: 15000000 },
    { label: "₹ 1.75 Cr", value: 17500000 },
    { label: "₹ 2 Cr", value: 20000000 },
    { label: "₹ 2.5 Cr", value: 25000000 },
    { label: "₹ 3 Cr", value: 30000000 },
    { label: "₹ 4 Cr", value: 40000000 },
    { label: "₹ 5 Cr", value: 50000000 },
    { label: "₹ 7.5 Cr", value: 75000000 },
    { label: "Any Price", value: 100000000 },
  ];

  function getBudgetOpts(
    options: { label: string; value: number }[],
    customVal: number,
    isMax = false
  ) {
    if (options.some((o) => o.value === customVal)) return options;
    const customOption = {
      label: customVal === 0 ? "₹ 0" : formatINRWords(customVal, isMax),
      value: customVal,
    };
    const list = [...options, customOption];
    return list.sort((a, b) => a.value - b.value);
  }

  // Property Type options
  const propertyTypes = [
    { label: "Apartment / Flat", value: "apartment", icon: Building2 },
    { label: "House / Villa", value: "villa", icon: Home },
    { label: "CRDA Ventures", value: "venture", icon: Landmark },
    { label: "Plot / Land", value: "residential-land", icon: Compass },
    { label: "Commercial", value: "commercial-spaces", icon: Building2 },
    { label: "PG / Co-living", value: "pg", icon: Home },
    { label: "Farmhouse", value: "farmhouse", icon: Trees },
    { label: "Agricultural Land", value: "agricultural-lands", icon: Compass },
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
    if (min > 0 && max < 100000000) return `${formatINRWords(min)} – ${formatINRWords(max)}`;
    if (min > 0) return `> ${formatINRWords(min)}`;
    if (max < 100000000) return `< ${formatINRWords(max)}`;
    return "Price";
  };

  // Property Type summary label
  const getPropertyTypeLabel = () => {
    if (filters.propertyType.length === 0) return "Property Type";
    if (filters.propertyType.length === 1) {
      const val = filters.propertyType[0];
      if (val === "venture" || val === "crda-ventures" || val === "crda-venture") return "CRDA Ventures";
      const match = propertyTypes.find((p) => p.value === val);
      return match ? match.label : val.replace("-", " ");
    }
    return `${filters.propertyType.length} Types`;
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

  // Toggle helper strictly for cities (with automatic locality cleanup and tab sync)
  const toggleCityFilter = (cityName: string, cityId: string) => {
    const currentCities = filters.cities || [];
    const isSelected = currentCities.includes(cityName);

    if (isSelected) {
      // Unselecting this city: remove city AND prune any localities belonging to it
      const updatedCities = currentCities.filter((c) => c !== cityName);
      const targetCity = cities.find((c) => c.name === cityName);
      const citySubNames = new Set((targetCity?.sublocations || []).map((s) => s.name));
      const updatedLocalities = (filters.localities || []).filter((l) => !citySubNames.has(l));

      const nextActiveCity = cities.find((c) => updatedCities.includes(c.name));
      setSelectedCityId(nextActiveCity ? nextActiveCity.id : null);

      onFilterChange({
        ...filters,
        cities: updatedCities,
        localities: updatedLocalities,
      });
    } else {
      // Selecting this city: add it and set it as active tab
      const updatedCities = [...currentCities, cityName];
      setSelectedCityId(cityId);
      onFilterChange({
        ...filters,
        cities: updatedCities,
      });
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* HORIZONTAL FILTER PILLS SCROLL STRIP */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1.5 px-1 touch-pan-x scroll-smooth">
        {/* 1. ALL FILTERS BUTTON */}
        <button
          type="button"
          onClick={onOpenAllFilters}
          aria-label="All Filters"
          title="All Filters"
          className={cn(
            "relative w-9 h-9 rounded-full flex items-center justify-center border transition-all cursor-pointer shrink-0 shadow-xs active:scale-95",
            activeFilterCount > 0
              ? "bg-[#f1a010] text-slate-950 border-[#f1a010]"
              : "bg-white text-slate-800 border-slate-300 hover:border-slate-400"
          )}
        >
          <SlidersHorizontal className="w-4 h-4" />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-slate-950 text-white rounded-full text-[10px] font-black flex items-center justify-center shadow-xs">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* 2. LOCATION & LOCALITIES FILTER BUTTON */}
        <button
          type="button"
          onClick={() =>
            setOpenDropdown(openDropdown === "location" ? null : "location")
          }
          className={cn(
            "h-9 px-3.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer whitespace-nowrap shrink-0 active:scale-95",
            (filters.cities?.length || 0) > 0 || (filters.localities?.length || 0) > 0 || openDropdown === "location"
              ? "bg-[#f1a010] text-slate-950 font-bold border-[#f1a010] shadow-xs"
              : "bg-white text-slate-800 border-slate-300 hover:border-slate-400"
          )}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>{getLocationLabel()}</span>
          <ChevronDown
            className={cn(
              "w-3.5 h-3.5 transition-transform duration-200",
              openDropdown === "location" && "rotate-180"
            )}
          />
        </button>

        {/* 3. HOME TYPE BUTTON */}
        <button
          type="button"
          onClick={() =>
            setOpenDropdown(openDropdown === "propertyType" ? null : "propertyType")
          }
          className={cn(
            "h-9 px-3.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer whitespace-nowrap shrink-0 active:scale-95",
            filters.propertyType.length > 0 || openDropdown === "propertyType"
              ? "bg-[#f1a010] text-slate-950 font-bold border-[#f1a010] shadow-xs"
              : "bg-white text-slate-800 border-slate-300 hover:border-slate-400"
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

        {/* 3. PRICE FILTER BUTTON */}
        <button
          type="button"
          onClick={() => setOpenDropdown(openDropdown === "price" ? null : "price")}
          className={cn(
            "h-9 px-3.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer whitespace-nowrap shrink-0 active:scale-95",
            filters.budget[0] > 0 || filters.budget[1] < 100000000 || openDropdown === "price"
              ? "bg-[#f1a010] text-slate-950 font-bold border-[#f1a010] shadow-xs"
              : "bg-white text-slate-800 border-slate-300 hover:border-slate-400"
          )}
        >
          <IndianRupee className="w-3.5 h-3.5 shrink-0" />
          <span>{getPriceLabel()}</span>
          <ChevronDown
            className={cn(
              "w-3.5 h-3.5 transition-transform duration-200",
              openDropdown === "price" && "rotate-180"
            )}
          />
        </button>

        {/* 4. POSTED BY BUTTON */}
        <button
          type="button"
          onClick={() =>
            setOpenDropdown(openDropdown === "postedBy" ? null : "postedBy")
          }
          className={cn(
            "h-9 px-3.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer whitespace-nowrap shrink-0 active:scale-95",
            filters.postedBy.length > 0 || openDropdown === "postedBy"
              ? "bg-[#f1a010] text-slate-950 font-bold border-[#f1a010] shadow-xs"
              : "bg-white text-slate-800 border-slate-300 hover:border-slate-400"
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

        {/* 5. READY TO OCCUPY TOGGLE */}
        <button
          type="button"
          onClick={() => toggleArrayItem("availability", "ready")}
          className={cn(
            "h-9 px-3.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer whitespace-nowrap shrink-0 active:scale-95",
            filters.availability.includes("ready")
              ? "bg-[#f1a010] text-slate-950 font-bold border-[#f1a010] shadow-xs"
              : "bg-white text-slate-800 border-slate-300 hover:border-slate-400"
          )}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Ready to Occupy</span>
          {filters.availability.includes("ready") && <Check className="w-3.5 h-3.5 stroke-[3]" />}
        </button>

        {/* 6. GATED COMMUNITY TOGGLE */}
        <button
          type="button"
          onClick={() =>
            onFilterChange({ ...filters, gatedCommunity: !filters.gatedCommunity })
          }
          className={cn(
            "h-9 px-3.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer whitespace-nowrap shrink-0 active:scale-95",
            filters.gatedCommunity
              ? "bg-slate-900 text-white border-slate-900 dark:bg-amber-500 dark:text-slate-950 font-bold shadow-xs"
              : "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-800 hover:border-slate-900 dark:hover:border-slate-600"
          )}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Gated Community</span>
          {filters.gatedCommunity && <Check className="w-3.5 h-3.5 stroke-[3]" />}
        </button>
      </div>

      {/* DROPDOWN POPOVERS & MOBILE BOTTOM SHEETS */}
      {openDropdown !== null && mounted && typeof document !== "undefined" &&
        createPortal(
          <div className="md:hidden" ref={portalRef}>
            {/* BACKDROP FOR MOBILE BOTTOM SHEET */}
            <div
              onClick={() => setOpenDropdown(null)}
              className="fixed inset-0 z-[9999] bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200"
            />

            {/* MOBILE BOTTOM SHEET DRAWER */}
            <div className="fixed bottom-0 left-0 right-0 z-[10000] bg-white dark:bg-slate-900 rounded-t-3xl border-t border-slate-200 dark:border-slate-800 p-5 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white capitalize">
                    {openDropdown === "price"
                      ? "Select Budget"
                      : openDropdown === "location"
                      ? "Location & Localities"
                      : openDropdown === "propertyType"
                      ? "Home Type"
                      : "Posted By"}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenDropdown(null)}
                  aria-label="Close"
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-100 flex items-center justify-center transition-all cursor-pointer shrink-0 active:scale-95 shadow-xs"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

              {/* 1. PRICE CONTENT — Exact Home Budget Style (Screenshot 2 Match) */}
              {openDropdown === "price" && (
                <div className="space-y-4 p-1">
                  {/* Row 1: BUDGET: [ ₹ 10 L ⌄ ] TO [ Any Price ⌄ ] */}
                  <div className="flex items-center justify-center gap-2 w-full mx-auto">
                    <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider shrink-0">
                      BUDGET:
                    </span>
                    
                    <ModernBudgetDropdown
                      value={filters.budget[0]}
                      options={getBudgetOpts(BUDGET_MIN_OPTIONS, filters.budget[0])}
                      onChange={(val) => onFilterChange({ ...filters, budget: [val, Math.max(val, filters.budget[1])] })}
                      placeholder="Min Price"
                      className="max-w-[125px]"
                    />

                    <span className="text-slate-600 font-black text-[10px] uppercase shrink-0 px-0.5">TO</span>

                    <ModernBudgetDropdown
                      value={filters.budget[1]}
                      options={getBudgetOpts(BUDGET_MAX_OPTIONS, filters.budget[1], true)}
                      onChange={(val) => onFilterChange({ ...filters, budget: [Math.min(filters.budget[0], val), val] })}
                      placeholder="Any Price"
                      align="right"
                      isMax
                      className="max-w-[125px]"
                    />
                  </div>

                  {/* Row 2: Dual Slider */}
                  <div className="px-1 py-1.5">
                    <Slider
                      min={0}
                      max={100000000}
                      step={500000}
                      value={filters.budget}
                      onValueChange={(val) =>
                        onFilterChange({ ...filters, budget: val as [number, number] })
                      }
                      className="w-full"
                    />
                  </div>

                  {/* Row 3: Full-width Solid Black Pill Apply Button with Count */}
                  <button
                    type="button"
                    onClick={() => setOpenDropdown(null)}
                    className="w-full py-2.5 px-4 bg-slate-950 hover:bg-slate-900 text-white font-black text-xs sm:text-sm rounded-full shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer border border-white/10"
                  >
                    <span>Apply</span>
                    {activeResultsCount !== undefined && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[11px] font-black">
                        {activeResultsCount}
                      </span>
                    )}
                  </button>
                </div>
              )}

              {/* 2. PROPERTY TYPE CONTENT */}
              {openDropdown === "propertyType" && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    {propertyTypes.map((opt) => {
                      const isSelected = filters.propertyType.includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => toggleArrayItem("propertyType", opt.value)}
                          className={cn(
                            "w-full text-left px-3 py-2.5 text-xs rounded-xl font-medium flex items-center justify-between transition-colors cursor-pointer",
                            isSelected
                              ? "bg-amber-500 text-slate-950 font-bold"
                              : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
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
                      onClick={() => onFilterChange({ ...filters, propertyType: [] })}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" /> Reset
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

              {/* 3. POSTED BY CONTENT */}
              {openDropdown === "postedBy" && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    {postedByOptions.map((opt) => {
                      const isSelected = filters.postedBy.includes(opt.value);
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
                          <span>{opt.label}</span>
                          {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                        </button>
                      );
                    })}
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => onFilterChange({ ...filters, postedBy: [] })}
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

              {/* 4. LOCATION & LOCALITIES CONTENT */}
              {openDropdown === "location" && (
                <div className="space-y-4">
                  {/* Cities Row */}
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 px-0.5">
                      Select City / Region
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {cities.map((city) => {
                        const isSelected = (filters.cities || []).includes(city.name);
                        const isTabActive = activeCity?.id === city.id;

                        return (
                          <button
                            key={`mob-city-${city.id}`}
                            type="button"
                            onClick={() => toggleCityFilter(city.name, city.id)}
                            className={cn(
                              "px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1 active:scale-95 shadow-2xs",
                              isSelected
                                ? "bg-amber-500 text-slate-950 font-black"
                                : isTabActive
                                ? "bg-slate-950 text-white dark:bg-slate-800"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200"
                            )}
                          >
                            <MapPin className="w-3 h-3" />
                            <span>{city.name}</span>
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sublocations / Localities for Active City */}
                  {(() => {
                    if (!activeCity) return null;

                    const sublocations = activeCity.sublocations || [];
                    const filteredSublocations = sublocations.filter((sub) => {
                      const q = localitySearch.trim().toLowerCase();
                      if (!q) return true;
                      return (
                        sub.name.toLowerCase().includes(q) ||
                        (sub.tagline && sub.tagline.toLowerCase().includes(q))
                      );
                    });

                    return (
                      <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between px-0.5">
                          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            {activeCity.name} Localities
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {sublocations.length} areas
                          </span>
                        </div>

                        {/* Search Localities */}
                        {sublocations.length > 4 && (
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={localitySearch}
                              onChange={(e) => setLocalitySearch(e.target.value)}
                              placeholder={`Search ${activeCity.name} areas...`}
                              className="w-full h-8 pl-8 pr-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-amber-500 text-slate-900 dark:text-white"
                            />
                            {localitySearch && (
                              <button
                                type="button"
                                onClick={() => setLocalitySearch("")}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}

                        {/* Localities Chips */}
                        <div className="max-h-52 overflow-y-auto pr-1 flex flex-wrap gap-1.5 no-scrollbar">
                          {filteredSublocations.length > 0 ? (
                            filteredSublocations.map((sub) => {
                              const isSelected = (filters.localities || []).includes(sub.name);
                              return (
                                <button
                                  key={`mob-sub-${sub.id || sub.name}`}
                                  type="button"
                                  onClick={() => toggleArrayItem("localities", sub.name)}
                                  className={cn(
                                    "px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 active:scale-95",
                                    isSelected
                                      ? "bg-amber-500 text-slate-950 font-black shadow-xs"
                                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                                  )}
                                >
                                  <span>{sub.name}</span>
                                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                </button>
                              );
                            })
                          ) : (
                            <div className="text-xs text-slate-400 py-3 text-center w-full">
                              No matching localities in {activeCity.name}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Reset / Apply Bar */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        onFilterChange({ ...filters, cities: [], localities: [] });
                      }}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" /> Reset
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(null)}
                      className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-full shadow-xs cursor-pointer"
                    >
                      Apply ({(filters.cities?.length || 0) + (filters.localities?.length || 0)})
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body
        )
      }

      {/* DESKTOP POPOVER CONTAINER (INLINE UNDER BUTTON) */}
      {openDropdown !== null && (
        <div
          className="hidden md:block absolute top-full left-0 mt-2 z-[100] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 animate-in fade-in zoom-in-95 duration-150"
          style={{
            width: openDropdown === "price" ? "340px" : openDropdown === "location" ? "360px" : "280px",
          }}
        >
          {/* 1. PRICE DROPDOWN CONTENT — Exact Home Budget Style (Screenshot 2 Match) */}
          {openDropdown === "price" && (
            <div className="space-y-4 p-1">
              {/* Row 1: BUDGET: [ ₹ 10 L ⌄ ] TO [ Any Price ⌄ ] */}
              <div className="flex items-center justify-center gap-2 w-full mx-auto">
                <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider shrink-0">
                  BUDGET:
                </span>
                
                <ModernBudgetDropdown
                  value={filters.budget[0]}
                  options={getBudgetOpts(BUDGET_MIN_OPTIONS, filters.budget[0])}
                  onChange={(val) => onFilterChange({ ...filters, budget: [val, Math.max(val, filters.budget[1])] })}
                  placeholder="Min Price"
                  className="max-w-[125px]"
                />

                <span className="text-slate-600 font-black text-[10px] uppercase shrink-0 px-0.5">TO</span>

                <ModernBudgetDropdown
                  value={filters.budget[1]}
                  options={getBudgetOpts(BUDGET_MAX_OPTIONS, filters.budget[1], true)}
                  onChange={(val) => onFilterChange({ ...filters, budget: [Math.min(filters.budget[0], val), val] })}
                  placeholder="Any Price"
                  align="right"
                  isMax
                  className="max-w-[125px]"
                />
              </div>

              {/* Row 2: Dual Slider */}
              <div className="px-1 py-1.5">
                <Slider
                  min={0}
                  max={100000000}
                  step={500000}
                  value={filters.budget}
                  onValueChange={(val) =>
                    onFilterChange({ ...filters, budget: val as [number, number] })
                  }
                  className="w-full"
                />
              </div>

              {/* Row 3: Full-width Solid Black Pill Apply Button with Count */}
              <button
                type="button"
                onClick={() => setOpenDropdown(null)}
                className="w-full py-2.5 px-4 bg-slate-950 hover:bg-slate-900 text-white font-black text-xs sm:text-sm rounded-full shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer border border-white/10"
              >
                <span>Apply</span>
                {activeResultsCount !== undefined && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[11px] font-black">
                    {activeResultsCount}
                  </span>
                )}
              </button>
            </div>
          )}

          {/* 2. PROPERTY TYPE DROPDOWN CONTENT */}
          {openDropdown === "propertyType" && (
            <div className="space-y-3">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                Property Type
              </div>
              <div className="space-y-1">
                {propertyTypes.map((opt) => {
                  const isSelected = filters.propertyType.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleArrayItem("propertyType", opt.value)}
                      className={cn(
                        "w-full text-left px-3 py-2.5 text-xs rounded-xl font-medium flex items-center justify-between transition-colors cursor-pointer",
                        isSelected
                          ? "bg-amber-500 text-slate-950 font-bold"
                          : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
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
                  onClick={() => onFilterChange({ ...filters, propertyType: [] })}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" /> Reset
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

          {/* 3. POSTED BY DROPDOWN CONTENT */}
          {openDropdown === "postedBy" && (
            <div className="space-y-3">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                Posted By
              </div>
              <div className="space-y-1">
                {postedByOptions.map((opt) => {
                  const isSelected = filters.postedBy.includes(opt.value);
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

          {/* 4. LOCATION & LOCALITIES DROPDOWN CONTENT (DESKTOP) */}
          {openDropdown === "location" && (
            <div className="space-y-4">
              {/* Cities Row */}
              <div>
                <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 px-0.5">
                  Select City / Region
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {cities.map((city) => {
                    const isSelected = (filters.cities || []).includes(city.name);
                    const isTabActive = activeCity?.id === city.id;

                    return (
                      <button
                        key={`desk-city-${city.id}`}
                        type="button"
                        onClick={() => toggleCityFilter(city.name, city.id)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1 active:scale-95 shadow-2xs",
                          isSelected
                            ? "bg-amber-500 text-slate-950 font-black"
                            : isTabActive
                            ? "bg-slate-950 text-white dark:bg-slate-800"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200"
                        )}
                      >
                        <MapPin className="w-3 h-3" />
                        <span>{city.name}</span>
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sublocations / Localities for Active City */}
              {(() => {
                if (!activeCity) return null;

                const sublocations = activeCity.sublocations || [];
                const filteredSublocations = sublocations.filter((sub) => {
                  const q = localitySearch.trim().toLowerCase();
                  if (!q) return true;
                  return (
                    sub.name.toLowerCase().includes(q) ||
                    (sub.tagline && sub.tagline.toLowerCase().includes(q))
                  );
                });

                return (
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between px-0.5">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        {activeCity.name} Localities
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {sublocations.length} areas
                      </span>
                    </div>

                    {/* Search Localities */}
                    {sublocations.length > 4 && (
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={localitySearch}
                          onChange={(e) => setLocalitySearch(e.target.value)}
                          placeholder={`Search ${activeCity.name} areas...`}
                          style={{ outline: "none", boxShadow: "none" }}
                          className="w-full h-8 pl-8 pr-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:outline-none focus:ring-0 focus:border-slate-400 dark:focus:border-slate-500 text-slate-900 dark:text-white"
                        />
                        {localitySearch && (
                          <button
                            type="button"
                            onClick={() => setLocalitySearch("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}

                    {/* Localities Chips */}
                    <div className="max-h-52 overflow-y-auto pr-1 flex flex-wrap gap-1.5 no-scrollbar">
                      {filteredSublocations.length > 0 ? (
                        filteredSublocations.map((sub) => {
                          const isSelected = (filters.localities || []).includes(sub.name);
                          return (
                            <button
                              key={`desk-sub-${sub.id || sub.name}`}
                              type="button"
                              onClick={() => toggleArrayItem("localities", sub.name)}
                              className={cn(
                                "px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 active:scale-95",
                                isSelected
                                  ? "bg-amber-500 text-slate-950 font-black shadow-xs"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                              )}
                            >
                              <span>{sub.name}</span>
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </button>
                          );
                        })
                      ) : (
                        <div className="text-xs text-slate-400 py-3 text-center w-full">
                          No matching localities in {activeCity.name}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Reset / Apply Bar */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    onFilterChange({ ...filters, cities: [], localities: [] });
                  }}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" /> Reset
                </button>
                <button
                  type="button"
                  onClick={() => setOpenDropdown(null)}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-full shadow-xs cursor-pointer"
                >
                  Apply ({(filters.cities?.length || 0) + (filters.localities?.length || 0)})
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
