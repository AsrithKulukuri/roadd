"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Polygon,
  Circle,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Navigation, ArrowRight, Compass, Sparkles, Layers3, ChevronDown, ChevronUp, Route, Car, Pencil, Trash2, Check, Search, X, SlidersHorizontal, Star, School, Hospital, Zap, Calculator, MessageSquare, Calendar, ShieldCheck, Flame, Timer } from "lucide-react";
import L from "leaflet";
import Link from "next/link";
import { PropertyCard } from "@/components/property/property-card";
import { usePropertiesStore } from "@/stores/properties-store";
import { formatPriceCompact, formatINR } from "@/lib/utils";
import { useSearchParams } from "next/navigation";
import { findPropertyByRefId, getPropertyRefId } from "@/lib/ref-id";

// Safe setup for default marker icons in Leaflet with Next.js
if (typeof window !== "undefined") {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
  });
}

const quickLocalityCoords = [
  { name: "Benz Circle", lat: 16.5062, lng: 80.6480 },
  { name: "Poranki", lat: 16.4833, lng: 80.7000 },
  { name: "Kanuru", lat: 16.4950, lng: 80.6800 },
  { name: "Gorantla", lat: 16.3200, lng: 80.4500 },
  { name: "Amaravati Road", lat: 16.5131, lng: 80.5165 },
  { name: "Brodipet", lat: 16.3050, lng: 80.4350 },
];

const landmarkOverlays = [
  { id: "s1", type: "school", name: "VP Siddhartha Public School", lat: 16.5020, lng: 80.6450, tag: "Top Rated School" },
  { id: "s2", type: "school", name: "KCP Siddhartha Adarsh Residential", lat: 16.4880, lng: 80.6920, tag: "Premier School" },
  { id: "s3", type: "school", name: "KL Deemed University", lat: 16.4419, lng: 80.6222, tag: "A++ University" },
  { id: "h1", type: "hospital", name: "Ramesh Hospitals (Benz Circle)", lat: 16.5085, lng: 80.6495, tag: "Multi-Specialty Hospital" },
  { id: "h2", type: "hospital", name: "Ayush Hospitals", lat: 16.5140, lng: 80.6610, tag: "Emergency Care" },
  { id: "h3", type: "hospital", name: "AIIMS Mangalagiri", lat: 16.4380, lng: 80.5550, tag: "Premier Institute" },
  { id: "it1", type: "transit", name: "Medha IT Park", lat: 16.5350, lng: 80.7920, tag: "Tech Hub" },
  { id: "it2", type: "transit", name: "Vijayawada Railway Junction", lat: 16.5180, lng: 80.6200, tag: "Transit Hub" },
  { id: "it3", type: "transit", name: "Vijayawada International Airport", lat: 16.5300, lng: 80.7970, tag: "International Airport" },
];

const localityHeatmaps = [
  { name: "Benz Circle, Vijayawada", lat: 16.5062, lng: 80.6480, pricePerSqFt: "₹7,500/sq.ft", status: "🔥 Prime Luxury Zone", radius: 1200, color: "#EF4444" },
  { name: "Poranki, Vijayawada", lat: 16.4833, lng: 80.7000, pricePerSqFt: "₹4,200/sq.ft", status: "🚀 High Growth Zone", radius: 1500, color: "#F5A623" },
  { name: "Kanuru, Vijayawada", lat: 16.4950, lng: 80.6800, pricePerSqFt: "₹4,800/sq.ft", status: "📈 Emerging Hub", radius: 1100, color: "#3B82F6" },
  { name: "Amaravati Capital Road", lat: 16.5131, lng: 80.5165, pricePerSqFt: "₹5,100/sq.ft", status: "⚡ Capital Hotspot", radius: 1600, color: "#10B981" },
  { name: "Gorantla, Guntur", lat: 16.3200, lng: 80.4500, pricePerSqFt: "₹4,100/sq.ft", status: "🏡 Residential Hub", radius: 1400, color: "#8B5CF6" },
];

