"use client";

import { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import { Car, Bike, MapPin, Navigation, Info, Search, ShieldAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface CommuteRadiusMapProps {
  latitude: number;
  longitude: number;
  projectName: string;
  city: string;
}

interface Hotspot {
  name: string;
  lat: number;
  lng: number;
  category: "work" | "transit" | "leisure";
}

// Preset hotspots in AP cities (Vijayawada, Guntur, Amaravati)
const REGIONAL_HOTSPOTS: Record<string, Hotspot[]> = {
  vijayawada: [
    { name: "Benz Circle", lat: 16.5074, lng: 80.6482, category: "work" },
    { name: "Gannavaram Airport", lat: 16.5291, lng: 80.7931, category: "transit" },
    { name: "Pandit Nehru Bus Station", lat: 16.5186, lng: 80.6201, category: "transit" },
    { name: "Railway Station", lat: 16.5184, lng: 80.6223, category: "transit" },
    { name: "PVP Square Mall", lat: 16.5065, lng: 80.6412, category: "leisure" },
    { name: "Mangalagiri IT Park", lat: 16.4385, lng: 80.5790, category: "work" },
  ],
  guntur: [
    { name: "Gorantla Hub", lat: 16.3262, lng: 80.4101, category: "leisure" },
    { name: "NTR Manasa Sarovar", lat: 16.3402, lng: 80.4632, category: "leisure" },
    { name: "Guntur Railway Station", lat: 16.3052, lng: 80.4439, category: "transit" },
    { name: "AIIMS Mangalagiri", lat: 16.4255, lng: 80.5654, category: "work" },
  ],
};

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 12);
  }, [center[0], center[1], map]);
  return null;
}

