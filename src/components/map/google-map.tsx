"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { loadGoogleMaps, GOOGLE_MAPS_AUTH_ERROR } from "@/lib/google-maps-loader";
import { MapPin, AlertCircle, Loader2 } from "lucide-react";

export interface GoogleMapMarker {
  id: string;
  position: { lat: number; lng: number };
  title?: string;
  draggable?: boolean;
  color?: string; // e.g. '#F59E0B' (amber), '#3B82F6' (blue), '#EF4444' (red)
  infoContent?: string;
}

export interface GoogleMapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  markers?: GoogleMapMarker[];
  primaryMarker?: {
    lat: number;
    lng: number;
    title?: string;
    draggable?: boolean;
    color?: string;
  };
  onPositionChange?: (lat: number, lng: number) => void;
  onMarkerClick?: (markerId: string) => void;
  interactive?: boolean;
  scrollWheelZoom?: boolean;
  mapType?: "roadmap" | "satellite" | "hybrid" | "terrain";
  className?: string;
  style?: React.CSSProperties;
  fitBoundsOnMarkers?: boolean;
  zoomControl?: boolean;
}

export function GoogleMap({
  center = { lat: 16.5062, lng: 80.648 }, // Default: Vijayawada Benz Circle
  zoom = 14,
  markers = [],
  primaryMarker,
  onPositionChange,
  onMarkerClick,
  interactive = true,
  scrollWheelZoom = true,
  mapType = "roadmap",
  className = "w-full h-full min-h-[300px]",
  style,
  fitBoundsOnMarkers = false,
  zoomControl = true,
}: GoogleMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const primaryMarkerRef = useRef<google.maps.Marker | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  const [status, setStatus] = useState<"loading" | "ready" | "error" | "auth_error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Initialize Map
  useEffect(() => {
    let disposed = false;

    const handleAuthError = () => {
      if (!disposed) {
        setStatus("auth_error");
        setErrorMessage("Google Maps authentication failed. Please check browser API key.");
      }
    };

    window.addEventListener(GOOGLE_MAPS_AUTH_ERROR, handleAuthError);

    async function init() {
      try {
        await loadGoogleMaps();
        if (disposed || !containerRef.current) return;

        const maps = window.google?.maps;
        if (!maps) {
          throw new Error("Google Maps JS API is not available");
        }

        const map = new maps.Map(containerRef.current, {
          center,
          zoom,
          mapTypeId: mapType,
          gestureHandling: interactive ? "greedy" : "none",
          scrollwheel: scrollWheelZoom,
          zoomControl,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: interactive,
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }],
            },
          ],
        });

        mapInstanceRef.current = map;
        infoWindowRef.current = new maps.InfoWindow();

        // Click to place or move pin if onPositionChange is provided
        if (onPositionChange && interactive) {
          map.addListener("click", (e: google.maps.MapMouseEvent) => {
            if (e.latLng) {
              const newLat = e.latLng.lat();
              const newLng = e.latLng.lng();
              onPositionChange(newLat, newLng);
            }
          });
        }

        setStatus("ready");
      } catch (err: any) {
        if (!disposed) {
          setStatus("error");
          setErrorMessage(err.message || "Failed to load Google Maps");
        }
      }
    }

    void init();

    return () => {
      disposed = true;
      window.removeEventListener(GOOGLE_MAPS_AUTH_ERROR, handleAuthError);
    };
  }, []);

  // Update Center & Map Type
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || status !== "ready") return;

    if (center && (center.lat !== map.getCenter()?.lat() || center.lng !== map.getCenter()?.lng())) {
      map.panTo(center);
    }
  }, [center.lat, center.lng, status]);

  // Handle Primary Marker (e.g. for coordinate picker or single listing view)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const maps = window.google?.maps;
    if (!map || !maps || status !== "ready") return;

    if (!primaryMarker) {
      if (primaryMarkerRef.current) {
        primaryMarkerRef.current.setMap(null);
        primaryMarkerRef.current = null;
      }
      return;
    }

    const pos = { lat: primaryMarker.lat, lng: primaryMarker.lng };

    if (!primaryMarkerRef.current) {
      const pinColor = primaryMarker.color || "#F59E0B";
      const marker = new maps.Marker({
        position: pos,
        map,
        title: primaryMarker.title || "Selected Location",
        draggable: primaryMarker.draggable ?? false,
        animation: maps.Animation.DROP,
        icon: {
          path: maps.SymbolPath.BACKWARD_CLOSED_ARROW,
          scale: 6,
          fillColor: pinColor,
          fillOpacity: 1,
          strokeColor: "#FFFFFF",
          strokeWeight: 2,
        },
      });

      if (primaryMarker.draggable && onPositionChange) {
        marker.addListener("dragend", (e: google.maps.MapMouseEvent) => {
          if (e.latLng) {
            onPositionChange(e.latLng.lat(), e.latLng.lng());
          }
        });
      }

      primaryMarkerRef.current = marker;
    } else {
      primaryMarkerRef.current.setPosition(pos);
      primaryMarkerRef.current.setDraggable(primaryMarker.draggable ?? false);
    }
  }, [primaryMarker?.lat, primaryMarker?.lng, primaryMarker?.draggable, status, onPositionChange]);

  // Handle Multiple Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const maps = window.google?.maps;
    if (!map || !maps || status !== "ready") return;

    const currentMap = markersRef.current;
    const nextIds = new Set(markers.map((m) => m.id));

    // Remove deleted markers
    for (const [id, marker] of currentMap.entries()) {
      if (!nextIds.has(id)) {
        marker.setMap(null);
        currentMap.delete(id);
      }
    }

    const bounds = new maps.LatLngBounds();
    let hasCoords = false;

    // Add / Update markers
    markers.forEach((m) => {
      bounds.extend(m.position);
      hasCoords = true;

      const existing = currentMap.get(m.id);
      if (existing) {
        existing.setPosition(m.position);
      } else {
        const pinColor = m.color || "#F59E0B";
        const newMarker = new maps.Marker({
          position: m.position,
          map,
          title: m.title,
          draggable: m.draggable ?? false,
          icon: {
            path: maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: pinColor,
            fillOpacity: 0.95,
            strokeColor: "#FFFFFF",
            strokeWeight: 2,
          },
        });

        newMarker.addListener("click", () => {
          if (m.infoContent && infoWindowRef.current) {
            infoWindowRef.current.setContent(m.infoContent);
            infoWindowRef.current.open(map, newMarker);
          }
          onMarkerClick?.(m.id);
        });

        currentMap.set(m.id, newMarker);
      }
    });

    if (fitBoundsOnMarkers && hasCoords && markers.length > 1) {
      map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
    }
  }, [markers, status, fitBoundsOnMarkers, onMarkerClick]);

  if (status === "auth_error" || status === "error") {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-slate-900 border border-slate-800 text-slate-300 rounded-xl p-6 text-center ${className}`}
        style={style}
      >
        <AlertCircle className="w-8 h-8 text-amber-500 mb-2" />
        <p className="font-semibold text-white">Map Display Unavailable</p>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          {errorMessage || "Unable to render Google Maps. Please verify your internet connection or Google Maps browser key."}
        </p>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-xl ${className}`} style={style}>
      {status === "loading" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm text-slate-300">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-2" />
          <p className="text-xs font-medium text-slate-300">Loading Google Maps...</p>
        </div>
      )}
      <div ref={containerRef} className="w-full h-full min-h-[300px]" />
    </div>
  );
}

export default GoogleMap;

