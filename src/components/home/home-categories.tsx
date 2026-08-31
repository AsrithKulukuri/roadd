"use client";

import { usePropertiesStore } from "@/stores/properties-store";
import { useProjectsStore } from "@/stores/projects-store";
import { MixedCarouselRow, type MixedItem } from "./mixed-carousel-row";
import { ThumbsUp, Star, IndianRupee } from "lucide-react";
import { useEffect } from "react";
import { useIsMounted } from "@/hooks/use-is-mounted";

export function HomeCategories() {
  const { properties, fetchProperties, isLoading: isPropsLoading, error: propsError } = usePropertiesStore();
  const { projects, fetchProjects, isLoading: isProjsLoading, error: projsError } = useProjectsStore();
  const mounted = useIsMounted();

  useEffect(() => {
    fetchProperties();
    fetchProjects();
  }, [fetchProperties, fetchProjects]);

  const isInitialLoading = !mounted || ((isPropsLoading && properties.length === 0) && (isProjsLoading && projects.length === 0));
  const isCompleteFailure = propsError && projsError && properties.length === 0 && projects.length === 0;

  if (isInitialLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-60 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
          <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={`skel-cat-${i}`} className="h-[280px] rounded-3xl bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 space-y-4 animate-pulse">
              <div className="w-full h-40 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-3/4" />
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isCompleteFailure) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4">
          <p className="text-sm text-slate-500">Could not load property categories.</p>
          <button
            type="button"
            onClick={() => {
              fetchProperties();
              fetchProjects();
            }}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-sm cursor-pointer"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
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
    <section className="py-2 sm:py-6 w-full">
      <div className="container-road space-y-3 sm:space-y-6">
        
        {/* 1. Recommended Section */}
        {recommendedMixed.length > 0 && (
          <MixedCarouselRow
            title="Recommended"
            icon={ThumbsUp}
            items={recommendedMixed}
            hideHeader={false}
            autoSlide={true}
            cardVariant="compact"
          />
        )}

        {/* 2. Featured Section */}
        {featuredMixed.length > 0 && (
          <MixedCarouselRow
            title="Featured"
            icon={Star}
            items={featuredMixed}
            hideHeader={false}
            autoSlide={true}
            cardVariant="compact"
          />
        )}

        {/* 3. Budget Friendly Section */}
        {budgetMixed.length > 0 && (
          <MixedCarouselRow
            title="Budget Friendly"
            icon={IndianRupee}
            items={budgetMixed}
            hideHeader={false}
            autoSlide={true}
            cardVariant="compact"
          />
        )}

      </div>
    </section>
  );
}
