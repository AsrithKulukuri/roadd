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
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"relevant" | "price-asc" | "price-desc" | "newest">("relevant");
  
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
          if (!prev.listingType.includes("sale")) {
            next.listingType = ["sale"];
            hasChanges = true;
          }
        } else if (typeRaw === "rent") {
          if (!prev.listingType.includes("rent")) {
            next.listingType = ["rent"];
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
    let result = properties.filter((property) => {
      // 1. Text Query Search (Location/Title/City/PropertyType)
      if (filters.query) {
        const query = filters.query.toLowerCase().trim();
        const stopWords = ["in", "at", "near", "for", "a", "an", "the", "of", "and"];
        const tokens = query.split(/\s+/).filter((t) => !stopWords.includes(t));

        const pType = (property.propertyType || "").toLowerCase().replace("-", " ");
        const lType = (property.listingType || "").toLowerCase();
        const city = (property.location?.city || "").toLowerCase();
        const locality = (property.location?.locality || "").toLowerCase();
        const address = (property.location?.address || "").toLowerCase();
        const title = (property.title || "").toLowerCase();

        const searchableText = `${title} ${locality} ${city} ${address} ${pType} ${lType}`;

        if (tokens.length > 0) {
          const matchesAll = tokens.every((token) => {
            const stem = token.length > 3 && token.endsWith("s") ? token.slice(0, -1) : token;
            
            if (stem === "apartment" || token === "flats" || token === "flat") {
              return pType.includes("apartment");
            }
            if (stem === "villa" || token === "house" || token === "houses") {
              return pType.includes("villa");
            }
            if (stem === "plot" || stem === "land") {
              return pType.includes("land") || pType.includes("plot");
            }
            if (stem === "shop" || stem === "office" || token === "commercial") {
              return pType.includes("commercial");
            }
            if (token === "pg" || token === "hostel") {
              return pType.includes("pg");
            }
            if (token === "farmhouse" || token === "farm") {
              return pType.includes("farmhouse");
            }
            return searchableText.includes(token) || searchableText.includes(stem);
          });
          if (!matchesAll) return false;
        } else if (!searchableText.includes(query)) {
          return false;
        }
      }

      // 2. Budget Range Filter
      if (filters.budget[0] > 0 || filters.budget[1] < 100000000) {
        if (property.price < filters.budget[0] || property.price > filters.budget[1]) {
          return false;
        }
      }

      // 3. Listing Type (Sale, Rent, PG)
      if (filters.listingType.length > 0) {
        const allowedTypes = filters.listingType.map((t) => (t === "buy" ? "sale" : t));
        if (!allowedTypes.includes(property.listingType)) return false;
      }

      // 4. Property Type (Apartment, Villa, Plot, etc.)
      if (filters.propertyType.length > 0) {
        if (!filters.propertyType.includes(property.propertyType)) return false;
      }

      // 5. BHK / Bedrooms
      if (filters.bhk.length > 0) {
        const beds = property.bedrooms;
        const matchesBHK = filters.bhk.some((b) => {
          if (b === "4+" || b.includes("4BHK and more") || b.includes("5+")) return beds >= 4;
          return beds.toString() === b.replace("BHK", "").trim();
        });
        if (!matchesBHK) return false;
      }

      // 6. Availability
      if (filters.availability.length > 0) {
        if (filters.availability.includes("ready") && !property.isReadyToMove) return false;
        if (filters.availability.includes("under-construction") && property.isReadyToMove) return false;
      }

      // 7. Sale Type (New / Resale)
      if (filters.saleType.length > 0) {
        if (filters.saleType.includes("new") && property.saleType !== "new") return false;
        if (filters.saleType.includes("resale") && property.saleType !== "resale") return false;
      }

      // 8. Posted By (Owner / Agent / Builder)
      if (filters.postedBy.length > 0) {
        if (!filters.postedBy.includes(property.ownerType)) return false;
      }

      return true;
    });

    // Sorting
    if (sortBy === "price-asc") {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price-desc") {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === "newest") {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return result;
  }, [properties, filters, sortBy]);

  const handleSelectLocationFromCarousel = (locationName: string) => {
    setFilters((prev) => ({ ...prev, query: locationName }));
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
        onOpenAllFilters={() => setIsFilterModalOpen(true)}
        totalResults={filteredProperties.length}
      />

      {/* Vijayawada & Guntur Location Highlights Carousel Bar */}
      <LocationCarousels
        onSelectLocation={handleSelectLocationFromCarousel}
        onSelectFilter={handleSelectFilterFromCarousel}
        activeLocation={filters.query}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 w-full mt-4">
        {/* Results Page Header Title & Control Bar */}
        <div className="mb-6 space-y-2">
          {/* Main Title */}
          <h1 className="text-2xl sm:text-3xl font-bold font-heading text-slate-900 capitalize tracking-tight">
            {searchHeading}
          </h1>

          {/* Sub Header Meta Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm pt-1">
            {/* Left: Count & Sort Dropdown */}
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

            {/* Right: How much home can I afford / Save Search */}
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

        {/* View Mode Rendering: Grid View vs Map View */}
        {viewMode === "map" ? (
          <div className="w-full h-[650px] rounded-3xl overflow-hidden border border-slate-200 shadow-lg bg-white">
            <MapWrapper filteredItems={filteredProperties} />
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
