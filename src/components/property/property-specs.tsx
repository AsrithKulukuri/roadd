"use client";

import { useState } from "react";
import { Bed, Bath, Maximize2, Compass, Building2, Car, Layers, Armchair, Clock, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import type { Property } from "@/types/property";
import { propertyTypeLabels, furnishingLabels } from "@/config/site";

interface PropertySpecsProps {
  property: Property;
}

export function PropertySpecs({ property }: PropertySpecsProps) {
  const [showAllMobile, setShowAllMobile] = useState(false);
  const attributes = property.attributes && typeof property.attributes === "object"
    ? property.attributes as Record<string, unknown>
    : {};

  const formatPropertyType = (type: string) => {
    if (!type) return "Residential";
    if (propertyTypeLabels[type]) return propertyTypeLabels[type];
    return type
      .split("-")
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  const facing = (() => {
    const raw = property.facing || (typeof attributes.facing === "string" ? attributes.facing : "");
    if (!raw) return "East Facing";
    const formatted = raw.charAt(0).toUpperCase() + raw.slice(1);
    return formatted.toLowerCase().includes("facing") ? formatted : `${formatted} Facing`;
  })();

  const furnishing = (() => {
    const raw = property.furnishing || (typeof attributes.furnishing === "string" ? attributes.furnishing : "");
    if (!raw) return "Semi-Furnished";
    return furnishingLabels[raw] || raw.charAt(0).toUpperCase() + raw.slice(1);
  })();

  const age = (() => {
    const raw = property.ageOfProperty;
    if (raw === undefined || raw === null) return "Ready to Move";
    if (raw === 0) return "Brand New (< 1 yr)";
    return `${raw} Years Old`;
  })();

  const areaText = (() => {
    if (property.area) return `${property.area.toLocaleString()} sq.ft`;
    if (property.builtUpArea) return `${property.builtUpArea.toLocaleString()} sq.ft`;
    if (property.carpetArea) return `${property.carpetArea.toLocaleString()} sq.ft`;
    return null;
  })();

  const directUds = "uds" in property ? (property as Property & { uds?: string | number }).uds : undefined;
  const attributeUds = typeof attributes.uds === "string" || typeof attributes.uds === "number" ? attributes.uds : undefined;
  const uds = directUds || attributeUds;

  const specs = [
    { label: "Bedrooms", value: property.bedrooms > 0 ? `${property.bedrooms} BHK` : "1 BHK", icon: Bed, sub: "Configuration" },
    { label: "Bathrooms", value: property.bathrooms > 0 ? `${property.bathrooms} Baths` : "1 Bath", icon: Bath, sub: "Washrooms" },
    { label: "Facing", value: facing, icon: Compass, sub: "Vastu Direction" },
    { label: "Property Type", value: formatPropertyType(property.propertyType), icon: Building2, sub: "Category" },
    ...(areaText ? [{ label: "Built-up Area", value: areaText, icon: Maximize2, sub: "Super Area" }] : []),
    ...(uds ? [{ label: "Undivided Share", value: `${uds} sq.yds`, icon: Sparkles, sub: "Land Share (UDS)" }] : []),
    { label: "Furnishing", value: furnishing, icon: Armchair, sub: "Interior Status" },
    { label: "Parking", value: property.parking > 0 ? `${property.parking} Covered` : "Available", icon: Car, sub: "Vehicle Space" },
    { label: "Floor Level", value: property.floorNumber ? `${property.floorNumber} of ${property.totalFloors || property.floorNumber}` : (property.propertyType === "independent-house" ? "Independent" : "Ground Floor"), icon: Layers, sub: "Floor Level" },
    { label: "Property Age", value: age, icon: Clock, sub: "Construction" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
      {specs.map((spec, i) => {
        const Icon = spec.icon;
        return (
          <div
            key={i} 
            className={`${i >= 5 && !showAllMobile ? "hidden min-[480px]:flex" : "flex"} min-h-[92px] items-center gap-2.5 p-3 rounded-2xl !bg-white border border-slate-200 hover:border-amber-500/60 transition-colors shadow-sm`}
          >
            <div className="w-9 h-9 rounded-full bg-slate-50 border border-slate-300 flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-amber-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-normal font-extrabold !text-[#64748b] leading-tight break-words">
                {spec.label}
              </p>
              <p className="font-extrabold !text-[#0f172a] text-[13px] sm:text-sm break-words mt-1 leading-snug opacity-100">
                {spec.value}
              </p>
              <p className="hidden sm:block text-[10px] text-slate-400 font-medium break-words mt-1 leading-snug">
                {spec.sub}
              </p>
            </div>
          </div>
        );
      })}

      {specs.length > 5 && (
        <button
          type="button"
          aria-expanded={showAllMobile}
          onClick={() => setShowAllMobile((current) => !current)}
          className="col-span-2 min-[480px]:hidden flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm font-extrabold text-amber-700 transition-colors hover:bg-amber-500/15 dark:text-amber-400"
        >
          <span>{showAllMobile ? "Show fewer specifications" : `View ${specs.length - 5} more specifications`}</span>
          {showAllMobile ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
}
