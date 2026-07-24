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
import { motion, AnimatePresence } from "framer-motion";
import { usePropertiesStore } from "@/stores/properties-store";
import { useContentStore } from "@/stores/content-store";
import { findPropertyByRefId, getPropertyRefId } from "@/lib/ref-id";
import { toast } from "sonner";

// Only keep Buy and Sell as requested
const tabs = [
  { id: "buy", label: "Buy" },
  { id: "sell", label: "Sell" },
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
  const [locationTab, setLocationTab] = useState<"trending" | "vijayawada" | "guntur" | "popular" | "topsearches">("trending");
  const [searchQuery, setSearchQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === "sell") {
      router.push("/list-with-us");
      return;
    }
    if (searchQuery.trim()) {
      const refMatch = findPropertyByRefId(searchQuery, properties);
      if (refMatch) {
        toast.success(`🎯 Direct match for Reference ID ${getPropertyRefId(refMatch)}! Redirecting...`);
        router.push(`/properties/${refMatch.id}`);
        return;
      }

      router.push(
        `/properties?type=${activeTab}&location=${encodeURIComponent(searchQuery)}`
      );
    } else {
      router.push(`/properties?type=${activeTab}`);
    }
  };

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -260, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 260, behavior: "smooth" });
    }
  };

  const currentSuggestion = CAROUSEL_SUGGESTIONS[suggestionIndex];

  const homeCategories = useContentStore((state) => state.homeCategories);

  const browseCategories = useMemo(() => {
    return homeCategories.map((cat) => ({
      id: cat.id,
      title: cat.name,
      subtitle: cat.subtitle || cat.description,
      badge: cat.badge,
      badgeClass: cat.badgeClass,
      image: cat.image,
      href: cat.href || `/properties?type=buy&propertyType=${cat.type}`,
    }));
  }, [homeCategories]);

  return (
    <section className="relative w-full overflow-hidden bg-slate-900 text-white pt-28 sm:pt-32 md:pt-36 pb-12 md:pb-16">
      {/* Background Image with Dark Vignette Gradient */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-transform duration-10000 scale-105"
        style={{
          backgroundImage:
            'url("https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920&q=80")',
        }}
      >
        <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-[1px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-black/30" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 flex flex-col items-center text-center">
        {/* Main Headline highlighting starting letters forming R.O.A.D */}
        <div className="space-y-2 mb-6 sm:mb-8 max-w-4xl">
          <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white drop-shadow-md leading-tight">
            <span className="text-amber-400 font-black">R</span>eal{" "}
            <span className="text-amber-400 font-black">O</span>wner{" "}
            <span className="text-amber-400 font-black">A</span>gent{" "}
            <span className="text-amber-400 font-black">D</span>eveloper
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-slate-300 font-medium max-w-xl mx-auto drop-shadow-xs mt-2">
            Connecting Buyers, Owners, Agents & Developers across Vijayawada & Guntur
          </p>
        </div>

        {/* Tab Selector: Only Buy and Sell */}
        <div className="flex items-center gap-8 sm:gap-12 mb-5 justify-center">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative py-1.5 text-base sm:text-lg font-bold transition-all cursor-pointer",
                  isActive
                    ? "text-white"
                    : "text-slate-300 hover:text-white opacity-80 hover:opacity-100"
                )}
              >
                {tab.label}
                {isActive && (
                  <motion.div
                    layoutId="realtorTabLine"
                    className="absolute bottom-0 left-0 right-0 h-1 bg-white rounded-full shadow-xs"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Search Bar Pill: Clean White Container with NO Golden Border Outline */}
        <form
          onSubmit={handleSearchSubmit}
          className="relative w-full max-w-2xl flex items-center bg-white rounded-full p-2 sm:p-2.5 shadow-2xl border-0 outline-none ring-0 focus-within:outline-none focus-within:ring-0 focus-within:border-0"
          style={{ border: "none", outline: "none", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)" }}
        >
          {/* Text Carousel Animated Placeholder */}
          {!searchQuery && !isFocused && (
            <div
              onClick={() => inputRef.current?.focus()}
              className="absolute left-6 right-16 inset-y-0 flex items-center pointer-events-none overflow-hidden"
            >
              <AnimatePresence mode="wait">
                <motion.span
                  key={suggestionIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
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
            value={searchQuery}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isFocused && !searchQuery ? "Enter city, locality, BHK, or project..." : ""}
            className="w-full bg-transparent text-sm sm:text-base text-slate-900 placeholder-slate-400 pl-4 pr-12 font-medium border-0 outline-none ring-0 focus:outline-none focus:ring-0 focus:border-0 focus-visible:outline-none focus-visible:ring-0"
            style={{ border: "none", outline: "none", boxShadow: "none" }}
          />

          {/* Search Button styled in Brand Logo Amber Color */}
          <button
            type="submit"
            className="p-3 sm:p-3.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-full transition-all shadow-md hover:scale-105 cursor-pointer flex-shrink-0"
            aria-label="Search"
          >
            <Search className="w-5 h-5 stroke-[2.5]" />
          </button>
        </form>

        {/* Luxury Glassmorphic Trending Locations Section */}
        <div className="w-full max-w-2xl sm:max-w-3xl lg:max-w-4xl mt-6 bg-[rgba(20,22,30,0.75)] backdrop-blur-[18px] border border-[rgba(255,255,255,0.08)] rounded-[28px] p-6 text-left shadow-[0_20px_50px_rgba(0,0,0,0.4)]">
          {/* Clean Section Header */}
          <h3 className="text-[18px] font-bold text-white mb-4 tracking-tight flex items-center gap-2">
            <Flame className="w-4.5 h-4.5 text-[#F5A623]" /> Trending Locations
          </h3>

          {/* Category Chips Bar */}
          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar scrollbar-none snap-x snap-mandatory touch-pan-x mb-5 pb-1">
            <button
              type="button"
              onClick={() => setLocationTab("trending")}
              className={cn(
                "h-[40px] px-[22px] rounded-full text-[15px] font-semibold flex items-center gap-2 shrink-0 transition-all duration-200 cursor-pointer snap-start",
                locationTab === "trending"
                  ? "bg-gradient-to-b from-[#F5A623] to-[#D98C0F] text-[#16161A] font-bold shadow-[0_8px_22px_rgba(245,166,35,0.18)]"
                  : "bg-transparent border border-[rgba(255,255,255,0.12)] text-[#D5D8E2] hover:border-[rgba(255,255,255,0.25)] hover:text-white"
              )}
            >
              <Flame className={cn("w-4 h-4", locationTab === "trending" ? "text-[#16161A]" : "text-[#F5A623]/70")} />
              <span>Trending</span>
            </button>

            <button
              type="button"
              onClick={() => setLocationTab("vijayawada")}
              className={cn(
                "h-[40px] px-[22px] rounded-full text-[15px] font-semibold flex items-center gap-2 shrink-0 transition-all duration-200 cursor-pointer snap-start",
                locationTab === "vijayawada"
                  ? "bg-gradient-to-b from-[#F5A623] to-[#D98C0F] text-[#16161A] font-bold shadow-[0_8px_22px_rgba(245,166,35,0.18)]"
                  : "bg-transparent border border-[rgba(255,255,255,0.12)] text-[#D5D8E2] hover:border-[rgba(255,255,255,0.25)] hover:text-white"
              )}
            >
              <MapPin className={cn("w-4 h-4", locationTab === "vijayawada" ? "text-[#16161A]" : "text-[#F5A623]/70")} />
              <span>Vijayawada</span>
            </button>

            <button
              type="button"
              onClick={() => setLocationTab("guntur")}
              className={cn(
                "h-[40px] px-[22px] rounded-full text-[15px] font-semibold flex items-center gap-2 shrink-0 transition-all duration-200 cursor-pointer snap-start",
                locationTab === "guntur"
                  ? "bg-gradient-to-b from-[#F5A623] to-[#D98C0F] text-[#16161A] font-bold shadow-[0_8px_22px_rgba(245,166,35,0.18)]"
                  : "bg-transparent border border-[rgba(255,255,255,0.12)] text-[#D5D8E2] hover:border-[rgba(255,255,255,0.25)] hover:text-white"
              )}
            >
              <Building2 className={cn("w-4 h-4", locationTab === "guntur" ? "text-[#16161A]" : "text-[#F5A623]/70")} />
              <span>Guntur</span>
            </button>

            <button
              type="button"
              onClick={() => setLocationTab("popular")}
              className={cn(
                "h-[40px] px-[22px] rounded-full text-[15px] font-semibold flex items-center gap-2 shrink-0 transition-all duration-200 cursor-pointer snap-start",
                locationTab === "popular"
                  ? "bg-gradient-to-b from-[#F5A623] to-[#D98C0F] text-[#16161A] font-bold shadow-[0_8px_22px_rgba(245,166,35,0.18)]"
                  : "bg-transparent border border-[rgba(255,255,255,0.12)] text-[#D5D8E2] hover:border-[rgba(255,255,255,0.25)] hover:text-white"
              )}
            >
              <Sparkles className={cn("w-4 h-4", locationTab === "popular" ? "text-[#16161A]" : "text-[#F5A623]/70")} />
              <span>Premium</span>
            </button>

            <button
              type="button"
              onClick={() => setLocationTab("topsearches")}
              className={cn(
                "h-[40px] px-[22px] rounded-full text-[15px] font-semibold flex items-center gap-2 shrink-0 transition-all duration-200 cursor-pointer snap-start",
                locationTab === "topsearches"
                  ? "bg-gradient-to-b from-[#F5A623] to-[#D98C0F] text-[#16161A] font-bold shadow-[0_8px_22px_rgba(245,166,35,0.18)]"
                  : "bg-transparent border border-[rgba(255,255,255,0.12)] text-[#D5D8E2] hover:border-[rgba(255,255,255,0.25)] hover:text-white"
              )}
            >
              <Tag className={cn("w-4 h-4", locationTab === "topsearches" ? "text-[#16161A]" : "text-[#F5A623]/70")} />
              <span>Top Searches</span>
            </button>
          </div>

          {/* Location Cards Horizontal Carousel */}
          <div
            ref={scrollContainerRef}
            className="flex items-center gap-[14px] overflow-x-auto no-scrollbar scrollbar-none snap-x snap-mandatory touch-pan-x py-1"
          >
            {(locationTab === "trending"
              ? trendingHotspots
              : locationTab === "vijayawada"
              ? vijayawadaHotspots
              : locationTab === "guntur"
              ? gunturHotspots
              : locationTab === "popular"
              ? trendingHotspots.filter((h) => h.badge === "Hot" || h.badge === "Top")
              : trendingHotspots
            ).map((spot) => (
              <div
                key={spot.name}
                onClick={() => router.push(`/properties?type=${activeTab}&location=${encodeURIComponent(spot.name)}`)}
                className="w-[270px] sm:w-[260px] lg:w-[245px] shrink-0 snap-start h-[76px] rounded-[22px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-[18px] flex items-center justify-between gap-3 cursor-pointer transition-all duration-250 hover:-translate-y-[2px] hover:border-[rgba(255,255,255,0.2)] hover:bg-[rgba(255,255,255,0.06)] hover:shadow-lg group"
              >
                {/* Left: Circular Icon */}
                <div className="w-[40px] h-[40px] rounded-full bg-[rgba(20,22,30,0.8)] border border-[#F5A623]/40 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Flame className="w-4 h-4 text-[#F5A623]" />
                </div>

                {/* Middle: Title & Subtitle */}
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-[17px] font-bold text-white leading-tight truncate group-hover:text-[#F5A623] transition-colors">
                    {spot.name}
                  </div>
                  <div className="text-[14px] font-medium text-[rgba(255,255,255,0.65)] leading-tight truncate mt-0.5">
                    {spot.tag}
                  </div>
                </div>

                {/* Right: Tiny Badge Only */}
                {spot.badge && (
                  <div className="h-[22px] px-[10px] py-[3px] rounded-full bg-[#F5A623]/15 text-[#F5A623] border border-[#F5A623]/30 text-[11px] font-bold flex items-center justify-center shrink-0 whitespace-nowrap">
                    {spot.badge}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Expanded "Browse homes" Category Cards Section */}
        <div className="w-full mt-12 text-left space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              Browse homes
            </h2>
            <Link
              href="/properties"
              className="text-xs sm:text-sm font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 hover:underline"
            >
              View all categories <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {browseCategories.map((cat) => (
              <Link
                key={cat.id}
                href={cat.href}
                className="group relative h-40 sm:h-52 rounded-2xl overflow-hidden shadow-lg border border-white/10 block bg-slate-800 transition-all hover:shadow-2xl hover:-translate-y-1"
              >
                <Image
                  src={cat.image}
                  alt={cat.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
                
                {cat.badge && (
                  <div
                    className={cn(
                      "absolute top-3 right-3 text-xs px-2.5 py-1 rounded-full shadow-xs backdrop-blur-sm",
                      cat.badgeClass
                        ? cat.badgeClass
                        : "bg-white/90 text-slate-900 font-bold"
                    )}
                  >
                    {cat.badge}
                  </div>
                )}

                <div className="absolute bottom-3 left-3 right-3">
                  <span className="font-heading font-bold text-base sm:text-lg text-white group-hover:text-amber-400 transition-colors block leading-snug">
                    {cat.title}
                  </span>
                  <span className="text-[11px] text-slate-300 block line-clamp-1">
                    {cat.subtitle}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
