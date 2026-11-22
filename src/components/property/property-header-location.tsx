"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { fetchDrivingDistanceOnDemand } from "@/lib/maps/driving-distance-client";

interface PropertyHeaderLocationProps {
  address?: string;
  locality: string;
  city: string;
  latitude: number;
  longitude: number;
}

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
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

function formatDistanceText(km: number): string {
  let dist = "";
  if (km < 1) {
    const meters = Math.round(km * 1000);
    dist = `${meters} m`;
  } else if (km < 10) {
    dist = `${km.toFixed(1)} km`;
  } else {
    dist = `${Math.round(km)} km`;
  }
  return `${dist} away (straight line)`;
}

export function PropertyHeaderLocation({
  address,
  locality,
  city,
  latitude,
  longitude,
}: PropertyHeaderLocationProps) {
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [drivingDistance, setDrivingDistance] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) return;

    // 1. Instantly check sessionStorage for cached user coordinates
    try {
      const cached = sessionStorage.getItem("user_coords");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (typeof parsed.latitude === "number" && typeof parsed.longitude === "number" && latitude && longitude) {
          const dist = calculateDistanceKm(parsed.latitude, parsed.longitude, latitude, longitude);
          setDistanceKm(dist);
          fetchDrivingDistanceOnDemand({
            originLat: parsed.latitude,
            originLng: parsed.longitude,
            destLat: latitude,
            destLng: longitude,
          }).then((res) => {
            if (res?.display) setDrivingDistance(res.display);
          }).catch(() => {});
        }
      }
    } catch {}

    // 2. Automatically request current position
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        try {
          sessionStorage.setItem("user_coords", JSON.stringify({ latitude: lat, longitude: lng }));
        } catch {}
        if (latitude && longitude) {
          const dist = calculateDistanceKm(lat, lng, latitude, longitude);
          setDistanceKm(dist);
          fetchDrivingDistanceOnDemand({
            originLat: lat,
            originLng: lng,
            destLat: latitude,
            destLng: longitude,
          }).then((res) => {
            if (res?.display) setDrivingDistance(res.display);
          }).catch(() => {});
        }
      },
      (err) => {
        console.warn("Location error or dismissed:", err.message);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }, [latitude, longitude]);

  const scrollToLocationMap = () => {
    const el = document.getElementById("location-map-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const displayText = address ? address : `${locality}, ${city}`;

  return (
    <div
      onClick={scrollToLocationMap}
      title="Click to view interactive map and distance"
      className="flex items-center gap-2 text-text-secondary text-sm flex-wrap cursor-pointer group hover:text-text-primary transition-colors"
    >
      <MapPin className="w-4 h-4 text-[#faad13] shrink-0 group-hover:scale-110 transition-transform" />
      <span>
        {displayText}
        {(drivingDistance || distanceKm !== null) && (
          <span className="font-bold text-slate-900 dark:text-amber-400 ml-1">
            , {drivingDistance ? `${drivingDistance} from you` : `just located ${formatDistanceText(distanceKm!)} from you`}
          </span>
        )}
      </span>
    </div>
  );
}
