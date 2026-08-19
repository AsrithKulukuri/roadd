"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  X,
  Check,
  Plus,
  Compass,
  Home,
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
  Sprout,
  Video,
  Clock,
  Briefcase,
  Users,
  Calendar,
  Warehouse,
} from "lucide-react";
import { formatINRWords, cn } from "@/lib/utils";
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
  
  // Toggles matching MagicBricks switches
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
};

interface SearchFiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onApplyFilters: (newFilters: FilterState) => void;
  totalResults: number;
}

// Left Navigation Categories matching the exact list in the screenshot
const ALL_CATEGORY_TABS = [
  { id: "coveredArea", label: "Covered Area" },
  { id: "possession", label: "Possession Status" },
  { id: "subPropertyType", label: "Sub Property Type" },
  { id: "saleType", label: "Sale Type" },
  { id: "postedSince", label: "Posted Since" },
  { id: "postedBy", label: "Posted By" },
  { id: "ownership", label: "Ownership" },
  { id: "furnishing", label: "Furnishing" },
  { id: "amenities", label: "Amenities" },
  { id: "verified", label: "Verified Properties" },
  { id: "media", label: "Photos & Videos" },
  { id: "facing", label: "Facing" },
  { id: "floor", label: "Floor Selection" },
  { id: "budget", label: "Budget / Price" },
  { id: "bhk", label: "BHK & Bathroom" },
  { id: "agriculture", label: "Water & Agriculture" },
] as const;

type TabId = (typeof ALL_CATEGORY_TABS)[number]["id"];

// Custom Switch Component matching the screenshot
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
    <div className="flex items-center justify-between py-2.5 cursor-pointer" onClick={() => onChange(!checked)}>
      <span className="text-[13px] font-medium text-slate-800 select-none">{label}</span>
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
          checked ? "bg-[#d8232a]" : "bg-slate-200"
        )}
      >
        <span
          className={cn(
            "w-4 h-4 rounded-full bg-white shadow-md transform transition-transform absolute top-1 left-1",
            checked ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    </div>
  );
}

// Clean Pill Tag matching screenshot (+ inactive, check active in soft teal)
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
        "py-1.5 px-3.5 rounded-full text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5 select-none",
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

