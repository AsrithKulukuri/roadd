"use client";

import { useState, useMemo, Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { usePropertiesStore } from "@/stores/properties-store";
import { PropertyCard } from "@/components/property/property-card";
import { SearchFilters, type FilterState } from "@/components/search/search-filters";
import { MapWrapper } from "@/components/map/map-wrapper";
import { Building2, ArrowLeft, Heart, ChevronDown, LayoutGrid, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  
  const properties = usePropertiesStore((state) => state.properties);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const parseInitialParams = () => {
    const loc = searchParams.get("location") || searchParams.get("q") || searchParams.get("search") || "";
    const typeRaw = searchParams.get("type")?.toLowerCase() || "";
    
    let listingType: string[] = [];
    let propertyType: string[] = [];

    if (typeRaw) {
      if (typeRaw === "buy" || typeRaw === "sale") listingType = ["sale"];
      else if (typeRaw === "rent") listingType = ["rent"];
      else if (["apartment", "villa", "residential-land", "commercial-spaces", "pg", "farmhouse"].includes(typeRaw)) {
        propertyType = [typeRaw];
      }
    }

    return {
      query: loc,
      listingType,
      propertyType,
      bhk: [],
      budget: [0, 100000000] as [number, number],
      ageRange: [],
      saleType: [],
      availability: [],
      postedBy: [],
      furnished: [],
    };
  };

  const [filters, setFilters] = useState<FilterState>(parseInitialParams);

  useEffect(() => {
    const loc = searchParams.get("location") || searchParams.get("q") || searchParams.get("search") || "";
    const typeRaw = searchParams.get("type")?.toLowerCase() || "";
    const bhk = searchParams.get("bhk");
    const budget = searchParams.get("budget");

    setFilters((prev) => {
      let hasChanges = false;
      const next = { ...prev };

      if (loc !== prev.query) {
        next.query = loc;
        hasChanges = true;
      }

      if (typeRaw) {
        if (typeRaw === "buy" || typeRaw === "sale") {
          if (!prev.listingType.includes("sale")) {
            next.listingType = ["sale"];
            hasChanges = true;
          }
        } else if (typeRaw === "rent") {
          if (!prev.listingType.includes("rent")) {
            next.listingType = ["rent"];
            hasChanges = true;
          }
        } else {
          if (!prev.propertyType.includes(typeRaw)) {
            next.propertyType = [typeRaw];
            hasChanges = true;
          }
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
        const stopWords = ["in", "at", "near", "for", "a", "an", "the", "of"];
        const tokens = query.split(/\s+/).filter((t) => !stopWords.includes(t));

        const pType = (property.propertyType || "").toLowerCase().replace("-", " ");
        const lType = (property.listingType || "").toLowerCase();
        const city = (property.location?.city || "").toLowerCase();
        const locality = (property.location?.locality || "").toLowerCase();
        const address = (property.location?.address || "").toLowerCase();
        const title = (property.title || "").toLowerCase();
        const desc = (property.description || "").toLowerCase();

        const searchableText = `${title} ${locality} ${city} ${address} ${pType} ${lType} ${desc}`;

        if (tokens.length > 0) {
          const matchesAll = tokens.every((token) => {
            const stem = token.length > 3 && token.endsWith("s") ? token.slice(0, -1) : token;
            if (stem === "apartment" || token === "flats" || token === "flat") {
              return pType.includes("apartment") || searchableText.includes("apartment");
            }
            if (stem === "villa" || token === "house" || token === "houses") {
              return pType.includes("villa") || searchableText.includes("villa");
            }
            if (stem === "plot" || stem === "land") {
              return pType.includes("land") || pType.includes("plot") || searchableText.includes("plot") || searchableText.includes("land");
            }
            if (stem === "shop" || stem === "office" || token === "commercial") {
              return pType.includes("commercial") || searchableText.includes("commercial");
            }
            return searchableText.includes(token) || searchableText.includes(stem);
          });
          if (!matchesAll) return false;
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
          
          {/* Count, Sort, Grid/Map View Switcher, and Save Search Row */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-text-primary">
                {filteredProperties.length.toLocaleString()} {filteredProperties.length === 1 ? "Home" : "Homes"}
              </span>
              <button className="flex items-center gap-1 text-sm font-medium text-text-secondary hover:text-text-primary">
                Sort <ChevronDown className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex items-center gap-3">
              {/* View Switcher: Grid View vs Map View */}
              <div className="flex items-center gap-1 bg-bg-card border border-border-default/80 rounded-full p-1 shadow-sm">
                <button
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200",
                    viewMode === "grid"
                      ? "bg-amber-primary text-black shadow-amber-glow"
                      : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  Grid
                </button>
                <button
                  onClick={() => setViewMode("map")}
                  className={cn(
                    "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200",
                    viewMode === "map"
                      ? "bg-amber-primary text-black shadow-amber-glow"
                      : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  Map ({filteredProperties.length})
                </button>
              </div>

              <button className="flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-text-primary">
                <Heart className="w-5 h-5" />
                <span className="hidden sm:inline">Save search</span>
              </button>
            </div>
          </div>
        </div>

        {viewMode === "map" ? (
          <div className="w-full h-[650px] rounded-3xl overflow-hidden border border-border-default/60 shadow-xl bg-bg-card">
            <MapWrapper filteredItems={filteredProperties} />
          </div>
        ) : filteredProperties.length > 0 ? (
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
