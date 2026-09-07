"use client";

import { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Sparkles, type LucideIcon } from "lucide-react";
import { PropertyCard } from "@/components/property/property-card";
import { ProjectCard } from "@/components/project/project-card";
import { ShelfCard } from "@/components/home/shelves/shelf-card";
import type { Property } from "@/types/property";
import type { Project } from "@/types/project";
import type { HomeCardStyleId } from "@/types/home-section";
import { cn } from "@/lib/utils";

export type MixedItem = 
  | (Property & { itemType: 'property'; progressPercentage?: number; customBadge?: string })
  | (Project & { itemType: 'project'; progressPercentage?: number; customBadge?: string });

interface MixedCarouselRowProps {
  title: string;
  icon?: LucideIcon;
  items: MixedItem[];
  autoSlide?: boolean;
  enableCarousel?: boolean;
  carouselInterval?: number;
  hideHeader?: boolean;
  cardVariant?: "default" | "compact" | "horizontal" | "category-style";
  cardStyle?: HomeCardStyleId;
  cardBgColor?: string;
  cardTextColor?: string;
  cardAccentColor?: string;
  customBadge?: string;
  customHeadline?: string;
  customTagline?: string;
}

function getStyleWidthClass(cardStyle?: HomeCardStyleId, legacyVariant?: string) {
  if (cardStyle) {
    switch (cardStyle) {
      case "compact-marketplace":
        return "w-[300px] sm:w-[360px] md:w-[410px]";
      case "tall-portrait":
        return "w-[260px] sm:w-[290px] md:w-[320px]";
      case "luxury-banner":
        return "w-[88vw] sm:w-[620px] lg:w-[840px]";
      case "split-feature":
        return "w-[88vw] sm:w-[560px] lg:w-[700px]";
      case "bottom-floating":
        return "w-[290px] sm:w-[400px] md:w-[480px]";
      case "modern-villa":
        return "w-[280px] sm:w-[390px] md:w-[460px]";
      case "construction-progress":
        return "w-[260px] sm:w-[300px] md:w-[330px]";
      case "dark-editorial":
        return "w-[88vw] sm:w-[480px] lg:w-[580px]";
      default:
        return "w-[300px] sm:w-[360px] md:w-[410px]";
    }
  }

  if (legacyVariant === "compact") return "w-[170px] sm:w-[220px] md:w-[260px]";
  if (legacyVariant === "category-style") return "w-[160px] sm:w-[220px]";
  return "w-[220px] sm:w-[280px] md:w-[320px]";
}

export function MixedCarouselRow({
  title,
  icon: Icon = Sparkles,
  items,
  autoSlide = false,
  enableCarousel = true,
  carouselInterval = 4,
  hideHeader = false,
  cardVariant = "default",
  cardStyle,
  cardBgColor,
  cardTextColor,
  cardAccentColor,
  customBadge,
  customHeadline,
  customTagline,
}: MixedCarouselRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const interactionPauseUntil = useRef(0);
  const isInitialized = useRef(false);

  // If carousel is disabled, only show 1 set of items without infinite loop
  const hasMultiple = items.length > 1;
  const loopCopies = (enableCarousel && hasMultiple) ? [0, 1, 2] : [0];

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

  // Initialize scroll position to the middle copy (copy 1) so user can scroll left or right infinitely
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !hasMultiple) return;

    const timer = setTimeout(() => {
      const step = getScrollStep();
      if (step > 0) {
        const setWidth = items.length * step;
        container.scrollLeft = setWidth;
        isInitialized.current = true;
      }
    }, 60);

    return () => clearTimeout(timer);
  }, [items.length, hasMultiple]);

  // Debounced normalization for manual user scrolling / swipe
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !hasMultiple) return;

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
  }, [items.length, hasMultiple]);

  // Infinite Auto-Slide
  useEffect(() => {
    if (!enableCarousel || !autoSlide || !hasMultiple || isHovered) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const ms = Math.max(2, Math.min(30, carouselInterval || 4)) * 1000;
    const interval = setInterval(() => {
      const container = scrollRef.current;
      if (!container || Date.now() < interactionPauseUntil.current) return;

      const step = getScrollStep();
      if (step <= 0) return;

      const setWidth = items.length * step;
      // If approaching the end of the 2nd loop, seamlessly reset to middle copy
      if (container.scrollLeft >= 2 * setWidth - 5) {
        container.scrollLeft -= setWidth;
      }

      container.scrollBy({ left: step, behavior: "smooth" });
    }, ms);

    return () => clearInterval(interval);
  }, [enableCarousel, autoSlide, isHovered, items.length, hasMultiple, carouselInterval]);

  const scroll = (direction: "left" | "right") => {
    const container = scrollRef.current;
    if (!container) return;
    pauseAutoSlide();
    const step = getScrollStep();
    if (step <= 0) return;

    const setWidth = items.length * step;

    if (direction === "right") {
      if (container.scrollLeft >= 2 * setWidth - 5) {
        container.scrollLeft -= setWidth;
      }
      container.scrollBy({ left: step, behavior: "smooth" });
    } else {
      if (container.scrollLeft <= step) {
        container.scrollLeft += setWidth;
      }
      container.scrollBy({ left: -step, behavior: "smooth" });
    }
  };

  if (items.length === 0) return null;

  return (
    <section className="py-1 relative">
      <div className="container-road">
        {!hideHeader && (
          <div className="mb-3 flex items-center justify-between gap-3 sm:mb-4">
            <div className="max-w-2xl">
              <div className="inline-flex min-h-10 items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-extrabold text-slate-950 shadow-sm">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-950 text-[#faad13]"><Icon className="h-3.5 w-3.5 shrink-0" /></span>
                <span>{title}</span>
              </div>
            </div>

            {/* Desktop Navigation */}
            {hasMultiple && (
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

        {hideHeader && hasMultiple && (
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

        <div className="relative group">
          <div 
            ref={scrollRef}
            onPointerDown={pauseAutoSlide}
            onWheel={pauseAutoSlide}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={cn(
              "flex overflow-x-auto snap-x snap-mandatory no-scrollbar",
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
                    getStyleWidthClass(cardStyle, cardVariant)
                  )}
                >
                  {cardStyle ? (
                    <ShelfCard
                      item={item}
                      cardStyle={cardStyle}
                      index={itemIndex}
                      cardBgColor={cardBgColor}
                      cardTextColor={cardTextColor}
                      cardAccentColor={cardAccentColor}
                      customBadge={customBadge}
                      customHeadline={customHeadline}
                      customTagline={customTagline}
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
        </div>

      </div>
    </section>
  );
}
