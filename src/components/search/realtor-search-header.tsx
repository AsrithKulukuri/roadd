"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  SlidersHorizontal,
  ChevronDown,
  ChevronLeft,
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
  ArrowRight,
  Hash,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { usePropertiesStore } from "@/stores/properties-store";
import { findPropertyByRefId, getPropertyRefId } from "@/lib/ref-id";
import { toast } from "sonner";
import type { FilterState } from "./search-filters";
import { RealtorFilterBar } from "./realtor-filter-bar";

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

  const router = useRouter();
  const properties = usePropertiesStore((state) => state.properties);

  const refMatch = useMemo(() => {
    if (!searchInput.trim()) return null;
    return findPropertyByRefId(searchInput, properties);
  }, [searchInput, properties]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (refMatch) {
      toast.success(`🎯 Direct match for Reference ID ${getPropertyRefId(refMatch)}! Redirecting...`);
      router.push(`/properties/${refMatch.id}`);
      return;
    }
    onFilterChange({ ...filters, query: searchInput });
  };

  // Web Speech API Voice Search Handler
  const handleVoiceSearch = () => {
    if (typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = "en-IN";
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
      <header className="sticky top-16 z-30 w-full bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2">
          {/* ROW 1: REALTOR SEARCH BOX & LIST/MAP VIEW TOGGLE */}
          <div className="flex items-center gap-2 w-full">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors shrink-0 border border-slate-200 dark:border-slate-700"
              title="Go Back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            {/* SEARCH INPUT BOX CONTAINER */}
            <form
              onSubmit={handleSearchSubmit}
              className={cn(
                "relative flex-1 min-w-0 flex items-center h-10 sm:h-11 rounded-full border bg-white transition-all duration-200 shadow-xs",
                isFocused
                  ? "border-amber-500 ring-2 ring-amber-500/20 shadow-md"
                  : "border-slate-300 hover:border-slate-400"
              )}
            >
              {/* Input & Animated Carousel Placeholder Overlay */}
              <div className="relative flex-1 flex items-center h-full pl-3 sm:pl-4 pr-1 min-w-0">
                <input
                  ref={inputRef}
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  className="w-full h-full bg-transparent text-xs sm:text-sm text-slate-900 dark:text-white font-medium focus:outline-none z-10"
                />

                {/* Animated Placeholder Text starting with "Try..." */}
                {!searchInput && !isFocused && (
                  <div className="absolute inset-0 flex items-center px-3 sm:px-4 pointer-events-none overflow-hidden text-slate-400 dark:text-slate-500 text-xs sm:text-sm">
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={suggestionIndex}
                        initial={{ y: 15, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -15, opacity: 0 }}
                        transition={{ duration: 0.35, ease: "easeInOut" }}
                        className="truncate font-normal"
                      >
                        {currentSuggestion}
                      </motion.span>
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* ACTION ICONS INSIDE SEARCH BOX: CLEAR (X), MIC (🎙️), SEARCH (🔍) */}
              <div className="flex items-center gap-0.5 sm:gap-1 pr-1.5 shrink-0 z-20">
                {/* Clear button if typed */}
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput("");
                      onFilterChange({ ...filters, query: "" });
                      if (inputRef.current) inputRef.current.focus();
                    }}
                    title="Clear search"
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* VOICE SEARCH MICROPHONE BUTTON */}
                <button
                  type="button"
                  onClick={handleVoiceSearch}
                  title={isListening ? "Listening..." : "Voice Search"}
                  className={cn(
                    "p-1 sm:p-1.5 rounded-full text-slate-400 hover:text-amber-500 transition-colors cursor-pointer",
                    isListening && "text-amber-500 bg-amber-500/10 animate-pulse"
                  )}
                >
                  <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
                </button>

                {/* Search Icon Submit Button */}
                <button
                  type="submit"
                  title="Search"
                  className="p-1 sm:p-1.5 text-slate-500 hover:text-amber-500 dark:text-slate-400 dark:hover:text-amber-400 active:scale-95 transition-all cursor-pointer shrink-0"
                >
                  <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                </button>
              </div>

              {/* INSTANT REFERENCE ID MATCH REDIRECT BANNER */}
              {refMatch && (
                <div
                  onClick={() => {
                    toast.success(`🎯 Direct match for Reference ID ${getPropertyRefId(refMatch)}! Redirecting...`);
                    router.push(`/properties/${refMatch.slug || refMatch.id}`);
                  }}
                  className="absolute left-0 right-0 top-full mt-2 z-[120] bg-amber-500 text-slate-950 px-4 py-2.5 rounded-2xl shadow-2xl flex items-center justify-between font-extrabold text-xs cursor-pointer border-2 border-slate-950 animate-in fade-in zoom-in-95"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Hash className="w-4 h-4 text-slate-950 shrink-0" />
                    <span className="truncate">Found Ref ID <strong className="bg-slate-950 text-amber-400 px-1.5 py-0.5 rounded ml-1">{getPropertyRefId(refMatch)}</strong>: {refMatch.title}</span>
                  </div>
                  <span className="flex items-center gap-1 bg-slate-950 text-white px-2.5 py-1 rounded-xl text-[11px] shrink-0 ml-2 shadow-md">
                    Jump to Property <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              )}
            </form>

            {/* REALTOR "SAVE SEARCH" BUTTON (Desktop Only) */}
            <button
              type="button"
              onClick={() => toast.success("❤️ Search saved to your saved searches!")}
              className="hidden lg:flex h-10 sm:h-11 px-4 rounded-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-850 dark:hover:bg-slate-800 text-white text-xs font-extrabold items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-xs border border-slate-800 active:scale-95"
            >
              <Heart className="w-4 h-4 text-amber-400 fill-amber-400/20" />
              <span>Save search</span>
            </button>

            {/* INTEGRATED MAP VIEW / LIST VIEW TOGGLE BUTTON (IN SEARCH BOX ROW FOR BOTH MOBILE & DESKTOP) */}
            <button
              type="button"
              onClick={() => onViewModeChange(viewMode === "grid" ? "map" : "grid")}
              className="h-10 sm:h-11 px-3 sm:px-4 rounded-full bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-900 border border-slate-900 dark:border-amber-500/80 shadow-sm font-extrabold text-xs flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer shrink-0 whitespace-nowrap"
            >
              {viewMode === "grid" ? (
                <>
                  <Map className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 fill-amber-400/30 shrink-0" />
                  <span className="text-amber-400">Map View 🗺️</span>
                </>
              ) : (
                <>
                  <List className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-300 dark:text-amber-400 shrink-0" />
                  <span>List View 📋</span>
                </>
              )}
            </button>
          </div>

          {/* ROW 2: REALTOR-STYLE HORIZONTAL INDIAN FILTERS BAR */}
          <div className="pt-0.5">
            <RealtorFilterBar
              filters={filters}
              onFilterChange={onFilterChange}
              onOpenAllFilters={onOpenAllFilters}
              totalResults={totalResults}
            />
          </div>
        </div>
      </header>
    </>
  );
}
