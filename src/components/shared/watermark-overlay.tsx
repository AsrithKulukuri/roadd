"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface WatermarkOverlayProps {
  text?: string;
  className?: string;
  position?: "left-middle" | "bottom-right" | "top-left" | "center";
}

/**
 * WatermarkOverlay Component
 * Displays the "roadfacing.com" brand watermark overlay on video players and gallery viewers.
 * Default position: left side in the middle.
 */
export function WatermarkOverlay({
  text = "roadfacing.com",
  className,
  position = "left-middle",
}: WatermarkOverlayProps) {
  const positionClass =
    position === "left-middle"
      ? "left-3 sm:left-4 top-1/2 -translate-y-1/2"
      : position === "bottom-right"
      ? "right-3 sm:right-4 bottom-3 sm:bottom-4"
      : position === "top-left"
      ? "left-3 sm:left-4 top-3 sm:top-4"
      : "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2";

  return (
    <div
      aria-hidden="true"
      className={cn(
        "absolute z-20 pointer-events-none select-none flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg bg-black/25 backdrop-blur-sm border border-white/15 shadow-xs text-white/75 font-semibold tracking-wide transition-all",
        "text-[9.5px] sm:text-[11px] leading-none",
        positionClass,
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80 shadow-xs shrink-0" />
      <span className="text-white/80">{text}</span>
    </div>
  );
}
