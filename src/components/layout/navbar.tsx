"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Heart,
  Bell,
  User,
  Menu,
  X,
  Home,
  Building2,
  MapPin,
  Plus,
  ChevronDown,
  LogIn,
  LogOut,
  Megaphone,
  Sparkles,
  IndianRupee,
  SlidersHorizontal,
  Shield,
  MessageSquare,
} from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn, formatINRWords } from "@/lib/utils";
import { navigationLinks } from "@/config/site";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { toast } from "sonner";
import { logoutUser } from "@/hooks/use-auth-session";
import { PostRequirementModal } from "@/components/shared/post-requirement-modal";
import { usePropertiesStore } from "@/stores/properties-store";
import { useProjectsStore } from "@/stores/projects-store";
import { useLocationsStore } from "@/stores/locations-store";
import { useContentStore, DEFAULT_DESKTOP_SEARCH_PHRASES } from "@/stores/content-store";
import { Slider } from "@/components/ui/slider";

const NAV_SEARCH_PLACEHOLDERS = [
  "Vijayawada",
  "Guntur",
  "Benz Circle",
  "Amaravati Road",
  "Poranki",
  "Gorantla",
  "CRDA Ventures",
];

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isRequirementModalOpen, setIsRequirementModalOpen] = useState(false);
  const [openMobileSubmenus, setOpenMobileSubmenus] = useState<Record<string, boolean>>({});
  const [user, setUser] = useState<any>(null);

  // Compact Navbar Search States
  const [navSearchQuery, setNavSearchQuery] = useState("");
  const [navBudget, setNavBudget] = useState<[number, number]>([1000000, 30000000]);
  const [openNavDropdown, setOpenNavDropdown] = useState<"location" | "budget" | null>(null);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [navSelectedCity, setNavSelectedCity] = useState<string>("Vijayawada");
  const [navLocalitySearch, setNavLocalitySearch] = useState<string>("");
  const navDropdownRef = useRef<HTMLDivElement>(null);

  const { cities, fetchLocations } = useLocationsStore();
  const properties = usePropertiesStore((state) => state.properties);
  const projects = useProjectsStore((state) => state.projects);

  // Fetch admin master locations on mount
  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  // Admin-configured Hero Cities (matching hero-section pills exactly)
  const heroCities = useMemo(() => {
    const pills = cities.filter((c) => c.isHeroPill);
    return pills.length > 0 ? pills : cities.slice(0, 3);
  }, [cities]);

  // Auto-sync active selected city with available admin hero cities
  useEffect(() => {
    if (heroCities.length > 0 && !heroCities.some((c) => c.name.toLowerCase() === navSelectedCity.toLowerCase())) {
      setNavSelectedCity(heroCities[0].name);
    }
  }, [heroCities, navSelectedCity]);

  const matchingCount = useMemo(() => {
    let count = 0;
    const isAnyMax = navBudget[1] >= 30000000;
    count = properties.filter((p) => {
      if (p.status === "sold" || p.status === "archived" || p.status === "hidden") return false;
      return p.price >= navBudget[0] && (isAnyMax || p.price <= navBudget[1]);
    }).length;

    count += projects.filter((p) => {
      if (!p.configurations || p.configurations.length === 0) return false;
      return p.configurations.some((cfg) => {
        const pMin = cfg.priceMin || 0;
        const pMax = cfg.priceMax || pMin;
        return (isAnyMax || pMin <= navBudget[1]) && pMax >= navBudget[0];
      });
    }).length;

    return count;
  }, [properties, projects, navBudget]);

  // ── Animated Typewriter Effect in Sticky Search Bar ──
  const { searchTypewriterPhrasesDesktop } = useContentStore();
  const [navTypedText, setNavTypedText] = useState("");
  const [navIsDeleting, setNavIsDeleting] = useState(false);
  const [navLoopNum, setNavLoopNum] = useState(0);
  const [navTypingSpeed, setNavTypingSpeed] = useState(60);

  const activeNavSuggestions = useMemo(() => {
    return (searchTypewriterPhrasesDesktop && searchTypewriterPhrasesDesktop.length > 0)
      ? searchTypewriterPhrasesDesktop
      : DEFAULT_DESKTOP_SEARCH_PHRASES;
  }, [searchTypewriterPhrasesDesktop]);

  useEffect(() => {
    if (!activeNavSuggestions || activeNavSuggestions.length === 0) return;
    const currentFullText = activeNavSuggestions[navLoopNum % activeNavSuggestions.length];

    const handleType = () => {
      if (navIsDeleting) {
        setNavTypedText(currentFullText.substring(0, navTypedText.length - 1));
        setNavTypingSpeed(25);
      } else {
        setNavTypedText(currentFullText.substring(0, navTypedText.length + 1));
        setNavTypingSpeed(55);
      }

      if (!navIsDeleting && navTypedText === currentFullText) {
        setTimeout(() => setNavIsDeleting(true), 2200);
      } else if (navIsDeleting && navTypedText === "") {
        setNavIsDeleting(false);
        setNavLoopNum((prev) => prev + 1);
        setNavTypingSpeed(350);
      }
    };

    const timer = setTimeout(handleType, navTypingSpeed);
    return () => clearTimeout(timer);
  }, [navTypedText, navIsDeleting, navLoopNum, navTypingSpeed, activeNavSuggestions]);

  const handleNavSearchSubmit = (e?: React.FormEvent, customLocation?: string) => {
    if (e) e.preventDefault();
    const params = new URLSearchParams();
    params.set("type", "buy");
    const loc = customLocation !== undefined ? customLocation : navSearchQuery.trim();
    if (loc) {
      params.set("location", loc);
    }
    const isAnyMax = navBudget[1] >= 30000000;
    if (navBudget[0] > 1000000 || !isAnyMax) {
      params.set("budget", `${navBudget[0]},${isAnyMax ? 100000000 : navBudget[1]}`);
    }
    router.push(`/search?${params.toString()}`);
  };

  const formatNavBudgetDisplay = () => {
    const minStr = navBudget[0] > 1000000 ? formatINRWords(navBudget[0]) : "Min";
    const maxStr = navBudget[1] < 30000000 ? formatINRWords(navBudget[1], true) : "Any";
    if (minStr === "Min" && maxStr === "Any") return "Budget";
    return `${minStr} - ${maxStr}`;
  };

  // Filtered sublocations based on selected admin hero city & search text
  const currentCityObj = useMemo(() => {
    return heroCities.find((c) => c.name.toLowerCase() === navSelectedCity.toLowerCase()) || heroCities[0];
  }, [heroCities, navSelectedCity]);

  const filteredSublocations = useMemo(() => {
    if (!currentCityObj?.sublocations) return [];
    if (!navLocalitySearch.trim()) return currentCityObj.sublocations;
    const q = navLocalitySearch.toLowerCase().trim();
    return currentCityObj.sublocations.filter((sub) => sub.name.toLowerCase().includes(q));
  }, [currentCityObj, navLocalitySearch]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navDropdownRef.current && !navDropdownRef.current.contains(e.target as Node)) {
        setOpenNavDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleMobileSubmenu = (label: string) => {
    setOpenMobileSubmenus(prev => ({ ...prev, [label]: !prev[label] }));
  };

  useEffect(() => {
    const handleScroll = () => {
      // On home page, trigger immediately when scrolling past hero search input (160px)
      const threshold = pathname === "/" ? 160 : 20;
      setIsScrolled(window.scrollY > threshold);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [pathname]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  // Load user session from Supabase or localStorage
  useEffect(() => {
    const checkUser = async () => {
      if (isSupabaseConfigured()) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const u = session.user;
            setUser({
              name: u.user_metadata?.full_name || u.user_metadata?.name || "User",
            });
            return;
          }
        } catch (e) {
          console.error("Error fetching navbar user session:", e);
        }
      }
      
      const stored = localStorage.getItem("road_user");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.isLoggedIn) {
            setUser(parsed);
            return;
          }
        } catch (e) {}
      }
      setUser(null);
    };

    checkUser();

    if (isSupabaseConfigured()) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (session?.user) {
          const u = session.user;
          setUser({
            name: u.user_metadata?.full_name || u.user_metadata?.name || "User",
          });
        } else {
          const stored = localStorage.getItem("road_user");
          if (!stored) {
            setUser(null);
          }
        }
      });
      return () => subscription.unsubscribe();
    }
  }, []);

  const handleSignOut = async () => {
    await logoutUser();
    setUser(null);
    toast.success("Signed out successfully");
    window.location.href = "/";
  };

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    
    const [path, query] = href.split("?");
    if (pathname !== path) return false;

    if (query) {
      const urlParams = new URLSearchParams(query);
      
      // Check if all link parameters exist in the current URL
      for (const [key, value] of urlParams.entries()) {
        if (searchParams.get(key) !== value) {
          return false;
        }
      }
      
      // Prevent general links (like Buy) from being active when a more specific category is selected
      if (path === "/search" && !urlParams.has("propertyType") && searchParams.has("propertyType")) {
        return false;
      }
      
      return true;
    }
    
    return pathname.startsWith(path);
  };

  const isTransparent = pathname === "/" && !isScrolled;
  const isSearchPage = pathname === "/search" || pathname === "/properties";

  // Hide Road Facing top navbar on search and properties pages in both map and list view
  if (isSearchPage) {
    return null;
  }

  return (
    <>
      {/* Realtor.com Style Clean Navbar */}
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-[100] h-16 flex items-center transition-all duration-300 ease-in-out",
          isTransparent
            ? "bg-transparent border-b border-transparent shadow-none"
            : "bg-slate-950/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-800/90 shadow-md",
          isSearchPage
            ? (isScrolled ? "-translate-y-full opacity-0 pointer-events-none" : "translate-y-0 opacity-100")
            : (isScrolled && "max-lg:opacity-0 max-lg:pointer-events-none")
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full">
          <div className="flex items-center justify-between gap-3">
            {/* Left: Brand Logo */}
            <div className="shrink-0">
              <Logo size="md" textColor="text-white" isDarkBg />
            </div>

            {/* Center: Interactive Search Bar on Scroll OR Navigation Links */}
            <div ref={navDropdownRef} className="flex-1 min-w-0 max-w-5xl mx-2 sm:mx-4 hidden lg:flex items-center justify-center">
              <AnimatePresence mode="wait">
                {pathname === "/" && isScrolled ? (
                  <motion.div
                    key="nav-compact-search"
                    initial={{ opacity: 0, scale: 0.95, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -6 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="w-full flex items-center bg-slate-900/95 text-white border border-slate-800 rounded-full py-1.5 px-2.5 shadow-sm gap-2"
                  >
                    {/* Search Input */}
                    <form
                      action="#"
                      onSubmit={handleNavSearchSubmit}
                      className="flex-1 min-w-0 flex items-center px-2.5 gap-2 border-r border-slate-800/80 mr-1 outline-none ring-0 shadow-none"
                    >
                      <Search className="w-4 h-4 text-amber-500 shrink-0" />
                      <input
                        type="text"
                        value={navSearchQuery}
                        onChange={(e) => setNavSearchQuery(e.target.value)}
                        placeholder={navTypedText.toLowerCase().startsWith("search") ? navTypedText : `Search "${navTypedText}"...`}
                        style={{ outline: "none", boxShadow: "none" }}
                        className="w-full bg-transparent text-xs font-semibold text-white placeholder:text-slate-400 border-none outline-none ring-0 shadow-none focus:outline-none focus:ring-0 focus:border-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:shadow-none focus-visible:shadow-none p-0"
                      />
                      {navSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setNavSearchQuery("")}
                          className="p-0.5 text-slate-400 hover:text-white"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </form>

                    {/* Locations & Sublocations Dropdown Pill */}
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        onClick={() => setOpenNavDropdown(openNavDropdown === "location" ? null : "location")}
                        className={cn(
                          "h-9 px-3.5 rounded-full text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap",
                          openNavDropdown === "location"
                            ? "bg-amber-500 text-slate-950 shadow-xs"
                            : "text-slate-200 hover:bg-white/10"
                        )}
                      >
                        <MapPin className={cn("w-3.5 h-3.5", openNavDropdown === "location" ? "text-slate-950" : "text-amber-500")} />
                        <span>{navSelectedCity || "Locations"}</span>
                        <ChevronDown className={cn("w-3.5 h-3.5 opacity-75 transition-transform duration-200", openNavDropdown === "location" && "rotate-180")} />
                      </button>

                      {openNavDropdown === "location" && (
                        <div className="absolute top-full left-0 mt-3 w-[350px] sm:w-[380px] max-w-[90vw] bg-slate-950/95 backdrop-blur-2xl border border-slate-800 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] p-3.5 z-50 animate-in fade-in zoom-in-95 space-y-3">
                          {/* City Selector Tabs — Admin Configured Hero Cities Only */}
                          <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 rounded-xl border border-slate-800/90 overflow-x-auto no-scrollbar">
                            {heroCities.map((city) => (
                              <button
                                key={city.id}
                                type="button"
                                onClick={() => {
                                  setNavSelectedCity(city.name);
                                  setNavLocalitySearch("");
                                }}
                                className={cn(
                                  "flex-1 min-w-[80px] py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center whitespace-nowrap",
                                  navSelectedCity.toLowerCase() === city.name.toLowerCase()
                                    ? "bg-amber-500 text-slate-950 shadow-xs font-extrabold"
                                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                                )}
                              >
                                {city.name}
                              </button>
                            ))}
                          </div>

                          {/* Quick Locality Search Input */}
                          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 gap-2">
                            <Search strokeWidth={2.5} className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <input
                              type="text"
                              value={navLocalitySearch}
                              onChange={(e) => setNavLocalitySearch(e.target.value)}
                              placeholder={`Search areas in ${navSelectedCity}...`}
                              style={{ outline: "none", boxShadow: "none" }}
                              className="w-full bg-transparent text-xs text-white placeholder:text-slate-500 border-none outline-none ring-0 shadow-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 p-0"
                            />
                            {navLocalitySearch && (
                              <button type="button" onClick={() => setNavLocalitySearch("")} className="text-slate-400 hover:text-white">
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          {/* Sublocations List */}
                          <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                            {/* All City Option */}
                            <div
                              onClick={() => {
                                setOpenNavDropdown(null);
                                setNavSearchQuery(navSelectedCity);
                                handleNavSearchSubmit(undefined, navSelectedCity);
                              }}
                              className="px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 cursor-pointer flex items-center justify-between text-xs font-black text-amber-400 transition-all"
                            >
                              <span>Explore All {navSelectedCity}</span>
                              <span className="text-[10px] bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded-full font-black">All</span>
                            </div>

                            {/* Sublocation Chips */}
                            {filteredSublocations.map((sub) => (
                              <div
                                key={sub.id}
                                onClick={() => {
                                  setOpenNavDropdown(null);
                                  setNavSearchQuery(sub.name);
                                  handleNavSearchSubmit(undefined, sub.name);
                                }}
                                className="px-3 py-2 rounded-xl hover:bg-slate-900 cursor-pointer flex items-center justify-between text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
                                  <span>{sub.name}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Budget Dropdown Pill */}
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        onClick={() => setOpenNavDropdown(openNavDropdown === "budget" ? null : "budget")}
                        className={cn(
                          "h-9 px-3.5 rounded-full text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap",
                          openNavDropdown === "budget" || navBudget[0] > 1000000 || navBudget[1] < 30000000
                            ? "bg-[#008075] text-white shadow-xs"
                            : "text-slate-200 hover:bg-white/10"
                        )}
                      >
                        <IndianRupee className="w-3.5 h-3.5" />
                        <span>{formatNavBudgetDisplay()}</span>
                        <ChevronDown className={cn("w-3.5 h-3.5 opacity-75 transition-transform duration-200", openNavDropdown === "budget" && "rotate-180")} />
                      </button>

                      {openNavDropdown === "budget" && (
                        <div className="absolute top-full right-0 mt-3 w-72 bg-slate-950/95 backdrop-blur-2xl border border-slate-800 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] p-4 z-50 animate-in fade-in zoom-in-95 space-y-3.5">
                          <div className="flex justify-between items-center text-xs font-bold text-white">
                            <span>Budget Range</span>
                            <span className="text-[#00c5b5] font-black">
                              {formatINRWords(navBudget[0])} – {formatINRWords(navBudget[1], true)}
                            </span>
                          </div>
                          <Slider
                            min={1000000}
                            max={30000000}
                            step={500000}
                            value={navBudget}
                            onValueChange={(val) => setNavBudget(val as [number, number])}
                            className="w-full py-2"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setOpenNavDropdown(null);
                              handleNavSearchSubmit();
                            }}
                            className="w-full py-2 text-xs font-black bg-[#008075] hover:bg-[#006e64] text-white rounded-xl cursor-pointer transition-all shadow-xs"
                          >
                            Apply Budget
                          </button>
                        </div>
                      )}
                    </div>

                    {/* All Filters Button - Directly opens filters modal on search page */}
                    <button
                      type="button"
                      onClick={() => router.push("/search?openFilters=true")}
                      title="Open Filters"
                      className="w-9 h-9 rounded-full bg-slate-900 hover:bg-amber-500/20 text-slate-200 hover:text-amber-400 flex items-center justify-center border border-slate-800 transition-all cursor-pointer shrink-0"
                    >
                      <SlidersHorizontal strokeWidth={2.5} className="w-4 h-4 text-amber-400" />
                    </button>

                    {/* Apply CTA Button */}
                    <button
                      type="button"
                      onClick={() => handleNavSearchSubmit()}
                      className="h-9 px-4.5 bg-[#f1a010] hover:bg-amber-500 active:scale-95 text-slate-950 font-black text-xs rounded-full flex items-center gap-1.5 shadow-xs transition-all cursor-pointer shrink-0"
                    >
                      <span>Apply</span>
                      <span className="px-1.5 py-0.5 rounded-full bg-slate-950 text-white font-black text-[10px]">
                        {matchingCount}
                      </span>
                    </button>
                  </motion.div>
                ) : (
                  <motion.nav
                    key="nav-links"
                    initial={{ scale: 0.98 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0.98 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="flex items-center gap-1"
                    role="navigation"
                    aria-label="Main navigation"
                  >
                    {navigationLinks.main.map((link) => (
                      <div key={link.href} className="relative group">
                        <Link
                          href={link.href}
                          className={cn(
                            "relative px-4 py-2 text-sm font-bold rounded-xl transition-all duration-200 block",
                            isActive(link.href)
                              ? "text-amber-500 font-black"
                              : isTransparent
                                ? "text-white hover:text-amber-400 hover:bg-white/10"
                                : "text-white hover:text-amber-400 hover:bg-white/10"
                          )}
                        >
                          <span className="flex items-center gap-1">
                            {link.label}
                            {(link as any).subItems && <ChevronDown strokeWidth={2.5} className="w-3.5 h-3.5 text-amber-400 transition-transform group-hover:rotate-180" />}
                          </span>
                          {isActive(link.href) && (
                            <motion.div
                              layoutId="navbarIndicator"
                              className="absolute bottom-0 left-3 right-3 h-0.5 bg-amber-500 rounded-full"
                              transition={{ type: "spring", stiffness: 500, damping: 35 }}
                            />
                          )}
                        </Link>

                        {/* Desktop Dropdown */}
                        {(link as any).subItems && (
                          <div className="absolute top-full left-0 pt-2 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden py-2">
                              {(link as any).subItems.map((subItem: any) => (
                                <Link
                                  key={subItem.href}
                                  href={subItem.href}
                                  className="block px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-amber-500 dark:hover:text-amber-400"
                                >
                                  {subItem.label}
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </motion.nav>
                )}
              </AnimatePresence>
            </div>

            {/* Right Action Icons & Controls */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              <div className="hidden sm:block">
                <ThemeToggle />
              </div>

              {/* Saved Items Heart Button */}
              <Link
                href="/dashboard/saved"
                className={cn(
                  "hidden sm:inline-flex p-2 rounded-xl transition-colors",
                  isTransparent
                    ? "text-white hover:bg-white/15"
                    : "text-white hover:text-amber-400 hover:bg-white/10"
                )}
                aria-label="Saved properties"
              >
                <Heart strokeWidth={2.5} className="h-4.5 w-4.5 text-amber-400" />
              </Link>

              {user ? (
                /* Compact User Account Dropdown for Desktop */
                <div className="hidden sm:block relative group">
                  <Link
                    href="/dashboard"
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border",
                      isTransparent
                        ? "bg-black/35 text-white hover:bg-black/55 border-white/20 backdrop-blur-md"
                        : "bg-white/10 text-white hover:bg-white/15 border-white/20 backdrop-blur-md"
                    )}
                  >
                    <User strokeWidth={2.5} className="w-3.5 h-3.5 text-amber-400" />
                    <span className="max-w-[75px] truncate">{user.name || "Account"}</span>
                    <ChevronDown strokeWidth={2.5} className="w-3 h-3 text-amber-400 group-hover:rotate-180 transition-transform" />
                  </Link>

                  {/* Dropdown Menu */}
                  <div className="absolute top-full right-0 pt-2 w-44 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden py-1 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                      <Link href="/dashboard" className="flex items-center gap-2 px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold transition-colors">
                        <User className="w-3.5 h-3.5 text-amber-500" /> Dashboard
                      </Link>
                      <Link href="/dashboard/listings" className="flex items-center gap-2 px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold transition-colors">
                        <Building2 className="w-3.5 h-3.5 text-amber-500" /> My Listings
                      </Link>
                      <button
                        onClick={handleSignOut}
                        className="w-full text-left flex items-center gap-2 px-3.5 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 font-semibold cursor-pointer transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" /> Sign Out
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Auth Login Link for Desktop */
                <div className="hidden sm:flex items-center">
                  <Link href="/login">
                    <button
                      type="button"
                      className={cn(
                        "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer",
                        isTransparent
                          ? "text-white hover:bg-white/15"
                          : "text-white hover:bg-white/15"
                      )}
                    >
                      Log in
                    </button>
                  </Link>
                </div>
              )}

              {/* Post Requirement & List Property (Hidden when scrolled on home page so search bar gets maximum space) */}
              {!(pathname === "/" && isScrolled) && (
                <>
                  {/* Post Requirement CTA Button */}
                  <button
                    onClick={() => setIsRequirementModalOpen(true)}
                    className={cn(
                      "hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap shadow-xs active:scale-95 transition-all cursor-pointer shrink-0 border",
                      isTransparent
                        ? "bg-slate-950/90 hover:bg-slate-900 text-white border-white/25 backdrop-blur-md hover:border-amber-400"
                        : "bg-slate-950 hover:bg-slate-900 text-white border-slate-800 hover:border-amber-400"
                    )}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20 shrink-0" />
                    <span className="whitespace-nowrap">Post Requirement</span>
                  </button>

                  {/* List Property CTA Button */}
                  <Link href="/list-with-us" className="hidden md:block">
                    <Button size="sm" className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-full shadow-xs px-4 h-8 text-xs border-0">
                      <Plus className="h-3.5 w-3.5 stroke-[3]" />
                      List Property
                    </Button>
                  </Link>
                </>
              )}

            </div>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed inset-0 top-[60px] z-50 bg-white/98 backdrop-blur-md lg:hidden flex flex-col p-6 overflow-y-auto"
          >
            {/* Quick Post Requirement Button in Mobile Menu */}
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                setIsRequirementModalOpen(true);
              }}
              className="w-full py-3.5 px-4 mb-4 rounded-2xl bg-slate-950 hover:bg-slate-900 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg active:scale-98 transition-all cursor-pointer border border-slate-800"
            >
              <Sparkles className="w-4 h-4 text-amber-400 fill-amber-400/20" />
              <span>Post Your Requirement</span>
            </button>

            <nav className="flex flex-col gap-2">
              {navigationLinks.main.map((link) => (
                <div key={link.href} className="flex flex-col">
                  <div className="flex items-center justify-between">
                    <Link
                      href={link.href}
                      className={cn(
                        "flex-1 px-4 py-3 rounded-xl font-semibold text-base transition-colors",
                        isActive(link.href)
                          ? "bg-amber-500/10 text-amber-600 font-bold"
                          : "text-slate-700 hover:bg-slate-100"
                      )}
                      onClick={(e) => {
                        // If it has subItems and is clicked, we just navigate. The toggle handles expanding.
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      {link.label}
                    </Link>
                    {(link as any).subItems && (
                      <button
                        onClick={() => toggleMobileSubmenu(link.label)}
                        className="p-3 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                      >
                        <ChevronDown className={cn("w-5 h-5 transition-transform", openMobileSubmenus[link.label] && "rotate-180")} />
                      </button>
                    )}
                  </div>
                  
                  {/* Mobile Submenu */}
                  {(link as any).subItems && openMobileSubmenus[link.label] && (
                    <div className="flex flex-col ml-6 border-l-2 border-slate-200 dark:border-slate-800 pl-4 mt-1 space-y-1">
                      {(link as any).subItems.map((subItem: any) => (
                        <Link
                          key={subItem.href}
                          href={subItem.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-amber-500 rounded-lg"
                        >
                          {subItem.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>

            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <Link href="/list-with-us" className="block w-full">
                <Button className="w-full gap-2 bg-slate-900 hover:bg-slate-800 text-white font-black py-6 text-base shadow-md">
                  <Plus className="h-5 w-5 stroke-[3] text-amber-400" />
                  List Property Free
                </Button>
              </Link>

              {user ? (
                <div className="space-y-2 pt-2">
                  {user.role === "admin" && (
                    <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                      <div className="text-[11px] font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" /> Staff Administrator
                      </div>
                      <Link href="/admin/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="block">
                        <Button className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black justify-start shadow-xs">
                          <Shield className="w-4 h-4 mr-2" /> Admin Control Center
                        </Button>
                      </Link>
                      <Link href="/admin/support" onClick={() => setIsMobileMenuOpen(false)} className="block">
                        <Button variant="outline" className="w-full bg-slate-900 border-amber-500/30 text-amber-400 font-bold justify-start text-xs">
                          <MessageSquare className="w-4 h-4 mr-2" /> Live Support Desk
                        </Button>
                      </Link>
                    </div>
                  )}
                  <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="block">
                    <Button variant="outline" className="w-full bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-extrabold justify-start shadow-xs">
                      <User className="w-4 h-4 mr-2" /> My Profile ({user.name})
                    </Button>
                  </Link>
                  <Button
                    onClick={handleSignOut}
                    variant="ghost"
                    className="w-full text-red-600 dark:text-red-400 font-extrabold hover:bg-slate-100 dark:hover:bg-slate-800 justify-start"
                  >
                    <LogOut className="w-4 h-4 mr-2" /> Sign Out
                  </Button>
                </div>
              ) : (
                <div className="pt-2 space-y-2">
                  <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="block w-full">
                    <Button variant="outline" className="w-full bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-extrabold shadow-xs">
                      Log in
                    </Button>
                  </Link>
                  <Link href="/admin/login" onClick={() => setIsMobileMenuOpen(false)} className="block w-full">
                    <Button variant="ghost" className="w-full text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-amber-500 flex items-center justify-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-amber-500" /> Admin Portal Sign In
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Post Your Requirement Modal */}
      <PostRequirementModal
        isOpen={isRequirementModalOpen}
        onClose={() => setIsRequirementModalOpen(false)}
      />
    </>
  );
}
