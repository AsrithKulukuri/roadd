"use client";

import { useState, useEffect, useMemo } from "react";
import {
  X,
  Check,
  Plus,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Building,
  Home,
  SquareDashed,
  Briefcase,
  Trees,
  SlidersHorizontal,
  Landmark,
} from "lucide-react";
import { formatINRWords, cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { useLocationsStore } from "@/stores/locations-store";
import { usePropertiesStore } from "@/stores/properties-store";
import { useProjectsStore } from "@/stores/projects-store";
import { evaluatePropertyFilters, evaluateProjectFilters } from "@/lib/search-engine";

export interface FilterState {
  query: string;
  cities: string[];
  localities: string[];
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
  sortBy?: string;
  
  // Toggles matching Reference screenshots
  propertiesWithOffers: boolean;
  roadExclusive: boolean;
  certifiedAgentsOnly: boolean;
  reraRegisteredProperties: boolean;
  reraRegisteredAgents: boolean;
  
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
  displayCategory: "all" | "featured" | "recommended" | "budget_friendly" | string;
}

export const initialFilterState: FilterState = {
  query: "",
  cities: [],
  localities: [],
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
  sortBy: "relevance",
  
  propertiesWithOffers: false,
  roadExclusive: false,
  certifiedAgentsOnly: false,
  reraRegisteredProperties: false,
  reraRegisteredAgents: false,
  
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
  displayCategory: "all",
};

interface SearchFiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onApplyFilters: (newFilters: FilterState, targetTab?: "all" | "properties" | "projects") => void;
  totalResults: number;
}

// Left Navigation Tabs for Desktop Modal - Location & Budget at the VERY TOP
const DESKTOP_CATEGORY_TABS = [
  { id: "location", label: "Location / City" },
  { id: "budget", label: "Budget / Price" },
  { id: "propertyType", label: "Property Type" },
  { id: "bhk", label: "BHK & Bathroom" },
  { id: "coveredArea", label: "Covered Area" },
  { id: "possession", label: "Possession Status" },
  { id: "subPropertyType", label: "Sub Property Type" },
  { id: "saleType", label: "Sale Type" },
  { id: "postedSince", label: "Posted Since" },
  { id: "postedBy", label: "Posted By" },
  { id: "furnishing", label: "Furnishing" },
  { id: "amenities", label: "Amenities" },
  { id: "verified", label: "Verified Properties" },
  { id: "media", label: "Photos & Videos" },
  { id: "facing", label: "Facing" },
  { id: "agriculture", label: "Water & Agriculture" },
] as const;

type TabId = (typeof DESKTOP_CATEGORY_TABS)[number]["id"];

// Comprehensive Budget Options for Min / Max Selects
const BUDGET_MIN_OPTIONS = [
  { label: "Min (₹ 0)", value: 0 },
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
  { label: "Max (₹ 10+ Cr)", value: 100000000 },
];

function getBudgetOptionsWithCustom(
  options: { label: string; value: number }[],
  customVal: number,
  isMax = false
) {
  if (options.some((o) => o.value === customVal)) return options;
  const customOption = {
    label: formatINRWords(customVal, isMax),
    value: customVal,
  };
  const list = [...options, customOption];
  return list.sort((a, b) => a.value - b.value);
}

const AREA_MIN_OPTIONS = [
  { label: "Min (0 sqft)", value: 0 },
  { label: "500 sqft", value: 500 },
  { label: "750 sqft", value: 750 },
  { label: "1,000 sqft", value: 1000 },
  { label: "1,250 sqft", value: 1250 },
  { label: "1,500 sqft", value: 1500 },
  { label: "1,750 sqft", value: 1750 },
  { label: "2,000 sqft", value: 2000 },
  { label: "2,500 sqft", value: 2500 },
  { label: "3,000 sqft", value: 3000 },
  { label: "4,000 sqft", value: 4000 },
  { label: "5,000 sqft", value: 5000 },
];

const AREA_MAX_OPTIONS = [
  { label: "750 sqft", value: 750 },
  { label: "1,000 sqft", value: 1000 },
  { label: "1,250 sqft", value: 1250 },
  { label: "1,500 sqft", value: 1500 },
  { label: "1,750 sqft", value: 1750 },
  { label: "2,000 sqft", value: 2000 },
  { label: "2,500 sqft", value: 2500 },
  { label: "3,000 sqft", value: 3000 },
  { label: "4,000 sqft", value: 4000 },
  { label: "5,000 sqft", value: 5000 },
  { label: "7,500 sqft", value: 7500 },
  { label: "Max (10,000+ sqft)", value: 10000 },
];

function getAreaOptionsWithCustom(
  options: { label: string; value: number }[],
  customVal: number,
  isMax = false
) {
  if (options.some((o) => o.value === customVal)) return options;
  const customOption = {
    label: isMax && customVal >= 10000 ? "Max (10,000+ sqft)" : `${customVal.toLocaleString()} sqft`,
    value: customVal,
  };
  const list = [...options, customOption];
  return list.sort((a, b) => a.value - b.value);
}

// ─── Reusable Components ────────────────────────────────────────────────────

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  label: string;
}) {
  return (
    <div
      className="flex items-center justify-between py-3 cursor-pointer select-none"
      onClick={() => onChange(!checked)}
    >
      <span className="text-[13px] font-medium text-slate-800">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={(e) => {
          e.stopPropagation();
          onChange(!checked);
        }}
        className={cn(
          "w-11 h-6 rounded-full transition-colors relative focus:outline-none cursor-pointer shrink-0",
          checked ? "bg-amber-500" : "bg-slate-200"
        )}
      >
        <span
          className={cn(
            "w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform absolute top-1 left-1",
            checked ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    </div>
  );
}

function PillTag({
  label,
  isSelected,
  onClick,
}: {
  label: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "py-2 px-4 rounded-full text-xs sm:text-[13px] font-medium border transition-all cursor-pointer flex items-center gap-1.5 select-none shrink-0 whitespace-nowrap",
        isSelected
          ? "bg-[#e6f4f2] text-[#008075] border-[#008075]/40 font-semibold"
          : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
      )}
    >
      {isSelected ? (
        <Check className="w-3.5 h-3.5 text-[#008075] stroke-[2.5]" />
      ) : (
        <Plus className="w-3.5 h-3.5 text-slate-400 stroke-[2]" />
      )}
      <span>{label}</span>
    </button>
  );
}

