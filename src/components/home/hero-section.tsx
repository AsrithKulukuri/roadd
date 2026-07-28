"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Search,
  TrendingDown,
  Building2,
  Trees,
  Store,
  Shield,
  Sparkles,
  Building,
  ChevronRight,
  ChevronLeft,
  MapPin,
  Tag,
  Flame,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { usePropertiesStore } from "@/stores/properties-store";
import { useContentStore } from "@/stores/content-store";
import { findPropertyByRefId, getPropertyRefId } from "@/lib/ref-id";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";

// Search Tabs: Only Buy and Rent
const tabs = [
  { id: "buy", label: "Buy" },
  { id: "rent", label: "Rent" },
];

const CAROUSEL_SUGGESTIONS = [
  "Benz Circle, 3BHK flat, Vijayawada",
  "Gorantla, 2BHK under ₹50L, Guntur",
  "Poranki, Luxury Villa, Vijayawada",
  "Amaravati Road, Residential Plot, Guntur",
  "Kanuru, Ready to move 3BHK, Vijayawada",
  "Tadepalli, Capital view flat",
];

const trendingHotspots = [
  { name: "Benz Circle", city: "Vijayawada", tag: "High Demand Hub", count: "45+ Homes", badge: "Hot" },
  { name: "Amaravati Road", city: "Guntur", tag: "Capital Highway Corridor", count: "42+ Homes", badge: "Fast Growing" },
  { name: "Mangalagiri", city: "Guntur", tag: "Near AIIMS & IT Park", count: "40+ Homes", badge: "High ROI" },
  { name: "Poranki", city: "Vijayawada", tag: "Luxury Villa Township", count: "32+ Homes", badge: "Top" },
  { name: "Gorantla", city: "Guntur", tag: "Premium Residential Hub", count: "35+ Homes", badge: "Hot" },
  { name: "Tadepalli", city: "Vijayawada", tag: "Near AP Secretariat", count: "25+ Homes", badge: "Top" },
];

const vijayawadaHotspots = [
  { name: "Benz Circle", tag: "Prime Commercial Hub", count: "45+ Homes", badge: "Hot" },
  { name: "Poranki", tag: "Fastest Growing Residential", count: "32+ Homes", badge: "Top" },
  { name: "Kanuru", tag: "Premium Villas & Apartments", count: "28+ Homes", badge: "High ROI" },
  { name: "Patamata", tag: "Central City Living", count: "38+ Homes", badge: "Hot" },
  { name: "Tadepalli", tag: "Near Capital Region", count: "25+ Homes", badge: "Fast Growing" },
  { name: "Penamaluru", tag: "Gated Communities", count: "20+ Homes", badge: "Top" },
  { name: "Auto Nagar", tag: "Commercial & Plots", count: "18+ Homes", badge: "High ROI" },
];

const gunturHotspots = [
  { name: "Gorantla", tag: "Top Residential Location", count: "35+ Homes", badge: "Hot" },
  { name: "Amaravati Road", tag: "Capital Corridor", count: "42+ Homes", badge: "Fast Growing" },
  { name: "Brodipet", tag: "Commercial & Premium Flats", count: "30+ Homes", badge: "Top" },
  { name: "Pattabhipuram", tag: "Established Housing", count: "24+ Homes", badge: "Popular" },
  { name: "Kaza", tag: "High-yield Plots & Villas", count: "22+ Homes", badge: "High ROI" },
  { name: "Mangalagiri", tag: "Near AIIMS & Highway", count: "40+ Homes", badge: "Hot" },
];

const popularQuickFilters = [
  { label: "2 BHK under ₹50L", budget: [0, 5000000], bhk: ["2"] },
  { label: "3 BHK Luxury Flats", bhk: ["3"] },
  { label: "Gated Community Villas", propertyType: ["villa"] },
  { label: "Ready to Move", availability: ["ready"] },
  { label: "Residential Plots", propertyType: ["residential-land"] },
  { label: "Owner Listings", postedBy: ["owner"] },
];

