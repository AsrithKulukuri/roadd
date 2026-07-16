import { PropertyCard } from "@/components/property/property-card";
import { mockProperties } from "@/lib/mock-data";
import type { Property } from "@/types/property";

interface PropertySimilarProps {
  currentProperty: Property;
}

export function PropertySimilar({ currentProperty }: PropertySimilarProps) {
  // Find properties with same type or same locality, exclude current
  const similarProperties = mockProperties.filter(p => 
    p.id !== currentProperty.id && 
    (p.propertyType === currentProperty.propertyType || p.location.locality === currentProperty.location.locality)
  ).slice(0, 4);

  if (similarProperties.length === 0) return null;

  return (
    <section className="py-12 border-t border-border-default/50 mt-12">
      <h3 className="font-heading text-2xl font-bold text-text-primary mb-6">
        Similar Properties You May Like
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {similarProperties.map((property, index) => (
          <PropertyCard
            key={property.id}
            property={property}
            index={index}
          />
        ))}
      </div>
    </section>
  );
}
