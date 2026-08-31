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
import { matchesPropertySearch, matchesProjectSearch, parseSearchIntent, evaluatePropertyFilters } from "@/lib/search-engine";

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

function SearchPageSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header Skeleton Bar */}
      <div className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-3 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="h-10 w-full max-w-md bg-slate-100 dark:bg-slate-800 rounded-full animate-pulse" />
          <div className="h-9 w-28 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse hidden sm:block" />
        </div>
      </div>

      {/* Grid Content Skeleton */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-9 w-64 bg-slate-200/70 dark:bg-slate-800 rounded-xl animate-pulse" />
          <div className="h-9 w-40 bg-slate-200/70 dark:bg-slate-800 rounded-xl animate-pulse hidden sm:block" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <SkeletonCard key={`suspense-skel-${i}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function UnifiedSearchPageWrapper() {
  return (
    <Suspense fallback={<SearchPageSkeleton />}>
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
    searchParams.get("nearMe") === "true" || searchParams.get("view") === "map" ? "map" : "grid"
  );
  const [sortBy, setSortBy] = useState<"relevant" | "price-asc" | "price-desc" | "newest">(
    (searchParams.get("sort") as any) || (searchParams.get("saleType") === "new" ? "newest" : "relevant")
  );
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

    if (searchParams.get("view") === "map") {
      setViewMode("map");
    } else if (searchParams.get("view") === "grid") {
      setViewMode("grid");
    }

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

    // Parse propertyType and projectType
    const propTypeStr = searchParams.get("propertyType") || searchParams.get("projectType");
    let propertyType: string[] = [];
    let gatedCommunity = false;
    if (propTypeStr) {
      propertyType = propTypeStr.split(",");
      if (propertyType.includes("gated-community")) {
        gatedCommunity = true;
      }
    }

    // Parse city / cities
    const cityParam = searchParams.get("city") || searchParams.get("cities");
    let cities: string[] = [];
    if (cityParam) {
      cities = cityParam.split(",").map(c => c.trim()).filter(Boolean);
    }

    // Parse reraApproved
    const reraParam = searchParams.get("reraApproved") === "true" || searchParams.get("rera") === "true";

    // Parse saleType (resale filters specifically for resale; 'new' indicates recent listings)
    const saleTypeStr = searchParams.get("saleType");
    let saleType: string[] = [];
    if (saleTypeStr && saleTypeStr !== "new") {
      saleType = saleTypeStr.split(",");
    }

    // Parse displayCategory (featured / recommended / budget / crda-ventures)
    const categoryParam = searchParams.get("category") || searchParams.get("displayCategory") || "all";
    if (categoryParam === "crda-ventures" && propertyType.length === 0) {
      propertyType = ["crda-ventures"];
    }

    // Parse sort parameter
    const sortParam = (searchParams.get("sort") as any) || (searchParams.get("saleType") === "new" ? "newest" : "relevant");

    // Parse postedSince parameter
    const postedSince = searchParams.get("postedSince") || "any";

    return {
      ...initialFilterState,
      query: loc,
      budget,
      listingType,
      propertyType,
      saleType,
      cities,
      gatedCommunity,
      reraApproved: reraParam,
      displayCategory: categoryParam,
      sortBy: sortParam,
      postedSince,
    };
  };

  const [filters, setFilters] = useState<FilterState>(parseInitialParams());

  const searchParamsString = searchParams.toString();

  // Keep filters and sort in sync with URL searchParams if they actually change
  useEffect(() => {
    const initial = parseInitialParams();
    setFilters(initial);
    const typeStr = searchParams.get("type");
    const projectTypeParam = searchParams.get("projectType");
    if (typeStr === "projects" || projectTypeParam) {
      setActiveTab("projects");
    } else if (typeStr === "properties") {
      setActiveTab("properties");
    } else {
      setActiveTab("all");
    }
    const sortParam = searchParams.get("sort") as any;
    if (sortParam) {
      setSortBy(sortParam);
    } else if (searchParams.get("saleType") === "new") {
      setSortBy("newest");
    } else {
      setSortBy("relevant");
    }
  }, [searchParamsString]);

  // Unified filtering logic
  const filteredProperties = useMemo(() => {
    const parsedIntent = filters.query ? parseSearchIntent(filters.query) : null;

    return properties.filter((property) => {
      // 1. Text & Intent Query (BHK, Locality, Builder, Category, Keyword)
      if (filters.query && !matchesPropertySearch(property, filters.query, parsedIntent || undefined)) {
        return false;
      }

      // 2. Complete Multi-Attribute Evaluation
      if (!evaluatePropertyFilters(property, filters)) {
        return false;
      }

      // 3. Near Me Distance
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
  }, [properties, filters, searchParamsString, userLocation]);

  const filteredProjects = useMemo(() => {
    const parsedIntent = filters.query ? parseSearchIntent(filters.query) : null;

    return projects.filter((project) => {
      // 1. Intelligent Real Estate Text & Intent Query (BHK, Locality, Builder, Category, Keyword)
      if (filters.query && !matchesProjectSearch(project, filters.query, parsedIntent || undefined)) {
        return false;
      }

      // 1b. Location & Geography (Cities, Localities)
      const projCity = (project.location?.city || "").toLowerCase();
      const projLocality = (project.location?.locality || "").toLowerCase();
      const projAddress = (project.location?.address || "").toLowerCase();
      const projCorpus = `${projCity} ${projLocality} ${projAddress} ${(project.name || "").toLowerCase()}`;

      if (filters.cities && filters.cities.length > 0) {
        const matchesCity = filters.cities.some((c: string) => {
          const target = c.toLowerCase().trim();
          return projCity.includes(target) || projLocality.includes(target) || projCorpus.includes(target);
        });
        if (!matchesCity) return false;
      }

      if (filters.localities && filters.localities.length > 0) {
        const matchesLoc = filters.localities.some((l: string) => {
          const target = l.toLowerCase().trim();
          return projLocality.includes(target) || projAddress.includes(target) || projCorpus.includes(target);
        });
        if (!matchesLoc) return false;
      }

      // 2. Display Category (Featured / Recommended / Budget Friendly)
      if (filters.displayCategory && filters.displayCategory !== "all") {
        const cat = filters.displayCategory.toLowerCase();
        if (cat === "featured" && !(project.displayCategory === "featured" || project.isFeatured)) {
          return false;
        }
        if (cat === "recommended" && !(project.displayCategory === "recommended")) {
          return false;
        }
        if ((cat === "budget" || cat === "budget_friendly") && project.displayCategory !== "budget_friendly") {
          return false;
        }
      }

      // 3. Property Category / Type
      if (filters.propertyType.length > 0) {
        const pType = project.projectType?.toLowerCase() || "";
        let matches = false;
        if (pType === "apartment" && filters.propertyType.includes("apartment")) matches = true;
        if ((pType === "villa" || pType === "independent-house") && (filters.propertyType.includes("villa") || filters.propertyType.includes("independent-house"))) matches = true;
        
        // CRDA Ventures / Plotted Layouts (strictly venture projectType)
        const wantsVenture = filters.propertyType.some(t => ["venture", "crda-ventures", "crda-venture", "residential-land", "plot", "venture-plot"].includes(t.toLowerCase()));
        if (pType === "venture" && wantsVenture) matches = true;

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

      // 15. Posted Since
      if (filters.postedSince && filters.postedSince !== "any" && filters.postedSince !== "") {
        const projDateStr = project.createdAt || project.updatedAt;
        if (projDateStr) {
          const projTime = new Date(projDateStr).getTime();
          const now = Date.now();
          const ps = filters.postedSince.toLowerCase();
          let maxAgeMs = 0;
          if (ps === "1day" || ps === "yesterday" || ps === "1d") maxAgeMs = 1 * 24 * 60 * 60 * 1000;
          else if (ps === "3days" || ps === "3d") maxAgeMs = 3 * 24 * 60 * 60 * 1000;
          else if (ps === "7days" || ps === "1week" || ps === "7d") maxAgeMs = 7 * 24 * 60 * 60 * 1000;
          else if (ps === "15days" || ps === "2weeks" || ps === "15d") maxAgeMs = 15 * 24 * 60 * 60 * 1000;
          else if (ps === "30days" || ps === "1month" || ps === "30d") maxAgeMs = 30 * 24 * 60 * 60 * 1000;
          else if (ps === "60days" || ps === "2months" || ps === "60d") maxAgeMs = 60 * 24 * 60 * 60 * 1000;
          else if (ps === "90days" || ps === "3months" || ps === "90d") maxAgeMs = 90 * 24 * 60 * 60 * 1000;

          if (maxAgeMs > 0 && (now - projTime) > maxAgeMs) return false;
        }
      }

      return true;
    });
  }, [projects, filters, activeTab, searchParamsString, userLocation]);

  // Combine and Sort
  const combinedResults = useMemo(() => {
    let propList = activeTab !== "projects" ? filteredProperties : [];
    let projList = activeTab !== "properties" ? filteredProjects : [];

    // In map mode with a visible-ids set, drive the list from the MAP's viewport
    // while keeping all search/budget filters active
    if (viewMode === "map" && visibleMapIds !== null) {
      const visibleSet = new Set(visibleMapIds);
      propList = propList.filter((p) => visibleSet.has(p.id));
      projList = projList.filter((p) => visibleSet.has(p.id));
    }

    const propItems = propList.map((p) => ({
      type: "property" as const,
      data: p,
      price: p.price,
      createdAt: p.createdAt,
    }));

    const projItems = projList.map((p) => {
      const minPrice = p.configurations?.[0]?.priceMin || 0;
      return {
        type: "project" as const,
        data: p,
        price: minPrice,
        createdAt: p.createdAt,
      };
    });

    const items = [...propItems, ...projItems];

    const activeSort = (filters.sortBy || sortBy || "relevant").toLowerCase();
    items.sort((a, b) => {
      if (activeSort === "price-asc" || activeSort === "price_asc" || activeSort === "price_low" || activeSort === "low_to_high") {
        return a.price - b.price;
      }
      if (activeSort === "price-desc" || activeSort === "price_desc" || activeSort === "price_high" || activeSort === "high_to_low") {
        return b.price - a.price;
      }
      if (activeSort === "newest" || activeSort === "recent" || activeSort === "date-desc") {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
      if (activeSort === "oldest" || activeSort === "date-asc") {
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      }
      // Relevance default
      if (filters.query) return 0;
      const scoreA = (a.data?.isFeatured ? 2 : 0) + ((a.data as any)?.isRecommended ? 1 : 0);
      const scoreB = (b.data?.isFeatured ? 2 : 0) + ((b.data as any)?.isRecommended ? 1 : 0);
      if (scoreA !== scoreB) return scoreB - scoreA;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

    return items;
  }, [filteredProperties, filteredProjects, sortBy, filters.sortBy, filters.query, viewMode, visibleMapIds, activeTab]);

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

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    const newParams = new URLSearchParams(searchParams.toString());
    
    // 1. Budget
    if (newFilters.budget && (newFilters.budget[0] > 0 || newFilters.budget[1] < 100000000)) {
      newParams.set("budget", `${newFilters.budget[0]},${newFilters.budget[1]}`);
    } else {
      newParams.delete("budget");
    }

    // 2. Query
    if (newFilters.query) {
      newParams.set("location", newFilters.query);
    } else {
      newParams.delete("location");
    }

    // 3. PropertyType
    if (newFilters.propertyType && newFilters.propertyType.length > 0) {
      newParams.set("propertyType", newFilters.propertyType.join(","));
    } else {
      newParams.delete("propertyType");
    }

    // 4. Cities
    if (newFilters.cities && newFilters.cities.length > 0) {
      newParams.set("city", newFilters.cities.join(","));
    } else {
      newParams.delete("city");
    }

    const queryStr = newParams.toString();
    router.replace(`/search${queryStr ? `?${queryStr}` : ""}`, { scroll: false });
  };

  // Map items: pass active filtered properties & projects to the map so all matching markers render.
  const mapItems = useMemo(() => {
    const propItems = filteredProperties
      .filter((p) => p.showOnMap !== false && p.status !== 'sold');

    const projItems = filteredProjects
      .filter((p) => p.isPublished !== false)
      .map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.name,
        price: p.configurations?.[0]?.priceMin || 0,
        propertyType: p.projectType || "Project",
        listingType: "project",
        status: "active",
        location: {
          address: p.location?.address || "",
          locality: p.location?.locality || "",
          city: p.location?.city || "",
          state: p.location?.state || "",
          latitude: p.location?.latitude,
          longitude: p.location?.longitude,
        },
        coverImage: p.coverImage,
        images: p.images?.map((img: any) => img.url || img) || [],
        showOnMap: true,
        builderName: p.builderName,
        _isProject: true,
        _originalProjectData: p,
      }));

    return [...propItems, ...projItems];
  }, [filteredProperties, filteredProjects]);

  // Tab change handler that keeps URL and state in sync
  const handleTabChange = (tab: "all" | "properties" | "projects") => {
    setActiveTab(tab);
    const newParams = new URLSearchParams(searchParams.toString());
    if (tab === "all") {
      newParams.delete("type");
    } else {
      newParams.set("type", tab);
    }
    const queryStr = newParams.toString();
    router.replace(`/search${queryStr ? `?${queryStr}` : ""}`, { scroll: false });
  };

  // Active counts for the 3 smart filter buttons:
  // In Map View with active viewport, count items in map viewport that match filters.
  // In Grid View, count all items that match filters.
  const { allCount, propCount, projCount } = useMemo(() => {
    if (viewMode === "map" && visibleMapIds !== null) {
      const visibleSet = new Set(visibleMapIds);
      const visibleProps = filteredProperties.filter((p) => visibleSet.has(p.id));
      const visibleProjs = filteredProjects.filter((p) => visibleSet.has(p.id));
      return {
        allCount: visibleProps.length + visibleProjs.length,
        propCount: visibleProps.length,
        projCount: visibleProjs.length,
      };
    }
    return {
      allCount: filteredProperties.length + filteredProjects.length,
      propCount: filteredProperties.length,
      projCount: filteredProjects.length,
    };
  }, [viewMode, visibleMapIds, filteredProperties, filteredProjects]);

  // Auto-open filters modal if requested via URL
  useEffect(() => {
    if (searchParams.get("openFilters") === "true") {
      setIsFilterModalOpen(true);
    }
  }, [searchParams]);

  if (!mounted) return null;

  return (
    <div className={cn("bg-bg-primary pt-16 flex flex-col", viewMode === "map" ? "h-screen overflow-hidden" : "min-h-screen")}>
      <RealtorSearchHeader 
        filters={filters}
        onFilterChange={handleFilterChange}
        viewMode={viewMode}
        onViewModeChange={(mode) => {
          const nextMode = mode as "grid" | "map";
          setViewMode(nextMode);
          const newParams = new URLSearchParams(searchParams.toString());
          if (nextMode === "map") {
            newParams.set("view", "map");
          } else {
            newParams.delete("view");
          }
          const queryStr = newParams.toString();
          router.replace(`/search${queryStr ? `?${queryStr}` : ""}`, { scroll: false });
        }}
        onOpenAllFilters={() => setIsFilterModalOpen(true)}
        totalResults={filteredProperties.length + filteredProjects.length}
        autoFocus={searchParams.get("focus") === "search"}
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
            


            {/* Controls Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex bg-slate-100 dark:bg-slate-900 rounded-2xl p-1 border border-slate-200 dark:border-slate-800 shadow-xs">
                <button
                  onClick={() => handleTabChange("all")}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer",
                    activeTab === "all"
                      ? "bg-amber-500 text-slate-950 shadow-sm font-black"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  All ({allCount})
                </button>
                <button
                  onClick={() => handleTabChange("properties")}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer",
                    activeTab === "properties"
                      ? "bg-amber-500 text-slate-950 shadow-sm font-black"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  Properties ({propCount})
                </button>
                <button
                  onClick={() => handleTabChange("projects")}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer",
                    activeTab === "projects"
                      ? "bg-amber-500 text-slate-950 shadow-sm font-black"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  Projects ({projCount})
                </button>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <select
                  value={sortBy}
                  onChange={(e) => {
                    const newSort = e.target.value as any;
                    setSortBy(newSort);
                    setFilters(prev => ({ ...prev, sortBy: newSort }));
                    const newParams = new URLSearchParams(searchParams.toString());
                    if (newSort === "relevant") {
                      newParams.delete("sort");
                    } else {
                      newParams.set("sort", newSort);
                    }
                    const queryStr = newParams.toString();
                    router.replace(`/search${queryStr ? `?${queryStr}` : ""}`, { scroll: false });
                  }}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-border-default bg-white dark:bg-bg-card text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-primary/30 cursor-pointer"
                >
                  <option value="relevant">Relevant / Best Match</option>
                  <option value="newest">Newest Listed First</option>
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
        onApplyFilters={(newFilters, targetTab) => {
          handleFilterChange(newFilters);
          if (targetTab) {
            handleTabChange(targetTab);
          }
        }}
        totalResults={combinedResults.length}
      />
    </div>
  );
}
