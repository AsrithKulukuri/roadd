"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/hooks/use-auth-session";
import { PropertyCard } from "@/components/property/property-card";
import { ProjectCard } from "@/components/project/project-card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreVertical,
  Share2,
  Trash2,
  FolderHeart,
  Loader2,
  Building2,
  Home,
  Compass,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFavoritesStore } from "@/stores/favorites-store";
import { usePropertiesStore } from "@/stores/properties-store";
import { useProjectsStore } from "@/stores/projects-store";
import type { Property } from "@/types/property";
import { toast } from "sonner";
import { useIsMounted } from "@/hooks/use-is-mounted";

export default function SavedPropertiesPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuthSession();

  const [activeTab, setActiveTab] = useState<"all" | "properties" | "projects">("all");
  const mounted = useIsMounted();

  const { savedPropertyIds, toggleFavorite } = useFavoritesStore();
  const storeProperties = usePropertiesStore((s) => s.properties);
  const fetchProperties = usePropertiesStore((s) => s.fetchProperties);
  const storeProjects = useProjectsStore((s) => s.projects);
  const fetchProjects = useProjectsStore((s) => s.fetchProjects);
  const isPropertiesLoading = usePropertiesStore((s) => s.isLoading);
  const isProjectsLoading = useProjectsStore((s) => s.isLoading);
  const propertiesError = usePropertiesStore((s) => s.error);
  const projectsError = useProjectsStore((s) => s.error);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        toast.info("Please log in to view your saved items.");
        router.replace("/login?redirect=/dashboard/saved");
      } else {
        fetchProperties();
        fetchProjects();
      }
    }
  }, [authLoading, user, router, fetchProperties, fetchProjects]);

  const savedProperties = useMemo(() => {
    return storeProperties.filter((p) => savedPropertyIds.includes(p.id));
  }, [storeProperties, savedPropertyIds]);

  const savedProjects = useMemo(() => {
    return storeProjects.filter((p) => savedPropertyIds.includes(p.id));
  }, [storeProjects, savedPropertyIds]);

  const totalSavedCount = savedProperties.length + savedProjects.length;

  const handleShare = (property: Property) => {
    const url = `${window.location.origin}/properties/${property.slug}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Link copied to clipboard!");
    });
  };

  const isLoading = !mounted || (isPropertiesLoading && isProjectsLoading && totalSavedCount === 0);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20 relative">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-text-primary">
            Saved Properties & Projects
          </h1>
          <p className="text-text-secondary mt-1">
            Organize and manage your favorite properties and projects.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => setActiveTab("all")}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all border cursor-pointer",
            activeTab === "all"
              ? "bg-amber-500 text-slate-950 border-amber-500 shadow-xs"
              : "bg-bg-card border-border-default text-text-secondary hover:border-border-hover hover:bg-bg-hover"
          )}
        >
          All Saved ({totalSavedCount})
        </button>
        <button
          onClick={() => setActiveTab("properties")}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all border cursor-pointer",
            activeTab === "properties"
              ? "bg-amber-500 text-slate-950 font-bold border-amber-500 shadow-xs"
              : "bg-bg-card border-border-default text-text-secondary hover:border-border-hover hover:bg-bg-hover"
          )}
        >
          Properties ({savedProperties.length})
        </button>
        <button
          onClick={() => setActiveTab("projects")}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all border cursor-pointer",
            activeTab === "projects"
              ? "bg-amber-500 text-slate-950 font-bold border-amber-500 shadow-xs"
              : "bg-bg-card border-border-default text-text-secondary hover:border-border-hover hover:bg-bg-hover"
          )}
        >
          Projects ({savedProjects.length})
        </button>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Loader2 className="w-10 h-10 text-amber-500 animate-spin mb-4" />
          <p className="text-text-secondary text-sm">Loading your saved items...</p>
        </div>
      ) : (propertiesError && projectsError && totalSavedCount === 0) ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-red-500/30 rounded-3xl p-8 bg-red-500/5">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mb-4">
            <Building2 className="w-6 h-6" />
          </div>
          <h3 className="font-heading text-lg font-bold text-text-primary mb-2">Unable to Load Saved Items</h3>
          <p className="text-text-secondary text-xs max-w-sm mb-6">{propertiesError || projectsError}</p>
          <button
            onClick={() => {
              fetchProperties();
              fetchProjects();
            }}
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm transition-all cursor-pointer shadow-md"
          >
            Retry Loading
          </button>
        </div>
      ) : totalSavedCount > 0 ? (
        <div className="space-y-10">
          {/* Properties Section */}
          {(activeTab === "all" || activeTab === "properties") && savedProperties.length > 0 && (
            <div className="space-y-4">
              {activeTab === "all" && savedProjects.length > 0 && (
                <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                  <Home className="w-5 h-5 text-amber-500" /> Saved Properties ({savedProperties.length})
                </h2>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {savedProperties.map((property, i) => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    index={i}
                    actionMenu={
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="w-8 h-8 rounded-full glass flex items-center justify-center text-white hover:bg-black/40 transition-colors">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-56 z-[200] p-2 rounded-xl bg-bg-card border border-border-default shadow-xl"
                        >
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => handleShare(property)}
                          >
                            <Share2 className="w-4 h-4 mr-2 text-text-secondary" />
                            <span className="text-text-primary">Copy Link</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="cursor-pointer text-red-500 hover:text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-500/10"
                            onClick={() => toggleFavorite(property.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            <span>Remove from Saved</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {/* Projects Section */}
          {(activeTab === "all" || activeTab === "projects") && savedProjects.length > 0 && (
            <div className="space-y-4">
              {activeTab === "all" && savedProperties.length > 0 && (
                <h2 className="text-lg font-bold text-text-primary flex items-center gap-2 pt-4">
                  <Building2 className="w-5 h-5 text-amber-500" /> Saved Projects ({savedProjects.length})
                </h2>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {savedProjects.map((project, i) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    index={i}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border-default rounded-3xl p-8">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
            <FolderHeart className="w-8 h-8" />
          </div>
          <h3 className="font-heading text-xl font-bold text-text-primary mb-2">
            No saved items yet
          </h3>
          <p className="text-text-secondary max-w-md mx-auto mb-6 text-sm">
            When you find a property or project you like, click the heart icon to save it for quick access.
          </p>
          <Link href="/search">
            <Button variant="amber" className="rounded-xl px-6 gap-2">
              <Compass className="w-4 h-4" /> Explore Listings
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
