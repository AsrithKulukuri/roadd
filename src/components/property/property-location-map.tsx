"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/hooks/use-auth-session";

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
  const router = useRouter();
  const { isLoggedIn, getLoginUrl } = useAuthSession();
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
    <div className="w-full space-y-4">
      {/* Map Control Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
        <Button 
          type="button"
          onClick={handleGetLocation} 
          disabled={loadingLoc}
          variant="outline" 
          size="sm" 
          className="w-full sm:w-auto h-10 border-slate-300 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-xs"
        >
          <Navigation className={`w-4 h-4 text-amber-500 ${loadingLoc ? 'animate-spin' : ''}`} />
          <span>{loadingLoc ? "Getting Location..." : "Check distance from your location"}</span>
        </Button>
        {distance && (
          <div className="w-full sm:w-auto h-10 flex items-center justify-center text-xs font-black text-amber-500 bg-amber-500/15 border border-amber-500/30 px-3.5 rounded-xl shadow-xs shrink-0">
            📍 {distance} km away from this property
          </div>
        )}
      </div>

      <div className="relative h-[300px] md:h-[400px] w-full rounded-2xl overflow-hidden border border-border-default/50 z-0">
        <MapContainer 
          center={propertyPos} 
          zoom={13} 
          dragging={false}
          scrollWheelZoom={false}
          doubleClickZoom={false}
          touchZoom={false}
          boxZoom={false}
          keyboard={false}
          zoomControl={false}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CartoDB</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            maxNativeZoom={19}
            maxZoom={20}
          />
          {/* Approximate circle rather than pinpoint for privacy */}
          <Circle
            center={propertyPos}
            radius={500}
            pathOptions={{ color: '#F59E0B', fillColor: '#F59E0B', fillOpacity: 0.2 }}
          />
          
          {userLocation && (
            <>
              {/* Actual property marker */}
              <Marker position={propertyPos} icon={propertyIcon}>
                <Popup>
                  <div className="p-1 font-semibold text-text-primary">
                    Approximate Location
                  </div>
                </Popup>
              </Marker>
              {/* User marker */}
              <Marker position={userLocation} icon={userIcon}>
                <Popup>
                  <div className="p-1">
                    <div className="font-semibold text-text-primary">
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
          {isLoggedIn ? (
            <Button variant="amber" size="sm" className="w-full sm:w-auto shadow-amber-glow" asChild>
              <a 
                href={`https://wa.me/918977311418?text=${encodeURIComponent("Hi! I'm looking for this property: " + title + ". Could you share the exact location?")}`}
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
    </div>
  );
}
