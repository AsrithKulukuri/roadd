"use client";

import { usePropertiesStore } from "@/stores/properties-store";
import { PropertyCarouselRow } from "./property-carousel-row";
import { ThumbsUp, Star, IndianRupee } from "lucide-react";
import { useEffect, useState } from "react";

export function HomeCategories() {
  const { properties, fetchProperties } = usePropertiesStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // If properties are empty, fetch them
    if (properties.length === 0) {
      fetchProperties();
    }
    setMounted(true);
  }, [properties.length, fetchProperties]);

  if (!mounted) {
    return <div className="h-[400px] flex items-center justify-center">Loading categories...</div>;
  }

  // Filter properties based on mutually exclusive displayCategory
  // We exclude 'sold' or 'hidden' properties if we strictly want active ones
  const activeProperties = properties.filter((p) => p.status !== 'sold' && p.status !== 'hidden');

  const recommended = activeProperties.filter((p) => p.displayCategory === 'recommended');
  const featured = activeProperties.filter((p) => p.displayCategory === 'featured');
  const budgetFriendly = activeProperties.filter((p) => p.displayCategory === 'budget_friendly');

  return (
    <div className="flex flex-col gap-4">
      {recommended.length > 0 && (
        <PropertyCarouselRow
          title="Recommended Properties"
          subtitle="Handpicked premium listings closest to your location."
          icon={ThumbsUp}
          properties={recommended}
          autoSlide={false}
        />
      )}
      
      {featured.length > 0 && (
        <PropertyCarouselRow
          title="Featured Properties"
          subtitle="Explore our curated selection of premium properties."
          icon={Star}
          properties={featured}
          autoSlide={true}
        />
      )}
      
      {budgetFriendly.length > 0 && (
        <PropertyCarouselRow
          title="Budget Friendly Properties"
          subtitle="Affordable options without compromising on quality."
          icon={IndianRupee}
          properties={budgetFriendly}
          autoSlide={false}
        />
      )}
    </div>
  );
}
