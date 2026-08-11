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
        {/* Modern Tabs UI */}
        <div className="flex flex-col items-center mb-6">
          <h2 className="text-3xl font-heading font-bold text-text-primary mb-6">
            Explore Categories
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 p-1.5 bg-bg-card border border-border-default rounded-2xl shadow-sm">
            <button
              onClick={() => setActiveTab("recommended")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === "recommended"
                  ? "bg-amber-primary text-bg-primary shadow-md"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-primary"
              }`}
            >
              <ThumbsUp className="w-4 h-4" />
              Recommended
            </button>
            <button
              onClick={() => setActiveTab("featured")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === "featured"
                  ? "bg-amber-primary text-bg-primary shadow-md"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-primary"
              }`}
            >
              <Star className="w-4 h-4" />
              Featured
            </button>
            <button
              onClick={() => setActiveTab("budget_friendly")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === "budget_friendly"
                  ? "bg-amber-primary text-bg-primary shadow-md"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-primary"
              }`}
            >
              <IndianRupee className="w-4 h-4" />
              Budget Friendly
            </button>
          </div>
        </div>

        {/* Dynamic Content Area */}
        <div className="mt-4">
          {activeTab === "recommended" && recommended.length > 0 && (
            <PropertyCarouselRow
              title="Recommended Properties"
              subtitle="Handpicked premium listings closest to your location."
              icon={ThumbsUp}
              properties={recommended}
              autoSlide={false}
            />
          )}
          {activeTab === "recommended" && recommended.length === 0 && (
            <div className="py-20 text-center text-text-tertiary">No recommended properties found.</div>
          )}

          {activeTab === "featured" && featured.length > 0 && (
            <PropertyCarouselRow
              title="Featured Properties"
              subtitle="Explore our curated selection of premium properties."
              icon={Star}
              properties={featured}
              autoSlide={true}
            />
          )}
          {activeTab === "featured" && featured.length === 0 && (
            <div className="py-20 text-center text-text-tertiary">No featured properties found.</div>
          )}

          {activeTab === "budget_friendly" && budgetFriendly.length > 0 && (
            <PropertyCarouselRow
              title="Budget Friendly Properties"
              subtitle="Affordable options without compromising on quality."
              icon={IndianRupee}
              properties={budgetFriendly}
              autoSlide={false}
            />
          )}
          {activeTab === "budget_friendly" && budgetFriendly.length === 0 && (
            <div className="py-20 text-center text-text-tertiary">No budget friendly properties found.</div>
          )}
        </div>
      </div>
    </section>
  );
}
