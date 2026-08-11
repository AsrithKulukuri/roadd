"use client";

import { usePropertiesStore } from "@/stores/properties-store";
import { useProjectsStore } from "@/stores/projects-store";
import { PropertyCarouselRow } from "./property-carousel-row";
import { ProjectCarouselRow } from "./project-carousel-row";
import { ThumbsUp, Star, IndianRupee } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type CategoryTab = "recommended" | "featured" | "budget_friendly";

export function HomeCategories() {
  const { properties, fetchProperties } = usePropertiesStore();
  const { projects, fetchProjects } = useProjectsStore();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<CategoryTab | null>(null);

  useEffect(() => {
    fetchProperties();
    fetchProjects();
    setMounted(true);
  }, [fetchProperties, fetchProjects]);

  if (!mounted) {
    return <div className="h-[400px] flex items-center justify-center">Loading properties...</div>;
  }

  // Filter properties and normalize displayCategory for legacy cached data
  const normalizedProperties = properties.map((p) => {
    if (!p.displayCategory) {
      if (p.isFeatured) return { ...p, displayCategory: 'featured' as const };
      if (p.isRecommended) return { ...p, displayCategory: 'recommended' as const };
      return { ...p, displayCategory: 'none' as const };
    }
    return p;
  });

  const activeProperties = normalizedProperties.filter((p) => p.status !== 'sold' && p.status !== 'hidden');

  const recommendedProps = activeProperties.filter((p) => p.displayCategory === 'recommended');
  const featuredProps = activeProperties.filter((p) => p.displayCategory === 'featured');
  const budgetProps = activeProperties.filter((p) => p.displayCategory === 'budget_friendly');

  const normalizedProjects = projects.map((p) => {
    if (!p.displayCategory) {
      return { ...p, displayCategory: (p.isFeatured ? 'featured' : 'none') as "none" | "featured" | "recommended" | "budget_friendly" };
    }
    return p;
  });

  const activeProjects = normalizedProjects.filter((p) => p.isPublished);

  const recommendedProjs = activeProjects.filter((p) => p.displayCategory === 'recommended');
  const featuredProjs = activeProjects.filter((p) => p.displayCategory === 'featured');
  const budgetProjs = activeProjects.filter((p) => p.displayCategory === 'budget_friendly');

  return (
    <section className="py-8">
      <div className="container-road">
        {/* Compact Title and Tabs */}
        <div className="flex justify-center mb-8 sm:mb-12">
          <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2 p-1 bg-bg-card border border-border-default rounded-xl shadow-sm">
            <button
              onClick={() => setActiveTab(activeTab === "recommended" ? null : "recommended")}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeTab === "recommended"
                  ? "bg-amber-primary text-bg-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-primary"
              }`}
            >
              <ThumbsUp className="w-3.5 h-3.5" />
              Recommended
            </button>
            <button
              onClick={() => setActiveTab(activeTab === "featured" ? null : "featured")}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeTab === "featured"
                  ? "bg-amber-primary text-bg-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-primary"
              }`}
            >
              <Star className="w-3.5 h-3.5" />
              Featured
            </button>
            <button
              onClick={() => setActiveTab(activeTab === "budget_friendly" ? null : "budget_friendly")}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeTab === "budget_friendly"
                  ? "bg-amber-primary text-bg-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-primary"
              }`}
            >
              <IndianRupee className="w-3.5 h-3.5" />
              Budget Friendly
            </button>
          </div>
        </div>

        {/* Dynamic Content Area */}
        <div className="mt-2 space-y-8">
          {activeTab === "recommended" && recommendedProps.length > 0 && (
            <PropertyCarouselRow
              title="Recommended Properties"
              properties={recommendedProps}
              hideHeader={true}
              autoSlide={false}
              cardVariant="category-style"
            />
          )}
          {activeTab === "recommended" && recommendedProjs.length > 0 && (
            <ProjectCarouselRow
              title="Recommended Projects"
              projects={recommendedProjs}
              hideHeader={true}
              autoSlide={false}
              cardVariant="category-style"
            />
          )}
          {activeTab === "recommended" && recommendedProps.length === 0 && recommendedProjs.length === 0 && (
            <div className="py-12 text-center text-text-tertiary text-sm">No recommended properties or projects found.</div>
          )}

          {activeTab === "featured" && featuredProps.length > 0 && (
            <PropertyCarouselRow
              title="Featured Properties"
              properties={featuredProps}
              hideHeader={true}
              autoSlide={true}
              cardVariant="category-style"
            />
          )}
          {activeTab === "featured" && featuredProjs.length > 0 && (
            <ProjectCarouselRow
              title="Featured Projects"
              projects={featuredProjs}
              hideHeader={true}
              autoSlide={true}
              cardVariant="category-style"
            />
          )}
          {activeTab === "featured" && featuredProps.length === 0 && featuredProjs.length === 0 && (
            <div className="py-12 text-center text-text-tertiary text-sm">No featured properties or projects found.</div>
          )}

          {activeTab === "budget_friendly" && budgetProps.length > 0 && (
            <PropertyCarouselRow
              title="Budget Friendly Properties"
              properties={budgetProps}
              hideHeader={true}
              autoSlide={false}
              cardVariant="category-style"
            />
          )}
          {activeTab === "budget_friendly" && budgetProjs.length > 0 && (
            <ProjectCarouselRow
              title="Budget Friendly Projects"
              projects={budgetProjs}
              hideHeader={true}
              autoSlide={false}
              cardVariant="category-style"
            />
          )}
          {activeTab === "budget_friendly" && budgetProps.length === 0 && budgetProjs.length === 0 && (
            <div className="py-12 text-center text-text-tertiary text-sm">No budget friendly properties or projects found.</div>
          )}
        </div>
      </div>
    </section>
  );
}
