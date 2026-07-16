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
            <div key={amenity.id} className="flex items-center gap-3 p-3 rounded-2xl bg-bg-card/50 border border-border-default/50 hover:border-amber-primary/30 transition-colors">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-primary/10 flex items-center justify-center text-amber-primary">
                <IconComponent className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium text-text-secondary">
                {amenity.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
