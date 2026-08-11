"use client";

import { usePropertiesStore } from "@/stores/properties-store";
import { PropertyCarouselRow } from "./property-carousel-row";
import { ThumbsUp, Star, IndianRupee } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type CategoryTab = "recommended" | "featured" | "budget_friendly";

export function HomeCategories() {
  const { properties, fetchProperties } = usePropertiesStore();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<CategoryTab>("recommended");

  useEffect(() => {
    fetchProperties();
    setMounted(true);
  }, [fetchProperties]);

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

  const recommended = activeProperties.filter((p) => p.displayCategory === 'recommended');
  const featured = activeProperties.filter((p) => p.displayCategory === 'featured');
  const budgetFriendly = activeProperties.filter((p) => p.displayCategory === 'budget_friendly');

  return (
    <section className="py-8">
      <div className="container-road">
        {/* Compact Title and Tabs */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
          <h2 className="text-xl sm:text-2xl font-heading font-bold text-text-primary">
            Explore Properties
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2 p-1 bg-bg-card border border-border-default rounded-xl shadow-sm">
            <button
              onClick={() => setActiveTab("recommended")}
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
              onClick={() => setActiveTab("featured")}
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
              onClick={() => setActiveTab("budget_friendly")}
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
        <div className="mt-2">
          {activeTab === "recommended" && recommended.length > 0 && (
            <PropertyCarouselRow
              title="Recommended Properties"
              properties={recommended}
              hideHeader={true}
              autoSlide={false}
            />
          )}
          {activeTab === "recommended" && recommended.length === 0 && (
            <div className="py-12 text-center text-text-tertiary text-sm">No recommended properties found.</div>
          )}

          {activeTab === "featured" && featured.length > 0 && (
            <PropertyCarouselRow
              title="Featured Properties"
              properties={featured}
              hideHeader={true}
              autoSlide={true}
            />
          )}
          {activeTab === "featured" && featured.length === 0 && (
            <div className="py-12 text-center text-text-tertiary text-sm">No featured properties found.</div>
          )}

          {activeTab === "budget_friendly" && budgetFriendly.length > 0 && (
            <PropertyCarouselRow
              title="Budget Friendly Properties"
              properties={budgetFriendly}
              hideHeader={true}
              autoSlide={false}
            />
          )}
          {activeTab === "budget_friendly" && budgetFriendly.length === 0 && (
            <div className="py-12 text-center text-text-tertiary text-sm">No budget friendly properties found.</div>
          )}
        </div>
      </div>
    </section>
  );
}
