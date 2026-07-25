import { Bed, Bath, Maximize2, Compass, Calendar, Building2, Car, Layers } from "lucide-react";
import type { Property } from "@/types/property";
import { formatArea } from "@/lib/utils";

interface PropertySpecsProps {
  property: Property;
}

export function PropertySpecs({ property }: PropertySpecsProps) {
  const specs = [
    { label: "Bedrooms", value: property.bedrooms > 0 ? property.bedrooms : "N/A", icon: Bed },
    { label: "Bathrooms", value: property.bathrooms > 0 ? property.bathrooms : "N/A", icon: Bath },
    { label: "Area", value: formatArea(property.area), icon: Maximize2 },
    { label: "Facing", value: property.facing ? property.facing.charAt(0).toUpperCase() + property.facing.slice(1) : "N/A", icon: Compass },
    { label: "Age", value: property.ageOfProperty === 0 ? "New Property" : `${property.ageOfProperty} Years`, icon: Calendar },
    { label: "Property Type", value: property.propertyType.replace("-", " ").toUpperCase(), icon: Building2 },
    { label: "Parking", value: property.parking > 0 ? `${property.parking} Covered` : "None", icon: Car },
    { label: "Floor", value: property.floorNumber ? `${property.floorNumber} of ${property.totalFloors}` : "N/A", icon: Layers },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-6 border-y border-slate-200 dark:border-slate-800">
      {specs.map((spec, i) => {
        const Icon = spec.icon;
        return (
          <div key={i} className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0 font-bold">
              <Icon className="w-5 h-5 text-amber-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-amber-500 font-black uppercase tracking-wider truncate">{spec.label}</p>
              <p className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm truncate">{spec.value}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
