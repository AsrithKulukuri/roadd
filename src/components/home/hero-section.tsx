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
  ChevronDown,
  MapPin,
  Tag,
  Flame,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatINR, formatINRWords } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { usePropertiesStore } from "@/stores/properties-store";
import { useProjectsStore } from "@/stores/projects-store";
import { useContentStore } from "@/stores/content-store";
import { useBannersStore } from "@/stores/banners-store";
import { findPropertyByRefId, getPropertyRefId } from "@/lib/ref-id";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";

// Search Tabs: Buy, Projects and Near me
const tabs = [
  { id: "buy", label: "Buy" },
  { id: "projects", label: "Projects" },
  { id: "nearme", label: "Near me" },
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
  const [showBuyMenu, setShowBuyMenu] = useState(false);
  const [showProjectsMenu, setShowProjectsMenu] = useState(false);
  const [openLocationTab, setOpenLocationTab] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [heroBudget, setHeroBudget] = useState<[number, number]>([1000000, 100000000]);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Rotating text carousel interval
  useEffect(() => {
    const interval = setInterval(() => {
      setSuggestionIndex((prev) => (prev + 1) % CAROUSEL_SUGGESTIONS.length);
    }, 3200);
    return () => clearInterval(interval);
  }, []);

  // Dynamic Background Banners
  const { banners, fetchBanners } = useBannersStore();
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
    }, 6000); // Rotate every 6 seconds
    return () => clearInterval(interval);
  }, [banners.length]);

  const currentBanner = banners[currentBannerIndex];

  const properties = usePropertiesStore((state) => state.properties);
  const projects = useProjectsStore((state) => state.projects);

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
    if (activeTab === "projects") {
      params.set("type", "projects");
    } else if (activeTab === "nearme") {
      params.set("type", "buy");
      params.set("nearMe", "true");
    } else {
      params.set("type", "buy");
    }

    if (searchQuery.trim()) {
      params.set("location", searchQuery.trim());
    }
    if (b[0] > 0 || b[1] < 100000000) {
      params.set("budget", `${b[0]},${b[1]}`);
    }

    router.push(`/search?${params.toString()}`);
  };

  const matchingCount = useMemo(() => {
    let count = 0;
    if (activeTab !== "projects") {
      count = properties.filter((p) => {
        if (p.status === "sold" || p.status === "archived" || p.status === "hidden") return false;
        return p.price >= heroBudget[0] && p.price <= heroBudget[1];
      }).length;
    }

    // Always count projects since all tabs (buy, nearme, projects) involve buying
    count += projects.filter((p) => {
      if (!p.configurations || p.configurations.length === 0) return false;
      return p.configurations.some((cfg) => {
        const pMin = cfg.priceMin || 0;
        const pMax = cfg.priceMax || pMin;
        return pMin <= heroBudget[1] && pMax >= heroBudget[0];
      });
    }).length;

    return count;
  }, [properties, projects, heroBudget, activeTab]);

  /** true whenever the user has moved either slider handle away from the full range */
  const budgetActive = heroBudget[0] > 1000000 || heroBudget[1] < 100000000;

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
    "new-listings": [], // all types — special case for 30 days
    "new-apartments": ["apartment"],
    "new-villas": ["villa"],
    "individual": ["independent-house"],
    "build-floors": ["builder-floor"],
    "resale": [], // all types with saleType === "resale"
    "plots": ["residential-plot", "residential-land"],
    "farm-lands": ["agricultural-land", "farmhouse"],
  };

  /** Live count of matching properties per category given current budget */
  const categoryBudgetCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    for (const cat of homeCategories) {
      const types = CATEGORY_TYPE_MAP[cat.id];
      let propCount = activeTab === "projects" ? 0 : properties.filter((p) => {
        if (p.status === "sold" || p.status === "archived" || p.status === "hidden") return false;
        const inBudget = p.price >= heroBudget[0] && p.price <= heroBudget[1];
        if (!inBudget) return false;
        
        if (cat.id === "new-listings") {
          // Only show properties created in the last 30 days
          const createdDate = new Date(p.createdAt);
          return createdDate >= thirtyDaysAgo;
        }

        if (cat.id === "resale") {
           // Resale filter
           if (p.saleType !== "resale") return false;
           return true; // since it covers all types
        }

        if (!types || types.length === 0) return true;
        return types.includes(p.propertyType as string);
      }).length;

      let projCount = 0;
      // Always count projects since all tabs involve buying
      projCount = projects.filter((p) => {
        const hasBudgetOverlap = p.configurations?.some((cfg) => {
          const pMin = cfg.priceMin || 0;
          const pMax = cfg.priceMax || pMin;
          return pMin <= heroBudget[1] && pMax >= heroBudget[0];
        });
        if (!hasBudgetOverlap) return false;

        if (cat.id === "new-listings") {
          const createdDate = new Date(p.createdAt);
          return createdDate >= thirtyDaysAgo;
        }

        if (cat.id === "resale") {
           return false; // Projects usually don't have resale
        }

        if (!types || types.length === 0) return true;
        if (p.projectType === "apartment" && types.includes("apartment")) return true;
        if (p.projectType === "villa" && types.includes("villa")) return true;
        if (p.projectType === "venture" && types.includes("residential-land")) return true;
        return false;
      }).length;

      counts[cat.id] = propCount + projCount;
    }
    return counts;
  }, [properties, projects, heroBudget, homeCategories, activeTab]);

  const browseCategories = useMemo(() => {
    return homeCategories.map((cat) => ({
      id: cat.id,
      title: cat.name,
      subtitle: cat.subtitle || cat.description,
      badge: cat.badge,
      badgeClass: cat.badgeClass,
      image: cat.image,
      baseHref: cat.href || `/search?type=buy&propertyType=${cat.type}`,
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
    <section className="relative w-full overflow-hidden text-slate-900 pt-24 sm:pt-28 md:pt-32 pb-16 md:pb-20 min-h-[500px]">
      {/* Full-Width Dynamic Banners Block */}
      {banners.length > 0 && (
        <div className="relative z-10 w-full -mt-24 sm:-mt-28 md:-mt-32 mb-10 shadow-2xl h-[250px] sm:h-[300px] md:h-[380px] overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentBanner?.id || 'banner-fallback'}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0"
            >
              {currentBanner?.image_url && (
                <Image 
                  src={currentBanner.image_url} 
                  alt={currentBanner.title || 'Banner'}
                  fill
                  className="object-cover"
                />
              )}
              {/* Overlay for readability */}
              <div className="absolute inset-0 bg-black/30 bg-gradient-to-r from-black/60 to-transparent" />
              
              {/* Banner Content (Centered in the max-w-7xl area so it aligns with content) */}
              <div className="absolute inset-0 flex flex-col justify-center items-start text-left pt-24 sm:pt-28 md:pt-32">
                <div className="w-full max-w-7xl mx-auto px-10 sm:px-14">
                  {currentBanner?.title && (
                    <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-white mb-4 sm:mb-6 drop-shadow-md max-w-[70%] leading-tight">
                      {currentBanner.title}
                    </h2>
                  )}
                  {currentBanner?.link_url && (
                    <Link
                      href={currentBanner.link_url}
                      className="inline-flex items-center gap-2 px-6 sm:px-8 py-2.5 sm:py-3 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-sm sm:text-lg rounded-lg shadow-lg transition-all hover:scale-105 active:scale-95"
                    >
                      Explore Now <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
          
          {/* Arrow Controls */}
          {banners.length > 1 && (
            <div className="absolute inset-0 z-20 pointer-events-none">
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  setCurrentBannerIndex((prev) => (prev - 1 + banners.length) % banners.length);
                }}
                className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/30 backdrop-blur-md text-white shadow-lg border border-white/20 transition-all pointer-events-auto"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
                }}
                className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/30 backdrop-blur-md text-white shadow-lg border border-white/20 transition-all pointer-events-auto"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 flex flex-col items-center text-center">
        {/* Realtor.com Search Options Bar */}
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 mb-5 px-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <div 
                key={tab.id} 
                className="relative group"
                onMouseEnter={() => {
                  if (tab.id === "buy") setShowBuyMenu(true);
                  if (tab.id === "projects") setShowProjectsMenu(true);
                }}
                onMouseLeave={() => {
                  if (tab.id === "buy") setShowBuyMenu(false);
                  if (tab.id === "projects") setShowProjectsMenu(false);
                }}
              >
                <button
                  onClick={() => {
                    if (tab.id === "buy") {
                      setShowBuyMenu(!showBuyMenu);
                      setShowProjectsMenu(false);
                    } else if (tab.id === "projects") {
                      setShowProjectsMenu(!showProjectsMenu);
                      setShowBuyMenu(false);
                    } else {
                      setShowBuyMenu(false);
                      setShowProjectsMenu(false);
                    }
                    setActiveTab(tab.id);
                    if (tab.id === "pre-approval") {
                      router.push("/mortgage-calculator");
                    }
                    if (tab.id === "nearme") {
                      router.push("/search?nearMe=true&view=map");
                    }
                  }}
                  className={cn(
                    "relative py-1.5 text-base sm:text-lg font-extrabold transition-all cursor-pointer flex items-center gap-1.5",
                    isActive
                      ? "text-slate-900"
                      : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  {tab.label}
                  {tab.id === "buy" && (
                    <ChevronDown className={cn("w-4 h-4 opacity-50 transition-transform duration-200", showBuyMenu && "rotate-180")} />
                  )}
                  {tab.id === "projects" && (
                    <ChevronDown className={cn("w-4 h-4 opacity-50 transition-transform duration-200", showProjectsMenu && "rotate-180")} />
                  )}
                  {isActive && (
                    <motion.div
                      layoutId="realtorTabLine"
                      className="absolute bottom-0 left-0 right-0 h-1 bg-slate-900 rounded-full shadow-md"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                </button>

                {tab.id === "buy" && (
                  <div className={cn(
                    "absolute top-full left-1/2 -translate-x-1/2 pt-2 w-48 transition-all duration-200 z-50",
                    showBuyMenu ? "opacity-100 visible" : "opacity-0 invisible"
                  )}>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden py-2 text-left">
                      <Link href="/search?type=buy&propertyType=apartment" className="block px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-amber-500 dark:hover:text-amber-400">
                        Flats
                      </Link>
                      <Link href="/search?type=buy&propertyType=independent-house" className="block px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-amber-500 dark:hover:text-amber-400">
                        Houses
                      </Link>
                      <Link href="/search?type=buy&propertyType=villa" className="block px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-amber-500 dark:hover:text-amber-400">
                        Villas
                      </Link>
                      <Link href="/search?type=buy&propertyType=residential-plot" className="block px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-amber-500 dark:hover:text-amber-400">
                        Plots
                      </Link>
                      <Link href="/search?type=buy&propertyType=agricultural-land" className="block px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-amber-500 dark:hover:text-amber-400">
                        Agriculture
                      </Link>
                    </div>
                  </div>
                )}
                
                {tab.id === "projects" && (
                  <div className={cn(
                    "absolute top-full left-1/2 -translate-x-1/2 pt-2 w-48 transition-all duration-200 z-50",
                    showProjectsMenu ? "opacity-100 visible" : "opacity-0 invisible"
                  )}>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden py-2 text-left">
                      <Link href="/search?type=projects&propertyType=apartment" className="block px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-amber-500 dark:hover:text-amber-400">
                        Apartments
                      </Link>
                      <Link href="/search?type=projects&propertyType=villa" className="block px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-amber-500 dark:hover:text-amber-400">
                        Villas
                      </Link>
                      <Link href="/search?type=projects&propertyType=residential-plot" className="block px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-amber-500 dark:hover:text-amber-400">
                        Plots
                      </Link>
                      <Link href="/search?type=projects" className="block px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-amber-500 dark:hover:text-amber-400 border-t border-slate-100 dark:border-slate-800 mt-1 pt-3">
                        View All Projects
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Realtor.com Search Input Bar */}
        <form
          onSubmit={handleSearchSubmit}
          className="relative w-full max-w-[760px] h-[64px] mx-auto flex items-center bg-white border border-slate-200 rounded-full px-3 shadow-xl transition-all duration-300"
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
            className="h-[44px] px-4 sm:px-6 bg-slate-900 hover:bg-slate-800 text-amber-400 font-black text-sm sm:text-base rounded-full transition-all shadow-md hover:scale-105 cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
            aria-label="Search"
          >
            <span>Search</span>
            <Search className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3] text-amber-400" />
          </button>
        </form>

        {/* Open Trending Locations Dropdowns */}
        <div className="w-full max-w-[760px] mx-auto mt-4 sm:mt-5 text-left relative z-20">
          {/* Scrollable Tabs */}
          <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar scrollbar-none snap-x snap-mandatory touch-pan-x pb-1 mb-3 sm:mb-[16px]">
            <button
              type="button"
              onClick={() => setOpenLocationTab(openLocationTab === "trending" ? null : "trending")}
              className={cn(
                "h-[36px] sm:h-[40px] px-3.5 sm:px-[20px] rounded-full text-[13px] sm:text-[14px] flex items-center gap-1.5 sm:gap-2 transition-all duration-200 cursor-pointer shadow-sm border shrink-0 snap-start",
                openLocationTab === "trending"
                  ? "bg-slate-950 border-amber-400 text-amber-400 font-bold"
                  : "bg-slate-900 border-slate-800 text-amber-400 font-semibold hover:bg-slate-800"
              )}
            >
              <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
              <span>Trending</span>
              <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", openLocationTab === "trending" && "rotate-180")} />
            </button>

            <button
              type="button"
              onClick={() => setOpenLocationTab(openLocationTab === "vijayawada" ? null : "vijayawada")}
              className={cn(
                "h-[36px] sm:h-[40px] px-3.5 sm:px-[20px] rounded-full text-[13px] sm:text-[14px] flex items-center gap-1.5 sm:gap-2 transition-all duration-200 cursor-pointer shadow-sm border shrink-0 snap-start",
                openLocationTab === "vijayawada"
                  ? "bg-slate-950 border-amber-400 text-amber-400 font-bold"
                  : "bg-slate-900 border-slate-800 text-amber-400 font-semibold hover:bg-slate-800"
              )}
            >
              <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
              <span>Vijayawada</span>
              <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", openLocationTab === "vijayawada" && "rotate-180")} />
            </button>

            <button
              type="button"
              onClick={() => setOpenLocationTab(openLocationTab === "guntur" ? null : "guntur")}
              className={cn(
                "h-[36px] sm:h-[40px] px-3.5 sm:px-[20px] rounded-full text-[13px] sm:text-[14px] flex items-center gap-1.5 sm:gap-2 transition-all duration-200 cursor-pointer shadow-sm border shrink-0 snap-start",
                openLocationTab === "guntur"
                  ? "bg-slate-950 border-amber-400 text-amber-400 font-bold"
                  : "bg-slate-900 border-slate-800 text-amber-400 font-semibold hover:bg-slate-800"
              )}
            >
              <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
              <span>Guntur</span>
              <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", openLocationTab === "guntur" && "rotate-180")} />
            </button>

            {/* Amaravati - Direct link (no sublocations) */}
            <button
              type="button"
              onClick={() => router.push(`/search?type=${activeTab}&location=Amaravati`)}
              className="h-[36px] sm:h-[40px] px-3.5 sm:px-[20px] rounded-full text-[13px] sm:text-[14px] flex items-center gap-1.5 sm:gap-2 transition-all duration-200 cursor-pointer bg-slate-900 border border-slate-800 text-amber-400 font-semibold hover:bg-slate-800 shadow-sm shrink-0 snap-start"
            >
              <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
              <span>Amaravati</span>
            </button>
          </div>

          {/* Shared Dropdown Menu (Renders outside the scroll view to avoid clipping) */}
          <AnimatePresence>
            {openLocationTab && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 mt-2 w-full max-w-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden py-2 z-50 max-h-[300px] overflow-y-auto"
              >
                {(openLocationTab === "trending" ? trendingHotspots :
                  openLocationTab === "vijayawada" ? vijayawadaHotspots :
                  openLocationTab === "guntur" ? gunturHotspots :
                  []).map(spot => (
                  <div 
                    key={spot.name}
                    onClick={() => {
                      setOpenLocationTab(null);
                      router.push(`/search?type=${activeTab}&location=${encodeURIComponent(spot.name)}`);
                    }}
                    className="px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex flex-col"
                  >
                    <span className="font-semibold text-sm text-slate-700 dark:text-slate-300">{spot.name}</span>
                    <span className="text-xs text-slate-500">{spot.tag}</span>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Clean Budget Filter ── */}
        <div className="w-full max-w-[760px] mx-auto mt-3 sm:mt-4">
          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-lg border border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Budget</h3>
            
            {/* Dropdowns */}
            <div className="flex items-center gap-3 mb-6">
              <select
                value={heroBudget[0]}
                onChange={(e) => setHeroBudget([Number(e.target.value), heroBudget[1]])}
                className="flex-1 h-11 px-3 border border-slate-300 rounded-xl bg-white text-sm font-semibold text-slate-700 outline-none focus:border-amber-500 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23333%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[length:12px_12px] bg-[right_12px_center]"
              >
                {![1000000, 2000000, 3000000, 5000000, 7500000, 10000000, 20000000, 50000000].includes(heroBudget[0]) && (
                  <option value={heroBudget[0]}>{formatINRWords(heroBudget[0])}</option>
                )}
                <option value={1000000}>₹ 10 L</option>
                <option value={2000000}>₹ 20 L</option>
                <option value={3000000}>₹ 30 L</option>
                <option value={5000000}>₹ 50 L</option>
                <option value={7500000}>₹ 75 L</option>
                <option value={10000000}>₹ 1 Cr</option>
                <option value={20000000}>₹ 2 Cr</option>
                <option value={50000000}>₹ 5 Cr</option>
              </select>

              <span className="text-slate-500 font-medium text-sm">to</span>

              <select
                value={heroBudget[1]}
                onChange={(e) => setHeroBudget([heroBudget[0], Number(e.target.value)])}
                className="flex-1 h-11 px-3 border border-slate-300 rounded-xl bg-white text-sm font-semibold text-slate-700 outline-none focus:border-amber-500 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23333%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[length:12px_12px] bg-[right_12px_center]"
              >
                {![100000000, 1000000, 2000000, 3000000, 5000000, 7500000, 10000000, 15000000, 20000000, 30000000, 50000000].includes(heroBudget[1]) && (
                  <option value={heroBudget[1]}>{formatINRWords(heroBudget[1], true)}</option>
                )}
                <option value={100000000}>Max</option>
                <option value={1000000}>₹ 10 L</option>
                <option value={2000000}>₹ 20 L</option>
                <option value={3000000}>₹ 30 L</option>
                <option value={5000000}>₹ 50 L</option>
                <option value={7500000}>₹ 75 L</option>
                <option value={10000000}>₹ 1 Cr</option>
                <option value={15000000}>₹ 1.5 Cr</option>
                <option value={20000000}>₹ 2 Cr</option>
                <option value={30000000}>₹ 3 Cr</option>
                <option value={50000000}>₹ 5 Cr</option>
              </select>
            </div>

            {/* Slider */}
            <div className="px-2">
              <style>{`
                .budget-slider [role="slider"] {
                  background: #0f172a !important; /* dark slate */
                  border-color: #0f172a !important;
                  width: 20px !important;
                  height: 20px !important;
                }
              `}</style>
              <Slider
                min={1000000}
                max={100000000}
                step={500000}
                value={heroBudget}
                onValueChange={(val) => setHeroBudget(val as [number, number])}
                className="w-full budget-slider cursor-pointer"
              />
            </div>
            
            <div className="flex justify-end mt-4">
              <button
                type="button"
                onClick={() => handleSearchSubmit()}
                className="flex items-center gap-2 h-9 px-6 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-sm rounded-lg shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <span>Apply</span>
                <span className="w-5 h-5 rounded-full bg-amber-400/20 flex items-center justify-center text-xs font-black text-amber-400 leading-none">
                  {matchingCount}
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="w-full mt-12 text-left space-y-4">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
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
              href="/search"
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
