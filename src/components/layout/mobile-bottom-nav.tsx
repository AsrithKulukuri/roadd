"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Home, Search, MapPin, Heart, Menu, X, Sparkles, Plus, User, LogOut, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFavoritesStore } from "@/stores/favorites-store";
import { motion, AnimatePresence } from "framer-motion";
import { navigationLinks } from "@/config/site";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { toast } from "sonner";
import { PostRequirementModal } from "@/components/shared/post-requirement-modal";

export function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMapView = (pathname === "/search" && searchParams.get("view") === "map") || pathname === "/properties/map";

  const savedPropertyIds = useFavoritesStore((state) => state.savedPropertyIds);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRequirementModalOpen, setIsRequirementModalOpen] = useState(false);
  const [user, setUser] = useState<{ name: string } | null>(null);
  const savedCount = savedPropertyIds?.length || 0;

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
    { label: "New projects", href: "/search?type=projects" },
    { label: "Gated Communities", href: "/search?type=buy&propertyType=gated-community" },
    { label: "Commercial", href: "/search?type=buy&propertyType=commercial" },
    { label: "Agriculture", href: "/search?type=buy&propertyType=agricultural-land" },
  ];

  return (
    <>
      {/* ── Fixed Mobile Bottom Nav Bar ── */}
      <nav 
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 sm:hidden bg-white/98 dark:bg-slate-950/98 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_25px_rgba(0,0,0,0.08)] py-1.5 px-3"
      >
        <div className="grid grid-cols-5 items-center justify-around max-w-md mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const content = (
              <div
                className={cn(
                  "flex flex-col items-center justify-center py-1 rounded-xl transition-all relative cursor-pointer group",
                  item.isActive
                    ? "text-amber-600 dark:text-amber-400 font-extrabold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium"
                )}
              >
                {/* Icon Container with Badge */}
                <div className="relative flex items-center justify-center">
                  <Icon
                    className={cn(
                      "w-5 h-5 transition-transform duration-200 group-active:scale-90",
                      item.isActive ? "stroke-[2.5]" : "stroke-[1.8]"
                    )}
                  />

                  {/* Heart / Activity Saved Count Badge */}
                  {typeof item.count === "number" && (
                    <span className="absolute -top-1.5 -right-2 px-1.5 py-0.2 min-w-[15px] text-center rounded-full bg-red-600 text-white text-[8px] font-black leading-tight shadow-xs">
                      {item.count}
                    </span>
                  )}
                </div>

                {/* Text Label */}
                <span className="text-[10px] tracking-tight mt-1 leading-tight">
                  {item.label}
                </span>
              </div>
            );

            if (item.onClick) {
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.onClick}
                  className="w-full text-center"
                >
                  {content}
                </button>
              );
            }

            return (
              <Link key={item.id} href={item.href} className="w-full text-center">
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

            {/* Slide-in Menu View */}
            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 32 }}
              className="absolute inset-x-0 bottom-0 top-[40px] bg-white dark:bg-slate-950 rounded-t-3xl border-t border-slate-200 dark:border-slate-800 shadow-2xl overflow-y-auto p-6 pb-24 flex flex-col justify-between"
            >
              <div>
                {/* Header Close Row */}
                <div className="flex items-center justify-end pb-3">
                  <button
                    type="button"
                    onClick={() => setIsMenuOpen(false)}
                    className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  >
                    <X className="w-5 h-5" />
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
