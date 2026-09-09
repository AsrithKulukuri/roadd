"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
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
  Home,
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
  RotateCcw,
} from "lucide-react";
import { HOME_SECTION_ICONS } from "@/lib/home-section-icons";
import { cn, formatINR, formatINRWords, formatPriceCompact } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { usePropertiesStore } from "@/stores/properties-store";
import { useProjectsStore } from "@/stores/projects-store";
import { useContentStore, DEFAULT_DESKTOP_SEARCH_PHRASES, DEFAULT_MOBILE_SEARCH_PHRASES } from "@/stores/content-store";
import { useBannersStore } from "@/stores/banners-store";
import { useLocationsStore } from "@/stores/locations-store";
import { resolveMediaUrl } from "@/lib/aws/storage-utils";
import { findItemByRefId, getRefId } from "@/lib/ref-id";
import { matchesPropertySearch, matchesProjectSearch } from "@/lib/search-engine";
import { toast } from "sonner";
import { ModernBudgetDropdown } from "@/components/ui/modern-budget-dropdown";
import { useProjectOpenGuard } from "@/hooks/useProjectOpenGuard";
import { SolidMapPin, SolidSearch } from "@/components/ui/solid-icons";

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
  { label: "₹ 5 Cr", value: 50000000 },
  { label: "₹ 10 Cr", value: 100000000 },
];

const HERO_BUDGET_MAX_OPTS = [
  { label: "Any Price", value: 500000000 },
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
  { label: "₹ 5 Cr", value: 50000000 },
  { label: "₹ 10 Cr", value: 100000000 },
];

// Search Tabs: Buy, Projects, New Launches and Map View
const tabs = [
  { id: "buy", label: "Buy" },
  { id: "projects", label: "Projects" },
  { id: "new-launch", label: "New Launches" },
  { id: "map", label: "Map View" },
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
  { label: "Gated Community Villas", propertyType: ["villa"], gatedCommunity: true },
  { label: "Ready to Move", availability: ["ready"] },
  { label: "Residential Plots", propertyType: ["residential-land"] },
  { label: "Owner Listings", postedBy: ["owner"] },
];

