import * as Icons from "lucide-react";
import type { PropertyAmenity } from "@/types/property";

interface PropertyAmenitiesProps {
  amenities: PropertyAmenity[];
}

export function PropertyAmenities({ amenities }: PropertyAmenitiesProps) {
  if (!amenities || amenities.length === 0) return null;

  return (
    <div className="py-6 border-b border-border-default/50">
      <h3 className="font-heading text-xl font-bold text-text-primary mb-4">
        Amenities
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {amenities.map((amenity) => {
          // Dynamic icon rendering
          // @ts-ignore
          const IconComponent = Icons[amenity.icon] || Icons.CheckCircle;
          
          return (
            <div key={amenity.id} className="flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-amber-500/50 transition-colors">
              <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 font-bold">
                <IconComponent className="w-4 h-4 text-amber-500" />
              </div>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {amenity.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
