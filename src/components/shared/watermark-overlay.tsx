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
        "absolute z-20 pointer-events-none select-none flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/70 backdrop-blur-xs border border-white/20 shadow-lg text-white font-black tracking-wide transition-all",
        "text-[10px] sm:text-xs leading-none",
        positionClass,
        className
      )}
    >
      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-500 shadow-xs shrink-0" />
      <span className="text-white/95 drop-shadow-md">{text}</span>
    </div>
  );
}
