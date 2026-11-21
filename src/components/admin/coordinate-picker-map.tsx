"use client";

import { useEffect, useState, useRef } from "react";
import { GoogleMap } from "@/components/map/google-map";

export interface LocationDetails {
  address: string;
  city: string;
  state: string;
  pincode: string;
  locality?: string;
  precision?: "pin" | "viewport" | "geocoded";
}

interface CoordinatePickerMapProps {
  initialPosition?: [number, number];
  onPositionChange: (lat: number, lng: number, details?: LocationDetails) => void;
  className?: string;
}

const reverseGeocode = async (
  lat: number,
  lng: number,
  signal?: AbortSignal
): Promise<LocationDetails | null> => {
  try {
    const res = await fetch(`/api/resolve-maps-url?lat=${lat}&lng=${lng}`, {
      signal,
      headers: {
        Accept: "application/json",
      },
    }).catch(() => null);

    if (!res || !res.ok) return null;
    const data = await res.json().catch(() => null);
    if (!data || !data.success) return null;

    return {
      address: data.address || data.formattedAddress || "",
      city: data.city || "",
      state: data.state || "",
      pincode: data.pincode || "",
      locality: data.locality || data.sublocation?.match?.name || data.sublocation?.detectedName || data.city || "",
      precision: data.precision || "pin",
    };
  } catch {
    return null;
  }
};

export default function CoordinatePickerMap({
  initialPosition = [16.5062, 80.648], // Benz Circle, Vijayawada
  onPositionChange,
  className = "w-full h-[320px] rounded-xl overflow-hidden",
}: CoordinatePickerMapProps) {
  const [position, setPosition] = useState<[number, number]>(initialPosition);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (initialPosition && initialPosition[0] && initialPosition[1]) {
      setPosition(initialPosition);
    }
  }, [initialPosition[0], initialPosition[1]]);

  const handlePositionUpdate = async (lat: number, lng: number) => {
    setPosition([lat, lng]);

    // Cancel any in-flight reverse geocode
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Immediately notify coordinates
    onPositionChange(lat, lng);

    // Fetch address details via Google Geocoding API
    const details = await reverseGeocode(lat, lng, controller.signal);
    if (details) {
      onPositionChange(lat, lng, details);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <GoogleMap
        center={{ lat: position[0], lng: position[1] }}
        zoom={15}
        primaryMarker={{
          lat: position[0],
          lng: position[1],
          draggable: true,
          title: "Drag to refine pin location",
          color: "#F59E0B",
        }}
        onPositionChange={handlePositionUpdate}
        className="w-full h-full"
      />
    </div>
  );
}
