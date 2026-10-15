"use client";

import { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Sparkles, type LucideIcon } from "lucide-react";
import { PropertyCard } from "@/components/property/property-card";
import { ProjectCard } from "@/components/project/project-card";
import { ShelfCard } from "@/components/home/shelves/shelf-card";
import type { Property } from "@/types/property";
import type { Project } from "@/types/project";
import {
  type HomeCardStyleId,
  type HomeCardSize,
  getValidCardSize,
} from "@/types/home-section";
import type {
  BorderConfig,
  ImageArrangementConfig,
  CardElementId,
  ElementConfig,
  CarouselLoopMode,
  CarouselTransitionSpeed,
  CarouselArrowPosition,
} from "@/types/shelf-builder";
import { borderConfigToStyles } from "@/lib/shelf-builder-styles";
import { cn } from "@/lib/utils";

export type MixedItem = 
  | (Property & {
      itemType: 'property';
      progressPercentage?: number;
      customBadge?: string;
      customHeadline?: string;
      customTagline?: string;
      customPrice?: string;
      customLocation?: string;
      customBhk?: string;
      customArea?: string;
      customDeveloper?: string;
      customStatus?: string;
      customCtaText?: string;
      cardBgColor?: string;
      cardTextColor?: string;
      cardAccentColor?: string;
      cardBorder?: BorderConfig;
    })
  | (Project & {
      itemType: 'project';
      progressPercentage?: number;
      customBadge?: string;
      customHeadline?: string;
      customTagline?: string;
      customPrice?: string;
      customLocation?: string;
      customBhk?: string;
      customArea?: string;
      customDeveloper?: string;
      customStatus?: string;
      customCtaText?: string;
      cardBgColor?: string;
      cardTextColor?: string;
      cardAccentColor?: string;
      cardBorder?: BorderConfig;
    });

interface MixedCarouselRowProps {
  title: string;
  icon?: LucideIcon;
  items: MixedItem[];
  autoSlide?: boolean;
  enableCarousel?: boolean;
  carouselInterval?: number;
  layoutType?: "carousel" | "grid" | "featured-split";
  carouselLoopMode?: CarouselLoopMode;
  carouselSpeed?: CarouselTransitionSpeed;
  carouselPauseOnHover?: boolean;
  carouselShowArrows?: boolean;
  carouselArrowPosition?: CarouselArrowPosition;
  carouselShowDots?: boolean;
  gridColumnsDesktop?: number;
  gridColumnsTablet?: number;
  gridColumnsMobile?: number;
  mobileCarouselCustom?: boolean;
  mobileLayoutType?: "carousel" | "grid" | "featured-split";
  mobileEnableCarousel?: boolean;
  mobileCarouselLoopMode?: CarouselLoopMode;
  mobileCarouselInterval?: number;
  mobileCarouselSpeed?: CarouselTransitionSpeed;
  mobileCarouselPauseOnHover?: boolean;
  mobileCarouselShowArrows?: boolean;
  mobileCarouselArrowPosition?: CarouselArrowPosition;
  mobileCarouselShowDots?: boolean;
  hideHeader?: boolean;
  cardVariant?: "default" | "compact" | "horizontal" | "category-style";
  cardStyle?: HomeCardStyleId;
  cardSizeDesktop?: HomeCardSize;
  cardSizeMobile?: HomeCardSize;
  cardBgColor?: string;
  cardTextColor?: string;
  cardAccentColor?: string;
  shelfBorder?: BorderConfig;
  cardBorder?: BorderConfig;
  imageArrangement?: ImageArrangementConfig;
  elementOrder?: CardElementId[];
  elements?: Partial<Record<CardElementId, ElementConfig>>;
  sectionBgColor?: string;
  sectionBgImage?: string;
  sectionPaddingTop?: number;
  sectionPaddingBottom?: number;
  headingAlignment?: "left" | "center" | "right";
  headingSize?: "text-xl" | "text-2xl" | "text-3xl" | "text-4xl";
  headingColor?: string;
  subtitle?: string;
  subtitleColor?: string;
  customBadge?: string;
  customHeadline?: string;
  customTagline?: string;
  customPrice?: string;
  customLocation?: string;
  customBhk?: string;
  customArea?: string;
  customDeveloper?: string;
  customStatus?: string;
  customCtaText?: string;
}

