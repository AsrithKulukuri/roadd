"use client";

import { useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { usePropertiesStore } from "@/stores/properties-store";
import { PropertyCard } from "@/components/property/property-card";
import { SearchFilters, type FilterState } from "@/components/search/search-filters";
import { Building2 } from "lucide-react";

export default function PropertiesPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen pt-24 pb-16 bg-bg-primary flex items-center justify-center">Loading properties...</div>}>
      <PropertiesPage />
    </Suspense>
  )
}

function PropertiesPage() {
  const searchParams = useSearchParams();
  const initialType = searchParams.get("type");
  const initialLocation = searchParams.get("location");
  
  const properties = usePropertiesStore((state) => state.properties);

  const [filters, setFilters] = useState<FilterState>({
    query: initialLocation || "",
    listingType: initialType && ["buy", "sale", "rent", "pg", "commercial"].includes(initialType.toLowerCase()) 
      ? [initialType.toLowerCase() === "buy" ? "sale" : initialType.toLowerCase()] 
      : [],
    propertyType: [],
    bhk: [],
    budget: [0, 100000000],
    ageRange: [],
    saleType: [],
    availability: [],
    postedBy: [],
    furnished: [],
  });

  const filteredProperties = useMemo(() => {
    return properties.filter((property) => {
      // 1. Text Query Search (Location/Title/City)
      if (filters.query) {
        const query = filters.query.toLowerCase();
        const matchesQuery = 
          property.title.toLowerCase().includes(query) ||
          property.location.locality.toLowerCase().includes(query) ||
          property.location.city.toLowerCase().includes(query);
        if (!matchesQuery) return false;
      }

      // 2. Listing Type (Sale, Rent, PG)
      if (filters.listingType.length > 0) {
        // Handle "buy" mapped to "sale"
        const allowedTypes = filters.listingType.map(t => t === 'buy' ? 'sale' : t);
        if (!allowedTypes.includes(property.listingType)) return false;
      }

      // 3. Property Type (Apartment, Villa, etc.)
      if (filters.propertyType.length > 0) {
        if (!filters.propertyType.includes(property.propertyType)) return false;
      }

      // 4. BHK / Bedrooms
      if (filters.bhk.length > 0) {
        const beds = property.bedrooms;
        const matchesBHK = filters.bhk.some(b => {
          if (b.includes("5+") || b.includes("4BHK and more")) return beds >= 4;
          return beds.toString() === b.replace("BHK", "");
        });
        if (!matchesBHK) return false;
      }

      // 5. Age of Property
      if (filters.ageRange.length > 0) {
        const age = property.ageOfProperty;
        const matchesAge = filters.ageRange.some(a => {
          if (a === "0-10 years old") return age >= 0 && age <= 10;
          if (a === "10-30 years old") return age > 10 && age <= 30;
          if (a === "30+ years old") return age > 30;
          return false;
        });
        if (!matchesAge) return false;
      }

      // 6. Sale Type
      if (filters.saleType.length > 0) {
        const type = property.saleType === "new" ? "New property" : "Resale";
        if (!filters.saleType.includes(type)) return false;
      }

      // 7. Availability
      if (filters.availability.length > 0) {
        const av = property.isReadyToMove ? "Ready to move" : "Under construction";
        if (!filters.availability.includes(av)) return false;
      }

      // 8. Posted By
      if (filters.postedBy.length > 0) {
        const pb = property.ownerType.charAt(0).toUpperCase() + property.ownerType.slice(1);
        if (!filters.postedBy.includes(pb)) return false;
      }

      // 9. Furnished
      if (filters.furnished.length > 0) {
        const fur = property.furnishing === "semi-furnished" ? "Semi furnished" 
                  : property.furnishing === "unfurnished" ? "Unfurnished" : "Furnished";
        if (!filters.furnished.includes(fur)) return false;
      }

      return true;
    });
  }, [filters]);

  return (
    <div className="flex flex-col min-h-screen pt-24 pb-16 bg-bg-primary">
      <div className="container-road">
        <div className="mb-8">
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-text-primary mb-2">
            Search Properties
          </h1>
          <p className="text-text-secondary">
            Find exactly what you're looking for with our advanced search filters.
          </p>
        </div>

        <SearchFilters filters={filters} setFilters={setFilters} />

        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-semibold text-lg text-text-primary">
            {filteredProperties.length} {filteredProperties.length === 1 ? "Property" : "Properties"} Found
          </h2>
        </div>

        {filteredProperties.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProperties.map((property, index) => (
              <PropertyCard
                key={property.id}
                property={property}
                index={index}
              />
            ))}
          </div>
        ) : (
          <div className="w-full py-20 flex flex-col items-center justify-center text-center border border-border-default/50 rounded-3xl bg-bg-card shadow-sm">
            <div className="w-20 h-20 bg-amber-primary/10 text-amber-primary rounded-full flex items-center justify-center mb-4">
              <Building2 className="w-10 h-10" />
            </div>
            <h3 className="font-heading text-2xl font-bold text-text-primary mb-2">No properties found</h3>
            <p className="text-text-secondary max-w-md mx-auto mb-6">
              We couldn't find any properties matching your exact filters. Try broadening your search criteria.
            </p>
            <button 
              onClick={() => setFilters({
                query: "",
                listingType: [],
                propertyType: [],
                bhk: [],
                budget: [0, 100000000],
                ageRange: [],
                saleType: [],
                availability: [],
                postedBy: [],
                furnished: [],
              })}
              className="text-amber-primary font-medium hover:underline"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
