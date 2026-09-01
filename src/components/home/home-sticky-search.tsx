"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  MapPin,
  SlidersHorizontal,
  IndianRupee,
  ChevronDown,
  X,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/shared/logo";
import { cn, formatINRWords } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { haptic } from "@/lib/haptics";

interface HomeStickySearchProps {
  isVisible: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  typedText: string;
  heroBudget: [number, number];
  setHeroBudget: (b: [number, number]) => void;
  heroCities: Array<{ id: string; name: string; sublocations?: Array<{ id: string; name: string; tagline?: string }> }>;
  activeTab: string;
  matchingCount: number;
  handleSearchSubmit: (e?: React.FormEvent, customBudget?: [number, number]) => void;
  liveHeroSuggestions: any;
  openProject: (project: any, e?: React.MouseEvent) => void;
}

export function HomeStickySearch({
  isVisible,
  searchQuery,
  setSearchQuery,
  typedText,
  heroBudget,
  setHeroBudget,
  heroCities,
  activeTab,
  matchingCount,
  handleSearchSubmit,
  liveHeroSuggestions,
  openProject,
}: HomeStickySearchProps) {
  const router = useRouter();
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<"location" | "budget" | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatBudgetDisplay = () => {
    const minStr = heroBudget[0] > 1000000 ? formatINRWords(heroBudget[0]) : "Min";
    const maxStr = heroBudget[1] < 30000000 ? formatINRWords(heroBudget[1], true) : "Any";
    if (minStr === "Min" && maxStr === "Any") return "Budget";
    return `${minStr} - ${maxStr}`;
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: -70, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -70, opacity: 0, scale: 0.96 }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
          className="fixed top-2 sm:top-3.5 left-0 right-0 z-[120] px-2.5 sm:px-4 pointer-events-none flex justify-center"
        >
          <div
            ref={dropdownRef}
            className="w-full max-w-4xl bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/90 rounded-2xl shadow-[0_12px_45px_rgba(0,0,0,0.14)] p-1.5 sm:p-2 flex items-center gap-1.5 sm:gap-2.5 pointer-events-auto transition-all relative"
          >
            {/* 1. Left Brand Icon Logo */}
            <div className="shrink-0 pl-1 pr-0.5">
              <Logo size="sm" showText={false} href="/" />
            </div>

            {/* 2. Interactive Search Bar (Synced with Hero Search) */}
            <form
              action="#"
              onSubmit={(e) => {
                e.preventDefault();
                handleSearchSubmit(e);
              }}
              className="flex-1 min-w-0 h-10 sm:h-11 rounded-xl bg-slate-100/90 dark:bg-slate-900/90 hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center px-2.5 sm:px-3.5 gap-2 transition-all relative group"
            >
              <Search className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0 group-hover:text-amber-500 transition-colors" />

              <div className="relative flex-1 min-w-0 h-full flex items-center">
                {!searchQuery && (
                  <div className="absolute inset-0 flex items-center pointer-events-none overflow-hidden text-left">
                    <span className="text-xs sm:text-sm text-slate-400 font-medium truncate select-none flex items-center">
                      <span>Search &ldquo;{typedText}&rdquo;</span>
                      <span className="inline-block w-[2px] h-[14px] bg-slate-400 ml-1 animate-pulse" />
                    </span>
                  </div>
                )}

                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsInputFocused(true)}
                  onBlur={() => setTimeout(() => setIsInputFocused(false), 200)}
                  placeholder=""
                  autoComplete="off"
                  className="w-full h-full bg-transparent text-xs sm:text-sm text-slate-900 dark:text-white font-medium border-none outline-none focus:outline-none focus:ring-0 p-0 relative z-10"
                />
              </div>

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    inputRef.current?.focus();
                  }}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Suggestions Dropdown attached to sticky bar */}
              {isInputFocused && liveHeroSuggestions && liveHeroSuggestions.hasResults && (
                <div
                  onMouseDown={(e) => e.preventDefault()}
                  className="absolute left-0 right-0 top-full mt-2 z-[150] bg-slate-950 border border-slate-800 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.85)] overflow-hidden divide-y divide-slate-800/80 text-left max-h-[50vh] overflow-y-auto no-scrollbar"
                >
                  {liveHeroSuggestions.directRefMatch && (
                    <div
                      onClick={(e) => {
                        setIsInputFocused(false);
                        const match = liveHeroSuggestions.directRefMatch!;
                        if (match.type === "project") {
                          openProject(match.item, e);
                        } else {
                          router.push(match.url);
                        }
                      }}
                      className="px-3.5 py-2.5 bg-gradient-to-r from-amber-500/20 to-slate-950 hover:from-amber-500/30 cursor-pointer flex items-center justify-between gap-2 border-b border-amber-500/30"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 font-black text-[11px] shrink-0">
                          🎯 {liveHeroSuggestions.directRefMatch.refId}
                        </span>
                        <span className="text-xs font-bold text-white truncate">
                          {liveHeroSuggestions.directRefMatch.title}
                        </span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setIsInputFocused(false);
                      handleSearchSubmit();
                    }}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-slate-900 flex items-center gap-2 text-xs font-bold text-amber-400 bg-slate-950"
                  >
                    <Search className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="truncate">Search all for &ldquo;<strong>{searchQuery}</strong>&rdquo;</span>
                  </button>

                  {liveHeroSuggestions.projects?.slice(0, 2).map((p: any) => (
                    <div
                      key={`sticky-proj-${p.id}`}
                      onClick={(e) => {
                        setIsInputFocused(false);
                        openProject(p, e);
                      }}
                      className="px-3.5 py-2 hover:bg-slate-900 cursor-pointer flex items-center justify-between gap-2 text-xs text-white"
                    >
                      <span className="truncate">{p.name}</span>
                      <span className="text-[10px] text-amber-400 font-bold shrink-0">Project</span>
                    </div>
                  ))}
                </div>
              )}
            </form>

            {/* 3. Location Dropdown Pill (Desktop/Tablet) */}
            <div className="relative hidden md:block">
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === "location" ? null : "location")}
                className={cn(
                  "h-10 sm:h-11 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer whitespace-nowrap",
                  openDropdown === "location"
                    ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                    : "bg-slate-100/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                )}
              >
                <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>Locations</span>
                <ChevronDown className={cn("w-3.5 h-3.5 opacity-60 transition-transform duration-200", openDropdown === "location" && "rotate-180")} />
              </button>

              {/* Location Mini Popover */}
              {openDropdown === "location" && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-2 z-[150] animate-in fade-in zoom-in-95">
                  <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Select Primary Location
                  </div>
                  <div className="space-y-1 mt-1">
                    {heroCities.map((city) => (
                      <div
                        key={city.id}
                        onClick={() => {
                          setOpenDropdown(null);
                          router.push(`/search?type=${activeTab}&location=${encodeURIComponent(city.name)}`);
                        }}
                        className="px-3 py-2 rounded-xl hover:bg-slate-900 cursor-pointer flex items-center justify-between text-xs font-bold text-slate-200 hover:text-amber-400 transition-colors"
                      >
                        <span>{city.name}</span>
                        {city.sublocations && (
                          <span className="text-[10px] text-slate-500">{city.sublocations.length} areas</span>
                        )}
                      </div>
                    ))}
                    <div
                      onClick={() => {
                        setOpenDropdown(null);
                        router.push(`/search?type=${activeTab}`);
                      }}
                      className="px-3 py-2 rounded-xl hover:bg-slate-900 cursor-pointer text-xs font-bold text-amber-400 border-t border-slate-800/80 mt-1"
                    >
                      All AP Locations →
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Budget Dropdown Pill (Desktop/Tablet) */}
            <div className="relative hidden md:block">
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === "budget" ? null : "budget")}
                className={cn(
                  "h-10 sm:h-11 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer whitespace-nowrap",
                  openDropdown === "budget" || heroBudget[0] > 1000000 || heroBudget[1] < 30000000
                    ? "bg-[#008075] text-white border-[#008075] shadow-xs"
                    : "bg-slate-100/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                )}
              >
                <IndianRupee className="w-3.5 h-3.5 shrink-0" />
                <span>{formatBudgetDisplay()}</span>
                <ChevronDown className={cn("w-3.5 h-3.5 opacity-60 transition-transform duration-200", openDropdown === "budget" && "rotate-180")} />
              </button>

              {/* Budget Quick Slider Popover */}
              {openDropdown === "budget" && (
                <div className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 z-[150] animate-in fade-in zoom-in-95 space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-900 dark:text-white">
                    <span>Budget Range</span>
                    <span className="text-[#008075] font-black">
                      {formatINRWords(heroBudget[0])} – {formatINRWords(heroBudget[1], true)}
                    </span>
                  </div>

                  <Slider
                    min={1000000}
                    max={30000000}
                    step={500000}
                    value={heroBudget}
                    onValueChange={(val) => setHeroBudget(val as [number, number])}
                    className="w-full py-1"
                  />

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setHeroBudget([1000000, 30000000])}
                      className="flex-1 py-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer text-center"
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOpenDropdown(null);
                        handleSearchSubmit();
                      }}
                      className="flex-1 py-1.5 text-[11px] font-bold bg-[#008075] hover:bg-[#006e64] text-white rounded-lg cursor-pointer text-center"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 5. All Filters Modal Trigger Button */}
            <button
              type="button"
              onClick={() => {
                haptic.light();
                router.push("/search?openFilters=true");
              }}
              title="All Filters"
              aria-label="All Filters"
              className="h-10 sm:h-11 w-10 sm:w-11 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 flex items-center justify-center transition-all cursor-pointer shrink-0 active:scale-95"
            >
              <SlidersHorizontal className="w-4 h-4 stroke-[2.2]" />
            </button>

            {/* 6. Primary Apply / Search Action CTA */}
            <button
              type="button"
              onClick={() => handleSearchSubmit()}
              className="h-10 sm:h-11 px-3.5 sm:px-5 bg-[#f1a010] hover:bg-amber-500 active:scale-95 text-slate-950 font-black text-xs sm:text-sm rounded-xl flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all cursor-pointer shrink-0"
            >
              <span>Apply</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-950 text-white font-black text-[10px] sm:text-[11px]">
                {matchingCount}
              </span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