function isPointInPolygon(point: { lat: number; lng: number }, polygon: L.LatLng[]) {
  if (!polygon || polygon.length < 3) return true;
  const x = point.lat;
  const y = point.lng;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lat, yi = polygon[i].lng;
    const xj = polygon[j].lat, yj = polygon[j].lng;
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function getLandmarkIcon(type: string) {
  if (typeof window === "undefined" || !L || !L.divIcon) return undefined;
  
  let bg = "#3B82F6";
  let iconHtml = "🏫";
  if (type === "hospital") {
    bg = "#EF4444";
    iconHtml = "🏥";
  } else if (type === "transit") {
    bg = "#10B981";
    iconHtml = "⚡";
  }

  return L.divIcon({
    className: "landmark-overlay-marker",
    html: `
      <div style="
        background: ${bg};
        color: #FFFFFF;
        padding: 3px 8px;
        border-radius: 16px;
        font-size: 11px;
        font-weight: 800;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        display: inline-flex;
        align-items: center;
        gap: 3px;
        border: 1.5px solid #FFFFFF;
        white-space: nowrap;
      ">
        <span>${iconHtml}</span>
      </div>
    `,
    iconSize: [40, 24],
    iconAnchor: [20, 12],
  });
}

function getPricePillIcon(price: number, isSelected: boolean, hasSearch: boolean) {
  if (typeof window === "undefined" || !L || !L.divIcon) return undefined;
  
  const priceText = formatPriceCompact(price);

  const bg = isSelected || hasSearch ? '#F5A623' : '#0F172A';
  const color = isSelected || hasSearch ? '#020617' : '#FFFFFF';
  const border = isSelected || hasSearch ? '2.5px solid #FFFFFF' : '1.5px solid rgba(255, 255, 255, 0.3)';
  const scale = isSelected ? 'scale(1.25)' : hasSearch ? 'scale(1.15)' : 'scale(1)';
  const shadow = hasSearch
    ? '0 0 20px rgba(245, 166, 37, 0.9), 0 4px 14px rgba(0,0,0,0.5)'
    : isSelected
    ? '0 0 18px rgba(245, 166, 37, 0.9)'
    : '0 4px 12px rgba(0, 0, 0, 0.4)';

  return L.divIcon({
    className: `realtor-price-pill-marker ${hasSearch ? 'popup-marker-match' : ''}`,
    html: `
      <div style="
        background: ${bg};
        color: ${color};
        border: ${border};
        padding: 4px 10px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 800;
        box-shadow: ${shadow};
        white-space: nowrap;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 3px;
        transform: ${scale};
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      ">
        ${hasSearch ? '<span style="font-size: 11px;">⭐</span>' : `<span style="color: ${isSelected || hasSearch ? '#020617' : '#F5A623'}; font-weight: 900;">₹</span>`}
        <span>${priceText.replace('₹', '')}</span>
      </div>
    `,
    iconSize: [68, 30],
    iconAnchor: [34, 15],
  });
}

function LocationMarker({
  position,
  setPosition,
  isDrawing,
}: {
  position: L.LatLng | null;
  setPosition: (pos: L.LatLng) => void;
  isDrawing: boolean;
}) {
  const map = useMapEvents({
    click(e) {
      if (!isDrawing) {
        setPosition(e.latlng);
        map.flyTo(e.latlng, map.getZoom());
      }
    },
  });

  const markerRef = useRef<L.Marker>(null);

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const newPos = marker.getLatLng();
          setPosition(newPos);
          map.flyTo(newPos, map.getZoom());
        }
      },
    }),
    [setPosition, map]
  );

  const customIcon = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    return new L.Icon({
      iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });
  }, []);

  return position === null ? null : (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
      icon={customIcon}
    >
      <Popup minWidth={100}>
        <div className="font-medium text-center text-xs">
          <strong className="text-amber-600 block">Your Location Pin</strong>
          <span>{position.lat.toFixed(4)}° N, {position.lng.toFixed(4)}° E</span>
        </div>
      </Popup>
    </Marker>
  );
}

function DrawMapListener({
  isDrawing,
  onAddPoint,
}: {
  isDrawing: boolean;
  onAddPoint: (point: L.LatLng) => void;
}) {
  useMapEvents({
    click(e) {
      if (isDrawing) {
        onAddPoint(e.latlng);
      }
    },
  });
  return null;
}