export function getResponsiveShelfCardWidthClass(
  cardStyle?: HomeCardStyleId,
  cardSizeDesktop?: HomeCardSize,
  cardSizeMobile?: HomeCardSize,
  legacyVariant?: string
) {
  if (!cardStyle) {
    if (legacyVariant === "compact") return "w-[170px] sm:w-[220px] md:w-[260px]";
    if (legacyVariant === "category-style") return "w-[160px] sm:w-[220px]";
    return "w-[220px] sm:w-[280px] md:w-[320px]";
  }

  const dSize = getValidCardSize(cardStyle, "desktop", cardSizeDesktop);
  const mSize = getValidCardSize(cardStyle, "mobile", cardSizeMobile);

  switch (cardStyle) {
    case "classic-default": {
      const mobileW =
        mSize === "very-small" ? "w-[200px]" :
        mSize === "small" ? "w-[230px]" :
        mSize === "big" ? "w-[300px]" : "w-[260px]";
      const desktopW =
        dSize === "very-small" ? "sm:w-[230px] md:w-[250px]" :
        dSize === "small" ? "sm:w-[260px] md:w-[280px]" :
        dSize === "big" ? "sm:w-[340px] md:w-[380px]" :
        dSize === "very-big" ? "sm:w-[390px] md:w-[440px]" :
        "sm:w-[290px] md:w-[320px]";
      return `${mobileW} ${desktopW}`;
    }

    case "compact-marketplace": {
      const mobileW =
        mSize === "very-small" ? "w-[240px]" :
        mSize === "small" ? "w-[270px]" :
        mSize === "big" ? "w-[340px]" : "w-[300px]";
      const desktopW =
        dSize === "very-small" ? "sm:w-[280px] md:w-[320px]" :
        dSize === "small" ? "sm:w-[320px] md:w-[360px]" :
        dSize === "big" ? "sm:w-[420px] md:w-[480px]" :
        "sm:w-[360px] md:w-[410px]";
      return `${mobileW} ${desktopW}`;
    }

    case "tall-portrait": {
      const mobileW =
        mSize === "very-small" ? "w-[200px]" :
        mSize === "small" ? "w-[230px]" :
        mSize === "big" ? "w-[300px]" : "w-[260px]";
      const desktopW =
        dSize === "very-small" ? "sm:w-[230px] md:w-[250px]" :
        dSize === "small" ? "sm:w-[260px] md:w-[280px]" :
        dSize === "big" ? "sm:w-[340px] md:w-[380px]" :
        dSize === "very-big" ? "sm:w-[390px] md:w-[440px]" :
        "sm:w-[290px] md:w-[320px]";
      return `${mobileW} ${desktopW}`;
    }

    case "luxury-banner": {
      const mobileW =
        mSize === "small" ? "w-[82vw]" :
        mSize === "big" ? "w-[94vw]" : "w-[88vw]";
      const desktopW =
        dSize === "big" ? "sm:w-[720px] lg:w-[960px]" :
        dSize === "very-big" ? "sm:w-[820px] lg:w-[1100px]" :
        "sm:w-[620px] lg:w-[840px]";
      return `${mobileW} ${desktopW}`;
    }

    case "split-feature": {
      const mobileW =
        mSize === "small" ? "w-[82vw]" :
        mSize === "big" ? "w-[94vw]" : "w-[88vw]";
      const desktopW =
        dSize === "big" ? "sm:w-[660px] lg:w-[820px]" :
        dSize === "very-big" ? "sm:w-[760px] lg:w-[940px]" :
        "sm:w-[560px] lg:w-[700px]";
      return `${mobileW} ${desktopW}`;
    }

    case "bottom-floating": {
      const mobileW =
        mSize === "very-small" ? "w-[230px]" :
        mSize === "small" ? "w-[260px]" :
        mSize === "big" ? "w-[340px]" : "w-[290px]";
      const desktopW =
        dSize === "small" ? "sm:w-[340px] md:w-[400px]" :
        dSize === "big" ? "sm:w-[460px] md:w-[540px]" :
        dSize === "very-big" ? "sm:w-[520px] md:w-[620px]" :
        "sm:w-[400px] md:w-[480px]";
      return `${mobileW} ${desktopW}`;
    }

    case "modern-villa": {
      const mobileW =
        mSize === "small" ? "w-[250px]" :
        mSize === "big" ? "w-[330px]" : "w-[280px]";
      const desktopW =
        dSize === "small" ? "sm:w-[340px] md:w-[390px]" :
        dSize === "big" ? "sm:w-[460px] md:w-[540px]" :
        dSize === "very-big" ? "sm:w-[520px] md:w-[620px]" :
        "sm:w-[390px] md:w-[460px]";
      return `${mobileW} ${desktopW}`;
    }

    case "construction-progress": {
      const mobileW =
        mSize === "very-small" ? "w-[210px]" :
        mSize === "small" ? "w-[235px]" :
        mSize === "big" ? "w-[300px]" : "w-[260px]";
      const desktopW =
        dSize === "very-small" ? "sm:w-[240px] md:w-[260px]" :
        dSize === "small" ? "sm:w-[270px] md:w-[295px]" :
        dSize === "big" ? "sm:w-[340px] md:w-[380px]" :
        "sm:w-[300px] md:w-[330px]";
      return `${mobileW} ${desktopW}`;
    }

    case "dark-editorial": {
      const mobileW =
        mSize === "small" ? "w-[82vw]" :
        mSize === "big" ? "w-[94vw]" : "w-[88vw]";
      const desktopW =
        dSize === "big" ? "sm:w-[580px] lg:w-[700px]" :
        dSize === "very-big" ? "sm:w-[680px] lg:w-[820px]" :
        "sm:w-[480px] lg:w-[580px]";
      return `${mobileW} ${desktopW}`;
    }

    default:
      return "w-[260px] sm:w-[290px] md:w-[320px]";
  }
}