export function SearchFiltersModal({
  isOpen,
  onClose,
  filters,
  onApplyFilters,
  totalResults,
}: SearchFiltersModalProps) {
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);
  const [activeTab, setActiveTab] = useState<TabId>("coveredArea");

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

  // Helper: check if tab has active filters (shows green dot •)
  const isTabActive = (tabId: TabId): boolean => {
    switch (tabId) {
      case "coveredArea":
        return localFilters.coveredArea[0] > 0 || localFilters.coveredArea[1] < 10000;
      case "possession":
        return localFilters.possessionStatus.length > 0;
      case "subPropertyType":
        return localFilters.propertyType.length > 0 || localFilters.subPropertyType.length > 0;
      case "saleType":
        return localFilters.saleType.length > 0;
      case "postedSince":
        return localFilters.postedSince !== "any";
      case "postedBy":
        return localFilters.postedBy.length > 0 || localFilters.certifiedAgentsOnly;
      case "ownership":
        return localFilters.ownership.length > 0;
      case "furnishing":
        return localFilters.furnished.length > 0 || localFilters.furnishingItems.length > 0;
      case "amenities":
        return localFilters.amenities.length > 0;
      case "verified":
        return (
          localFilters.verifiedBadges.length > 0 ||
          localFilters.reraRegisteredProperties ||
          localFilters.reraRegisteredAgents ||
          localFilters.roadExclusive
        );
      case "media":
        return localFilters.mediaTypes.length > 0;
      case "facing":
        return localFilters.facing.length > 0 || localFilters.vastuCompliant;
      case "floor":
        return localFilters.floorRange.length > 0;
      case "budget":
        return localFilters.budget[0] > 0 || localFilters.budget[1] < 100000000;
      case "bhk":
        return localFilters.bhk.length > 0 || localFilters.bathrooms.length > 0;
      case "agriculture":
        return localFilters.waterSource.length > 0 || localFilters.cultivationCrop.length > 0;
      default:
        return false;
    }
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4"
    >
      {/* Main Filter Popover/Modal: Pure Clean White */}
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white text-slate-900 rounded-2xl w-full max-w-3xl h-[85vh] max-h-[650px] flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200 relative"
      >
        
        {/* Close Button in top-right */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 z-20 p-1.5 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Close filters"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ─── 2-Column Split Body ───────────────────────────────── */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Navigation Column: Clean white background with borders */}
          <div className="w-[180px] sm:w-[220px] border-r border-slate-200 bg-white overflow-y-auto shrink-0 divide-y divide-slate-100 no-scrollbar">
            {ALL_CATEGORY_TABS.map((tab) => {
              const active = activeTab === tab.id;
              const hasSelection = isTabActive(tab.id);

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "w-full text-left px-5 py-3.5 flex items-center justify-between text-xs sm:text-[13px] font-normal transition-colors cursor-pointer relative",
                    active
                      ? "text-slate-900 font-semibold bg-slate-50/80"
                      : "text-slate-700 hover:text-slate-900 hover:bg-slate-50/50"
                  )}
                >
                  <span className="truncate leading-normal">{tab.label}</span>

                  {/* Green active dot indicator matching MagicBricks screenshot */}
                  {hasSelection && (
                    <span className="w-2 h-2 rounded-full bg-[#008075] shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Content Pane: Pure Clean White */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 text-xs bg-white no-scrollbar">

            {/* ─── TAB: COVERED AREA ─── */}
            {activeTab === "coveredArea" && (
              <div className="space-y-5 animate-in fade-in duration-150">
                {/* Bathroom Quick Section matching screenshot */}
                <div className="space-y-2.5">
                  <label className="text-[13px] font-semibold text-slate-900 block">Bathroom</label>
                  <div className="flex flex-wrap gap-2">
                    {["1", "2", "3", "4", "5"].map((bath) => {
                      const isSelected = localFilters.bathrooms.includes(bath);
                      return (
                        <PillTag
                          key={bath}
                          label={bath}
                          isSelected={isSelected}
                          onClick={() => toggleArrayFilter("bathrooms", bath)}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Localities Section */}
                <div className="space-y-2.5 pt-2">
                  <label className="text-[13px] font-semibold text-slate-900 block">Properties in Localities</label>
                  <div className="flex flex-wrap gap-2">
                    {["Upcoming localities", "Developed localities", "Premium Localities"].map((loc) => {
                      const isSelected = localFilters.specialFeatures.includes(loc);
                      return (
                        <PillTag
                          key={loc}
                          label={loc}
                          isSelected={isSelected}
                          onClick={() => toggleArrayFilter("specialFeatures", loc)}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Toggle Switches matching screenshot */}
                <div className="divide-y divide-slate-100 pt-2">
                  <ToggleSwitch
                    label="Properties with Offers"
                    checked={localFilters.propertiesWithOffers}
                    onChange={(val) => setLocalFilters({ ...localFilters, propertiesWithOffers: val })}
                  />
                  <ToggleSwitch
                    label="ROAD Exclusive Properties"
                    checked={localFilters.roadExclusive}
                    onChange={(val) => setLocalFilters({ ...localFilters, roadExclusive: val })}
                  />
                  <ToggleSwitch
                    label="Posted By Certified Agents"
                    checked={localFilters.certifiedAgentsOnly}
                    onChange={(val) => setLocalFilters({ ...localFilters, certifiedAgentsOnly: val })}
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

                {/* Covered Area Slider */}
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <div className="flex justify-between items-center">
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
              </div>
            )}

            {/* ─── TAB: POSSESSION STATUS ─── */}
            {activeTab === "possession" && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <label className="text-[13px] font-semibold text-slate-900 block">Possession Status</label>
                <div className="flex flex-wrap gap-2.5">
                  {[
                    { label: "Ready to Move", val: "ready" },
                    { label: "Under Construction", val: "under-construction" },
                    { label: "Within 3 Months", val: "3months" },
                    { label: "Within 6 Months", val: "6months" },
                    { label: "Within 1 Year", val: "1year" },
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
              </div>
            )}

            {/* ─── TAB: SUB PROPERTY TYPE ─── */}
            {activeTab === "subPropertyType" && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <label className="text-[13px] font-semibold text-slate-900 block">Residential Properties</label>
                <div className="flex flex-wrap gap-2.5">
                  {[
                    { label: "Multistorey Apartment", val: "apartment" },
                    { label: "Builder Floor Apartment", val: "builder-floor" },
                    { label: "Residential House", val: "independent-house" },
                    { label: "Villa", val: "villa" },
                    { label: "Residential Plot", val: "residential-land" },
                    { label: "Penthouse", val: "penthouse" },
                    { label: "Studio Apartment", val: "studio" },
                    { label: "Farm House", val: "farmhouse" },
                  ].map((item) => {
                    const isSelected = localFilters.propertyType.includes(item.val);
                    return (
                      <PillTag
                        key={item.val}
                        label={item.label}
                        isSelected={isSelected}
                        onClick={() => toggleArrayFilter("propertyType", item.val)}
                      />
                    );
                  })}
                </div>

                <label className="text-[13px] font-semibold text-slate-900 block pt-3">Commercial & Land</label>
                <div className="flex flex-wrap gap-2.5">
                  {[
                    { label: "Commercial Office Space", val: "commercial-spaces" },
                    { label: "Commercial Shop", val: "shops" },
                    { label: "Commercial Land", val: "commercial-lands" },
                    { label: "Agricultural Land", val: "agricultural-lands" },
                  ].map((item) => {
                    const isSelected = localFilters.propertyType.includes(item.val);
                    return (
                      <PillTag
                        key={item.val}
                        label={item.label}
                        isSelected={isSelected}
                        onClick={() => toggleArrayFilter("propertyType", item.val)}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── TAB: SALE TYPE ─── */}
            {activeTab === "saleType" && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <label className="text-[13px] font-semibold text-slate-900 block">Sale Type</label>
                <div className="flex flex-wrap gap-2.5">
                  {[
                    { label: "New Property", val: "new" },
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
              </div>
            )}

            {/* ─── TAB: POSTED SINCE ─── */}
            {activeTab === "postedSince" && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <label className="text-[13px] font-semibold text-slate-900 block">Posted Since</label>
                <div className="flex flex-wrap gap-2.5">
                  {[
                    { label: "All Properties", val: "any" },
                    { label: "Yesterday", val: "1day" },
                    { label: "Last 3 Days", val: "3days" },
                    { label: "Last 1 Week", val: "7days" },
                    { label: "Last 2 Weeks", val: "15days" },
                    { label: "Last 1 Month", val: "30days" },
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
              </div>
            )}

            {/* ─── TAB: POSTED BY ─── */}
            {activeTab === "postedBy" && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <label className="text-[13px] font-semibold text-slate-900 block">Posted By</label>
                <div className="flex flex-wrap gap-2.5">
                  {[
                    { label: "Owner", val: "owner" },
                    { label: "Agent / Broker", val: "agent" },
                    { label: "Builder / Developer", val: "builder" },
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

                <div className="divide-y divide-slate-100 pt-3">
                  <ToggleSwitch
                    label="Posted By Certified Agents"
                    checked={localFilters.certifiedAgentsOnly}
                    onChange={(val) => setLocalFilters({ ...localFilters, certifiedAgentsOnly: val })}
                  />
                </div>
              </div>
            )}

            {/* ─── TAB: OWNERSHIP ─── */}
            {activeTab === "ownership" && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <label className="text-[13px] font-semibold text-slate-900 block">Ownership Title</label>
                <div className="flex flex-wrap gap-2.5">
                  {[
                    { label: "Freehold", val: "freehold" },
                    { label: "Leasehold", val: "leasehold" },
                    { label: "Co-operative Society", val: "society" },
                    { label: "Power of Attorney", val: "poa" },
                  ].map((o) => {
                    const isSelected = localFilters.ownership.includes(o.val);
                    return (
                      <PillTag
                        key={o.val}
                        label={o.label}
                        isSelected={isSelected}
                        onClick={() => toggleArrayFilter("ownership", o.val)}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── TAB: FURNISHING ─── */}
            {activeTab === "furnishing" && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <label className="text-[13px] font-semibold text-slate-900 block">Furnishing Status</label>
                <div className="flex flex-wrap gap-2.5">
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
              </div>
            )}

            {/* ─── TAB: AMENITIES ─── */}
            {activeTab === "amenities" && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <label className="text-[13px] font-semibold text-slate-900 block">Amenities</label>
                <div className="flex flex-wrap gap-2.5">
                  {[
                    "Lift", "Power Backup", "Gymnasium", "Swimming Pool", "Clubhouse",
                    "Park / Garden", "Reserved Parking", "Security / CCTV", "Gas Pipeline", "Rainwater Harvesting"
                  ].map((amenity) => {
                    const val = amenity.toLowerCase();
                    const isSelected = localFilters.amenities.includes(val);
                    return (
                      <PillTag
                        key={amenity}
                        label={amenity}
                        isSelected={isSelected}
                        onClick={() => toggleArrayFilter("amenities", val)}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── TAB: VERIFIED PROPERTIES ─── */}
            {activeTab === "verified" && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <label className="text-[13px] font-semibold text-slate-900 block">Verified & Trust</label>
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
                  <ToggleSwitch
                    label="Properties with Offers"
                    checked={localFilters.propertiesWithOffers}
                    onChange={(val) => setLocalFilters({ ...localFilters, propertiesWithOffers: val })}
                  />
                </div>
              </div>
            )}

            {/* ─── TAB: PHOTOS & VIDEOS ─── */}
            {activeTab === "media" && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <label className="text-[13px] font-semibold text-slate-900 block">Media Types</label>
                <div className="flex flex-wrap gap-2.5">
                  {[
                    { label: "Properties with Photos", val: "photos" },
                    { label: "Video Verified Tours", val: "video" },
                    { label: "Floor Plan Available", val: "floorplan" },
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
              </div>
            )}

            {/* ─── TAB: FACING ─── */}
            {activeTab === "facing" && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <label className="text-[13px] font-semibold text-slate-900 block">Facing Direction</label>
                <div className="flex flex-wrap gap-2.5">
                  {["East", "North", "North-East", "West", "South", "North-West", "South-East", "South-West"].map((face) => {
                    const clean = face.toLowerCase();
                    const isSelected = localFilters.facing.includes(clean);
                    return (
                      <PillTag
                        key={face}
                        label={`${face} Facing`}
                        isSelected={isSelected}
                        onClick={() => toggleArrayFilter("facing", clean)}
                      />
                    );
                  })}
                </div>

                <div className="divide-y divide-slate-100 pt-3">
                  <ToggleSwitch
                    label="100% Vastu Compliant Only"
                    checked={localFilters.vastuCompliant}
                    onChange={(val) => setLocalFilters({ ...localFilters, vastuCompliant: val })}
                  />
                </div>
              </div>
            )}

            {/* ─── TAB: FLOOR SELECTION ─── */}
            {activeTab === "floor" && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <label className="text-[13px] font-semibold text-slate-900 block">Floor Selection</label>
                <div className="flex flex-wrap gap-2.5">
                  {[
                    { label: "Ground Floor", val: "ground" },
                    { label: "1st – 4th Floor", val: "1-4" },
                    { label: "5th – 10th Floor", val: "5-10" },
                    { label: "11th – 20th Floor", val: "11-20" },
                    { label: "20th+ Floor", val: "20+" },
                  ].map((fl) => {
                    const isSelected = localFilters.floorRange.includes(fl.val);
                    return (
                      <PillTag
                        key={fl.val}
                        label={fl.label}
                        isSelected={isSelected}
                        onClick={() => toggleArrayFilter("floorRange", fl.val)}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── TAB: BUDGET ─── */}
            {activeTab === "budget" && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="flex justify-between items-center">
                  <span className="text-[13px] font-semibold text-slate-900">Budget Range (INR)</span>
                  <span className="text-xs font-semibold text-[#008075]">
                    {formatINRWords(localFilters.budget[0])} – {formatINRWords(localFilters.budget[1], true)}
                  </span>
                </div>
                <Slider
                  min={0}
                  max={100000000}
                  step={500000}
                  value={localFilters.budget}
                  onValueChange={(val) => setLocalFilters({ ...localFilters, budget: val as [number, number] })}
                  className="w-full py-2"
                />
                <div className="flex flex-wrap gap-2 pt-2">
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
            )}

            {/* ─── TAB: BHK ─── */}
            {activeTab === "bhk" && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <label className="text-[13px] font-semibold text-slate-900 block">Bedrooms (BHK)</label>
                <div className="flex flex-wrap gap-2.5">
                  {["1 RK", "1 BHK", "2 BHK", "3 BHK", "4 BHK", "5+ BHK"].map((bhk) => {
                    const cleanVal = bhk.replace(" BHK", "").replace(" RK", "rk");
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

                <label className="text-[13px] font-semibold text-slate-900 block pt-3">Bathroom</label>
                <div className="flex flex-wrap gap-2.5">
                  {["1", "2", "3", "4", "5+"].map((bath) => {
                    const isSelected = localFilters.bathrooms.includes(bath);
                    return (
                      <PillTag
                        key={bath}
                        label={bath}
                        isSelected={isSelected}
                        onClick={() => toggleArrayFilter("bathrooms", bath)}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── TAB: WATER & AGRICULTURE ─── */}
            {activeTab === "agriculture" && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <label className="text-[13px] font-semibold text-slate-900 block">Water Source</label>
                <div className="flex flex-wrap gap-2.5">
                  {["Borewell Water", "Lake Water", "Canal Water", "Municipal Water"].map((w) => {
                    const isSelected = localFilters.waterSource.includes(w);
                    return (
                      <PillTag
                        key={w}
                        label={w}
                        isSelected={isSelected}
                        onClick={() => toggleArrayFilter("waterSource", w)}
                      />
                    );
                  })}
                </div>

                <label className="text-[13px] font-semibold text-slate-900 block pt-3">Cultivation Crop</label>
                <div className="flex flex-wrap gap-2.5">
                  {["Paddy", "Chilli", "Cotton", "Horticulture", "Tobacco"].map((c) => {
                    const isSelected = localFilters.cultivationCrop.includes(c);
                    return (
                      <PillTag
                        key={c}
                        label={c}
                        isSelected={isSelected}
                        onClick={() => toggleArrayFilter("cultivationCrop", c)}
                      />
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* ─── Clean Bottom Action Bar matching screenshot ───────── */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs font-semibold text-[#d8232a] hover:underline cursor-pointer transition-colors"
          >
            Clear All
          </button>

          <button
            type="button"
            onClick={handleApply}
            className="py-2.5 px-6 bg-[#d8232a] hover:bg-[#c01e25] text-white font-bold text-xs sm:text-[13px] rounded-full shadow-sm hover:shadow transition-all active:scale-95 cursor-pointer"
          >
            View {totalResults} Properties
          </button>
        </div>

      </div>
    </div>
  );
}

// Fallback export
export function SearchFilters({ filters, setFilters }: any) {
  return null;
}
