"use client";

import { useState, useEffect } from "react";
import { PropertyCard } from "@/components/property/property-card";
import { CompareModal } from "@/components/property/compare-modal";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreVertical,
  Share2,
  PenSquare,
  Trash2,
  ArrowRightLeft,
  FolderHeart,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFavoritesStore } from "@/stores/favorites-store";
import { supabase } from "@/lib/supabase";
import { mockProperties } from "@/lib/mock-data";
import type { Property } from "@/types/property";
import { toast } from "sonner";

export default function SavedPropertiesPage() {
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [savedProperties, setSavedProperties] = useState<Property[]>([]);
  const [isPageLoading, setIsPageLoading] = useState(true);

  const { savedPropertyIds, syncWithSupabase, isInitialized, toggleFavorite } =
    useFavoritesStore();

  // Sync saved IDs from Supabase on mount
  useEffect(() => {
    syncWithSupabase();
  }, [syncWithSupabase]);

  // Once IDs are loaded, fetch the full property objects
  useEffect(() => {
    if (!isInitialized) return;

    if (savedPropertyIds.length === 0) {
      setSavedProperties([]);
      setIsPageLoading(false);
      return;
    }

    const fetchSavedProperties = async () => {
      setIsPageLoading(true);
      try {
        // Fetch from Supabase
        const { data, error } = await supabase
          .from("properties")
          .select("*")
          .in("id", savedPropertyIds);

        const dbProperties: Property[] = error ? [] : (data as Property[]) || [];

        // Also check mock data for any saved IDs not found in Supabase
        const dbIds = dbProperties.map((p) => p.id);
        const mockFallback = mockProperties.filter(
          (p) => savedPropertyIds.includes(p.id) && !dbIds.includes(p.id)
        );

        setSavedProperties([...dbProperties, ...mockFallback]);
      } catch (err) {
        console.error("Error fetching saved properties:", err);
        // Fall back to mock data only
        setSavedProperties(
          mockProperties.filter((p) => savedPropertyIds.includes(p.id))
        );
      } finally {
        setIsPageLoading(false);
      }
    };

    fetchSavedProperties();
  }, [isInitialized, savedPropertyIds]);

  const handleRemove = async (id: string) => {
    await toggleFavorite(id);
    setSavedProperties((prev) => prev.filter((p) => p.id !== id));
  };

  const handleShare = (property: Property) => {
    const url = `${window.location.origin}/properties/${property.slug}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Link copied to clipboard!");
    });
  };

  const displayProperties =
    activeTab === "all"
      ? savedProperties
      : activeTab === "favorites"
      ? savedProperties.slice(0, 3)
      : savedProperties.slice(3, 5);

  const selectedProps = savedProperties.filter((p) =>
    selectedIds.includes(p.id)
  );

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((i) => i !== id);
      if (prev.length >= 3) {
        toast.error("You can only compare up to 3 properties at once.");
        return prev;
      }
      return [...prev, id];
    });
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20 relative">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-text-primary">
            Saved Properties
          </h1>
          <p className="text-text-secondary mt-1">
            Organize, compare, and manage your favorite properties.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant={compareMode ? "amber" : "outline"}
            onClick={() => {
              setCompareMode(!compareMode);
              if (compareMode) setSelectedIds([]);
            }}
          >
            <ArrowRightLeft className="w-4 h-4 mr-2" />
            {compareMode ? "Cancel Compare" : "Compare"}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {["all", "favorites", "tour"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors border",
              activeTab === tab
                ? "bg-amber-primary/10 border-amber-primary text-amber-primary"
                : "bg-bg-card border-border-default text-text-secondary hover:border-border-hover hover:bg-bg-hover"
            )}
          >
            {tab === "all"
              ? `All Saved (${savedProperties.length})`
              : tab === "favorites"
              ? "Favorites"
              : "To Tour"}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {isPageLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Loader2 className="w-10 h-10 text-amber-primary animate-spin mb-4" />
          <p className="text-text-secondary">Loading your saved properties...</p>
        </div>
      ) : displayProperties.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {displayProperties.map((property, i) => (
            <PropertyCard
              key={property.id}
              property={property}
              index={i}
              selectable={compareMode}
              selected={selectedIds.includes(property.id)}
              onSelect={() => toggleSelection(property.id)}
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
                    <DropdownMenuItem className="cursor-pointer">
                      <PenSquare className="w-4 h-4 mr-2 text-text-secondary" />
                      <span className="text-text-primary">Add Note</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer">
                      <FolderHeart className="w-4 h-4 mr-2 text-text-secondary" />
                      <span className="text-text-primary">Move to Folder</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer text-red-500 hover:text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-500/10"
                      onClick={() => handleRemove(property.id)}
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
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border-default rounded-3xl">
          <div className="w-16 h-16 rounded-full bg-bg-hover flex items-center justify-center mb-4">
            <span className="text-2xl">❤️</span>
          </div>
          <h3 className="font-heading text-xl font-bold text-text-primary mb-2">
            No saved properties yet
          </h3>
          <p className="text-text-secondary max-w-md mx-auto mb-6">
            When you find a property you like, click the heart icon to save it
            here.
          </p>
        </div>
      )}

      {/* Floating Action Bar for Compare Mode */}
      {compareMode && selectedIds.length > 0 && (
        <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] lg:bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className="bg-bg-card border border-border-default shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] rounded-full p-2 pl-6 flex items-center gap-6">
            <div className="text-sm font-medium text-text-primary whitespace-nowrap">
              <span className="text-amber-primary font-bold text-lg">
                {selectedIds.length}
              </span>{" "}
              / 3 selected
            </div>
            <Button
              variant="amber"
              className="rounded-full shadow-amber-glow px-6"
              disabled={selectedIds.length < 2}
              onClick={() => setShowCompareModal(true)}
            >
              Compare Properties
            </Button>
          </div>
        </div>
      )}

      {/* Compare Modal */}
      {showCompareModal && (
        <CompareModal
          properties={selectedProps}
          onClose={() => setShowCompareModal(false)}
        />
      )}
    </div>
  );
}
