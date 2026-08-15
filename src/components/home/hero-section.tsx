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
  IndianRupee,
  X,
} from "lucide-react";
import { cn, formatINR, formatINRWords, formatPriceCompact } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { usePropertiesStore } from "@/stores/properties-store";
import { useProjectsStore } from "@/stores/projects-store";
import { useContentStore } from "@/stores/content-store";
import { useBannersStore } from "@/stores/banners-store";
import { resolveMediaUrl } from "@/lib/aws/storage-utils";
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
  const [showBudgetDropdown, setShowBudgetDropdown] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [heroBudget, setHeroBudget] = useState<[number, number]>([1000000, 30000000]);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // ── Typewriter / Typing Effect State & Logic ──
  const [typedText, setTypedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [loopNum, setLoopNum] = useState(0);
  const [typingSpeed, setTypingSpeed] = useState(60);

  useEffect(() => {
    const currentFullText = CAROUSEL_SUGGESTIONS[loopNum % CAROUSEL_SUGGESTIONS.length];

    const handleType = () => {
      if (isDeleting) {
        setTypedText(currentFullText.substring(0, typedText.length - 1));
        setTypingSpeed(25);
      } else {
        setTypedText(currentFullText.substring(0, typedText.length + 1));
        setTypingSpeed(55);
      }

      if (!isDeleting && typedText === currentFullText) {
        // Pauses when word is fully typed
        setTimeout(() => setIsDeleting(true), 2200);
      } else if (isDeleting && typedText === "") {
        // Finished deleting - move to next suggestion
        setIsDeleting(false);
        setLoopNum((prev) => prev + 1);
        setTypingSpeed(350);
      }
    };

    const timer = setTimeout(handleType, typingSpeed);
    return () => clearTimeout(timer);
  }, [typedText, isDeleting, loopNum, typingSpeed]);

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
    if (b[0] > 0 || b[1] < 30000000) {
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
  const budgetActive = heroBudget[0] > 1000000 || heroBudget[1] < 30000000;

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
        <div className="relative z-10 w-full -mt-24 sm:-mt-28 md:-mt-32 mb-3 sm:mb-6 shadow-2xl h-[195px] sm:h-[290px] md:h-[390px] overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentBanner?.id || 'banner-fallback'}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0"
            >
              {/* Responsive Banner Images: Mobile image on mobile, Desktop image on desktop */}
              {currentBanner?.mobile_image_url ? (
                <>
                  <div className="md:hidden absolute inset-0">
                    <Image 
                      src={resolveMediaUrl(currentBanner.mobile_image_url)} 
                      alt={currentBanner.title || 'Banner Mobile'}
                      fill
                      priority
                      className="object-cover"
                    />
                  </div>
                  <div className="hidden md:block absolute inset-0">
                    <Image 
                      src={resolveMediaUrl(currentBanner.image_url)} 
                      alt={currentBanner.title || 'Banner Desktop'}
                      fill
                      priority
                      className="object-cover"
                    />
                  </div>
                </>
              ) : currentBanner?.image_url ? (
                <Image 
                  src={resolveMediaUrl(currentBanner.image_url)} 
                  alt={currentBanner.title || 'Banner'}
                  fill
                  priority
                  className="object-cover"
                />
              ) : null}

              {/* Gradient overlay for contrast */}
              <div className="absolute inset-0 bg-black/40 bg-gradient-to-r from-black/80 via-black/45 to-transparent" />
              
              {/* Banner Content (SAFE IN BETWEEN ARROWS WITH GENEROUS HORIZONTAL PADDING) */}
              <div className="absolute inset-0 flex flex-col justify-center items-start text-left pt-20 sm:pt-24 md:pt-28">
                <div className="w-full max-w-7xl mx-auto px-14 sm:px-20 md:px-24">
                  {currentBanner?.title && (
                    <h2 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white mb-2 sm:mb-3 drop-shadow-xl max-w-[85%] sm:max-w-[70%] leading-tight tracking-tight">
                      {currentBanner.title}
                    </h2>
                  )}
                  {currentBanner?.subtitle && (
                    <p className="text-xs sm:text-base md:text-lg text-slate-200 font-medium mb-3 sm:mb-5 max-w-[85%] sm:max-w-[65%] line-clamp-2 drop-shadow-md">
                      {currentBanner.subtitle}
                    </p>
                  )}
                  {currentBanner?.link_url && (
                    <Link
                      href={currentBanner.link_url}
                      className="inline-flex items-center gap-2 px-5 sm:px-8 py-2 sm:py-3 bg-slate-950 hover:bg-slate-900 text-white font-extrabold text-xs sm:text-base rounded-xl shadow-2xl transition-all hover:scale-105 active:scale-95 border border-white/20 hover:border-amber-400 cursor-pointer"
                    >
                      <span>{currentBanner.button_text || "Explore Now"}</span>
                      <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
          
          {/* Arrow Controls - positioned cleanly on outer margins */}
          {banners.length > 1 && (
            <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-between px-2 sm:px-5 md:px-6">
              <button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setCurrentBannerIndex((prev) => (prev - 1 + banners.length) % banners.length);
                }}
                aria-label="Previous Banner"
                className="w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center rounded-full bg-black/45 hover:bg-black/75 backdrop-blur-md text-white shadow-2xl border border-white/25 transition-all hover:scale-110 active:scale-95 pointer-events-auto cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              
              <button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
                }}
                aria-label="Next Banner"
                className="w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center rounded-full bg-black/45 hover:bg-black/75 backdrop-blur-md text-white shadow-2xl border border-white/25 transition-all hover:scale-110 active:scale-95 pointer-events-auto cursor-pointer"
              >
                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
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
          className="relative w-full max-w-[760px] h-[54px] sm:h-[64px] mx-auto flex items-center bg-white border border-slate-200 rounded-full pl-3.5 sm:pl-4 pr-1.5 sm:pr-2 shadow-xl transition-all duration-300"
        >
          <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 mr-2 sm:mr-3 shrink-0 pointer-events-none" />

          {/* Input text wrapper occupying available width */}
          <div className="relative flex-1 min-w-0 h-full flex items-center">
            {!searchQuery && !isFocused && (
              <div
                onClick={() => inputRef.current?.focus()}
                className="absolute inset-0 flex items-center pointer-events-none overflow-hidden text-left"
              >
                <span className="text-xs sm:text-base text-slate-500 font-semibold truncate select-none flex items-center w-full">
                  <span>{typedText}</span>
                  <span className="inline-block w-[2px] h-[14px] sm:h-[18px] bg-amber-500 ml-0.5 animate-pulse" />
                </span>
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
              className="w-full h-full bg-transparent text-xs sm:text-base text-slate-900 placeholder-slate-400 font-bold border-none outline-none focus:outline-none focus:ring-0 shadow-none px-0"
            />
          </div>

          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="p-1 sm:p-1.5 mx-1 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          )}

          <button
            type="submit"
            className="h-[40px] sm:h-[48px] px-4 sm:px-6 bg-slate-950 hover:bg-slate-900 text-white font-black text-xs sm:text-sm rounded-full transition-all shadow-md hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 shrink-0 ml-1"
            aria-label="Search"
          >
            <span>Search</span>
            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3] text-amber-400" />
          </button>
        </form>

        {/* Open Locations Pills */}
        <div className="w-full max-w-[760px] mx-auto mt-2.5 sm:mt-4 text-left relative z-20">
          {/* Scrollable Location Tabs */}
          <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar scrollbar-none snap-x snap-mandatory touch-pan-x pb-1 mb-1.5 sm:mb-2.5">
            <button
              type="button"
              onClick={() => setOpenLocationTab(openLocationTab === "vijayawada" ? null : "vijayawada")}
              className={cn(
                "h-[32px] sm:h-[36px] px-3 sm:px-[16px] rounded-full text-[11px] sm:text-[13px] flex items-center gap-1.5 transition-all duration-200 cursor-pointer shadow-xs border shrink-0 snap-start",
                openLocationTab === "vijayawada"
                  ? "bg-slate-950 border-amber-400 text-white font-bold"
                  : "bg-slate-900 border-slate-800 text-white font-semibold hover:bg-slate-800"
              )}
            >
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <span>Vijayawada</span>
              <ChevronDown className={cn("w-3 h-3 transition-transform", openLocationTab === "vijayawada" && "rotate-180")} />
            </button>

            <button
              type="button"
              onClick={() => setOpenLocationTab(openLocationTab === "guntur" ? null : "guntur")}
              className={cn(
                "h-[32px] sm:h-[36px] px-3 sm:px-[16px] rounded-full text-[11px] sm:text-[13px] flex items-center gap-1.5 transition-all duration-200 cursor-pointer shadow-xs border shrink-0 snap-start",
                openLocationTab === "guntur"
                  ? "bg-slate-950 border-amber-400 text-white font-bold"
                  : "bg-slate-900 border-slate-800 text-white font-semibold hover:bg-slate-800"
              )}
            >
              <Building2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Guntur</span>
              <ChevronDown className={cn("w-3 h-3 transition-transform", openLocationTab === "guntur" && "rotate-180")} />
            </button>

            {/* Amaravati - Direct link */}
            <button
              type="button"
              onClick={() => router.push(`/search?type=${activeTab}&location=Amaravati`)}
              className="h-[32px] sm:h-[36px] px-3 sm:px-[16px] rounded-full text-[11px] sm:text-[13px] flex items-center gap-1.5 transition-all duration-200 cursor-pointer bg-slate-900 border border-slate-800 text-white font-semibold hover:bg-slate-800 shadow-xs shrink-0 snap-start"
            >
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <span>Amaravati</span>
            </button>
          </div>

          {/* Shared Location Dropdown */}
          <AnimatePresence>
            {openLocationTab && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 mt-1.5 w-full max-w-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden py-2 z-50 max-h-[280px] overflow-y-auto"
              >
                {(openLocationTab === "vijayawada" ? vijayawadaHotspots :
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

        {/* ── Option 2: Compact 1-Line Budget Bar (Clean White) ── */}
        <div className="w-full max-w-[760px] mx-auto mt-1 sm:mt-2">
          <div className="bg-white rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-2.5 shadow-lg border border-slate-200 flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
            
            {/* Min & Max Selects */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto shrink-0">
              <span className="text-[11px] sm:text-xs font-black text-slate-700 uppercase tracking-wider shrink-0 mr-0.5">
                Budget:
              </span>
              <select
                value={heroBudget[0]}
                onChange={(e) => setHeroBudget([Number(e.target.value), Math.max(Number(e.target.value), heroBudget[1])])}
                className="h-8 px-2.5 border border-slate-300 hover:border-amber-400 focus:border-amber-500 rounded-xl bg-slate-50 text-[11px] sm:text-xs font-black text-slate-900 outline-none cursor-pointer shadow-2xs transition-colors"
              >
                {![1000000, 2000000, 3000000, 5000000, 7500000, 10000000, 15000000, 20000000, 30000000].includes(heroBudget[0]) && (
                  <option value={heroBudget[0]}>{formatINRWords(heroBudget[0])}</option>
                )}
                <option value={1000000}>₹ 10 L</option>
                <option value={2000000}>₹ 20 L</option>
                <option value={3000000}>₹ 30 L</option>
                <option value={5000000}>₹ 50 L</option>
                <option value={7500000}>₹ 75 L</option>
                <option value={10000000}>₹ 1 Cr</option>
                <option value={15000000}>₹ 1.5 Cr</option>
                <option value={20000000}>₹ 2 Cr</option>
                <option value={30000000}>₹ 3 Cr</option>
              </select>

              <span className="text-slate-400 font-black text-[10px]">TO</span>

              <select
                value={heroBudget[1]}
                onChange={(e) => setHeroBudget([Math.min(heroBudget[0], Number(e.target.value)), Number(e.target.value)])}
                className="h-8 px-2.5 border border-slate-300 hover:border-amber-400 focus:border-amber-500 rounded-xl bg-slate-50 text-[11px] sm:text-xs font-black text-slate-900 outline-none cursor-pointer shadow-2xs transition-colors"
              >
                {![30000000, 1000000, 2000000, 3000000, 5000000, 7500000, 10000000, 15000000, 20000000].includes(heroBudget[1]) && (
                  <option value={heroBudget[1]}>{heroBudget[1] >= 30000000 ? "Any Price" : formatINRWords(heroBudget[1], true)}</option>
                )}
                <option value={30000000}>Any Price</option>
                <option value={1000000}>₹ 10 L</option>
                <option value={2000000}>₹ 20 L</option>
                <option value={3000000}>₹ 30 L</option>
                <option value={5000000}>₹ 50 L</option>
                <option value={7500000}>₹ 75 L</option>
                <option value={10000000}>₹ 1 Cr</option>
                <option value={15000000}>₹ 1.5 Cr</option>
                <option value={20000000}>₹ 2 Cr</option>
                <option value={30000000}>₹ 3 Cr</option>
              </select>
            </div>

            {/* Inline Slider */}
            <div className="flex-1 w-full px-1.5">
              <style>{`
                .budget-slider [role="slider"] {
                  background: #0f172a !important;
                  border: 2px solid #ffffff !important;
                  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.3);
                  width: 18px !important;
                  height: 18px !important;
                  transition: transform 0.2s;
                }
                .budget-slider [role="slider"]:hover {
                  transform: scale(1.2);
                  background: #f59e0b !important;
                }
                .budget-slider [data-orientation="horizontal"] .radix-slider-track {
                  height: 5px !important;
                  border-radius: 999px;
                  background: #e2e8f0;
                }
                .budget-slider [data-orientation="horizontal"] .radix-slider-range {
                  background: linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%) !important;
                }
              `}</style>
              <Slider
                min={1000000}
                max={30000000}
                step={250000}
                value={heroBudget}
                onValueChange={(val) => setHeroBudget(val as [number, number])}
                className="w-full budget-slider cursor-pointer"
              />
            </div>

            {/* Apply Button */}
            <button
              type="button"
              onClick={() => handleSearchSubmit()}
              className="h-8 px-4 bg-slate-950 hover:bg-slate-900 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0 w-full sm:w-auto"
            >
              <span>Apply</span>
              <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">
                {matchingCount}
              </span>
            </button>

          </div>
        </div>

        <div className="w-full mt-3 sm:mt-6 text-left space-y-3">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight">
              Browse homes
            </h2>
            <Link
              href="/search"
              className="text-xs sm:text-sm font-semibold text-amber-600 hover:text-amber-500 flex items-center gap-1 hover:underline"
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
