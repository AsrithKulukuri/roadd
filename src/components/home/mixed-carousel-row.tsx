"use client";

import { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Sparkles, type LucideIcon } from "lucide-react";
import { PropertyCard } from "@/components/property/property-card";
import { ProjectCard } from "@/components/project/project-card";
import type { Property } from "@/types/property";
import type { Project } from "@/types/project";
import { cn } from "@/lib/utils";

export type MixedItem = 
  | (Property & { itemType: 'property' })
  | (Project & { itemType: 'project' });

interface MixedCarouselRowProps {
  title: string;
  icon?: LucideIcon;
  items: MixedItem[];
  autoSlide?: boolean;
  hideHeader?: boolean;
  cardVariant?: "default" | "compact" | "horizontal" | "category-style";
}

export function MixedCarouselRow({
  title,
  icon: Icon = Sparkles,
  items,
  autoSlide = false,
  hideHeader = false,
  cardVariant = "default",
}: MixedCarouselRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(Math.ceil(scrollLeft + clientWidth) < scrollWidth);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [items]);

  useEffect(() => {
    if (!autoSlide || items.length === 0) return;

    const interval = setInterval(() => {
      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        const maxScroll = scrollWidth - clientWidth;
        
        // If reached the end, snap back to start
        if (Math.ceil(scrollLeft) >= maxScroll) {
          scrollRef.current.scrollTo({ left: 0, behavior: "smooth" });
        } else {
          // Scroll by one card width (assuming ~350px card + 24px gap = 374px)
          scrollRef.current.scrollBy({ left: 374, behavior: "smooth" });
        }
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [autoSlide, items.length]);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const amount = direction === "left" ? -400 : 400;
      scrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
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
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={() => scroll("left")}
                disabled={!canScrollLeft}
                className={`p-2 rounded-full border border-border-default transition-all ${
                  canScrollLeft 
                    ? "bg-bg-card hover:bg-bg-hover text-text-primary" 
                    : "bg-bg-primary text-border-default cursor-not-allowed"
                }`}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => scroll("right")}
                disabled={!canScrollRight}
                className={`p-2 rounded-full border border-border-default transition-all ${
                  canScrollRight 
                    ? "bg-bg-card hover:bg-bg-hover text-text-primary" 
                    : "bg-bg-primary text-border-default cursor-not-allowed"
                }`}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {hideHeader && (
          <div className="flex justify-end gap-2 mb-4 hidden md:flex">
            <button
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
              className={`p-2 rounded-full border border-border-default transition-all shadow-sm ${
                canScrollLeft 
                  ? "bg-bg-card hover:bg-bg-hover text-text-primary" 
                  : "bg-bg-primary text-border-default cursor-not-allowed"
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
              className={`p-2 rounded-full border border-border-default transition-all shadow-sm ${
                canScrollRight 
                  ? "bg-bg-card hover:bg-bg-hover text-text-primary" 
                  : "bg-bg-primary text-border-default cursor-not-allowed"
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="relative group">
          <div 
            ref={scrollRef}
            onScroll={checkScroll}
            className={cn(
              "flex overflow-x-auto snap-x snap-mandatory hide-scrollbar",
              cardVariant === "compact"
                ? "gap-2.5 sm:gap-4 md:gap-5 pb-1 sm:pb-3"
                : "gap-4 sm:gap-6 pb-4 sm:pb-6"
            )}
          >
            {items.map((item, index) => (
              <div 
                key={item.id} 
                className={cn(
                  "shrink-0 snap-start",
                  cardVariant === "compact"
                    ? "w-[170px] sm:w-[220px] md:w-[260px]"
                    : cardVariant === "category-style" 
                    ? "w-[160px] sm:w-[220px]" 
                    : "w-[220px] sm:w-[280px] md:w-[320px]"
                )}
              >
                {item.itemType === 'property' ? (
                  <PropertyCard
                    property={item}
                    index={index}
                    variant={cardVariant}
                  />
                ) : (
                  <ProjectCard
                    project={item}
                    index={index}
                    variant={cardVariant}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
