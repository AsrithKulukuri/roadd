"use client";

import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";
import type { Property } from "@/types/property";

// Dynamically import the map component with SSR disabled
const PropertyMap = dynamic(
  () => import("@/components/map/property-map"),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-[600px] rounded-3xl border border-border-default/50 bg-bg-card flex items-center justify-center shadow-sm">
        <div className="flex flex-col items-center gap-4 text-text-tertiary">
          <MapPin className="h-10 w-10 animate-pulse text-amber-primary" />
          <p className="font-medium text-text-secondary">Loading map interface...</p>
        </div>
      </div>
    )
  }
);

interface MapWrapperProps {
  filteredItems?: Property[];
}

export function MapWrapper({ filteredItems }: MapWrapperProps) {
  return <PropertyMap filteredItems={filteredItems} />;
}
