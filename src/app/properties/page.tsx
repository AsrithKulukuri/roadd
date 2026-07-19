"use client";

import { useState, useMemo, Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { usePropertiesStore } from "@/stores/properties-store";
import { PropertyCard } from "@/components/property/property-card";
import { SearchFilters, type FilterState } from "@/components/search/search-filters";
import { Building2, ArrowLeft, Heart, ChevronDown } from "lucide-react";

export default function PropertiesPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen pt-24 pb-16 bg-bg-primary flex items-center justify-center">Loading properties...</div>}>
      <PropertiesPage />
    </Suspense>
  )
}

function PropertiesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialType = searchParams.get("type");
  const initialLocation = searchParams.get("location");
  
  const properties = usePropertiesStore((state) => state.properties);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  useEffect(() => {
    const loc = searchParams.get("location");
    const type = searchParams.get("type");
    const bhk = searchParams.get("bhk");
    const budget = searchParams.get("budget");

    setFilters(prev => {
      let hasChanges = false;
      const next = { ...prev };
      
      if (loc !== null && loc !== prev.query) {
        next.query = loc;
        hasChanges = true;
      }
      
      if (type !== null) {
        const parsedType = type.toLowerCase() === "buy" ? "sale" : type.toLowerCase();
        if (!prev.listingType.includes(parsedType)) {
          next.listingType = [parsedType];
          hasChanges = true;
        }
      }
      
      if (bhk !== null && !prev.bhk.includes(bhk)) {
        next.bhk = [bhk];
        hasChanges = true;
      }
      
      if (budget !== null) {
        const parts = budget.split(",");
        if (parts.length === 2) {
          const min = parseInt(parts[0]);
          const max = parseInt(parts[1]);
          if (prev.budget[0] !== min || prev.budget[1] !== max) {
            next.budget = [min, max];
            hasChanges = true;
          }
        }
      }
      
      return hasChanges ? next : prev;
    });
  }, [searchParams]);

  const filteredProperties = useMemo(() => {
    return properties.filter((property) => {
      // 1. Text Query Search (Location/Title/City/PropertyType)
      if (filters.query) {
        const query = filters.query.toLowerCase().trim();
        const tokens = query.split(/\s+/).filter(t => !['in', 'at', 'near', 'for', 'a', 'an', 'the'].includes(t));
        
        const searchableText = `${property.title} ${property.location.locality} ${property.location.city} ${property.propertyType.replace('-', ' ')}`.toLowerCase();
        
        if (tokens.length > 0) {
          const matchesAllTokens = tokens.every(token => searchableText.includes(token));
          if (!matchesAllTokens) return false;
        } else if (!searchableText.includes(query)) {
          return false;
        }
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

  if (!mounted) {
    return <div className="min-h-screen pt-24 pb-16 bg-bg-primary flex items-center justify-center">Loading properties...</div>;
  }

  return (
    <div className="flex flex-col min-h-screen pt-24 pb-16 bg-bg-primary">
      <div className="container-road">
        <SearchFilters filters={filters} setFilters={setFilters} />

        <div className="mb-6 flex flex-col gap-3">
          {/* Dynamic Title */}
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-text-primary capitalize">
            {filters.query ? `${filters.query} homes for sale & real estate` : "Homes for sale & real estate"}
          </h1>
          
          {/* Count, Sort, and Save Search Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-text-primary">
                {filteredProperties.length.toLocaleString()} {filteredProperties.length === 1 ? "Home" : "Homes"}
              </span>
              <button className="flex items-center gap-1 text-sm font-medium text-text-secondary hover:text-text-primary">
                Sort <ChevronDown className="w-4 h-4" />
              </button>
            </div>
            
            <button className="flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-text-primary">
              <Heart className="w-5 h-5" />
              <span className="hidden sm:inline">Save search</span>
            </button>
          </div>
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
