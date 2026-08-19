"use client";

import { useState, useMemo, Suspense, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { usePropertiesStore } from "@/stores/properties-store";
import { useProjectsStore } from "@/stores/projects-store";
import { PropertyCard } from "@/components/property/property-card";
import { ProjectCard } from "@/components/project/project-card";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import { SearchFiltersModal, initialFilterState, type FilterState } from "@/components/search/search-filters";
import { RealtorSearchHeader } from "@/components/search/realtor-search-header";
import { MapWrapper } from "@/components/map/map-wrapper";
import { SlidersHorizontal, ArrowLeft, Search as SearchIcon, MapPin, Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { matchesPropertySearch, matchesProjectSearch, parseSearchIntent } from "@/lib/search-engine";

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function UnifiedSearchPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen pt-24 pb-16 bg-slate-50 flex items-center justify-center font-medium text-slate-600">Loading search...</div>}>
      <UnifiedSearchPage />
    </Suspense>
  );
}

function UnifiedSearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<"all" | "properties" | "projects">(
    searchParams.get("type") === "projects" ? "projects" : "all"
  );
  const [viewMode, setViewMode] = useState<"grid" | "map">(
    searchParams.get("nearMe") === "true" ? "map" : "grid"
  );
  const [sortBy, setSortBy] = useState<"relevant" | "price-asc" | "price-desc" | "newest">("relevant");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [visibleMapIds, setVisibleMapIds] = useState<string[] | null>(null);
  const [listUpdating, setListUpdating] = useState(false);
  const listPaneRef = useRef<HTMLDivElement>(null);

  const handleVisibleItemsChange = useCallback((ids: string[]) => {
    setVisibleMapIds(ids);
    setListUpdating(true);
    // Scroll list to top
    if (listPaneRef.current) {
      listPaneRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
    // Clear updating indicator after a short delay
    setTimeout(() => setListUpdating(false), 800);
  }, []);
  
  const properties = usePropertiesStore((state) => state.properties);
  const projects = useProjectsStore((state) => state.projects);
  const isLoadingProperties = usePropertiesStore((state) => state.isLoading);
  const isLoadingProjects = useProjectsStore((state) => state.isLoading);
  const fetchProperties = usePropertiesStore((state) => state.fetchProperties);
  const fetchProjects = useProjectsStore((state) => state.fetchProjects);

  useEffect(() => {
    setMounted(true);
    fetchProperties();
    fetchProjects();

    // Check for nearMe parameter and trigger geolocation
    if (searchParams.get("nearMe") === "true" && !userLocation && !isLocating) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setViewMode("map");
          setIsLocating(false);
          toast.success("Location found! Showing properties near you.");
        },
        (err) => {
          setIsLocating(false);
          toast.error("Location access denied or unavailable. Showing all properties.");
        }
      );
    }
  }, [searchParams]);

  // Lock body scroll when map view is active so ONLY the list pane scrolls
  useEffect(() => {
    if (viewMode === "map" && typeof window !== "undefined") {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [viewMode]);

  const parseInitialParams = (): FilterState => {
    const loc = searchParams.get("location") || searchParams.get("q") || searchParams.get("search") || "";
    
    // Parse budget
    const budgetStr = searchParams.get("budget");
    let budget: [number, number] = [0, 100000000];
    if (budgetStr) {
      const parts = budgetStr.split(",");
      if (parts.length === 2) {
        const min = parseInt(parts[0], 10);
        const max = parseInt(parts[1], 10);
        if (!isNaN(min) && !isNaN(max)) {
          budget = [min, max];
        }
      }
    }

    // Parse listing type (buy -> sale, rent -> rent)
    const typeStr = searchParams.get("type");
    let listingType: string[] = [];
    if (typeStr === "rent") listingType = ["rent"];
    else if (typeStr === "buy") listingType = ["sale"];

    // Parse propertyType
    const propTypeStr = searchParams.get("propertyType");
    let propertyType: string[] = [];
    if (propTypeStr) {
      propertyType = propTypeStr.split(",");
    }

    // Parse saleType (new / resale)
    const saleTypeStr = searchParams.get("saleType");
    let saleType: string[] = [];
    if (saleTypeStr) {
      saleType = saleTypeStr.split(",");
    }

    return {
      ...initialFilterState,
      query: loc,
      budget,
      listingType,
      propertyType,
      saleType,
    };
  };

  const [filters, setFilters] = useState<FilterState>(parseInitialParams());

  const searchParamsString = searchParams.toString();

  // Keep filters in sync with URL searchParams if they actually change
  useEffect(() => {
    setFilters(parseInitialParams());
    const typeStr = searchParams.get("type");
    if (typeStr === "projects") {
      setActiveTab("projects");
    } else {
      setActiveTab("all");
    }
  }, [searchParamsString]);

  // Unified filtering logic
  const filteredProperties = useMemo(() => {
    if (activeTab === "projects") return [];
    
    const parsedIntent = filters.query ? parseSearchIntent(filters.query) : null;

    return properties.filter((property) => {
      // 1. Intelligent Real Estate Text & Intent Query (BHK, Locality, Builder, Category, Keyword)
      if (filters.query && !matchesPropertySearch(property, filters.query, parsedIntent || undefined)) {
        return false;
      }

      // 2. Listing Type
      if (filters.listingType.length > 0) {
        if (!filters.listingType.includes(property.listingType)) return false;
      }

      // 3. Property Category / Type
      if (filters.propertyType.length > 0) {
        const pType = property.propertyType;
        let matches = false;
        if (pType === "apartment" && filters.propertyType.includes("apartment")) matches = true;
        if (pType === "villa" && filters.propertyType.includes("villa")) matches = true;
        if (pType === "independent-house" && filters.propertyType.includes("independent-house")) matches = true;
        if ((pType === "residential-land" || pType === "commercial-lands" || pType === "industrial-lands") && (filters.propertyType.includes("residential-land") || filters.propertyType.includes("agricultural-lands") || filters.propertyType.includes("agricultural-land") || filters.propertyType.includes("agricultural"))) matches = true;
        if ((pType === "shops" || pType === "buildings" || pType === "commercial-spaces") && (filters.propertyType.includes("commercial-spaces") || filters.propertyType.includes("commercial") || filters.propertyType.includes("shops"))) matches = true;
        if (pType === "pg-coliving" && filters.propertyType.includes("pg")) matches = true;
        if (pType === "farmhouse" && (filters.propertyType.includes("farmhouse") || filters.propertyType.includes("agricultural-land") || filters.propertyType.includes("agricultural"))) matches = true;
        if (filters.propertyType.includes("gated-community") && ["apartment", "villa", "independent-house"].includes(pType)) matches = true;
        
        if (!matches) return false;
      }

      // 4. BHK
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

      // 6. Availability
      if (filters.availability.length > 0) {
        const isReady = property.isReadyToMove;
        const matchesAvailability = filters.availability.some((av) => {
          if (av === "ready") return isReady;
          if (av === "under-construction") return !isReady;
          return true;
        });
        if (!matchesAvailability) return false;
      }

      // 7. Facing
      if (filters.facing.length > 0 && property.facing) {
        if (!filters.facing.includes(property.facing.toLowerCase())) return false;
      }

      // 8. RERA
      if (filters.reraApproved && !property.reraId) return false;

      // 9. Posted By
      if (filters.postedBy.length > 0 && property.postedBy) {
        if (!filters.postedBy.includes(property.postedBy.toLowerCase())) return false;
      }

      // 10. Gated Community
      if (filters.gatedCommunity) {
        const isGated = property.gatedSecurity || property.attributes?.gatedCommunity === "Yes" || property.attributes?.gatedCommunity === true;
        if (!isGated) return false;
      }

      // 11. Vastu Compliant
      if (filters.vastuCompliant && !property.vastuCompliant) return false;

      // 12. Furnished
      if (filters.furnished.length > 0 && property.furnishing) {
        if (!filters.furnished.includes(property.furnishing.toLowerCase())) return false;
      }

      // 13. Bathrooms
      if (filters.bathrooms.length > 0) {
        const propBaths = property.bathrooms ? property.bathrooms.toString() : "";
        const matchesBaths = filters.bathrooms.some((b) => {
          if (b === "4+") return (property.bathrooms || 0) >= 4;
          return propBaths === b;
        });
        if (!matchesBaths) return false;
      }

      // 14. Covered Area (sqft)
      if (filters.coveredArea && (filters.coveredArea[0] > 0 || filters.coveredArea[1] < 10000)) {
        const area = property.area || property.carpetArea || property.builtUpArea || 0;
        if (area > 0 && (area < filters.coveredArea[0] || area > filters.coveredArea[1])) {
          return false;
        }
      }

      // 15. Ownership
      if (filters.ownership.length > 0 && property.attributes?.ownership) {
        if (!filters.ownership.includes(property.attributes.ownership.toLowerCase())) return false;
      }

      // 16. Verified Badges (Video / Zero Brokerage / RERA)
      if (filters.verifiedBadges.length > 0) {
        if (filters.verifiedBadges.includes("video_verified") && !property.videoUrl) return false;
        if (filters.verifiedBadges.includes("zero_brokerage") && property.postedBy !== "owner") return false;
        if (filters.verifiedBadges.includes("rera") && !property.reraId) return false;
      }

      // 17. Amenities
      if (filters.amenities.length > 0) {
        const propAmenities = (property.amenities || []).map((a) => a.name.toLowerCase());
        const hasAmenity = filters.amenities.some((req) =>
          propAmenities.some((pa) => pa.includes(req.toLowerCase()))
        );
        if (!hasAmenity && property.amenities && property.amenities.length > 0) return false;
      }

      // 18. Age Range
      if (filters.ageRange.length > 0 && property.ageOfProperty !== undefined) {
        const age = property.ageOfProperty;
        const matchesAge = filters.ageRange.some((range) => {
          if (range === "0-1") return age <= 1;
          if (range === "0-10" || range === "1-10") return age <= 10;
          if (range === "10-30") return age > 10 && age <= 30;
          if (range === "30+") return age > 30;
          return false;
        });
        if (!matchesAge) return false;
      }

      // 19. Near Me Distance
      if (searchParams.get("nearMe") === "true" && userLocation) {
        if (!property.location?.latitude || !property.location?.longitude) return false;
        const distance = getDistanceFromLatLonInKm(
          userLocation.lat,
          userLocation.lng,
          property.location.latitude,
          property.location.longitude
        );
        if (distance > 20) return false; // 20km radius
      }

      return true;
    });
  }, [properties, filters, activeTab, searchParamsString, userLocation]);

  const filteredProjects = useMemo(() => {
    if (activeTab === "properties") return [];
    
    const parsedIntent = filters.query ? parseSearchIntent(filters.query) : null;

    return projects.filter((project) => {
      // 1. Intelligent Real Estate Text & Intent Query (BHK, Locality, Builder, Category, Keyword)
      if (filters.query && !matchesProjectSearch(project, filters.query, parsedIntent || undefined)) {
        return false;
      }

      // 3. Property Category / Type
      if (filters.propertyType.length > 0) {
        const pType = project.projectType?.toLowerCase() || "";
        let matches = false;
        if (pType === "apartment" && filters.propertyType.includes("apartment")) matches = true;
        if (pType === "villa" && filters.propertyType.includes("villa")) matches = true;
        if (pType === "independent-house" && filters.propertyType.includes("independent-house")) matches = true;
        if ((pType === "venture" || pType === "residential-land") && (filters.propertyType.includes("residential-land") || filters.propertyType.includes("plot") || filters.propertyType.includes("agricultural-lands") || filters.propertyType.includes("agricultural-land") || filters.propertyType.includes("agricultural"))) matches = true;
        if (pType === "commercial" && (filters.propertyType.includes("commercial-spaces") || filters.propertyType.includes("commercial") || filters.propertyType.includes("shops"))) matches = true;
        if (filters.propertyType.includes("gated-community") && ["apartment", "villa", "independent-house"].includes(pType)) matches = true;
        
        if (!matches) return false;
      }

      // 4. BHK
      if (filters.bhk.length > 0) {
        if (!project.configurations) return false;
        const hasMatchingBhk = project.configurations.some(cfg => {
          const cfgBedrooms = cfg.bedrooms || 0;
          return filters.bhk.some(b => {
             if (b === "4+") return cfgBedrooms >= 4;
             return cfgBedrooms.toString() === b;
          });
        });
        if (!hasMatchingBhk) return false;
      }

      // 5. Budget Range (INR)
      if (project.configurations && project.configurations.length > 0) {
        const hasBudgetOverlap = project.configurations.some(cfg => {
           const pMin = cfg.priceMin || 0;
           const pMax = cfg.priceMax || pMin;
           return pMin <= filters.budget[1] && pMax >= filters.budget[0];
        });
        if (!hasBudgetOverlap) return false;
      } else {
        if (filters.budget[0] > 0 || filters.budget[1] < 100000000) return false;
      }

      // 6. Availability
      if (filters.availability.length > 0) {
        const isReady = project.constructionStatus === "ready-to-move";
        const matchesAvailability = filters.availability.some((av) => {
          if (av === "ready") return isReady;
          if (av === "under-construction") return !isReady;
          return true;
        });
        if (!matchesAvailability) return false;
      }

      // 7. Facing
      if (filters.facing.length > 0) {
        if (!project.configurations) return false;
        const hasMatchingFacing = project.configurations.some(cfg => {
           if (!cfg.facing) return false;
           return cfg.facing.some(f => filters.facing.includes(f.toLowerCase()));
        });
        if (!hasMatchingFacing) return false;
      }

      // 8. RERA / CRDA
      if (filters.reraApproved) {
        if (!project.reraApproved && !project.crdaApproved) return false;
      }

      // 9. Posted By
      if (filters.postedBy.length > 0) {
        const wantsDeveloper = filters.postedBy.includes("developer") || filters.postedBy.includes("builder") || filters.postedBy.includes("owner");
        if (!wantsDeveloper) return false; // Projects are always direct from developer/builder
      }

      // 10. Gated Community
      if (filters.gatedCommunity) {
         const hasGated = project.facilities?.some(f => f.toLowerCase().includes("gated")) || project.highlights?.some(h => h.toLowerCase().includes("gated"));
         if (!hasGated && project.projectType !== "apartment") return false; 
         // Apartments are mostly gated by default, but to be strictly safe we check facilities.
      }

      // 11. Vastu Compliant
      if (filters.vastuCompliant) {
         const hasVastu = project.facilities?.some(f => f.toLowerCase().includes("vastu")) || project.highlights?.some(h => h.toLowerCase().includes("vastu"));
         if (!hasVastu) return false;
      }

      // 12. Age Range
      if (filters.ageRange.length > 0) {
        // Projects are new. They only fit in the new/0-10 brackets.
        const allowsNew = filters.ageRange.includes("0-1") || filters.ageRange.includes("0-10") || filters.ageRange.includes("1-10");
        if (!allowsNew) return false;
      }

      // 13. Bathrooms
      if (filters.bathrooms.length > 0) {
        if (!project.configurations) return false;
        const hasMatchingBaths = project.configurations.some(cfg => {
          const expectedBaths = cfg.bedrooms || 0;
          return filters.bathrooms.some(b => {
             if (b === "4+") return expectedBaths >= 4;
             return expectedBaths.toString() === b;
          });
        });
        if (!hasMatchingBaths) return false;
      }

      // 14. Near Me Distance
      if (searchParams.get("nearMe") === "true" && userLocation) {
        if (!project.location?.latitude || !project.location?.longitude) return false;
        const distance = getDistanceFromLatLonInKm(
          userLocation.lat,
          userLocation.lng,
          project.location.latitude,
          project.location.longitude
        );
        if (distance > 20) return false; // 20km radius
      }

      return true;
    });
  }, [projects, filters, activeTab, searchParamsString, userLocation]);

  // Combine and Sort
  const combinedResults = useMemo(() => {
    let items: { type: 'property' | 'project'; data: any; price: number; createdAt: string }[];

    // In map mode with a visible-ids set, drive the list from the MAP's viewport
    // (which uses fuzzy matching on ALL store items) rather than the strict search-page filter.
    if (viewMode === "map" && visibleMapIds !== null) {
      const propById = new Map(properties.map(p => [p.id, p]));
      const projById = new Map(projects.map(p => [p.id, p]));
      items = visibleMapIds.flatMap((id): { type: 'property' | 'project'; data: any; price: number; createdAt: string }[] => {
        const prop = propById.get(id);
        if (prop) return [{ type: 'property', data: prop, price: prop.price, createdAt: prop.createdAt }];
        const proj = projById.get(id);
        if (proj) {
          const minPrice = proj.configurations?.[0]?.priceMin || 0;
          return [{ type: 'project', data: proj, price: minPrice, createdAt: proj.createdAt }];
        }
        return [];
      });
    } else {
      items = [
        ...filteredProperties.map(p => ({ type: 'property' as const, data: p, price: p.price, createdAt: p.createdAt })),
        ...filteredProjects.map(p => {
          const minPrice = p.configurations?.[0]?.priceMin || 0;
          return { type: 'project' as const, data: p, price: minPrice, createdAt: p.createdAt };
        })
      ];
    }

    items.sort((a, b) => {
      if (sortBy === "price-asc") return a.price - b.price;
      if (sortBy === "price-desc") return b.price - a.price;
      if (sortBy === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return 0;
    });

    return items;
  }, [filteredProperties, filteredProjects, properties, projects, sortBy, viewMode, visibleMapIds]);

  // 12 properties / projects initial load with Load More
  const pageSize = 12;
  const [visibleCount, setVisibleCount] = useState<number>(12);

  // Reset pagination when filters, sort, view mode, or viewport change
  useEffect(() => {
    setVisibleCount(12);
  }, [filters, sortBy, activeTab, viewMode, visibleMapIds]);

  const displayedResults = useMemo(() => {
    return combinedResults.slice(0, visibleCount);
  }, [combinedResults, visibleCount]);

  // Map items: pass ALL store properties/projects to the map so it can fuzzy-filter internally.
  // The list syncs back via visibleMapIds from the map viewport listener.
  const mapItems = useMemo(() => {
    const propItems = properties as any[];
    const projItems = projects
      .filter(p => p.isPublished && p.location?.latitude && p.location?.longitude)
      .map(p => ({
        id: p.id,
        slug: p.slug,
        title: p.name,
        price: p.configurations?.[0]?.priceMin || 0,
        propertyType: p.projectType,
        listingType: "project",
        status: "active",
        location: {
          address: p.location.address,
          locality: p.location.locality,
          city: p.location.city,
          state: p.location.state,
          latitude: p.location.latitude,
          longitude: p.location.longitude,
        },
        coverImage: p.coverImage,
        images: p.images?.map((img: any) => img.url || img) || [],
        showOnMap: true,
        builderName: p.builderName,
        _isProject: true,
        _originalProjectData: p,
      }));
    return [...propItems, ...projItems];
  }, [properties, projects]);

  if (!mounted) return null;

  return (
    <div className={cn("bg-bg-primary pt-16 flex flex-col", viewMode === "map" ? "h-screen overflow-hidden" : "min-h-screen")}>
      <RealtorSearchHeader 
        filters={filters}
        onFilterChange={setFilters}
        viewMode={viewMode}
        onViewModeChange={(mode) => setViewMode(mode as "grid" | "map")}
        onOpenAllFilters={() => setIsFilterModalOpen(true)}
        totalResults={combinedResults.length}
      />

      <main className={cn(
        "flex-1 min-h-0 w-full flex flex-col",
        viewMode === "grid" ? "px-4 sm:px-6 lg:px-8 py-6 pb-24 max-w-7xl mx-auto overflow-y-auto" : "overflow-hidden"
      )}>
        {/* Near Me Loading Overlay */}
        {isLocating && (
          <div className="mb-6 mx-4 sm:mx-6 lg:mx-8 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-center gap-3 text-amber-700 animate-pulse">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="font-medium">Detecting your location...</span>
          </div>
        )}

        <div className={cn(
          "flex w-full h-full",
          viewMode === "map" ? "flex-col md:flex-row flex-1 min-h-0 overflow-hidden" : "flex-col gap-6"
        )}>
          
          {/* List Pane: Hidden on mobile in Map Mode to keep original full-screen mobile map UI */}
          <div
            ref={listPaneRef}
            className={cn(
              "flex flex-col gap-6 w-full",
              viewMode === "map"
                ? "hidden md:flex md:w-[50%] lg:w-[45%] xl:w-[45%] overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:h-full min-h-0"
                : "w-full"
            )}
          >
            
            {/* Live map-sync banner — Realtor style (Desktop) */}
            {viewMode === "map" && visibleMapIds !== null && (
              <div className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-300",
                listUpdating
                  ? "bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 animate-pulse"
                  : "bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
              )}>
                <span className={cn("w-2 h-2 rounded-full flex-shrink-0", listUpdating ? "bg-amber-500 animate-ping" : "bg-amber-500")} />
                <span>
                  {listUpdating ? "Updating listings…" : `${combinedResults.length} homes in map area`}
                </span>
                {!listUpdating && (
                  <button
                    onClick={() => setVisibleMapIds(null)}
                    className="ml-auto text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-semibold text-[10px] underline-offset-2 hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}

            {/* Controls Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
                <button onClick={() => setActiveTab("all")} className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all", activeTab === "all" ? "bg-white dark:bg-slate-900 shadow-sm text-amber-600 dark:text-amber-500" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200")}>All ({filteredProperties.length + filteredProjects.length})</button>
                <button onClick={() => setActiveTab("properties")} className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all", activeTab === "properties" ? "bg-white dark:bg-slate-900 shadow-sm text-amber-600 dark:text-amber-500" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200")}>Properties ({filteredProperties.length})</button>
                <button onClick={() => setActiveTab("projects")} className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all", activeTab === "projects" ? "bg-white dark:bg-slate-900 shadow-sm text-amber-600 dark:text-amber-500" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200")}>Projects ({filteredProjects.length})</button>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-border-default bg-white dark:bg-bg-card text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-primary/30">
                  <option value="relevant">Relevant</option>
                  <option value="newest">Newest First</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                </select>
              </div>
            </div>

            {/* Results Grid - 4 Rows Initial with Load More */}
            {(isLoadingProperties || isLoadingProjects) ? (
              <div className={cn("grid gap-6", viewMode === "map" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4")}>
                {[...Array(8)].map((_, i) => (
                  <SkeletonCard key={`skeleton-${i}`} />
                ))}
              </div>
            ) : combinedResults.length > 0 ? (
              <div className="flex flex-col gap-6">
                <div className={cn("grid gap-6", viewMode === "map" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4")}>
                  {displayedResults.map((item, idx) => {
                    if (item.type === "property") {
                      return <PropertyCard key={`prop-${item.data.id}-${idx}`} property={item.data as any} />;
                    } else {
                      return <ProjectCard key={`proj-${item.data.id}-${idx}`} project={item.data as any} />;
                    }
                  })}
                </div>

                {/* Load More Button */}
                {combinedResults.length > visibleCount && (
                  <div className="flex flex-col items-center justify-center pt-4 pb-2">
                    <button
                      type="button"
                      onClick={() => setVisibleCount((prev) => prev + pageSize)}
                      className="px-6 py-3 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 hover:border-[#f1a010] text-slate-900 dark:text-white font-extrabold text-sm flex items-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer group"
                    >
                      <Plus className="w-4 h-4 text-[#f1a010] group-hover:rotate-90 transition-transform duration-200" />
                      <span>Load More Properties</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold ml-1">
                        ({displayedResults.length} of {combinedResults.length})
                      </span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mb-4">
                  <SearchIcon className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-xl font-heading font-bold text-text-primary mb-2">No matches found</h3>
                <p className="text-text-secondary mb-6 max-w-md">Try adjusting your filters or search terms to find what you're looking for.</p>
                <button onClick={() => { setFilters(initialFilterState); setActiveTab("all"); }} className="px-6 py-2.5 bg-amber-primary hover:bg-amber-600 text-slate-950 font-bold rounded-xl transition-colors">
                  Clear all filters
                </button>
              </div>
            )}
          </div>

          {/* Map Pane: Full-screen on mobile, split-pane on desktop */}
          {viewMode === "map" && (
            <div className="flex-1 w-full h-full min-h-0 overflow-hidden md:border-l md:border-slate-200 md:dark:border-slate-800">
              <MapWrapper filteredItems={mapItems} userLocation={userLocation} onVisibleItemsChange={handleVisibleItemsChange} />
            </div>
          )}
        </div>
      </main>

      <SearchFiltersModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        filters={filters}
        onApplyFilters={setFilters}
        totalResults={combinedResults.length}
      />
    </div>
  );
}
