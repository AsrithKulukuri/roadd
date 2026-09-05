"use client";

import { useState, useMemo, Suspense, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { usePropertiesStore } from "@/stores/properties-store";
import { PropertyCard } from "@/components/property/property-card";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import { SearchFiltersModal, initialFilterState, type FilterState } from "@/components/search/search-filters";
import { RealtorSearchHeader } from "@/components/search/realtor-search-header";
import { LocationCarousels } from "@/components/search/location-carousels";
import { MapWrapper } from "@/components/map/map-wrapper";
import { Building2, ChevronDown, Heart, HelpCircle, ArrowLeft, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { matchesPropertySearch } from "@/lib/search-engine";
import { toast } from "sonner";

function PropertiesPageSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="h-10 w-64 bg-slate-200/80 dark:bg-slate-800 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <SkeletonCard key={`prop-skel-${i}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PropertiesPageWrapper() {
  return (
    <Suspense fallback={<PropertiesPageSkeleton />}>
      <PropertiesPage />
    </Suspense>
  );
}

function PropertiesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialViewMode = searchParams.get("view") === "map" ? "map" : "grid";
  const [viewMode, setViewMode] = useState<"grid" | "map">(initialViewMode);
  const [sortBy, setSortBy] = useState<"relevant" | "price-asc" | "price-desc" | "newest">("relevant");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState<number>(12);
  const [filterReferenceTime] = useState(Date.now);
  
  const properties = usePropertiesStore((state) => state.properties);
  const isLoading = usePropertiesStore((state) => state.isLoading);
  const error = usePropertiesStore((state) => state.error);
  const fetchProperties = usePropertiesStore((state) => state.fetchProperties);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchProperties();
  }, [fetchProperties]);

  // Keep viewMode in sync with URL searchParams
  useEffect(() => {
    const currentView = searchParams.get("view") === "map" ? "map" : "grid";
    if (currentView !== viewMode) {
      setViewMode(currentView);
    }
  }, [searchParams]);

  const handleViewModeChange = useCallback((mode: "grid" | "map") => {
    setViewMode(mode);
    const newParams = new URLSearchParams(searchParams.toString());
    if (mode === "map") {
      newParams.set("view", "map");
    } else {
      newParams.delete("view");
    }
    const queryStr = newParams.toString();
    router.replace(`/properties${queryStr ? `?${queryStr}` : ""}`, { scroll: false });
  }, [searchParams, router]);

  // Lock body & document scroll when map view is active so ONLY the map moves
  useEffect(() => {
    if (viewMode === "map" && typeof window !== "undefined") {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    } else {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    }
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, [viewMode]);

  const parseInitialParams = (): FilterState => {
    const loc = searchParams.get("location") || searchParams.get("q") || searchParams.get("search") || "";
    const typeRaw = searchParams.get("type")?.toLowerCase() || "";
    
    let listingType: string[] = [];
    let propertyType: string[] = [];

    if (typeRaw) {
      if (typeRaw === "buy" || typeRaw === "sale") listingType = ["sale"];
      else if (typeRaw === "rent") listingType = ["rent"];
      else if (["apartment", "villa", "residential-land", "commercial-spaces", "pg", "farmhouse", "agricultural-lands"].includes(typeRaw)) {
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

    const budgetRaw = searchParams.get("budget");
    let budget: [number, number] = [0, 100000000];
    if (budgetRaw) {
      const parts = budgetRaw.split(",").map(Number);
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        budget = [parts[0], parts[1]];
      }
    }

    const saleTypeRaw = searchParams.get("saleType");
    let saleType: string[] = [];
    if (saleTypeRaw) {
      saleType = saleTypeRaw.split(",");
    }

    return {
      ...initialFilterState,
      query: loc,
      listingType,
      propertyType,
      saleType,
      budget,
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
        } else if (["apartment", "villa", "residential-land", "commercial-spaces", "pg", "farmhouse", "agricultural-lands"].includes(typeRaw)) {
          next.propertyType = [typeRaw];
          hasChanges = true;
        }
      }
      const saleType = searchParams.get("saleType");
      if (saleType) {
        next.saleType = saleType.split(",");
        hasChanges = true;
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
      // 0a. Cities filter
      if (filters.cities && filters.cities.length > 0) {
        const propCity = (property.location?.city || "").toLowerCase();
        const matchesCity = filters.cities.some((c) => propCity.includes(c.toLowerCase()));
        if (!matchesCity) return false;
      }

      // 0b. Localities filter
      if (filters.localities && filters.localities.length > 0) {
        const propLoc = (property.location?.locality || "").toLowerCase();
        const propAddr = (property.location?.address || "").toLowerCase();
        const matchesLoc = filters.localities.some((l) => propLoc.includes(l.toLowerCase()) || propAddr.includes(l.toLowerCase()));
        if (!matchesLoc) return false;
      }

      // 0c. Gated Community filter
      if (filters.gatedCommunity) {
        const title = (property.title || "").toLowerCase();
        const desc = (property.description || "").toLowerCase();
        const isGated = Boolean(property.isGatedCommunity) || title.includes("gated") || desc.includes("gated") || (property.amenities && property.amenities.some((a: any) => typeof a === "string" && a.toLowerCase().includes("gated")));
        if (!isGated) return false;
      }

      // 1. Intelligent Location & Free Text Query Match
      if (filters.query.trim() && !matchesPropertySearch(property, filters.query)) {
        return false;
      }

      // 2. Listing Type (sale/rent/pg)
      if (filters.listingType.length > 0) {
        if (!filters.listingType.includes(property.listingType)) return false;
      }

      // 2b. Sale Type (new / resale)
      if (filters.saleType && filters.saleType.length > 0) {
        if (property.saleType && !filters.saleType.includes(property.saleType)) return false;
      }

      // 3. Property Type (apartment/villa/land/commercial/agricultural)
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

      // 6. Availability / Construction Status
      if (filters.availability.length > 0) {
        const isReady = property.isReadyToMove;
        const matchesAvailability = filters.availability.some((av) => {
          if (av === "ready") return isReady;
          if (av === "under-construction") return !isReady;
          return true;
        });
        if (!matchesAvailability) return false;
      }

      // 7. Posted By (owner/agent/builder)
      if (filters.postedBy.length > 0 && property.postedBy) {
        if (!filters.postedBy.includes(property.postedBy)) return false;
      }

      // 8. Facing Direction (East, West, North, South)
      if (filters.facing.length > 0 && property.facing) {
        if (!filters.facing.includes(property.facing.toLowerCase())) return false;
      }

      // 9. Vastu & RERA Badges
      if (filters.vastuCompliant && !property.vastuCompliant) return false;
      if (filters.reraApproved && !property.reraId) return false;

      // 10. Posted Since Date Filter
      if (filters.postedSince && filters.postedSince !== "any" && filters.postedSince !== "") {
        const propDateStr = property.createdAt || property.publishedAt || property.updatedAt;
        if (propDateStr) {
          const propTime = new Date(propDateStr).getTime();
          const now = filterReferenceTime;
          const ps = filters.postedSince.toLowerCase();
          let maxAgeMs = 0;
          if (ps === "1day" || ps === "yesterday" || ps === "1d") maxAgeMs = 1 * 24 * 60 * 60 * 1000;
          else if (ps === "3days" || ps === "3d") maxAgeMs = 3 * 24 * 60 * 60 * 1000;
          else if (ps === "7days" || ps === "1week" || ps === "7d") maxAgeMs = 7 * 24 * 60 * 60 * 1000;
          else if (ps === "15days" || ps === "2weeks" || ps === "15d") maxAgeMs = 15 * 24 * 60 * 60 * 1000;
          else if (ps === "30days" || ps === "1month" || ps === "30d") maxAgeMs = 30 * 24 * 60 * 60 * 1000;
          else if (ps === "60days" || ps === "2months" || ps === "60d") maxAgeMs = 60 * 24 * 60 * 60 * 1000;
          else if (ps === "90days" || ps === "3months" || ps === "90d") maxAgeMs = 90 * 24 * 60 * 60 * 1000;

          if (maxAgeMs > 0 && (now - propTime) > maxAgeMs) return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === "price-asc") return a.price - b.price;
      if (sortBy === "price-desc") return b.price - a.price;
      if (sortBy === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return 0; // default relevant
    });
  }, [properties, filters, sortBy, filterReferenceTime]);

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

  if (!mounted || (isLoading && properties.length === 0)) {
    return <PropertiesPageSkeleton />;
  }

  if (error && properties.length === 0) {
    return (
      <div className="min-h-screen pt-28 pb-16 bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center text-center px-4">
        <div className="max-w-md w-full p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
            <Building2 className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Unable to Load Properties</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{error}</p>
          <button
            onClick={() => fetchProperties()}
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm transition-all cursor-pointer shadow-md"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  const searchHeading = filters.query
    ? `${filters.query} homes for sale & real estate`
    : "AP homes for sale & real estate";

  return (
    <div
      className={cn(
        "flex flex-col w-full bg-slate-50/50 text-slate-900 transition-all pt-16",
        viewMode === "map" ? "h-[100dvh] max-h-[100dvh] overflow-hidden" : "min-h-screen pb-16"
      )}
    >
      {/* Realtor.com Inspired Sticky Search Header & Filter Bar */}
      <RealtorSearchHeader
        filters={filters}
        onFilterChange={setFilters}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        onOpenAllFilters={() => setIsFilterModalOpen(true)}
        totalResults={filteredProperties.length}
      />

      {/* Senior Real Estate Agent Level Filters Drawer Modal */}
      <SearchFiltersModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        filters={filters}
        onApplyFilters={setFilters}
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
      <main
        className={cn(
          "w-full transition-all flex-1 min-h-0",
          viewMode === "map" ? "mt-0 flex flex-col overflow-hidden h-full" : "max-w-7xl mx-auto px-4 sm:px-6 mt-4"
        )}
      >
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
                  onClick={() => toast.success("Search saved to your favorites!")}
                  className="flex items-center gap-1.5 text-slate-700 hover:text-amber-600 font-semibold text-xs sm:hidden"
                >
                  <Heart className="w-4 h-4" /> Save search
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Mode Rendering: Mobile Viewport Map Mode vs Grid View */}
        {viewMode === "map" ? (
          <div className="flex-1 w-full h-full min-h-0 overflow-hidden relative">
            {/* Mobile View: Fill full available height directly below header with zero page scroll */}
            <div className="md:hidden w-full h-full min-h-0 overflow-hidden flex flex-col bg-white">
              <MapWrapper
                filteredItems={filteredProperties}
                activeFilters={filters}
                onFiltersChange={setFilters}
              />
            </div>

            {/* Desktop View: Full height Map Container */}
            <div className="hidden md:block w-full h-[calc(100vh-190px)] min-h-[620px] rounded-3xl overflow-hidden border border-slate-200 shadow-xl bg-white relative z-0">
              <MapWrapper
                filteredItems={filteredProperties}
                activeFilters={filters}
                onFiltersChange={setFilters}
              />
            </div>
          </div>
        ) : filteredProperties.length > 0 ? (
          /* Realtor.com 3-Column Responsive Grid Layout on Desktop - 4 Rows Initial with Load More */
          <div className="flex flex-col gap-8 pb-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {filteredProperties.slice(0, visibleCount).map((property, index) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  index={index}
                />
              ))}
            </div>

            {/* Load More Button */}
            {filteredProperties.length > visibleCount && (
              <div className="flex flex-col items-center justify-center pt-4">
                <button
                  type="button"
                  onClick={() => setVisibleCount((prev) => prev + 12)}
                  className="px-6 py-3 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 hover:border-[#f1a010] text-slate-900 dark:text-white font-extrabold text-sm flex items-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer group"
                >
                  <Plus className="w-4 h-4 text-[#f1a010] group-hover:rotate-90 transition-transform duration-200" />
                  <span>Load More Properties</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold ml-1">
                    (Showing {Math.min(visibleCount, filteredProperties.length)} of {filteredProperties.length})
                  </span>
                </button>
              </div>
            )}
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
              onClick={() => setFilters(initialFilterState)}
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
