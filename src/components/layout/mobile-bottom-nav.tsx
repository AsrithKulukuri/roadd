"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Home, Search, MapPin, Heart, Menu, X, Sparkles, Plus, User, LogOut, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFavoritesStore } from "@/stores/favorites-store";
import { usePropertiesStore } from "@/stores/properties-store";
import { useProjectsStore } from "@/stores/projects-store";
import { motion, AnimatePresence } from "framer-motion";
import { navigationLinks } from "@/config/site";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { toast } from "sonner";
import { PostRequirementModal } from "@/components/shared/post-requirement-modal";
import { haptic } from "@/lib/haptics";

export function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMapView = (pathname === "/search" && searchParams.get("view") === "map") || pathname === "/properties/map";

  const savedPropertyIds = useFavoritesStore((state) => state.savedPropertyIds);
  const setSavedPropertyIds = useFavoritesStore((state) => state.setSavedPropertyIds);
  const syncWithSupabase = useFavoritesStore((state) => state.syncWithSupabase);
  const storeProperties = usePropertiesStore((state) => state.properties);
  const fetchProperties = usePropertiesStore((state) => state.fetchProperties);
  const storeProjects = useProjectsStore((state) => state.projects);
  const fetchProjects = useProjectsStore((state) => state.fetchProjects);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRequirementModalOpen, setIsRequirementModalOpen] = useState(false);
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showMapTooltip, setShowMapTooltip] = useState(false);

  useEffect(() => {
    // Show map discovery tooltip once for 3 seconds on initial home visit
    try {
      const hasSeen = sessionStorage.getItem("road_map_tooltip_seen");
      if (!hasSeen && pathname === "/") {
        setShowMapTooltip(true);
        sessionStorage.setItem("road_map_tooltip_seen", "true");
        const timer = setTimeout(() => {
          setShowMapTooltip(false);
        }, 3200);
        return () => clearTimeout(timer);
      }
    } catch (e) {}
  }, [pathname]);

  useEffect(() => {
    setMounted(true);
    syncWithSupabase();
    fetchProperties();
    fetchProjects();
  }, [syncWithSupabase, fetchProperties, fetchProjects]);

  // Valid active ID set from both properties and projects
  const validIdSet = useMemo(() => {
    const set = new Set<string>();
    storeProperties.forEach((p) => set.add(p.id));
    storeProjects.forEach((p) => set.add(p.id));
    return set;
  }, [storeProperties, storeProjects]);

  // Purge any orphan/phantom IDs that do not match active properties or projects
  useEffect(() => {
    if (mounted && (storeProperties.length > 0 || storeProjects.length > 0)) {
      const cleanIds = savedPropertyIds.filter((id) => validIdSet.has(id));
      if (cleanIds.length !== savedPropertyIds.length) {
        setSavedPropertyIds(cleanIds);
      }
    }
  }, [mounted, savedPropertyIds, validIdSet, storeProperties.length, storeProjects.length, setSavedPropertyIds]);

  const savedCount = useMemo(() => {
    if (!mounted || !savedPropertyIds || savedPropertyIds.length === 0) return 0;
    // If stores haven't loaded yet, default to 0 to prevent ghost badge flashes
    if (storeProperties.length === 0 && storeProjects.length === 0) return 0;
    return savedPropertyIds.filter((id) => validIdSet.has(id)).length;
  }, [mounted, savedPropertyIds, validIdSet, storeProperties.length, storeProjects.length]);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname, searchParams]);

  // Lock body scroll when mobile menu sheet is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  // Load user session
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
          console.error("Error fetching mobile nav user session:", e);
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
  }, [pathname, isMenuOpen]);

  const isDetailPage = 
    (pathname.startsWith("/properties/") && pathname !== "/properties" && pathname !== "/properties/map" && pathname !== "/properties/compare") ||
    (pathname.startsWith("/projects/") && pathname !== "/projects");

  if (isDetailPage || isMapView) {
    return null;
  }

  const handleSignOut = async () => {
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem("road_user");
    setUser(null);
    toast.success("Signed out successfully");
    setIsMenuOpen(false);
    router.refresh();
  };

  const navItems = [
    {
      id: "home",
      label: "Home",
      href: "/",
      icon: Home,
      isActive: pathname === "/",
    },
    {
      id: "search",
      label: "Search",
      href: "/search",
      icon: Search,
      isActive: (pathname.startsWith("/search") && !isMapView) || pathname.startsWith("/properties") || pathname.startsWith("/projects"),
    },
    {
      id: "map",
      label: "Map",
      href: "/search?view=map",
      icon: MapPin,
      isActive: isMapView,
    },
    {
      id: "activity",
      label: "Activity",
      href: "/dashboard/saved",
      icon: Heart,
      isActive: pathname.startsWith("/dashboard/saved") || pathname === "/dashboard",
      count: savedCount > 0 ? savedCount : undefined,
    },
    {
      id: "menu",
      label: "Menu",
      onClick: () => setIsMenuOpen(!isMenuOpen),
      icon: Menu,
      isActive: isMenuOpen,
    },
  ];

  const menuLinks = [
    { label: "New Projects", href: "/search?type=projects" },
    { label: "Gated Communities", href: "/search?type=buy&propertyType=gated-community" },
    { label: "Commercial", href: "/search?type=buy&propertyType=commercial" },
    { label: "Agriculture", href: "/search?type=buy&propertyType=agricultural-land" },
  ];

  return (
    <>
      {/* ── Fixed Mobile Bottom Nav Bar ── */}
      <nav 
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 sm:hidden bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl border-t border-slate-200/80 dark:border-slate-800/80 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] py-1.5 px-3 safe-bottom"
      >
        <div className="grid grid-cols-5 items-center justify-around max-w-md mx-auto relative">
          {navItems.map((item) => {
            const Icon = item.icon;

            // Highlighted Raised Center Map Action
            if (item.id === "map") {
              return (
                <div key={item.id} className="relative flex justify-center items-center">
                  {/* First-visit Map Tooltip */}
                  <AnimatePresence>
                    {showMapTooltip && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.9 }}
                        transition={{ duration: 0.2 }}
                        className="absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-slate-950 text-white border border-amber-400/60 shadow-xl text-[9px] font-extrabold whitespace-nowrap z-50 flex items-center gap-1 pointer-events-none"
                      >
                        <Sparkles className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                        <span>Explore on map</span>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-950" />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <Link
                    href={item.href || "/search?view=map"}
                    onClick={() => haptic.medium()}
                    className="flex flex-col items-center justify-center -mt-3.5 group cursor-pointer"
                  >
                    <motion.div
                      whileTap={{ scale: 0.9 }}
                      className={cn(
                        "w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 relative border shadow-md",
                        item.isActive
                          ? "bg-amber-500 border-amber-300 text-slate-950 shadow-[0_4px_16px_rgba(245,158,11,0.45)] ring-2 ring-amber-500/30"
                          : "bg-slate-900 border-amber-500/50 text-amber-400 shadow-[0_3px_12px_rgba(0,0,0,0.25)] hover:border-amber-400 hover:scale-105"
                      )}
                    >
                      <MapPin
                        className={cn(
                          "w-5 h-5 transition-transform duration-200",
                          item.isActive ? "stroke-[2.5] scale-110" : "stroke-[2.2]"
                        )}
                      />
                      {/* Subtle location accent dot */}
                      <span
                        className={cn(
                          "absolute top-2 right-2 w-1.5 h-1.5 rounded-full",
                          item.isActive ? "bg-slate-950" : "bg-amber-400 ring-1 ring-slate-900"
                        )}
                      />
                    </motion.div>

                    <span
                      className={cn(
                        "text-[10px] tracking-tight mt-0.5 leading-tight font-extrabold",
                        item.isActive
                          ? "text-amber-500 dark:text-amber-400 font-black"
                          : "text-slate-700 dark:text-slate-200"
                      )}
                    >
                      {item.label}
                    </span>
                  </Link>
                </div>
              );
            }

            const content = (
              <motion.div
                whileTap={{ scale: 0.92 }}
                className={cn(
                  "flex flex-col items-center justify-center py-1 rounded-2xl transition-all relative cursor-pointer group",
                  item.isActive
                    ? "text-amber-600 dark:text-amber-400 font-extrabold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium"
                )}
              >
                {/* Active Tab Spring Glow Pill */}
                {item.isActive && (
                  <motion.div
                    layoutId="mobileNavActivePill"
                    className="absolute inset-0 bg-amber-500/10 dark:bg-amber-400/15 rounded-2xl -z-10"
                    transition={{ type: "spring", stiffness: 450, damping: 30 }}
                  />
                )}

                {/* Icon Container with Badge */}
                <div className="relative flex items-center justify-center">
                  <Icon
                    className={cn(
                      "w-5 h-5 transition-transform duration-200",
                      item.isActive ? "stroke-[2.5] scale-105" : "stroke-[1.8]"
                    )}
                  />

                  {/* Heart / Activity Saved Count Badge with Spring Bounce */}
                  <AnimatePresence>
                    {typeof item.count === "number" && item.count > 0 && (
                      <motion.span
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 22 }}
                        className="absolute -top-1.5 -right-2 px-1.5 py-0.2 min-w-[15px] text-center rounded-full bg-red-600 text-white text-[8px] font-black leading-tight shadow-md"
                      >
                        {item.count}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>

                {/* Text Label */}
                <span className="text-[10px] tracking-tight mt-1 leading-tight">
                  {item.label}
                </span>
              </motion.div>
            );

            if (item.onClick) {
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    haptic.selection();
                    item.onClick();
                  }}
                  className="w-full text-center"
                >
                  {content}
                </button>
              );
            }

            return (
              <Link 
                key={item.id} 
                href={item.href} 
                onClick={() => haptic.selection()}
                className="w-full text-center"
              >
                {content}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ── Mobile Full Menu Page / Slide-in Drawer ── */}
      <AnimatePresence>
        {isMenuOpen && (
          <div className="fixed inset-0 z-50 sm:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Slide-in Menu View - Only takes required space */}
            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 32 }}
              className="absolute inset-x-0 bottom-0 max-h-[85vh] bg-white dark:bg-slate-950 rounded-t-3xl border-t border-slate-200 dark:border-slate-800 shadow-2xl overflow-y-auto p-5 pb-8"
            >
              <div>
                {/* Drag handle & Header Close Row */}
                <div className="relative flex items-center justify-between pb-3 mb-1">
                  <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full pointer-events-none" />
                  <div className="flex-1" />
                  <button
                    type="button"
                    onClick={() => setIsMenuOpen(false)}
                    aria-label="Close"
                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-100 flex items-center justify-center transition-all cursor-pointer shrink-0 z-10 active:scale-95 shadow-xs"
                  >
                    <X className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>

                {/* 1. Post Your Requirement Big Black Pill Button */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsRequirementModalOpen(true);
                  }}
                  className="w-full py-3.5 px-4 mb-6 rounded-2xl bg-slate-950 hover:bg-slate-900 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl active:scale-98 transition-all cursor-pointer border border-slate-800"
                >
                  <Sparkles className="w-4 h-4 text-amber-400 fill-amber-400/20" />
                  <span>Post Your Requirement</span>
                </button>

                {/* 2. Navigation Links */}
                <div className="flex flex-col space-y-4 px-1">
                  {menuLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsMenuOpen(false)}
                      className="font-bold text-[15px] text-slate-800 dark:text-slate-200 hover:text-amber-500 transition-colors"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>

                {/* 3. Divider */}
                <div className="my-6 border-t border-slate-100 dark:border-slate-800/80" />

                {/* 4. Action Buttons */}
                <div className="space-y-3">
                  {/* List Property Free Black Button */}
                  <Link
                    href="/list-with-us"
                    onClick={() => setIsMenuOpen(false)}
                    className="w-full py-3.5 px-4 rounded-2xl bg-slate-950 hover:bg-slate-900 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg active:scale-98 transition-all border border-slate-800"
                  >
                    <Plus className="w-4 h-4 stroke-[3] text-amber-400" />
                    <span>List Property Free</span>
                  </Link>

                  {/* My Dashboard or Log In */}
                  {user ? (
                    <Link
                      href="/dashboard"
                      onClick={() => setIsMenuOpen(false)}
                      className="w-full py-3.5 px-4 rounded-2xl bg-slate-950 hover:bg-slate-900 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg active:scale-98 transition-all border border-slate-800"
                    >
                      <User className="w-4 h-4 text-slate-300" />
                      <span>My Dashboard ({user.name})</span>
                    </Link>
                  ) : (
                    <Link
                      href="/login"
                      onClick={() => setIsMenuOpen(false)}
                      className="w-full py-3.5 px-4 rounded-2xl bg-slate-950 hover:bg-slate-900 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg active:scale-98 transition-all border border-slate-800"
                    >
                      <LogIn className="w-4 h-4 text-amber-400" />
                      <span>Log in / Register</span>
                    </Link>
                  )}

                  {/* Sign Out Button */}
                  {user && (
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 py-3 px-1 text-red-500 hover:text-red-600 font-bold text-sm transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Post Requirement Modal */}
      <PostRequirementModal
        isOpen={isRequirementModalOpen}
        onClose={() => setIsRequirementModalOpen(false)}
      />
    </>
  );
}