function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="py-4 border-b border-slate-100 last:border-b-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left cursor-pointer select-none group"
      >
        <span className="text-[13px] font-semibold text-slate-900 group-hover:text-slate-950">
          {title}
        </span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>
      {isOpen && <div className="mt-3">{children}</div>}
    </div>
  );
}

// ─── Main Modal Component (Desktop Modal + Mobile Full-Screen Continuous View) ─

export function SearchFiltersModal({
  isOpen,
  onClose,
  filters,
  onApplyFilters,
  totalResults,
}: SearchFiltersModalProps) {
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);
  const [activeDesktopTab, setActiveDesktopTab] = useState<TabId>("location");
  const { cities, fetchLocations } = useLocationsStore();
  const properties = usePropertiesStore((state) => state.properties);
  const projects = useProjectsStore((state) => state.projects);
  const fetchProperties = usePropertiesStore((state) => state.fetchProperties);
  const fetchProjects = useProjectsStore((state) => state.fetchProjects);

  useEffect(() => {
    fetchLocations();
    if (properties.length === 0) fetchProperties();
    if (projects.length === 0) fetchProjects();
  }, [fetchLocations, fetchProperties, fetchProjects, properties.length, projects.length]);

  useEffect(() => {
    if (isOpen) {
      setLocalFilters(filters);
    }
  }, [isOpen, filters]);

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

  // Real-time matching property and project count calculated dynamically from active localFilters
  const { totalCount, propCount, projCount } = useMemo(() => {
    const propMatches = (properties || []).filter((p) => evaluatePropertyFilters(p, localFilters));
    const projMatches = (projects || []).filter((proj) => evaluateProjectFilters(proj, localFilters));

    return {
      totalCount: propMatches.length + projMatches.length,
      propCount: propMatches.length,
      projCount: projMatches.length,
    };
  }, [properties, projects, localFilters]);

  // Calculate dynamic active filter count matching screenshot (Hook called unconditionally)
  const activeCount = useMemo(() => {
    let count = 0;
    if ((localFilters.cities || []).length > 0) count += localFilters.cities.length;
    if ((localFilters.localities || []).length > 0) count += localFilters.localities.length;
    if (localFilters.propertyType.length > 0) count += localFilters.propertyType.length;
    if (localFilters.bhk.length > 0) count += localFilters.bhk.length;
    if (localFilters.bathrooms.length > 0) count += localFilters.bathrooms.length;
    if (localFilters.budget[0] > 0 || localFilters.budget[1] < 100000000) count += 1;
    if (localFilters.coveredArea[0] > 0 || localFilters.coveredArea[1] < 10000) count += 1;
    if (localFilters.possessionStatus.length > 0) count += localFilters.possessionStatus.length;
    if (localFilters.saleType.length > 0) count += localFilters.saleType.length;
    if (localFilters.postedBy.length > 0) count += localFilters.postedBy.length;
    if (localFilters.furnished.length > 0) count += localFilters.furnished.length;
    if (localFilters.amenities.length > 0) count += localFilters.amenities.length;
    if (localFilters.facing.length > 0) count += localFilters.facing.length;
    if (localFilters.mediaTypes.length > 0) count += localFilters.mediaTypes.length;
    if (localFilters.postedSince && localFilters.postedSince !== "any") count += 1;
    if (localFilters.roadExclusive) count += 1;
    if (localFilters.reraRegisteredProperties) count += 1;
    if (localFilters.reraRegisteredAgents) count += 1;
    if (localFilters.vastuCompliant) count += 1;
    return count;
  }, [localFilters]);

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
    setLocalFilters({ ...initialFilterState });
  };

  const handleApply = (targetTab?: "all" | "properties" | "projects") => {
    onApplyFilters(localFilters, targetTab);
    onClose();
  };

  // Master Amenities list for 2-column checkbox grid
  const AMENITIES_GRID = [
    { label: "Reserved Parking", val: "reserved parking" },
    { label: "Lift", val: "lift" },
    { label: "Power Back Up", val: "power backup" },
    { label: "Piped Gas", val: "gas pipeline" },
    { label: "Park", val: "park" },
    { label: "Kids play area", val: "kids play area" },
    { label: "Gymnasium", val: "gymnasium" },
    { label: "Swimming Pool", val: "swimming pool" },
    { label: "Club House", val: "clubhouse" },
    { label: "Vaastu Compliant", val: "vaastu compliant" },
    { label: "Air Conditioned", val: "air conditioned" },
    { label: "Internet/Wi-Fi", val: "wifi" },
  ];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-xs flex items-center justify-center p-0 md:p-4"
    >
      {/* ══════════════════════════════════════════════════════════════════════
          MOBILE ONLY: Full-Screen Continuous Vertical Scroll Filter View (< 768px)
          Exact structural match to the 4 user reference screenshots
         ══════════════════════════════════════════════════════════════════════ */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="md:hidden bg-white text-slate-900 w-full h-full flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200"
      >
        {/* 1. Header: Back Arrow | Filters (X) | Reset */}
        <div className="px-4 py-3.5 border-b border-slate-100 bg-white flex items-center justify-between shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="p-1 -ml-1 text-slate-800 hover:text-slate-950 cursor-pointer"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
            </button>
            <h2 className="text-base font-semibold text-slate-900 tracking-tight">
              Filters {activeCount > 0 && <span className="text-slate-500 font-normal">({activeCount})</span>}
            </h2>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="text-sm font-semibold text-[#d8232a] hover:underline cursor-pointer"
          >
            Reset
          </button>
        </div>

        {/* 2. Scrollable Body: One Continuous Vertical Page */}
        <div className="flex-1 overflow-y-auto px-4 pb-28 text-xs divide-y divide-slate-100 no-scrollbar">

          {/* Sort By */}
          <div className="py-3.5">
            <label className="text-[13px] font-semibold text-slate-900 block mb-2.5">Sort By</label>
            <div className="flex gap-2.5 overflow-x-auto no-scrollbar py-1">
              {[
                { label: "Relevance", val: "relevance" },
                { label: "Price - Low to High", val: "price_asc" },
                { label: "Price - High to Low", val: "price_desc" },
                { label: "Newest", val: "newest" },
              ].map((sort) => {
                const isSelected = (localFilters.sortBy || "relevance") === sort.val;
                return (
                  <button
                    key={sort.val}
                    type="button"
                    onClick={() => setLocalFilters({ ...localFilters, sortBy: sort.val })}
                    className={cn(
                      "py-2 px-4 rounded-full text-xs sm:text-[13px] font-medium border transition-all cursor-pointer whitespace-nowrap select-none shrink-0",
                      isSelected
                        ? "bg-[#e6f4f2] text-[#008075] border-[#008075]/40 font-semibold"
                        : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                    )}
                  >
                    {sort.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Select City/Localities from Master Locations (Multi-Select Supported) */}
          <div className="py-3.5 space-y-2">
            <label className="text-[13px] font-semibold text-slate-900 block">
              Select City / Primary Location
            </label>
            <div className="flex gap-2.5 overflow-x-auto no-scrollbar py-1">
              {cities.map((city) => {
                const isSelected = (localFilters.cities || []).includes(city.name);
                return (
                  <button
                    key={city.id}
                    type="button"
                    onClick={() => {
                      const nextCities = isSelected
                        ? (localFilters.cities || []).filter((c) => c !== city.name)
                        : [...(localFilters.cities || []), city.name];
                      setLocalFilters({ ...localFilters, cities: nextCities });
                    }}
                    className={cn(
                      "py-2 px-4 rounded-full text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer border",
                      isSelected
                        ? "bg-[#e6f4f2] text-[#008075] border-[#008075]/40"
                        : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                    )}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 inline mr-1 stroke-[2.5]" />}
                    {city.name}
                  </button>
                );
              })}
            </div>

            {/* Sublocalities for selected city or top cities (Multi-Select) */}
            <div className="pt-1">
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Popular Localities & Hubs
              </label>
              <div className="flex gap-2 overflow-x-auto no-scrollbar py-0.5">
                {cities.flatMap((c) => c.sublocations).slice(0, 16).map((sub) => {
                  const isSelected = (localFilters.localities || []).includes(sub.name);
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => {
                        const nextLocs = isSelected
                          ? (localFilters.localities || []).filter((l) => l !== sub.name)
                          : [...(localFilters.localities || []), sub.name];
                        setLocalFilters({ ...localFilters, localities: nextLocs });
                      }}
                      className={cn(
                        "py-1.5 px-3 rounded-full text-xs font-medium border transition-all whitespace-nowrap shrink-0 cursor-pointer",
                        isSelected
                          ? "bg-[#008075] text-white border-[#008075] font-semibold"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      )}
                    >
                      {isSelected && <Check className="w-3 h-3 inline mr-1 stroke-[2.5]" />}
                      {sub.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Budget: Dropdowns + Range Slider */}
          <div className="py-3.5 space-y-3">
            <label className="text-[13px] font-semibold text-slate-900 block">Budget</label>
            <div className="flex items-center gap-3">
              <select
                value={localFilters.budget[0]}
                onChange={(e) =>
                  setLocalFilters({
                    ...localFilters,
                    budget: [parseInt(e.target.value, 10), localFilters.budget[1]],
                  })
                }
                className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 outline-none"
              >
                {getBudgetOptionsWithCustom(BUDGET_MIN_OPTIONS, localFilters.budget[0]).map((opt) => (
                  <option key={`min-${opt.value}`} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <span className="text-xs text-slate-500 font-medium">to</span>

              <select
                value={localFilters.budget[1]}
                onChange={(e) =>
                  setLocalFilters({
                    ...localFilters,
                    budget: [localFilters.budget[0], parseInt(e.target.value, 10)],
                  })
                }
                className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 outline-none"
              >
                {getBudgetOptionsWithCustom(BUDGET_MAX_OPTIONS, localFilters.budget[1], true).map((opt) => (
                  <option key={`max-${opt.value}`} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <Slider
              min={0}
              max={100000000}
              step={500000}
              value={localFilters.budget}
              onValueChange={(val) => setLocalFilters({ ...localFilters, budget: val as [number, number] })}
              className="w-full py-2"
            />
          </div>

          {/* Property Type: Large Horizontal Cards with checkmark */}
          <div className="py-3.5">
            <label className="text-[13px] font-semibold text-slate-900 block mb-2.5">
              Property Type
            </label>
            <div className="flex gap-2.5 overflow-x-auto no-scrollbar py-1">
              {[
                { label: "Flat", val: "apartment", icon: Building },
                { label: "House/Villa", val: "villa", icon: Home },
                { label: "CRDA Ventures", val: "venture", icon: Landmark },
                { label: "Plot/Land", val: "residential-land", icon: Trees },
                { label: "Commercial", val: "commercial-spaces", icon: Briefcase },
              ].map((item) => {
                const isSelected = localFilters.propertyType.includes(item.val);
                const Icon = item.icon;
                return (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => toggleArrayFilter("propertyType", item.val)}
                    className={cn(
                      "min-w-[100px] h-[86px] rounded-2xl border p-2.5 flex flex-col items-center justify-center relative transition-all cursor-pointer shrink-0 select-none",
                      isSelected
                        ? "bg-[#e6f4f2] border-[#008075]/40 text-slate-950 font-semibold shadow-xs"
                        : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                    )}
                  >
                    {isSelected && (
                      <span className="absolute top-2 right-2 text-[#008075]">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </span>
                    )}
                    <Icon className={cn("w-6 h-6 mb-1.5", isSelected ? "text-[#008075]" : "text-slate-600")} />
                    <span className="text-xs leading-tight">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* BHK */}
          <div className="py-3.5">
            <label className="text-[13px] font-semibold text-slate-900 block mb-2.5">BHK</label>
            <div className="flex gap-2.5 overflow-x-auto no-scrollbar py-1">
              {["1 BHK", "2 BHK", "3 BHK", "4 BHK", "5 BHK", "5+ BHK"].map((bhk) => {
                const cleanVal = bhk.replace(" BHK", "");
                const isSelected = localFilters.bhk.includes(cleanVal);
                return (
                  <PillTag
                    key={bhk}
                    label={bhk}
                    isSelected={isSelected}
                    onClick={() => toggleArrayFilter("bhk", cleanVal)}
                  />
                );
              })}
            </div>
          </div>

          {/* Posted By */}
          <CollapsibleSection title="Posted By">
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-0.5">
              {[
                { label: "Owners", val: "owner" },
                { label: "Agents", val: "agent" },
                { label: "Builders", val: "builder" },
              ].map((p) => {
                const isSelected = localFilters.postedBy.includes(p.val);
                return (
                  <PillTag
                    key={p.val}
                    label={p.label}
                    isSelected={isSelected}
                    onClick={() => toggleArrayFilter("postedBy", p.val)}
                  />
                );
              })}
            </div>
          </CollapsibleSection>

          {/* Covered Area */}
          <CollapsibleSection title="Covered Area (sqft)">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500">Selected Range</span>
                <span className="text-xs font-black text-[#008075] bg-[#e6f4f2] px-2.5 py-0.5 rounded-full">
                  {localFilters.coveredArea[0] === 0 ? "0 sqft" : `${localFilters.coveredArea[0].toLocaleString()} sqft`} – {localFilters.coveredArea[1] >= 10000 ? "10,000+ sqft" : `${localFilters.coveredArea[1].toLocaleString()} sqft`}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={localFilters.coveredArea[0]}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      coveredArea: [parseInt(e.target.value, 10), localFilters.coveredArea[1]],
                    })
                  }
                  className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 outline-none"
                >
                  {getAreaOptionsWithCustom(AREA_MIN_OPTIONS, localFilters.coveredArea[0], false).map((opt) => (
                    <option key={`area-min-${opt.value}`} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                <span className="text-xs text-slate-500 font-medium">to</span>

                <select
                  value={localFilters.coveredArea[1]}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      coveredArea: [localFilters.coveredArea[0], parseInt(e.target.value, 10)],
                    })
                  }
                  className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 outline-none"
                >
                  {getAreaOptionsWithCustom(AREA_MAX_OPTIONS, localFilters.coveredArea[1], true).map((opt) => (
                    <option key={`area-max-${opt.value}`} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
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
            </div>
          </CollapsibleSection>

          {/* Possession Status */}
          <CollapsibleSection title="Possession Status">
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-0.5">
              {[
                { label: "Ready To Move", val: "ready" },
                { label: "Under Construction", val: "under-construction" },
                { label: "Upcoming", val: "upcoming" },
              ].map((p) => {
                const isSelected = localFilters.possessionStatus.includes(p.val);
                return (
                  <PillTag
                    key={p.val}
                    label={p.label}
                    isSelected={isSelected}
                    onClick={() => toggleArrayFilter("possessionStatus", p.val)}
                  />
                );
              })}
            </div>
          </CollapsibleSection>

          {/* Sub Property Type */}
          <CollapsibleSection title="Sub Property Type">
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-0.5">
              {[
                { label: "ALL RESIDENTIAL", val: "all_residential" },
                { label: "Residential Plot", val: "residential-land" },
                { label: "Residential Flat", val: "apartment" },
                { label: "Villa", val: "villa" },
                { label: "Builder Floor", val: "builder-floor" },
                { label: "Penthouse", val: "penthouse" },
              ].map((st) => {
                const isSelected =
                  st.val === "all_residential"
                    ? localFilters.propertyType.length === 0
                    : localFilters.propertyType.includes(st.val);
                return (
                  <PillTag
                    key={st.val}
                    label={st.label}
                    isSelected={isSelected}
                    onClick={() => {
                      if (st.val === "all_residential") {
                        setLocalFilters({ ...localFilters, propertyType: [] });
                      } else {
                        toggleArrayFilter("propertyType", st.val);
                      }
                    }}
                  />
                );
              })}
            </div>
          </CollapsibleSection>

          {/* Sale Type */}
          <CollapsibleSection title="Sale Type">
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-0.5">
              {[
                { label: "New", val: "new" },
                { label: "Resale", val: "resale" },
              ].map((st) => {
                const isSelected = localFilters.saleType.includes(st.val);
                return (
                  <PillTag
                    key={st.val}
                    label={st.label}
                    isSelected={isSelected}
                    onClick={() => toggleArrayFilter("saleType", st.val)}
                  />
                );
              })}
            </div>
          </CollapsibleSection>

          {/* Posted Since */}
          <CollapsibleSection title="Posted Since">
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-0.5">
              {[
                { label: "All", val: "any" },
                { label: "Yesterday", val: "1day" },
                { label: "Last Week", val: "7days" },
                { label: "Last 2 Weeks", val: "15days" },
                { label: "Last Month", val: "30days" },
              ].map((d) => {
                const isSelected = localFilters.postedSince === d.val;
                return (
                  <PillTag
                    key={d.val}
                    label={d.label}
                    isSelected={isSelected}
                    onClick={() => setLocalFilters({ ...localFilters, postedSince: d.val })}
                  />
                );
              })}
            </div>
          </CollapsibleSection>

          {/* Furnishing */}
          <CollapsibleSection title="Furnishing">
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-0.5">
              {[
                { label: "Furnished", val: "furnished" },
                { label: "Semi-Furnished", val: "semi-furnished" },
                { label: "Unfurnished", val: "unfurnished" },
              ].map((f) => {
                const isSelected = localFilters.furnished.includes(f.val);
                return (
                  <PillTag
                    key={f.val}
                    label={f.label}
                    isSelected={isSelected}
                    onClick={() => toggleArrayFilter("furnished", f.val)}
                  />
                );
              })}
            </div>
          </CollapsibleSection>

          {/* Amenities: 2-Column Checkbox Grid matching screenshot */}
          <CollapsibleSection title="Amenities">
            <div className="grid grid-cols-2 gap-y-3 gap-x-4 py-1">
              {AMENITIES_GRID.map((amenity) => {
                const isChecked = localFilters.amenities.includes(amenity.val);
                return (
                  <label
                    key={amenity.val}
                    className="flex items-center gap-2.5 text-xs text-slate-800 cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleArrayFilter("amenities", amenity.val)}
                      className="w-4 h-4 rounded border-slate-300 text-[#008075] focus:ring-[#008075] accent-[#008075]"
                    />
                    <span className="truncate">{amenity.label}</span>
                  </label>
                );
              })}
            </div>
          </CollapsibleSection>

          {/* Verified Properties Toggle */}
          <div className="py-1">
            <ToggleSwitch
              label="Verified Properties"
              checked={localFilters.verifiedBadges.includes("owner_verified")}
              onChange={() => toggleArrayFilter("verifiedBadges", "owner_verified")}
            />
          </div>

          {/* Photos & Videos */}
          <CollapsibleSection title="Photos & Videos">
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-0.5">
              {[
                { label: "Photos", val: "photos" },
                { label: "Videos", val: "video" },
              ].map((m) => {
                const isSelected = localFilters.mediaTypes.includes(m.val);
                return (
                  <PillTag
                    key={m.val}
                    label={m.label}
                    isSelected={isSelected}
                    onClick={() => toggleArrayFilter("mediaTypes", m.val)}
                  />
                );
              })}
            </div>
          </CollapsibleSection>

          {/* Facing */}
          <CollapsibleSection title="Facing">
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-0.5">
              {[
                "East",
                "North",
                "North - East",
                "North - West",
                "South",
                "South - East",
                "South - West",
                "West",
              ].map((face) => {
                const clean = face.toLowerCase().replace(/\s+/g, "");
                const isSelected = localFilters.facing.includes(clean);
                return (
                  <PillTag
                    key={face}
                    label={face}
                    isSelected={isSelected}
                    onClick={() => toggleArrayFilter("facing", clean)}
                  />
                );
              })}
            </div>
          </CollapsibleSection>

          {/* Number of washrooms */}
          <CollapsibleSection title="Number of washrooms">
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-0.5">
              {["1", "2", "3", "4", "5"].map((w) => {
                const isSelected = localFilters.bathrooms.includes(w);
                return (
                  <PillTag
                    key={w}
                    label={w}
                    isSelected={isSelected}
                    onClick={() => toggleArrayFilter("bathrooms", w)}
                  />
                );
              })}
            </div>
          </CollapsibleSection>

          {/* Feature Toggle Switches */}
          <div className="divide-y divide-slate-100 py-1">
            <ToggleSwitch
              label="RERA Registered Properties"
              checked={localFilters.reraRegisteredProperties}
              onChange={(val) => setLocalFilters({ ...localFilters, reraRegisteredProperties: val })}
            />
            <ToggleSwitch
              label="RERA Registered Agents"
              checked={localFilters.reraRegisteredAgents}
              onChange={(val) => setLocalFilters({ ...localFilters, reraRegisteredAgents: val })}
            />
          </div>

        </div>

        {/* 3. Sticky Bottom CTA — 3 Smart Count Buttons */}
        <div className="p-3 bg-white border-t border-slate-100 fixed bottom-0 left-0 right-0 z-30 shadow-2xl flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleApply("all")}
            className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-98 text-slate-950 font-black text-xs rounded-full shadow-sm transition-all cursor-pointer text-center flex items-center justify-center gap-1"
          >
            <span>All</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-950/15 text-slate-950 font-black text-[11px]">
              {totalCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => handleApply("properties")}
            className="flex-1 py-2.5 bg-slate-950 hover:bg-slate-900 active:scale-98 text-white font-black text-xs rounded-full shadow-sm transition-all cursor-pointer text-center flex items-center justify-center gap-1"
          >
            <span>Properties</span>
            <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-white font-black text-[11px]">
              {propCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => handleApply("projects")}
            className="flex-1 py-2.5 bg-slate-950 hover:bg-slate-900 active:scale-98 text-white font-black text-xs rounded-full shadow-sm transition-all cursor-pointer text-center flex items-center justify-center gap-1"
          >
            <span>Projects</span>
            <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-white font-black text-[11px]">
              {projCount}
            </span>
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          DESKTOP ONLY: 2-Column Split Pure White Modal (>= 768px)
          Desktop Discoverability & Layout Intact
         ══════════════════════════════════════════════════════════════════════ */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="hidden md:flex bg-white text-slate-900 rounded-2xl w-full max-w-3xl h-[85vh] max-h-[650px] flex-col shadow-2xl overflow-hidden border border-slate-200 relative"
      >
        {/* Desktop Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 z-20 p-1.5 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Close filters"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Desktop 2-Column Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column */}
          <div className="w-[220px] border-r border-slate-200 bg-white overflow-y-auto shrink-0 divide-y divide-slate-100 no-scrollbar">
            {DESKTOP_CATEGORY_TABS.map((tab) => {
              const active = activeDesktopTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveDesktopTab(tab.id)}
                  className={cn(
                    "w-full text-left px-5 py-3.5 flex items-center justify-between text-[13px] font-normal transition-colors cursor-pointer",
                    active ? "text-slate-900 font-semibold bg-slate-50/80" : "text-slate-700 hover:bg-slate-50/50"
                  )}
                >
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right Column */}
          <div className="flex-1 overflow-y-auto p-7 space-y-5 text-xs bg-white no-scrollbar">
            {/* 1. Location / City Tab (Default & Top Priority) */}
            {activeDesktopTab === "location" && (
              <div className="space-y-6">
                <div>
                  <label className="text-[13px] font-semibold text-slate-900 block mb-2.5">
                    Select City / Primary Location (Multi-Select Allowed)
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {cities.map((city) => {
                      const isSelected = (localFilters.cities || []).includes(city.name);
                      return (
                        <button
                          key={city.id}
                          type="button"
                          onClick={() => {
                            const nextCities = isSelected
                              ? (localFilters.cities || []).filter((c) => c !== city.name)
                              : [...(localFilters.cities || []), city.name];
                            setLocalFilters({ ...localFilters, cities: nextCities });
                          }}
                          className={cn(
                            "py-2 px-4 rounded-full text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer border",
                            isSelected
                              ? "bg-[#e6f4f2] text-[#008075] border-[#008075]/40"
                              : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                          )}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 inline mr-1 stroke-[2.5]" />}
                          {city.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Sublocalities Section */}
                <div className="pt-2 border-t border-slate-100">
                  <label className="text-[13px] font-semibold text-slate-900 block mb-2.5">
                    Select Popular Localities & Hubs (Multi-Select Allowed)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {cities.flatMap((c) => c.sublocations).map((sub) => {
                      const isSelected = (localFilters.localities || []).includes(sub.name);
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => {
                            const nextLocs = isSelected
                              ? (localFilters.localities || []).filter((l) => l !== sub.name)
                              : [...(localFilters.localities || []), sub.name];
                            setLocalFilters({ ...localFilters, localities: nextLocs });
                          }}
                          className={cn(
                            "py-1.5 px-3 rounded-full text-xs font-medium border transition-all whitespace-nowrap shrink-0 cursor-pointer",
                            isSelected
                              ? "bg-[#008075] text-white border-[#008075] font-semibold"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                          )}
                        >
                          {isSelected && <Check className="w-3 h-3 inline mr-1 stroke-[2.5]" />}
                          {sub.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quick Toggle Switches */}
                <div className="divide-y divide-slate-100 pt-3 border-t border-slate-100">
                  <ToggleSwitch
                    label="ROAD Exclusive Properties"
                    checked={localFilters.roadExclusive}
                    onChange={(val) => setLocalFilters({ ...localFilters, roadExclusive: val })}
                  />
                  <ToggleSwitch
                    label="RERA Registered Properties"
                    checked={localFilters.reraRegisteredProperties}
                    onChange={(val) => setLocalFilters({ ...localFilters, reraRegisteredProperties: val })}
                  />
                  <ToggleSwitch
                    label="RERA Registered Agents"
                    checked={localFilters.reraRegisteredAgents}
                    onChange={(val) => setLocalFilters({ ...localFilters, reraRegisteredAgents: val })}
                  />
                </div>
              </div>
            )}

            {/* 2. Budget / Price Tab */}
            {activeDesktopTab === "budget" && (
              <div className="space-y-5">
                <div className="flex justify-between items-center pr-10">
                  <span className="text-[13px] font-semibold text-slate-900">Budget Range</span>
                  <span className="text-xs font-semibold text-[#008075]">
                    {formatINRWords(localFilters.budget[0])} – {formatINRWords(localFilters.budget[1], true)}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <select
                    value={localFilters.budget[0]}
                    onChange={(e) =>
                      setLocalFilters({
                        ...localFilters,
                        budget: [parseInt(e.target.value, 10), localFilters.budget[1]],
                      })
                    }
                    className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 outline-none cursor-pointer"
                  >
                    {getBudgetOptionsWithCustom(BUDGET_MIN_OPTIONS, localFilters.budget[0]).map((opt) => (
                      <option key={`desk-min-${opt.value}`} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>

                  <span className="text-xs text-slate-500 font-medium">to</span>

                  <select
                    value={localFilters.budget[1]}
                    onChange={(e) =>
                      setLocalFilters({
                        ...localFilters,
                        budget: [localFilters.budget[0], parseInt(e.target.value, 10)],
                      })
                    }
                    className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 outline-none cursor-pointer"
                  >
                    {getBudgetOptionsWithCustom(BUDGET_MAX_OPTIONS, localFilters.budget[1], true).map((opt) => (
                      <option key={`desk-max-${opt.value}`} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <Slider
                  min={0}
                  max={100000000}
                  step={500000}
                  value={localFilters.budget}
                  onValueChange={(val) => setLocalFilters({ ...localFilters, budget: val as [number, number] })}
                  className="w-full py-2"
                />

                <div className="pt-2">
                  <label className="text-[13px] font-semibold text-slate-900 block mb-2">
                    Popular Price Ranges
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "Under ₹25 L", min: 0, max: 2500000 },
                      { label: "₹25 L – ₹50 L", min: 2500000, max: 5000000 },
                      { label: "₹50 L – ₹75 L", min: 5000000, max: 7500000 },
                      { label: "₹75 L – ₹1 Cr", min: 7500000, max: 10000000 },
                      { label: "₹1 Cr – ₹2 Cr", min: 10000000, max: 20000000 },
                      { label: "₹2 Cr+", min: 20000000, max: 100000000 },
                    ].map((preset) => {
                      const isSelected = localFilters.budget[0] === preset.min && localFilters.budget[1] === preset.max;
                      return (
                        <PillTag
                          key={preset.label}
                          label={preset.label}
                          isSelected={isSelected}
                          onClick={() => setLocalFilters({ ...localFilters, budget: [preset.min, preset.max] })}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 3. Property Type Tab */}
            {activeDesktopTab === "propertyType" && (
              <div className="space-y-5">
                <label className="text-[13px] font-semibold text-slate-900 block">Property Type</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {[
                    { label: "Flat / Apartment", val: "apartment", icon: Building },
                    { label: "House / Villa", val: "villa", icon: Home },
                    { label: "CRDA Ventures", val: "venture", icon: Landmark },
                    { label: "Plot / Land", val: "residential-land", icon: Trees },
                    { label: "Commercial Space", val: "commercial-spaces", icon: Briefcase },
                  ].map((item) => {
                    const isSelected = localFilters.propertyType.includes(item.val);
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.val}
                        type="button"
                        onClick={() => toggleArrayFilter("propertyType", item.val)}
                        className={cn(
                          "h-24 rounded-2xl border p-3 flex flex-col items-center justify-center relative transition-all cursor-pointer select-none",
                          isSelected
                            ? "bg-[#e6f4f2] border-[#008075]/40 text-slate-950 font-semibold shadow-xs"
                            : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                        )}
                      >
                        {isSelected && (
                          <span className="absolute top-2 right-2 text-[#008075]">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </span>
                        )}
                        <Icon className={cn("w-6 h-6 mb-1.5", isSelected ? "text-[#008075]" : "text-slate-600")} />
                        <span className="text-xs text-center">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4. BHK & Bathroom Tab */}
            {activeDesktopTab === "bhk" && (
              <div className="space-y-5">
                <div>
                  <label className="text-[13px] font-semibold text-slate-900 block mb-2.5">Bedrooms (BHK)</label>
                  <div className="flex flex-wrap gap-2.5">
                    {["1 BHK", "2 BHK", "3 BHK", "4 BHK", "5 BHK", "5+ BHK"].map((bhk) => {
                      const cleanVal = bhk.replace(" BHK", "");
                      const isSelected = localFilters.bhk.includes(cleanVal);
                      return (
                        <PillTag
                          key={bhk}
                          label={bhk}
                          isSelected={isSelected}
                          onClick={() => toggleArrayFilter("bhk", cleanVal)}
                        />
                      );
                    })}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <label className="text-[13px] font-semibold text-slate-900 block mb-2.5">Number of Bathrooms</label>
                  <div className="flex flex-wrap gap-2.5">
                    {["1", "2", "3", "4", "5+"].map((bath) => (
                      <PillTag
                        key={bath}
                        label={bath}
                        isSelected={localFilters.bathrooms.includes(bath)}
                        onClick={() => toggleArrayFilter("bathrooms", bath)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 5. Covered Area Tab */}
            {activeDesktopTab === "coveredArea" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center pr-10">
                  <span className="text-[13px] font-semibold text-slate-900">Covered Area (sqft)</span>
                  <span className="text-xs font-semibold text-[#008075]">
                    {localFilters.coveredArea[0]} sqft – {localFilters.coveredArea[1] >= 10000 ? "10,000+ sqft" : `${localFilters.coveredArea[1]} sqft`}
                  </span>
                </div>
                <Slider
                  min={0}
                  max={10000}
                  step={100}
                  value={localFilters.coveredArea}
                  onValueChange={(val) => setLocalFilters({ ...localFilters, coveredArea: val as [number, number] })}
                  className="w-full py-2"
                />
              </div>
            )}

            {/* 6. Possession Status Tab */}
            {activeDesktopTab === "possession" && (
              <div className="space-y-4">
                <label className="text-[13px] font-semibold text-slate-900 block">Possession Status</label>
                <div className="flex flex-wrap gap-2.5">
                  {[
                    { label: "Ready to Move", val: "ready" },
                    { label: "Under Construction", val: "under-construction" },
                    { label: "Within 3 Months", val: "3months" },
                    { label: "Within 6 Months", val: "6months" },
                    { label: "Within 1 Year", val: "1year" },
                  ].map((p) => (
                    <PillTag
                      key={p.val}
                      label={p.label}
                      isSelected={localFilters.possessionStatus.includes(p.val)}
                      onClick={() => toggleArrayFilter("possessionStatus", p.val)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 7. Sub Property Type Tab */}
            {activeDesktopTab === "subPropertyType" && (
              <div className="space-y-4">
                <label className="text-[13px] font-semibold text-slate-900 block">Residential Properties</label>
                <div className="flex flex-wrap gap-2.5">
                  {[
                    { label: "Multistorey Apartment", val: "apartment" },
                    { label: "Builder Floor", val: "builder-floor" },
                    { label: "Villa", val: "villa" },
                    { label: "Residential Plot", val: "residential-land" },
                    { label: "Penthouse", val: "penthouse" },
                    { label: "Studio Apartment", val: "studio" },
                    { label: "Farm House", val: "farmhouse" },
                  ].map((item) => (
                    <PillTag
                      key={item.val}
                      label={item.label}
                      isSelected={localFilters.propertyType.includes(item.val)}
                      onClick={() => toggleArrayFilter("propertyType", item.val)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 8. Sale Type Tab */}
            {activeDesktopTab === "saleType" && (
              <div className="space-y-4">
                <label className="text-[13px] font-semibold text-slate-900 block">Sale Type</label>
                <div className="flex flex-wrap gap-2.5">
                  {[
                    { label: "New Property", val: "new" },
                    { label: "Resale", val: "resale" },
                  ].map((st) => (
                    <PillTag
                      key={st.val}
                      label={st.label}
                      isSelected={localFilters.saleType.includes(st.val)}
                      onClick={() => toggleArrayFilter("saleType", st.val)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 9. Posted Since Tab */}
            {activeDesktopTab === "postedSince" && (
              <div className="space-y-4">
                <label className="text-[13px] font-semibold text-slate-900 block">Posted Since</label>
                <div className="flex flex-wrap gap-2.5">
                  {[
                    { label: "All Properties", val: "any" },
                    { label: "Yesterday", val: "1day" },
                    { label: "Last 3 Days", val: "3days" },
                    { label: "Last 1 Week", val: "7days" },
                    { label: "Last 2 Weeks", val: "15days" },
                    { label: "Last 1 Month", val: "30days" },
                  ].map((d) => (
                    <PillTag
                      key={d.val}
                      label={d.label}
                      isSelected={localFilters.postedSince === d.val}
                      onClick={() => setLocalFilters({ ...localFilters, postedSince: d.val })}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 10. Posted By Tab */}
            {activeDesktopTab === "postedBy" && (
              <div className="space-y-4">
                <label className="text-[13px] font-semibold text-slate-900 block">Posted By</label>
                <div className="flex flex-wrap gap-2.5">
                  {[
                    { label: "Owner", val: "owner" },
                    { label: "Agent / Broker", val: "agent" },
                    { label: "Builder / Developer", val: "builder" },
                  ].map((p) => (
                    <PillTag
                      key={p.val}
                      label={p.label}
                      isSelected={localFilters.postedBy.includes(p.val)}
                      onClick={() => toggleArrayFilter("postedBy", p.val)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 12. Furnishing Tab */}
            {activeDesktopTab === "furnishing" && (
              <div className="space-y-4">
                <label className="text-[13px] font-semibold text-slate-900 block">Furnishing Status</label>
                <div className="flex flex-wrap gap-2.5">
                  {[
                    { label: "Furnished", val: "furnished" },
                    { label: "Semi-Furnished", val: "semi-furnished" },
                    { label: "Unfurnished", val: "unfurnished" },
                  ].map((f) => (
                    <PillTag
                      key={f.val}
                      label={f.label}
                      isSelected={localFilters.furnished.includes(f.val)}
                      onClick={() => toggleArrayFilter("furnished", f.val)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 13. Amenities Tab */}
            {activeDesktopTab === "amenities" && (
              <div className="space-y-4">
                <label className="text-[13px] font-semibold text-slate-900 block">Amenities</label>
                <div className="grid grid-cols-2 gap-y-3 gap-x-4 py-1">
                  {AMENITIES_GRID.map((amenity) => (
                    <label
                      key={amenity.val}
                      className="flex items-center gap-2.5 text-xs text-slate-800 cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={localFilters.amenities.includes(amenity.val)}
                        onChange={() => toggleArrayFilter("amenities", amenity.val)}
                        className="w-4 h-4 rounded border-slate-300 text-[#008075] focus:ring-[#008075] accent-[#008075]"
                      />
                      <span className="truncate">{amenity.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* 14. Verified Properties Tab */}
            {activeDesktopTab === "verified" && (
              <div className="space-y-4">
                <label className="text-[13px] font-semibold text-slate-900 block">Trust & Verification</label>
                <div className="divide-y divide-slate-100">
                  <ToggleSwitch
                    label="RERA Registered Properties"
                    checked={localFilters.reraRegisteredProperties}
                    onChange={(val) => setLocalFilters({ ...localFilters, reraRegisteredProperties: val })}
                  />
                  <ToggleSwitch
                    label="RERA Registered Agents"
                    checked={localFilters.reraRegisteredAgents}
                    onChange={(val) => setLocalFilters({ ...localFilters, reraRegisteredAgents: val })}
                  />
                  <ToggleSwitch
                    label="ROAD Exclusive Properties"
                    checked={localFilters.roadExclusive}
                    onChange={(val) => setLocalFilters({ ...localFilters, roadExclusive: val })}
                  />
                </div>
              </div>
            )}

            {/* 15. Photos & Videos Tab */}
            {activeDesktopTab === "media" && (
              <div className="space-y-4">
                <label className="text-[13px] font-semibold text-slate-900 block">Media Types</label>
                <div className="flex flex-wrap gap-2.5">
                  {[
                    { label: "Photos Available", val: "photos" },
                    { label: "Video Verified Tours", val: "video" },
                  ].map((m) => (
                    <PillTag
                      key={m.val}
                      label={m.label}
                      isSelected={localFilters.mediaTypes.includes(m.val)}
                      onClick={() => toggleArrayFilter("mediaTypes", m.val)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 16. Facing Tab */}
            {activeDesktopTab === "facing" && (
              <div className="space-y-4">
                <label className="text-[13px] font-semibold text-slate-900 block">Facing Direction</label>
                <div className="flex flex-wrap gap-2.5">
                  {["East", "North", "North-East", "West", "South", "North-West", "South-East", "South-West"].map((face) => {
                    const clean = face.toLowerCase().replace(/\s+/g, "");
                    return (
                      <PillTag
                        key={face}
                        label={`${face} Facing`}
                        isSelected={localFilters.facing.includes(clean)}
                        onClick={() => toggleArrayFilter("facing", clean)}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* 18. Water & Agriculture Tab */}
            {activeDesktopTab === "agriculture" && (
              <div className="space-y-4">
                <label className="text-[13px] font-semibold text-slate-900 block">Water & Crop Type</label>
                <div className="flex flex-wrap gap-2.5">
                  {["Borewell Water", "Canal Water", "Municipal Water", "Paddy Crop", "Cotton", "Chilli", "Horticulture"].map((agri) => (
                    <PillTag
                      key={agri}
                      label={agri}
                      isSelected={localFilters.waterSource.includes(agri) || localFilters.cultivationCrop.includes(agri)}
                      onClick={() => toggleArrayFilter("waterSource", agri)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Sticky Bottom Action Bar matching ROAD website brand */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs font-bold text-slate-600 hover:text-amber-600 transition-colors cursor-pointer"
          >
            Clear All
          </button>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handleApply("all")}
              className="py-2.5 px-5 bg-amber-500 hover:bg-amber-600 active:scale-98 text-slate-950 font-black text-xs rounded-full shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>All</span>
              <span className="px-1.5 py-0.5 rounded-full bg-slate-950/15 text-slate-950 font-black text-[11px]">
                {totalCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleApply("properties")}
              className="py-2.5 px-5 bg-slate-950 hover:bg-slate-900 active:scale-98 text-white font-black text-xs rounded-full shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>Properties</span>
              <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-white font-black text-[11px]">
                {propCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleApply("projects")}
              className="py-2.5 px-5 bg-slate-950 hover:bg-slate-900 active:scale-98 text-white font-black text-xs rounded-full shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>Projects</span>
              <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-white font-black text-[11px]">
                {projCount}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Fallback
export function SearchFilters({ filters, setFilters }: any) {
  return null;
}
