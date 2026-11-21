"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/hooks/use-auth-session";
import { GoogleMap, type GoogleMapMarker } from "@/components/map/google-map";

interface PropertyLocationMapProps {
  latitude: number;
  longitude: number;
  title: string;
}

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function PropertyLocationMap({
  latitude,
  longitude,
  title,
}: PropertyLocationMapProps) {
  const router = useRouter();
  const { isLoggedIn } = useAuthSession();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = useState<string | null>(null);

  const safeLat = typeof latitude === "number" && !isNaN(latitude) && latitude !== 0 ? latitude : 16.5062;
  const safeLng = typeof longitude === "number" && !isNaN(longitude) && longitude !== 0 ? longitude : 80.648;

  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) return;

    // Check cached coordinates
    try {
      const cached = sessionStorage.getItem("user_coords");
      if (cached) {
        const { latitude: lat, longitude: lng } = JSON.parse(cached);
        if (typeof lat === "number" && typeof lng === "number") {
          setUserLocation({ lat, lng });
          const distKm = calculateDistanceKm(lat, lng, safeLat, safeLng);
          setDistance(distKm.toFixed(1));
        }
      }
    } catch {}

    // Request geolocation
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        try {
          sessionStorage.setItem("user_coords", JSON.stringify({ latitude: lat, longitude: lng }));
        } catch {}
        setUserLocation({ lat, lng });
        const distKm = calculateDistanceKm(lat, lng, safeLat, safeLng);
        setDistance(distKm.toFixed(1));
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }, [safeLat, safeLng]);

  const markers: GoogleMapMarker[] = useMemo(() => {
    const list: GoogleMapMarker[] = [
      {
        id: "property",
        position: { lat: safeLat, lng: safeLng },
        title: title || "Property Location",
        color: "#F59E0B",
        infoContent: `<div style="font-weight:600; font-size:12px; padding:4px;">Approximate Location: ${title}</div>`,
      },
    ];

    if (userLocation) {
      list.push({
        id: "user",
        position: userLocation,
        title: "Your Location",
        color: "#3B82F6",
        infoContent: `<div style="font-weight:600; font-size:12px; padding:4px;">Your Location</div>`,
      });
    }

    return list;
  }, [safeLat, safeLng, title, userLocation]);

  return (
    <div className="w-full space-y-4">
      {distance && (
        <div className="flex items-center">
          <div className="inline-flex items-center text-xs font-black text-amber-600 dark:text-amber-400 bg-amber-500/15 border border-amber-500/30 px-3.5 py-2 rounded-xl shadow-xs">
            📍 {distance} km away from this property
          </div>
        </div>
      )}

      <div className="relative h-[300px] md:h-[400px] w-full rounded-2xl overflow-hidden border border-border-default/50 z-0">
        <GoogleMap
          center={{ lat: safeLat, lng: safeLng }}
          zoom={13}
          markers={markers}
          fitBoundsOnMarkers={Boolean(userLocation)}
          className="w-full h-full"
        />
      </div>

      <div className="relative p-4 bg-bg-card/80 backdrop-blur-md border-t border-border-default/50 z-[1000] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-sm font-medium text-text-primary text-center sm:text-left flex-1">
          <span className="text-amber-primary mr-2">🔒</span>
          Exact location is protected for privacy
        </div>
        {isLoggedIn ? (
          <Button variant="amber" size="sm" className="w-full sm:w-auto shadow-amber-glow" asChild>
            <a
              href={`https://wa.me/918466965567?text=${encodeURIComponent(
                "Hi! I'm looking for this property: " + title + ". Could you share the exact location?"
              )}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Contact Agent for Details
            </a>
          </Button>
        ) : (
          <Button
            type="button"
            variant="amber"
            size="sm"
            onClick={() => {
              const redirectPath = typeof window !== "undefined" ? window.location.pathname : "";
              router.push(`/login?redirect=${encodeURIComponent(redirectPath)}`);
            }}
            className="w-full sm:w-auto shadow-amber-glow"
          >
            Contact Agent for Details
          </Button>
        )}
      </div>
    </div>
  );
}
