import { Bed, Bath, Maximize2, Compass, Calendar, Building2, Car, Layers, Armchair, Clock, ShieldCheck, Sparkles } from "lucide-react";
import type { Property } from "@/types/property";
import { formatArea } from "@/lib/utils";
import { propertyTypeLabels, furnishingLabels } from "@/config/site";

interface PropertySpecsProps {
  property: Property;
}

export function PropertySpecs({ property }: PropertySpecsProps) {
  const formatPropertyType = (type: string) => {
    if (!type) return "Residential";
    if (propertyTypeLabels[type]) return propertyTypeLabels[type];
    return type
      .split("-")
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  const facing = (() => {
    const raw = property.facing || (property.attributes as any)?.facing;
    if (!raw) return "East Facing";
    const formatted = raw.charAt(0).toUpperCase() + raw.slice(1);
    return formatted.toLowerCase().includes("facing") ? formatted : `${formatted} Facing`;
  })();

  const furnishing = (() => {
    const raw = property.furnishing || (property.attributes as any)?.furnishing;
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

  const uds = (property as any).uds || (property.attributes as any)?.uds;

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
            className="flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800/90 hover:border-amber-500/50 dark:hover:border-amber-500/40 hover:shadow-md transition-all group duration-200"
          >
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-amber-500 shrink-0 font-bold shadow-2xs group-hover:scale-105 transition-transform">
              <Icon className="w-5 h-5 text-amber-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-[11px] uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400 truncate">
                {spec.label}
              </p>
              <p className="font-black text-slate-900 dark:text-white text-xs sm:text-sm truncate mt-0.5 leading-snug">
                {spec.value}
              </p>
              <p className="text-[10px] text-text-tertiary font-medium truncate mt-0.5">
                {spec.sub}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
