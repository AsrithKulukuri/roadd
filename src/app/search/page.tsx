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
      if (filters.bhk.length > 0 && project.configurations) {
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
           return cfg.priceMin <= filters.budget[1] && cfg.priceMax >= filters.budget[0];
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
      if (filters.facing.length > 0 && project.configurations) {
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

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-bg-primary pt-20 flex flex-col">
      <RealtorSearchHeader 
        filters={filters}
        onFilterChange={setFilters}
        viewMode="grid"
        onViewModeChange={() => {}}
        onOpenAllFilters={() => setIsFilterModalOpen(true)}
        totalResults={combinedResults.length}
      />

      <div className="flex-1 max-w-[1600px] w-full mx-auto px-4 md:px-6 py-6 pb-24">
        <div className="flex flex-col gap-6">
          
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            
            <div className="flex bg-slate-100 dark:bg-slate-900 rounded-xl p-1">
              <button onClick={() => setActiveTab("all")} className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all", activeTab === "all" ? "bg-white dark:bg-slate-800 shadow-sm text-amber-500" : "text-text-secondary hover:text-text-primary")}>All ({filteredProperties.length + filteredProjects.length})</button>
              <button onClick={() => setActiveTab("properties")} className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all", activeTab === "properties" ? "bg-white dark:bg-slate-800 shadow-sm text-amber-500" : "text-text-secondary hover:text-text-primary")}>Properties ({filteredProperties.length})</button>
              <button onClick={() => setActiveTab("projects")} className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all", activeTab === "projects" ? "bg-white dark:bg-slate-800 shadow-sm text-amber-500" : "text-text-secondary hover:text-text-primary")}>Projects ({filteredProjects.length})</button>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button onClick={() => setIsFilterModalOpen(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border-default bg-white dark:bg-bg-card hover:border-amber-primary/50 text-sm font-semibold transition-all">
                <SlidersHorizontal className="w-4 h-4" /> Filters
              </button>
              
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-border-default bg-white dark:bg-bg-card text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-primary/30">
                <option value="relevant">Relevant</option>
                <option value="newest">Newest First</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
            </div>
          </div>

          {/* Results Grid */}
          {combinedResults.length > 0 ? (
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
