"use client";

import { GoogleMapLayer } from "@/components/map/google-map-layer";
import { useEffect, useState, useRef } from "react";
import { MapContainer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet's default icon path issues in Next.js
import "leaflet-defaulticon-compatibility";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";

export interface LocationDetails {
  address: string;
  city: string;
  state: string;
  pincode: string;
  locality?: string;
}

interface CoordinatePickerMapProps {
  initialPosition?: [number, number];
  onPositionChange: (lat: number, lng: number, details?: LocationDetails) => void;
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
      address: data.address || "",
      city: data.city || "",
      state: data.state || "",
      pincode: data.pincode || "",
      locality: data.locality || data.city || "",
    };
  } catch {
    return null;
  }
};

function MapViewController({ center }: { center: [number, number] }) {
  const map = useMapEvents({});
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.flyTo(center, 15, { animate: true, duration: 1.2 });
    }
  }, [center[0], center[1], map]);
  return null;
}

function LocationMarker({ 
  position, 
  setPosition 
}: { 
  position: L.LatLng | null;
  setPosition: (pos: L.LatLng, fromUser?: boolean) => void;
}) {
  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng, true);
    },
  });

  const markerRef = useRef<L.Marker>(null);

  return position === null ? null : (
    <Marker 
      position={position}
      draggable={true}
      eventHandlers={{
        dragend() {
          const marker = markerRef.current;
          if (marker != null) {
            setPosition(marker.getLatLng(), true);
          }
        },
      }}
      ref={markerRef}
    />
  );
}

export default function CoordinatePickerMap({ 
  initialPosition = [16.5062, 80.6480], // Vijayawada default
  onPositionChange 
}: CoordinatePickerMapProps) {
  const [position, setPosition] = useState<L.LatLng | null>(
    initialPosition ? new L.LatLng(initialPosition[0], initialPosition[1]) : null
  );
  const isUserActionRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleSetPosition = (pos: L.LatLng, fromUser: boolean = false) => {
    isUserActionRef.current = fromUser;
    setPosition(pos);
  };

  // Sync internal position state when initialPosition prop changes (e.g. from parent form)
  useEffect(() => {
    if (initialPosition && initialPosition[0] && initialPosition[1]) {
      if (!position || Math.abs(position.lat - initialPosition[0]) > 0.0001 || Math.abs(position.lng - initialPosition[1]) > 0.0001) {
        isUserActionRef.current = false;
        setPosition(new L.LatLng(initialPosition[0], initialPosition[1]));
      }
    }
  }, [initialPosition[0], initialPosition[1]]);

  useEffect(() => {
    if (position) {
      // Provide coordinates immediately
      onPositionChange(position.lat, position.lng);
      
      // Only reverse-geocode if user clicked or dragged on the map
      if (isUserActionRef.current) {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        const timeoutId = setTimeout(async () => {
          const details = await reverseGeocode(position.lat, position.lng, controller.signal);
          if (details && !controller.signal.aborted) {
            onPositionChange(position.lat, position.lng, details);
          }
        }, 350);

        return () => {
          clearTimeout(timeoutId);
          controller.abort();
        };
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position]);

  return (
    <div className="w-full h-full rounded-xl overflow-hidden shadow-inner border border-border-default/50 z-0 relative z-[0]">
      <MapContainer 
        center={initialPosition} 
        zoom={13} 
        scrollWheelZoom={true} 
        style={{ height: "100%", width: "100%", zIndex: 0 }}
      >
        <GoogleMapLayer />
        <MapViewController center={initialPosition} />
        <LocationMarker position={position} setPosition={handleSetPosition} />
      </MapContainer>
    </div>
  );
}