export function MixedCarouselRow({
  title,
  icon: Icon = Sparkles,
  items,
  autoSlide = false,
  enableCarousel = true,
  carouselInterval = 4,
  layoutType = "carousel",
  carouselLoopMode,
  carouselSpeed = "normal",
  carouselPauseOnHover = true,
  carouselShowArrows = true,
  carouselArrowPosition = "header",
  carouselShowDots = false,
  gridColumnsDesktop = 4,
  gridColumnsTablet = 2,
  gridColumnsMobile = 1,
  mobileCarouselCustom,
  mobileLayoutType,
  mobileEnableCarousel,
  mobileCarouselLoopMode,
  mobileCarouselInterval,
  mobileCarouselSpeed,
  mobileCarouselPauseOnHover,
  mobileCarouselShowArrows,
  mobileCarouselArrowPosition,
  mobileCarouselShowDots,
  hideHeader = false,
  cardVariant = "default",
  cardStyle,
  cardSizeDesktop,
  cardSizeMobile,
  cardBgColor,
  cardTextColor,
  cardAccentColor,
  shelfBorder,
  cardBorder,
  imageArrangement,
  elementOrder,
  elements,
  sectionBgColor,
  sectionBgImage,
  sectionPaddingTop,
  sectionPaddingBottom,
  headingAlignment = "left",
  headingSize,
  headingColor,
  subtitle,
  subtitleColor,
  customBadge,
  customHeadline,
  customTagline,
  customPrice,
  customLocation,
  customBhk,
  customArea,
  customDeveloper,
  customStatus,
  customCtaText,
}: MixedCarouselRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const interactionPauseUntil = useRef(0);
  const isInitialized = useRef(false);

  // Responsive device detection for mobile-specific carousel overrides
  const [isMobileScreen, setIsMobileScreen] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 639px)");
    setIsMobileScreen(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobileScreen(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const isMobileActive = Boolean(mobileCarouselCustom) && isMobileScreen;

  const currentLayoutType = isMobileActive && mobileLayoutType ? mobileLayoutType : layoutType;
  const currentLoopMode = isMobileActive && mobileCarouselLoopMode !== undefined ? mobileCarouselLoopMode : carouselLoopMode;
  const currentEnableCarousel = isMobileActive && mobileEnableCarousel !== undefined ? mobileEnableCarousel : enableCarousel;
  const currentInterval = isMobileActive && mobileCarouselInterval ? mobileCarouselInterval : carouselInterval;
  const currentPauseOnHover = isMobileActive && mobileCarouselPauseOnHover !== undefined ? mobileCarouselPauseOnHover : carouselPauseOnHover;
  const currentShowArrows = isMobileActive && mobileCarouselShowArrows !== undefined ? mobileCarouselShowArrows : carouselShowArrows;
  const currentArrowPosition = isMobileActive && mobileCarouselArrowPosition ? mobileCarouselArrowPosition : carouselArrowPosition;
  const currentShowDots = isMobileActive && mobileCarouselShowDots !== undefined ? mobileCarouselShowDots : carouselShowDots;

  // Determine carousel vs static grid behavior
  const isGrid = currentLayoutType === "grid" || currentLoopMode === "static" || currentEnableCarousel === false;
  const isInfinite = !isGrid && currentLoopMode !== "normal";
  const hasMultiple = items.length > 1;
  const loopCopies = isInfinite && hasMultiple ? [0, 1, 2] : [0];
  const showArrows = currentShowArrows !== false && hasMultiple && !isGrid;
  const arrowPosition = currentArrowPosition || "header";
  const pauseOnHover = currentPauseOnHover !== false;

  const getScrollStep = () => {
    const container = scrollRef.current;
    const firstCard = container?.firstElementChild as HTMLElement | null;
    if (!container || !firstCard) return 0;
    const styles = window.getComputedStyle(container);
    const gap = Number.parseFloat(styles.columnGap || styles.gap || "0") || 0;
    return firstCard.getBoundingClientRect().width + gap;
  };

  const pauseAutoSlide = () => {
    interactionPauseUntil.current = Date.now() + 5000;
  };

  // Initialize scroll position to the middle copy (copy 1) for infinite loop
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !hasMultiple || !isInfinite) return;

    const timer = setTimeout(() => {
      const step = getScrollStep();
      if (step > 0) {
        const setWidth = items.length * step;
        container.scrollLeft = setWidth;
        isInitialized.current = true;
      }
    }, 60);

    return () => clearTimeout(timer);
  }, [items.length, hasMultiple, isInfinite]);

  // Debounced normalization for manual user scrolling / swipe in infinite mode
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !hasMultiple || !isInfinite) return;

    let timeout: NodeJS.Timeout;
    const handleScroll = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const step = getScrollStep();
        if (step <= 0) return;
        const setWidth = items.length * step;
        if (container.scrollLeft >= 2 * setWidth) {
          container.scrollLeft -= setWidth;
        } else if (container.scrollLeft < setWidth - step) {
          container.scrollLeft += setWidth;
        }
      }, 150);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      clearTimeout(timeout);
      container.removeEventListener("scroll", handleScroll);
    };
  }, [items.length, hasMultiple, isInfinite]);

  // Auto-Slide with configurable speed & pause on hover
  useEffect(() => {
    if (isGrid || !autoSlide || !hasMultiple || (pauseOnHover && isHovered)) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const ms = Math.max(1.5, Math.min(30, currentInterval || 4)) * 1000;
    const interval = setInterval(() => {
      const container = scrollRef.current;
      if (!container || Date.now() < interactionPauseUntil.current) return;

      const step = getScrollStep();
      if (step <= 0) return;

      const setWidth = items.length * step;
      if (isInfinite) {
        if (container.scrollLeft >= 2 * setWidth - 5) {
          container.scrollLeft -= setWidth;
        }
        container.scrollBy({ left: step, behavior: "smooth" });
      } else {
        // Normal finite mode: if reached end, scroll back to start
        if (container.scrollLeft + container.clientWidth >= container.scrollWidth - 10) {
          container.scrollTo({ left: 0, behavior: "smooth" });
        } else {
          container.scrollBy({ left: step, behavior: "smooth" });
        }
      }
    }, ms);

    return () => clearInterval(interval);
  }, [isGrid, autoSlide, isHovered, items.length, hasMultiple, currentInterval, isInfinite, pauseOnHover]);

  const scroll = (direction: "left" | "right") => {
    const container = scrollRef.current;
    if (!container) return;
    pauseAutoSlide();
    const step = getScrollStep();
    if (step <= 0) return;

    const setWidth = items.length * step;

    if (direction === "right") {
      if (isInfinite && container.scrollLeft >= 2 * setWidth - 5) {
        container.scrollLeft -= setWidth;
      }
      container.scrollBy({ left: step, behavior: "smooth" });
    } else {
      if (isInfinite && container.scrollLeft <= step) {
        container.scrollLeft += setWidth;
      }
      container.scrollBy({ left: -step, behavior: "smooth" });
    }
  };

  if (items.length === 0) return null;

  const shelfBorderStyle = borderConfigToStyles(shelfBorder);
  const sectionStyle: React.CSSProperties = {
    ...shelfBorderStyle,
    backgroundColor: sectionBgColor,
    backgroundImage: sectionBgImage ? `url(${sectionBgImage})` : undefined,
    paddingTop: sectionPaddingTop !== undefined ? `${sectionPaddingTop}px` : undefined,
    paddingBottom: sectionPaddingBottom !== undefined ? `${sectionPaddingBottom}px` : undefined,
  };

  return (
    <section className="py-2 relative transition-all" style={sectionStyle}>
      <div className="container-road">
        {!hideHeader && (
          <div className={cn(
            "mb-3 flex items-center justify-between gap-3 sm:mb-4",
            headingAlignment === "center" && "justify-center text-center",
            headingAlignment === "right" && "justify-end text-right"
          )}>
            <div className={cn("max-w-2xl", headingAlignment === "center" && "mx-auto")}>
              <div className="inline-flex min-h-10 items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-extrabold text-slate-950 shadow-sm">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-950 text-[#faad13]"><Icon className="h-3.5 w-3.5 shrink-0" /></span>
                <span style={headingColor ? { color: headingColor } : undefined} className={headingSize || "text-sm font-extrabold"}>{title}</span>
              </div>
              {subtitle && (
                <p style={subtitleColor ? { color: subtitleColor } : undefined} className="text-xs text-slate-500 mt-1 pl-1">
                  {subtitle}
                </p>
              )}
            </div>

            {/* Header Arrow Navigation */}
            {showArrows && arrowPosition === "header" && (
              <div className="hidden md:flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => scroll("left")}
                  aria-label="Previous items"
                  className="p-2 rounded-full border border-slate-200 dark:border-slate-800 transition-all bg-white dark:bg-slate-900 hover:bg-amber-500 hover:border-amber-500 hover:text-slate-950 text-slate-800 dark:text-slate-200 active:scale-95 cursor-pointer shadow-xs"
                >
                  <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
                </button>
                <button
                  type="button"
                  onClick={() => scroll("right")}
                  aria-label="Next items"
                  className="p-2 rounded-full border border-slate-200 dark:border-slate-800 transition-all bg-white dark:bg-slate-900 hover:bg-amber-500 hover:border-amber-500 hover:text-slate-950 text-slate-800 dark:text-slate-200 active:scale-95 cursor-pointer shadow-xs"
                >
                  <ChevronRight className="w-5 h-5 stroke-[2.5]" />
                </button>
              </div>
            )}
          </div>
        )}

        {hideHeader && showArrows && arrowPosition === "header" && (
          <div className="flex justify-end gap-2 mb-4 hidden md:flex">
            <button
              type="button"
              onClick={() => scroll("left")}
              aria-label="Previous items"
              className="p-2 rounded-full border border-slate-200 dark:border-slate-800 transition-all bg-white dark:bg-slate-900 hover:bg-amber-500 hover:border-amber-500 hover:text-slate-950 text-slate-800 dark:text-slate-200 active:scale-95 cursor-pointer shadow-xs"
            >
              <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
            </button>
            <button
              type="button"
              onClick={() => scroll("right")}
              aria-label="Next items"
              className="p-2 rounded-full border border-slate-200 dark:border-slate-800 transition-all bg-white dark:bg-slate-900 hover:bg-amber-500 hover:border-amber-500 hover:text-slate-950 text-slate-800 dark:text-slate-200 active:scale-95 cursor-pointer shadow-xs"
            >
              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* PRESENTATION: GRID vs CAROUSEL */}
        {/* ───────────────────────────────────────────────────────────── */}
        {isGrid ? (
          <div
            className={cn(
              "grid gap-4 sm:gap-6",
              gridColumnsDesktop === 2 ? "lg:grid-cols-2" :
              gridColumnsDesktop === 3 ? "lg:grid-cols-3" :
              gridColumnsDesktop === 5 ? "lg:grid-cols-5" :
              "lg:grid-cols-4",
              gridColumnsTablet === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2",
              gridColumnsMobile === 2 ? "grid-cols-2" : "grid-cols-1"
            )}
          >
            {items.map((item, itemIndex) => (
              <div key={`${item.id}-${itemIndex}`} className="w-full">
                {cardStyle ? (
                  <ShelfCard
                    item={item}
                    cardStyle={cardStyle}
                    cardSizeDesktop={cardSizeDesktop}
                    cardSizeMobile={cardSizeMobile}
                    index={itemIndex}
                    cardBgColor={item.cardBgColor || cardBgColor}
                    cardTextColor={item.cardTextColor || cardTextColor}
                    cardAccentColor={item.cardAccentColor || cardAccentColor}
                    cardBorder={item.cardBorder || cardBorder}
                    imageArrangement={imageArrangement}
                    elementOrder={elementOrder}
                    elements={elements}
                    customBadge={item.customBadge || customBadge}
                    customHeadline={item.customHeadline || customHeadline}
                    customTagline={item.customTagline || customTagline}
                    customPrice={item.customPrice || customPrice}
                    customLocation={item.customLocation || customLocation}
                    customBhk={item.customBhk || customBhk}
                    customArea={item.customArea || customArea}
                    customDeveloper={item.customDeveloper || customDeveloper}
                    customStatus={item.customStatus || customStatus}
                    customCtaText={item.customCtaText || customCtaText}
                    progressPercentage={item.progressPercentage}
                  />
                ) : item.itemType === 'property' ? (
                  <PropertyCard
                    property={item}
                    index={itemIndex}
                    variant={cardVariant}
                  />
                ) : (
                  <ProjectCard
                    project={item}
                    index={itemIndex}
                    variant={cardVariant}
                  />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="relative group">
            {/* Floating Side Arrows */}
            {showArrows && arrowPosition === "sides" && (
              <>
                <button
                  type="button"
                  onClick={() => scroll("left")}
                  aria-label="Previous items"
                  className="absolute -left-3 sm:-left-5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-slate-950/85 hover:bg-amber-500 hover:text-slate-950 text-white shadow-xl backdrop-blur-md border border-slate-700/80 flex items-center justify-center transition-all cursor-pointer opacity-90 hover:opacity-100 hover:scale-110 active:scale-95"
                >
                  <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
                </button>
                <button
                  type="button"
                  onClick={() => scroll("right")}
                  aria-label="Next items"
                  className="absolute -right-3 sm:-right-5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-slate-950/85 hover:bg-amber-500 hover:text-slate-950 text-white shadow-xl backdrop-blur-md border border-slate-700/80 flex items-center justify-center transition-all cursor-pointer opacity-90 hover:opacity-100 hover:scale-110 active:scale-95"
                >
                  <ChevronRight className="w-5 h-5 stroke-[2.5]" />
                </button>
              </>
            )}

            <div 
              ref={scrollRef}
              onPointerDown={pauseAutoSlide}
              onWheel={pauseAutoSlide}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className={cn(
                "flex overflow-x-auto snap-x snap-mandatory no-scrollbar scroll-smooth",
                cardStyle
                  ? "gap-3 sm:gap-5 md:gap-6 pb-4 sm:pb-6"
                  : cardVariant === "compact"
                  ? "gap-2.5 sm:gap-4 md:gap-5 pb-1 sm:pb-3"
                  : "gap-4 sm:gap-6 pb-4 sm:pb-6"
              )}
            >
              {loopCopies.map((loopIndex) =>
                items.map((item, itemIndex) => (
                  <div 
                    key={`${item.id}-loop-${loopIndex}-${itemIndex}`} 
                    className={cn(
                      "shrink-0 snap-start",
                      getResponsiveShelfCardWidthClass(cardStyle, cardSizeDesktop, cardSizeMobile, cardVariant)
                    )}
                  >
                    {cardStyle ? (
                      <ShelfCard
                        item={item}
                        cardStyle={cardStyle}
                        cardSizeDesktop={cardSizeDesktop}
                        cardSizeMobile={cardSizeMobile}
                        index={itemIndex}
                        cardBgColor={item.cardBgColor || cardBgColor}
                        cardTextColor={item.cardTextColor || cardTextColor}
                        cardAccentColor={item.cardAccentColor || cardAccentColor}
                        cardBorder={item.cardBorder || cardBorder}
                        imageArrangement={imageArrangement}
                        elementOrder={elementOrder}
                        elements={elements}
                        customBadge={item.customBadge || customBadge}
                        customHeadline={item.customHeadline || customHeadline}
                        customTagline={item.customTagline || customTagline}
                        customPrice={item.customPrice || customPrice}
                        customLocation={item.customLocation || customLocation}
                        customBhk={item.customBhk || customBhk}
                        customArea={item.customArea || customArea}
                        customDeveloper={item.customDeveloper || customDeveloper}
                        customStatus={item.customStatus || customStatus}
                        customCtaText={item.customCtaText || customCtaText}
                        progressPercentage={item.progressPercentage}
                      />
                    ) : item.itemType === 'property' ? (
                      <PropertyCard
                        property={item}
                        index={itemIndex}
                        variant={cardVariant}
                      />
                    ) : (
                      <ProjectCard
                        project={item}
                        index={itemIndex}
                        variant={cardVariant}
                      />
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Optional Pagination Indicator Dots */}
            {currentShowDots && hasMultiple && (
              <div className="flex items-center justify-center gap-1.5 pt-2">
                {items.slice(0, 8).map((_, dotIdx) => (
                  <span
                    key={dotIdx}
                    className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700 transition-all hover:bg-amber-500"
                  />
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </section>
  );
}
