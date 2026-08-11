"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { ProjectCard } from "@/components/project/project-card";
import { Button } from "@/components/ui/button";
import type { Project } from "@/types/project";
import { cn } from "@/lib/utils";

interface ProjectCarouselRowProps {
  title: string;
  subtitle?: string;
  icon?: any;
  projects: Project[];
  autoSlide?: boolean;
  hideHeader?: boolean;
  cardVariant?: "default" | "compact" | "horizontal" | "category-style";
}

export function ProjectCarouselRow({
  title,
  subtitle,
  icon: Icon = Sparkles,
  projects,
  autoSlide = false,
  hideHeader = false,
  cardVariant = "default",
}: ProjectCarouselRowProps) {
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
  }, [projects]);

  useEffect(() => {
    if (!autoSlide || projects.length === 0) return;

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
  }, [autoSlide, projects.length]);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const amount = direction === "left" ? -400 : 400;
      scrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
    }
  };

  if (projects.length === 0) return null;

  return (
    <section className="py-2 sm:py-4 relative">
      <div className="container-road">
        {!hideHeader && (
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6 mb-8">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-primary/10 border border-amber-primary/20 text-amber-primary text-xs sm:text-sm font-semibold">
                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                {title}
              </div>
              <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold text-text-primary">
                {title}
              </h2>
              {subtitle && (
                <p className="text-text-secondary text-sm sm:text-lg">
                  {subtitle}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 hidden md:flex">
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
            {projects.map((project, index) => (
              <div 
                key={project.id} 
                className={cn(
                  "shrink-0 snap-start",
                  cardVariant === "category-style" 
                    ? "min-w-[220px] sm:min-w-[260px]" 
                    : "min-w-[280px] sm:min-w-[320px] md:min-w-[350px]"
                )}
              >
                <ProjectCard
                  project={project}
                  index={index}
                  variant={cardVariant}
                />
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
