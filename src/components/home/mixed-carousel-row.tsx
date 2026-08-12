"use client";

import { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
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
  icon?: any;
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
  }, []);

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
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 sm:gap-4 mb-3">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-primary/10 border border-amber-primary/20 text-amber-primary text-xs sm:text-sm font-semibold">
                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                {title}
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
            className="flex gap-6 overflow-x-auto snap-x snap-mandatory hide-scrollbar pb-6"
          >
            {items.map((item, index) => (
              <div 
                key={item.id} 
                className={cn(
                  "shrink-0 snap-start",
                  cardVariant === "category-style" 
                    ? "min-w-[220px] sm:min-w-[260px]" 
                    : "min-w-[280px] sm:min-w-[320px] md:min-w-[350px]"
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
