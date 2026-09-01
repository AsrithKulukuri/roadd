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

  const { cities } = useLocationsStore();
  const properties = usePropertiesStore((state) => state.properties);
  const projects = useProjectsStore((state) => state.projects);

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

  // Rotate search placeholder
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % NAV_SEARCH_PLACEHOLDERS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

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

  // Filtered sublocations based on selected city & search text
  const currentCityObj = useMemo(() => {
    return cities.find((c) => c.name.toLowerCase() === navSelectedCity.toLowerCase()) || cities[0];
  }, [cities, navSelectedCity]);

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

  return (
    <>
      {/* Realtor.com Style Clean Navbar */}
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-[100] h-16 flex items-center transition-all duration-300",
          pathname === "/" && isScrolled
            ? "bg-transparent border-transparent shadow-none pointer-events-none"
            : isTransparent
              ? "bg-transparent border-transparent"
              : "bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 shadow-xs",
          pathname !== "/search" && isScrolled && "max-lg:opacity-0 max-lg:pointer-events-none"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full">
          <div className="flex items-center justify-between gap-2">
            {/* Left: Brand Logo (Hides when sticky search bar is active) */}
            <div className={cn("shrink-0 transition-opacity duration-200", pathname === "/" && isScrolled && "opacity-0 pointer-events-none")}>
              <Logo size="md" textColor="text-white" />
            </div>

            {/* Center: Interactive Search Bar on Scroll OR Navigation Links */}
            <div ref={navDropdownRef} className="flex-1 min-w-0 max-w-4xl mx-auto hidden lg:flex items-center justify-center">
              <AnimatePresence mode="wait">
                {pathname === "/" && isScrolled ? (
                  <motion.div
                    key="nav-compact-search"
                    initial={{ opacity: 0, scale: 0.95, y: -8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -8 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="w-full flex items-center bg-slate-950/95 text-white border border-slate-800 rounded-full py-2 px-3 shadow-[0_14px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl gap-2 pointer-events-auto"
                  >
                    {/* Compact Logo Icon inside Pill */}
                    <div className="shrink-0 pl-1 pr-1">
                      <Logo size="sm" showText={false} href="/" />
                    </div>

                    {/* Search Input */}
                    <form
                      action="#"
                      onSubmit={handleNavSearchSubmit}
                      className="flex-1 min-w-0 flex items-center px-3 gap-2.5 border-r border-slate-800/80 mr-1"
                    >
                      <Search className="w-4.5 h-4.5 text-amber-500 shrink-0" />
                      <input
                        type="text"
                        value={navSearchQuery}
                        onChange={(e) => setNavSearchQuery(e.target.value)}
                        placeholder={`Search "${NAV_SEARCH_PLACEHOLDERS[placeholderIndex]}"...`}
                        className="w-full bg-transparent text-sm font-semibold text-white placeholder:text-slate-400 outline-none border-none p-0 focus:ring-0 focus:outline-none"
                      />
                      {navSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setNavSearchQuery("")}
                          className="p-1 text-slate-400 hover:text-white"
                        >
                          <X className="w-4 h-4" />
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
                        <div className="absolute top-full left-0 mt-3 w-80 sm:w-96 bg-slate-950/95 backdrop-blur-2xl border border-slate-800 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] p-3 z-50 animate-in fade-in zoom-in-95 space-y-3">
                          {/* City Selector Tabs */}
                          <div className="flex items-center gap-1.5 p-1 bg-slate-900/80 rounded-xl border border-slate-800/80">
                            {cities.slice(0, 4).map((city) => (
                              <button
                                key={city.id}
                                type="button"
                                onClick={() => {
                                  setNavSelectedCity(city.name);
                                  setNavLocalitySearch("");
                                }}
                                className={cn(
                                  "flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-center",
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
                            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <input
                              type="text"
                              value={navLocalitySearch}
                              onChange={(e) => setNavLocalitySearch(e.target.value)}
                              placeholder={`Search areas in ${navSelectedCity}...`}
                              className="w-full bg-transparent text-xs text-white placeholder:text-slate-500 outline-none border-none p-0 focus:ring-0"
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
                                <div className="flex items-center gap-1.5">
                                  <MapPin className="w-3 h-3 text-amber-400/80 shrink-0" />
                                  <span>{sub.name}</span>
                                </div>
                                {sub.count && (
                                  <span className="text-[10px] text-slate-400 font-medium">{sub.count}</span>
                                )}
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
                      <SlidersHorizontal className="w-4 h-4" />
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
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
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
                                : "text-slate-900 dark:text-slate-100 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                          )}
                        >
                          <span className="flex items-center gap-1">
                            {link.label}
                            {(link as any).subItems && <ChevronDown className="w-3.5 h-3.5 opacity-50 transition-transform group-hover:rotate-180" />}
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

            {/* Right Action Icons & Controls (Hides when sticky search bar is active) */}
            <div className={cn("flex items-center gap-2 sm:gap-2.5 shrink-0 transition-opacity duration-200", pathname === "/" && isScrolled && "opacity-0 pointer-events-none")}>
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
                    : "text-slate-900 dark:text-slate-100 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
                aria-label="Saved properties"
              >
                <Heart className="h-4.5 w-4.5 stroke-[2.5]" />
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
                        : "bg-slate-100 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700"
                    )}
                  >
                    <User className="w-3.5 h-3.5 text-amber-400" />
                    <span className="max-w-[75px] truncate">{user.name || "Account"}</span>
                    <ChevronDown className="w-3 h-3 opacity-60 group-hover:rotate-180 transition-transform" />
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
                          : "text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                      )}
                    >
                      Log in
                    </button>
                  </Link>
                </div>
              )}

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
                  <Link href="/dashboard" className="block">
                    <Button variant="outline" className="w-full bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-extrabold justify-start shadow-xs">
                      <User className="w-4 h-4 mr-2" /> My Dashboard ({user.name})
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
                <div className="pt-2">
                  <Link href="/login" className="block w-full">
                    <Button variant="outline" className="w-full bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-extrabold shadow-xs">
                      Log in
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