export default function CommuteRadiusMap({ latitude, longitude, projectName, city }: CommuteRadiusMapProps) {
  const [vehicle, setVehicle] = useState<"car" | "bike">("car");
  const [customDestination, setCustomDestination] = useState("");
  const [customLatLng, setCustomLatLng] = useState<[number, number] | null>(null);
  const [customTime, setCustomTime] = useState<number | null>(null);
  const [customDist, setCustomDist] = useState<number | null>(null);
  const [customLoading, setCustomLoading] = useState(false);

  const center: [number, number] = [latitude, longitude];
  const projectPos = new L.LatLng(latitude, longitude);

  // Speed defaults (km/h) with traffic factors accounted
  const speed = vehicle === "car" ? 32 : 28;

  // Concentric circle radii in meters: 10 mins, 20 mins, 30 mins
  // distance = speed * (time / 60)
  const radii = useMemo(() => {
    const d10 = (speed * (10 / 60)) * 1000;
    const d20 = (speed * (20 / 60)) * 1000;
    const d30 = (speed * (30 / 60)) * 1000;
    return [d10, d20, d30];
  }, [speed]);

  const cleanCity = city.toLowerCase().trim();
  const activeHotspots = REGIONAL_HOTSPOTS[cleanCity] || REGIONAL_HOTSPOTS["vijayawada"]; // fallback

  // Calculate distance and time to a location
  const calculateCommute = (targetLat: number, targetLng: number) => {
    const target = new L.LatLng(targetLat, targetLng);
    const distanceKm = projectPos.distanceTo(target) / 1000;
    // adding a routing index factor of 1.25 for typical city street grid detour
    const routeDistance = distanceKm * 1.25;
    const travelTimeMins = Math.round((routeDistance / speed) * 60);
    return {
      distance: routeDistance.toFixed(1),
      time: travelTimeMins,
    };
  };

  // Resolve custom destination using geocoding
  const handleSearchCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customDestination.trim()) return;

    setCustomLoading(true);
    try {
      const queryStr = `${customDestination}, ${city}, Andhra Pradesh`;
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryStr)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        const targetLat = parseFloat(data[0].lat);
        const targetLng = parseFloat(data[0].lon);
        const calc = calculateCommute(targetLat, targetLng);

        setCustomLatLng([targetLat, targetLng]);
        setCustomDist(parseFloat(calc.distance));
        setCustomTime(calc.time);
      } else {
        alert("Locality not found in this city. Try a landmark like Benz Circle, Ganavaram, etc.");
        setCustomLatLng(null);
      }
    } catch (err) {
      console.error("Geocoding failed", err);
    } finally {
      setCustomLoading(false);
    }
  };

  // Custom pin icons
  const buildMarkerIcon = (color: string) => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="30" height="30" fill="${color}">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>`;
    return L.divIcon({ html: svg, className: "", iconSize: [30, 30], iconAnchor: [15, 30] });
  };

  return (
    <div className="bg-white dark:bg-bg-card border border-border-default rounded-3xl p-5 sm:p-6 space-y-6 shadow-sm overflow-hidden">
      
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-default/50 pb-5">
        <div>
          <h3 className="text-lg font-bold text-text-primary flex items-center gap-1.5">
            <Navigation className="w-5 h-5 text-amber-primary" />
            Commute Time "Radius Bubbles"
          </h3>
          <p className="text-xs text-text-secondary mt-0.5">
            Find out how far you can travel from {projectName} in under 30 minutes
          </p>
        </div>
        
        {/* Vehicle Select */}
        <div className="flex items-center gap-1.5 bg-bg-primary border border-border-default p-1 rounded-xl shrink-0 self-start sm:self-center">
          <button
            type="button"
            onClick={() => setVehicle("car")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              vehicle === "car" ? "bg-amber-primary text-slate-950 shadow-sm" : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <Car className="w-3.5 h-3.5" /> 🚗 Car
          </button>
          <button
            type="button"
            onClick={() => setVehicle("bike")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              vehicle === "bike" ? "bg-amber-primary text-slate-950 shadow-sm" : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <Bike className="w-3.5 h-3.5" /> 🏍️ Bike
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left column: commute stats & search */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Custom Search Form */}
          <form onSubmit={handleSearchCustom} className="space-y-2">
            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block">Calculate Custom Route</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-text-tertiary absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={customDestination}
                  onChange={(e) => setCustomDestination(e.target.value)}
                  placeholder="e.g. Benz Circle, PVP Mall..."
                  className="pl-9 h-11 text-sm bg-bg-primary rounded-xl"
                />
              </div>
              <Button type="submit" disabled={customLoading} className="bg-amber-primary hover:bg-amber-500 text-slate-950 font-bold shrink-0 rounded-xl px-4 h-11">
                {customLoading ? "Searching..." : "Calculate"}
              </Button>
            </div>
          </form>

          {/* Custom destination result card */}
          {customLatLng && customTime != null && customDist != null && (
            <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-amber-600 dark:text-amber-500 font-extrabold uppercase">Custom Commute Result</p>
                <p className="text-sm font-bold text-text-primary mt-1 truncate max-w-[200px]">{customDestination}</p>
                <p className="text-[10px] text-text-tertiary mt-0.5">Route distance: ~{customDist} km</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-2xl font-black text-amber-primary">{customTime} <span className="text-xs font-semibold text-text-secondary">mins</span></p>
                <span className="inline-block px-2 py-0.5 rounded bg-amber-primary/20 text-amber-700 dark:text-amber-400 text-[10px] font-bold uppercase mt-1">
                  {vehicle === "car" ? "Driving" : "Riding"}
                </span>
              </div>
            </div>
          )}

          {/* Quick Hub Hotspots Table */}
          <div className="space-y-2.5">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider block">Est. Driving Times to Key Hubs</span>
            <div className="divide-y divide-border-default border border-border-default bg-bg-primary/30 rounded-2xl overflow-hidden">
              {activeHotspots.map((spot) => {
                const calc = calculateCommute(spot.lat, spot.lng);
                return (
                  <div key={spot.name} className="p-3.5 flex items-center justify-between text-sm hover:bg-bg-primary/50 transition-colors">
                    <div className="min-w-0">
                      <p className="font-semibold text-text-primary truncate">{spot.name}</p>
                      <p className="text-[10px] text-text-tertiary capitalize mt-0.5">
                        {spot.category} • ~{calc.distance} km
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-base font-extrabold ${calc.time <= 15 ? "text-amber-500" : calc.time <= 25 ? "text-amber-500" : "text-text-secondary"}`}>
                        {calc.time} mins
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right column: Leaflet map showing radius bubbles */}
        <div className="lg:col-span-7 h-[360px] md:h-[440px] rounded-3xl overflow-hidden border border-border-default/50 relative z-0">
          <MapContainer center={center} zoom={12} scrollWheelZoom={false} style={{ height: "100%", width: "100%", zIndex: 0 }}>
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CartoDB</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              maxNativeZoom={19}
              maxZoom={20}
            />
            <ChangeView center={center} />

            {/* Main Project Marker */}
            <Marker position={center} icon={buildMarkerIcon("#F59E0B")}>
              <Popup>
                <div className="font-bold text-text-primary p-0.5">{projectName}</div>
              </Popup>
            </Marker>

            {/* Custom search destination pin */}
            {customLatLng && (
              <Marker position={customLatLng} icon={buildMarkerIcon("#3b82f6")}>
                <Popup>
                  <div className="font-bold text-text-primary">{customDestination}</div>
                </Popup>
              </Marker>
            )}

            {/* Concentric Isochrone Circles */}
            {/* 10 mins bubble */}
            <Circle
              center={center}
              radius={radii[0]}
              pathOptions={{ color: "#22c55e", fillColor: "#22c55e", fillOpacity: 0.15, weight: 1.5 }}
            />
            {/* 20 mins bubble */}
            <Circle
              center={center}
              radius={radii[1]}
              pathOptions={{ color: "#f59e0b", fillColor: "#f59e0b", fillOpacity: 0.1, weight: 1.5 }}
            />
            {/* 30 mins bubble */}
            <Circle
              center={center}
              radius={radii[2]}
              pathOptions={{ color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.05, weight: 1.5, dashArray: "4 4" }}
            />
          </MapContainer>

          {/* Floating Time Legends */}
          <div className="absolute top-3 right-3 bg-slate-900/90 border border-slate-700/80 text-white p-2.5 rounded-2xl text-[10px] space-y-1.5 backdrop-blur-sm z-[1000] shadow-lg">
            <p className="font-extrabold uppercase text-slate-400 tracking-wider mb-1">Travel Time Radius</p>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>Green: &lt;10 mins ({Math.round(radii[0]/1000)}km)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>Amber: 10–20 mins ({Math.round(radii[1]/1000)}km)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span>Red dashed: 20–30 mins ({Math.round(radii[2]/1000)}km)</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