export function HeroSection() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("buy");
  const [locationTab, setLocationTab] = useState<"trending" | "vijayawada" | "guntur" | "popular" | "nearyou">("trending");
  const [searchQuery, setSearchQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [heroBudget, setHeroBudget] = useState<[number, number]>([0, 100000000]);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Rotating text carousel interval
  useEffect(() => {
    const interval = setInterval(() => {
      setSuggestionIndex((prev) => (prev + 1) % CAROUSEL_SUGGESTIONS.length);
    }, 3200);
    return () => clearInterval(interval);
  }, []);

  const properties = usePropertiesStore((state) => state.properties);

  const handleSearchSubmit = (e?: React.FormEvent, customBudget?: [number, number]) => {
    if (e) e.preventDefault();
    if (activeTab === "sell") {
      router.push("/list-with-us");
      return;
    }
    if (activeTab === "pre-approval") {
      router.push("/mortgage-calculator");
      return;
    }

    const b = customBudget ?? heroBudget;

    if (searchQuery.trim()) {
      const refMatch = findPropertyByRefId(searchQuery, properties);
      if (refMatch) {
        toast.success(`🎯 Direct match for Reference ID ${getPropertyRefId(refMatch)}! Redirecting...`);
        router.push(`/properties/${refMatch.id}`);
        return;
      }
    }

    const params = new URLSearchParams();
    if (activeTab === "rent") {
      params.set("type", "rent");
    } else {
      params.set("type", "buy");
    }
    if (searchQuery.trim()) {
      params.set("location", searchQuery.trim());
    }
    if (b[0] > 0 || b[1] < 100000000) {
      params.set("budget", `${b[0]},${b[1]}`);
    }

    router.push(`/properties?${params.toString()}`);
  };

  const matchingCount = useMemo(() => {
    return properties.filter((p) => {
      if (p.status === "sold") return false;
      return p.price >= heroBudget[0] && p.price <= heroBudget[1];
    }).length;
  }, [properties, heroBudget]);

  /** true whenever the user has moved either slider handle away from the full range */
  const budgetActive = heroBudget[0] > 0 || heroBudget[1] < 100000000;

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -310, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 310, behavior: "smooth" });
    }
  };

  const currentSuggestion = CAROUSEL_SUGGESTIONS[suggestionIndex];

  const homeCategories = useContentStore((state) => state.homeCategories);

  /** Map each category id → which PropertyType values it covers */
  const CATEGORY_TYPE_MAP: Record<string, string[]> = {
    "new-listings":       [], // all types — special case
    "apartments":         ["apartment"],
    "villas":             ["villa"],
    "individual-houses":  ["independent-house"],
    "open-lands":         ["residential-land"],
    "agricultural":       ["farmhouse", "residential-land"],
    "commercial":         ["shops", "buildings", "commercial-spaces", "commercial-lands", "industrial-lands"],
    "gated-communities":  ["apartment", "villa", "independent-house"],
  };

  /** Live count of matching properties per category given current budget */
  const categoryBudgetCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of homeCategories) {
      const types = CATEGORY_TYPE_MAP[cat.id];
      counts[cat.id] = properties.filter((p) => {
        if (p.status === "sold" || p.status === "archived" || p.status === "hidden") return false;
        const inBudget = p.price >= heroBudget[0] && p.price <= heroBudget[1];
        if (!inBudget) return false;
        // "new-listings" shows all types
        if (!types || types.length === 0) return true;
        return types.includes(p.propertyType as string);
      }).length;
    }
    return counts;
  }, [properties, heroBudget, homeCategories]);

  const browseCategories = useMemo(() => {
    return homeCategories.map((cat) => ({
      id: cat.id,
      title: cat.name,
      subtitle: cat.subtitle || cat.description,
      badge: cat.badge,
      badgeClass: cat.badgeClass,
      image: cat.image,
      baseHref: cat.href || `/properties?type=buy&propertyType=${cat.type}`,
    }));
  }, [homeCategories]);

  /** Append budget params to any category href when budget is active */
  const getCatHref = (baseHref: string) => {
    if (!budgetActive) return baseHref;
    const url = new URL(baseHref, "http://x");
    url.searchParams.set("budget", `${heroBudget[0]},${heroBudget[1]}`);
    return url.pathname + "?" + url.searchParams.toString();
  };

  return (
    <section className="relative w-full overflow-hidden text-white pt-24 sm:pt-28 md:pt-32 pb-16 md:pb-20">
      {/* Crystal Clear High-Definition Background Image with Subtle Scrim Overlay */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage:
            'url("https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=2400&q=95")',
        }}
      >
        {/* Subtle Scrim Gradient Overlay for Maximum Background Clarity */}
        <div className="absolute inset-0 bg-black/35" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/40" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 flex flex-col items-center text-center">
        {/* R.O.A.D Branding Headline */}
        <div className="space-y-2 mb-6 sm:mb-8 max-w-4xl">
          <h1 className="font-heading text-2xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight drop-shadow-md leading-tight">
            <span className="text-amber-400 font-extrabold">R</span>eal{" "}
            <span className="text-amber-400 font-extrabold">O</span>wner{" "}
            <span className="text-amber-400 font-extrabold">A</span>gent{" "}
            <span className="text-amber-400 font-extrabold">D</span>eveloper
          </h1>
        </div>

        {/* Realtor.com Search Options Bar */}
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 mb-5 px-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === "pre-approval") {
                    router.push("/mortgage-calculator");
                  }
                }}
                className={cn(
                  "relative py-1.5 text-base sm:text-lg font-extrabold transition-all cursor-pointer",
                  isActive
                    ? "text-white"
                    : "text-white/80 hover:text-white"
                )}
              >
                {tab.label}
                {isActive && (
                  <motion.div
                    layoutId="realtorTabLine"
                    className="absolute bottom-0 left-0 right-0 h-1 bg-white rounded-full shadow-md"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Realtor.com Search Input Bar */}
        <form
          onSubmit={handleSearchSubmit}
          className="relative w-full max-w-[760px] h-[64px] mx-auto flex items-center bg-white rounded-full px-3 shadow-2xl transition-all duration-300"
        >
          <Search className="w-5 h-5 text-slate-400 ml-3 mr-2 shrink-0 pointer-events-none" />

          {!searchQuery && !isFocused && (
            <div
              onClick={() => inputRef.current?.focus()}
              className="absolute left-12 right-[145px] sm:right-[165px] inset-y-0 flex items-center pointer-events-none overflow-hidden text-left"
            >
              <AnimatePresence mode="wait">
                <motion.span
                  key={suggestionIndex}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="text-sm sm:text-base text-slate-500 font-semibold truncate select-none block"
                >
                  {currentSuggestion}
                </motion.span>
              </AnimatePresence>
            </div>
          )}

          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isFocused && !searchQuery ? "Search city, locality, builder or project..." : ""}
            style={{ outline: "none", boxShadow: "none", border: "none" }}
            className="w-full bg-transparent text-sm sm:text-base text-slate-900 placeholder-slate-400 pl-1 pr-36 sm:pr-40 font-bold border-none outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none shadow-none"
          />

          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="p-1 mr-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
            >
              ✕
            </button>
          )}

          <button
            type="submit"
            className="h-[44px] px-4 sm:px-6 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm sm:text-base rounded-full transition-all shadow-md hover:scale-105 cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
            aria-label="Search"
          >
            <span>Search</span>
            <Search className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3] text-slate-950" />
          </button>
        </form>

        {/* Open Trending Locations Carousel Section */}
        <div className="w-full max-w-2xl sm:max-w-3xl lg:max-w-4xl mt-5 sm:mt-[24px] text-left">
          {/* Category Chips Bar + Carousel Navigation Buttons (Buttons Hidden on Mobile) */}
          <div className="flex items-center justify-between gap-3 mb-3 sm:mb-[16px]">
            {/* Category Filter Chips */}
            <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar scrollbar-none snap-x snap-mandatory touch-pan-x pb-1 flex-1 min-w-0">
              <button
                type="button"
                onClick={() => setLocationTab("trending")}
                className={cn(
                  "h-[36px] sm:h-[40px] px-3.5 sm:px-[20px] rounded-full text-[13px] sm:text-[14px] flex items-center gap-1.5 sm:gap-2 shrink-0 transition-all duration-200 cursor-pointer snap-start",
                  locationTab === "trending"
                    ? "bg-gradient-to-b from-[#FFC661] to-[#F5A623] text-[#16161A] font-bold shadow-[0_6px_18px_rgba(245,166,35,0.18)]"
                    : "bg-transparent border border-[rgba(255,255,255,0.08)] text-[#D6D8DE] font-semibold hover:bg-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.2)] hover:text-white"
                )}
              >
                <Flame className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", locationTab === "trending" ? "text-[#16161A]" : "text-[#F5A623]/70")} />
                <span>Trending</span>
              </button>

              <button
                type="button"
                onClick={() => setLocationTab("vijayawada")}
                className={cn(
                  "h-[36px] sm:h-[40px] px-3.5 sm:px-[20px] rounded-full text-[13px] sm:text-[14px] flex items-center gap-1.5 sm:gap-2 shrink-0 transition-all duration-200 cursor-pointer snap-start",
                  locationTab === "vijayawada"
                    ? "bg-gradient-to-b from-[#FFC661] to-[#F5A623] text-[#16161A] font-bold shadow-[0_6px_18px_rgba(245,166,35,0.18)]"
                    : "bg-transparent border border-[rgba(255,255,255,0.08)] text-[#D6D8DE] font-semibold hover:bg-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.2)] hover:text-white"
                )}
              >
                <MapPin className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", locationTab === "vijayawada" ? "text-[#16161A]" : "text-[#F5A623]/70")} />
                <span>Vijayawada</span>
              </button>

              <button
                type="button"
                onClick={() => setLocationTab("guntur")}
                className={cn(
                  "h-[36px] sm:h-[40px] px-3.5 sm:px-[20px] rounded-full text-[13px] sm:text-[14px] flex items-center gap-1.5 sm:gap-2 shrink-0 transition-all duration-200 cursor-pointer snap-start",
                  locationTab === "guntur"
                    ? "bg-gradient-to-b from-[#FFC661] to-[#F5A623] text-[#16161A] font-bold shadow-[0_6px_18px_rgba(245,166,35,0.18)]"
                    : "bg-transparent border border-[rgba(255,255,255,0.08)] text-[#D6D8DE] font-semibold hover:bg-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.2)] hover:text-white"
                )}
              >
                <Building2 className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", locationTab === "guntur" ? "text-[#16161A]" : "text-[#F5A623]/70")} />
                <span>Guntur</span>
              </button>

              <button
                type="button"
                onClick={() => setLocationTab("popular")}
                className={cn(
                  "h-[36px] sm:h-[40px] px-3.5 sm:px-[20px] rounded-full text-[13px] sm:text-[14px] flex items-center gap-1.5 sm:gap-2 shrink-0 transition-all duration-200 cursor-pointer snap-start",
                  locationTab === "popular"
                    ? "bg-gradient-to-b from-[#FFC661] to-[#F5A623] text-[#16161A] font-bold shadow-[0_6px_18px_rgba(245,166,35,0.18)]"
                    : "bg-transparent border border-[rgba(255,255,255,0.08)] text-[#D6D8DE] font-semibold hover:bg-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.2)] hover:text-white"
                )}
              >
                <Sparkles className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", locationTab === "popular" ? "text-[#16161A]" : "text-[#F5A623]/70")} />
                <span>Premium</span>
              </button>

              <button
                type="button"
                onClick={() => setLocationTab("nearyou")}
                className={cn(
                  "h-[36px] sm:h-[40px] px-3.5 sm:px-[20px] rounded-full text-[13px] sm:text-[14px] flex items-center gap-1.5 sm:gap-2 shrink-0 transition-all duration-200 cursor-pointer snap-start",
                  locationTab === "nearyou"
                    ? "bg-gradient-to-b from-[#FFC661] to-[#F5A623] text-[#16161A] font-bold shadow-[0_6px_18px_rgba(245,166,35,0.18)]"
                    : "bg-transparent border border-[rgba(255,255,255,0.08)] text-[#D6D8DE] font-semibold hover:bg-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.2)] hover:text-white"
                )}
              >
                <MapPin className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", locationTab === "nearyou" ? "text-[#16161A]" : "text-[#F5A623]/70")} />
                <span>Near You</span>
              </button>
            </div>

            {/* Carousel Nav Arrows - HIDDEN ON MOBILE UI */}
            <div className="hidden md:flex items-center gap-1.5 shrink-0 pl-2 border-l border-white/10">
              <button
                type="button"
                onClick={scrollLeft}
                aria-label="Previous Slide"
                className="w-9 h-9 rounded-full bg-slate-800/80 hover:bg-[#F5A623] hover:text-slate-950 text-slate-300 border border-white/10 flex items-center justify-center transition-all cursor-pointer shadow-md active:scale-95"
              >
                <ChevronLeft className="w-4.5 h-4.5" />
              </button>
              <button
                type="button"
                onClick={scrollRight}
                aria-label="Next Slide"
                className="w-9 h-9 rounded-full bg-slate-800/80 hover:bg-[#F5A623] hover:text-slate-950 text-slate-300 border border-white/10 flex items-center justify-center transition-all cursor-pointer shadow-md active:scale-95"
              >
                <ChevronRight className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>

          {/* Location Cards Horizontal Carousel Track - Compact Mobile Proportions */}
          <div
            ref={scrollContainerRef}
            className="flex items-center gap-3 sm:gap-4 overflow-x-auto no-scrollbar scrollbar-none snap-x snap-mandatory touch-pan-x py-1 scroll-smooth"
          >
            {(locationTab === "trending"
              ? trendingHotspots
              : locationTab === "vijayawada"
              ? vijayawadaHotspots
              : locationTab === "guntur"
              ? gunturHotspots
              : locationTab === "popular"
              ? trendingHotspots.filter((h) => h.badge === "Demand ↑18%" || h.badge === "Top Pick" || h.badge === "Hot")
              : trendingHotspots
            ).map((spot) => (
              <div
                key={spot.name}
                onClick={() => router.push(`/properties?type=${activeTab}&location=${encodeURIComponent(spot.name)}`)}
                className="w-[230px] sm:w-[275px] shrink-0 snap-start h-[72px] sm:h-[80px] rounded-[16px] sm:rounded-[20px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-3 sm:p-4 flex items-center justify-between gap-2.5 sm:gap-3 cursor-pointer transition-all duration-250 hover:-translate-y-[2px] hover:border-[#F5A623]/60 hover:bg-[rgba(255,255,255,0.06)] hover:shadow-lg group"
              >
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[rgba(20,22,30,0.85)] border border-[rgba(255,255,255,0.08)] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform group-hover:border-[#F5A623]/40">
                  <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#F5A623]" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-[14px] sm:text-[16px] font-bold text-white leading-tight truncate group-hover:text-[#FFC661] transition-colors">
                    {spot.name}
                  </div>
                  <div className="text-[11px] sm:text-[13px] font-medium text-white/60 leading-tight truncate mt-0.5">
                    {spot.tag}
                  </div>
                  <div className="text-[10px] sm:text-[12px] font-semibold text-[#F5A623] leading-tight truncate mt-0.5">
                    {spot.count || "45+ Homes"}
                  </div>
                </div>
                {spot.badge && (
                  <div className="h-[20px] sm:h-[22px] px-2.5 py-[2px] rounded-full bg-black text-[#F5A623] border border-black text-[10px] sm:text-[11px] font-black flex items-center justify-center shrink-0 whitespace-nowrap shadow-md">
                    {spot.badge}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Premium Budget Slider ── */}
        <div className="w-full max-w-2xl sm:max-w-3xl lg:max-w-4xl mt-3 sm:mt-4">
          <div
            className="relative rounded-2xl overflow-hidden border border-white/10 shadow-xl"
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)",
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
            }}
          >
            {/* Top accent line */}
            <div className="absolute inset-x-0 top-0 h-[2px] rounded-t-2xl bg-gradient-to-r from-amber-500/0 via-amber-400/70 to-amber-500/0" />

            <div className="px-4 pt-3.5 pb-3 sm:px-5 sm:pt-4 sm:pb-3.5">
              {/* Header row */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {/* Coin icon */}
                  <div className="w-7 h-7 rounded-full bg-amber-500/15 border border-amber-400/25 flex items-center justify-center shrink-0">
                    <span className="text-amber-400 font-black text-[13px] leading-none">₹</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 leading-none">Budget Range</p>
                    <p className="text-[11px] font-semibold text-white/55 leading-none mt-0.5">Slide to filter by price</p>
                  </div>
                </div>

                {/* Price display pill */}
                <div className="flex items-center gap-1.5 bg-amber-500/12 border border-amber-400/30 rounded-xl px-3 py-1.5">
                  <span className="text-sm sm:text-base font-black text-amber-400 tracking-tight">
                    {heroBudget[0] === 0 && heroBudget[1] === 100000000
                      ? "Any Price"
                      : `${formatINR(heroBudget[0])} – ${heroBudget[1] >= 100000000 ? "₹10Cr+" : formatINR(heroBudget[1])}`}
                  </span>
                </div>
              </div>

              {/* Slider */}
              <div className="px-1">
                <Slider
                  min={0}
                  max={100000000}
                  step={500000}
                  value={heroBudget}
                  onValueChange={(val) => setHeroBudget(val as [number, number])}
                  className="w-full"
                />
              </div>

              {/* Footer: tick labels + Apply button */}
              <div className="flex items-center justify-between mt-2.5">
                <div className="flex items-center gap-3 text-[10px] font-bold text-white/35">
                  <span>₹0</span>
                  <span>₹30L</span>
                  <span>₹1Cr</span>
                  <span>₹5Cr</span>
                  <span>₹10Cr+</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleSearchSubmit()}
                  className="relative flex items-center gap-1.5 h-8 pl-3.5 pr-1.5 bg-gradient-to-br from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black text-[11px] rounded-full shadow-lg shadow-amber-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
                >
                  <span>Apply</span>
                  <span className="w-5 h-5 rounded-full bg-slate-950/20 flex items-center justify-center text-[10px] font-black text-slate-950 leading-none">
                    {matchingCount}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full mt-12 text-left space-y-4">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Browse homes
              </h2>
              {/* Budget-active pill */}
              <AnimatePresence>
                {budgetActive && (
                  <motion.span
                    key="budget-chip"
                    initial={{ opacity: 0, scale: 0.75, y: 4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.75, y: 4 }}
                    transition={{ type: "spring", stiffness: 380, damping: 26 }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 text-[11px] font-bold"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Filtered by budget
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <Link
              href="/properties"
              className="text-xs sm:text-sm font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 hover:underline"
            >
              View all categories <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Category cards grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {browseCategories.map((cat) => {
              const catCount = categoryBudgetCounts[cat.id] ?? 0;
              const hasBudgetResults = budgetActive && catCount > 0;
              const noBudgetResults = budgetActive && catCount === 0;

              return (
                <Link
                  key={cat.id}
                  href={getCatHref(cat.baseHref)}
                  className={cn(
                    "group relative h-40 sm:h-52 rounded-2xl overflow-hidden shadow-lg block bg-slate-800 transition-all duration-300",
                    hasBudgetResults
                      ? "border-2 border-amber-400/70 shadow-amber-500/20 hover:shadow-amber-500/40 hover:-translate-y-1.5 hover:shadow-2xl"
                      : noBudgetResults
                      ? "border border-white/5 opacity-50 hover:opacity-70"
                      : "border border-white/10 hover:shadow-2xl hover:-translate-y-1"
                  )}
                >
                  <Image
                    src={cat.image}
                    alt={cat.title}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  {/* Dark scrim */}
                  <div className={cn(
                    "absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent transition-opacity duration-300",
                    hasBudgetResults ? "from-slate-950/90" : ""
                  )} />

                  {/* Amber glow frame when matches found */}
                  {hasBudgetResults && (
                    <div className="absolute inset-0 ring-2 ring-amber-400/40 rounded-2xl pointer-events-none" />
                  )}

                  {/* Category badge (top-right) — hidden when budget count shows */}
                  {cat.badge && !budgetActive && (
                    <div
                      className={cn(
                        "absolute top-3 right-3 text-xs px-2.5 py-1 rounded-full shadow-xs backdrop-blur-sm",
                        cat.badgeClass ? cat.badgeClass : "bg-white/90 text-slate-900 font-bold"
                      )}
                    >
                      {cat.badge}
                    </div>
                  )}

                  {/* ── Budget count badge (top-right) ── */}
                  <AnimatePresence>
                    {budgetActive && (
                      <motion.div
                        key={`count-${cat.id}`}
                        initial={{ opacity: 0, scale: 0.55, y: -6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.55, y: -6 }}
                        transition={{ type: "spring", stiffness: 420, damping: 24, delay: 0.04 }}
                        className={cn(
                          "absolute top-2.5 right-2.5 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black shadow-lg backdrop-blur-sm border",
                          catCount > 0
                            ? "bg-amber-500 text-slate-950 border-amber-400 shadow-amber-500/40"
                            : "bg-slate-800/90 text-white/40 border-white/10"
                        )}
                      >
                        {catCount > 0 ? (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-950/40" />
                            {catCount} found
                          </>
                        ) : (
                          <span>0 found</span>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Bottom info */}
                  <div className="absolute bottom-3 left-3 right-3">
                    <span className={cn(
                      "font-heading font-bold text-base sm:text-lg block leading-snug transition-colors",
                      hasBudgetResults ? "text-amber-300 group-hover:text-amber-200" : "text-white group-hover:text-amber-400"
                    )}>
                      {cat.title}
                    </span>
                    <span className="text-[11px] text-slate-300 block line-clamp-1 mt-0.5">
                      {budgetActive && catCount > 0
                        ? `${catCount} propert${catCount === 1 ? "y" : "ies"} in your range`
                        : cat.subtitle}
                    </span>
                    {/* "Tap to view" CTA only when there are results */}
                    {hasBudgetResults && (
                      <motion.span
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-amber-400/80 group-hover:text-amber-300"
                      >
                        View all <ChevronRight className="w-3 h-3" />
                      </motion.span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
