"use client";

import { useState, useMemo, Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { usePropertiesStore } from "@/stores/properties-store";
import { PropertyCard } from "@/components/property/property-card";
import { SearchFilters, type FilterState } from "@/components/search/search-filters";
import { RealtorSearchHeader } from "@/components/search/realtor-search-header";
import { LocationCarousels } from "@/components/search/location-carousels";
import { MapWrapper } from "@/components/map/map-wrapper";
import { Building2, ChevronDown, Heart, HelpCircle, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PropertiesPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen pt-24 pb-16 bg-slate-50 flex items-center justify-center font-medium text-slate-600">Loading properties...</div>}>
      <PropertiesPage />
    </Suspense>
  );
}

function PropertiesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const [sortBy, setSortBy] = useState<"relevant" | "price-asc" | "price-desc" | "newest">("relevant");
  
  const properties = usePropertiesStore((state) => state.properties);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll on mobile when map view is active so ONLY the map moves
  useEffect(() => {
    if (viewMode === "map" && typeof window !== "undefined" && window.innerWidth < 768) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [viewMode]);

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

    if (loc) {
      const lowerLoc = loc.toLowerCase();
      if ((lowerLoc.includes("apartment") || lowerLoc.includes("flat")) && propertyType.length === 0) {
        propertyType = ["apartment"];
      } else if ((lowerLoc.includes("villa") || lowerLoc.includes("house")) && propertyType.length === 0) {
        propertyType = ["villa"];
      } else if ((lowerLoc.includes("plot") || lowerLoc.includes("land")) && propertyType.length === 0) {
        propertyType = ["residential-land"];
      } else if ((lowerLoc.includes("commercial") || lowerLoc.includes("shop") || lowerLoc.includes("office")) && propertyType.length === 0) {
        propertyType = ["commercial-spaces"];
      } else if (lowerLoc.includes("pg") && propertyType.length === 0) {
        propertyType = ["pg"];
      } else if (lowerLoc.includes("farmhouse") && propertyType.length === 0) {
        propertyType = ["farmhouse"];
      }

      if ((lowerLoc.includes("rent") || lowerLoc.includes("rental")) && listingType.length === 0) {
        listingType = ["rent"];
      } else if ((lowerLoc.includes("sale") || lowerLoc.includes("buy")) && listingType.length === 0) {
        listingType = ["sale"];
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
          next.listingType = ["sale"];
          hasChanges = true;
        } else if (typeRaw === "rent") {
          next.listingType = ["rent"];
          hasChanges = true;
        } else if (["apartment", "villa", "residential-land", "commercial-spaces", "pg", "farmhouse"].includes(typeRaw)) {
          next.propertyType = [typeRaw];
          hasChanges = true;
        }
      }
      if (bhk) {
        next.bhk = bhk.split(",");
        hasChanges = true;
      }
      if (budget) {
        const parts = budget.split(",").map(Number);
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          next.budget = [parts[0], parts[1]];
          hasChanges = true;
        }
      }

      return hasChanges ? next : prev;
    });
  }, [searchParams]);

  // Filter properties based on FilterState
  const filteredProperties = useMemo(() => {
    return properties.filter((property: any) => {
      // 1. Location & Free Text Query Match
      if (filters.query.trim()) {
        const queryLower = filters.query.toLowerCase().trim();
        const stopWords = ["in", "at", "near", "for", "a", "an", "the", "of"];
        const tokens = queryLower.split(/\s+/).filter((t) => !stopWords.includes(t));

        const title = (property.title || "").toLowerCase();
        const city = (property.location?.city || "").toLowerCase();
        const locality = (property.location?.locality || "").toLowerCase();
        const address = (property.location?.address || "").toLowerCase();
        const propType = (property.propertyType || "").toLowerCase().replace("-", " ");
        const listType = (property.listingType || "").toLowerCase();
        const desc = (property.description || "").toLowerCase();

        const searchableText = `${title} ${locality} ${city} ${address} ${propType} ${listType} ${desc}`;

        const isMatch = tokens.every((token) => {
          const stem = token.length > 3 && token.endsWith("s") ? token.slice(0, -1) : token;
          if (stem === "apartment" || token === "flats" || token === "flat") {
            return propType.includes("apartment") || searchableText.includes("apartment");
          }
          if (stem === "villa" || token === "house" || token === "houses") {
            return propType.includes("villa") || searchableText.includes("villa");
          }
          if (stem === "plot" || stem === "land") {
            return propType.includes("land") || propType.includes("plot") || searchableText.includes("plot") || searchableText.includes("land");
          }
          if (stem === "shop" || stem === "office" || token === "commercial") {
            return propType.includes("commercial") || searchableText.includes("commercial");
          }
          return searchableText.includes(token) || searchableText.includes(stem);
        });

        if (!isMatch) return false;
      }

      // 2. Listing Type (sale/rent)
      if (filters.listingType.length > 0) {
        if (!filters.listingType.includes(property.listingType)) return false;
      }

      // 3. Property Type (apartment/villa/land/commercial)
      if (filters.propertyType.length > 0) {
        if (!filters.propertyType.includes(property.propertyType)) return false;
      }

      // 4. BHK Filter
      if (filters.bhk.length > 0) {
        const propBhk = property.bedrooms ? property.bedrooms.toString() : "";
        const matchesBhk = filters.bhk.some((b) => {
          if (b === "4+") return (property.bedrooms || 0) >= 4;
          return propBhk === b;
        });
        if (!matchesBhk) return false;
      }

      // 5. Budget Range (INR)
      if (property.price < filters.budget[0] || property.price > filters.budget[1]) {
        return false;
      }

      // 6. Availability (ready/under-construction)
      if (filters.availability.length > 0 && property.possessionStatus) {
        if (!filters.availability.includes(property.possessionStatus)) return false;
      }

      // 7. Posted By (owner/agent/builder)
      if (filters.postedBy.length > 0 && property.postedBy) {
        if (!filters.postedBy.includes(property.postedBy)) return false;
      }

      // 8. Sale Type (new/resale)
      if (filters.saleType.length > 0 && property.saleType) {
        if (!filters.saleType.includes(property.saleType)) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === "price-asc") return a.price - b.price;
      if (sortBy === "price-desc") return b.price - a.price;
      if (sortBy === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return 0; // default relevant
    });
  }, [properties, filters, sortBy]);

  const handleSelectLocationFromCarousel = (locationName: string) => {
    setFilters((prev) => ({
      ...prev,
      query: locationName === prev.query ? "" : locationName,
    }));
  };

  const handleSelectFilterFromCarousel = (filterType: string, value: any) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (filterType === "budget") next.budget = value;
      if (filterType === "bhk") next.bhk = value;
      if (filterType === "propertyType") next.propertyType = value;
      if (filterType === "postedBy") next.postedBy = value;
      if (filterType === "availability") next.availability = value;
      return next;
    });
  };

  if (!mounted) {
    return (
      <div className="min-h-screen pt-24 pb-16 bg-slate-50 flex items-center justify-center text-slate-500 font-medium">
        Loading properties...
      </div>
    );
  }

  const searchHeading = filters.query
    ? `${filters.query} homes for sale & real estate`
    : "AP homes for sale & real estate";

  return (
    <div className="flex flex-col min-h-screen pt-16 pb-16 bg-slate-50/50 text-slate-900">
      {/* Realtor.com Inspired Sticky Search Header & Filter Bar */}
      <RealtorSearchHeader
        filters={filters}
        onFilterChange={setFilters}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onOpenAllFilters={() => {}}
        totalResults={filteredProperties.length}
      />

      {/* Vijayawada & Guntur Location Highlights Carousel Bar */}
      {viewMode === "grid" && (
        <LocationCarousels
          onSelectLocation={handleSelectLocationFromCarousel}
          onSelectFilter={handleSelectFilterFromCarousel}
          activeLocation={filters.query}
        />
      )}

      {/* Main Content Area */}
      <main className={cn("w-full transition-all", viewMode === "map" ? "mt-0" : "max-w-7xl mx-auto px-4 sm:px-6 mt-4")}>
        {/* Results Page Header Title & Control Bar (Grid View Only) */}
        {viewMode === "grid" && (
          <div className="mb-6 space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold font-heading text-slate-900 capitalize tracking-tight">
              {searchHeading}
            </h1>

            <div className="flex flex-wrap items-center justify-between gap-3 text-sm pt-1">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-slate-900">
                  {filteredProperties.length.toLocaleString()} {filteredProperties.length === 1 ? "Home" : "Homes"}
                </span>
                <span className="text-slate-300">|</span>
                <div className="flex items-center gap-1 text-slate-600 font-medium">
                  <span>Sort by</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-transparent font-semibold text-slate-900 focus:outline-none cursor-pointer border-b border-transparent hover:border-slate-400"
                  >
                    <option value="relevant">Relevant listings</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="newest">Newest listings</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Link
                  href="/mortgage-calculator"
                  className="text-xs sm:text-sm font-semibold text-amber-600 hover:text-amber-700 hover:underline flex items-center gap-1"
                >
                  <HelpCircle className="w-4 h-4 text-amber-500" />
                  <span>How much home can I afford?</span>
                </Link>
                <button
                  onClick={() => alert("Search saved to your favorites!")}
                  className="flex items-center gap-1.5 text-slate-700 hover:text-amber-600 font-semibold text-xs sm:hidden"
                >
                  <Heart className="w-4 h-4" /> Save search
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Mode Rendering: Mobile Fixed Full-Viewport Map Mode vs Grid View */}
        {viewMode === "map" ? (
          <div>
            {/* Mobile View: Fixed Full Screen Viewport directly below header */}
            <div className="md:hidden fixed top-16 left-0 right-0 bottom-0 z-40 bg-slate-950 overflow-hidden touch-none flex flex-col">
              <MapWrapper filteredItems={filteredProperties} />
            </div>

            {/* Desktop View: Sleek Container */}
            <div className="hidden md:block w-full h-[650px] rounded-3xl overflow-hidden border border-slate-200 shadow-lg bg-white">
              <MapWrapper filteredItems={filteredProperties} />
            </div>
          </div>
        ) : filteredProperties.length > 0 ? (
          /* Realtor.com 3-Column Responsive Grid Layout on Desktop */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 pb-12">
            {filteredProperties.map((property, index) => (
              <PropertyCard
                key={property.id}
                property={property}
                index={index}
              />
            ))}
          </div>
        ) : (
          /* Empty Search State */
          <div className="w-full py-20 flex flex-col items-center justify-center text-center border border-slate-200 rounded-3xl bg-white shadow-xs my-6 px-4">
            <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mb-4">
              <Building2 className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">No properties found</h3>
            <p className="text-slate-600 max-w-md mx-auto mb-6 text-sm">
              We couldn't find any properties matching your search in Vijayawada & Guntur. Try resetting or selecting a different location.
            </p>
            <button
              onClick={() =>
                setFilters({
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
                })
              }
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm rounded-full transition-all shadow-xs cursor-pointer"
            >
              Clear all filters
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
