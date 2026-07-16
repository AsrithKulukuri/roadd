"use client";

import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";

// Fix for default marker icons in Leaflet with Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

// Custom icons
const userIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const propertyIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Helper component to adjust zoom when user location is found
function FitBounds({ userPos, propPos }: { userPos: L.LatLng, propPos: L.LatLng }) {
  const map = useMap();
  useEffect(() => {
    const bounds = L.latLngBounds([userPos, propPos]);
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
  }, [map, userPos, propPos]);
  return null;
}

interface PropertyLocationMapProps {
  latitude: number;
  longitude: number;
  title: string;
}

export default function PropertyLocationMap({ latitude, longitude, title }: PropertyLocationMapProps) {
  const [userLocation, setUserLocation] = useState<L.LatLng | null>(null);
  const [distance, setDistance] = useState<string | null>(null);
  const [loadingLoc, setLoadingLoc] = useState(false);
  
  const propertyPos = new L.LatLng(latitude, longitude);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    setLoadingLoc(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const userLatLng = new L.LatLng(lat, lng);
        setUserLocation(userLatLng);
        
        // Calculate distance in meters using Leaflet's built-in distanceTo function
        const distInMeters = userLatLng.distanceTo(propertyPos);
        setDistance((distInMeters / 1000).toFixed(1)); // Convert to km
        setLoadingLoc(false);
      },
      (err) => {
        console.error("Location error:", err);
        alert("Unable to get your location. Please check your browser permissions.");
        setLoadingLoc(false);
      }
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-bg-card border border-border-default/50 shadow-sm">
        <div className="space-y-1">
          <p className="text-sm font-medium text-text-primary">
            Distance & Navigation
          </p>
          <p className="text-xs text-text-secondary">
            {distance ? (
              <span className="text-amber-primary font-medium">You are {distance} km away from this property.</span>
            ) : (
              "Check how far this property is from your current location."
            )}
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleGetLocation}
          disabled={loadingLoc}
          className="text-xs shrink-0"
        >
          <Navigation className="w-3.5 h-3.5 mr-2" />
          {loadingLoc ? "Locating..." : "Get Distance"}
        </Button>
      </div>
      
      {/* Map Container - Important: z-0 to avoid overlapping sticky headers/navs */}
      <div className="w-full h-[350px] md:h-[450px] rounded-3xl overflow-hidden border border-border-default/50 bg-bg-card relative z-0">
        <MapContainer 
          center={[latitude, longitude]} 
          zoom={14} 
          maxZoom={14}
          scrollWheelZoom={false}
          tap={false} /* Fix mobile scroll hijacking */
          className="w-full h-full"
        >
          {/* Using Esri World Imagery tiles for an earth view look */}
          <TileLayer
            attribution='&copy; <a href="https://www.esri.com/">Esri</a> &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={14}
          />
          
          <Circle 
            center={propertyPos} 
            radius={300} 
            pathOptions={{ color: '#d97706', fillColor: '#f59e0b', fillOpacity: 0.4, weight: 2 }}
          />

          {userLocation && (
            <>
              <Marker position={userLocation} icon={userIcon}>
                <Popup className="road-popup">
                  <div className="p-1 min-w-[120px]">
                    <div className="text-sm font-bold text-gray-800 leading-tight mb-1">
                      Your Location
                    </div>
                  </div>
                </Popup>
              </Marker>
              {/* This component will pan and zoom the map to fit both markers */}
              <FitBounds userPos={userLocation} propPos={propertyPos} />
            </>
          )}
        </MapContainer>

        {/* Privacy Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-bg-card/80 backdrop-blur-md border-t border-border-default/50 z-[1000] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm font-medium text-text-primary text-center sm:text-left flex-1">
            <span className="text-amber-primary mr-2">🔒</span>
            Exact location is protected for privacy
          </div>
          <Button variant="amber" size="sm" className="w-full sm:w-auto shadow-amber-glow" asChild>
            <a 
              href={`https://wa.me/918977311418?text=${encodeURIComponent("Hi! I'm looking for this property: " + title + ". Could you share the exact location?")}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Contact Agent for Details
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
