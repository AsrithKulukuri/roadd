"use client";

import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet's default icon path issues in Next.js
import "leaflet-defaulticon-compatibility";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";

interface CoordinatePickerMapProps {
  initialPosition?: [number, number];
  onPositionChange: (lat: number, lng: number) => void;
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

  useEffect(() => {
    if (position) {
      onPositionChange(position.lat, position.lng);
    }
  }, [position]);

  return (
    <MapContainer
      center={initialPosition}
      zoom={12}
      scrollWheelZoom={true}
      className="w-full h-full z-0"
    >
      {/* Using Esri World Imagery tiles for an earth view look */}
      <TileLayer
        attribution='&copy; <a href="https://www.esri.com/">Esri</a> &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      />
      <LocationMarker position={position} setPosition={setPosition} />
    </MapContainer>
  );
}
