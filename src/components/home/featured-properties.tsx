"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { PropertyCard } from "@/components/property/property-card";
import { Button } from "@/components/ui/button";
import { usePropertiesStore } from "@/stores/properties-store";

export function FeaturedProperties() {
  const [activeFilter, setActiveFilter] = useState("all");
  const properties = usePropertiesStore((state) => state.properties);

  const featured = properties.filter((p) => p.isFeatured && p.status !== 'sold');
  const saleProperties = featured.filter((p) => p.listingType === "sale");
  const rentProperties = featured.filter((p) => p.listingType === "rent");

  const displayProperties =
    activeFilter === "all"
      ? featured
      : activeFilter === "sale"
      ? saleProperties
      : rentProperties;

  return (
    <section className="py-12 sm:py-20 relative">
      <div className="container-road">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6 mb-8 sm:mb-12">
          <div className="max-w-2xl space-y-3 sm:space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-primary/10 border border-amber-primary/20 text-amber-primary text-xs sm:text-sm font-semibold">
              <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Handpicked Selection
            </div>
            <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold text-text-primary">
              Featured Properties
            </h2>
            <p className="text-text-secondary text-sm sm:text-lg">
              Explore our curated selection of premium properties handpicked for their
              exceptional value, location, and amenities.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex p-1 bg-bg-card border border-border-default rounded-xl">
              <button
                onClick={() => setActiveFilter("all")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeFilter === "all"
                    ? "bg-bg-hover text-text-primary shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveFilter("sale")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeFilter === "sale"
                    ? "bg-bg-hover text-text-primary shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                For Sale
              </button>
              <button
                onClick={() => setActiveFilter("rent")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeFilter === "rent"
                    ? "bg-bg-hover text-text-primary shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                For Rent
              </button>
            </div>
            <Button variant="outline" className="w-full sm:w-auto" asChild>
              <Link href="/properties">
                View All <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {displayProperties.slice(0, 8).map((property, index) => (
            <PropertyCard
              key={property.id}
              property={property}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
