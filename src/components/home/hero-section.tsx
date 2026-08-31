"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
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
  Loader2,
  Mic,
} from "lucide-react";
import { cn, formatINR, formatINRWords, formatPriceCompact } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { usePropertiesStore } from "@/stores/properties-store";
import { useProjectsStore } from "@/stores/projects-store";
import { useContentStore } from "@/stores/content-store";
import { useBannersStore } from "@/stores/banners-store";
import { useLocationsStore } from "@/stores/locations-store";
import { resolveMediaUrl } from "@/lib/aws/storage-utils";
import { findItemByRefId, getRefId } from "@/lib/ref-id";
import { matchesPropertySearch, matchesProjectSearch } from "@/lib/search-engine";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";
import { ModernBudgetDropdown } from "@/components/ui/modern-budget-dropdown";
import { useProjectOpenGuard } from "@/hooks/useProjectOpenGuard";

const HERO_BUDGET_MIN_OPTS = [
  { label: "₹ 10 L", value: 1000000 },
  { label: "₹ 20 L", value: 2000000 },
  { label: "₹ 30 L", value: 3000000 },
  { label: "₹ 40 L", value: 4000000 },
  { label: "₹ 50 L", value: 5000000 },
  { label: "₹ 75 L", value: 7500000 },
  { label: "₹ 1 Cr", value: 10000000 },
  { label: "₹ 1.5 Cr", value: 15000000 },
  { label: "₹ 2 Cr", value: 20000000 },
  { label: "₹ 2.5 Cr", value: 25000000 },
  { label: "₹ 3 Cr", value: 30000000 },
];

const HERO_BUDGET_MAX_OPTS = [
  { label: "Any Price", value: 30000000 },
  { label: "₹ 20 L", value: 2000000 },
  { label: "₹ 30 L", value: 3000000 },
  { label: "₹ 40 L", value: 4000000 },
  { label: "₹ 50 L", value: 5000000 },
  { label: "₹ 75 L", value: 7500000 },
  { label: "₹ 1 Cr", value: 10000000 },
  { label: "₹ 1.5 Cr", value: 15000000 },
  { label: "₹ 2 Cr", value: 20000000 },
  { label: "₹ 2.5 Cr", value: 25000000 },
  { label: "₹ 3 Cr", value: 30000000 },
];

// Search Tabs: Buy, Projects, New Launches and Near me
const tabs = [
  { id: "buy", label: "Buy" },
  { id: "projects", label: "Projects" },
  { id: "new-launch", label: "New Launches" },
  { id: "nearme", label: "Near me" },
];

