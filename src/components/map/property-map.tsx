"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { GoogleMap, type GoogleMapMarker } from "@/components/map/google-map";
import type { PropertyMapProps, SharedMapItem } from "@/types/map";
import { formatPriceCompact } from "@/lib/utils";
import { Building2, Home, MapPin, X, ArrowRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PropertyMap({
  filteredItems = [],
  userLocation,
  onVisibleItemsChange,
  entityTypeFilter = "all",
  onEntityTypeFilterChange,
  counts,
}: PropertyMapProps) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Filter items by entity type if needed
  const displayedItems = useMemo(() => {
    if (!filteredItems || filteredItems.length === 0) return [];
    if (entityTypeFilter === "projects") {
      return filteredItems.filter((i: any) => i._isProject || i.projectType);
    }
    if (entityTypeFilter === "properties") {
      return filteredItems.filter((i: any) => !i._isProject && !i.projectType);
    }
    return filteredItems;
  }, [filteredItems, entityTypeFilter]);

  // Selected item detail
  const selectedItem = useMemo(() => {
    if (!selectedItemId) return null;
    return displayedItems.find((i) => i.id === selectedItemId) || null;
  }, [selectedItemId, displayedItems]);

  // Map items to GoogleMap markers
  const markers: GoogleMapMarker[] = useMemo(() => {
    const list: GoogleMapMarker[] = [];

    displayedItems.forEach((item: any) => {
      const lat = item.location?.latitude ?? item.latitude;
      const lng = item.location?.longitude ?? item.longitude;

      if (typeof lat === "number" && typeof lng === "number" && !isNaN(lat) && !isNaN(lng)) {
        const isProject = Boolean(item._isProject || item.projectType);
        const name = item.title || item.name || "Listing";
        const priceStr = formatPriceCompact(item.price || 0);

        list.push({
          id: item.id,
          position: { lat, lng },
          title: `${name} - ${priceStr}`,
          color: isProject ? "#F59E0B" : "#3B82F6",
        });
      }
    });

    if (userLocation) {
      list.push({
        id: "user-current-loc",
        position: userLocation,
        title: "Your Location",
        color: "#10B981",
      });
    }

    return list;
  }, [displayedItems, userLocation]);

  const handleMarkerClick = useCallback((markerId: string) => {
    if (markerId === "user-current-loc") return;
    setSelectedItemId(markerId);
  }, []);

  // Compute map center (either from selected item, first item, user location, or default Vijayawada)
  const mapCenter = useMemo(() => {
    if (selectedItem) {
      const lat = (selectedItem as any).location?.latitude ?? (selectedItem as any).latitude;
      const lng = (selectedItem as any).location?.longitude ?? (selectedItem as any).longitude;
      if (lat && lng) return { lat, lng };
    }
    if (markers.length > 0 && markers[0].id !== "user-current-loc") {
      return markers[0].position;
    }
    if (userLocation) {
      return userLocation;
    }
    return { lat: 16.5062, lng: 80.648 }; // Benz Circle, Vijayawada
  }, [selectedItem, markers, userLocation]);

  const getItemImage = (item: any): string => {
    if (item.coverImage) return item.coverImage;
    if (Array.isArray(item.images) && item.images.length > 0) {
      const first = item.images[0];
      return typeof first === "string" ? first : first.url || "";
    }
    return "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&q=80";
  };

  const getItemHref = (item: any): string => {
    const isProject = Boolean(item._isProject || item.projectType);
    const identifier = item.slug || item.id;
    return isProject ? `/projects/${identifier}` : `/properties/${identifier}`;
  };

  return (
    <div className="relative w-full h-full min-h-[500px] flex flex-col bg-slate-950 rounded-2xl overflow-hidden border border-border-default/50">
      {/* Top Controls Bar */}
      <div className="absolute top-4 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Entity Type Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-700/60 shadow-lg pointer-events-auto">
          <button
            type="button"
            onClick={() => onEntityTypeFilterChange?.("all")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              entityTypeFilter === "all"
                ? "bg-amber-500 text-slate-950 shadow-xs"
                : "text-slate-300 hover:text-white hover:bg-slate-800"
            }`}
          >
            All {counts?.all ? `(${counts.all})` : ""}
          </button>
          <button
            type="button"
            onClick={() => onEntityTypeFilterChange?.("projects")}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              entityTypeFilter === "projects"
                ? "bg-amber-500 text-slate-950 shadow-xs"
                : "text-slate-300 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Projects {counts?.projects ? `(${counts.projects})` : ""}
          </button>
          <button
            type="button"
            onClick={() => onEntityTypeFilterChange?.("properties")}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              entityTypeFilter === "properties"
                ? "bg-amber-500 text-slate-950 shadow-xs"
                : "text-slate-300 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            Properties {counts?.properties ? `(${counts.properties})` : ""}
          </button>
        </div>

        {/* Legend */}
        <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-700/60 text-xs font-medium text-slate-300 shadow-lg pointer-events-auto">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            Projects
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            Properties
          </div>
        </div>
      </div>

      {/* Google Map Canvas */}
      <div className="w-full h-full flex-1">
        <GoogleMap
          center={mapCenter}
          zoom={13}
          markers={markers}
          onMarkerClick={handleMarkerClick}
          fitBoundsOnMarkers={markers.length > 1}
          className="w-full h-full"
        />
      </div>

      {/* Selected Item Floating Bottom Card */}
      {selectedItem && (
        <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-20 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="relative bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-2xl p-3 shadow-2xl flex gap-3 text-white">
            <button
              type="button"
              onClick={() => setSelectedItemId(null)}
              className="absolute top-2 right-2 p-1 rounded-full bg-slate-800/80 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="relative w-24 h-24 rounded-xl overflow-hidden shrink-0 bg-slate-800">
              <Image
                src={getItemImage(selectedItem)}
                alt={selectedItem.title || "Listing preview"}
                fill
                sizes="96px"
                className="object-cover"
                unoptimized
              />
            </div>

            <div className="flex-1 min-w-0 pr-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 uppercase tracking-wider mb-0.5">
                  {(selectedItem as any)._isProject || (selectedItem as any).projectType ? (
                    <>
                      <Building2 className="w-3 h-3" /> Project
                    </>
                  ) : (
                    <>
                      <Home className="w-3 h-3" /> Property
                    </>
                  )}
                </div>
                <h4 className="font-bold text-sm text-white truncate">
                  {selectedItem.title || (selectedItem as any).name}
                </h4>
                <p className="text-xs text-slate-400 truncate flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 shrink-0 text-slate-500" />
                  {(selectedItem as any).location?.locality || (selectedItem as any).locality || "Vijayawada"}
                </p>
              </div>

              <div className="flex items-center justify-between gap-2 mt-2 pt-1 border-t border-slate-800">
                <span className="font-extrabold text-amber-400 text-sm">
                  {formatPriceCompact(selectedItem.price || 0)}
                </span>
                <Link
                  href={getItemHref(selectedItem)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 px-2.5 py-1 rounded-lg transition-colors"
                >
                  View Details
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
