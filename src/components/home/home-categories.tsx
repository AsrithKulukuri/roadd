"use client";

import { usePropertiesStore } from "@/stores/properties-store";
import { useProjectsStore } from "@/stores/projects-store";
import { MixedCarouselRow, type MixedItem } from "./mixed-carousel-row";
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

  const recommendedMixed: MixedItem[] = [
    ...recommendedProps.map(p => ({ ...p, itemType: 'property' as const })),
    ...recommendedProjs.map(p => ({ ...p, itemType: 'project' as const }))
  ];

  const featuredMixed: MixedItem[] = [
    ...featuredProps.map(p => ({ ...p, itemType: 'property' as const })),
    ...featuredProjs.map(p => ({ ...p, itemType: 'project' as const }))
  ];

  const budgetMixed: MixedItem[] = [
    ...budgetProps.map(p => ({ ...p, itemType: 'property' as const })),
    ...budgetProjs.map(p => ({ ...p, itemType: 'project' as const }))
  ];

  return (
    <section className="py-8">
      <div className="container-road space-y-12">
        
        {/* Recommended Section */}
        {recommendedMixed.length > 0 && (
          <div className="space-y-8">
            <MixedCarouselRow
              title="Recommended"
              icon={ThumbsUp}
              items={recommendedMixed}
              hideHeader={false}
              autoSlide={true}
              cardVariant="category-style"
            />
          </div>
        )}

        {/* Featured Section */}
        {featuredMixed.length > 0 && (
          <div className="space-y-8">
            <MixedCarouselRow
              title="Featured"
              icon={Star}
              items={featuredMixed}
              hideHeader={false}
              autoSlide={true}
              cardVariant="category-style"
            />
          </div>
        )}

        {/* Budget Friendly Section */}
        {budgetMixed.length > 0 && (
          <div className="space-y-8">
            <MixedCarouselRow
              title="Budget Friendly"
              icon={IndianRupee}
              items={budgetMixed}
              hideHeader={false}
              autoSlide={true}
              cardVariant="category-style"
            />
          </div>
        )}

      </div>
    </section>
  );
}
