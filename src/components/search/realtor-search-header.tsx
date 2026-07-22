"use client";

import { useState, useRef, useEffect } from "react";
import {
  Search,
  SlidersHorizontal,
  ChevronDown,
  Heart,
  Map,
  List,
  Check,
  X,
  IndianRupee,
  Home,
  Building,
  ShieldCheck,
  Clock,
  UserCheck,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { FilterState } from "./search-filters";

interface RealtorSearchHeaderProps {
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
  viewMode: "grid" | "map";
  onViewModeChange: (mode: "grid" | "map") => void;
  onOpenAllFilters: () => void;
  totalResults: number;
}

const CAROUSEL_SUGGESTIONS = [
  'Try "3 BHK flats in Vijayawada Benz Circle"',
  'Try "Gated Community Villa in Poranki Vijayawada"',
  'Try "Residential Plot on Amaravati Road Guntur"',
  'Try "2 BHK Flat under ₹45 Lakhs in Kanuru"',
  'Try "Commercial Space in Brodipet Guntur"',
  'Try "Villas for sale in Tadepalli Vijayawada"',
  'Try "Plots in Kaza Guntur near AIIMS"',
  'Try "Apartments for rent in Patamata"',
];

export function RealtorSearchHeader({
  filters,
  onFilterChange,
  viewMode,
  onViewModeChange,
  onOpenAllFilters,
  totalResults,
}: RealtorSearchHeaderProps) {
  const [searchInput, setSearchInput] = useState(filters.query || "");
  const [isFocused, setIsFocused] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [openDropdown, setOpenDropdown] = useState<"price" | "rooms" | "type" | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSearchInput(filters.query || "");
  }, [filters.query]);

  // Text Carousel Interval - rotate phrase every 3.2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setSuggestionIndex((prev) => (prev + 1) % CAROUSEL_SUGGESTIONS.length);
    }, 3200);
    return () => clearInterval(interval);
  }, []);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onFilterChange({ ...filters, query: searchInput });
  };

  const currentSuggestion = CAROUSEL_SUGGESTIONS[suggestionIndex];

  const activeFilterCount =
    (filters.listingType.length > 0 ? 1 : 0) +
    (filters.propertyType.length > 0 ? 1 : 0) +
    (filters.bhk.length > 0 ? 1 : 0) +
    (filters.budget[0] > 0 || filters.budget[1] < 100000000 ? 1 : 0) +
    (filters.availability.length > 0 ? 1 : 0) +
    (filters.postedBy.length > 0 ? 1 : 0) +
    (filters.saleType.length > 0 ? 1 : 0);

  // Price presets in INR
  const pricePresets = [
    { label: "Any Price", min: 0, max: 100000000 },
    { label: "Under ₹30 Lakhs", min: 0, max: 3000000 },
    { label: "₹30L - ₹60 Lakhs", min: 3000000, max: 6000000 },
    { label: "₹60L - ₹1 Crore", min: 6000000, max: 10000000 },
    { label: "₹1 Cr - ₹2 Crores", min: 10000000, max: 20000000 },
    { label: "Above ₹2 Crores", min: 20000000, max: 100000000 },
  ];

  const bhkOptions = [
    { label: "1 BHK", value: "1" },
    { label: "2 BHK", value: "2" },
    { label: "3 BHK", value: "3" },
    { label: "4+ BHK", value: "4+" },
  ];

  const propertyTypes = [
    { label: "Apartments / Flats", value: "apartment" },
    { label: "Independent Villa / House", value: "villa" },
    { label: "Plots & Lands", value: "residential-land" },
    { label: "Commercial Spaces", value: "commercial-spaces" },
    { label: "PG / Coliving", value: "pg" },
    { label: "Farmhouse", value: "farmhouse" },
  ];

  const toggleBhk = (value: string) => {
    const nextBhk = filters.bhk.includes(value)
      ? filters.bhk.filter((b) => b !== value)
      : [...filters.bhk, value];
    onFilterChange({ ...filters, bhk: nextBhk });
  };

  const toggleType = (value: string) => {
    const nextTypes = filters.propertyType.includes(value)
      ? filters.propertyType.filter((t) => t !== value)
      : [...filters.propertyType, value];
    onFilterChange({ ...filters, propertyType: nextTypes });
  };

  return (
    <div className="w-full bg-white border-b border-slate-200 sticky top-16 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 space-y-3">
        {/* Top Search Bar & Action Buttons Row */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Main Search Input Pill with Text Carousel Placeholder (Clean white container, no golden border outline) */}
          <form
            onSubmit={handleSearchSubmit}
            className="relative flex-1 w-full flex items-center bg-slate-100/90 hover:bg-slate-100 border border-slate-200 rounded-full px-4 py-2 sm:py-2.5 shadow-inner transition-all focus-within:bg-white focus-within:border-slate-300 focus-within:outline-none overflow-hidden"
          >
            {/* Text Carousel Animated Placeholder */}
            {!searchInput && !isFocused && (
              <div
                onClick={() => inputRef.current?.focus()}
                className="absolute left-4 right-14 inset-y-0 flex items-center pointer-events-none overflow-hidden"
              >
                <AnimatePresence mode="wait">
                  <motion.span
                    key={suggestionIndex}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className="text-sm sm:text-base text-slate-400 font-medium truncate select-none block"
                  >
                    {currentSuggestion}
                  </motion.span>
                </AnimatePresence>
              </div>
            )}

            <input
              ref={inputRef}
              type="text"
              value={searchInput}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={isFocused && !searchInput ? 'Type location, BHK, or property type...' : ""}
              className="w-full bg-transparent text-sm sm:text-base text-slate-800 placeholder-slate-400 focus:outline-none pr-8 font-medium relative z-10 border-0 ring-0 outline-none"
            />

            {searchInput ? (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  onFilterChange({ ...filters, query: "" });
                }}
                className="p-1 text-slate-400 hover:text-slate-600 transition-colors z-20"
              >
                <X className="w-4 h-4" />
              </button>
            ) : null}
            {/* Brand Logo Amber Color Search Button */}
            <button
              type="submit"
              className="ml-2 p-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-full transition-all shadow-md hover:scale-105 flex-shrink-0 z-20 cursor-pointer"
              aria-label="Search"
            >
              <Search className="w-4 h-4 stroke-[2.5]" />
            </button>
          </form>

          {/* Desktop Right Action Controls */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            {/* Save Search Button */}
            <button
              type="button"
              onClick={() => {
                alert("Search saved to your account notifications!");
              }}
              className="hidden md:flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-full text-xs font-semibold shadow-xs transition-all flex-shrink-0 cursor-pointer"
            >
              <Heart className="w-3.5 h-3.5" />
              <span>Save search</span>
            </button>

            {/* View Mode Toggle Pill (List | Map) */}
            <div className="flex items-center bg-slate-100 p-1 rounded-full border border-slate-200 flex-shrink-0">
              <button
                onClick={() => onViewModeChange("grid")}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer",
                  viewMode === "grid"
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <List className="w-3.5 h-3.5" />
                <span>List</span>
              </button>
              <button
                onClick={() => onViewModeChange("map")}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer",
                  viewMode === "map"
                    ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <Map className="w-3.5 h-3.5" />
                <span>Map</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filter Pills Bar (Horizontal Scrollable) */}
        <div className="relative" ref={dropdownRef}>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
            {/* All Filters Button */}
            <button
              onClick={onOpenAllFilters}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-2 rounded-full border font-semibold transition-all flex-shrink-0 cursor-pointer",
                activeFilterCount > 0
                  ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
              )}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="bg-amber-500 text-slate-950 text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-extrabold">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Price Pill Dropdown */}
            <button
              onClick={() => setOpenDropdown(openDropdown === "price" ? null : "price")}
              className={cn(
                "flex items-center gap-1 px-3.5 py-2 rounded-full border font-medium transition-all flex-shrink-0 cursor-pointer",
                filters.budget[0] > 0 || filters.budget[1] < 100000000
                  ? "bg-amber-50 border-amber-500 text-amber-900 font-semibold"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
              )}
            >
              <IndianRupee className="w-3 h-3" />
              <span>Price</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* BHK / Rooms Pill Dropdown */}
            <button
              onClick={() => setOpenDropdown(openDropdown === "rooms" ? null : "rooms")}
              className={cn(
                "flex items-center gap-1 px-3.5 py-2 rounded-full border font-medium transition-all flex-shrink-0 cursor-pointer",
                filters.bhk.length > 0
                  ? "bg-amber-50 border-amber-500 text-amber-900 font-semibold"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
              )}
            >
              <Home className="w-3.5 h-3.5" />
              <span>Rooms (BHK)</span>
              {filters.bhk.length > 0 && (
                <span className="text-[10px] font-bold text-amber-600">({filters.bhk.join(",")})</span>
              )}
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* Property Type Pill Dropdown */}
            <button
              onClick={() => setOpenDropdown(openDropdown === "type" ? null : "type")}
              className={cn(
                "flex items-center gap-1 px-3.5 py-2 rounded-full border font-medium transition-all flex-shrink-0 cursor-pointer",
                filters.propertyType.length > 0
                  ? "bg-amber-50 border-amber-500 text-amber-900 font-semibold"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
              )}
            >
              <Building className="w-3.5 h-3.5" />
              <span>Home type</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* Quick Toggle: Ready to Move */}
            <button
              onClick={() => {
                const isReady = filters.availability.includes("ready");
                onFilterChange({
                  ...filters,
                  availability: isReady ? [] : ["ready"],
                });
              }}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-2 rounded-full border font-medium transition-all flex-shrink-0 cursor-pointer",
                filters.availability.includes("ready")
                  ? "bg-emerald-50 border-emerald-500 text-emerald-700 font-semibold"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
              )}
            >
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Ready to Move</span>
            </button>

            {/* Quick Toggle: Resale / New */}
            <button
              onClick={() => {
                const isNew = filters.saleType.includes("new");
                onFilterChange({
                  ...filters,
                  saleType: isNew ? [] : ["new"],
                });
              }}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-2 rounded-full border font-medium transition-all flex-shrink-0 cursor-pointer",
                filters.saleType.includes("new")
                  ? "bg-blue-50 border-blue-500 text-blue-700 font-semibold"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
              )}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>New Construction</span>
            </button>

            {/* Quick Toggle: Owner Listings */}
            <button
              onClick={() => {
                const isOwner = filters.postedBy.includes("owner");
                onFilterChange({
                  ...filters,
                  postedBy: isOwner ? [] : ["owner"],
                });
              }}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-2 rounded-full border font-medium transition-all flex-shrink-0 cursor-pointer",
                filters.postedBy.includes("owner")
                  ? "bg-purple-50 border-purple-500 text-purple-700 font-semibold"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
              )}
            >
              <UserCheck className="w-3.5 h-3.5 text-purple-600" />
              <span>Owner Listings</span>
            </button>
          </div>

          {/* Popover Menu: Price */}
          {openDropdown === "price" && (
            <div className="absolute left-16 top-11 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 animate-in fade-in zoom-in-95">
              <h4 className="font-semibold text-sm text-slate-900 mb-2">Budget (₹ INR)</h4>
              <div className="space-y-1.5">
                {pricePresets.map((preset) => {
                  const isSelected =
                    filters.budget[0] === preset.min && filters.budget[1] === preset.max;
                  return (
                    <button
                      key={preset.label}
                      onClick={() => {
                        onFilterChange({
                          ...filters,
                          budget: [preset.min, preset.max],
                        });
                        setOpenDropdown(null);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer",
                        isSelected
                          ? "bg-amber-50 text-amber-900 font-semibold"
                          : "hover:bg-slate-100 text-slate-700"
                      )}
                    >
                      <span>{preset.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-amber-600" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Popover Menu: Rooms */}
          {openDropdown === "rooms" && (
            <div className="absolute left-36 top-11 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 animate-in fade-in zoom-in-95">
              <h4 className="font-semibold text-sm text-slate-900 mb-3">Bedrooms (BHK)</h4>
              <div className="grid grid-cols-2 gap-2">
                {bhkOptions.map((bhk) => {
                  const isSelected = filters.bhk.includes(bhk.value);
                  return (
                    <button
                      key={bhk.value}
                      onClick={() => toggleBhk(bhk.value)}
                      className={cn(
                        "px-3 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1 cursor-pointer",
                        isSelected
                          ? "bg-amber-500 text-slate-950 font-bold border-amber-500 shadow-xs"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      )}
                    >
                      <span>{bhk.label}</span>
                      {isSelected && <Check className="w-3 h-3 text-slate-950" />}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setOpenDropdown(null)}
                className="mt-3 w-full py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 cursor-pointer"
              >
                Apply
              </button>
            </div>
          )}

          {/* Popover Menu: Property Types */}
          {openDropdown === "type" && (
            <div className="absolute left-64 top-11 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 animate-in fade-in zoom-in-95">
              <h4 className="font-semibold text-sm text-slate-900 mb-2">Property Category</h4>
              <div className="space-y-1.5">
                {propertyTypes.map((type) => {
                  const isSelected = filters.propertyType.includes(type.value);
                  return (
                    <button
                      key={type.value}
                      onClick={() => toggleType(type.value)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer",
                        isSelected
                          ? "bg-amber-50 text-amber-900 font-semibold"
                          : "hover:bg-slate-100 text-slate-700"
                      )}
                    >
                      <span>{type.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-amber-600" />}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setOpenDropdown(null)}
                className="mt-3 w-full py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 cursor-pointer"
              >
                Apply
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
