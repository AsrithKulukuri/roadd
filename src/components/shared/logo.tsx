"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useLocationsStore } from "@/stores/locations-store";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  href?: string;
  isDarkBg?: boolean;
  textColor?: string;
}

const sizeMap = {
  sm: { iconHeight: 22, textClass: "text-sm sm:text-base" },
  md: { iconHeight: 26, textClass: "text-base sm:text-lg" },
  lg: { iconHeight: 38, textClass: "text-2xl" },
  xl: { iconHeight: 48, textClass: "text-3xl" },
};

export function Logo({
  className,
  size = "md",
  showText = true,
  href = "/",
  isDarkBg,
  textColor,
}: LogoProps) {
  const { iconHeight, textClass } = sizeMap[size];
  const resolvedTextColor =
    textColor ||
    (isDarkBg === true
      ? "text-white"
      : isDarkBg === false
      ? "text-slate-900"
      : "text-slate-900 dark:text-white");

  const content = (
    <div className={cn("flex items-center gap-2 group select-none", className)}>
      <div 
        className="relative flex-shrink-0 flex items-center justify-center"
        style={{ height: `${iconHeight}px` }}
      >
        <span
          role="img"
          aria-label="ROADFACING Logo"
          className="block h-full bg-[#faad13] drop-shadow-sm transition-transform duration-300 group-hover:scale-105"
          style={{
            width: `${Math.round(iconHeight * 0.73)}px`,
            WebkitMaskImage: "url('/logo.png')",
            maskImage: "url('/logo.png')",
            WebkitMaskPosition: "center",
            maskPosition: "center",
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskSize: "contain",
            maskSize: "contain",
          }}
        />
      </div>
      {showText && (
        <div className="flex flex-col justify-center">
          <div
            className={cn(
              "font-heading font-black tracking-tight leading-none flex items-center",
              textClass
            )}
            style={{ fontWeight: 900 }}
          >
            <span
              className={cn(isDarkBg ? "text-[#faad13]" : "text-[#7a5200] dark:text-[#faad13]", "font-black")}
              style={{ fontWeight: 900 }}
            >
              ROAD
            </span>
            <span className={cn("font-black tracking-tight", resolvedTextColor)} style={{ fontWeight: 900 }}>
              FACING
            </span>
          </div>
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        onClick={() => {
          if (href === "/") {
            useLocationsStore.getState().clearUserSelectedLocalities();
          }
        }}
        className="focus-visible:outline-none flex items-center"
      >
        {content}
      </Link>
    );
  }

  return content;
}