const CAROUSEL_SUGGESTIONS = [
  "Vijayawada",
  "Guntur",
  "Benz Circle",
  "Amaravati Road",
  "Poranki",
  "Gorantla",
  "Kanuru",
  "Tadepalli",
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { openProject } = useProjectOpenGuard();
  const [activeTab, setActiveTab] = useState("buy");
  const [locationTab, setLocationTab] = useState<"trending" | "vijayawada" | "guntur" | "popular" | "nearyou">("trending");
  const [showBuyMenu, setShowBuyMenu] = useState(false);
  const [activeBuySub, setActiveBuySub] = useState<string | null>(null);
  const [showProjectsMenu, setShowProjectsMenu] = useState(false);
  const [openLocationTab, setOpenLocationTab] = useState<string | null>(null);
  const [sublocationSearch, setSublocationSearch] = useState("");
  const [showBudgetDropdown, setShowBudgetDropdown] = useState(false);
  const [showAllCategoriesMobile, setShowAllCategoriesMobile] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [heroBudget, setHeroBudget] = useState<[number, number]>([1000000, 30000000]);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Prefetch search route for instant transitions
  useEffect(() => {
    try {
      router.prefetch("/search");
    } catch {}
  }, [router]);

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

  const { banners, fetchBanners } = useBannersStore();
  const { cities, fetchLocations: fetchMasterLocations } = useLocationsStore();
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  useEffect(() => {
    fetchBanners();
    fetchMasterLocations();
  }, [fetchBanners, fetchMasterLocations]);

  // Hero cities (only those marked as isHeroPill, or fallback to first 3)
  const heroCities = useMemo(() => {
    const pills = cities.filter((c) => c.isHeroPill);
    return pills.length > 0 ? pills : cities.slice(0, 3);
  }, [cities]);

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
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isNavigating) return;

    setIsNavigating(true);

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
      const refMatch = findItemByRefId(searchQuery, properties, projects);
      if (refMatch) {
        toast.success(`🎯 Direct match for Reference ID ${refMatch.refId} (${refMatch.title})! Opening...`);
        if (refMatch.type === "project") {
          openProject(refMatch.item);
        } else {
          router.push(refMatch.url);
        }
        return;
      }
    }

    const params = new URLSearchParams();
    if (activeTab === "projects") {
      params.set("type", "projects");
    } else if (activeTab === "nearme") {
      params.set("type", "buy");
      params.set("nearMe", "true");
      params.set("view", "map");
    } else {
      params.set("type", "buy");
    }

    if (searchQuery.trim()) {
      params.set("location", searchQuery.trim());
    } else {
      params.set("focus", "search");
    }
    const isAnyMax = b[1] >= 30000000;
    if (b[0] > 1000000 || !isAnyMax) {
      params.set("budget", `${b[0]},${isAnyMax ? 100000000 : b[1]}`);
    }

    router.push(`/search?${params.toString()}`);
  };

  // Live Auto-Suggestions for Hero Search Bar
  const liveHeroSuggestions = useMemo(() => {
    const q = searchQuery.trim();
    if (!q || q.length < 2) return null;

    const directRefMatch = findItemByRefId(q, properties, projects);

    const matchingProjects = projects
      .filter((proj) => matchesProjectSearch(proj, q))
      .slice(0, 3);

    const matchingProps = properties
      .filter((prop) => matchesPropertySearch(prop, q))
      .slice(0, 3);

    return {
      directRefMatch,
      projects: matchingProjects,
      properties: matchingProps,
      hasResults: Boolean(directRefMatch) || matchingProjects.length > 0 || matchingProps.length > 0
    };
  }, [searchQuery, projects, properties]);

  const matchingCount = useMemo(() => {
    let count = 0;
    const isAnyMax = heroBudget[1] >= 30000000;
    if (activeTab !== "projects") {
      count = properties.filter((p) => {
        if (p.status === "sold" || p.status === "archived" || p.status === "hidden") return false;
        return p.price >= heroBudget[0] && (isAnyMax || p.price <= heroBudget[1]);
      }).length;
    }

    // Always count projects since all tabs (buy, nearme, projects) involve buying
    count += projects.filter((p) => {
      if (!p.configurations || p.configurations.length === 0) return false;
      return p.configurations.some((cfg) => {
        const pMin = cfg.priceMin || 0;
        const pMax = cfg.priceMax || pMin;
        return (isAnyMax || pMin <= heroBudget[1]) && pMax >= heroBudget[0];
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
    const isAnyMax = heroBudget[1] >= 30000000;

    for (const cat of homeCategories) {
      const types = CATEGORY_TYPE_MAP[cat.id];
      const propCount = activeTab === "projects" ? 0 : properties.filter((p) => {
        if (p.status === "sold" || p.status === "archived" || p.status === "hidden") return false;
        const inBudget = p.price >= heroBudget[0] && (isAnyMax || p.price <= heroBudget[1]);
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
          return (isAnyMax || pMin <= heroBudget[1]) && pMax >= heroBudget[0];
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
    return homeCategories.map((cat) => {
      let href = cat.href;
      if (cat.id === "new-listings") {
        href = "/search?type=buy&sort=newest";
      } else if (!href) {
        href = `/search?type=buy&propertyType=${cat.type}`;
      }
      return {
        id: cat.id,
        title: cat.name,
        subtitle: cat.subtitle || cat.description,
        badge: cat.badge,
        badgeClass: cat.badgeClass,
        image: cat.image,
        baseHref: href,
      };
    });
  }, [homeCategories]);

  /** Append budget params to any category href when budget is active */
  const getCatHref = (baseHref: string) => {
    if (!budgetActive) return baseHref;
    const url = new URL(baseHref, "http://x");
    const isAnyMax = heroBudget[1] >= 30000000;
    url.searchParams.set("budget", `${heroBudget[0]},${isAnyMax ? 100000000 : heroBudget[1]}`);
    return url.pathname + "?" + url.searchParams.toString();
  };

  return (
    <section className="relative w-full text-slate-900 pt-20 sm:pt-24 md:pt-28 pb-12 md:pb-16 min-h-[480px]">
      {/* Full-Width Dynamic Banners Block */}
      {banners.length > 0 && (
        <div className="relative z-10 w-full -mt-20 sm:-mt-24 md:-mt-28 mb-2 sm:mb-4 shadow-2xl h-[250px] sm:h-[350px] md:h-[430px] overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentBanner?.id || 'banner-fallback'}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0"
            >
              {/* Responsive Banner Images: Mobile image on mobile (with desktop fallback), Desktop image on desktop */}
              {(() => {
                const DEFAULT_FALLBACK = "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1920&auto=format&fit=crop";
                const desktopImg = resolveMediaUrl(currentBanner?.image_url);
                const mobileImg = resolveMediaUrl(currentBanner?.mobile_image_url) || desktopImg;
                const activeImg = mobileImg || desktopImg || DEFAULT_FALLBACK;

                return (
                  <>
                    <div className="md:hidden absolute inset-0">
                      <Image 
                        src={activeImg} 
                        alt={currentBanner?.title || 'Banner Mobile'}
                        fill
                        priority
                        unoptimized
                        sizes="100vw"
                        className="object-cover object-[center_32%]"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (desktopImg && !target.src.includes(desktopImg)) {
                            target.src = desktopImg;
                          } else if (!target.src.includes("unsplash.com")) {
                            target.src = DEFAULT_FALLBACK;
                          }
                        }}
                      />
                    </div>
                    <div className="hidden md:block absolute inset-0">
                      <Image 
                        src={desktopImg || activeImg} 
                        alt={currentBanner?.title || 'Banner Desktop'}
                        fill
                        priority
                        unoptimized
                        sizes="100vw"
                        className="object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (!target.src.includes("unsplash.com")) {
                            target.src = DEFAULT_FALLBACK;
                          }
                        }}
                      />
                    </div>
                  </>
                );
              })()}

              {/* Directional Gradient: Darker behind headline/nav, light and clear over architecture */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/25 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/20 pointer-events-none" />
              
              {/* Banner Content (SAFE IN BETWEEN ARROWS WITH GENEROUS HORIZONTAL PADDING) */}
              <div className="absolute inset-0 flex flex-col justify-center items-start text-left pt-16 sm:pt-20 md:pt-24">
                <div className="w-full max-w-7xl mx-auto px-14 sm:px-20 md:px-24">
                  {(() => {
                    const rawTitle = currentBanner?.title || "";
                    const cleanTitle = rawTitle.replace(/\bVillaments\b/gi, "Villas");
                    if (!cleanTitle) return null;
                    return (
                      <h2 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white mb-2 sm:mb-3 drop-shadow-xl max-w-[85%] sm:max-w-[70%] leading-tight tracking-tight">
                        {cleanTitle}
                      </h2>
                    );
                  })()}
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-30 flex flex-col items-center text-center">
        {/* Ambient Aurora Mesh Glow behind search bar */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-[350px] sm:w-[750px] h-[200px] bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-yellow-500/20 blur-[80px] rounded-full pointer-events-none -z-10" />

        {/* Mobile backdrop to close menu when tapping outside */}
        {(showBuyMenu || showProjectsMenu) && (
          <div 
            className="fixed inset-0 z-40 bg-transparent sm:hidden" 
            onClick={() => {
              setShowBuyMenu(false);
              setShowProjectsMenu(false);
              setActiveBuySub(null);
            }} 
          />
        )}

        {/* Realtor.com Search Options Bar */}
        <div className="flex items-center justify-center gap-2 sm:gap-8 mb-3.5 sm:mb-4.5 px-1 max-w-full relative z-50 overflow-visible">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <div 
                key={tab.id} 
                className="relative group shrink-0"
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
                  type="button"
                  onClick={() => {
                    if (tab.id === "buy") {
                      setShowBuyMenu((prev) => !prev);
                      setShowProjectsMenu(false);
                    } else if (tab.id === "projects") {
                      setShowProjectsMenu((prev) => !prev);
                      setShowBuyMenu(false);
                    } else {
                      setShowBuyMenu(false);
                      setShowProjectsMenu(false);
                    }
                    setActiveTab(tab.id);
                    if (tab.id === "new-launch") {
                      router.push("/search?type=projects&status=new-launch");
                    }
                    if (tab.id === "pre-approval") {
                      router.push("/mortgage-calculator");
                    }
                    if (tab.id === "nearme") {
                      if (typeof window === "undefined" || !navigator.geolocation) {
                        toast.error("Geolocation is not supported by your browser. Showing map.");
                        router.push("/search?view=map");
                        return;
                      }
                      setIsLocating(true);
                      navigator.geolocation.getCurrentPosition(
                        (pos) => {
                          setIsLocating(false);
                          router.push(`/search?nearMe=true&view=map&lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`);
                        },
                        (err) => {
                          setIsLocating(false);
                          if (err.code === err.PERMISSION_DENIED) {
                            toast.error("Location permission denied. Showing all listings near AP.");
                          } else if (err.code === err.TIMEOUT) {
                            toast.error("Location request timed out. Showing all listings.");
                          } else {
                            toast.error("Location unavailable. Showing all listings.");
                          }
                          router.push("/search?view=map");
                        },
                        { timeout: 8000 }
                      );
                    }
                  }}
                  className={cn(
                    "relative py-1.5 text-[13px] xs:text-sm sm:text-lg font-extrabold transition-all cursor-pointer flex items-center gap-1 sm:gap-1.5 whitespace-nowrap px-1.5 sm:px-2",
                    isActive
                      ? "text-slate-900"
                      : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  {tab.label}
                  {tab.id === "buy" && (
                    <ChevronDown className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4 opacity-50 transition-transform duration-200", showBuyMenu && "rotate-180")} />
                  )}
                  {tab.id === "projects" && (
                    <ChevronDown className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4 opacity-50 transition-transform duration-200", showProjectsMenu && "rotate-180")} />
                  )}
                  {isActive && (
                    <motion.div
                      layoutId="realtorTabLine"
                      className="absolute bottom-0 left-0 right-0 h-0.5 sm:h-1 bg-slate-900 rounded-full shadow-md"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                </button>

                {tab.id === "buy" && (
                  <div 
                    onMouseLeave={() => {
                      setActiveBuySub(null);
                    }}
                    className={cn(
                      "absolute top-full left-0 sm:left-1/2 sm:-translate-x-1/2 pt-2 w-52 sm:w-56 transition-all duration-200 z-[100]",
                      showBuyMenu ? "opacity-100 visible pointer-events-auto" : "opacity-0 invisible pointer-events-none"
                    )}
                  >
                    <div className="bg-slate-950 text-white border border-slate-800 rounded-2xl shadow-2xl overflow-visible py-2 text-left relative">
                      {/* 1. Flats */}
                      <div 
                        className="relative group"
                        onMouseEnter={() => setActiveBuySub("flats")}
                      >
                        <button
                          type="button"
                          onClick={() => setActiveBuySub(activeBuySub === "flats" ? null : "flats")}
                          className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-bold text-slate-200 hover:bg-slate-900 hover:text-amber-400 transition-colors text-left cursor-pointer"
                        >
                          <span>Flats</span>
                          <ChevronRight className={cn("w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-transform", activeBuySub === "flats" && "rotate-90 sm:rotate-0 text-amber-400")} />
                        </button>
                        
                        {/* Flats Submenu */}
                        {activeBuySub === "flats" && (
                          <div className="sm:absolute sm:left-full sm:top-0 sm:ml-1.5 sm:w-44 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 mx-2 sm:mx-0 my-1 sm:my-0 space-y-0.5">
                            <Link 
                              href="/search?type=buy&propertyType=apartment&saleType=new" 
                              onClick={() => { setShowBuyMenu(false); setActiveBuySub(null); }}
                              className="block px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800 hover:text-amber-400 rounded-lg mx-1 transition-colors"
                            >
                              New Flats
                            </Link>
                            <Link 
                              href="/search?type=buy&propertyType=apartment&saleType=resale" 
                              onClick={() => { setShowBuyMenu(false); setActiveBuySub(null); }}
                              className="block px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800 hover:text-amber-400 rounded-lg mx-1 transition-colors"
                            >
                              Resale Flats
                            </Link>
                            <div className="h-px bg-slate-800 my-1 mx-2" />
                            <Link 
                              href="/search?type=buy&propertyType=apartment" 
                              onClick={() => { setShowBuyMenu(false); setActiveBuySub(null); }}
                              className="block px-3.5 py-1.5 text-[11px] font-medium text-slate-400 hover:bg-slate-800 hover:text-white rounded-lg mx-1 transition-colors"
                            >
                              All Flats
                            </Link>
                          </div>
                        )}
                      </div>

                      {/* 2. Houses */}
                      <div 
                        className="relative group"
                        onMouseEnter={() => setActiveBuySub("houses")}
                      >
                        <button
                          type="button"
                          onClick={() => setActiveBuySub(activeBuySub === "houses" ? null : "houses")}
                          className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-bold text-slate-200 hover:bg-slate-900 hover:text-amber-400 transition-colors text-left cursor-pointer"
                        >
                          <span>Houses</span>
                          <ChevronRight className={cn("w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-transform", activeBuySub === "houses" && "rotate-90 sm:rotate-0 text-amber-400")} />
                        </button>
                        
                        {/* Houses Submenu */}
                        {activeBuySub === "houses" && (
                          <div className="sm:absolute sm:left-full sm:top-0 sm:ml-1.5 sm:w-44 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 mx-2 sm:mx-0 my-1 sm:my-0 space-y-0.5">
                            <Link 
                              href="/search?type=buy&propertyType=independent-house&saleType=new" 
                              onClick={() => { setShowBuyMenu(false); setActiveBuySub(null); }}
                              className="block px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800 hover:text-amber-400 rounded-lg mx-1 transition-colors"
                            >
                              New Houses
                            </Link>
                            <Link 
                              href="/search?type=buy&propertyType=independent-house&saleType=resale" 
                              onClick={() => { setShowBuyMenu(false); setActiveBuySub(null); }}
                              className="block px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800 hover:text-amber-400 rounded-lg mx-1 transition-colors"
                            >
                              Resale Houses
                            </Link>
                            <div className="h-px bg-slate-800 my-1 mx-2" />
                            <Link 
                              href="/search?type=buy&propertyType=independent-house" 
                              onClick={() => { setShowBuyMenu(false); setActiveBuySub(null); }}
                              className="block px-3.5 py-1.5 text-[11px] font-medium text-slate-400 hover:bg-slate-800 hover:text-white rounded-lg mx-1 transition-colors"
                            >
                              All Houses
                            </Link>
                          </div>
                        )}
                      </div>

                      {/* 3. Villas */}
                      <div 
                        className="relative group"
                        onMouseEnter={() => setActiveBuySub("villas")}
                      >
                        <button
                          type="button"
                          onClick={() => setActiveBuySub(activeBuySub === "villas" ? null : "villas")}
                          className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-bold text-slate-200 hover:bg-slate-900 hover:text-amber-400 transition-colors text-left cursor-pointer"
                        >
                          <span>Villas</span>
                          <ChevronRight className={cn("w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-transform", activeBuySub === "villas" && "rotate-90 sm:rotate-0 text-amber-400")} />
                        </button>
                        
                        {/* Villas Submenu */}
                        {activeBuySub === "villas" && (
                          <div className="sm:absolute sm:left-full sm:top-0 sm:ml-1.5 sm:w-44 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 mx-2 sm:mx-0 my-1 sm:my-0 space-y-0.5">
                            <Link 
                              href="/search?type=buy&propertyType=villa&saleType=new" 
                              onClick={() => { setShowBuyMenu(false); setActiveBuySub(null); }}
                              className="block px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800 hover:text-amber-400 rounded-lg mx-1 transition-colors"
                            >
                              New Villas
                            </Link>
                            <Link 
                              href="/search?type=buy&propertyType=villa&saleType=resale" 
                              onClick={() => { setShowBuyMenu(false); setActiveBuySub(null); }}
                              className="block px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800 hover:text-amber-400 rounded-lg mx-1 transition-colors"
                            >
                              Resale Villas
                            </Link>
                            <div className="h-px bg-slate-800 my-1 mx-2" />
                            <Link 
                              href="/search?type=buy&propertyType=villa" 
                              onClick={() => { setShowBuyMenu(false); setActiveBuySub(null); }}
                              className="block px-3.5 py-1.5 text-[11px] font-medium text-slate-400 hover:bg-slate-800 hover:text-white rounded-lg mx-1 transition-colors"
                            >
                              All Villas
                            </Link>
                          </div>
                        )}
                      </div>

                      {/* 4. Plots */}
                      <Link 
                        href="/search?type=buy&propertyType=residential-plot" 
                        onClick={() => { setShowBuyMenu(false); setActiveBuySub(null); }}
                        className="block px-4 py-2.5 text-sm font-bold text-slate-200 hover:bg-slate-900 hover:text-amber-400 transition-colors"
                      >
                        Plots
                      </Link>

                      {/* 5. Agriculture */}
                      <Link 
                        href="/search?type=buy&propertyType=agricultural-land" 
                        onClick={() => { setShowBuyMenu(false); setActiveBuySub(null); }}
                        className="block px-4 py-2.5 text-sm font-bold text-slate-200 hover:bg-slate-900 hover:text-amber-400 transition-colors"
                      >
                        Agriculture
                      </Link>
                    </div>
                  </div>
                )}
                
                {tab.id === "projects" && (
                  <div className={cn(
                    "absolute top-full left-0 sm:left-1/2 sm:-translate-x-1/2 pt-2 w-48 sm:w-52 transition-all duration-200 z-[100]",
                    showProjectsMenu ? "opacity-100 visible pointer-events-auto" : "opacity-0 invisible pointer-events-none"
                  )}>
                    <div className="bg-slate-950 text-white border border-slate-800 rounded-2xl shadow-2xl overflow-hidden py-2 text-left">
                      <Link href="/search?type=projects&propertyType=apartment" onClick={() => setShowProjectsMenu(false)} className="block px-4 py-2 text-sm font-bold text-slate-300 hover:bg-slate-900 hover:text-amber-400">
                        Apartments
                      </Link>
                      <Link href="/search?type=projects&propertyType=villa" onClick={() => setShowProjectsMenu(false)} className="block px-4 py-2 text-sm font-bold text-slate-300 hover:bg-slate-900 hover:text-amber-400">
                        Villas
                      </Link>
                      <Link href="/search?type=projects&propertyType=venture" onClick={() => setShowProjectsMenu(false)} className="block px-4 py-2 text-sm font-bold text-slate-300 hover:bg-slate-900 hover:text-amber-400">
                        CRDA Ventures
                      </Link>
                      <Link href="/search?type=projects" onClick={() => setShowProjectsMenu(false)} className="block px-4 py-2 text-sm font-bold text-amber-400 hover:bg-slate-900 hover:text-amber-300 border-t border-slate-800 mt-1 pt-3">
                        View All Projects →
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Clean Modern Search Input Bar (Rectangular with subtle rounded edges & voice search) */}
        <form
          action="#"
          method="POST"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleSearchSubmit(e);
          }}
          className="relative w-full max-w-[760px] h-[52px] sm:h-[58px] mx-auto flex items-center bg-white border border-slate-200/90 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20 rounded-xl sm:rounded-2xl px-4 shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.1)] transition-all duration-200 group z-30"
        >
          {/* Left: Outline Search Icon */}
          <Search className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-slate-500 mr-3 shrink-0 pointer-events-none group-hover:text-slate-800 transition-colors stroke-[2]" />

          {/* Input text wrapper */}
          <div className="relative flex-1 min-w-0 h-full flex items-center">
            {/* Animated placeholder overlay - shown only when searchQuery is empty */}
            {!searchQuery && (
              <div className="absolute inset-0 flex items-center pointer-events-none overflow-hidden text-left">
                <span className="text-sm sm:text-base text-slate-400 font-medium truncate select-none flex items-center w-full">
                  <span>Search &ldquo;{typedText}&rdquo;</span>
                  <span className="inline-block w-[2px] h-[16px] sm:h-[18px] bg-slate-400 ml-1 animate-pulse" />
                </span>
              </div>
            )}

            {/* Single Stable Interactive Input Element (No name attribute) */}
            <input
              ref={inputRef}
              type="text"
              id="hero-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSearchSubmit();
                }
              }}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setTimeout(() => setIsFocused(false), 200)}
              autoComplete="off"
              aria-label="Search properties and projects"
              style={{ outline: "none", boxShadow: "none", border: "none" }}
              className="w-full h-full bg-transparent text-sm sm:text-base text-slate-900 placeholder-transparent font-medium border-none outline-none focus:outline-none focus:ring-0 shadow-none px-0 relative z-10"
            />
          </div>

          {/* Clear button if searchQuery is not empty */}
          {searchQuery && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSearchQuery("");
                inputRef.current?.focus();
              }}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 mr-1 cursor-pointer"
              aria-label="Clear search query"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Right: Search Action Icon */}
          <button
            type="submit"
            disabled={isNavigating}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSearchSubmit(e);
            }}
            aria-label="Search properties"
            title="Search"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-[#f59e0b] hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-all active:scale-90 cursor-pointer shrink-0 ml-1"
          >
            {isNavigating ? (
              <Loader2 className="w-5 h-5 sm:w-5.5 sm:h-5.5 animate-spin text-[#f59e0b]" />
            ) : (
              <Search className="w-5 h-5 sm:w-5.5 sm:h-5.5 stroke-[2.5]" />
            )}
          </button>

          {/* LIVE AUTO-SUGGESTIONS POPUP */}
          {isFocused && liveHeroSuggestions && liveHeroSuggestions.hasResults && (
            <div
              onMouseDown={(e) => e.preventDefault()}
              className="absolute left-0 right-0 top-full mt-2 z-[100] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 text-left animate-in fade-in zoom-in-95"
            >
              {/* Direct Ref ID Match Card */}
              {liveHeroSuggestions.directRefMatch && (
                <div
                  onClick={(e) => {
                    setIsFocused(false);
                    const match = liveHeroSuggestions.directRefMatch!;
                    if (match.type === "project") {
                      openProject(match.item, e);
                    } else {
                      router.push(match.url);
                    }
                  }}
                  className="px-4 py-3 bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent hover:from-amber-500/30 cursor-pointer flex items-center justify-between gap-3 border-b border-amber-500/30 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-black text-xs tracking-wider shadow-xs shrink-0">
                      🎯 {liveHeroSuggestions.directRefMatch.refId}
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                        {liveHeroSuggestions.directRefMatch.title}
                      </span>
                      <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                        Exact Ref Match • Tap to Open Directly
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-amber-500 shrink-0" />
                </div>
              )}

              {/* Search All button */}
              <button
                type="button"
                onClick={() => handleSearchSubmit()}
                className="w-full text-left px-4 py-2.5 hover:bg-amber-500/10 flex items-center gap-3 transition-colors text-xs font-bold text-amber-600 dark:text-amber-400"
              >
                <Search className="w-4 h-4 shrink-0 text-amber-500" />
                <span className="truncate">Search all for &ldquo;<strong>{searchQuery}</strong>&rdquo;</span>
              </button>

              {/* Projects suggestions */}
              {liveHeroSuggestions.projects.length > 0 && (
                <div className="p-2">
                  <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Builder Projects
                  </div>
                  {liveHeroSuggestions.projects.map((p) => (
                    <div
                      key={`hero-proj-${p.id}`}
                      onClick={(e) => {
                        setIsFocused(false);
                        openProject(p, e);
                      }}
                      className="px-2.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-xl cursor-pointer flex items-center justify-between gap-2 transition-colors group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold shrink-0">Project</span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">{p.name}</span>
                        <span className="text-[11px] text-slate-400 truncate">({p.location?.locality || p.location?.city})</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </div>
                  ))}
                </div>
              )}

              {/* Properties suggestions */}
              {liveHeroSuggestions.properties.length > 0 && (
                <div className="p-2">
                  <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Properties
                  </div>
                  {liveHeroSuggestions.properties.map((p) => (
                    <div
                      key={`hero-prop-${p.id}`}
                      onClick={() => {
                        setIsFocused(false);
                        router.push(`/properties/${p.slug || p.id}`);
                      }}
                      className="px-2.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-xl cursor-pointer flex items-center justify-between gap-2 transition-colors group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold shrink-0">Property</span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">{p.title}</span>
                        <span className="text-[11px] text-slate-400 truncate">({p.location?.locality || p.location?.city})</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </form>

        {/* Dynamic Location Pills from Admin Master Locations */}
        <div className="w-full max-w-[760px] mx-auto mt-2.5 sm:mt-4 text-left relative z-30">
          <div 
            className={cn(
              "grid gap-1.5 sm:gap-3 w-full pb-1 mb-1.5 sm:mb-2.5",
              heroCities.length === 1 ? "grid-cols-1" :
              heroCities.length === 2 ? "grid-cols-2" :
              heroCities.length === 3 ? "grid-cols-3" :
              "grid-cols-2 sm:grid-cols-4"
            )}
          >
            {heroCities.map((city) => {
              const isOpen = openLocationTab === city.id;
              const hasSublocations = city.sublocations && city.sublocations.length > 0;

              return (
                <button
                  key={city.id}
                  type="button"
                  onClick={() => {
                    if (hasSublocations) {
                      setOpenLocationTab(isOpen ? null : city.id);
                      setSublocationSearch("");
                    } else {
                      router.push(`/search?type=${activeTab}&location=${encodeURIComponent(city.name)}`);
                    }
                  }}
                  className={cn(
                    "h-[34px] sm:h-[40px] px-2 sm:px-3.5 rounded-full text-[11px] sm:text-xs flex items-center justify-center gap-1 sm:gap-1.5 transition-all duration-200 cursor-pointer shadow-2xs border w-full text-center whitespace-nowrap",
                    isOpen
                      ? "bg-slate-950 border-amber-400 text-white font-extrabold shadow-md ring-2 ring-amber-500/20"
                      : "bg-slate-900/90 hover:bg-slate-900 border-slate-700/60 text-slate-100 font-semibold"
                  )}
                >
                  <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 shrink-0" />
                  <span className="whitespace-nowrap tracking-tight">{city.name}</span>
                  {hasSublocations && (
                    <ChevronDown className={cn("w-2.5 h-2.5 sm:w-3 sm:h-3 transition-transform shrink-0", isOpen && "rotate-180")} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Centered Sublocations Dropdown for whichever City is tapped */}
          <AnimatePresence>
            {(() => {
              const activeCity = heroCities.find((c) => c.id === openLocationTab);
              if (!activeCity || !activeCity.sublocations || activeCity.sublocations.length === 0) return null;

              const filteredSublocations = activeCity.sublocations.filter((sub) => {
                const q = sublocationSearch.trim().toLowerCase();
                if (!q) return true;
                return (
                  sub.name.toLowerCase().includes(q) ||
                  (sub.tagline && sub.tagline.toLowerCase().includes(q))
                );
              });

              return (
                <>
                  {/* Click-outside dismissal backdrop (Desktop only) */}
                  <div 
                    className="hidden sm:block fixed inset-0 z-[95]" 
                    onClick={() => {
                      setOpenLocationTab(null);
                      setSublocationSearch("");
                    }} 
                  />

                  <motion.div
                    key={activeCity.id}
                    initial={{ opacity: 0, height: 0, y: -4 }}
                    animate={{ opacity: 1, height: "auto", y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -4 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="relative w-full mt-2 sm:absolute sm:top-full sm:mt-1.5 sm:left-1/2 sm:-translate-x-1/2 sm:w-[92vw] sm:max-w-[360px] bg-slate-950/98 backdrop-blur-2xl border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-[100] max-h-[380px] flex flex-col"
                  >
                    {/* Header */}
                    <div className="px-4 py-2.5 border-b border-slate-800/80 text-[11px] uppercase font-black tracking-wider text-amber-400 flex items-center justify-between gap-3 sticky top-0 bg-slate-950 z-10 shrink-0">
                      <span className="whitespace-nowrap flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-amber-400" />
                        {activeCity.name} Localities
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 font-medium text-[10px] whitespace-nowrap lowercase">
                          {filteredSublocations.length === activeCity.sublocations.length
                            ? `${activeCity.sublocations.length} areas`
                            : `${filteredSublocations.length} of ${activeCity.sublocations.length}`}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setOpenLocationTab(null);
                            setSublocationSearch("");
                          }}
                          className="w-6 h-6 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 active:scale-90 shadow-2xs"
                          aria-label="Close"
                        >
                          <X className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                      </div>
                    </div>

                    {/* Search Bar */}
                    <div className="p-2 border-b border-slate-800/60 bg-slate-950/95 shrink-0">
                      <div className="relative flex items-center bg-slate-900 border border-slate-800 focus-within:border-amber-400/80 rounded-xl px-2.5 py-1.5 transition-colors">
                        <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-2" />
                        <input
                          type="text"
                          value={sublocationSearch}
                          onChange={(e) => setSublocationSearch(e.target.value)}
                          placeholder={`Search ${activeCity.name} localities...`}
                          className="w-full bg-transparent text-xs text-white placeholder-slate-500 font-medium outline-none border-none p-0 focus:ring-0"
                          autoFocus
                        />
                        {sublocationSearch && (
                          <button
                            type="button"
                            onClick={() => setSublocationSearch("")}
                            className="p-0.5 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors shrink-0 cursor-pointer ml-1"
                            aria-label="Clear sublocation search"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Localities List */}
                    <div className="overflow-y-auto divide-y divide-slate-900/60 no-scrollbar flex-1 py-1">
                      {filteredSublocations.length > 0 ? (
                        filteredSublocations.map((sub) => (
                          <div
                            key={sub.id}
                            onClick={() => {
                              setOpenLocationTab(null);
                              setSublocationSearch("");
                              router.push(
                                `/search?type=${activeTab}&location=${encodeURIComponent(
                                  activeCity.name
                                )}&locality=${encodeURIComponent(sub.name)}`
                              );
                            }}
                            className="px-4 py-2.5 hover:bg-slate-900/90 cursor-pointer flex flex-col transition-colors group"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-bold text-xs text-white group-hover:text-amber-400 transition-colors whitespace-nowrap">
                                {sub.name}
                              </span>
                            </div>
                            {sub.tagline && (
                              <span className="text-[10px] text-slate-400 block mt-0.5 whitespace-nowrap">
                                {sub.tagline}
                              </span>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="py-6 px-4 text-center">
                          <p className="text-xs text-slate-400 font-medium mb-2.5">
                            No localities found for &ldquo;{sublocationSearch}&rdquo;
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              const term = sublocationSearch;
                              setOpenLocationTab(null);
                              setSublocationSearch("");
                              router.push(
                                `/search?type=${activeTab}&location=${encodeURIComponent(
                                  activeCity.name
                                )}&locality=${encodeURIComponent(term)}`
                              );
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-[11px] font-bold transition-colors cursor-pointer"
                          >
                            <Search className="w-3 h-3 text-amber-400" />
                            <span>Search &ldquo;{sublocationSearch}&rdquo; in {activeCity.name}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </>
              );
            })()}
          </AnimatePresence>
        </div>

        {/* ── Budget Filter Card (Compact & Modern Design) ── */}
        <div className="relative z-20 w-full max-w-[760px] mx-auto mt-2 sm:mt-3 text-left">
          <div className="bg-white/95 backdrop-blur-sm border border-slate-200/80 rounded-2xl p-2.5 sm:p-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.05)] space-y-2 sm:space-y-2.5">
            
            {/* Row 1: BUDGET: [ ₹ 10 L ⌄ ] TO [ Any Price ⌄ ] */}
            <div className="flex items-center gap-2 sm:gap-2.5">
              <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider shrink-0">
                BUDGET:
              </span>
              
              <ModernBudgetDropdown
                value={heroBudget[0]}
                options={HERO_BUDGET_MIN_OPTS}
                onChange={(val) => setHeroBudget([val, Math.max(val, heroBudget[1])])}
                placeholder="Min Price"
              />

              <span className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider shrink-0">TO</span>

              <ModernBudgetDropdown
                value={heroBudget[1]}
                options={HERO_BUDGET_MAX_OPTS}
                onChange={(val) => setHeroBudget([Math.min(heroBudget[0], val), val])}
                placeholder="Any Price"
                align="right"
                isMax
              />
            </div>

            {/* Row 2: Range Slider (Teal Accent Track with Refined Knobs) */}
            <div className="px-1 py-0.5">
              <style>{`
                .budget-slider [role="slider"] {
                  background: #0f172a !important;
                  border: 2px solid #ffffff !important;
                  box-shadow: 0 1px 5px rgba(15, 23, 42, 0.35);
                  width: 14px !important;
                  height: 14px !important;
                  transition: transform 0.15s ease;
                }
                .budget-slider [role="slider"]:hover {
                  transform: scale(1.2);
                }
                .budget-slider [data-orientation="horizontal"] .radix-slider-track {
                  height: 4px !important;
                  border-radius: 9999px;
                  background: #e2e8f0;
                }
                .budget-slider [data-orientation="horizontal"] .radix-slider-range {
                  background: #0d9488 !important;
                }
              `}</style>
              <Slider
                min={1000000}
                max={30000000}
                step={500000}
                value={heroBudget}
                onValueChange={(val) => setHeroBudget(val as [number, number])}
                className="w-full budget-slider cursor-pointer"
              />
            </div>

            {/* Row 3: Compact Apply Button */}
            <button
              type="button"
              onClick={() => handleSearchSubmit()}
              className="w-full h-8 sm:h-9 bg-slate-950 hover:bg-slate-900 text-white font-extrabold text-xs rounded-full flex items-center justify-center gap-1.5 shadow-sm hover:shadow-md transition-all active:scale-98 cursor-pointer"
            >
              <span>Apply</span>
              <span className="px-1.5 py-0.2 min-w-[18px] h-[18px] rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[10px] font-black shadow-2xs">
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

          {/* Category cards grid: 4 cards initially on mobile, all on desktop */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {browseCategories.map((cat, idx) => {
              const isHiddenOnMobile = !showAllCategoriesMobile && idx >= 4;

              return (
                <Link
                  key={cat.id}
                  href={cat.baseHref}
                  className={cn(
                    "group relative h-40 sm:h-52 rounded-2xl overflow-hidden shadow-md bg-slate-950 border border-white/15 hover:border-white/40 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300",
                    isHiddenOnMobile ? "hidden sm:block" : "block"
                  )}
                >
                  <Image
                    src={cat.image}
                    alt={cat.title}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-108 opacity-95 group-hover:opacity-100"
                  />
                  {/* Clean deep gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent transition-opacity duration-300" />

                  {/* Luxury Monochromatic Badge (top-right) */}
                  {cat.badge && (
                    <div className="absolute top-3 right-3 text-[11px] font-bold px-3 py-1 rounded-full bg-white text-slate-900 shadow-md border border-slate-200/80 backdrop-blur-md tracking-tight">
                      {cat.badge}
                    </div>
                  )}

                  {/* Bottom info: Crisp white typography */}
                  <div className="absolute bottom-3 left-3 right-3">
                    <span className="font-heading font-extrabold text-base sm:text-lg block leading-snug text-white group-hover:translate-x-0.5 transition-transform drop-shadow-sm">
                      {cat.title}
                    </span>
                    <span className="text-[11px] text-slate-200/90 block line-clamp-1 mt-0.5 font-medium">
                      {cat.subtitle}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Mobile View All Categories Expand Button */}
          <div className="sm:hidden pt-1 pb-4">
            <button
              type="button"
              onClick={() => setShowAllCategoriesMobile(!showAllCategoriesMobile)}
              className="w-full py-3 px-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-400 text-slate-900 dark:text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-98 cursor-pointer"
            >
              <span>{showAllCategoriesMobile ? "Show Less" : "Click to View All Categories"}</span>
              <ChevronDown className={cn("w-4 h-4 text-amber-500 transition-transform duration-300", showAllCategoriesMobile && "rotate-180")} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
