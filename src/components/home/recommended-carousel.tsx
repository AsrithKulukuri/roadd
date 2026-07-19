"use client";

import React, { useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { PropertyCard } from "@/components/property/property-card";
import { usePropertiesStore } from "@/stores/properties-store";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
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

export function RecommendedCarousel() {
  const { properties } = usePropertiesStore();
  const { coordinates } = useGeolocation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  
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

  // 2. Filter recommended properties
  const recommendedList = processedProperties.filter((p) => p.isRecommended);

  // 3. Sort by proximity first if location coordinates exist
  if (coordinates) {
    recommendedList.sort((a, b) => {
      if (a.distance !== undefined && b.distance !== undefined) {
        return a.distance - b.distance;
      }
      if (a.distance !== undefined) return -1;
      if (b.distance !== undefined) return 1;
      return 0;
    });
  }


  const recommendedProperties = recommendedList.slice(0, 10);

  const autoplayPlugin = Autoplay({ delay: 3000, stopOnInteraction: false, stopOnMouseEnter: true });

  // Initialize Embla Carousel with Autoplay
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { 
      loop: true, 
      align: "start",
      skipSnaps: false,
    },
    [autoplayPlugin]
  );

  const [prevBtnEnabled, setPrevBtnEnabled] = useState(false);
  const [nextBtnEnabled, setNextBtnEnabled] = useState(false);

  const scrollPrev = React.useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = React.useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  const onSelect = React.useCallback(() => {
    if (!emblaApi) return;
    setPrevBtnEnabled(emblaApi.canScrollPrev());
    setNextBtnEnabled(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
  }, [emblaApi, onSelect]);

  if (!mounted) {
    return <div className="h-[400px] flex items-center justify-center">Loading recommendations...</div>;
  }

  // If no properties are recommended, don't render the section
  if (recommendedList.length === 0) return null;

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
      <div className="flex items-center justify-between mb-5 sm:mb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold font-heading text-text-primary">
            Recommended Properties
          </h2>
          <p className="text-text-secondary mt-1 sm:mt-2 text-sm sm:text-base">
            {coordinates 
              ? "Handpicked premium listings closest to your location."
              : "Hand-picked selections tailored just for you."}
          </p>
        </div>
        
        {/* Navigation Arrows */}
        <div className="hidden sm:flex gap-2">
          <Button 
            type="button"
            variant="outline" 
            size="icon" 
            onClick={scrollPrev} 
            disabled={!prevBtnEnabled}
            className="rounded-full w-10 h-10 border-border-default text-text-secondary hover:text-text-primary"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Button 
            type="button"
            variant="outline" 
            size="icon" 
            onClick={scrollNext} 
            disabled={!nextBtnEnabled}
            className="rounded-full w-10 h-10 border-border-default text-text-secondary hover:text-text-primary"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex -ml-3 sm:-ml-4">
          {recommendedProperties.map((property) => (
            <div 
              key={property.id} 
              className="flex-[0_0_80%] min-w-0 sm:flex-[0_0_50%] lg:flex-[0_0_33.333%] xl:flex-[0_0_25%] pl-3 sm:pl-4"
            >
              <PropertyCard property={property} distance={property.distance} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
