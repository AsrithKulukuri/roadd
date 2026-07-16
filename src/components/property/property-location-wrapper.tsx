"use client";

import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";

const PropertyLocationMap = dynamic(
  () => import("@/components/property/property-location-map"),
  { 
    ssr: false, 
    loading: () => (
      <div className="w-full h-[350px] md:h-[450px] rounded-3xl bg-bg-card border border-border-default/50 flex flex-col items-center justify-center text-text-tertiary">
        <MapPin className="w-10 h-10 mb-2 opacity-50 animate-pulse" />
        <p className="animate-pulse text-sm">Loading interactive map...</p>
      </div>
    )
  }
);

interface Props {
  latitude: number;
  longitude: number;
  title: string;
}

export function PropertyLocationWrapper(props: Props) {
  return <PropertyLocationMap {...props} />;
}
