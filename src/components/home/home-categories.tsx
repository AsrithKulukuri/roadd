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
      <div className="container-road space-y-12">
        
        {/* Recommended Section */}
        {(recommendedProps.length > 0 || recommendedProjs.length > 0) && (
          <div className="space-y-8">
            {recommendedProps.length > 0 && (
              <PropertyCarouselRow
                title="Recommended Properties"
                icon={ThumbsUp}
                properties={recommendedProps}
                hideHeader={false}
                autoSlide={true}
                cardVariant="category-style"
              />
            )}
            {recommendedProjs.length > 0 && (
              <ProjectCarouselRow
                title="Recommended Projects"
                icon={ThumbsUp}
                projects={recommendedProjs}
                hideHeader={false}
                autoSlide={true}
                cardVariant="category-style"
              />
            )}
          </div>
        )}

        {/* Featured Section */}
        {(featuredProps.length > 0 || featuredProjs.length > 0) && (
          <div className="space-y-8">
            {featuredProps.length > 0 && (
              <PropertyCarouselRow
                title="Featured Properties"
                icon={Star}
                properties={featuredProps}
                hideHeader={false}
                autoSlide={true}
                cardVariant="category-style"
              />
            )}
            {featuredProjs.length > 0 && (
              <ProjectCarouselRow
                title="Featured Projects"
                icon={Star}
                projects={featuredProjs}
                hideHeader={false}
                autoSlide={true}
                cardVariant="category-style"
              />
            )}
          </div>
        )}

        {/* Budget Friendly Section */}
        {(budgetProps.length > 0 || budgetProjs.length > 0) && (
          <div className="space-y-8">
            {budgetProps.length > 0 && (
              <PropertyCarouselRow
                title="Budget Friendly Properties"
                icon={IndianRupee}
                properties={budgetProps}
                hideHeader={false}
                autoSlide={true}
                cardVariant="category-style"
              />
            )}
            {budgetProjs.length > 0 && (
              <ProjectCarouselRow
                title="Budget Friendly Projects"
                icon={IndianRupee}
                projects={budgetProjs}
                hideHeader={false}
                autoSlide={true}
                cardVariant="category-style"
              />
            )}
          </div>
        )}

      </div>
    </section>
  );
}
