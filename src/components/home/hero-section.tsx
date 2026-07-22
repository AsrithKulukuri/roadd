"use client";

import { useState, useEffect, useRef } from "react";
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
  { name: "Benz Circle", city: "Vijayawada", tag: "High Demand Hub", count: "45+ Homes", badge: "🔥 #1 Hotspot" },
  { name: "Amaravati Road", city: "Guntur", tag: "Capital Highway Corridor", count: "42+ Homes", badge: "⚡ Fast Growing" },
  { name: "Mangalagiri", city: "Guntur", tag: "Near AIIMS & IT Park", count: "40+ Homes", badge: "🚀 High ROI" },
  { name: "Poranki", city: "Vijayawada", tag: "Luxury Villa Township", count: "32+ Homes", badge: "⭐ Hot Listing" },
  { name: "Gorantla", city: "Guntur", tag: "Premium Residential Hub", count: "35+ Homes", badge: "🔥 Trending" },
  { name: "Tadepalli", city: "Vijayawada", tag: "Near AP Secretariat", count: "25+ Homes", badge: "💎 Capital Hub" },
];

const vijayawadaHotspots = [
  { name: "Benz Circle", tag: "Prime Commercial & Hub", count: "45+ Homes" },
  { name: "Poranki", tag: "Fastest Growing Residential", count: "32+ Homes" },
  { name: "Kanuru", tag: "Premium Villas & Apartments", count: "28+ Homes" },
  { name: "Patamata", tag: "Central City Living", count: "38+ Homes" },
  { name: "Tadepalli", tag: "Near Capital Region", count: "25+ Homes" },
  { name: "Penamaluru", tag: "Gated Communities", count: "20+ Homes" },
  { name: "Auto Nagar", tag: "Commercial & Plots", count: "18+ Homes" },
];