const getCategoryIcon = (id: string, name: string, iconName?: string) => {
  if (iconName && (HOME_SECTION_ICONS as Record<string, any>)[iconName]) {
    return (HOME_SECTION_ICONS as Record<string, any>)[iconName];
  }
  const lower = (id + " " + name).toLowerCase();
  if (lower.includes("apartment") || lower.includes("flat") || lower.includes("floor")) return Building2;
  if (lower.includes("project") || lower.includes("listing")) return Building2;
  if (lower.includes("villa") || lower.includes("house") || lower.includes("individual") || lower.includes("home")) return Home;
  if (lower.includes("resale")) return RotateCcw;
  if (lower.includes("plot") || lower.includes("land") || lower.includes("farm")) return Trees;
  return Home;
};

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
  const [isLocalityFocused, setIsLocalityFocused] = useState(false);
  const [showBudgetDropdown, setShowBudgetDropdown] = useState(false);
  const [showAllCategoriesMobile, setShowAllCategoriesMobile] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [heroBudget, setHeroBudget] = useState<[number, number]>([1000000, 500000000]);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Prefetch search route for instant transitions
  useEffect(() => {
    try {
      router.prefetch("/search");
    } catch { }
  }, [router]);

  const scrollToTopElement = (el: HTMLElement | null, offset = 65) => {
    if (!el || typeof window === "undefined") return;
    const rect = el.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const targetY = rect.top + scrollTop - offset;
    window.scrollTo({
      top: Math.max(0, targetY),
      behavior: "smooth",
    });
  };

  // ── Typewriter / Typing Effect State & Logic (Connected to Admin Content Store) ──
  const {
    searchTypewriterPhrasesDesktop,
    searchTypewriterPhrasesMobile,
    searchTypewriterSpeed,
    searchTypewriterPause,
    searchTypewriterTextColor,
    searchPhrasesConfigured,
    fetchCategories,
    fetchSearchPhrases,
  } = useContentStore();
  const isLightTypewriter = searchTypewriterTextColor === "light";
  const [typedText, setTypedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [loopNum, setLoopNum] = useState(0);
  const [isMobileScreen, setIsMobileScreen] = useState(false);

  useEffect(() => {
    fetchSearchPhrases?.();
  }, [fetchSearchPhrases]);

  useEffect(() => {
    const checkMobile = () => setIsMobileScreen(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const activeSuggestions = useMemo(() => {
    if (isMobileScreen) {
      if (searchPhrasesConfigured || Array.isArray(searchTypewriterPhrasesMobile)) {
        return searchTypewriterPhrasesMobile || [];
      }
      return DEFAULT_MOBILE_SEARCH_PHRASES;
    }
    if (searchPhrasesConfigured || Array.isArray(searchTypewriterPhrasesDesktop)) {
      return searchTypewriterPhrasesDesktop || [];
    }
    return DEFAULT_DESKTOP_SEARCH_PHRASES;
  }, [isMobileScreen, searchTypewriterPhrasesDesktop, searchTypewriterPhrasesMobile, searchPhrasesConfigured]);

  useEffect(() => {
    if (!activeSuggestions || activeSuggestions.length === 0) {
      setTypedText("");
      return;
    }

    const currentPhrase = activeSuggestions[loopNum % activeSuggestions.length] || "";
    const forwardSpeed = Math.max(30, searchTypewriterSpeed || 60);
    const pauseTime = Math.max(1000, searchTypewriterPause || 2200);

    // If only 1 phrase and it has finished typing, stay resting calmly without deleting and retyping
    if (activeSuggestions.length === 1 && typedText === currentPhrase && !isDeleting) {
      return;
    }

    let timer: NodeJS.Timeout;

    if (!isDeleting) {
      // FORWARD TYPING
      if (typedText.length < currentPhrase.length) {
        timer = setTimeout(() => {
          setTypedText(currentPhrase.slice(0, typedText.length + 1));
        }, forwardSpeed);
      } else {
        // Entire sentence typed: Hold for the configured pauseTime
        timer = setTimeout(() => {
          if (activeSuggestions.length > 1) {
            setIsDeleting(true);
          }
        }, pauseTime);
      }
    } else {
      // SMOOTH BACKSPACING
      if (typedText.length > 0) {
        // Delete smoothly: 1 char at a time, or 2 chars when deleting long middle text
        const step = currentPhrase.length > 35 && typedText.length > 8 ? 2 : 1;
        const deleteDelay = Math.max(25, Math.round(forwardSpeed * 0.48));
        timer = setTimeout(() => {
          setTypedText(currentPhrase.slice(0, Math.max(0, typedText.length - step)));
        }, deleteDelay);
      } else {
        // Finished erasing: short natural breath before typing next sentence
        timer = setTimeout(() => {
          setIsDeleting(false);
          setLoopNum((prev) => (prev + 1) % activeSuggestions.length);
        }, 320);
      }
    }

    return () => clearTimeout(timer);
  }, [typedText, isDeleting, loopNum, activeSuggestions, searchTypewriterSpeed, searchTypewriterPause]);

  const { banners, fetchBanners } = useBannersStore();
  const { cities, fetchLocations: fetchMasterLocations } = useLocationsStore();
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  useEffect(() => {
    fetchBanners();
    fetchMasterLocations();
    fetchCategories();
  }, [fetchBanners, fetchMasterLocations, fetchCategories]);

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
    } else if (activeTab === "new-launch") {
      params.set("type", "projects");
      params.set("status", "new-launch");
    } else if (activeTab === "map" || activeTab === "nearme") {
      params.set("type", "buy");
      params.set("view", "map");
    } else {
      params.set("type", "buy");
    }

    if (searchQuery.trim()) {
      params.set("location", searchQuery.trim());
    } else {
      params.set("focus", "search");
    }
    const isAnyMax = b[1] >= 500000000;
    if (b[0] > 1000000 || !isAnyMax) {
      params.set("budget", `${b[0]},${isAnyMax ? 1000000000 : b[1]}`);
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
    const isAnyMax = heroBudget[1] >= 500000000;
    if (activeTab !== "projects") {
      count = properties.filter((p) => {
        if (p.status === "sold" || p.status === "archived" || p.status === "hidden") return false;
        return p.price >= heroBudget[0] && (isAnyMax || p.price <= heroBudget[1]);
      }).length;
    }

    // Always count projects since all tabs (buy, nearme, projects) involve buying
    count += projects.filter((p) => {
      if (p.isSoldOut || p.isPublished === false) return false;
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
  const budgetActive = heroBudget[0] > 1000000 || heroBudget[1] < 500000000;

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -270, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 270, behavior: "smooth" });
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
    const isAnyMax = heroBudget[1] >= 500000000;

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
        href = "/search?type=buy&propertyType=apartment";
      } else if (!href) {
        href = `/search?type=buy&propertyType=${cat.type}`;
      }

      let title = cat.name;
      let subtitle = cat.subtitle || cat.description;
      let badge = cat.badge;

      // Exact title & subtitle normalization to match reference screenshot
      if (cat.id === "new-listings" && (title === "New Listings" || !title)) {
        title = "Apartments";
        subtitle = "Modern living spaces";
        badge = badge || "Last 30 days";
      } else if (cat.id === "new-apartments" && (title === "New Apartments" || !title)) {
        title = "New Projects";
        subtitle = "Launches & upcoming";
      } else if (cat.id === "new-villas" && (title === "New Villas" || !title)) {
        title = "Villas";
        subtitle = "Ultra-luxury homes";
        badge = badge || "Premium";
      } else if (cat.id === "individual" && (title === "Individual Homes" || !title)) {
        title = "Independent Houses";
        subtitle = "Your own space";
      }

      return {
        id: cat.id,
        title,
        subtitle,
        badge,
        badgeClass: cat.badgeClass,
        image: cat.image,
        baseHref: href,
        icon: cat.icon,
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
    <section id="home-hero-section" className="relative w-full text-slate-900 pb-2 sm:pb-4 min-h-[480px]">
      <h1 className="sr-only">Verified properties and new projects in Vijayawada, Guntur and Amaravati</h1>

      {/* ── MOBILE VIEW: Exact Previous Mobile UI (Banner on Top, Search Box & Filters Below) ── */}
      <div id="hero-banner-mobile" className="sm:hidden w-full pb-3">
        {/* Full-Width Dynamic Banner on Mobile */}
        {banners.length > 0 && (
          <div className="relative z-10 w-full mb-3 shadow-md h-[240px] overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentBanner?.id || 'banner-fallback-mobile'}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0"
              >
                {(() => {
                  const DEFAULT_FALLBACK = "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1920&auto=format&fit=crop";
                  const desktopImg = resolveMediaUrl(currentBanner?.image_url);
                  const mobileImg = resolveMediaUrl(currentBanner?.mobile_image_url) || desktopImg;
                  const activeImg = mobileImg || desktopImg || DEFAULT_FALLBACK;

                  return (
                    <div className="absolute inset-0">
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
                          if (!target.src.includes("unsplash.com")) {
                            target.src = DEFAULT_FALLBACK;
                          }
                        }}
                      />
                    </div>
                  );
                })()}

                {/* Directional Gradients */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/35 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/25 pointer-events-none" />

                {/* Banner Content */}
                <div className="absolute inset-0 flex flex-col justify-center items-start text-left pt-12 px-5">
                  {(() => {
                    const rawTitle = currentBanner?.title || "";
                    const cleanTitle = rawTitle.replace(/\bVillaments\b/gi, "Villas");
                    if (!cleanTitle) return null;
                    return (
                      <h2 className="text-xl font-black text-white mb-1 drop-shadow-xl max-w-[90%] leading-tight tracking-tight">
                        {cleanTitle}
                      </h2>
                    );
                  })()}
                  {currentBanner?.subtitle && (
                    <p className="text-xs text-slate-200 font-medium mb-3 max-w-[90%] line-clamp-2 drop-shadow-md">
                      {currentBanner.subtitle}
                    </p>
                  )}
                  {currentBanner?.link_url && (
                    <Link
                      href={currentBanner.link_url}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-950 hover:bg-slate-900 text-white font-extrabold text-xs rounded-xl shadow-2xl transition-all border border-white/20 active:scale-95"
                    >
                      <span>{currentBanner.button_text || "Explore Now"}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
                    </Link>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        {/* Mobile Search & Filter Section (Kept exactly like before) */}
        <div className="w-full px-4 relative z-30 flex flex-col items-center text-center">
          {/* Mobile backdrop to close menu when tapping outside */}
          {(showBuyMenu || showProjectsMenu) && (
            <div
              className="fixed inset-0 z-[80] bg-transparent"
              onClick={() => {
                setShowBuyMenu(false);
                setShowProjectsMenu(false);
                setActiveBuySub(null);
              }}
            />
          )}

          {/* Mobile Tabs with Dark Text & Dark/Amber Underline */}
          <div className="flex items-center justify-center gap-2 mb-3 px-1 max-w-full relative z-[100] overflow-visible">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <div key={`m-tab-${tab.id}`} className="relative group shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (tab.id === "buy") {
                        setShowBuyMenu((prev) => !prev);
                        setShowProjectsMenu(false);
                        setOpenLocationTab(null);
                        setIsFocused(false);
                      } else if (tab.id === "projects") {
                        setShowProjectsMenu((prev) => !prev);
                        setShowBuyMenu(false);
                        setOpenLocationTab(null);
                        setIsFocused(false);
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
                      if (tab.id === "map" || tab.id === "nearme") {
                        router.push("/search?view=map");
                      }
                    }}
                    className={cn(
                      "relative py-1 text-xs xs:text-sm font-extrabold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap px-1.5",
                      isActive
                        ? "text-slate-950 font-black"
                        : "text-slate-500 hover:text-slate-800"
                    )}
                  >
                    <span>{tab.label}</span>
                    {tab.id === "buy" && (
                      <ChevronDown strokeWidth={2.5} className={cn("w-3.5 h-3.5 text-amber-500 transition-transform duration-200", showBuyMenu && "rotate-180")} />
                    )}
                    {tab.id === "projects" && (
                      <ChevronDown strokeWidth={2.5} className={cn("w-3.5 h-3.5 text-amber-500 transition-transform duration-200", showProjectsMenu && "rotate-180")} />
                    )}
                    {isActive && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-full shadow-xs" />
                    )}
                  </button>

                  {tab.id === "buy" && (
                    <div
                      className={cn(
                        "absolute top-full left-0 pt-2 w-52 transition-all duration-200 z-[100]",
                        showBuyMenu ? "opacity-100 visible pointer-events-auto" : "opacity-0 invisible pointer-events-none"
                      )}
                    >
                      <div className="bg-white text-slate-950 border-2 border-amber-500 rounded-2xl shadow-2xl overflow-visible py-2 text-left relative">
                        {/* 1. Flats */}
                        <div className="relative group">
                          <button
                            type="button"
                            onClick={() => setActiveBuySub(activeBuySub === "flats" ? null : "flats")}
                            className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-bold text-slate-800 hover:bg-amber-500/10 hover:text-amber-600 transition-colors text-left cursor-pointer"
                          >
                            <span>Flats</span>
                            <ChevronRight className={cn("w-4 h-4 text-amber-500 transition-transform", activeBuySub === "flats" && "rotate-90")} />
                          </button>
                          {activeBuySub === "flats" && (
                            <div className="bg-slate-50 py-1 px-2 border-y border-slate-200 space-y-0.5">
                              <Link href="/search?type=buy&propertyType=apartment&saleType=new" onClick={() => { setShowBuyMenu(false); setActiveBuySub(null); }} className="block px-3 py-1.5 text-xs font-bold text-slate-800 hover:text-amber-600">New Flats</Link>
                              <Link href="/search?type=buy&propertyType=apartment&saleType=resale" onClick={() => { setShowBuyMenu(false); setActiveBuySub(null); }} className="block px-3 py-1.5 text-xs font-bold text-slate-800 hover:text-amber-600">Resale Flats</Link>
                              <Link href="/search?type=buy&propertyType=apartment" onClick={() => { setShowBuyMenu(false); setActiveBuySub(null); }} className="block px-3 py-1.5 text-xs font-bold text-amber-600">All Flats</Link>
                            </div>
                          )}
                        </div>
                        {/* 2. Houses */}
                        <div className="relative group">
                          <button
                            type="button"
                            onClick={() => setActiveBuySub(activeBuySub === "houses" ? null : "houses")}
                            className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-bold text-slate-800 hover:bg-amber-500/10 hover:text-amber-600 transition-colors text-left cursor-pointer"
                          >
                            <span>Houses</span>
                            <ChevronRight className={cn("w-4 h-4 text-amber-500 transition-transform", activeBuySub === "houses" && "rotate-90")} />
                          </button>
                          {activeBuySub === "houses" && (
                            <div className="bg-slate-50 py-1 px-2 border-y border-slate-200 space-y-0.5">
                              <Link href="/search?type=buy&propertyType=independent-house&saleType=new" onClick={() => { setShowBuyMenu(false); setActiveBuySub(null); }} className="block px-3 py-1.5 text-xs font-bold text-slate-800 hover:text-amber-600">New Houses</Link>
                              <Link href="/search?type=buy&propertyType=independent-house&saleType=resale" onClick={() => { setShowBuyMenu(false); setActiveBuySub(null); }} className="block px-3 py-1.5 text-xs font-bold text-slate-800 hover:text-amber-600">Resale Houses</Link>
                              <Link href="/search?type=buy&propertyType=independent-house" onClick={() => { setShowBuyMenu(false); setActiveBuySub(null); }} className="block px-3 py-1.5 text-xs font-bold text-amber-600">All Houses</Link>
                            </div>
                          )}
                        </div>
                        {/* 3. Villas */}
                        <div className="relative group">
                          <button
                            type="button"
                            onClick={() => setActiveBuySub(activeBuySub === "villas" ? null : "villas")}
                            className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-bold text-slate-800 hover:bg-amber-500/10 hover:text-amber-600 transition-colors text-left cursor-pointer"
                          >
                            <span>Villas</span>
                            <ChevronRight className={cn("w-4 h-4 text-amber-500 transition-transform", activeBuySub === "villas" && "rotate-90")} />
                          </button>
                          {activeBuySub === "villas" && (
                            <div className="bg-slate-50 py-1 px-2 border-y border-slate-200 space-y-0.5">
                              <Link href="/search?type=buy&propertyType=villa&saleType=new" onClick={() => { setShowBuyMenu(false); setActiveBuySub(null); }} className="block px-3 py-1.5 text-xs font-bold text-slate-800 hover:text-amber-600">New Villas</Link>
                              <Link href="/search?type=buy&propertyType=villa&saleType=resale" onClick={() => { setShowBuyMenu(false); setActiveBuySub(null); }} className="block px-3 py-1.5 text-xs font-bold text-slate-800 hover:text-amber-600">Resale Villas</Link>
                              <Link href="/search?type=buy&propertyType=villa" onClick={() => { setShowBuyMenu(false); setActiveBuySub(null); }} className="block px-3 py-1.5 text-xs font-bold text-amber-600">All Villas</Link>
                            </div>
                          )}
                        </div>
                        <Link href="/search?type=buy&propertyType=residential-plot" onClick={() => { setShowBuyMenu(false); setActiveBuySub(null); }} className="block px-4 py-2.5 text-sm font-bold text-slate-800 hover:bg-amber-500/10 hover:text-amber-600 transition-colors">Plots</Link>
                        <Link href="/search?type=buy&propertyType=agricultural-land" onClick={() => { setShowBuyMenu(false); setActiveBuySub(null); }} className="block px-4 py-2.5 text-sm font-bold text-slate-800 hover:bg-amber-500/10 hover:text-amber-600 transition-colors">Agriculture</Link>
                      </div>
                    </div>
                  )}

                  {tab.id === "projects" && (
                    <div
                      className={cn(
                        "absolute top-full left-0 pt-2 w-48 transition-all duration-200 z-[100]",
                        showProjectsMenu ? "opacity-100 visible pointer-events-auto" : "opacity-0 invisible pointer-events-none"
                      )}
                    >
                      <div className="bg-white text-slate-950 border-2 border-amber-500 rounded-2xl shadow-2xl overflow-hidden py-2 text-left">
                        <Link href="/search?type=projects&propertyType=apartment" onClick={() => setShowProjectsMenu(false)} className="block px-4 py-2 text-sm font-bold text-slate-800 hover:bg-amber-500/10 hover:text-amber-600">Apartments</Link>
                        <Link href="/search?type=projects&propertyType=villa" onClick={() => setShowProjectsMenu(false)} className="block px-4 py-2 text-sm font-bold text-slate-800 hover:bg-amber-500/10 hover:text-amber-600">Villas</Link>
                        <Link href="/search?type=projects&projectType=venture" onClick={() => setShowProjectsMenu(false)} className="block px-4 py-2 text-sm font-bold text-slate-800 hover:bg-amber-500/10 hover:text-amber-600">CRDA Ventures</Link>
                        <Link href="/search?type=projects" onClick={() => setShowProjectsMenu(false)} className="block px-4 py-2 text-sm font-bold text-amber-600 hover:bg-amber-500/10 hover:text-amber-700 border-t border-slate-100 mt-1 pt-3">View All Projects →</Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Clean Modern Search Input Bar (Rectangular with Solid Amber Search Icon - Exactly Like Before) */}
          <form
            action="#"
            method="POST"
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSearchSubmit(e);
            }}
            className={cn(
              "relative w-full max-w-[760px] h-[52px] mx-auto flex items-center bg-white border border-slate-200/90 rounded-xl px-4 shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.1)] transition-all duration-200 group",
              isFocused ? "z-[60] border-slate-400 ring-2 ring-slate-200/60" : "z-30 hover:border-slate-300"
            )}
          >
            <SolidSearch className="w-5 h-5 text-amber-500 mr-3 shrink-0 pointer-events-none transition-colors" />

            <div className="relative flex-1 min-w-0 h-full flex items-center">
              {!searchQuery && (
                <div className="absolute inset-0 flex items-center pointer-events-none overflow-hidden text-left">
                  <span className="text-sm font-medium truncate select-none flex items-center w-full">
                    {activeSuggestions.length === 0 ? (
                      <span className="text-slate-400">Search properties, projects, locations...</span>
                    ) : (
                      <span className="flex items-center min-w-0 truncate text-slate-400">
                        {!typedText.toLowerCase().startsWith("search") && (
                          <span className={cn("shrink-0", isLightTypewriter ? "text-slate-400" : "text-slate-500")}>Search&nbsp;&ldquo;</span>
                        )}
                        <span className={cn(
                          "font-semibold truncate",
                          isLightTypewriter ? "text-slate-400 font-medium" : "text-slate-900 font-bold"
                        )}>
                          {typedText}
                        </span>
                        <span className="inline-block w-[2px] h-[15px] bg-amber-500 ml-0.5 animate-pulse shrink-0 rounded-full" />
                        {!typedText.toLowerCase().startsWith("search") && (
                          <span className={cn("shrink-0", isLightTypewriter ? "text-slate-400" : "text-slate-500")}>&rdquo;</span>
                        )}
                      </span>
                    )}
                  </span>
                </div>
              )}

              <input
                ref={(el) => { if (el) inputRef.current = el; }}
                type="text"
                id="hero-search-input-mobile"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSearchSubmit();
                  }
                }}
                onFocus={(e) => {
                  setIsFocused(true);
                  setTimeout(() => {
                    scrollToTopElement(e.target as HTMLElement, 75);
                  }, 120);
                }}
                onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                autoComplete="off"
                aria-label="Search properties and projects"
                style={{ outline: "none", boxShadow: "none", border: "none" }}
                className="w-full h-full bg-transparent text-sm text-slate-900 placeholder-transparent font-medium border-none outline-none focus:outline-none focus:ring-0 shadow-none px-0 relative z-10"
              />
            </div>

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
              className="w-9 h-9 rounded-xl flex items-center justify-center text-[#f59e0b] hover:text-amber-600 hover:bg-amber-50 transition-all active:scale-90 cursor-pointer shrink-0 ml-1"
            >
              {isNavigating ? (
                <Loader2 className="w-5 h-5 animate-spin text-[#f59e0b]" />
              ) : (
                <Search className="w-5 h-5 stroke-[2.5]" />
              )}
            </button>

            {/* Suggestions dropdown on mobile */}
            {isFocused && liveHeroSuggestions && (searchQuery.trim().length > 0 || liveHeroSuggestions.directRefMatch) && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 text-left divide-y divide-slate-100">
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
                    className="px-4 py-3 bg-amber-50 hover:bg-amber-100/80 cursor-pointer flex items-center justify-between gap-3 border-b border-amber-500/30 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-black text-xs tracking-wider shadow-xs shrink-0">
                        🎯 {liveHeroSuggestions.directRefMatch.refId}
                      </span>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-black text-slate-950 truncate">
                          {liveHeroSuggestions.directRefMatch.title}
                        </span>
                        <span className="text-[11px] font-bold text-amber-700">
                          Exact Ref Match • Tap to Open Directly
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-amber-600 shrink-0" />
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleSearchSubmit()}
                  className="w-full text-left px-4 py-3 hover:bg-amber-500/10 flex items-center gap-3 transition-colors text-xs font-bold text-slate-950 bg-white"
                >
                  <Search className="w-4 h-4 shrink-0 text-amber-500" />
                  <span className="truncate">Search all for &ldquo;<strong className="text-amber-600">{searchQuery}</strong>&rdquo;</span>
                </button>

                {liveHeroSuggestions.projects.length > 0 && (
                  <div className="p-2 bg-white">
                    <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-50 rounded-lg mb-1">
                      Builder Projects
                    </div>
                    {liveHeroSuggestions.projects.map((p) => (
                      <div
                        key={`hero-m-proj-${p.id}`}
                        onClick={(e) => {
                          setIsFocused(false);
                          openProject(p, e);
                        }}
                        className="px-2.5 py-2 hover:bg-amber-500/10 rounded-xl cursor-pointer flex items-center justify-between gap-2 transition-colors group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-700 text-[10px] font-extrabold shrink-0">Project</span>
                          <span className="text-xs font-bold text-slate-950 group-hover:text-amber-600 truncate">{p.name}</span>
                          <span className="text-[11px] text-slate-500 truncate">({p.location?.locality || p.location?.city})</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                      </div>
                    ))}
                  </div>
                )}

                {liveHeroSuggestions.properties.length > 0 && (
                  <div className="p-2 bg-white">
                    <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-50 rounded-lg mb-1">
                      Properties
                    </div>
                    {liveHeroSuggestions.properties.map((p) => (
                      <div
                        key={`hero-m-prop-${p.id}`}
                        onClick={(e) => {
                          setIsFocused(false);
                          router.push(`/properties/${p.slug || p.id}`);
                        }}
                        className="px-2.5 py-2 hover:bg-amber-500/10 rounded-xl cursor-pointer flex items-center justify-between gap-2 transition-colors group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold shrink-0">Property</span>
                          <span className="text-xs font-bold text-slate-950 group-hover:text-amber-600 truncate">{p.title}</span>
                          <span className="text-[11px] text-slate-500 truncate">({p.location?.locality || p.location?.city})</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </form>

          {/* Dynamic Location Pills on Mobile */}
          <div className="w-full max-w-[760px] mx-auto mt-2.5 text-left relative z-30">
            <div
              className={cn(
                "grid gap-1.5 w-full pb-1 mb-1.5",
                heroCities.length === 1 ? "grid-cols-1" :
                  heroCities.length === 2 ? "grid-cols-2" :
                    heroCities.length === 3 ? "grid-cols-3" :
                      "grid-cols-2"
              )}
            >
              {heroCities.map((city) => {
                const isOpen = openLocationTab === city.id;
                const hasSublocations = city.sublocations && city.sublocations.length > 0;

                return (
                  <button
                    key={`m-city-${city.id}`}
                    type="button"
                    onClick={() => {
                      setShowBuyMenu(false);
                      setShowProjectsMenu(false);
                      if (hasSublocations) {
                        setOpenLocationTab(isOpen ? null : city.id);
                        setSublocationSearch("");
                      } else {
                        router.push(`/search?type=${activeTab}&location=${encodeURIComponent(city.name)}`);
                      }
                    }}
                    className={cn(
                      "h-[34px] px-2 rounded-full text-[11px] flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer shadow-2xs border w-full text-center whitespace-nowrap",
                      isOpen
                        ? "bg-white border-amber-500 text-slate-950 font-black shadow-md ring-2 ring-amber-500/25"
                        : "bg-white/95 hover:bg-white border-slate-200/90 text-slate-950 font-bold shadow-xs hover:border-amber-400"
                    )}
                  >
                    <SolidMapPin className="w-3.5 h-3.5 text-[#faad13] shrink-0" />
                    <span className="whitespace-nowrap tracking-tight text-slate-950 font-bold">{city.name}</span>
                    {hasSublocations && (
                      <ChevronDown className={cn("w-3 h-3 text-[#faad13] shrink-0 transition-transform duration-200", isOpen && "rotate-180")} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mobile Budget Filter Card */}
          <div className="relative z-20 w-full max-w-[760px] mx-auto mt-2.5 text-left">
            <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-2.5 space-y-2.5 shadow-sm">
              <div className="relative flex items-center justify-center py-0.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shadow-2xs">
                    <IndianRupee className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                  <span className="text-xs font-black text-slate-900">
                    Filter by Budget
                  </span>
                </div>

                {(heroBudget[0] !== 1000000 || heroBudget[1] !== 500000000) && (
                  <button
                    type="button"
                    onClick={() => setHeroBudget([1000000, 500000000])}
                    className="absolute right-0 inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-slate-800 transition-colors cursor-pointer px-1.5 py-0.5 rounded-md hover:bg-slate-100"
                  >
                    <RotateCcw className="w-3 h-3 text-amber-500" />
                    <span>Reset</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <ModernBudgetDropdown
                  value={heroBudget[0]}
                  options={HERO_BUDGET_MIN_OPTS}
                  onChange={(val) => setHeroBudget([val, Math.max(val, heroBudget[1])])}
                  placeholder="Min Price"
                  prefix="Min"
                />

                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  to
                </span>

                <ModernBudgetDropdown
                  value={heroBudget[1]}
                  options={HERO_BUDGET_MAX_OPTS}
                  onChange={(val) => setHeroBudget([Math.min(heroBudget[0], val), val])}
                  placeholder="Any Price"
                  align="right"
                  isMax
                  maxCap={500000000}
                  prefix="Max"
                />
              </div>

              <button
                type="button"
                onClick={() => handleSearchSubmit()}
                className="w-full h-9 bg-slate-950 hover:bg-slate-900 active:scale-98 text-white font-extrabold text-xs rounded-full flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <span>Apply Budget Filter</span>
                <span className="px-2 py-0.5 min-w-[20px] h-[20px] rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[10px] font-black shadow-2xs">
                  {matchingCount}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── DESKTOP & TABLET VIEW: Integrated Hero Banner & Search Overlay (Slightly Reduced Height) ── */}
      <div id="hero-banner-desktop" className="hidden sm:flex relative z-10 w-full mb-6 sm:mb-8 shadow-2xl min-h-[560px] md:min-h-[590px] lg:min-h-[600px] overflow-visible flex-col justify-between">
        {/* Background Banner Container with overflow-hidden for sliding animations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
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

            {/* Directional Gradient Scrims: Darker behind headline & navbar/tabs, clear over architecture */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-black/10" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/25 to-black/60 pointer-events-none" />
          </motion.div>
        </AnimatePresence>
        </div>

        {/* Upper/Center Hero Content: The Search Widget */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-40 w-full flex flex-col items-center text-center pt-20 sm:pt-24 md:pt-28 lg:pt-32">
          {/* Ambient Aurora Mesh Glow behind search bar */}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-[350px] sm:w-[750px] h-[200px] bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-yellow-500/20 blur-[80px] rounded-full pointer-events-none -z-10" />

          {/* Backdrop to close menu when clicking outside */}
          {(showBuyMenu || showProjectsMenu) && (
            <div
              className="fixed inset-0 z-[80] bg-transparent"
              onClick={() => {
                setShowBuyMenu(false);
                setShowProjectsMenu(false);
                setActiveBuySub(null);
              }}
            />
          )}

          {/* Realtor.com Search Options Bar (Tabs over Dark Hero Banner) */}
          <div className="flex items-center justify-center gap-3 sm:gap-8 mb-3.5 sm:mb-4.5 px-1 max-w-full relative z-[100] overflow-visible">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <div
                  key={tab.id}
                  className="relative group shrink-0"
                  onMouseEnter={() => {
                    if (tab.id === "buy") {
                      setShowBuyMenu(true);
                      setOpenLocationTab(null);
                    }
                    if (tab.id === "projects") {
                      setShowProjectsMenu(true);
                      setOpenLocationTab(null);
                    }
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
                        setOpenLocationTab(null);
                        setIsFocused(false);
                      } else if (tab.id === "projects") {
                        setShowProjectsMenu((prev) => !prev);
                        setShowBuyMenu(false);
                        setOpenLocationTab(null);
                        setIsFocused(false);
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
                      if (tab.id === "map" || tab.id === "nearme") {
                        router.push("/search?view=map");
                      }
                    }}
                    className={cn(
                      "relative py-1.5 text-[13px] xs:text-sm sm:text-lg font-extrabold transition-all cursor-pointer flex items-center gap-1 sm:gap-1.5 whitespace-nowrap px-1.5 sm:px-2",
                      isActive
                        ? "text-white"
                        : "text-white/80 hover:text-white"
                    )}
                  >
                    {tab.label}
                    {tab.id === "buy" && (
                      <ChevronDown strokeWidth={2.5} className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 transition-transform duration-200", showBuyMenu && "rotate-180")} />
                    )}
                    {tab.id === "projects" && (
                      <ChevronDown strokeWidth={2.5} className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 transition-transform duration-200", showProjectsMenu && "rotate-180")} />
                    )}
                    {isActive && (
                      <motion.div
                        layoutId="realtorTabLine"
                        className="absolute bottom-0 left-0 right-0 h-0.5 sm:h-1 bg-amber-400 rounded-full shadow-md"
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
                      <div className="bg-white text-slate-950 border-2 border-amber-500 rounded-2xl shadow-2xl overflow-visible py-2 text-left relative">
                        {/* 1. Flats */}
                        <div
                          className="relative group"
                          onMouseEnter={() => setActiveBuySub("flats")}
                        >
                          <button
                            type="button"
                            onClick={() => setActiveBuySub(activeBuySub === "flats" ? null : "flats")}
                            className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-bold text-slate-800 hover:bg-amber-500/10 hover:text-amber-600 transition-colors text-left cursor-pointer"
                          >
                            <span>Flats</span>
                            <ChevronRight className={cn("w-4 h-4 text-amber-500 group-hover:text-amber-600 transition-transform", activeBuySub === "flats" && "rotate-90 sm:rotate-0")} />
                          </button>

                          {/* Flats Submenu */}
                          {activeBuySub === "flats" && (
                            <div className="sm:absolute sm:left-full sm:top-0 sm:ml-1.5 sm:w-44 bg-white border-2 border-amber-500 rounded-xl shadow-2xl py-1.5 z-[110] animate-in fade-in zoom-in-95 duration-150 mx-2 sm:mx-0 my-1 sm:my-0 space-y-0.5">
                              <Link
                                href="/search?type=buy&propertyType=apartment&saleType=new"
                                onClick={() => { setShowBuyMenu(false); setActiveBuySub(null); }}
                                className="block px-3.5 py-2 text-xs font-bold text-slate-800 hover:bg-amber-500/10 hover:text-amber-600 rounded-lg mx-1 transition-colors"
                              >
                                New Flats
                              </Link>
                              <Link
                                href="/search?type=buy&propertyType=apartment&saleType=resale"
                                onClick={() => { setShowBuyMenu(false); setActiveBuySub(null); }}
                                className="block px-3.5 py-2 text-xs font-bold text-slate-800 hover:bg-amber-500/10 hover:text-amber-600 rounded-lg mx-1 transition-colors"
                              >
                                Resale Flats
                              </Link>
                              <div className="h-px bg-slate-100 my-1 mx-2" />
                              <Link
                                href="/search?type=buy&propertyType=apartment"
                                onClick={() => { setShowBuyMenu(false); setActiveBuySub(null); }}
                                className="block px-3.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-amber-500/10 hover:text-amber-600 rounded-lg mx-1 transition-colors"
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
                            className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-bold text-slate-800 hover:bg-amber-500/10 hover:text-amber-600 transition-colors text-left cursor-pointer"
                          >
                            <span>Houses</span>
                            <ChevronRight className={cn("w-4 h-4 text-amber-500 group-hover:text-amber-600 transition-transform", activeBuySub === "houses" && "rotate-90 sm:rotate-0")} />
                          </button>

                          {/* Houses Submenu */}
                          {activeBuySub === "houses" && (
                            <div className="sm:absolute sm:left-full sm:top-0 sm:ml-1.5 sm:w-44 bg-white border-2 border-amber-500 rounded-xl shadow-2xl py-1.5 z-[110] animate-in fade-in zoom-in-95 duration-150 mx-2 sm:mx-0 my-1 sm:my-0 space-y-0.5">
                              <Link
                                href="/search?type=buy&propertyType=independent-house&saleType=new"
                                onClick={() => { setShowBuyMenu(false); setActiveBuySub(null); }}
                                className="block px-3.5 py-2 text-xs font-bold text-slate-800 hover:bg-amber-500/10 hover:text-amber-600 rounded-lg mx-1 transition-colors"
                              >
                                New Houses
                              </Link>
                              <Link
                                href="/search?type=buy&propertyType=independent-house&saleType=resale"
                                onClick={() => { setShowBuyMenu(false); setActiveBuySub(null); }}
                                className="block px-3.5 py-2 text-xs font-bold text-slate-800 hover:bg-amber-500/10 hover:text-amber-600 rounded-lg mx-1 transition-colors"
                              >
                                Resale Houses
                              </Link>
                              <div className="h-px bg-slate-100 my-1 mx-2" />
                              <Link
                                href="/search?type=buy&propertyType=independent-house"
                                onClick={() => { setShowBuyMenu(false); setActiveBuySub(null); }}
                                className="block px-3.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-amber-500/10 hover:text-amber-600 rounded-lg mx-1 transition-colors"
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
                            className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-bold text-slate-800 hover:bg-amber-500/10 hover:text-amber-600 transition-colors text-left cursor-pointer"
                          >
                            <span>Villas</span>
                            <ChevronRight className={cn("w-4 h-4 text-amber-500 group-hover:text-amber-600 transition-transform", activeBuySub === "villas" && "rotate-90 sm:rotate-0")} />
                          </button>

                          {/* Villas Submenu */}
                          {activeBuySub === "villas" && (
                            <div className="sm:absolute sm:left-full sm:top-0 sm:ml-1.5 sm:w-44 bg-white border-2 border-amber-500 rounded-xl shadow-2xl py-1.5 z-[110] animate-in fade-in zoom-in-95 duration-150 mx-2 sm:mx-0 my-1 sm:my-0 space-y-0.5">
                              <Link
                                href="/search?type=buy&propertyType=villa&saleType=new"
                                onClick={() => { setShowBuyMenu(false); setActiveBuySub(null); }}
                                className="block px-3.5 py-2 text-xs font-bold text-slate-800 hover:bg-amber-500/10 hover:text-amber-600 rounded-lg mx-1 transition-colors"
                              >
                                New Villas
                              </Link>
                              <Link
                                href="/search?type=buy&propertyType=villa&saleType=resale"
                                onClick={() => { setShowBuyMenu(false); setActiveBuySub(null); }}
                                className="block px-3.5 py-2 text-xs font-bold text-slate-800 hover:bg-amber-500/10 hover:text-amber-600 rounded-lg mx-1 transition-colors"
                              >
                                Resale Villas
                              </Link>
                              <div className="h-px bg-slate-100 my-1 mx-2" />
                              <Link
                                href="/search?type=buy&propertyType=villa"
                                onClick={() => { setShowBuyMenu(false); setActiveBuySub(null); }}
                                className="block px-3.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-amber-500/10 hover:text-amber-600 rounded-lg mx-1 transition-colors"
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
                          className="block px-4 py-2.5 text-sm font-bold text-slate-800 hover:bg-amber-500/10 hover:text-amber-600 transition-colors"
                        >
                          Plots
                        </Link>

                        {/* 5. Agriculture */}
                        <Link
                          href="/search?type=buy&propertyType=agricultural-land"
                          onClick={() => { setShowBuyMenu(false); setActiveBuySub(null); }}
                          className="block px-4 py-2.5 text-sm font-bold text-slate-800 hover:bg-amber-500/10 hover:text-amber-600 transition-colors"
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
                      <div className="bg-white text-slate-950 border-2 border-amber-500 rounded-2xl shadow-2xl overflow-hidden py-2 text-left">
                        <Link href="/search?type=projects&propertyType=apartment" onClick={() => setShowProjectsMenu(false)} className="block px-4 py-2 text-sm font-bold text-slate-800 hover:bg-amber-500/10 hover:text-amber-600">
                          Apartments
                        </Link>
                        <Link href="/search?type=projects&propertyType=villa" onClick={() => setShowProjectsMenu(false)} className="block px-4 py-2 text-sm font-bold text-slate-800 hover:bg-amber-500/10 hover:text-amber-600">
                          Villas
                        </Link>
                        <Link href="/search?type=projects&projectType=venture" onClick={() => setShowProjectsMenu(false)} className="block px-4 py-2 text-sm font-bold text-slate-800 hover:bg-amber-500/10 hover:text-amber-600">
                          CRDA Ventures
                        </Link>
                        <Link href="/search?type=projects" onClick={() => setShowProjectsMenu(false)} className="block px-4 py-2 text-sm font-bold text-amber-600 hover:bg-amber-500/10 hover:text-amber-700 border-t border-slate-100 mt-1 pt-3">
                          View All Projects →
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Clean Modern Search Input Bar (Fully Rounded Pill with Dark Outline Icon on Left & Amber on Right) */}
          <form
            action="#"
            method="POST"
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSearchSubmit(e);
            }}
            className={cn(
              "relative w-full max-w-[760px] h-[52px] sm:h-[58px] mx-auto flex items-center bg-white border border-slate-200/90 rounded-full px-4 sm:px-5 shadow-[0_8px_30px_rgba(0,0,0,0.18)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.25)] transition-all duration-200 group",
              isFocused ? "z-[60] ring-2 ring-amber-500/30 border-amber-500" : "z-30 hover:border-slate-300"
            )}
          >
            {/* Left: Dark Outline Search Icon */}
            <Search className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-slate-500 mr-3 shrink-0 pointer-events-none stroke-[2.2]" />

            {/* Input text wrapper */}
            <div className="relative flex-1 min-w-0 h-full flex items-center">
              {/* Animated placeholder overlay - shown only when searchQuery is empty */}
              {!searchQuery && (
                <div className="absolute inset-0 flex items-center pointer-events-none overflow-hidden text-left">
                  <span className="text-sm sm:text-base font-medium truncate select-none flex items-center w-full">
                    {activeSuggestions.length === 0 ? (
                      <span className="text-slate-400">Search properties, projects, locations...</span>
                    ) : (
                      <span className="flex items-center min-w-0 truncate text-slate-400">
                        {!typedText.toLowerCase().startsWith("search") && (
                          <span className={cn("shrink-0", isLightTypewriter ? "text-slate-400" : "text-slate-500")}>Search&nbsp;&ldquo;</span>
                        )}
                        <span className={cn(
                          "font-semibold truncate",
                          isLightTypewriter ? "text-slate-400 font-medium" : "text-slate-900 font-bold"
                        )}>
                          {typedText}
                        </span>
                        <span className="inline-block w-[2px] h-[16px] sm:h-[18px] bg-amber-500 ml-0.5 animate-pulse shrink-0 rounded-full" />
                        {!typedText.toLowerCase().startsWith("search") && (
                          <span className={cn("shrink-0", isLightTypewriter ? "text-slate-400" : "text-slate-500")}>&rdquo;</span>
                        )}
                      </span>
                    )}
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
                onFocus={(e) => {
                  setIsFocused(true);
                  setTimeout(() => {
                    scrollToTopElement(e.target as HTMLElement, 75);
                  }, 120);
                }}
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

            {/* Right: Amber Search Action Icon */}
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
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-[#f59e0b] hover:text-amber-600 hover:bg-amber-50 transition-all active:scale-90 cursor-pointer shrink-0 ml-1"
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
                className="absolute left-0 right-0 top-full mt-2 z-[100] bg-white border-2 border-amber-500 rounded-2xl shadow-2xl overflow-hidden divide-y divide-slate-100 text-left animate-in fade-in zoom-in-95 max-h-[60vh] overflow-y-auto no-scrollbar"
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
                    className="px-4 py-3 bg-amber-50 hover:bg-amber-100/80 cursor-pointer flex items-center justify-between gap-3 border-b border-amber-500/30 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-black text-xs tracking-wider shadow-xs shrink-0">
                        🎯 {liveHeroSuggestions.directRefMatch.refId}
                      </span>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-black text-slate-950 truncate">
                          {liveHeroSuggestions.directRefMatch.title}
                        </span>
                        <span className="text-[11px] font-bold text-amber-700">
                          Exact Ref Match • Tap to Open Directly
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-amber-600 shrink-0" />
                  </div>
                )}

                {/* Search All button */}
                <button
                  type="button"
                  onClick={() => handleSearchSubmit()}
                  className="w-full text-left px-4 py-3 hover:bg-amber-500/10 flex items-center gap-3 transition-colors text-xs font-bold text-slate-950 bg-white"
                >
                  <Search className="w-4 h-4 shrink-0 text-amber-500" />
                  <span className="truncate">Search all for &ldquo;<strong className="text-amber-600">{searchQuery}</strong>&rdquo;</span>
                </button>

                {/* Projects suggestions */}
                {liveHeroSuggestions.projects.length > 0 && (
                  <div className="p-2 bg-white">
                    <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-50 rounded-lg mb-1">
                      Builder Projects
                    </div>
                    {liveHeroSuggestions.projects.map((p) => (
                      <div
                        key={`hero-proj-${p.id}`}
                        onClick={(e) => {
                          setIsFocused(false);
                          openProject(p, e);
                        }}
                        className="px-2.5 py-2 hover:bg-amber-500/10 rounded-xl cursor-pointer flex items-center justify-between gap-2 transition-colors group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-700 text-[10px] font-extrabold shrink-0">Project</span>
                          <span className="text-xs font-bold text-slate-950 group-hover:text-amber-600 truncate">{p.name}</span>
                          <span className="text-[11px] text-slate-500 truncate">({p.location?.locality || p.location?.city})</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Properties suggestions */}
                {liveHeroSuggestions.properties.length > 0 && (
                  <div className="p-2 bg-white">
                    <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-50 rounded-lg mb-1">
                      Properties
                    </div>
                    {liveHeroSuggestions.properties.map((p) => (
                      <div
                        key={`hero-prop-${p.id}`}
                        onClick={(e) => {
                          setIsFocused(false);
                          router.push(`/properties/${p.slug || p.id}`);
                        }}
                        className="px-2.5 py-2 hover:bg-amber-500/10 rounded-xl cursor-pointer flex items-center justify-between gap-2 transition-colors group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold shrink-0">Property</span>
                          <span className="text-xs font-bold text-slate-950 group-hover:text-amber-600 truncate">{p.title}</span>
                          <span className="text-[11px] text-slate-500 truncate">({p.location?.locality || p.location?.city})</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </form>

          {/* Dynamic Location Pills (Row of 3 Dark Rounded Pills) */}
          <div className="w-full max-w-[760px] mx-auto mt-2.5 sm:mt-3 text-left relative z-40">
            <div
              className={cn(
                "grid gap-2 sm:gap-3 w-full pb-1 mb-1 sm:mb-1.5",
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
                      setShowBuyMenu(false);
                      setShowProjectsMenu(false);
                      if (hasSublocations) {
                        setOpenLocationTab(isOpen ? null : city.id);
                        setSublocationSearch("");
                      } else {
                        router.push(`/search?type=${activeTab}&location=${encodeURIComponent(city.name)}`);
                      }
                    }}
                    className={cn(
                      "h-[36px] sm:h-[40px] px-2.5 sm:px-4 rounded-full text-xs sm:text-[13px] flex items-center justify-center gap-1.5 sm:gap-2 transition-all duration-200 cursor-pointer shadow-sm border w-full text-center whitespace-nowrap",
                      isOpen
                        ? "bg-white border-amber-500 text-slate-950 font-black shadow-md ring-2 ring-amber-500/25"
                        : "bg-white/95 hover:bg-white border-slate-200/90 hover:border-amber-400 text-slate-950 font-bold hover:shadow-md shadow-[0_2px_12px_rgba(0,0,0,0.08)]"
                    )}
                  >
                    <SolidMapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#faad13] shrink-0" />
                    <span className="whitespace-nowrap tracking-tight text-slate-950 font-bold">{city.name}</span>
                    {hasSublocations && (
                      <ChevronDown strokeWidth={2.5} className={cn("w-3 h-3 text-[#faad13] transition-transform shrink-0", isOpen && "rotate-180")} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* ── DESKTOP Centered Sublocations Dropdown ── */}
            <div className="hidden sm:block">
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
                        className="fixed inset-0 z-[95]"
                        onClick={() => {
                          setOpenLocationTab(null);
                          setSublocationSearch("");
                        }}
                      />

                      <motion.div
                        key={activeCity.id}
                        initial={{ opacity: 0, scale: 0.96, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: -4 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-[390px] max-w-[92vw] bg-white border-2 border-amber-500 rounded-2xl shadow-2xl overflow-hidden z-[100] max-h-[360px] flex flex-col pointer-events-auto"
                      >
                        {/* Header */}
                        <div className="px-4 py-2.5 border-b border-amber-500/20 text-[11px] uppercase font-black tracking-wider text-slate-950 flex items-center justify-between gap-3 sticky top-0 bg-white z-10 shrink-0">
                          <span className="whitespace-nowrap flex items-center gap-1.5 text-slate-950 font-black">
                            <MapPin className="w-3.5 h-3.5 text-amber-500" />
                            {activeCity.name} Localities
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500 font-bold text-[10px] whitespace-nowrap lowercase">
                              {filteredSublocations.length === activeCity.sublocations.length
                                ? `${activeCity.sublocations.length} areas`
                                : `${filteredSublocations.length} of ${activeCity.sublocations.length}`}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenLocationTab(null);
                                setSublocationSearch("");
                              }}
                              className="w-6 h-6 rounded-full bg-slate-100 hover:bg-amber-500/15 border border-slate-200 text-slate-700 hover:text-amber-600 flex items-center justify-center transition-colors cursor-pointer shrink-0 active:scale-90 shadow-2xs"
                              aria-label="Close"
                            >
                              <X className="w-3.5 h-3.5 stroke-[2.5]" />
                            </button>
                          </div>
                        </div>

                        {/* Search Bar */}
                        <div className="p-2 border-b border-amber-500/20 bg-slate-50/80 shrink-0">
                          <div className="relative flex items-center bg-white border border-amber-500/40 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20 rounded-xl px-2.5 py-1.5 transition-colors">
                            <Search strokeWidth={2.5} className="w-3.5 h-3.5 text-amber-500 shrink-0 mr-2" />
                            <input
                              type="text"
                              value={sublocationSearch}
                              onChange={(e) => setSublocationSearch(e.target.value)}
                              placeholder={`Search ${activeCity.name} localities...`}
                              style={{ outline: "none", boxShadow: "none", border: "none" }}
                              className="w-full bg-transparent text-xs text-slate-950 placeholder-slate-400 font-semibold outline-none border-none ring-0 shadow-none focus:outline-none focus:ring-0 focus-visible:outline-none p-0"
                              autoFocus
                            />
                            {sublocationSearch && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSublocationSearch("");
                                }}
                                className="p-0.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors shrink-0 cursor-pointer ml-1"
                                aria-label="Clear sublocation search"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Localities List */}
                        <div className="overflow-y-auto min-h-0 divide-y divide-slate-100 flex-1 py-1 bg-white overscroll-contain scrollbar-thin scrollbar-thumb-slate-300 hover:scrollbar-thumb-amber-500">
                          {filteredSublocations.length > 0 ? (
                            filteredSublocations.map((sub) => (
                              <button
                                key={sub.id}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenLocationTab(null);
                                  setSublocationSearch("");
                                  router.push(
                                    `/search?type=${activeTab}&location=${encodeURIComponent(
                                      activeCity.name
                                    )}&locality=${encodeURIComponent(sub.name)}`
                                  );
                                }}
                                className="w-full text-left px-4 py-2.5 hover:bg-amber-500/10 cursor-pointer flex items-center justify-between transition-colors group border-none bg-transparent"
                              >
                                <div className="flex flex-col min-w-0 pr-2">
                                  <span className="font-bold text-xs text-slate-950 group-hover:text-amber-600 transition-colors truncate">
                                    {sub.name}
                                  </span>
                                  {sub.tagline && (
                                    <span className="text-[10px] text-slate-500 block mt-0.5 truncate">
                                      {sub.tagline}
                                    </span>
                                  )}
                                </div>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-amber-500 transition-colors shrink-0" />
                              </button>
                            ))
                          ) : (
                            <div className="py-6 px-4 text-center">
                              <p className="text-xs text-slate-500 font-medium mb-2.5">
                                No localities found for &ldquo;{sublocationSearch}&rdquo;
                              </p>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const term = sublocationSearch;
                                  setOpenLocationTab(null);
                                  setSublocationSearch("");
                                  router.push(
                                    `/search?type=${activeTab}&location=${encodeURIComponent(
                                      activeCity.name
                                    )}&locality=${encodeURIComponent(term)}`
                                  );
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-[11px] font-bold transition-colors cursor-pointer"
                              >
                                <Search className="w-3 h-3 text-slate-950" />
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
          </div>

          {/* ── MOBILE Portal-based Luxury Localities Bottom Sheet ── */}
          {mounted && typeof document !== "undefined" && createPortal(
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
                  <div data-location-portal="true" className="sm:hidden fixed inset-0 z-[99999]">
                    {/* Solid Dim Backdrop */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => {
                        setOpenLocationTab(null);
                        setSublocationSearch("");
                        setIsLocalityFocused(false);
                      }}
                      className="fixed inset-0 bg-black/80 backdrop-blur-xs"
                    />

                    {/* Bottom Sheet Drawer */}
                    <motion.div
                      initial={{ y: "100%" }}
                      animate={{
                        y: 0,
                        height: (isLocalityFocused || sublocationSearch.trim().length > 0) ? "88vh" : "55vh"
                      }}
                      exit={{ y: "100%" }}
                      transition={{ type: "spring", damping: 28, stiffness: 320 }}
                      className={cn(
                        "fixed bottom-0 left-0 right-0 z-[100000] bg-white border-t-2 border-amber-500 rounded-t-3xl shadow-2xl flex flex-col overflow-hidden pb-6 safe-bottom transition-all duration-300 ease-out",
                        (isLocalityFocused || sublocationSearch.trim().length > 0)
                          ? "h-[88vh] max-h-[92vh]"
                          : "h-[55vh] max-h-[60vh]"
                      )}
                    >
                      {/* Drag Handle */}
                      <div className="pt-3 pb-1.5 flex justify-center shrink-0">
                        <div className="w-10 h-1 rounded-full bg-slate-300" />
                      </div>

                      {/* Header */}
                      <div className="px-5 py-3 border-b border-amber-500/20 flex items-center justify-between shrink-0 bg-white">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
                            <MapPin className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="text-sm font-black text-slate-950 tracking-tight flex items-center gap-1.5">
                              <span>{activeCity.name}</span>
                              <span className="text-amber-600 uppercase text-[10px] tracking-wider">Localities</span>
                            </h3>
                            <p className="text-[10px] text-slate-500 font-medium">
                              {filteredSublocations.length === activeCity.sublocations.length
                                ? `${activeCity.sublocations.length} verified areas`
                                : `${filteredSublocations.length} of ${activeCity.sublocations.length} areas`}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setOpenLocationTab(null);
                            setSublocationSearch("");
                            setIsLocalityFocused(false);
                          }}
                          className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-950 flex items-center justify-center cursor-pointer active:scale-90"
                          aria-label="Close"
                        >
                          <X className="w-4 h-4 stroke-[2.5]" />
                        </button>
                      </div>

                      {/* Search Bar inside Bottom Sheet */}
                      <div className="p-3 border-b border-amber-500/20 bg-slate-50/80 shrink-0">
                        <div className="relative flex items-center bg-white border border-amber-500/40 focus-within:border-amber-500 rounded-xl px-3 py-2 transition-colors">
                          <Search strokeWidth={2.5} className="w-4 h-4 text-amber-500 shrink-0 mr-2.5" />
                          <input
                            type="text"
                            value={sublocationSearch}
                            onChange={(e) => setSublocationSearch(e.target.value)}
                            onFocus={() => setIsLocalityFocused(true)}
                            onBlur={() => {
                              if (!sublocationSearch) {
                                setIsLocalityFocused(false);
                              }
                            }}
                            placeholder={`Search ${activeCity.name} localities...`}
                            style={{ outline: "none", boxShadow: "none", border: "none" }}
                            className="w-full bg-transparent text-sm text-slate-950 placeholder-slate-400 font-semibold outline-none border-none ring-0 shadow-none focus:outline-none focus:ring-0 focus-visible:outline-none p-0"
                          />
                          {sublocationSearch && (
                            <button
                              type="button"
                              onClick={() => {
                                setSublocationSearch("");
                                setIsLocalityFocused(false);
                              }}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors shrink-0 cursor-pointer ml-1"
                              aria-label="Clear search"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Localities List */}
                      <div className="overflow-y-auto min-h-0 divide-y divide-slate-100 flex-1 py-1 px-2 bg-white overscroll-contain">
                        {filteredSublocations.length > 0 ? (
                          filteredSublocations.map((sub) => (
                            <div
                              key={sub.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenLocationTab(null);
                                setSublocationSearch("");
                                router.push(
                                  `/search?type=${activeTab}&location=${encodeURIComponent(
                                    activeCity.name
                                  )}&locality=${encodeURIComponent(sub.name)}`
                                );
                              }}
                              className="px-4 py-3 hover:bg-amber-500/10 rounded-xl cursor-pointer flex items-center justify-between transition-colors active:scale-[0.99]"
                            >
                              <div>
                                <span className="font-bold text-sm text-slate-950 block">
                                  {sub.name}
                                </span>
                                {sub.tagline && (
                                  <span className="text-xs text-slate-500 block mt-0.5">
                                    {sub.tagline}
                                  </span>
                                )}
                              </div>
                              <ChevronRight className="w-4 h-4 text-amber-500" />
                            </div>
                          ))
                        ) : (
                          <div className="py-8 px-4 text-center">
                            <p className="text-sm text-slate-500 font-medium mb-3">
                              No localities found for &ldquo;{sublocationSearch}&rdquo;
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                const term = sublocationSearch;
                                setOpenLocationTab(null);
                                setSublocationSearch("");
                                setIsLocalityFocused(false);
                                router.push(
                                  `/search?type=${activeTab}&location=${encodeURIComponent(
                                    activeCity.name
                                  )}&locality=${encodeURIComponent(term)}`
                                );
                              }}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black shadow-xs cursor-pointer transition-all"
                            >
                              <Search className="w-3.5 h-3.5" />
                              <span>Search &ldquo;{sublocationSearch}&rdquo; in {activeCity.name}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </div>
                );
              })()}
            </AnimatePresence>,
            document.body
          )}

          {/* ── Budget Filter Capsule (Fully Rounded Pill Matching Reference Screenshot) ── */}
          <div className="relative z-20 w-full max-w-[760px] mx-auto mt-2.5 sm:mt-3 text-left">
            {/* Desktop & Tablet: Balanced Single-Row Full White Capsule */}
            <div className="hidden sm:flex items-center justify-between gap-3 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-full px-3.5 sm:px-4 py-1.5 sm:py-2 shadow-[0_4px_24px_rgba(0,0,0,0.12)]">

              {/* 1. Left: Beige/Gold ₹ Badge + FILTER BY Budget Label */}
              <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 pl-1">
                <div className="w-8 h-8 rounded-full bg-[#fef3c7] border border-amber-500/20 flex items-center justify-center text-amber-800 shadow-2xs">
                  <IndianRupee className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 leading-none">
                    FILTER BY
                  </span>
                  <span className="text-xs font-black text-slate-900 leading-tight">
                    Budget
                  </span>
                </div>
              </div>

              {/* Vertical Divider */}
              <div className="h-6 w-[1px] bg-slate-200/90 shrink-0 mx-0.5" />

              {/* 2. Middle: Symmetrical Expanded Price Range Selectors */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="flex-1">
                  <ModernBudgetDropdown
                    variant="capsule"
                    value={heroBudget[0]}
                    options={HERO_BUDGET_MIN_OPTS}
                    onChange={(val) => setHeroBudget([val, Math.max(val, heroBudget[1])])}
                    placeholder="Min Price"
                    prefix="MIN"
                  />
                </div>

                <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider shrink-0 px-0.5">
                  to
                </span>

                <div className="flex-1">
                  <ModernBudgetDropdown
                    variant="capsule"
                    value={heroBudget[1]}
                    options={HERO_BUDGET_MAX_OPTS}
                    onChange={(val) => setHeroBudget([Math.min(heroBudget[0], val), val])}
                    placeholder="Any Price"
                    align="right"
                    isMax
                    maxCap={500000000}
                    prefix="MAX"
                  />
                </div>
              </div>

              {/* 3. Right: Reset & Apply CTA */}
              <div className="flex items-center gap-2 shrink-0">
                {(heroBudget[0] !== 1000000 || heroBudget[1] !== 500000000) && (
                  <button
                    type="button"
                    onClick={() => setHeroBudget([1000000, 500000000])}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-800 transition-colors cursor-pointer px-2.5 py-1.5 rounded-full hover:bg-slate-100 shrink-0"
                    title="Reset budget to default"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
                    <span className="hidden lg:inline">Reset</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleSearchSubmit()}
                  className="h-9 sm:h-9.5 px-4.5 bg-slate-950 hover:bg-slate-900 active:scale-95 text-white font-extrabold text-xs sm:text-[13px] rounded-full flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all cursor-pointer shrink-0 border border-white/10 group"
                >
                  <span>Apply</span>
                  <span className="px-2 py-0.5 min-w-[20px] h-[20px] rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[10px] sm:text-[11px] font-black shadow-2xs group-hover:scale-105 transition-transform">
                    {matchingCount}
                  </span>
                </button>
              </div>

            </div>

          </div>
        </div>

        {/* Lower Hero Content: Banner Headline, Subtitle, and CTA Button (Bottom-Left) */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-12 md:px-16 text-left pt-3 sm:pt-4 pb-4 sm:pb-5 mt-auto pointer-events-auto">
          {(() => {
            const rawTitle = currentBanner?.title || "";
            const cleanTitle = rawTitle.replace(/\bVillaments\b/gi, "Villas");
            if (!cleanTitle && !currentBanner?.subtitle) return null;
            return (
              <div className="max-w-[90%] sm:max-w-[70%]">
                {cleanTitle && (
                  <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-white mb-1.5 sm:mb-2 drop-shadow-xl leading-tight tracking-tight">
                    {cleanTitle}
                  </h2>
                )}
                {currentBanner?.subtitle && (
                  <p className="text-xs sm:text-sm md:text-base text-slate-200 font-medium mb-2.5 sm:mb-3.5 line-clamp-2 drop-shadow-md">
                    {currentBanner.subtitle}
                  </p>
                )}
                {currentBanner?.link_url && (
                  <Link
                    href={currentBanner.link_url}
                    className="inline-flex items-center gap-2 px-5 sm:px-6 py-2 sm:py-2.5 bg-slate-950 hover:bg-slate-900 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-2xl transition-all hover:scale-105 active:scale-95 border border-white/20 hover:border-amber-400 cursor-pointer"
                  >
                    <span>{currentBanner.button_text || "Explore Now"}</span>
                    <ChevronRight className="w-4 h-4 text-amber-400" />
                  </Link>
                )}
              </div>
            );
          })()}
        </div>

        {/* Carousel Arrow Controls - positioned cleanly on outer margins */}
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-20 w-full mt-4 sm:mt-8 text-left space-y-3.5">
        {/* Header row with Title and Desktop Slider Chevrons */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
            Browse properties
          </h2>
          <div className="flex items-center gap-3">
            {/* Slide View Navigation Buttons */}
            <div className="hidden sm:flex items-center gap-1.5 ml-1">
              <button
                type="button"
                onClick={scrollLeft}
                aria-label="Previous categories"
                className="w-8 h-8 rounded-full border border-slate-200 hover:border-amber-400 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-700 flex items-center justify-center transition-all shadow-2xs active:scale-90 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
              </button>
              <button
                type="button"
                onClick={scrollRight}
                aria-label="Next categories"
                className="w-8 h-8 rounded-full border border-slate-200 hover:border-amber-400 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-700 flex items-center justify-center transition-all shadow-2xs active:scale-90 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Slide View: Smooth Horizontal Carousel for Categories ── */}
        <div
          ref={scrollContainerRef}
          className="flex items-stretch gap-3 sm:gap-4 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory py-2 -mx-4 px-4 sm:mx-0 sm:px-0"
        >
          {browseCategories.map((cat, idx) => {
            const IconComp = getCategoryIcon(cat.id, cat.title, cat.icon);

            return (
              <Link
                key={cat.id}
                href={cat.baseHref}
                className="group flex flex-col w-[220px] sm:w-[245px] md:w-[260px] shrink-0 snap-start bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer"
              >
                {/* Top Image area */}
                <div className="relative w-full h-32 sm:h-38 bg-slate-100 overflow-hidden">
                  <Image
                    src={cat.image}
                    alt={cat.title}
                    fill
                    sizes="(max-width: 640px) 220px, 260px"
                    loading={idx < 4 ? "eager" : "lazy"}
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-108"
                  />

                  {/* Badge on top-right (e.g. "Last 30 days", "Premium", "Top Pick") */}
                  {cat.badge && (
                    <div className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 text-[10px] sm:text-[11px] font-extrabold px-2.5 py-0.5 sm:py-1 rounded-full bg-white/95 text-slate-900 shadow-md border border-slate-100 backdrop-blur-md tracking-tight">
                      {cat.badge}
                    </div>
                  )}
                </div>

                {/* Bottom Bar: Overlapping Circular Icon Badge + Title & Subtitle */}
                <div className="relative bg-white px-3 sm:px-3.5 pt-2 pb-3 sm:pb-3.5 flex items-center gap-2.5 flex-1">
                  {/* Floating Circular Icon Badge */}
                  <div className="-mt-6 sm:-mt-7 shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white shadow-md border border-slate-100 flex items-center justify-center text-[#78350f] relative z-10 group-hover:scale-110 transition-transform">
                    <IconComp className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.2]" />
                  </div>

                  {/* Title & Subtitle */}
                  <div className="flex flex-col min-w-0 pr-1 text-left">
                    <span className="font-heading font-black text-xs sm:text-sm text-slate-950 group-hover:text-amber-600 transition-colors truncate">
                      {cat.title}
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate mt-0.5">
                      {cat.subtitle}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