function checkPropertyMatchesQuery(p: any, query: string): boolean {
  if (!query.trim()) return false;
  const rawTerm = query.toLowerCase().trim();

  const bhkMatch = rawTerm.match(/(\d+)\s*(bhk|bed|bedroom)?/);
  if (bhkMatch && (rawTerm.includes("bhk") || rawTerm.includes("bed"))) {
    const bedrooms = parseInt(bhkMatch[1]);
    if (p.bedrooms === bedrooms) return true;
  }

  const stopWords = ["in", "at", "near", "for", "a", "an", "the", "of"];
  const tokens = rawTerm.split(/\s+/).filter(t => !stopWords.includes(t));

  const pType = (p.propertyType || "").toLowerCase().replace('-', ' ');
  const lType = (p.listingType || "").toLowerCase();
  const city = (p.location?.city || "").toLowerCase();
  const locality = (p.location?.locality || "").toLowerCase();
  const address = (p.location?.address || "").toLowerCase();
  const title = (p.title || "").toLowerCase();
  const desc = (p.description || "").toLowerCase();

  const searchableText = `${title} ${locality} ${city} ${address} ${pType} ${lType} ${desc}`;

  if (tokens.length > 0) {
    return tokens.every(token => {
      const stem = token.length > 3 && token.endsWith('s') ? token.slice(0, -1) : token;
      
      if (stem === "3bhk" || token === "3bhk") return p.bedrooms === 3;
      if (stem === "2bhk" || token === "2bhk") return p.bedrooms === 2;
      if (stem === "4bhk" || token === "4bhk") return p.bedrooms === 4;
      if (stem === "1bhk" || token === "1bhk") return p.bedrooms === 1;

      if (stem === "apartment" || token === "flats" || token === "flat") {
        return pType.includes("apartment") || searchableText.includes("apartment");
      }
      if (stem === "villa" || token === "house" || token === "houses") {
        return pType.includes("villa") || searchableText.includes("villa");
      }
      if (stem === "plot" || stem === "land") {
        return pType.includes("land") || pType.includes("plot") || searchableText.includes("plot") || searchableText.includes("land");
      }
      if (stem === "shop" || stem === "office" || token === "commercial") {
        return pType.includes("commercial") || searchableText.includes("commercial");
      }

      return searchableText.includes(token) || searchableText.includes(stem);
    });
  }

  return searchableText.includes(rawTerm);
}

