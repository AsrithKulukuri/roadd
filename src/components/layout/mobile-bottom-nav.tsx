"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, PlusCircle, Heart, Menu, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFavoritesStore } from "@/stores/favorites-store";
import { motion, AnimatePresence } from "framer-motion";
import { navigationLinks } from "@/config/site";

export function MobileBottomNav() {
  const pathname = usePathname();
  const savedPropertyIds = useFavoritesStore((state) => state.savedPropertyIds);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const savedCount = savedPropertyIds?.length || 0;

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

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
      isActive: pathname.startsWith("/search") || pathname.startsWith("/properties") || pathname.startsWith("/projects"),
    },
    {
      id: "sell-rent",
      label: "Sell/Rent",
      href: "/list-with-us",
      icon: PlusCircle,
      isActive: pathname === "/list-with-us" || pathname.startsWith("/dashboard/listings/new"),
      badge: "FREE",
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
      onClick: () => setIsMenuOpen(true),
      icon: Menu,
      isActive: isMenuOpen,
    },
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

                  {/* FREE Badge for Sell/Rent */}
                  {item.badge && (
                    <span className="absolute -top-2.5 px-1.5 py-0.2 rounded-full bg-emerald-600 text-white text-[8px] font-black uppercase tracking-wider shadow-xs animate-pulse">
                      {item.badge}
                    </span>
                  )}

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

      {/* ── Mobile Full Menu Sheet / Drawer ── */}
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

            {/* Slide-up Menu Sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 32 }}
              className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-950 rounded-t-3xl border-t border-slate-200 dark:border-slate-800 shadow-2xl max-h-[85vh] overflow-y-auto p-5 pb-8 space-y-5"
            >
              {/* Sheet Header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Quick Navigation</h3>
                    <p className="text-[11px] text-slate-500">Explore properties, ventures & tools</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Main Quick Action Cards */}
              <div className="grid grid-cols-2 gap-2.5">
                <Link
                  href="/list-with-us"
                  onClick={() => setIsMenuOpen(false)}
                  className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col gap-1 hover:bg-amber-500/15 transition-colors"
                >
                  <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-500/20 px-2 py-0.5 rounded-full w-fit">
                    Free Listing
                  </span>
                  <span className="font-extrabold text-xs text-slate-900 dark:text-white mt-1">Post Property</span>
                  <span className="text-[10px] text-slate-500">Sell or rent your property</span>
                </Link>

                <Link
                  href="/dashboard"
                  onClick={() => setIsMenuOpen(false)}
                  className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex flex-col gap-1 hover:bg-blue-500/15 transition-colors"
                >
                  <span className="text-[9px] font-black uppercase text-blue-600 bg-blue-500/20 px-2 py-0.5 rounded-full w-fit">
                    Account
                  </span>
                  <span className="font-extrabold text-xs text-slate-900 dark:text-white mt-1">My Dashboard</span>
                  <span className="text-[10px] text-slate-500">Saved homes & inquiries</span>
                </Link>
              </div>

              {/* Navigation Links List */}
              <div className="space-y-1 divide-y divide-slate-100 dark:divide-slate-800/60">
                {(navigationLinks.main || []).map((link) => (
                  <div key={link.href} className="pt-2 first:pt-0">
                    <Link
                      href={link.href}
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center justify-between py-2 px-3 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors"
                    >
                      <span>{link.label}</span>
                    </Link>
                  </div>
                ))}
              </div>

              {/* Extra Tools */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <Link
                  href="/mortgage-calculator"
                  onClick={() => setIsMenuOpen(false)}
                  className="block text-center py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                >
                  📐 EMI &amp; Mortgage Calculator
                </Link>
                <Link
                  href="/about"
                  onClick={() => setIsMenuOpen(false)}
                  className="block text-center py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  About RoadFacing • Real Projects. Real People. Real Updates.
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
