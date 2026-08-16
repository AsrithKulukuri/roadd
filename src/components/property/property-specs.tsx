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
    { 
      label: "Facing Direction", 
      value: (() => {
        const raw = property.facing || (property.attributes as any)?.facing;
        if (!raw) return "East Facing";
        const formatted = raw.charAt(0).toUpperCase() + raw.slice(1);
        return formatted.toLowerCase().includes("facing") ? formatted : `${formatted} Facing`;
      })(), 
      icon: Compass 
    },
    { label: "Property Type", value: property.propertyType.replace("-", " ").toUpperCase(), icon: Building2 },
    { label: "Parking", value: property.parking > 0 ? `${property.parking} Covered` : "None", icon: Car },
    { label: "Floor", value: property.floorNumber ? `${property.floorNumber} of ${property.totalFloors}` : "N/A", icon: Layers },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-6 border-y border-slate-200">
      {specs.map((spec, i) => {
        const Icon = spec.icon;
        return (
          <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800 shrink-0 font-bold">
              <Icon className="w-5 h-5 text-slate-800" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-extrabold text-slate-900 text-sm sm:text-base truncate">{spec.value}</p>
              <p className="text-[11px] text-slate-500 font-medium capitalize truncate">{spec.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
