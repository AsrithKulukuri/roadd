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
  Mic,
  Languages,
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
  const [openDropdown, setOpenDropdown] = useState<"price" | "rooms" | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [language, setLanguage] = useState<"en" | "te">("en");

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

  // Web Speech API Voice Search Handler
  const handleVoiceSearch = () => {
    if (typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = language === "te" ? "te-IN" : "en-US";
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSearchInput(transcript);
        onFilterChange({ ...filters, query: transcript });
        setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognition.start();
    } else {
      alert("Voice search is not supported by your browser. Try typing your search.");
    }
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

  return (
    <>
      <header className="sticky top-16 z-30 w-full bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-850 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3" ref={dropdownRef}>
            
            {/* LEFT: Search Input Box */}
            <form
              onSubmit={handleSearchSubmit}
              className={cn(
                "relative flex-1 w-full flex items-center rounded-full border bg-slate-50 dark:bg-slate-900 transition-all duration-200",
                isFocused
                  ? "border-amber-500 ring-2 ring-amber-500/20 bg-white dark:bg-slate-900 shadow-md"
                  : "border-slate-300 dark:border-slate-800 hover:border-slate-400"
              )}
            >
              <div className="pl-4 text-slate-400 dark:text-slate-500 flex items-center justify-center pointer-events-none">
                <Search className="w-4 h-4 text-amber-500" />
              </div>

              {/* Input & Carousel Placeholder Overlay */}
              <div className="relative flex-1 flex items-center h-11 px-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  className="w-full h-full bg-transparent text-sm text-slate-900 dark:text-white font-medium focus:outline-none z-10"
                />

                {/* Animated Placeholder Text */}
                {!searchInput && !isFocused && (
                  <div className="absolute inset-0 flex items-center px-3 pointer-events-none overflow-hidden text-slate-400 dark:text-slate-500 text-xs sm:text-sm">
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={suggestionIndex}
                        initial={{ y: 15, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -15, opacity: 0 }}
                        transition={{ duration: 0.35, ease: "easeInOut" }}
                        className="truncate font-normal"
                      >
                        {language === "te" ? "విజయవాడ, గుంటూరు లో నివాసాలు శోధించండి..." : currentSuggestion}
                      </motion.span>
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* Clear button if typed */}
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput("");
                    onFilterChange({ ...filters, query: "" });
                    if (inputRef.current) inputRef.current.focus();
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full transition-colors cursor-pointer mr-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {/* VOICE SEARCH MICROPHONE BUTTON */}
              <button
                type="button"
                onClick={handleVoiceSearch}
                title={isListening ? "Listening..." : "Voice Search"}
                className={cn(
                  "p-2 rounded-full text-slate-400 hover:text-amber-500 transition-colors mr-1 cursor-pointer",
                  isListening && "text-amber-500 bg-amber-500/10 animate-pulse"
                )}
              >
                <Mic className="w-4 h-4" />
              </button>

              {/* TELUGU / ENGLISH VERNACULAR TOGGLE BUTTON */}
              <button
                type="button"
                onClick={() => setLanguage(language === "en" ? "te" : "en")}
                title="Switch Language (తెలుగు / English)"
                className="mr-1.5 px-2.5 py-1 bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-extrabold text-[11px] rounded-full hover:bg-amber-500 hover:text-slate-950 transition-all cursor-pointer flex items-center gap-1"
              >
                <Languages className="w-3 h-3 text-amber-500" />
                <span>{language === "en" ? "తెలుగు" : "ENG"}</span>
              </button>

              {/* Submit Button */}
              <button
                type="submit"
                className="m-1 p-2.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 rounded-full font-bold transition-all shadow-xs flex items-center justify-center cursor-pointer"
              >
                <Search className="w-4 h-4 stroke-[2.5]" />
              </button>
            </form>

            {/* RIGHT: Quick Filter Chips */}
            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar py-0.5">
              
              {/* 1. FIRST: LIST VS MAP TOGGLE CAPSULE */}
              <div className="bg-slate-900 dark:bg-slate-900 p-1 rounded-full border border-amber-500/80 shadow-lg flex items-center shrink-0">
                <button
                  type="button"
                  onClick={() => onViewModeChange("grid")}
                  className={cn(
                    "py-1.5 px-3 rounded-full text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer",
                    viewMode === "grid"
                      ? "bg-amber-500 text-slate-950 shadow-md"
                      : "text-slate-300 hover:text-white"
                  )}
                >
                  <List className="w-4 h-4" />
                  <span>{language === "te" ? "జాబితా" : "List"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onViewModeChange("map")}
                  className={cn(
                    "py-1.5 px-3 rounded-full text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer",
                    viewMode === "map"
                      ? "bg-amber-500 text-slate-950 shadow-md"
                      : "text-amber-400 font-extrabold hover:text-white"
                  )}
                >
                  <Map className="w-4 h-4 text-amber-400 fill-amber-500/20" />
                  <span className="font-black">{language === "te" ? "మ్యాప్ 🗺️" : "Map 🗺️"}</span>
                </button>
              </div>

              {/* 2. SECOND: ALL FILTERS BUTTON */}
              <button
                onClick={onOpenAllFilters}
                className={cn(
                  "py-2 px-3.5 rounded-full text-xs font-extrabold flex items-center gap-1.5 border transition-all cursor-pointer whitespace-nowrap",
                  activeFilterCount > 0
                    ? "bg-slate-900 text-white border-slate-900 dark:bg-amber-500 dark:text-slate-950 dark:border-amber-500 shadow-xs"
                    : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-800 hover:border-slate-400"
                )}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{language === "te" ? "ఫిల్టర్లు" : "Filters"}</span>
                {activeFilterCount > 0 && (
                  <span className="w-4 h-4 bg-amber-500 text-slate-950 dark:bg-slate-950 dark:text-white rounded-full text-[10px] font-black flex items-center justify-center ml-0.5">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* 3. THIRD: PRICE FILTER BUTTON */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenDropdown(openDropdown === "price" ? null : "price")}
                  className={cn(
                    "py-2 px-3.5 rounded-full text-xs font-semibold flex items-center gap-1 border transition-all cursor-pointer whitespace-nowrap",
                    filters.budget[0] > 0 || filters.budget[1] < 100000000
                      ? "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-500/30 font-bold"
                      : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-800 hover:border-slate-400"
                  )}
                >
                  <span>{language === "te" ? "ధర" : "Price"}</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {/* DESKTOP POPOVER FOR PRICE */}
                {openDropdown === "price" && (
                  <div className="hidden sm:block absolute top-full left-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-2 z-50 animate-in fade-in zoom-in-95">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1.5">
                      Select Budget Range
                    </div>
                    <div className="space-y-0.5">
                      {pricePresets.map((preset) => {
                        const isSelected = filters.budget[0] === preset.min && filters.budget[1] === preset.max;
                        return (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => {
                              onFilterChange({ ...filters, budget: [preset.min, preset.max] });
                              setOpenDropdown(null);
                            }}
                            className={cn(
                              "w-full text-left px-3 py-2 text-xs rounded-xl font-medium flex items-center justify-between transition-colors cursor-pointer",
                              isSelected
                                ? "bg-amber-500 text-slate-950 font-bold"
                                : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                            )}
                          >
                            <span>{preset.label}</span>
                            {isSelected && <Check className="w-3.5 h-3.5" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 4. FOURTH: BHK / ROOMS FILTER BUTTON */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenDropdown(openDropdown === "rooms" ? null : "rooms")}
                  className={cn(
                    "py-2 px-3.5 rounded-full text-xs font-semibold flex items-center gap-1 border transition-all cursor-pointer whitespace-nowrap",
                    filters.bhk.length > 0
                      ? "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-500/30 font-bold"
                      : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-800 hover:border-slate-400"
                  )}
                >
                  <span>{filters.bhk.length > 0 ? `${filters.bhk.join(", ")} BHK` : language === "te" ? "గదులు" : "Bedrooms"}</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {/* DESKTOP POPOVER FOR BEDROOMS */}
                {openDropdown === "rooms" && (
                  <div className="hidden sm:block absolute top-full left-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-2 z-50 animate-in fade-in zoom-in-95">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1.5">
                      Select Bedrooms
                    </div>
                    <div className="space-y-0.5">
                      {bhkOptions.map((opt) => {
                        const isSelected = filters.bhk.includes(opt.value);
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              const newBhk = isSelected
                                ? filters.bhk.filter((b) => b !== opt.value)
                                : [...filters.bhk, opt.value];
                              onFilterChange({ ...filters, bhk: newBhk });
                            }}
                            className={cn(
                              "w-full text-left px-3 py-2 text-xs rounded-xl font-medium flex items-center justify-between transition-colors cursor-pointer",
                              isSelected
                                ? "bg-amber-500 text-slate-950 font-bold"
                                : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                            )}
                          >
                            <span>{opt.label}</span>
                            {isSelected && <Check className="w-3.5 h-3.5" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </header>

      {/* MOBILE FIX: ROOT-LEVEL FIXED OVERLAY BOTTOM DRAWER FOR PRICE (NEVER OVERFLOWS) */}
      {openDropdown === "price" && (
        <div className="fixed inset-0 z-[10000] sm:hidden bg-slate-950/75 backdrop-blur-xs flex items-end justify-center p-0">
          <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-t-3xl w-full p-5 shadow-2xl space-y-3 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <span className="font-extrabold text-base text-slate-900 dark:text-white">Select Budget Range</span>
              <button
                type="button"
                onClick={() => setOpenDropdown(null)}
                className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5 pt-1">
              {pricePresets.map((preset) => {
                const isSelected = filters.budget[0] === preset.min && filters.budget[1] === preset.max;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      onFilterChange({ ...filters, budget: [preset.min, preset.max] });
                      setOpenDropdown(null);
                    }}
                    className={cn(
                      "w-full text-left px-4 py-3.5 text-sm rounded-xl font-bold flex items-center justify-between transition-all cursor-pointer",
                      isSelected
                        ? "bg-amber-500 text-slate-950 shadow-md"
                        : "bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                    )}
                  >
                    <span>{preset.label}</span>
                    {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MOBILE FIX: ROOT-LEVEL FIXED OVERLAY BOTTOM DRAWER FOR BEDROOMS (NEVER OVERFLOWS) */}
      {openDropdown === "rooms" && (
        <div className="fixed inset-0 z-[10000] sm:hidden bg-slate-950/75 backdrop-blur-xs flex items-end justify-center p-0">
          <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-t-3xl w-full p-5 shadow-2xl space-y-3 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <span className="font-extrabold text-base text-slate-900 dark:text-white">Select Bedrooms (BHK)</span>
              <button
                type="button"
                onClick={() => setOpenDropdown(null)}
                className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5 pt-1">
              {bhkOptions.map((opt) => {
                const isSelected = filters.bhk.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      const newBhk = isSelected
                        ? filters.bhk.filter((b) => b !== opt.value)
                        : [...filters.bhk, opt.value];
                      onFilterChange({ ...filters, bhk: newBhk });
                    }}
                    className={cn(
                      "w-full text-left px-4 py-3.5 text-sm rounded-xl font-bold flex items-center justify-between transition-all cursor-pointer",
                      isSelected
                        ? "bg-amber-500 text-slate-950 shadow-md"
                        : "bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                    )}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* PROMINENT MOBILE FLOATING BOTTOM CENTER MAP TOGGLE BUTTON */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[400] md:hidden pointer-events-auto">
        <button
          type="button"
          onClick={() => onViewModeChange(viewMode === "grid" ? "map" : "grid")}
          className="bg-slate-950 text-white border-2 border-amber-500 shadow-2xl px-6 py-3 rounded-full font-black text-sm flex items-center gap-2.5 active:scale-95 transition-all cursor-pointer"
        >
          {viewMode === "grid" ? (
            <>
              <Map className="w-4 h-4 text-amber-400 animate-pulse fill-amber-400/30" />
              <span className="tracking-wide text-amber-400">Map View 🗺️</span>
            </>
          ) : (
            <>
              <List className="w-4 h-4 text-amber-400" />
              <span className="tracking-wide">List View 📋</span>
            </>
          )}
        </button>
      </div>
    </>
  );
}
