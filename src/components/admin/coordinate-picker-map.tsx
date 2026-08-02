"use client";

import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
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

const reverseGeocode = async (lat: number, lng: number): Promise<LocationDetails | null> => {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`, {
      headers: {
        'Accept-Language': 'en'
      }
    });
    if (!res.ok) return null;
    const data = await res.json();
    
    const addr = data.address || {};
    const cityVal = addr.city || addr.town || addr.village || addr.county || addr.suburb || "";
    const localityVal = addr.suburb || addr.neighbourhood || addr.residential || addr.quarter || addr.town || addr.village || cityVal || "";
    const fullAddress = data.name ? `${data.name}, ${data.display_name}` : (data.display_name || "");

    return {
      address: fullAddress,
      city: cityVal,
      state: addr.state || "",
      pincode: addr.postcode || "",
      locality: localityVal
    };
  } catch (error) {
    console.error("Reverse geocoding failed", error);
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
  setPosition: (pos: L.LatLng) => void;
}) {
  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng);
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
            setPosition(marker.getLatLng());
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

  // Sync internal position state when initialPosition prop changes
  useEffect(() => {
    if (initialPosition && initialPosition[0] && initialPosition[1]) {
      if (!position || Math.abs(position.lat - initialPosition[0]) > 0.0001 || Math.abs(position.lng - initialPosition[1]) > 0.0001) {
        setPosition(new L.LatLng(initialPosition[0], initialPosition[1]));
      }
    }
  }, [initialPosition[0], initialPosition[1]]);

  useEffect(() => {
    if (position) {
      // Provide coordinates immediately
      onPositionChange(position.lat, position.lng);
      
      // Fetch reverse geocoding after a small debounce to avoid spamming the API while dragging
      const timeoutId = setTimeout(async () => {
        const details = await reverseGeocode(position.lat, position.lng);
        if (details) {
          onPositionChange(position.lat, position.lng, details);
        }
      }, 300);

      return () => clearTimeout(timeoutId);
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
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapViewController center={initialPosition} />
        <LocationMarker position={position} setPosition={setPosition} />
      </MapContainer>
    </div>
  );
}
