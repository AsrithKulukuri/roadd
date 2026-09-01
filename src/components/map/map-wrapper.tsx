"use client";

import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";
import { useRef, useEffect, useState } from "react";
import type { SharedMapItem } from "@/types/map";

// Dynamically import the map component with SSR disabled
const PropertyMap = dynamic(
  () => import("@/components/map/property-map"),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[400px] bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <MapPin className="h-10 w-10 animate-pulse text-amber-primary" />
          <p className="font-medium text-slate-300">Loading map interface...</p>
        </div>
      </div>
    )
  }
);

interface MapWrapperProps {
  filteredItems?: SharedMapItem[];
  userLocation?: { lat: number, lng: number } | null;
  onVisibleItemsChange?: (visibleIds: string[]) => void;
}

export function MapWrapper({ filteredItems, userLocation, onVisibleItemsChange }: MapWrapperProps) {
  return (
    <div className="w-full h-full min-h-[400px] relative flex-1 overscroll-contain touch-none">
      <PropertyMap
        filteredItems={filteredItems}
        userLocation={userLocation}
        onVisibleItemsChange={onVisibleItemsChange}
      />
    </div>
  );
}