const gunturHotspots = [
  { name: "Gorantla", tag: "Top Residential Location", count: "35+ Homes" },
  { name: "Amaravati Road", tag: "Capital Corridor", count: "42+ Homes" },
  { name: "Brodipet", tag: "Commercial & Premium Flats", count: "30+ Homes" },
  { name: "Pattabhipuram", tag: "Established Housing", count: "24+ Homes" },
  { name: "Kaza", tag: "High-yield Plots & Villas", count: "22+ Homes" },
  { name: "Mangalagiri", tag: "Near AIIMS & Highway", count: "40+ Homes" },
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
  const [locationTab, setLocationTab] = useState<"trending" | "vijayawada" | "guntur" | "popular">("trending");
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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === "sell") {
      router.push("/list-with-us");
      return;
    }
    if (searchQuery.trim()) {
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

  const browseCategories = [
    {
      id: "new-listings",
      title: "New listings",
      subtitle: "Explore newly added homes",
      badge: "12,450",
      image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80",
      href: "/properties?type=buy&saleType=new",
    },
    {
      id: "price-reduced",
      title: "Price reduced",
      subtitle: "Best value properties",
      badge: "Hot Deals",
      badgeClass: "bg-emerald-500 text-slate-950 font-extrabold",
      image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=80",
      href: "/properties?type=buy",
    },
    {
      id: "ready-to-move",
      title: "Ready to move",
      subtitle: "Move in immediately",
      badge: "Verified",
      image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=80",
      href: "/properties?type=buy&availability=ready",
    },
    {
      id: "villas-estates",
      title: "Villas & Estates",
      subtitle: "Independent luxury houses",
      image: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=600&q=80",
      href: "/properties?type=buy&propertyType=villa",
    },
    {
      id: "plots-lands",
      title: "Residential Plots",
      subtitle: "Capital region plots & land",
      image: "https://images.unsplash.com/photo-1628624747186-a941c476b7ef?w=600&q=80",
      href: "/properties?type=buy&propertyType=residential-land",
    },
    {
      id: "commercial-spaces",
      title: "Commercial Spaces",
      subtitle: "Shops, offices & complexes",
      image: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80",
      href: "/properties?type=buy&propertyType=commercial-spaces",
    },
    {
      id: "gated-communities",
      title: "Gated Communities",
      subtitle: "24/7 security townships",
      image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&q=80",
      href: "/properties?type=buy&propertyType=apartment",
    },
    {
      id: "luxury-penthouses",
      title: "Luxury Penthouses",
      subtitle: "Skyline views & amenities",
      image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=80",
      href: "/properties?type=buy",
    },
  ];

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

        {/* Senior UI/UX Location & Quick Search Carousel Card (Optimized for Desktop & Mobile) */}
        <div className="w-full max-w-2xl sm:max-w-3xl lg:max-w-4xl mt-5 bg-slate-950/80 backdrop-blur-md border border-white/15 rounded-2xl p-3.5 sm:p-4 text-left shadow-2xl space-y-3">
          {/* Header Row & City Tab Switcher */}
          <div className="flex items-center justify-between gap-2 flex-wrap border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
              <span className="text-[11px] font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1 mr-1 flex-shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> EXPLORE AP:
              </span>

              {/* Trending Locations Tab */}
              <button
                onClick={() => setLocationTab("trending")}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-extrabold transition-all duration-200 flex items-center gap-1.5 flex-shrink-0 cursor-pointer",
                  locationTab === "trending"
                    ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md scale-105"
                    : "bg-white/10 text-slate-200 hover:bg-white/20 border border-white/10"
                )}
              >
                <Flame className="w-3.5 h-3.5 text-orange-950" /> Trending Locations
              </button>

              <button
                onClick={() => setLocationTab("vijayawada")}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 flex-shrink-0 cursor-pointer",
                  locationTab === "vijayawada"
                    ? "bg-amber-500 text-slate-950 font-bold shadow-md"
                    : "bg-white/10 text-slate-200 hover:bg-white/20 border border-white/10"
                )}
              >
                <MapPin className="w-3.5 h-3.5" /> Vijayawada Hubs
              </button>
              <button
                onClick={() => setLocationTab("guntur")}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 flex-shrink-0 cursor-pointer",
                  locationTab === "guntur"
                    ? "bg-amber-500 text-slate-950 font-bold shadow-md"
                    : "bg-white/10 text-slate-200 hover:bg-white/20 border border-white/10"
                )}
              >
                <Building2 className="w-3.5 h-3.5" /> Guntur Hotspots
              </button>
              <button
                onClick={() => setLocationTab("popular")}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 flex-shrink-0 cursor-pointer",
                  locationTab === "popular"
                    ? "bg-amber-500 text-slate-950 font-bold shadow-md"
                    : "bg-white/10 text-slate-200 hover:bg-white/20 border border-white/10"
                )}
              >
                <Tag className="w-3.5 h-3.5" /> Top Searches
              </button>
            </div>

            {/* Desktop Chevron Navigation Controls */}
            <div className="hidden sm:flex items-center gap-1">
              <button
                onClick={scrollLeft}
                className="p-1.5 bg-white/10 hover:bg-white/20 text-slate-200 rounded-lg transition-colors border border-white/10 cursor-pointer"
                aria-label="Scroll left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={scrollRight}
                className="p-1.5 bg-white/10 hover:bg-white/20 text-slate-200 rounded-lg transition-colors border border-white/10 cursor-pointer"
                aria-label="Scroll right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Horizontal Carousel Chips Row */}
          <div
            ref={scrollContainerRef}
            className="flex items-center gap-2.5 overflow-x-auto pb-1 no-scrollbar scroll-smooth"
          >
            {locationTab === "trending" &&
              trendingHotspots.map((spot) => (
                <button
                  key={spot.name}
                  onClick={() => router.push(`/properties?type=${activeTab}&location=${encodeURIComponent(spot.name)}`)}
                  className="flex-shrink-0 flex items-center gap-2.5 px-3.5 py-2 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-white text-xs transition-all duration-200 cursor-pointer group shadow-sm"
                >
                  <Flame className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                  <div className="text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-amber-300 block leading-tight">{spot.name}</span>
                      <span className="text-[9px] bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded font-black uppercase">
                        {spot.badge}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-300 block leading-tight">{spot.tag}</span>
                  </div>
                </button>
              ))}

            {locationTab === "vijayawada" &&
              vijayawadaHotspots.map((spot) => (
                <button
                  key={spot.name}
                  onClick={() => router.push(`/properties?type=${activeTab}&location=${encodeURIComponent(spot.name)}`)}
                  className="flex-shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl border border-white/15 bg-white/10 hover:bg-white/20 text-white text-xs transition-all duration-200 cursor-pointer group"
                >
                  <MapPin className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                  <div className="text-left">
                    <span className="font-bold block leading-tight">{spot.name}</span>
                    <span className="text-[10px] text-slate-300 block leading-tight">{spot.tag}</span>
                  </div>
                </button>
              ))}

            {locationTab === "guntur" &&
              gunturHotspots.map((spot) => (
                <button
                  key={spot.name}
                  onClick={() => router.push(`/properties?type=${activeTab}&location=${encodeURIComponent(spot.name)}`)}
                  className="flex-shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl border border-white/15 bg-white/10 hover:bg-white/20 text-white text-xs transition-all duration-200 cursor-pointer group"
                >
                  <Building2 className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                  <div className="text-left">
                    <span className="font-bold block leading-tight">{spot.name}</span>
                    <span className="text-[10px] text-slate-300 block leading-tight">{spot.tag}</span>
                  </div>
                </button>
              ))}

            {locationTab === "popular" &&
              popularQuickFilters.map((filter) => (
                <button
                  key={filter.label}
                  onClick={() => {
                    const queryParams = new URLSearchParams();
                    queryParams.append("type", activeTab);
                    if (filter.bhk) queryParams.append("bhk", filter.bhk.join(","));
                    if (filter.budget) queryParams.append("budget", filter.budget.join(","));
                    if (filter.propertyType) queryParams.append("propertyType", filter.propertyType.join(","));
                    if (filter.availability) queryParams.append("availability", filter.availability.join(","));
                    router.push(`/properties?${queryParams.toString()}`);
                  }}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/15 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all duration-200 cursor-pointer"
                >
                  <Tag className="w-3.5 h-3.5 text-amber-400" />
                  <span>{filter.label}</span>
                </button>
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
