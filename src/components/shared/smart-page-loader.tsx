"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { usePropertiesStore } from "@/stores/properties-store";
import { useProjectsStore } from "@/stores/projects-store";
import { usePathname } from "next/navigation";

export function SmartPageLoader() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const properties = usePropertiesStore((state) => state.properties);
  const projects = useProjectsStore((state) => state.projects);
  const isPropertiesLoading = usePropertiesStore((state) => state.isLoading);
  const isProjectsLoading = useProjectsStore((state) => state.isLoading);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Track initial hydration & data readiness
  useEffect(() => {
    if (!mounted) return;

    // Ready condition: document loaded + initial store load resolved
    const checkReady = () => {
      const isDocReady = typeof document !== "undefined" && document.readyState === "complete";
      const hasDataOrFinished = (!isPropertiesLoading && !isProjectsLoading) || (properties.length > 0 && projects.length > 0);

      if (isDocReady && hasDataOrFinished) {
        const timeout = setTimeout(() => {
          setIsLoading(false);
        }, 400); // 400ms smooth minimum transition
        return () => clearTimeout(timeout);
      }
    };

    // If already ready
    if (document.readyState === "complete") {
      checkReady();
    } else {
      window.addEventListener("load", checkReady);
      return () => window.removeEventListener("load", checkReady);
    }

    // Safety fallback: always dismiss after max 1.8s so user is never blocked
    const fallbackTimer = setTimeout(() => {
      setIsLoading(false);
    }, 1800);

    return () => clearTimeout(fallbackTimer);
  }, [mounted, isPropertiesLoading, isProjectsLoading, properties.length, projects.length]);

  // Brief route change transition trigger
  useEffect(() => {
    if (!mounted) return;
    // On route navigation, show subtle top bar indicator
  }, [pathname, mounted]);

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          key="smart-loader-overlay"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.03, filter: "blur(4px)" }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-slate-950 text-white select-none overflow-hidden"
          style={{ touchAction: "none" }}
        >
          {/* Ambient Glow Gradient Background */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
            <div className="w-[320px] sm:w-[460px] h-[320px] sm:h-[460px] rounded-full bg-gradient-to-tr from-amber-500/20 via-amber-600/10 to-transparent blur-[90px] animate-pulse" />
          </div>

          <div className="relative z-10 flex flex-col items-center gap-6 px-4 max-w-sm text-center">
            {/* Logo with Orbital Spinning Ring & Pulsing Aura */}
            <div className="relative flex items-center justify-center">
              {/* Outer Rotating Dash Ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                className="absolute w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-dashed border-amber-400/40"
              />

              {/* Inner Pulsing Ring */}
              <motion.div
                animate={{ scale: [1, 1.12, 1], opacity: [0.3, 0.7, 0.3] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                className="absolute w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-amber-500/15 border border-amber-400/50 blur-xs"
              />

              {/* Centered Brand Logo */}
              <motion.div
                animate={{ scale: [0.96, 1.04, 0.96] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center drop-shadow-[0_0_20px_rgba(245,158,11,0.6)]"
              >
                <Image
                  src="/logo.png"
                  alt="ROAD FACING"
                  width={64}
                  height={64}
                  priority
                  className="w-full h-full object-contain"
                />
              </motion.div>
            </div>

            {/* Brand Title with Golden Shimmer */}
            <div className="flex flex-col items-center gap-1.5">
              <div className="flex items-center gap-1.5 font-heading text-xl sm:text-2xl font-black tracking-tight leading-none">
                <span className="text-[#f59e0b] drop-shadow-[0_0_12px_rgba(245,158,11,0.5)]">ROAD</span>
                <span className="text-white tracking-wider">FACING</span>
              </div>
              <p className="text-[11px] sm:text-xs font-semibold text-slate-400 tracking-wide">
                Real Projects. Real People. Real Updates.
              </p>
            </div>

            {/* Smart Indeterminate Loading Track */}
            <div className="w-36 sm:w-44 h-1 bg-slate-800/90 rounded-full overflow-hidden relative shadow-inner">
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
  );
}
