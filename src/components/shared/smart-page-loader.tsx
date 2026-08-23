"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { usePropertiesStore } from "@/stores/properties-store";
import { useProjectsStore } from "@/stores/projects-store";
import { usePathname, useSearchParams } from "next/navigation";

export function SmartPageLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [mounted, setMounted] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showFullOverlay, setShowFullOverlay] = useState(false);

  const properties = usePropertiesStore((state) => state.properties);
  const projects = useProjectsStore((state) => state.projects);
  const isPropertiesLoading = usePropertiesStore((state) => state.isLoading);
  const isProjectsLoading = useProjectsStore((state) => state.isLoading);

  const prevPathRef = useRef(pathname + (searchParams?.toString() || ""));
  const overlayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const overlayShownTimeRef = useRef<number>(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 1. Initial Page / Cold Load Handling
  useEffect(() => {
    if (!mounted) return;

    // Check if initial data has arrived
    const isDocReady = typeof document !== "undefined" && document.readyState === "complete";
    const hasData = (!isPropertiesLoading && !isProjectsLoading) || (properties.length > 0 || projects.length > 0);

    if (!isDocReady || !hasData) {
      // Set delay: only show full overlay if initial loading takes > 250ms
      overlayTimerRef.current = setTimeout(() => {
        setShowFullOverlay(true);
        overlayShownTimeRef.current = Date.now();
      }, 250);
    } else {
      if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
      // If overlay was already shown, ensure minimum 500ms duration to prevent flicker
      const elapsed = Date.now() - overlayShownTimeRef.current;
      const remaining = Math.max(0, 500 - elapsed);
      const timer = setTimeout(() => {
        setShowFullOverlay(false);
      }, remaining);
      return () => clearTimeout(timer);
    }

    // Safety fallback: always dismiss overlay after 1.5s
    const fallback = setTimeout(() => {
      setShowFullOverlay(false);
    }, 1500);

    return () => {
      if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
      clearTimeout(fallback);
    };
  }, [mounted, isPropertiesLoading, isProjectsLoading, properties.length, projects.length]);

  // 2. Route Change Top Progress Bar & Smooth Transitions
  useEffect(() => {
    if (!mounted) return;

    const currentPath = pathname + (searchParams?.toString() || "");
    if (currentPath !== prevPathRef.current) {
      prevPathRef.current = currentPath;

      // Start top progress bar animation
      setIsNavigating(true);
      setProgress(25);

      const p1 = setTimeout(() => setProgress(65), 80);
      const p2 = setTimeout(() => setProgress(90), 160);
      const p3 = setTimeout(() => {
        setProgress(100);
        setTimeout(() => {
          setIsNavigating(false);
          setProgress(0);
        }, 200);
      }, 300);

      return () => {
        clearTimeout(p1);
        clearTimeout(p2);
        clearTimeout(p3);
      };
    }
  }, [pathname, searchParams, mounted]);

  if (!mounted) return null;

  return (
    <>
      {/* ── Top Slim Glowing Progress Bar (Instant visual response on all navigations) ── */}
      <AnimatePresence>
        {isNavigating && (
          <motion.div
            key="top-progress-bar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed top-0 left-0 right-0 z-[999999] pointer-events-none h-[3px] bg-slate-900/20"
          >
            <motion.div
              className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 shadow-[0_0_12px_#f59e0b]"
              style={{ width: `${progress}%`, transition: "width 0.2s cubic-bezier(0.4, 0, 0.2, 1)" }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delayed Full-Page Brand Overlay (Only appears if loading takes > 250ms) ── */}
      <AnimatePresence>
        {showFullOverlay && (
          <motion.div
            key="smart-loader-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.02, filter: "blur(4px)" }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-md text-white select-none overflow-hidden"
            style={{ touchAction: "none" }}
            aria-busy="true"
            aria-label="Loading content"
          >
            {/* Ambient Glow Gradient Background */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
              <div className="w-[300px] sm:w-[420px] h-[300px] sm:h-[420px] rounded-full bg-gradient-to-tr from-amber-500/20 via-amber-600/10 to-transparent blur-[80px] animate-pulse" />
            </div>

            <div className="relative z-10 flex flex-col items-center gap-5 px-4 max-w-sm text-center">
              {/* Logo with Orbital Spinning Ring */}
              <div className="relative flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
                  className="absolute w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-dashed border-amber-400/40"
                />

                <motion.div
                  animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  className="absolute w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-amber-500/15 border border-amber-400/50 blur-xs"
                />

                <div className="relative w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center drop-shadow-[0_0_20px_rgba(245,158,11,0.6)]">
                  <Image
                    src="/logo.png"
                    alt="ROAD FACING"
                    width={56}
                    height={56}
                    priority
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

              {/* Brand Title */}
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-1.5 font-heading text-lg sm:text-xl font-black tracking-tight leading-none">
                  <span className="text-[#f59e0b] drop-shadow-[0_0_12px_rgba(245,158,11,0.5)]">ROAD</span>
                  <span className="text-white tracking-wider">FACING</span>
                </div>
                <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400 tracking-wide">
                  Finding best properties...
                </p>
              </div>

              {/* Shimmer Track */}
              <div className="w-32 sm:w-40 h-1 bg-slate-800/90 rounded-full overflow-hidden relative shadow-inner">
                <motion.div
                  animate={{
                    x: ["-100%", "100%"],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.2,
                    ease: "easeInOut",
                  }}
                  className="w-1/2 h-full bg-gradient-to-r from-transparent via-amber-400 to-transparent rounded-full shadow-[0_0_10px_#f59e0b]"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
