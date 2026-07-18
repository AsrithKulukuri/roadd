"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, MapPin, Navigation } from "lucide-react";
import { PropertyCard } from "@/components/property/property-card";
import { Button } from "@/components/ui/button";
import { usePropertiesStore } from "@/stores/properties-store";
import { useGeolocation } from "@/hooks/use-geolocation";
import type { Property } from "@/types/property";

// Haversine formula to compute distance in kilometers
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface PropertyWithDistance extends Property {
  distance?: number;
}

export function FeaturedProperties() {
  const [activeFilter, setActiveFilter] = useState("all");
  const properties = usePropertiesStore((state) => state.properties);
  const { coordinates, requestLocation, permissionStatus } = useGeolocation();

  // 1. Calculate distances if location coordinates are active
  const processedProperties: PropertyWithDistance[] = properties.map((p) => {
    if (coordinates && p.location?.latitude && p.location?.longitude) {
      const dist = getDistance(
        coordinates.latitude,
        coordinates.longitude,
        p.location.latitude,
        p.location.longitude
      );
      return { ...p, distance: dist };
    }
    return p;
  });

  // 2. Filter featured listings (excluding sold ones)
  const featured = processedProperties.filter((p) => p.isFeatured && p.status !== 'sold');

  // 3. Sort by proximity first if location coordinates exist
  if (coordinates) {
    featured.sort((a, b) => {
      if (a.distance !== undefined && b.distance !== undefined) {
        return a.distance - b.distance;
      }
      if (a.distance !== undefined) return -1;
      if (b.distance !== undefined) return 1;
      return 0;
    });
  }

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
              {coordinates 
                ? "Premium listings organized by proximity to your current location."
                : "Explore our curated selection of premium properties handpicked for their exceptional value, location, and amenities."}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex p-1 bg-bg-card border border-border-default rounded-xl">
              <button
                type="button"
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
                type="button"
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
                type="button"
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
            <Button type="button" variant="outline" className="w-full sm:w-auto" asChild>
              <Link href="/properties">
                View All <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Location Request Prompt Banner */}
        {!coordinates && permissionStatus !== "denied" && (
          <div className="bg-gradient-to-r from-amber-primary/10 via-amber-primary/5 to-transparent border border-amber-primary/20 p-5 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4 mb-10 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-primary/10 flex items-center justify-center text-amber-primary shrink-0 border border-amber-primary/20">
                <Navigation className="w-5 h-5 animate-pulse" />
              </div>
              <div className="space-y-0.5">
                <h4 className="font-heading font-bold text-text-primary text-sm sm:text-base">Sort Listings by Proximity</h4>
                <p className="text-text-secondary text-xs sm:text-sm">Allow location access to show you the nearest premium listings in Visakhapatnam first.</p>
              </div>
            </div>
            <Button 
              type="button"
              variant="amber" 
              onClick={requestLocation} 
              className="rounded-xl px-5 h-11 shrink-0 font-semibold shadow-amber-glow"
            >
              <MapPin className="w-4 h-4 mr-2" />
              Find Nearest Properties
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {displayProperties.slice(0, 8).map((property, index) => (
            <PropertyCard
              key={property.id}
              property={property}
              distance={property.distance}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
