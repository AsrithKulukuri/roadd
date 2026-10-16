"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { usePropertiesStore } from "@/stores/properties-store";
import { useProjectsStore } from "@/stores/projects-store";
import { usePathname, useSearchParams } from "next/navigation";

// Smart Timing Constants
const OVERLAY_TRIGGER_DELAY_MS = 200; // Only show full overlay if initial loading takes >200ms
const MIN_OVERLAY_DISPLAY_MS = 500;  // Once shown, keep for at least 500ms to prevent visual flicker
const MAX_FALLBACK_TIMEOUT_MS = 1500; // Safeguard: never get stuck indefinitely

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

  // 1. Initial Page / Cold Load Handling with Smart Delay
  useEffect(() => {
    if (!mounted) return;

    // Check if initial data has arrived or document is ready
    const isDocReady = typeof document !== "undefined" && document.readyState === "complete";
    const hasData = (!isPropertiesLoading && !isProjectsLoading) || (properties.length > 0 || projects.length > 0);

    if (!isDocReady || !hasData) {
      // Delay before showing full-screen overlay (prevents flash on fast loads)
      overlayTimerRef.current = setTimeout(() => {
        setShowFullOverlay(true);
        overlayShownTimeRef.current = Date.now();
      }, OVERLAY_TRIGGER_DELAY_MS);
    } else {
      if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
      // If overlay was already shown, enforce minimum duration to prevent abrupt disappearance
      const elapsed = Date.now() - overlayShownTimeRef.current;
      const remaining = Math.max(0, MIN_OVERLAY_DISPLAY_MS - elapsed);
      const timer = setTimeout(() => {
        setShowFullOverlay(false);
      }, remaining);
      return () => clearTimeout(timer);
    }

    // Safety fallback: always dismiss overlay after MAX_FALLBACK_TIMEOUT_MS
    const fallback = setTimeout(() => {
      setShowFullOverlay(false);
    }, MAX_FALLBACK_TIMEOUT_MS);

    return () => {
      if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
      clearTimeout(fallback);
    };
  }, [mounted, isPropertiesLoading, isProjectsLoading, properties.length, projects.length]);

  // 2. Real-Time Top Progress Bar (Zero-Latency Feedback for ANY Button Click, Navigation & Async Action)
  const trickleIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const finishTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startProgressAnimation = (isAsync = false, duration = 450) => {
    if (finishTimeoutRef.current) clearTimeout(finishTimeoutRef.current);
    if (trickleIntervalRef.current) clearInterval(trickleIntervalRef.current);

    setIsNavigating(true);
    setProgress((prev) => (prev > 0 && prev < 90 ? prev : 22));

    // Trickle progress smoothly
    trickleIntervalRef.current = setInterval(() => {
      setProgress((cur) => {
        if (cur < 45) return cur + Math.random() * 8 + 4;
        if (cur < 75) return cur + Math.random() * 5 + 2;
        if (cur < 92) return cur + Math.random() * 1.5 + 0.5;
        return cur; // Hold around 92% until done
      });
    }, 90);

    // If not waiting on a long async promise, schedule auto-completion
    if (!isAsync) {
      finishTimeoutRef.current = setTimeout(() => {
        completeProgressAnimation();
      }, duration);
    }
  };

  const completeProgressAnimation = () => {
    if (trickleIntervalRef.current) clearInterval(trickleIntervalRef.current);
    if (finishTimeoutRef.current) clearTimeout(finishTimeoutRef.current);

    setProgress(100);

    finishTimeoutRef.current = setTimeout(() => {
      setIsNavigating(false);
      setProgress(0);
    }, 220);
  };

  // Global Button Click Listener & Custom Events
  useEffect(() => {
    if (!mounted) return;

    // Attach global click progress listener (for ALL buttons, links, interactive triggers)
    const cleanupClick = (function initGlobalClick() {
      const handleClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement | null;
        if (!target) return;

        const interactive = target.closest<HTMLElement>(
          "button, [role='button'], a, input[type='button'], input[type='submit'], summary, [data-interactive='true']"
        );

        if (!interactive) return;

        // Skip disabled or ignored elements
        if (
          interactive.hasAttribute("disabled") ||
          interactive.getAttribute("aria-disabled") === "true" ||
          interactive.getAttribute("data-no-progress") === "true"
        ) {
          return;
        }

        const href = interactive.getAttribute("href");
        if (href === "#") return;

        // Immediately start progress bar for tactile responsiveness
        startProgressAnimation(false, 480);
      };

      document.addEventListener("click", handleClick, { capture: true, passive: true });
      return () => document.removeEventListener("click", handleClick, { capture: true });
    })();

    // Custom events listeners
    const handleStartEvent = (e: Event) => {
      const custom = e as CustomEvent<{ isAsync?: boolean; duration?: number }>;
      const isAsync = custom.detail?.isAsync ?? false;
      const duration = custom.detail?.duration ?? 480;
      startProgressAnimation(isAsync, duration);
    };

    const handleDoneEvent = () => {
      completeProgressAnimation();
    };

    const handleUpdateEvent = (e: Event) => {
      const custom = e as CustomEvent<{ percent: number }>;
      if (typeof custom.detail?.percent === "number") {
        setIsNavigating(true);
        setProgress(Math.min(100, Math.max(0, custom.detail.percent)));
      }
    };

    window.addEventListener("road:progress:start", handleStartEvent);
    window.addEventListener("road:progress:done", handleDoneEvent);
    window.addEventListener("road:progress:update", handleUpdateEvent);

    return () => {
      cleanupClick();
      window.removeEventListener("road:progress:start", handleStartEvent);
      window.removeEventListener("road:progress:done", handleDoneEvent);
      window.removeEventListener("road:progress:update", handleUpdateEvent);
      if (trickleIntervalRef.current) clearInterval(trickleIntervalRef.current);
      if (finishTimeoutRef.current) clearTimeout(finishTimeoutRef.current);
    };
  }, [mounted]);

  // Route Change Handler
  useEffect(() => {
    if (!mounted) return;

    const currentPath = pathname + (searchParams?.toString() || "");
    if (currentPath !== prevPathRef.current) {
      prevPathRef.current = currentPath;
      startProgressAnimation(false, 350);
    }
  }, [pathname, searchParams, mounted]);

  if (!mounted) return null;

  return (
    <>
      {/* ── Top Slim Glowing Progress Bar (Instant feedback on all navigations and button clicks) ── */}
      <AnimatePresence>
        {isNavigating && (
          <motion.div
            key="top-progress-bar"
            role="progressbar"
            aria-label="Action progress"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed top-0 left-0 right-0 z-[9999999] pointer-events-none h-[3.5px] bg-slate-900/10 dark:bg-black/20"
          >
            <motion.div
              className="relative h-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 shadow-[0_0_14px_rgba(245,158,11,0.9)]"
              style={{
                width: `${Math.min(100, progress)}%`,
                transition: "width 0.15s cubic-bezier(0.2, 0.8, 0.2, 1)",
              }}
            >
              {/* Glowing flare at the progress bar head */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-16 h-3 bg-white/60 blur-[3px] rounded-full pointer-events-none" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delayed Full-Page Brand Overlay (Only shows if cold loading > 200ms) ── */}
      <AnimatePresence>
        {showFullOverlay && (
          <motion.div
            key="smart-loader-overlay"
            role="status"
            aria-live="polite"
            aria-busy="true"
            aria-label="Loading RoadFacing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.01, filter: "blur(4px)" }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-md text-white select-none overflow-hidden"
            style={{ touchAction: "none" }}
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
                    alt="ROADFACING"
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