function calculateDistanceStr(userPos: L.LatLng, propLat: number, propLng: number) {
  if (!userPos || !propLat || !propLng) return "";
  const userLatLng = L.latLng(userPos.lat, userPos.lng);
  const propLatLng = L.latLng(propLat, propLng);
  const meters = userLatLng.distanceTo(propLatLng);
  if (meters < 1000) {
    return `${Math.round(meters)} meters`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

interface PropertyMapProps {
  filteredItems?: any[];
}

export default function PropertyMap({ filteredItems }: PropertyMapProps = {}) {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("location") || searchParams.get("q") || searchParams.get("search") || "";
  const initialType = searchParams.get("type") || searchParams.get("category") || null;
  const initialBhk = searchParams.get("bhk") || null;
  
  const properties = usePropertiesStore((state) => state.properties);
  const mapProperties = useMemo(() => properties.filter((p) => p.showOnMap && p.status !== 'sold'), [properties]);

  const [position, setPosition] = useState<L.LatLng | null>(
    mapProperties.length > 0 && mapProperties[0].location?.latitude && mapProperties[0].location?.longitude
      ? new L.LatLng(mapProperties[0].location.latitude, mapProperties[0].location.longitude)
      : new L.LatLng(16.5062, 80.6480)
  );
  
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);
  const [mapLayerType, setMapLayerType] = useState<"streets" | "hybrid">("streets");
  
  // Real-Time Search Query State inside Map
  const [mapSearchInput, setMapSearchInput] = useState(initialQuery);

  // Price Heatmap Mode State
  const [showHeatmap, setShowHeatmap] = useState(false);

  // Commute Time Radius State (0 = disabled, 15 = 15 mins, 30 = 30 mins)
  const [maxCommuteMins, setMaxCommuteMins] = useState<number>(0);

  // Landmark Overlays State (School / Hospital / Transit)
  const [activeLandmarkTypes, setActiveLandmarkTypes] = useState<string[]>([]);

  // AP Stamp Duty Calculator Modal State
  const [showCalculatorModal, setShowCalculatorModal] = useState(false);
  const [calcPropertyPrice, setCalcPropertyPrice] = useState<number>(7500000);

  // Draw Polygon Area Search State
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawPolygonPoints, setDrawPolygonPoints] = useState<L.LatLng[]>([]);

  const mapRef = useRef<L.Map | null>(null);

  const displayedProperties = useMemo(() => {
    let source = mapProperties;
    if (filteredItems && Array.isArray(filteredItems) && filteredItems.length > 0) {
      source = filteredItems;
    }

    // Polygon Area Draw Filter
    if (drawPolygonPoints.length >= 3) {
      source = source.filter((p) =>
        isPointInPolygon(
          { lat: p.location.latitude, lng: p.location.longitude },
          drawPolygonPoints
        )
      );
    }

    // Commute Radius Filter (approx 15 mins drive = ~8 km radius from user pin)
    if (maxCommuteMins > 0 && position) {
      const maxMeters = maxCommuteMins * 600; // 15 mins ~ 9,000 meters
      const userLatLng = L.latLng(position.lat, position.lng);
      source = source.filter((p) => {
        const propLatLng = L.latLng(p.location.latitude, p.location.longitude);
        return userLatLng.distanceTo(propLatLng) <= maxMeters;
      });
    }

    if (!mapSearchInput.trim()) {
      return source;
    }

    return source.filter((p) => checkPropertyMatchesQuery(p, mapSearchInput));
  }, [mapProperties, filteredItems, drawPolygonPoints, maxCommuteMins, position, mapSearchInput]);

  const selectedProperty = useMemo(() => {
    return displayedProperties.find((p) => p.id === selectedPropertyId);
  }, [displayedProperties, selectedPropertyId]);

  const toggleLandmarkFilter = (type: string) => {
    setActiveLandmarkTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleSearchChange = (val: string) => {
    setMapSearchInput(val);
    if (!val.trim()) return;

    // Check Reference ID Match (e.g. ref345, REF345)
    const refMatch = findPropertyByRefId(val, mapProperties);
    if (refMatch) {
      setSelectedPropertyId(refMatch.id);
      if (refMatch.location?.latitude && refMatch.location?.longitude) {
        const newPos = new L.LatLng(refMatch.location.latitude, refMatch.location.longitude);
        setPosition(newPos);
        if (mapRef.current) {
          mapRef.current.flyTo(newPos, 16, { duration: 1.2 });
        }
      }
      return;
    }

    const matching = mapProperties.filter((p) => checkPropertyMatchesQuery(p, val));
    if (matching.length > 0 && matching[0].location?.latitude && matching[0].location?.longitude) {
      const newPos = new L.LatLng(matching[0].location.latitude, matching[0].location.longitude);
      setPosition(newPos);
      if (mapRef.current) {
        mapRef.current.flyTo(newPos, 13, { duration: 1.2 });
      }
    }
  };

  const handleGetLocation = () => {
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          const newPos = new L.LatLng(latitude, longitude);
          setPosition(newPos);
          if (mapRef.current) {
            mapRef.current.flyTo(newPos, 14, { duration: 1.5 });
          }
          setIsLocating(false);
        },
        (err) => {
          console.error("Geolocation error:", err);
          setIsLocating(false);
          alert("Unable to retrieve your location. Defaulting to Benz Circle, Vijayawada.");
        }
      );
    } else {
      setIsLocating(false);
      alert("Geolocation is not supported by your browser.");
    }
  };

  const handleFlyToLocality = (lat: number, lng: number) => {
    const newPos = new L.LatLng(lat, lng);
    setPosition(newPos);
    if (mapRef.current) {
      mapRef.current.flyTo(newPos, 14, { duration: 1.2 });
    }
  };

  const handleAddDrawPoint = (point: L.LatLng) => {
    setDrawPolygonPoints((prev) => [...prev, point]);
  };

  const handleClearDraw = () => {
    setDrawPolygonPoints([]);
    setIsDrawing(false);
  };

  // AP Registration & Stamp Duty Calculations
  const stampDutyAmt = calcPropertyPrice * 0.05;
  const registrationAmt = calcPropertyPrice * 0.01;
  const transferDutyAmt = calcPropertyPrice * 0.015;
  const totalLegalFee = stampDutyAmt + registrationAmt + transferDutyAmt;
  const totalOnRoadPrice = calcPropertyPrice + totalLegalFee;

  return (
    <div className="w-full h-full flex flex-col touch-none relative" style={{ touchAction: "none" }}>
      {/* Keyframe Animations */}
      <style jsx global>{`
        @keyframes radarLinePulse {
          0% { stroke-dashoffset: 40; }
          100% { stroke-dashoffset: 0; }
        }
        .animated-radar-line {
          animation: radarLinePulse 1.2s linear infinite;
          filter: drop-shadow(0 0 8px rgba(245, 166, 35, 0.9));
        }

        @keyframes matchPopUpPulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(245, 166, 35, 0.9); }
          50% { transform: scale(1.2); box-shadow: 0 0 22px 8px rgba(245, 166, 35, 0.7); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(245, 166, 35, 0); }
        }
        .popup-marker-match {
          animation: matchPopUpPulse 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          z-index: 99999 !important;
        }

        @media (max-width: 767px) {
          .leaflet-top.leaflet-left {
            top: 105px !important;
            left: 12px !important;
          }
        }
      `}</style>

      {/* Main Container */}
      <div className="relative w-full flex-1 flex flex-col md:flex-row gap-0 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden bg-slate-900 shadow-xl h-full touch-none" style={{ touchAction: "none" }}>
        
        {/* Desktop Sidebar Control Panel / Mobile Collapsible Drawer */}
        <div
          className={`w-full md:w-80 flex-shrink-0 p-5 md:p-6 flex-col justify-between bg-slate-900 text-white z-10 border-b md:border-b-0 md:border-r border-slate-800 shadow-2xl space-y-5 ${
            showMobileDrawer ? "flex absolute inset-x-0 top-0 bottom-0 z-[600]" : "hidden md:flex"
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-amber-400" />
                <h2 className="font-heading text-xl font-bold text-white tracking-tight">
                  Map Explorer
                </h2>
              </div>
              {showMobileDrawer && (
                <button
                  onClick={() => setShowMobileDrawer(false)}
                  className="p-1.5 bg-slate-800 text-slate-300 rounded-xl hover:text-white"
                >
                  <ChevronUp className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Smart Search Input Box */}
            <div className="relative">
              <Search className="w-4 h-4 text-amber-400 absolute left-3 top-3" />
              <input
                type="text"
                value={mapSearchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Try 'villa', '3bhk', 'Benz Circle'..."
                className="w-full pl-9 pr-8 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
              />
              {mapSearchInput && (
                <button
                  onClick={() => handleSearchChange("")}
                  className="absolute right-3 top-3 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* AP PRICE HEATMAP & COMMUTE TIME RADIUS SWITCHERS */}
            <div className="bg-slate-800/90 p-3 rounded-2xl border border-slate-700/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-400" /> AP Locality Heatmap
                </span>
                <button
                  onClick={() => setShowHeatmap(!showHeatmap)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                    showHeatmap ? "bg-amber-500 text-slate-950 shadow-md" : "bg-slate-700 text-slate-300"
                  }`}
                >
                  {showHeatmap ? "Active ON" : "Turn ON"}
                </button>
              </div>

              {/* Commute Time Radius Picker */}
              <div className="space-y-1 pt-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Timer className="w-3 h-3 text-amber-400" /> Max Commute Radius:
                </label>
                <div className="grid grid-cols-3 gap-1 text-[10px] font-bold">
                  {[0, 15, 30].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => setMaxCommuteMins(mins)}
                      className={`py-1.5 rounded-lg border transition-all cursor-pointer ${
                        maxCommuteMins === mins
                          ? "bg-amber-500 text-slate-950 border-amber-500 font-extrabold"
                          : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                      }`}
                    >
                      {mins === 0 ? "Any Dist" : `< ${mins} Mins`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* NEIGHBORHOOD AMENITY OVERLAY SWITCHERS */}
            <div className="bg-slate-800/90 p-3 rounded-2xl border border-slate-700/80 space-y-2">
              <span className="text-[11px] font-extrabold uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Neighborhood Overlays
              </span>
              <div className="grid grid-cols-3 gap-1 text-[11px] font-bold">
                <button
                  onClick={() => toggleLandmarkFilter("school")}
                  className={`py-1.5 px-2 rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    activeLandmarkTypes.includes("school")
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  <School className="w-3 h-3" /> Schools
                </button>
                <button
                  onClick={() => toggleLandmarkFilter("hospital")}
                  className={`py-1.5 px-2 rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    activeLandmarkTypes.includes("hospital")
                      ? "bg-red-600 text-white shadow-md"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  <Hospital className="w-3 h-3" /> Hospitals
                </button>
                <button
                  onClick={() => toggleLandmarkFilter("transit")}
                  className={`py-1.5 px-2 rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    activeLandmarkTypes.includes("transit")
                      ? "bg-emerald-600 text-white shadow-md"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  <Zap className="w-3 h-3" /> Transit
                </button>
              </div>
            </div>

            {/* AP STAMP DUTY CALCULATOR BUTTON */}
            <button
              onClick={() => setShowCalculatorModal(true)}
              className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-400 font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Calculator className="w-4 h-4 text-amber-400" />
              <span>AP Stamp Duty & Govt Fee Calculator</span>
            </button>

            {/* Primary Action Button */}
            <button
              type="button"
              onClick={() => {
                handleGetLocation();
                setShowMobileDrawer(false);
              }}
              disabled={isLocating}
              className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-extrabold text-sm rounded-2xl shadow-lg hover:shadow-amber-500/25 flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer disabled:opacity-75"
            >
              <Navigation className={`w-4 h-4 stroke-[2.5] ${isLocating ? "animate-spin" : ""}`} />
              <span>{isLocating ? "Detecting GPS..." : "Find My Location"}</span>
            </button>

            {/* DRAW SEARCH AREA TOOL PANEL */}
            <div className="bg-slate-800/90 p-3 rounded-2xl border border-slate-700/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-amber-400 flex items-center gap-1.5">
                  <Pencil className="w-4 h-4" /> Draw Search Area
                </span>
                {drawPolygonPoints.length > 0 && (
                  <button
                    onClick={handleClearDraw}
                    className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1 font-bold cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" /> Clear
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsDrawing(!isDrawing);
                    setShowMobileDrawer(false);
                  }}
                  className={`py-2 px-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    isDrawing
                      ? "bg-amber-500 text-slate-950 shadow-md animate-pulse"
                      : "bg-slate-700 text-white hover:bg-slate-600"
                  }`}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>{isDrawing ? "Click Map..." : "Start Drawing"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearDraw}
                  disabled={drawPolygonPoints.length === 0}
                  className="py-2 px-2.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 disabled:opacity-40 cursor-pointer"
                >
                  Reset Draw
                </button>
              </div>

              {drawPolygonPoints.length > 0 && (
                <div className="text-[11px] text-slate-300 bg-slate-950 p-2 rounded-xl border border-amber-500/30 flex items-center justify-between">
                  <span>📍 {drawPolygonPoints.length} points placed</span>
                  <span className="font-extrabold text-amber-400">{displayedProperties.length} homes</span>
                </div>
              )}
            </div>

            {/* Selected Property Distance Display Card */}
            {selectedProperty && position && (
              <div className="bg-amber-500/10 border border-amber-500/40 rounded-2xl p-3 text-xs space-y-1.5 animate-in fade-in">
                <div className="flex items-center gap-1.5 text-amber-400 font-extrabold">
                  <Route className="w-4 h-4 text-amber-400" /> Live Route Distance:
                </div>
                <div className="font-bold text-white text-sm truncate">
                  {selectedProperty.title}
                </div>
                <div className="flex items-center justify-between text-slate-200 pt-0.5">
                  <span className="flex items-center gap-1">
                    <Car className="w-3.5 h-3.5 text-amber-400" /> Distance:
                  </span>
                  <span className="font-black text-amber-400 bg-slate-950 px-2 py-0.5 rounded-md border border-amber-500/30">
                    {calculateDistanceStr(position, selectedProperty.location.latitude, selectedProperty.location.longitude)}
                  </span>
                </div>
              </div>
            )}

            {/* Map Layer Mode Switcher */}
            <div className="bg-slate-800/90 p-1.5 rounded-xl border border-slate-700/80 space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 flex items-center gap-1">
                <Layers3 className="w-3 h-3 text-amber-400" /> Map View Mode:
              </label>
              <div className="grid grid-cols-2 gap-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setMapLayerType("streets")}
                  className={`py-1.5 px-2 rounded-lg transition-all text-center cursor-pointer ${
                    mapLayerType === "streets"
                      ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                      : "text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  Clear Streets
                </button>
                <button
                  type="button"
                  onClick={() => setMapLayerType("hybrid")}
                  className={`py-1.5 px-2 rounded-lg transition-all text-center cursor-pointer ${
                    mapLayerType === "hybrid"
                      ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                      : "text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  Satellite + Names
                </button>
              </div>
            </div>

            {/* Quick Explore Hotspots */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" /> Quick Jump Locality:
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {quickLocalityCoords.map((loc) => (
                  <button
                    key={loc.name}
                    onClick={() => {
                      handleFlyToLocality(loc.lat, loc.lng);
                      setShowMobileDrawer(false);
                    }}
                    className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 text-xs font-semibold border border-slate-700 hover:border-amber-500 transition-all text-left truncate cursor-pointer"
                  >
                    📍 {loc.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 space-y-2 text-xs text-slate-300">
            <div className="flex items-center justify-between bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/50">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                <span>Active Properties</span>
              </div>
              <span className="font-extrabold text-amber-400 text-sm">{displayedProperties.length}</span>
            </div>
          </div>
        </div>

        {/* The Leaflet Map Canvas Container */}
        <div className="flex-1 w-full h-full relative bg-slate-950 touch-none" style={{ touchAction: "none" }}>
          
          {/* ULTRA-MODERN COMPACT GLASSMORPHIC FLOATING SEARCH DOCK ON MOBILE */}
          <div className="absolute top-2.5 left-2.5 right-2.5 z-[500] md:hidden flex flex-col gap-1.5 pointer-events-auto">
            
            {/* FLOATING SEARCH DOCK ROW */}
            <div className="w-full bg-slate-950/90 backdrop-blur-xl border border-slate-800/90 rounded-full p-1.5 flex items-center gap-1.5 shadow-2xl">
              <div className="flex-1 flex items-center gap-2 pl-3">
                <Search className="w-4 h-4 text-amber-400 shrink-0" />
                <input
                  type="text"
                  value={mapSearchInput}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Try 'villa', '3bhk', 'Benz Circle'..."
                  className="w-full bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none border-0 ring-0"
                />
                {mapSearchInput && (
                  <button
                    type="button"
                    onClick={() => handleSearchChange("")}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0 pr-0.5">
                <button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={isLocating}
                  title="Find My Location"
                  className="w-8 h-8 rounded-full bg-amber-500 hover:bg-amber-600 text-slate-950 flex items-center justify-center cursor-pointer shadow-xs active:scale-95 transition-all"
                >
                  <Navigation className={`w-4 h-4 stroke-[2.5] ${isLocating ? "animate-spin" : ""}`} />
                </button>

                <button
                  type="button"
                  onClick={() => setIsDrawing(!isDrawing)}
                  title="Draw Search Area"
                  className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all active:scale-95 ${
                    isDrawing ? "bg-amber-500 text-slate-950 animate-pulse shadow-md" : "bg-slate-800/90 text-slate-200 border border-slate-700"
                  }`}
                >
                  <Pencil className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setShowHeatmap(!showHeatmap)}
                  title="AP Price Heatmap"
                  className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer active:scale-95 ${
                    showHeatmap ? "bg-amber-500 text-slate-950 shadow-md" : "bg-slate-800/90 text-amber-400 border border-slate-700"
                  }`}
                >
                  <Flame className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setShowMobileDrawer(true)}
                  title="More Options"
                  className="w-8 h-8 rounded-full bg-slate-800/90 text-slate-200 border border-slate-700 flex items-center justify-center cursor-pointer active:scale-95"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Locality Jump Chips Capsule Row */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar px-1 py-0.5">
              {quickLocalityCoords.map((loc) => (
                <button
                  key={loc.name}
                  onClick={() => handleFlyToLocality(loc.lat, loc.lng)}
                  className="px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md text-slate-200 border border-slate-800/80 text-[11px] font-bold flex-shrink-0 hover:bg-amber-500 hover:text-slate-950 transition-colors shadow-xs"
                >
                  📍 {loc.name}
                </button>
              ))}
            </div>


          </div>

          {/* Drawing Mode Overlay Banner */}
          {isDrawing && (
            <div className="absolute top-24 left-3 right-3 z-[550] bg-amber-500 text-slate-950 font-extrabold text-xs px-3.5 py-2 rounded-2xl shadow-2xl flex items-center justify-between animate-pulse">
              <span className="flex items-center gap-1.5">
                <Pencil className="w-4 h-4" /> Tap points on map to enclose area!
              </span>
              <button
                onClick={handleClearDraw}
                className="bg-slate-950 text-white px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer"
              >
                Done / Clear
              </button>
            </div>
          )}

          <MapContainer
            ref={mapRef}
            center={position ? [position.lat, position.lng] : [16.5062, 80.6480]}
            zoom={12}
            maxZoom={18}
            scrollWheelZoom={false}
            dragging={true}
            touchZoom={true}
            doubleClickZoom={true}
            bounceAtZoomLimits={true}
            className="w-full h-full min-h-full touch-none"
            style={{ touchAction: "none" }}
          >
            <DrawMapListener isDrawing={isDrawing} onAddPoint={handleAddDrawPoint} />

            {mapLayerType === "streets" ? (
              <TileLayer
                attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                maxNativeZoom={18}
                maxZoom={19}
              />
            ) : (
              <>
                <TileLayer
                  attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  maxNativeZoom={18}
                  maxZoom={19}
                />
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                  maxNativeZoom={18}
                  maxZoom={19}
                />
              </>
            )}

            {/* Custom Drag Pin Marker */}
            <LocationMarker position={position} setPosition={setPosition} isDrawing={isDrawing} />

            {/* AP LOCALITY PRICE HEATMAP OVERLAYS */}
            {showHeatmap &&
              localityHeatmaps.map((hm) => (
                <Circle
                  key={hm.name}
                  center={[hm.lat, hm.lng]}
                  radius={hm.radius}
                  pathOptions={{
                    color: hm.color,
                    fillColor: hm.color,
                    fillOpacity: 0.25,
                    weight: 2,
                  }}
                >
                  <Popup>
                    <div className="p-1 text-xs">
                      <strong className="text-slate-900 block font-bold text-sm">{hm.name}</strong>
                      <div className="text-amber-600 font-extrabold text-xs my-0.5">{hm.pricePerSqFt}</div>
                      <div className="text-slate-600 font-medium">{hm.status}</div>
                    </div>
                  </Popup>
                </Circle>
              ))}

            {/* Landmark Overlay Markers (Schools, Hospitals, Transit Hubs) */}
            {landmarkOverlays
              .filter((lm) => activeLandmarkTypes.includes(lm.type))
              .map((lm) => (
                <Marker
                  key={lm.id}
                  position={[lm.lat, lm.lng]}
                  icon={getLandmarkIcon(lm.type)}
                >
                  <Popup>
                    <div className="p-1 text-xs">
                      <strong className="text-amber-600 block text-sm">{lm.name}</strong>
                      <span className="text-slate-600 font-medium">{lm.tag}</span>
                    </div>
                  </Popup>
                </Marker>
              ))}

            {/* Render Drawn Custom Polygon Boundary */}
            {drawPolygonPoints.length > 0 && (
              <Polygon
                positions={drawPolygonPoints}
                pathOptions={{
                  color: "#F5A623",
                  fillColor: "#F5A623",
                  fillOpacity: 0.25,
                  weight: 3,
                  dashArray: "6, 6",
                }}
              />
            )}

            {/* Animated Glowing Radar Line from User Location to Selected Property */}
            {position && selectedProperty && selectedProperty.location?.latitude && selectedProperty.location?.longitude && (
              <Polyline
                positions={[
                  [position.lat, position.lng],
                  [selectedProperty.location.latitude, selectedProperty.location.longitude],
                ]}
                pathOptions={{
                  color: "#F5A623",
                  weight: 4,
                  dashArray: "10, 12",
                  className: "animated-radar-line",
                }}
              />
            )}

            {/* Realtor.com Style Price Pill Markers */}
            {displayedProperties.map((property) => {
              const isSelected = selectedPropertyId === property.id;
              const hasSearch = Boolean(mapSearchInput.trim());
              const pricePillIcon = getPricePillIcon(property.price, isSelected, hasSearch);

              return (
                <Marker
                  key={property.id}
                  position={[property.location.latitude, property.location.longitude]}
                  icon={pricePillIcon}
                  eventHandlers={{
                    click: () => {
                      setSelectedPropertyId(property.id);
                      if (mapRef.current) {
                        mapRef.current.panTo([property.location.latitude, property.location.longitude]);
                      }
                    },
                  }}
                >
                  <Popup className="property-map-popup">
                    <div className="p-1.5 max-w-[240px]">
                      <div className="text-[10px] font-extrabold uppercase text-amber-600 tracking-wider mb-0.5">
                        Brokered by ROAD FACING
                      </div>
                      <div className="font-extrabold text-sm text-slate-900 truncate leading-snug">
                        {property.title}
                      </div>
                      <div className="text-amber-600 font-black text-base my-0.5">
                        {formatPriceCompact(property.price)}
                      </div>

                      {/* Distance Badge */}
                      {position && (
                        <div className="bg-amber-500/15 border border-amber-500/40 text-slate-950 px-2 py-1 rounded-md text-[11px] font-extrabold flex items-center gap-1.5 my-1.5">
                          <Navigation className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                          <span>{calculateDistanceStr(position, property.location.latitude, property.location.longitude)} from you</span>
                        </div>
                      )}

                      <div className="text-[11px] text-slate-600 font-medium truncate mb-2">
                        {property.bedrooms ? `${property.bedrooms} BHK • ` : ""}{property.location.locality}, {property.location.city}
                      </div>

                      {/* 1-Tap Action Row: View Property & WhatsApp Inquiry */}
                      <div className="grid grid-cols-2 gap-1.5">
                        <Link
                          href={`/properties/${property.id}`}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-950 bg-amber-500 hover:bg-amber-600 py-1.5 px-2 rounded-lg justify-center shadow-xs transition-colors"
                        >
                          View Property <ArrowRight className="w-3 h-3" />
                        </Link>
                        <a
                          href={`https://wa.me/919999999999?text=${encodeURIComponent(`Hi ROAD FACING, I am interested in ${property.title} listed at ${formatPriceCompact(property.price)}.`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 py-1.5 px-2 rounded-lg justify-center shadow-xs transition-colors"
                        >
                          <MessageSquare className="w-3 h-3" /> WhatsApp
                        </a>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </div>

      {/* AP STAMP DUTY & REGISTRATION FEE CALCULATOR MODAL */}
      {showCalculatorModal && (
        <div className="fixed inset-0 z-[1000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-amber-400" />
                <h3 className="font-heading text-lg font-bold text-white">AP Registration & Legal Cost Calculator</h3>
              </div>
              <button
                onClick={() => setShowCalculatorModal(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Enter Property Price (₹):</label>
                <input
                  type="number"
                  step="100000"
                  value={calcPropertyPrice}
                  onChange={(e) => setCalcPropertyPrice(Number(e.target.value))}
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl font-black text-amber-400 text-base focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-slate-300">
                <div className="flex justify-between">
                  <span>AP Stamp Duty (5%):</span>
                  <span className="font-bold text-white">{formatINR(stampDutyAmt)}</span>
                </div>
                <div className="flex justify-between">
                  <span>AP Registration Fee (1%):</span>
                  <span className="font-bold text-white">{formatINR(registrationAmt)}</span>
                </div>
                <div className="flex justify-between">
                  <span>AP Transfer Duty (1.5%):</span>
                  <span className="font-bold text-white">{formatINR(transferDutyAmt)}</span>
                </div>
                <div className="border-t border-slate-800 pt-2 flex justify-between font-extrabold text-amber-400 text-sm">
                  <span>Total On-Road Legal Cost:</span>
                  <span>{formatINR(totalOnRoadPrice)}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowCalculatorModal(false)}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs rounded-xl shadow-md cursor-pointer"
            >
              Close Calculator
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
