"use client";

import { useState, useMemo, Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { usePropertiesStore } from "@/stores/properties-store";
import { useProjectsStore } from "@/stores/projects-store";
import { PropertyCard } from "@/components/property/property-card";
import { ProjectCard } from "@/components/project/project-card";
import { SearchFiltersModal, initialFilterState, type FilterState } from "@/components/search/search-filters";
import { RealtorSearchHeader } from "@/components/search/realtor-search-header";
import { MapWrapper } from "@/components/map/map-wrapper";
import { SlidersHorizontal, ArrowLeft, Search as SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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
  
  const [activeTab, setActiveTab] = useState<"all" | "properties" | "projects">("all");
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const [sortBy, setSortBy] = useState<"relevant" | "price-asc" | "price-desc" | "newest">("relevant");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const properties = usePropertiesStore((state) => state.properties);
  const projects = useProjectsStore((state) => state.projects);
  const fetchProperties = usePropertiesStore((state) => state.fetchProperties);
  const fetchProjects = useProjectsStore((state) => state.fetchProjects);

  useEffect(() => {
    setMounted(true);
    fetchProperties();
    fetchProjects();
  }, []);

  const parseInitialParams = (): FilterState => {
    const loc = searchParams.get("location") || searchParams.get("q") || searchParams.get("search") || "";
    return {
      ...initialFilterState,
      query: loc,
    };
  };

  const [filters, setFilters] = useState<FilterState>(parseInitialParams());

  useEffect(() => {
    const loc = searchParams.get("location") || searchParams.get("q") || searchParams.get("search");
    if (loc) {
      setFilters(prev => ({ ...prev, query: loc }));
    }
  }, [searchParams]);

  // Unified filtering logic
  const filteredProperties = useMemo(() => {
    if (activeTab === "projects") return [];
    
    return properties.filter((property) => {
      // 1. Text Query (Location / Title)
      if (filters.query) {
        const q = filters.query.toLowerCase();
        const loc = property.location;
        const matchesLoc = 
          loc.city?.toLowerCase().includes(q) || 
          loc.locality?.toLowerCase().includes(q) || 
          loc.address?.toLowerCase().includes(q) ||
          property.title.toLowerCase().includes(q);
        if (!matchesLoc) return false;
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
        if ((pType === "residential-land" || pType === "commercial-lands" || pType === "industrial-lands") && (filters.propertyType.includes("residential-land") || filters.propertyType.includes("agricultural-lands"))) matches = true;
        if ((pType === "shops" || pType === "buildings" || pType === "commercial-spaces") && filters.propertyType.includes("commercial-spaces")) matches = true;
        if (pType === "pg-coliving" && filters.propertyType.includes("pg")) matches = true;
        if (pType === "farmhouse" && filters.propertyType.includes("farmhouse")) matches = true;
        
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

      // 14. Age Range
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

      return true;
    });
  }, [properties, filters, activeTab]);

  const filteredProjects = useMemo(() => {
    if (activeTab === "properties") return [];
    
    return projects.filter((project) => {
      // 1. Text Query (Location / Title)
      if (filters.query) {
        const q = filters.query.toLowerCase();
        const loc = project.location;
        const matchesLoc = 
          loc.city?.toLowerCase().includes(q) || 
          loc.locality?.toLowerCase().includes(q) || 
          loc.address?.toLowerCase().includes(q) ||
          project.name.toLowerCase().includes(q);
        if (!matchesLoc) return false;
      }

      // 3. Property Category / Type
      if (filters.propertyType.length > 0) {
        const pType = project.projectType;
        let matches = false;
        if (pType === "apartment" && filters.propertyType.includes("apartment")) matches = true;
        if (pType === "villa" && filters.propertyType.includes("villa")) matches = true;
        if (pType === "venture" && filters.propertyType.includes("residential-land")) matches = true;
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

      return true;
    });
  }, [projects, filters, activeTab]);

  // Combine and Sort
  const combinedResults = useMemo(() => {
    const items = [
      ...filteredProperties.map(p => ({ type: 'property' as const, data: p, price: p.price, createdAt: p.createdAt })),
      ...filteredProjects.map(p => {
         const minPrice = p.configurations?.[0]?.priceMin || 0;
         return { type: 'project' as const, data: p, price: minPrice, createdAt: p.createdAt };
      })
    ];

    items.sort((a, b) => {
      if (sortBy === "price-asc") return a.price - b.price;
      if (sortBy === "price-desc") return b.price - a.price;
      if (sortBy === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return 0; // default relevant
    });

    return items;
  }, [filteredProperties, filteredProjects, sortBy]);

  // Map items: projects adapted to property-compatible shape so they appear as pins on the map
  const mapItems = useMemo(() => {
    const propItems = filteredProperties as any[];
    const projItems = filteredProjects
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
        // signals it's a project for the popup
        _isProject: true,
      }));
    return [...propItems, ...projItems];
  }, [filteredProperties, filteredProjects]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-bg-primary pt-20 flex flex-col">
      <RealtorSearchHeader 
        filters={filters}
        onFilterChange={setFilters}
        viewMode={viewMode}
        onViewModeChange={(mode) => setViewMode(mode as "grid" | "map")}
        onOpenAllFilters={() => setIsFilterModalOpen(true)}
        totalResults={combinedResults.length}
      />

      <div className="flex-1 max-w-[1600px] w-full mx-auto px-4 md:px-6 py-6 pb-24">
        <div className="flex flex-col gap-6">
          
          {/* Controls Bar */}
          {viewMode === "grid" && (
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
          )}

          {/* Results Grid or Map */}
          {viewMode === "map" ? (
            <div>
              <div className="md:hidden fixed top-[192px] left-0 right-0 bottom-0 z-20 bg-white overflow-hidden flex flex-col">
                <MapWrapper filteredItems={mapItems} />
              </div>
              <div className="hidden md:block w-full h-[calc(100vh-190px)] min-h-[620px] rounded-3xl overflow-hidden border border-slate-200 shadow-xl bg-white relative z-0">
                <MapWrapper filteredItems={mapItems} />
              </div>
            </div>
          ) : combinedResults.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {combinedResults.map((item, idx) => {
                if (item.type === "property") {
                  return <PropertyCard key={`prop-${item.data.id}-${idx}`} property={item.data as any} />;
                } else {
                  return <ProjectCard key={`proj-${item.data.id}-${idx}`} project={item.data as any} />;
                }
              })}
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
      </div>

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
