"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, MapPin, X, ArrowRight, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/shared/logo";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";

const SEARCH_PLACEHOLDERS = [
  "Search location, project, ref ID",
  "Flats in Vijayawada Benz Circle",
  "Gated Community Villas in Poranki",
  "Plots on Amaravati Road Guntur",
  "Search Ref ID (e.g. RF-P102)",
];

export function MobileStickySearchHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isVisible, setIsVisible] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  // Hidden on admin, search page (which has its own header), and auth pages
  const isAdmin = pathname.startsWith("/admin");
  const isSearchPage = pathname === "/search";
  const isAuthPage = pathname === "/login" || pathname === "/register" || pathname === "/forgot-password";

  // Cycle placeholder suggestions
  useEffect(() => {
    try {
      router.prefetch("/search");
    } catch (e) {}

    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % SEARCH_PLACEHOLDERS.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [router]);

  // Detect scroll position
  useEffect(() => {
    if (isAdmin || isSearchPage || isAuthPage) {
      setIsVisible(false);
      return;
    }

    const handleScroll = () => {
      const threshold = pathname === "/" ? 160 : 80;
      setIsVisible(window.scrollY > threshold);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [pathname, isAdmin, isSearchPage, isAuthPage]);

  if (isAdmin || isSearchPage || isAuthPage) return null;

  const handlePillClick = () => {
    haptic.light();
    router.push("/search?openFilters=true");
  };

  const handleFiltersClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    haptic.medium();
    router.push("/search?openFilters=true");
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: -64, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -64, opacity: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="fixed top-0 left-0 right-0 z-[110] lg:hidden bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 shadow-md safe-top"
        >
          <div className="h-14 px-3 flex items-center gap-2 w-full max-w-lg mx-auto">
            {/* Compact Brand Logo Icon */}
            <div className="shrink-0">
              <Logo size="sm" showText={false} href="/" />
            </div>

            {/* Clickable Search Pill */}
            <div
              onClick={handlePillClick}
              role="button"
              tabIndex={0}
              aria-label="Search properties and projects"
              className="flex-1 min-w-0 h-9.5 rounded-xl bg-slate-100 dark:bg-slate-900/90 hover:bg-slate-200/70 dark:hover:bg-slate-800 border border-slate-300/80 dark:border-slate-700/80 flex items-center px-3 gap-2 transition-all cursor-pointer shadow-2xs group"
            >
              {/* Left Search Icon */}
              <Search className="w-3.5 h-3.5 text-amber-500 shrink-0 group-hover:scale-110 transition-transform" />

              {/* Animated Carousel Placeholder */}
              <div className="flex-1 min-w-0 overflow-hidden relative h-full flex items-center">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={placeholderIndex}
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -10, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate block select-none"
                  >
                    {SEARCH_PLACEHOLDERS[placeholderIndex]}
                  </motion.span>
                </AnimatePresence>
              </div>

              {/* Right Filter Icon Button */}
              <button
                type="button"
                onClick={handleFiltersClick}
                title="Open Filters"
                aria-label="Open Filters"
                className="w-7 h-7 rounded-full bg-white dark:bg-slate-800 hover:bg-amber-500/20 text-slate-700 dark:text-slate-200 hover:text-amber-500 flex items-center justify-center transition-all cursor-pointer shrink-0 border border-slate-200 dark:border-slate-700 shadow-2xs active:scale-90"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
