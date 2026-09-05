"use client";

import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Polygon,
  Circle,
  useMapEvents,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Navigation, ArrowRight, Compass, Sparkles, Layers, Layers3, ChevronDown, ChevronUp, Route, Car, Pencil, Trash2, Check, Search, X, SlidersHorizontal, Star, School, Hospital, Zap, Calculator, MessageSquare, Calendar, ShieldCheck, Flame, Timer, Heart, ChevronLeft, ChevronRight, Plus, Share2, Home, Building2, Landmark, Trees, Briefcase } from "lucide-react";
import L from "leaflet";
import Link from "next/link";
import { PropertyCard } from "@/components/property/property-card";
import { usePropertiesStore } from "@/stores/properties-store";
import { useProjectsStore } from "@/stores/projects-store";
import { useLocationsStore } from "@/stores/locations-store";
import { Slider } from "@/components/ui/slider";
import { formatPriceCompact, formatINR, cn } from "@/lib/utils";
import { useSearchParams, useRouter } from "next/navigation";
import { findPropertyByRefId, getPropertyRefId } from "@/lib/ref-id";
import { useFavoritesStore } from "@/stores/favorites-store";
import { shareItem } from "@/lib/share-utils";
import { useProjectOpenGuard } from "@/hooks/useProjectOpenGuard";
import { toast } from "sonner";
import type { SharedMapItem, PropertyMapProps } from "@/types/map";

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

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
  { name: "Auto Nagar", lat: 16.4950, lng: 80.6650 },
  { name: "Poranki", lat: 16.4833, lng: 80.7000 },
  { name: "Kanuru", lat: 16.4950, lng: 80.6800 },
  { name: "Gorantla", lat: 16.3200, lng: 80.4500 },
  { name: "Amaravati Road", lat: 16.5131, lng: 80.5165 },
  { name: "Brodipet", lat: 16.3050, lng: 80.4350 },
  { name: "Pattabhipuram", lat: 16.3100, lng: 80.4280 },
];

interface LocalityBoundary {
  name: string;
  city: string;
  center: [number, number];
  bounds: [number, number][];
}

const LOCALITY_BOUNDARIES: Record<string, LocalityBoundary> = {
  "auto nagar": {
    name: "Auto Nagar",
    city: "Vijayawada",
    center: [16.4950, 80.6650],
    bounds: [
      [16.5050, 80.6520],
      [16.5080, 80.6780],
      [16.4860, 80.6820],
      [16.4810, 80.6550],
    ],
  },
  "benz circle": {
    name: "Benz Circle",
    city: "Vijayawada",
    center: [16.5062, 80.6480],
    bounds: [
      [16.5150, 80.6380],
      [16.5170, 80.6600],
      [16.4970, 80.6620],
      [16.4950, 80.6400],
    ],
  },
  "poranki": {
    name: "Poranki",
    city: "Vijayawada",
    center: [16.4833, 80.7000],
    bounds: [
      [16.4960, 80.6880],
      [16.4980, 80.7180],
      [16.4700, 80.7220],
      [16.4680, 80.6900],
    ],
  },
  "kanuru": {
    name: "Kanuru",
    city: "Vijayawada",
    center: [16.4950, 80.6800],
    bounds: [
      [16.5050, 80.6680],
      [16.5070, 80.6940],
      [16.4850, 80.6970],
      [16.4830, 80.6700],
    ],
  },
  "pattabhipuram": {
    name: "Pattabhipuram",
    city: "Guntur",
    center: [16.3100, 80.4280],
    bounds: [
      [16.3190, 80.4180],
      [16.3210, 80.4400],
      [16.3010, 80.4420],
      [16.2990, 80.4200],
    ],
  },
  "brodipet": {
    name: "Brodipet",
    city: "Guntur",
    center: [16.3050, 80.4350],
    bounds: [
      [16.3140, 80.4260],
      [16.3160, 80.4450],
      [16.2960, 80.4470],
      [16.2940, 80.4280],
    ],
  },
  "gorantla": {
    name: "Gorantla",
    city: "Guntur",
    center: [16.3200, 80.4500],
    bounds: [
      [16.3310, 80.4380],
      [16.3330, 80.4640],
      [16.3090, 80.4660],
      [16.3070, 80.4400],
    ],
  },
  "amaravati": {
    name: "Amaravati Road",
    city: "Guntur",
    center: [16.5131, 80.5165],
    bounds: [
      [16.5230, 80.5030],
      [16.5260, 80.5320],
      [16.5030, 80.5350],
      [16.5000, 80.5060],
    ],
  },
};

const landmarkOverlays = [
  // Temples & Religious
  { id: "t1", type: "temple", name: "Panakala Narasimha Temple", lat: 16.4420, lng: 80.5650, tag: "Historic Hill Temple" },
  { id: "t2", type: "temple", name: "Kanaka Durga Temple", lat: 16.5152, lng: 80.6053, tag: "Famous Pilgrim Shrine" },
  { id: "t3", type: "temple", name: "Gorantla Venkateswara Temple", lat: 16.3350, lng: 80.4210, tag: "Prominent Temple" },
  { id: "t4", type: "temple", name: "Siva Temple (Pattabhipuram)", lat: 16.2950, lng: 80.4200, tag: "Colony Temple" },
  { id: "t5", type: "temple", name: "Koritapadu Venkateswara Temple", lat: 16.3060, lng: 80.4220, tag: "Heritage Temple" },

  // Churches & Shrines
  { id: "c1", type: "church", name: "Gunadala Mary Matha Shrine", lat: 16.5320, lng: 80.6550, tag: "Celebrated Holy Shrine" },
  { id: "c2", type: "church", name: "St. Peter's Cathedral", lat: 16.5118, lng: 80.6234, tag: "Historic Cathedral" },

  // Hospitals
  { id: "h1", type: "hospital", name: "Ramesh Hospitals", lat: 16.5085, lng: 80.6495, tag: "Multi-Specialty Hospital" },
  { id: "h2", type: "hospital", name: "Ayush Hospitals", lat: 16.5140, lng: 80.6610, tag: "Emergency Care" },
  { id: "h3", type: "hospital", name: "AIIMS Mangalagiri", lat: 16.4380, lng: 80.5550, tag: "Premier Medical Institute" },
  { id: "h4", type: "hospital", name: "Manipal Hospital (Tadepalli)", lat: 16.4855, lng: 80.6125, tag: "Super Specialty Hospital" },
  { id: "h5", type: "hospital", name: "Andhra Hospitals", lat: 16.5245, lng: 80.6312, tag: "Multi-Specialty Center" },
  { id: "h6", type: "hospital", name: "Capital Hospital (Kanuru)", lat: 16.4912, lng: 80.6845, tag: "General Care Hospital" },
  { id: "h7", type: "hospital", name: "Time Hospital (Auto Nagar)", lat: 16.4998, lng: 80.6685, tag: "Emergency & Trauma" },
  { id: "h8", type: "hospital", name: "St. Joseph Hospital (Guntur)", lat: 16.3120, lng: 80.4280, tag: "Healthcare Institute" },

  // Parks & Waterfront
  { id: "p1", type: "park", name: "Rajiv Gandhi Park", lat: 16.5148, lng: 80.6142, tag: "City Waterfront Park" },
  { id: "p2", type: "park", name: "Dr. K.L. Rao Park", lat: 16.5250, lng: 80.6010, tag: "Urban Park" },
  { id: "p3", type: "park", name: "Brundavan Gardens (Guntur)", lat: 16.3195, lng: 80.4241, tag: "Public Garden & Park" },
  { id: "p4", type: "park", name: "Bhavani Island", lat: 16.5210, lng: 80.5890, tag: "River Island Tourism" },

  // Schools & Universities
  { id: "s1", type: "school", name: "VP Siddhartha Public School", lat: 16.5020, lng: 80.6450, tag: "Top Rated School" },
  { id: "s2", type: "school", name: "KCP Siddhartha Residential", lat: 16.4880, lng: 80.6920, tag: "Premier School" },
  { id: "s3", type: "school", name: "KL Deemed University", lat: 16.4419, lng: 80.6222, tag: "A++ University" },
  { id: "s4", type: "school", name: "VR Siddhartha Engineering", lat: 16.4835, lng: 80.6938, tag: "Top Engineering College" },
  { id: "s5", type: "school", name: "Acharya Nagarjuna University", lat: 16.3775, lng: 80.5285, tag: "State University" },

  // Transit & Major Hubs
  { id: "it1", type: "transit", name: "Medha IT Park", lat: 16.5350, lng: 80.7920, tag: "Tech Hub" },
  { id: "it2", type: "transit", name: "Vijayawada Railway Junction", lat: 16.5180, lng: 80.6200, tag: "Major Railway Junction" },
  { id: "it3", type: "transit", name: "Vijayawada Airport", lat: 16.5300, lng: 80.7970, tag: "International Airport" },
  { id: "it4", type: "transit", name: "AP Secretariat (Velagapudi)", lat: 16.5412, lng: 80.5182, tag: "State Capital Secretariat" },
  { id: "it5", type: "transit", name: "AP High Court (Nelapadu)", lat: 16.5215, lng: 80.5058, tag: "AP High Court" },
  { id: "it6", type: "transit", name: "Guntur Railway Station", lat: 16.3052, lng: 80.4439, tag: "Major Railway Station" },
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

function getLandmarkIcon(type: string, name: string) {
  if (typeof window === "undefined" || !L || !L.divIcon) return undefined;
  
  let bg = "#3B82F6";
  let iconHtml = "🏫";
  if (type === "temple") {
    bg = "#EA580C"; // orange-600
    iconHtml = "🛕";
  } else if (type === "church") {
    bg = "#7C3AED"; // purple-600
    iconHtml = "⛪";
  } else if (type === "hospital") {
    bg = "#DC2626"; // red-600
    iconHtml = "🏥";
  } else if (type === "park") {
    bg = "#16A34A"; // green-600
    iconHtml = "🌳";
  } else if (type === "transit") {
    bg = "#0284C7"; // sky-600
    iconHtml = "⚡";
  } else if (type === "school") {
    bg = "#4F46E5"; // indigo-600
    iconHtml = "🏫";
  }

  const safeName = (name || "").replace(/"/g, "&quot;");

  return L.divIcon({
    className: "landmark-overlay-marker",
    html: `
      <div style="
        background: ${bg};
        color: #FFFFFF;
        padding: 3px 8px;
        border-radius: 9999px;
        font-size: 11px;
        font-weight: 800;
        box-shadow: 0 4px 14px rgba(0,0,0,0.35);
        display: inline-flex;
        align-items: center;
        gap: 4px;
        border: 2px solid #FFFFFF;
        white-space: nowrap;
        max-width: 170px;
        cursor: pointer;
      ">
        <span style="font-size: 12px; line-height: 1;">${iconHtml}</span>
        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px;">${safeName}</span>
      </div>
    `,
    iconSize: [120, 26],
    iconAnchor: [60, 13],
  });
}

function getPricePillIcon(price: number, isSelected: boolean, hasSearch: boolean, isBlinking: boolean = false) {
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

  const blinkClass = isBlinking ? 'animate-pulse ring-4 ring-amber-500 shadow-2xl' : '';

  return L.divIcon({
    className: `realtor-price-pill-marker ${blinkClass}`,
    html: `
      <div class="${hasSearch ? 'pulse-inner-pill' : ''}" style="
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
        justify-content: center;
        transform: ${scale};
        transition: transform 0.2s ease;
        z-index: ${isSelected || isBlinking ? 9999 : 1};
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

// Forces Leaflet to recalculate map container size and load tiles smoothly without jitter
function MapInvalidator() {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const container = map.getContainer();
    if (!container) return;

    // Single smooth measurement after mount
    const t = setTimeout(() => {
      if (map) map.invalidateSize({ animate: false, pan: false });
    }, 150);

    // Watch resize with RAF to prevent jitter
    let rId: number | null = null;
    const ro = new ResizeObserver(() => {
      if (rId) cancelAnimationFrame(rId);
      rId = requestAnimationFrame(() => {
        if (map) map.invalidateSize({ animate: false, pan: false });
      });
    });
    ro.observe(container);

    return () => {
      clearTimeout(t);
      if (rId) cancelAnimationFrame(rId);
      ro.disconnect();
    };
  }, [map]);

  return null;
}

function FreehandDrawListener({
  isDrawing,
  onDrawStart,
  onDrawMove,
  onDrawEnd,
}: {
  isDrawing: boolean;
  onDrawStart: (point: L.LatLng) => void;
  onDrawMove: (point: L.LatLng) => void;
  onDrawEnd: () => void;
}) {
  const map = useMap();
  const isMouseDownRef = useRef(false);

  useEffect(() => {
    if (!map) return;

    const container = map.getContainer();
    if (!container) return;

    if (isDrawing) {
      map.dragging.disable();
      if (map.touchZoom) map.touchZoom.disable();
      if (map.doubleClickZoom) map.doubleClickZoom.disable();
      if (map.scrollWheelZoom) map.scrollWheelZoom.disable();
      container.style.cursor = "crosshair";
    } else {
      map.dragging.enable();
      if (map.touchZoom) map.touchZoom.enable();
      if (map.doubleClickZoom) map.doubleClickZoom.enable();
      if (map.scrollWheelZoom) map.scrollWheelZoom.enable();
      container.style.cursor = "";
      return;
    }

    const getLatLngFromEvent = (e: MouseEvent | TouchEvent): L.LatLng | null => {
      let clientX = 0;
      let clientY = 0;

      if ("touches" in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ("clientX" in e) {
        clientX = (e as MouseEvent).clientX;
        clientY = (e as MouseEvent).clientY;
      } else {
        return null;
      }

      const rect = container.getBoundingClientRect();
      const containerPoint = L.point(clientX - rect.left, clientY - rect.top);
      return map.containerPointToLatLng(containerPoint);
    };

    const handleStart = (e: MouseEvent | TouchEvent) => {
      if (!isDrawing) return;
      isMouseDownRef.current = true;
      const latlng = getLatLngFromEvent(e);
      if (latlng) {
        onDrawStart(latlng);
      }
    };

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDrawing || !isMouseDownRef.current) return;
      if (e.cancelable) {
        e.preventDefault(); // Prevent page scroll on touchscreens while sketching
      }
      const latlng = getLatLngFromEvent(e);
      if (latlng) {
        onDrawMove(latlng);
      }
    };

    const handleEnd = () => {
      if (!isDrawing || !isMouseDownRef.current) return;
      isMouseDownRef.current = false;
      onDrawEnd();
    };

    container.addEventListener("mousedown", handleStart);
    container.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleEnd);

    container.addEventListener("touchstart", handleStart, { passive: false });
    container.addEventListener("touchmove", handleMove, { passive: false });
    window.addEventListener("touchend", handleEnd);

    return () => {
      container.removeEventListener("mousedown", handleStart);
      container.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleEnd);

      container.removeEventListener("touchstart", handleStart);
      container.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleEnd);

      map.dragging.enable();
      if (map.touchZoom) map.touchZoom.enable();
      if (map.doubleClickZoom) map.doubleClickZoom.enable();
      if (map.scrollWheelZoom) map.scrollWheelZoom.enable();
      container.style.cursor = "";
    };
  }, [isDrawing, map, onDrawStart, onDrawMove, onDrawEnd]);

  return null;
}

function checkPropertyMatchesQuery(p: SharedMapItem, query: string): boolean {
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
  const title = (p.title || ("name" in p && typeof p.name === "string" ? p.name : "") || "").toLowerCase();
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

function itemMatchesSubtype(p: any, typeKey: string): boolean {
  if (!typeKey || typeKey === "all") return true;

  const pType = (p.propertyType || "").toLowerCase();
  const subType = (p.subtype || "").toLowerCase();
  const title = (p.title || p.name || "").toLowerCase();
  const desc = (p.description || "").toLowerCase();
  const isProj = Boolean(p._isProject);
  const origProj = p._originalProjectData;

  switch (typeKey) {
    case "flats":
    case "apartments":
      if (isProj) {
        return pType === "apartment" || title.includes("apartment") || title.includes("flat") || title.includes("tower");
      }
      return pType === "apartment" || subType.includes("flat") || title.includes("flat") || title.includes("apartment");

    case "houses":
      if (isProj) return false;
      return pType === "independent-house" || subType.includes("house") || title.includes("house");

    case "villas":
      if (isProj) {
        return pType === "villa" || title.includes("villa");
      }
      return pType === "villa" || subType.includes("villa") || title.includes("villa");

    case "plots":
      if (isProj) {
        return pType === "venture" || title.includes("plot") || title.includes("layout") || title.includes("venture");
      }
      return pType === "residential-land" || pType === "commercial-lands" || subType.includes("plot") || subType.includes("land") || title.includes("plot");

    case "agriculture":
      if (isProj) return false;
      return pType === "agricultural-lands" || pType === "farmhouse" || subType.includes("farm") || title.includes("agri") || title.includes("farm") || desc.includes("agriculture");

    case "crda":
      if (isProj) {
        return pType === "venture" || Boolean(origProj?.crdaApproved) || Boolean(p.crdaApproved) || title.includes("crda") || desc.includes("crda");
      }
      return title.includes("crda") || desc.includes("crda");

    case "gated": {
      const hasGatedAmenity = Array.isArray(p.amenities) && p.amenities.some((a: unknown) => {
        if (typeof a === "string") return a.toLowerCase().includes("gated");
        if (a && typeof a === "object" && "name" in a && typeof (a as any).name === "string") {
          return (a as any).name.toLowerCase().includes("gated");
        }
        return false;
      });
      if (isProj) {
        return Boolean(origProj?.isGatedCommunity) || Boolean(p.isGatedCommunity) || title.includes("gated") || desc.includes("gated") || hasGatedAmenity;
      }
      return title.includes("gated") || desc.includes("gated") || hasGatedAmenity;
    }

    case "commercial":
      if (isProj) {
        return pType.includes("commercial") || title.includes("commercial");
      }
      return pType.includes("commercial") || pType === "shops" || pType === "buildings" || title.includes("commercial") || title.includes("shop");

    default:
      return true;
  }
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

function resolvePropertyMapCoords(p: SharedMapItem): { lat: number; lng: number } {
  if (!p) return { lat: 16.5062, lng: 80.6480 };

  const currentLat = Number(p.location?.latitude);
  const currentLng = Number(p.location?.longitude);

  // If valid coordinates already exist on the property or project, always use them directly!
  if (!isNaN(currentLat) && !isNaN(currentLng) && currentLat !== 0 && currentLng !== 0) {
    return { lat: currentLat, lng: currentLng };
  }

  const pLocality = (p.location?.locality || "").toLowerCase();
  const pAddress = (p.location?.address || "").toLowerCase();
  const pTitle = (p.title || ("name" in p && typeof p.name === "string" ? p.name : "") || "").toLowerCase();
  const combined = `${pTitle} ${pLocality} ${pAddress}`;

  // Check if property matches any known locality preset
  for (const [key, b] of Object.entries(LOCALITY_BOUNDARIES)) {
    if (combined.includes(key)) {
      const centerLat = b.center[0];
      const centerLng = b.center[1];
      const idStr = String(p.id || "1");
      const hash = idStr.split("").reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
      const latOffset = ((hash % 7) - 3) * 0.0018;
      const lngOffset = (((hash * 13) % 7) - 3) * 0.0018;
      return {
        lat: centerLat + latOffset,
        lng: centerLng + lngOffset,
      };
    }
  }

  return {
    lat: 16.5062,
    lng: 80.6480,
  };
}

function getDynamicLocalityBoundary(query: string, properties: SharedMapItem[]): { name: string; city?: string; bounds: [number, number][] } | null {
  if (!query.trim()) return null;
  const qLower = query.toLowerCase().trim();

  // Find all properties matching the search query
  const matchingProps = properties.filter((p) => checkPropertyMatchesQuery(p, query));
  
  // Resolve coordinates for matching properties
  const propCoords = matchingProps.map((p) => resolvePropertyMapCoords(p));
  const lats = propCoords.map((c) => c.lat);
  const lngs = propCoords.map((c) => c.lng);

  let presetBoundary: LocalityBoundary | null = null;
  for (const [key, b] of Object.entries(LOCALITY_BOUNDARIES)) {
    if (qLower.includes(key) || key.includes(qLower)) {
      presetBoundary = b;
      break;
    }
  }

  if (presetBoundary) {
    // Include preset bounds AND all matching property coords
    const allLats = [...presetBoundary.bounds.map((b) => b[0]), ...lats];
    const allLngs = [...presetBoundary.bounds.map((b) => b[1]), ...lngs];
    const minLat = Math.min(...allLats);
    const maxLat = Math.max(...allLats);
    const minLng = Math.min(...allLngs);
    const maxLng = Math.max(...allLngs);

    const latPad = 0.005;
    const lngPad = 0.005;

    const top = maxLat + latPad;
    const bottom = minLat - latPad;
    const right = maxLng + lngPad;
    const left = minLng - lngPad;

    const midLat = (top + bottom) / 2;
    const midLng = (left + right) / 2;

    const bounds: [number, number][] = [
      [top, midLng],
      [top - (top - bottom) * 0.12, right - (right - left) * 0.12],
      [midLat, right],
      [bottom + (top - bottom) * 0.12, right - (right - left) * 0.12],
      [bottom, midLng],
      [bottom + (top - bottom) * 0.12, left + (right - left) * 0.12],
      [midLat, left],
      [top - (top - bottom) * 0.12, left + (right - left) * 0.12],
    ];

    return {
      name: presetBoundary.name,
      city: presetBoundary.city,
      bounds,
    };
  }

  if (matchingProps.length === 0 || lats.length === 0 || lngs.length === 0) return null;

  // Dynamic boundary calculation for any search query
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const latPad = Math.max((maxLat - minLat) * 0.35, 0.008);
  const lngPad = Math.max((maxLng - minLng) * 0.35, 0.008);

  const top = maxLat + latPad;
  const bottom = minLat - latPad;
  const right = maxLng + lngPad;
  const left = minLng - lngPad;

  const midLat = (top + bottom) / 2;
  const midLng = (left + right) / 2;

  const bounds: [number, number][] = [
    [top, midLng],
    [top - latPad * 0.2, right - lngPad * 0.15],
    [midLat, right],
    [bottom + latPad * 0.2, right - lngPad * 0.2],
    [bottom, midLng],
    [bottom + latPad * 0.15, left + lngPad * 0.2],
    [midLat, left],
    [top - latPad * 0.15, left + lngPad * 0.15],
  ];

  const matchedLocality = matchingProps[0].location?.locality || matchingProps[0].location?.city || query;
  const matchedCity = matchingProps[0].location?.city || "";

  return {
    name: matchedLocality,
    city: matchedCity,
    bounds,
  };
}

function MapCardImageCarousel({ images, title, propertyType }: { images: string[]; title: string; propertyType: string }) {
  const [idx, setIdx] = useState(0);
  const handlePrev = (e: React.MouseEvent) => { e.stopPropagation(); setIdx(i => Math.max(0, i - 1)); }
  const handleNext = (e: React.MouseEvent) => { e.stopPropagation(); setIdx(i => Math.min(images.length - 1, i + 1)); }
  
  return (
    <div className="relative w-24 sm:w-28 h-24 rounded-xl overflow-hidden shrink-0 bg-slate-800 group/carousel">
      <img src={images[idx]} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
      <div className="absolute top-1 left-1 bg-slate-950/80 text-[#f1a010] text-[9px] font-extrabold px-1.5 py-0.5 rounded-md backdrop-blur-xs z-10 shadow-xs border border-[#f1a010]/20">
        {propertyType}
      </div>
      {images.length > 1 && idx > 0 && (
         <button onClick={handlePrev} className="absolute left-1 top-1/2 -translate-y-1/2 bg-slate-950/60 hover:bg-slate-950 p-1 rounded-full text-white opacity-0 group-hover/carousel:opacity-100 transition-all z-10 backdrop-blur-sm">
            <ChevronLeft className="w-3 h-3" />
         </button>
      )}
      {images.length > 1 && idx < images.length - 1 && (
         <button onClick={handleNext} className="absolute right-1 top-1/2 -translate-y-1/2 bg-slate-950/60 hover:bg-slate-950 p-1 rounded-full text-white opacity-0 group-hover/carousel:opacity-100 transition-all z-10 backdrop-blur-sm">
            <ChevronRight className="w-3 h-3" />
         </button>
      )}
      {images.length > 1 && (
         <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-0.5 z-10">
            {images.slice(0, 5).map((_, i) => (
               <div key={i} className={cn("h-1 rounded-full transition-all", i === idx ? 'w-2.5 bg-white' : 'w-1 bg-white/50')} />
            ))}
            {images.length > 5 && <div className="w-1 h-1 rounded-full bg-white/50" />}
         </div>
      )}
    </div>
  )
}

function MapCardSkeleton() {
  return (
    <div className="w-72 sm:w-80 shrink-0 bg-slate-900 border border-slate-800 rounded-2xl p-2.5 flex gap-3 animate-pulse">
      <div className="w-24 sm:w-28 h-24 rounded-xl bg-slate-800 shrink-0"></div>
      <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
        <div className="space-y-2.5">
          <div className="h-3.5 bg-slate-800 rounded w-1/3"></div>
          <div className="h-3 bg-slate-800 rounded w-3/4"></div>
          <div className="h-2.5 bg-slate-800 rounded w-1/2 mt-1"></div>
        </div>
        <div className="flex justify-between items-end">
          <div className="h-2.5 bg-slate-800 rounded w-16"></div>
          <div className="h-2.5 bg-slate-800 rounded w-12"></div>
        </div>
      </div>
    </div>
  )
}

function SidebarCardSkeleton() {
  return (
    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2 animate-pulse">
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-slate-200 rounded w-3/4"></div>
        <div className="h-2 bg-slate-200 rounded w-1/2"></div>
      </div>
      <div className="h-3 bg-slate-200 rounded w-16"></div>
    </div>
  )
}

function MapViewportListener({
  mapProperties,
  onVisibleItemsChange,
}: {
  mapProperties: SharedMapItem[];
  onVisibleItemsChange?: (visibleIds: string[]) => void;
}) {
  const map = useMapEvents({
    moveend: () => updateVisibleItems(),
    zoomend: () => updateVisibleItems(),
  });

  const updateVisibleItems = useCallback(() => {
    if (!onVisibleItemsChange) return;
    const bounds = map.getBounds();
    const visibleIds = mapProperties
      .filter((p) => {
        const coords = resolvePropertyMapCoords(p);
        const latLng = L.latLng(coords.lat, coords.lng);
        return bounds.contains(latLng);
      })
      .map((p) => p.id);
    onVisibleItemsChange(visibleIds);
  }, [map, mapProperties, onVisibleItemsChange]);

  // Initial trigger when map loads or properties change
  useEffect(() => {
    updateVisibleItems();
  }, [updateVisibleItems]);

  return null;
}

// Debounced version of the viewport listener with change detection
function MapViewportListenerDebounced({
  mapProperties,
  displayedProperties,
  onVisibleItemsChange,
  onVisibleAreaChange,
}: {
  mapProperties: SharedMapItem[];
  displayedProperties?: SharedMapItem[];
  onVisibleItemsChange?: (visibleIds: string[]) => void;
  onVisibleAreaChange?: (visibleIds: string[]) => void;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastVisibleKeyRef = useRef<string>("");

  const map = useMapEvents({
    moveend: () => scheduleUpdate(),
    zoomend: () => scheduleUpdate(),
  });

  const scheduleUpdate = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (!map) return;
      const bounds = map.getBounds();

      // 1. Calculate items in the visible area before subtype filter for real area counts
      const areaSource = displayedProperties || mapProperties;
      const areaVisibleIds = areaSource
        .filter((p) => {
          const coords = resolvePropertyMapCoords(p);
          const latLng = L.latLng(coords.lat, coords.lng);
          return bounds.contains(latLng);
        })
        .map((p) => p.id);

      onVisibleAreaChange?.(areaVisibleIds);

      // 2. Currently active filtered items in viewport
      const visibleIds = mapProperties
        .filter((p) => {
          const coords = resolvePropertyMapCoords(p);
          const latLng = L.latLng(coords.lat, coords.lng);
          return bounds.contains(latLng);
        })
        .map((p) => p.id);

      if (onVisibleItemsChange) {
        const nextKey = visibleIds.join(",");
        if (nextKey !== lastVisibleKeyRef.current) {
          lastVisibleKeyRef.current = nextKey;
          onVisibleItemsChange(visibleIds);
        }
      }
    }, 250);
  }, [map, mapProperties, displayedProperties, onVisibleItemsChange, onVisibleAreaChange]);

  // Initial trigger
  useEffect(() => {
    scheduleUpdate();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [scheduleUpdate]);

  return null;
}

export default function PropertyMap({
  filteredItems,
  userLocation: externalUserLocation,
  onVisibleItemsChange,
  containerHeight,
  entityTypeFilter,
  onEntityTypeFilterChange,
  counts,
  activeFilters,
  onFiltersChange,
}: PropertyMapProps = {}) {
  const router = useRouter();
  const { openProject } = useProjectOpenGuard();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("location") || searchParams.get("q") || searchParams.get("search") || "";
  const initialType = searchParams.get("type") || searchParams.get("category") || null;
  const initialBhk = searchParams.get("bhk") || null;
  const budgetParam = searchParams.get("budget");

  const parsedBudget = useMemo((): [number, number] | null => {
    if (!budgetParam) return null;
    const parts = budgetParam.split(",");
    if (parts.length === 2) {
      const min = parseInt(parts[0], 10);
      const max = parseInt(parts[1], 10);
      if (!isNaN(min) && !isNaN(max)) return [min, max];
    }
    return null;
  }, [budgetParam]);
  
  const properties = usePropertiesStore((state) => state.properties);
  const projects = useProjectsStore((state) => state.projects);
  const isLoading = usePropertiesStore((state) => state.isLoading);

  const defaultAllItems = useMemo((): SharedMapItem[] => {
    const propItems = properties.filter((p) => p.showOnMap !== false && p.status !== 'sold');
    const projItems: SharedMapItem[] = projects
      .filter((p) => p.isPublished !== false && p.location?.latitude && p.location?.longitude)
      .map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.name,
        price: p.configurations?.[0]?.priceMin || 0,
        propertyType: p.projectType || "Project",
        listingType: "project",
        status: "active",
        location: {
          address: p.location.address,
          locality: p.location.locality,
          city: p.location.city,
          state: p.location.state,
          latitude: p.location.latitude,
          longitude: p.location.longitude,
        },
        coverImage: p.coverImage,
        images: p.images?.map((img) => (typeof img === "string" ? img : img.url || "")) || [],
        showOnMap: true,
        builderName: p.builderName,
        _isProject: true,
        _originalProjectData: p,
      }));
    return [...propItems, ...projItems];
  }, [properties, projects]);

  const mapProperties = useMemo(() => {
    if (filteredItems && Array.isArray(filteredItems)) {
      return filteredItems;
    }
    return defaultAllItems;
  }, [filteredItems, defaultAllItems]);

  const initialCenter = useMemo(() => {
    if (externalUserLocation) {
      return new L.LatLng(externalUserLocation.lat, externalUserLocation.lng);
    }
    if (initialQuery.trim()) {
      const qLower = initialQuery.toLowerCase().trim();
      for (const [key, b] of Object.entries(LOCALITY_BOUNDARIES)) {
        if (qLower.includes(key) || key.includes(qLower)) {
          return new L.LatLng(b.center[0], b.center[1]);
        }
      }
    }
    if (filteredItems && filteredItems.length > 0) {
      const firstWithCoords = filteredItems.find((p) => p.location?.latitude && p.location?.longitude);
      if (firstWithCoords) {
        return new L.LatLng(Number(firstWithCoords.location.latitude), Number(firstWithCoords.location.longitude));
      }
    }
    if (mapProperties.length > 0 && mapProperties[0].location?.latitude && mapProperties[0].location?.longitude) {
      return new L.LatLng(Number(mapProperties[0].location.latitude), Number(mapProperties[0].location.longitude));
    }
    return new L.LatLng(16.5062, 80.6480);
  }, [externalUserLocation, initialQuery, filteredItems, mapProperties]);

  const [position, setPosition] = useState<L.LatLng | null>(initialCenter);
  const [mapSearchInput, setMapSearchInput] = useState(initialQuery);
  
  // Keep position and map in sync if initialCenter or initialQuery changes
  useEffect(() => {
    setPosition(initialCenter);
    if (mapRef.current) {
      mapRef.current.flyTo(initialCenter, 13, { duration: 1 });
    }
  }, [initialCenter]);

  // Keep internal search input in sync with external query params
  useEffect(() => {
    setMapSearchInput(initialQuery);
  }, [initialQuery]);

  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [blinkingPropertyId, setBlinkingPropertyId] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [showMapExplorer, setShowMapExplorer] = useState(false);

  // Lock mobile body and document scroll when Map Explorer drawer is open
  useEffect(() => {
    if (showMapExplorer && typeof window !== "undefined" && window.innerWidth < 768) {
      const origHtmlOverflow = document.documentElement.style.overflow;
      const origBodyOverflow = document.body.style.overflow;
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
      return () => {
        document.documentElement.style.overflow = origHtmlOverflow;
        document.body.style.overflow = origBodyOverflow;
      };
    }
  }, [showMapExplorer]);

  const [mapLayerType, setMapLayerType] = useState<"streets" | "hybrid" | "terrain">("streets");
  
  // Price Heatmap Mode State
  const [showHeatmap, setShowHeatmap] = useState(false);
  // Show Landmarks Toggle State (Default OFF - only shows when enabled by user)
  const [showLandmarks, setShowLandmarks] = useState(false);

  // Master locations & sublocations from admin
  const { cities: adminCities, fetchLocations } = useLocationsStore();

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  // Selected Location (City) & Sublocation (Locality) in Map Explorer
  const [selectedMapCity, setSelectedMapCity] = useState<string | null>(() => {
    return activeFilters?.cities?.[0] || null;
  });
  const [selectedMapLocality, setSelectedMapLocality] = useState<string | null>(() => {
    return activeFilters?.localities?.[0] || null;
  });
  const [localitySearchText, setLocalitySearchText] = useState<string>("");

  // Sync with activeFilters from top filter box
  useEffect(() => {
    if (activeFilters) {
      const topCity = activeFilters.cities?.[0] || null;
      const topLoc = activeFilters.localities?.[0] || null;
      setSelectedMapCity((prev) => (prev !== topCity ? topCity : prev));
      setSelectedMapLocality((prev) => (prev !== topLoc ? topLoc : prev));
    }
  }, [activeFilters?.cities, activeFilters?.localities]);

  // Price Range Slider State in Map Explorer [minPrice, maxPrice]
  const [mapPriceRange, setMapPriceRange] = useState<[number, number]>(() => {
    if (activeFilters?.budget) return activeFilters.budget;
    if (parsedBudget) return parsedBudget;
    return [0, 100000000];
  });

  useEffect(() => {
    if (activeFilters?.budget) {
      setMapPriceRange((prev) => {
        if (prev[0] !== activeFilters.budget[0] || prev[1] !== activeFilters.budget[1]) {
          return activeFilters.budget;
        }
        return prev;
      });
    } else if (parsedBudget) {
      setMapPriceRange(parsedBudget);
    }
  }, [activeFilters?.budget, parsedBudget]);

  const handleBudgetSelect = useCallback((range: [number, number]) => {
    setMapPriceRange(range);
    if (onFiltersChange) {
      onFiltersChange((prev) => ({
        ...prev,
        budget: range,
      }));
    }
  }, [onFiltersChange]);

  const flyToLocation = useCallback((cityName: string) => {
    if (!mapRef.current) return;
    const qLower = cityName.toLowerCase().trim();
    if (qLower.includes("vijayawada")) {
      mapRef.current.flyTo([16.5062, 80.6480], 12, { duration: 1.2 });
      return;
    }
    if (qLower.includes("guntur")) {
      mapRef.current.flyTo([16.3067, 80.4365], 12, { duration: 1.2 });
      return;
    }
    if (qLower.includes("amaravati")) {
      mapRef.current.flyTo([16.5131, 80.5165], 12, { duration: 1.2 });
      return;
    }
    const match = mapProperties.find((p) => (p.location?.city || "").toLowerCase().includes(qLower));
    if (match) {
      const coords = resolvePropertyMapCoords(match);
      mapRef.current.flyTo([coords.lat, coords.lng], 12, { duration: 1.2 });
    }
  }, [mapProperties]);

  const flyToSublocation = useCallback((subName: string, parentCity?: string | null) => {
    if (!mapRef.current) return;
    const qLower = subName.toLowerCase().trim();

    if (LOCALITY_BOUNDARIES[qLower]) {
      const b = LOCALITY_BOUNDARIES[qLower];
      try {
        const poly = L.polygon(b.bounds);
        mapRef.current.fitBounds(poly.getBounds(), { padding: [40, 40], maxZoom: 15, duration: 1.2 });
        return;
      } catch {}
    }

    const quick = quickLocalityCoords.find((k) => k.name.toLowerCase() === qLower);
    if (quick) {
      mapRef.current.flyTo([quick.lat, quick.lng], 15, { duration: 1.2 });
      return;
    }

    const match = mapProperties.find((p) => {
      const pLoc = (p.location?.locality || "").toLowerCase();
      const pAddr = (p.location?.address || "").toLowerCase();
      return pLoc.includes(qLower) || pAddr.includes(qLower);
    });
    if (match) {
      const coords = resolvePropertyMapCoords(match);
      mapRef.current.flyTo([coords.lat, coords.lng], 15, { duration: 1.2 });
      return;
    }

    if (parentCity) {
      flyToLocation(parentCity);
    }
  }, [mapProperties, flyToLocation]);

  const handleSelectCity = useCallback((cityName: string | null) => {
    if (selectedMapCity === cityName || cityName === null) {
      setSelectedMapCity(null);
      setSelectedMapLocality(null);
      setLocalitySearchText("");
      if (onFiltersChange) {
        onFiltersChange((prev) => ({
          ...prev,
          cities: [],
          localities: [],
          query: "",
        }));
      }
    } else {
      setSelectedMapCity(cityName);
      setSelectedMapLocality(null);
      setLocalitySearchText("");
      flyToLocation(cityName);
      if (onFiltersChange) {
        onFiltersChange((prev) => ({
          ...prev,
          cities: [cityName],
          localities: [],
          query: "",
        }));
      }
    }
  }, [selectedMapCity, flyToLocation, onFiltersChange]);

  const handleSelectLocality = useCallback((subName: string) => {
    if (selectedMapLocality?.toLowerCase() === subName.toLowerCase()) {
      setSelectedMapLocality(null);
      if (onFiltersChange) {
        onFiltersChange((prev) => ({
          ...prev,
          localities: [],
        }));
      }
    } else {
      setSelectedMapLocality(subName);
      flyToSublocation(subName, selectedMapCity);
      if (onFiltersChange) {
        onFiltersChange((prev) => {
          const parentCity = selectedMapCity || (adminCities.find((c) => c.sublocations?.some((s) => s.name.toLowerCase() === subName.toLowerCase()))?.name);
          return {
            ...prev,
            cities: parentCity ? [parentCity] : prev.cities,
            localities: [subName],
            query: "",
          };
        });
      }
    }
  }, [selectedMapLocality, selectedMapCity, flyToSublocation, onFiltersChange, adminCities]);

  // AP Stamp Duty Calculator Modal State
  const [showCalculatorModal, setShowCalculatorModal] = useState(false);
  const [calcPropertyPrice, setCalcPropertyPrice] = useState<number>(7500000);

  // Draw Polygon Area Search State
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawShapeType, setDrawShapeType] = useState<"freehand" | "circle" | "box">("freehand");
  const [drawPolygonPoints, setDrawPolygonPoints] = useState<L.LatLng[]>([]);
  const [internalUserLoc, setInternalUserLoc] = useState<{lat: number, lng: number} | null>(null);
  
  const activeUserLocation = externalUserLocation || internalUserLoc;

  const [showPropertiesTray, setShowPropertiesTray] = useState(false);
  const [mobileTrayCount, setMobileTrayCount] = useState<number>(12);
  const { toggleFavorite, isFavorite } = useFavoritesStore();

  // Realtor.com Map Controls State
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [searchAsMove, setSearchAsMove] = useState(true);
  const [showSearchThisArea, setShowSearchThisArea] = useState(false);
  const mapRef = useRef<L.Map | null>(null);

  // Map Data Layer (Realtor-style color overlays)
  const [mapDataLayer, setMapDataLayer] = useState<"none" | "hotness" | "dom" | "sqft" | "yearbuilt" | "neighborhood">("none");

  // Entity type pill filter on map (All / Properties / Projects)
  const [internalListingTypeFilter, setInternalListingTypeFilter] = useState<"all" | "properties" | "projects">("all");
  
  const listingTypeFilter = entityTypeFilter !== undefined ? entityTypeFilter : internalListingTypeFilter;

  const setListingTypeFilter = useCallback((newType: "all" | "properties" | "projects") => {
    setInternalListingTypeFilter(newType);
    if (onEntityTypeFilterChange) {
      onEntityTypeFilterChange(newType);
    }
  }, [onEntityTypeFilterChange]);

  // Property / Project Subtype filter state (e.g. "flats", "villas", "plots", "crda", etc.)
  const [selectedSubtype, setSelectedSubtype] = useState<string | null>(() => {
    if (activeFilters?.gatedCommunity) return "gated";
    if (activeFilters?.propertyType && activeFilters.propertyType.length > 0) {
      const pt = activeFilters.propertyType[0];
      if (pt === "apartment") return "flats";
      if (pt === "villa") return "villas";
      if (pt === "residential-land") return "plots";
      if (pt === "commercial-spaces") return "commercial";
      if (pt === "farmhouse") return "farmhouses";
    }
    return null;
  });

  // Sync subtype with activeFilters from top filter box
  useEffect(() => {
    if (activeFilters) {
      if (activeFilters.gatedCommunity) {
        setSelectedSubtype("gated");
      } else if (activeFilters.propertyType && activeFilters.propertyType.length > 0) {
        const pt = activeFilters.propertyType[0];
        if (pt === "apartment") setSelectedSubtype("flats");
        else if (pt === "villa") setSelectedSubtype("villas");
        else if (pt === "residential-land") setSelectedSubtype("plots");
        else if (pt === "commercial-spaces") setSelectedSubtype("commercial");
        else if (pt === "farmhouse") setSelectedSubtype("farmhouses");
      } else if (!activeFilters.gatedCommunity && (!activeFilters.propertyType || activeFilters.propertyType.length === 0)) {
        setSelectedSubtype(null);
      }
    }
  }, [activeFilters?.gatedCommunity, activeFilters?.propertyType]);

  const handleSubtypeSelect = useCallback((key: string) => {
    const isCurrent = selectedSubtype === key;
    const nextKey = isCurrent ? null : key;
    setSelectedSubtype(nextKey);

    if (onFiltersChange) {
      onFiltersChange((prev) => {
        let propType: string[] = [];
        let isGated = false;

        if (nextKey === "flats" || nextKey === "apartments") {
          propType = ["apartment"];
        } else if (nextKey === "villas") {
          propType = ["villa"];
        } else if (nextKey === "plots" || nextKey === "open_plots") {
          propType = ["residential-land"];
        } else if (nextKey === "commercial") {
          propType = ["commercial-spaces"];
        } else if (nextKey === "farmhouses") {
          propType = ["farmhouse"];
        } else if (nextKey === "gated" || nextKey === "gated_community") {
          isGated = true;
        }

        return {
          ...prev,
          propertyType: propType,
          gatedCommunity: isGated,
        };
      });
    }
  }, [selectedSubtype, onFiltersChange]);

  const handleResetType = useCallback(() => {
    setSelectedSubtype(null);
    if (onFiltersChange) {
      onFiltersChange((prev) => ({
        ...prev,
        propertyType: [],
        gatedCommunity: false,
      }));
    }
  }, [onFiltersChange]);

  // Reset subtype when user switches between All / Properties / Projects
  useEffect(() => {
    setSelectedSubtype(null);
  }, [listingTypeFilter]);

  // Track item IDs visible in current map viewport for real selected area counts
  const [visibleAreaIds, setVisibleAreaIds] = useState<string[] | null>(null);

  // Active Locality Highlight Boundary (Dynamic for ANY searched or selected location!)
  const activeLocalityBoundary = useMemo(() => {
    const term = selectedMapLocality || selectedMapCity || mapSearchInput;
    if (!term.trim()) return null;
    return getDynamicLocalityBoundary(term, mapProperties);
  }, [selectedMapLocality, selectedMapCity, mapSearchInput, mapProperties]);

  // Fly map to locality boundary when detected or fit bounds to displayed properties
  useEffect(() => {
    if (!mapRef.current) return;
    if (activeLocalityBoundary) {
      try {
        const validBounds = activeLocalityBoundary.bounds.filter(
          (b) => b && Array.isArray(b) && b.length >= 2 && !isNaN(b[0]) && !isNaN(b[1]) && isFinite(b[0]) && isFinite(b[1])
        ) as L.LatLngExpression[];
        
        if (validBounds.length > 0) {
          const bounds = L.latLngBounds(validBounds);
          if (bounds.isValid()) {
            const size = mapRef.current.getSize();
            if (size.x > 100 && size.y > 100) {
              mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 15, animate: true, duration: 1.2 });
            } else if (size.x > 0 && size.y > 0) {
              mapRef.current.fitBounds(bounds, { padding: [0, 0], maxZoom: 15, animate: false });
            }
          }
        }
      } catch (e) {
        console.error("Invalid map bounds:", e, activeLocalityBoundary.bounds);
      }
    }
  }, [activeLocalityBoundary]);

  const displayedProperties = useMemo(() => {
    let source = filteredItems && Array.isArray(filteredItems) ? filteredItems : mapProperties;

    // Polygon Area Draw Filter
    if (drawPolygonPoints.length >= 3) {
      source = source.filter((p) => {
        const coords = resolvePropertyMapCoords(p);
        return isPointInPolygon(
          { lat: coords.lat, lng: coords.lng },
          drawPolygonPoints
        );
      });
    }

    // Location (City) filter from Map Explorer
    if (selectedMapCity) {
      const cityQ = selectedMapCity.toLowerCase().trim();
      source = source.filter((p) => {
        const pCity = (p.location?.city || "").toLowerCase();
        const pAddr = (p.location?.address || "").toLowerCase();
        return pCity.includes(cityQ) || pAddr.includes(cityQ);
      });
    }

    // Sublocation (Locality) filter from Map Explorer
    if (selectedMapLocality) {
      const locQ = selectedMapLocality.toLowerCase().trim();
      source = source.filter((p) => {
        const pLoc = (p.location?.locality || "").toLowerCase();
        const pAddr = (p.location?.address || "").toLowerCase();
        const pTitle = (p.title || "").toLowerCase();
        return pLoc.includes(locQ) || pAddr.includes(locQ) || pTitle.includes(locQ);
      });
    }

    // Price Range Slider Filter from Map Explorer
    if (mapPriceRange[0] > 0 || mapPriceRange[1] < 100000000) {
      source = source.filter((p) => {
        const price = Number(p.price || 0);
        if (price === 0) return true; // Price on request
        return price >= mapPriceRange[0] && price <= mapPriceRange[1];
      });
    } else if (parsedBudget && !filteredItems) {
      source = source.filter((p) => {
        const price = Number(p.price || 0);
        return price >= parsedBudget[0] && price <= parsedBudget[1];
      });
    }

    if (!mapSearchInput.trim()) {
      return source;
    }

    return source.filter((p) => checkPropertyMatchesQuery(p, mapSearchInput));
  }, [mapProperties, filteredItems, drawPolygonPoints, selectedMapCity, selectedMapLocality, mapPriceRange, parsedBudget, mapSearchInput]);

  // Only locations selected on Home page (isHeroPill === true)
  const homeCities = useMemo(() => {
    const pills = adminCities.filter((c) => c.isHeroPill);
    return pills.length > 0 ? pills : adminCities.slice(0, 3);
  }, [adminCities]);

  // Active sublocations based on selectedMapCity and homeCities
  const activeSublocations = useMemo(() => {
    if (selectedMapCity) {
      const cityObj = homeCities.find((c) => c.name.toLowerCase() === selectedMapCity.toLowerCase());
      return cityObj?.sublocations || [];
    }
    return homeCities.flatMap((c) => c.sublocations || []);
  }, [selectedMapCity, homeCities]);

  // Filtered sublocations by user search input
  const displayedSublocations = useMemo(() => {
    if (!localitySearchText.trim()) return activeSublocations;
    const q = localitySearchText.toLowerCase().trim();
    return activeSublocations.filter((sub) =>
      sub.name.toLowerCase().includes(q) || (sub.tagline && sub.tagline.toLowerCase().includes(q))
    );
  }, [activeSublocations, localitySearchText]);

  // Count matching properties in this sublocation
  const getSublocationPropertyCount = useCallback((subName: string) => {
    const q = subName.toLowerCase().trim();
    return displayedProperties.filter((p) => {
      const pLoc = (p.location?.locality || "").toLowerCase();
      const pAddr = (p.location?.address || "").toLowerCase();
      const pTitle = (p.title || "").toLowerCase();
      return pLoc.includes(q) || pAddr.includes(q) || pTitle.includes(q);
    }).length;
  }, [displayedProperties]);

  const selectedProperty = useMemo(() => {
    return displayedProperties.find((p) => p.id === selectedPropertyId);
  }, [displayedProperties, selectedPropertyId]);


  // Entity type filter & subtype filter applied on top of displayedProperties
  const displayedPropertiesFiltered = useMemo(() => {
    let list = displayedProperties;
    if (listingTypeFilter === "properties") list = list.filter((p: any) => !p._isProject);
    else if (listingTypeFilter === "projects") list = list.filter((p: any) => Boolean(p._isProject));

    if (selectedSubtype) {
      list = list.filter((p) => itemMatchesSubtype(p, selectedSubtype));
    }
    return list;
  }, [displayedProperties, listingTypeFilter, selectedSubtype]);

  const fallbackPropCount = useMemo(() => displayedProperties.filter((p: any) => !p._isProject).length, [displayedProperties]);
  const fallbackProjCount = useMemo(() => displayedProperties.filter((p: any) => Boolean(p._isProject)).length, [displayedProperties]);

  const allCount = counts ? counts.all : displayedProperties.length;
  const propertiesCount = counts ? counts.properties : fallbackPropCount;
  const projectsCount = counts ? counts.projects : fallbackProjCount;

  // Real synchronized active count for the "Show On Map" header
  const currentActiveCount = useMemo(() => {
    if (selectedSubtype) {
      return displayedPropertiesFiltered.length;
    }
    if (listingTypeFilter === "properties") return propertiesCount;
    if (listingTypeFilter === "projects") return projectsCount;
    return allCount;
  }, [selectedSubtype, displayedPropertiesFiltered.length, listingTypeFilter, propertiesCount, projectsCount, allCount]);

  // Options for Property / Project Type Boxes with live counts from the selected/visible map area
  const currentTypeOptions = useMemo(() => {
    let areaFiltered = displayedProperties;
    if (visibleAreaIds !== null && visibleAreaIds.length > 0) {
      const areaSet = new Set(visibleAreaIds);
      areaFiltered = areaFiltered.filter((p) => areaSet.has(p.id));
    }

    const baseItems = listingTypeFilter === "properties" 
      ? areaFiltered.filter((p: any) => !p._isProject)
      : listingTypeFilter === "projects"
      ? areaFiltered.filter((p: any) => Boolean(p._isProject))
      : areaFiltered;

    if (listingTypeFilter === "properties") {
      return [
        { key: "flats", label: "Flats", icon: Building2, count: baseItems.filter((p) => itemMatchesSubtype(p, "flats")).length },
        { key: "houses", label: "Houses", icon: Home, count: baseItems.filter((p) => itemMatchesSubtype(p, "houses")).length },
        { key: "villas", label: "Villas", icon: Sparkles, count: baseItems.filter((p) => itemMatchesSubtype(p, "villas")).length },
        { key: "plots", label: "Plots", icon: Compass, count: baseItems.filter((p) => itemMatchesSubtype(p, "plots")).length },
        { key: "agriculture", label: "Agriculture", icon: Trees, count: baseItems.filter((p) => itemMatchesSubtype(p, "agriculture")).length },
        { key: "commercial", label: "Commercial", icon: Briefcase, count: baseItems.filter((p) => itemMatchesSubtype(p, "commercial")).length },
      ];
    }

    if (listingTypeFilter === "projects") {
      return [
        { key: "apartments", label: "Apartments", icon: Building2, count: baseItems.filter((p) => itemMatchesSubtype(p, "apartments")).length },
        { key: "villas", label: "Villas", icon: Sparkles, count: baseItems.filter((p) => itemMatchesSubtype(p, "villas")).length },
        { key: "crda", label: "CRDA Ventures", icon: Landmark, count: baseItems.filter((p) => itemMatchesSubtype(p, "crda")).length },
        { key: "gated", label: "Gated Comm.", icon: ShieldCheck, count: baseItems.filter((p) => itemMatchesSubtype(p, "gated")).length },
        { key: "commercial", label: "Commercial", icon: Briefcase, count: baseItems.filter((p) => itemMatchesSubtype(p, "commercial")).length },
      ];
    }

    return [
      { key: "flats", label: "Flats", icon: Building2, count: baseItems.filter((p) => itemMatchesSubtype(p, "flats")).length },
      { key: "houses", label: "Houses", icon: Home, count: baseItems.filter((p) => itemMatchesSubtype(p, "houses")).length },
      { key: "villas", label: "Villas", icon: Sparkles, count: baseItems.filter((p) => itemMatchesSubtype(p, "villas")).length },
      { key: "plots", label: "Plots", icon: Compass, count: baseItems.filter((p) => itemMatchesSubtype(p, "plots")).length },
      { key: "crda", label: "CRDA Ventures", icon: Landmark, count: baseItems.filter((p) => itemMatchesSubtype(p, "crda")).length },
      { key: "gated", label: "Gated Comm.", icon: ShieldCheck, count: baseItems.filter((p) => itemMatchesSubtype(p, "gated")).length },
      { key: "agriculture", label: "Agriculture", icon: Trees, count: baseItems.filter((p) => itemMatchesSubtype(p, "agriculture")).length },
      { key: "commercial", label: "Commercial", icon: Briefcase, count: baseItems.filter((p) => itemMatchesSubtype(p, "commercial")).length },
    ];
  }, [listingTypeFilter, displayedProperties, visibleAreaIds]);

  // Color for data layer price pills
  const getDataLayerColor = useCallback((property: any): string | null => {
    if (mapDataLayer === "none") return null;
    if (mapDataLayer === "hotness") {
      if (property.price > 10000000) return "#EF4444";
      if (property.price > 5000000) return "#F97316";
      if (property.price > 2000000) return "#EAB308";
      return "#22C55E";
    }
    if (mapDataLayer === "dom") {
      const hash = (property.id || "").charCodeAt(0);
      const dom = (hash % 90) + 1;
      if (dom < 15) return "#22C55E";
      if (dom < 30) return "#EAB308";
      if (dom < 60) return "#F97316";
      return "#EF4444";
    }
    if (mapDataLayer === "sqft") {
      const sqft = property.price / (property.area || 1000);
      if (sqft > 8000) return "#EF4444";
      if (sqft > 5000) return "#F97316";
      if (sqft > 3000) return "#EAB308";
      return "#22C55E";
    }
    if (mapDataLayer === "yearbuilt") {
      const year = property.yearBuilt || 2015;
      if (year >= 2022) return "#22C55E";
      if (year >= 2018) return "#3B82F6";
      if (year >= 2010) return "#EAB308";
      return "#EF4444";
    }
    return null;
  }, [mapDataLayer]);

  // Map move handler for "Search this area"
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const handleMove = () => {
      if (!searchAsMove) setShowSearchThisArea(true);
      else setShowSearchThisArea(false);
    };
    map.on("moveend", handleMove);
    return () => { map.off("moveend", handleMove); };
  }, [searchAsMove]);

  const handleSearchChange = (val: string) => {
    setMapSearchInput(val);
    if (!val.trim()) return;

    // Check Reference ID Match (e.g. ref345, REF345)
    const refMatch = findPropertyByRefId(val, mapProperties);
    if (refMatch) {
      setSelectedPropertyId(refMatch.id);
      const loc = refMatch.location;
      if (loc && typeof loc.latitude === "number" && typeof loc.longitude === "number") {
        const newPos = new L.LatLng(loc.latitude, loc.longitude);
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

  const handleDrawStart = (point: L.LatLng) => {
    setDrawPolygonPoints([point]);
  };

  const handleDrawMove = (point: L.LatLng) => {
    setDrawPolygonPoints((prev) => {
      if (prev.length === 0) return [point];

      if (drawShapeType === "freehand") {
        const last = prev[prev.length - 1];
        const distSq = (last.lat - point.lat) ** 2 + (last.lng - point.lng) ** 2;
        if (distSq > 0.00000000001) {
          return [...prev, point];
        }
        return prev;
      }

      if (drawShapeType === "box") {
        const start = prev[0];
        return [
          start,
          new L.LatLng(start.lat, point.lng),
          point,
          new L.LatLng(point.lat, start.lng),
        ];
      }

      if (drawShapeType === "circle") {
        const start = prev[0];
        const radiusDeg = Math.sqrt((start.lat - point.lat) ** 2 + (start.lng - point.lng) ** 2);
        const points: L.LatLng[] = [];
        const numPoints = 32;
        for (let i = 0; i < numPoints; i++) {
          const angle = (i * 2 * Math.PI) / numPoints;
          const lat = start.lat + radiusDeg * Math.sin(angle);
          const lng = start.lng + radiusDeg * Math.cos(angle);
          points.push(new L.LatLng(lat, lng));
        }
        return points;
      }

      return prev;
    });
  };

  const handleDrawEnd = () => {
    setIsDrawing(false);
    if (drawPolygonPoints.length >= 3 && onVisibleItemsChange) {
      const filtered = displayedProperties.filter((p: any) => {
        const coords = resolvePropertyMapCoords(p);
        return isPointInPolygon({ lat: coords.lat, lng: coords.lng }, drawPolygonPoints);
      });
      onVisibleItemsChange(filtered.map((p: any) => p.id));
    }
  };

  const handleClearDraw = () => {
    setDrawPolygonPoints([]);
    setIsDrawing(false);
    if (mapRef.current && onVisibleItemsChange) {
      const bounds = mapRef.current.getBounds();
      const visible = mapProperties.filter((p: any) => {
        if (listingTypeFilter === "properties" && p._isProject) return false;
        if (listingTypeFilter === "projects" && !p._isProject) return false;
        const coords = resolvePropertyMapCoords(p);
        return bounds.contains(L.latLng(coords.lat, coords.lng));
      });
      onVisibleItemsChange(visible.map((p: any) => p.id));
    }
  };

  // AP Registration & Stamp Duty Calculations
  const stampDutyAmt = calcPropertyPrice * 0.05;
  const registrationAmt = calcPropertyPrice * 0.01;
  const transferDutyAmt = calcPropertyPrice * 0.015;
  const totalLegalFee = stampDutyAmt + registrationAmt + transferDutyAmt;
  const totalOnRoadPrice = calcPropertyPrice + totalLegalFee;

  const mapHeight = containerHeight !== undefined ? containerHeight : "100%";

  return (
    <div
      className="w-full h-full flex-1 flex flex-col touch-none relative min-h-0"
      style={{ touchAction: "none", height: mapHeight, minHeight: containerHeight ? 400 : "100%" }}
    >
      {/* Styles for Leaflet map are in globals.css */}

      {/* Main Container */}
      <div
        className="relative w-full h-full flex-1 flex flex-col md:flex-row gap-0 overflow-hidden bg-slate-900 shadow-xl touch-none min-h-0"
        style={{ touchAction: "none", height: mapHeight, minHeight: containerHeight ? 400 : "100%" }}
      >
        
        {/* Mobile Backdrop Overlay */}
        {showMapExplorer && (
          <div
            className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-xs z-[9998] transition-opacity duration-300 pointer-events-auto"
            onClick={() => setShowMapExplorer(false)}
          />
        )}

        {/* Sidebar Control Panel / Collapsible Drawer (Desktop side-panel & Mobile bottom sheet) */}
        <div
          className={cn(
            "text-slate-900 z-[9999] shadow-2xl flex flex-col transition-all duration-300 pointer-events-auto",
            // Desktop: sleek left sidebar panel with clean white background and light border
            "md:relative md:w-96 md:flex-shrink-0 md:h-full md:border-r md:border-slate-200 md:bg-white md:overflow-hidden",
            // Mobile: modern bottom drawer modal with rounded top in clean white, overflow-hidden prevents any bleed
            "fixed inset-x-0 bottom-0 max-h-[85vh] rounded-t-3xl border-t border-slate-200 bg-white shadow-2xl overflow-hidden",
            showMapExplorer ? "flex animate-in slide-in-from-bottom duration-300 md:animate-none" : "hidden"
          )}
        >
          {/* 1. PERMANENT TOP HEADER - Fixed at top of drawer, never scrolls, zero gap */}
          <div className="bg-white border-b border-slate-100 px-4 sm:px-6 pt-3 pb-3 shrink-0 select-none">
            {/* Mobile pull handle */}
            <div
              onClick={() => setShowMapExplorer(false)}
              className="w-10 h-1 bg-slate-300 hover:bg-slate-400 rounded-full mx-auto mb-2.5 md:hidden cursor-pointer shrink-0 transition-colors"
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shadow-xs">
                  <Compass className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <h2 className="font-heading text-base sm:text-lg font-black text-slate-950 tracking-tight leading-tight">
                    Map Explorer
                  </h2>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Live Vijayawada & AP Map Radar
                  </p>
                </div>
              </div>

              {/* Clean Circular Close Button */}
              <button
                type="button"
                onClick={() => setShowMapExplorer(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-500 hover:text-slate-900 transition-all flex items-center justify-center cursor-pointer border border-slate-200/80 shadow-xs shrink-0"
                title="Close Map Explorer"
                aria-label="Close Map Explorer"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* 2. SCROLLABLE BODY - Content scrolls strictly below header with zero bleed */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 overscroll-contain touch-pan-y no-scrollbar">

            {/* Entity Type Filter Buttons (All, Properties, Projects) */}
            <div className="space-y-1.5 shrink-0">
              <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-slate-500 px-0.5">
                <span>Show On Map</span>
                <span className="text-amber-600 font-bold">{currentActiveCount} Active</span>
              </div>
              <div className="grid grid-cols-[0.85fr_1.35fr_1.1fr] p-1 bg-slate-100/90 border border-slate-200 rounded-2xl gap-1 shadow-inner">
                <button
                  type="button"
                  onClick={() => setListingTypeFilter("all")}
                  className={cn(
                    "h-9 px-1.5 rounded-xl text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer select-none",
                    listingTypeFilter === "all"
                      ? "bg-amber-500 text-slate-950 shadow-xs"
                      : "text-slate-600 hover:text-slate-950 hover:bg-white"
                  )}
                >
                  <Layers className={cn("w-3.5 h-3.5 shrink-0", listingTypeFilter === "all" ? "text-slate-950" : "text-amber-600")} />
                  <span className="whitespace-nowrap">All</span>
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold shrink-0 transition-colors",
                    listingTypeFilter === "all"
                      ? "bg-slate-950 text-amber-400 font-bold shadow-xs"
                      : "bg-white text-slate-600 border border-slate-200"
                  )}>
                    {allCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setListingTypeFilter("properties")}
                  className={cn(
                    "h-9 px-1.5 rounded-xl text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer select-none",
                    listingTypeFilter === "properties"
                      ? "bg-amber-500 text-slate-950 shadow-xs"
                      : "text-slate-600 hover:text-slate-950 hover:bg-white"
                  )}
                >
                  <Home className={cn("w-3.5 h-3.5 shrink-0", listingTypeFilter === "properties" ? "text-slate-950" : "text-blue-600")} />
                  <span className="whitespace-nowrap">Properties</span>
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold shrink-0 transition-colors",
                    listingTypeFilter === "properties"
                      ? "bg-slate-950 text-amber-400 font-bold shadow-xs"
                      : "bg-white text-slate-600 border border-slate-200"
                  )}>
                    {propertiesCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setListingTypeFilter("projects")}
                  className={cn(
                    "h-9 px-1.5 rounded-xl text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer select-none",
                    listingTypeFilter === "projects"
                      ? "bg-amber-500 text-slate-950 shadow-xs"
                      : "text-slate-600 hover:text-slate-950 hover:bg-white"
                  )}
                >
                  <Building2 className={cn("w-3.5 h-3.5 shrink-0", listingTypeFilter === "projects" ? "text-slate-950" : "text-emerald-600")} />
                  <span className="whitespace-nowrap">Projects</span>
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold shrink-0 transition-colors",
                    listingTypeFilter === "projects"
                      ? "bg-slate-950 text-amber-400 font-bold shadow-xs"
                      : "bg-white text-slate-600 border border-slate-200"
                  )}>
                    {projectsCount}
                  </span>
                </button>
              </div>
            </div>

            {/* PROPERTY & PROJECT TYPES */}
            <div className="bg-slate-50/90 p-3 rounded-2xl border border-slate-200 space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  {listingTypeFilter === "properties" 
                    ? "Property Types" 
                    : listingTypeFilter === "projects" 
                    ? "Project Categories" 
                    : "Property & Project Types"}
                </span>
                {selectedSubtype && (
                  <button
                    type="button"
                    onClick={handleResetType}
                    className="text-[10px] font-bold text-amber-600 hover:text-amber-700 underline cursor-pointer"
                  >
                    Reset Type
                  </button>
                )}
              </div>

              {/* Grid of Boxes with Icons - Full text fully visible with stacked layout */}
              <div className="grid grid-cols-2 gap-2">
                {currentTypeOptions.map((opt) => {
                  const IconComp = opt.icon;
                  const isSelected = selectedSubtype === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => handleSubtypeSelect(opt.key)}
                      className={cn(
                        "p-2.5 rounded-2xl border text-left flex flex-col justify-between gap-1.5 transition-all cursor-pointer group min-h-[64px]",
                        isSelected
                          ? "bg-amber-500 text-slate-950 border-amber-500 shadow-md shadow-amber-500/25 scale-[1.02] font-black"
                          : "bg-white border-slate-200 text-slate-800 hover:border-amber-400 hover:bg-amber-50/40 hover:text-slate-950 shadow-xs"
                      )}
                    >
                      {/* Top row: Icon on left, count on right */}
                      <div className="flex items-center justify-between w-full">
                        <div className={cn(
                          "w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                          isSelected ? "bg-slate-950/20 text-slate-950" : "bg-amber-500/15 text-amber-600 group-hover:bg-amber-500/25"
                        )}>
                          <IconComp className="w-3.5 h-3.5" />
                        </div>
                        <span className={cn(
                          "text-[10px] font-mono px-2 py-0.5 rounded-full font-bold",
                          isSelected ? "bg-slate-950/20 text-slate-950" : "bg-slate-100 text-slate-600 border border-slate-200"
                        )}>
                          {opt.count}
                        </span>
                      </div>

                      {/* Bottom row: Full label with zero truncation */}
                      <span className={cn(
                        "text-xs font-extrabold tracking-tight leading-snug break-words",
                        isSelected ? "text-slate-950 font-black" : "text-slate-900"
                      )}>
                        {opt.label}
                      </span>
                    </button>
                  );
                })}
              </div>

            </div>

            {/* LOCATIONS & SUBLOCATIONS (Added by Admin) */}
            <div className="bg-slate-50/90 p-3 rounded-2xl border border-slate-200 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-600" /> Locations & Sublocations
                </span>
                {(selectedMapCity || selectedMapLocality) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMapCity(null);
                      setSelectedMapLocality(null);
                      setLocalitySearchText("");
                      if (onFiltersChange) {
                        onFiltersChange((prev) => ({
                          ...prev,
                          cities: [],
                          localities: [],
                          query: "",
                        }));
                      }
                    }}
                    className="text-[10px] font-bold text-amber-600 hover:text-amber-700 underline cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* 1. Locations (Cities) First */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block px-0.5">
                  Select Location:
                </label>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  <button
                    type="button"
                    onClick={() => handleSelectCity(null)}
                    className={cn(
                      "px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 border",
                      !selectedMapCity
                        ? "bg-amber-500 text-slate-950 border-amber-500 font-black shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-950 shadow-xs"
                    )}
                  >
                    All Locations
                  </button>
                  {homeCities.map((city) => {
                    const isSelected = selectedMapCity?.toLowerCase() === city.name.toLowerCase();
                    return (
                      <button
                        key={city.id}
                        type="button"
                        onClick={() => handleSelectCity(city.name)}
                        className={cn(
                          "px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 border flex items-center gap-1.5",
                          isSelected
                            ? "bg-amber-500 text-slate-950 border-amber-500 font-black shadow-xs"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-950 shadow-xs"
                        )}
                      >
                        <span>{city.name}</span>
                        {city.sublocations && city.sublocations.length > 0 && (
                          <span className={cn(
                            "text-[10px] font-mono px-1 rounded font-bold",
                            isSelected ? "bg-slate-950/25 text-slate-950" : "text-slate-500"
                          )}>
                            {city.sublocations.length}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Sublocations for Selected Location */}
              <div className="space-y-1.5 pt-1 border-t border-slate-200">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider px-0.5">
                  <span>{selectedMapCity ? `${selectedMapCity} Sublocations` : "Sublocations"}</span>
                  <span>{activeSublocations.length} areas</span>
                </div>

                {/* Sublocation search if many */}
                {activeSublocations.length > 6 && (
                  <div className="relative">
                    <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={localitySearchText}
                      onChange={(e) => setLocalitySearchText(e.target.value)}
                      placeholder={`Search ${selectedMapCity || "all"} areas...`}
                      className="w-full h-7 pl-7 pr-6 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-amber-500 shadow-xs"
                    />
                    {localitySearchText && (
                      <button
                        type="button"
                        onClick={() => setLocalitySearchText("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                )}

                {/* Sublocation Pills */}
                <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1 no-scrollbar">
                  {displayedSublocations.length > 0 ? (
                    displayedSublocations.map((sub) => {
                      const isSelected = selectedMapLocality?.toLowerCase() === sub.name.toLowerCase();
                      const count = getSublocationPropertyCount(sub.name);
                      return (
                        <button
                          key={sub.id || sub.name}
                          type="button"
                          onClick={() => handleSelectLocality(sub.name)}
                          className={cn(
                            "px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 border",
                            isSelected
                              ? "bg-amber-500 text-slate-950 border-amber-500 font-black shadow-xs shadow-amber-500/20"
                              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-950 shadow-xs"
                          )}
                        >
                          <span>{sub.name}</span>
                          {count > 0 && (
                            <span className={cn(
                              "text-[9px] font-mono px-1 rounded-full font-bold",
                              isSelected ? "bg-slate-950/20 text-slate-950" : "bg-slate-100 text-slate-500 border border-slate-200"
                            )}>
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    })
                  ) : (
                    <div className="text-[11px] text-slate-500 italic py-1 px-0.5">
                      No sublocations found matching &quot;{localitySearchText}&quot;
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* PRICE / BUDGET FILTER BUTTONS */}
            <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-2.5 shadow-xs">
              <div className="flex items-center justify-between mb-2 px-0.5">
                <div className="flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-xs font-bold text-slate-900">Price Budget</span>
                </div>
                {(mapPriceRange[0] > 0 || mapPriceRange[1] < 100000000) && (
                  <button
                    type="button"
                    onClick={() => handleBudgetSelect([0, 100000000])}
                    className="text-[10px] text-amber-600 hover:text-amber-700 font-semibold px-2 py-0.5 rounded-full hover:bg-amber-500/10 transition-colors"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Budget Buttons - All 5 in a single row */}
              <div className="grid grid-cols-5 gap-1 w-full">
                {[
                  { label: "All", range: [0, 100000000] as [number, number] },
                  { label: "< 50L", range: [0, 5000000] as [number, number] },
                  { label: "50L-1Cr", range: [5000000, 10000000] as [number, number] },
                  { label: "1Cr-2Cr", range: [10000000, 20000000] as [number, number] },
                  { label: "> 2Cr", range: [20000000, 100000000] as [number, number] },
                ].map((preset) => {
                  const isActive = mapPriceRange[0] === preset.range[0] && mapPriceRange[1] === preset.range[1];
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handleBudgetSelect(preset.range)}
                      className={cn(
                        "w-full py-1.5 px-0.5 rounded-xl text-[10px] sm:text-[10.5px] font-bold transition-all cursor-pointer text-center flex items-center justify-center whitespace-nowrap",
                        isActive
                          ? "bg-amber-500 text-slate-950 shadow-xs shadow-amber-500/20 font-black border border-amber-500"
                          : "bg-white text-slate-700 hover:text-slate-950 hover:bg-slate-100 border border-slate-200 shadow-xs"
                      )}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                handleGetLocation();
                setShowMapExplorer(false);
              }}
              disabled={isLocating}
              className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-extrabold text-sm rounded-2xl shadow-lg hover:shadow-amber-500/25 flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer disabled:opacity-75"
            >
              <Navigation className={`w-4 h-4 stroke-[2.5] ${isLocating ? "animate-spin" : ""}`} />
              <span>{isLocating ? "Detecting GPS..." : "Find My Location"}</span>
            </button>

            {/* DRAW SEARCH AREA TOOL PANEL */}
            <div className="bg-slate-50/90 p-3 rounded-2xl border border-slate-200 space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                  <Pencil className="w-4 h-4 text-amber-600" /> Draw Search Area
                </span>
                {drawPolygonPoints.length > 0 && (
                  <button
                    onClick={handleClearDraw}
                    className="text-[11px] text-red-600 hover:text-red-700 flex items-center gap-1 font-bold cursor-pointer"
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
                    setShowMapExplorer(false);
                  }}
                  className={`py-2 px-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    isDrawing
                      ? "bg-amber-500 text-slate-950 shadow-md animate-pulse"
                      : "bg-white text-slate-800 hover:bg-slate-100 border border-slate-200 shadow-xs"
                  }`}
                >
                  <Pencil className="w-3.5 h-3.5 text-amber-600" />
                  <span>{isDrawing ? "Click Map..." : "Start Drawing"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearDraw}
                  disabled={drawPolygonPoints.length === 0}
                  className="py-2 px-2.5 rounded-xl text-xs font-bold bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 disabled:opacity-40 cursor-pointer shadow-xs"
                >
                  Reset Draw
                </button>
              </div>

              {drawPolygonPoints.length > 0 && (
                <div className="text-[11px] text-slate-700 bg-white p-2 rounded-xl border border-amber-500/40 flex items-center justify-between shadow-xs">
                  <span>📍 {drawPolygonPoints.length} points placed</span>
                  <span className="font-extrabold text-amber-600">{displayedProperties.length} homes</span>
                </div>
              )}
            </div>

            {/* SHOW LANDMARKS TOGGLE */}
            <div className="bg-slate-50/90 p-3 rounded-2xl border border-slate-200 space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
                    <Landmark className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-slate-900">Show Landmarks</div>
                    <div className="text-[10px] text-slate-500">Temples, churches, hospitals & parks</div>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={showLandmarks}
                  onClick={() => setShowLandmarks((prev) => !prev)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    showLandmarks ? "bg-amber-500" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      showLandmarks ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
              {showLandmarks && (
                <div className="pt-1.5 text-[11px] text-slate-600 border-t border-slate-200/70 flex items-center justify-between">
                  <span className="font-bold text-amber-700">✨ {landmarkOverlays.length} Landmarks Visible</span>
                  <span className="text-[10px] text-slate-400">Tap pins to inspect</span>
                </div>
              )}
            </div>

            {/* Selected Property Distance Display Card */}
            {selectedProperty && position && (
              <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3 text-xs space-y-1.5 animate-in fade-in shadow-xs">
                <div className="flex items-center gap-1.5 text-amber-700 font-extrabold">
                  <Route className="w-4 h-4 text-amber-600" /> Live Route Distance:
                </div>
                <div className="font-bold text-slate-950 text-sm truncate">
                  {selectedProperty.title}
                </div>
                <div className="flex items-center justify-between text-slate-700 pt-0.5">
                  <span className="flex items-center gap-1">
                    <Car className="w-3.5 h-3.5 text-amber-600" /> Distance:
                  </span>
                  <span className="font-black text-slate-950 bg-white px-2 py-0.5 rounded-md border border-amber-300 shadow-xs">
                    {calculateDistanceStr(position, selectedProperty.location?.latitude ?? 0, selectedProperty.location?.longitude ?? 0)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* The Leaflet Map Canvas Container */}
        <div
          className="flex-1 relative bg-slate-950 touch-none"
          style={{ touchAction: "none", position: "relative", minHeight: 300 }}
        >
          
          {/* Open Map Explorer Button (When Closed) - top-left on mobile, bottom-left above zoom on desktop */}
          {!showMapExplorer && (
            <button
              onClick={() => {
                setShowMapExplorer(true);
                setShowPropertiesTray(false);
              }}
              className="absolute top-3 left-3 md:bottom-[140px] md:top-auto md:left-3 z-[500] bg-white/95 backdrop-blur-sm text-slate-900 p-2 sm:px-3 sm:py-2 rounded-xl shadow-lg border border-slate-200 flex items-center gap-1.5 hover:bg-slate-50 transition-colors pointer-events-auto cursor-pointer"
            >
              <Compass className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
              <span className="font-bold text-xs sm:text-sm text-slate-950 hidden sm:block shadow-xs">Map Explorer</span>
            </button>
          )}
          
          {/* TOP: Entity Type Pills (All / Properties / Projects) - Centered on mobile only, hidden on desktop */}
          <div className={cn("absolute top-3 left-1/2 -translate-x-1/2 z-[550] items-center gap-1 sm:gap-1.5 pointer-events-auto md:hidden", showMapExplorer ? "hidden" : "flex")}>
            {(["all", "properties", "projects"] as const).map((lt) => (
              <button
                key={lt}
                onClick={() => setListingTypeFilter(lt)}
                className={cn(
                  "px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold shadow-lg border transition-all active:scale-95 cursor-pointer whitespace-nowrap",
                  listingTypeFilter === lt
                    ? "bg-[#f1a010] text-slate-950 border-[#f1a010]"
                    : "bg-white/95 dark:bg-slate-900/95 text-slate-700 dark:text-slate-100 border-slate-200 dark:border-slate-700 hover:border-[#f1a010]"
                )}
              >
                {lt === "all" ? "All" : lt === "properties" ? "Properties" : "Projects"}
              </button>
            ))}
          </div>

          {/* RIGHT SIDE CONTROLS: Layer switcher, Draw */}
          <div className={cn("absolute top-14 md:top-3 right-3 z-[550] flex-col items-center gap-2.5 pointer-events-auto", showMapExplorer ? "hidden md:flex" : "flex")}>

            {/* 1. MAP STYLE BUTTON — opens layer panel */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowLayerPanel(!showLayerPanel)}
                title="Map Style"
                className="relative w-14 h-14 sm:w-[60px] sm:h-[60px] rounded-2xl overflow-hidden shadow-xl border-2 border-white dark:border-slate-800 flex flex-col justify-end p-1 transition-all hover:scale-105 active:scale-95 cursor-pointer group shrink-0"
              >
                <img
                  src={
                    mapLayerType === "hybrid"
                      ? "https://images.unsplash.com/photo-1524661135-423995f22d0b?w=200&q=80"
                      : mapLayerType === "terrain"
                      ? "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=200&q=80"
                      : "https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?w=200&q=80"
                  }
                  alt="Map Style"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                <span className="relative z-10 text-[10px] sm:text-[11px] font-black text-white text-center leading-tight tracking-tight drop-shadow-md">
                  {mapLayerType === "hybrid" ? "Satellite" : mapLayerType === "terrain" ? "Terrain" : "Streets"}
                </span>
              </button>

              {/* 3-View Layer Panel */}
              {showLayerPanel && (
                <div className="absolute top-0 right-[70px] w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Map Style</span>
                  </div>
                  <div className="flex gap-2 p-2">
                    {([
                      { key: "streets", label: "Streets", img: "https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?w=200&q=80" },
                      { key: "hybrid", label: "Satellite", img: "https://images.unsplash.com/photo-1524661135-423995f22d0b?w=200&q=80" },
                      { key: "terrain", label: "Terrain", img: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=200&q=80" },
                    ] as const).map((layer) => (
                      <button
                        key={layer.key}
                        onClick={() => { setMapLayerType(layer.key); setShowLayerPanel(false); }}
                        className={cn(
                          "flex-1 flex flex-col items-center gap-1 rounded-xl p-1.5 border-2 transition-all cursor-pointer",
                          mapLayerType === layer.key
                            ? "border-[#f1a010] bg-amber-50 dark:bg-amber-950/30"
                            : "border-transparent hover:border-slate-300 dark:hover:border-slate-600"
                        )}
                      >
                        <div className="w-full h-12 rounded-lg overflow-hidden">
                          <img src={layer.img} alt={layer.label} className="w-full h-full object-cover" />
                        </div>
                        <span className={cn("text-[10px] font-bold", mapLayerType === layer.key ? "text-[#f1a010]" : "text-slate-600 dark:text-slate-300")}>{layer.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 2. DRAW BOUNDARY */}
            <button
              type="button"
              onClick={() => {
                if (drawPolygonPoints.length > 0) {
                  handleClearDraw();
                } else if (isDrawing) {
                  setIsDrawing(false);
                  setDrawPolygonPoints([]);
                } else {
                  setIsDrawing(true);
                  setShowLayerPanel(false);
                }
              }}
              title={drawPolygonPoints.length > 0 ? "Clear Drawn Area" : isDrawing ? "Cancel Drawing" : "Draw Custom Area"}
              className={cn(
                "w-14 h-14 sm:w-[60px] sm:h-[60px] rounded-2xl shadow-xl flex flex-col items-center justify-center gap-0.5 transition-all hover:scale-105 active:scale-95 cursor-pointer border shrink-0",
                drawPolygonPoints.length > 0
                  ? "bg-slate-950 text-white border-red-500 hover:bg-slate-900"
                  : isDrawing
                  ? "bg-[#f1a010] text-slate-950 border-amber-600 font-black animate-pulse"
                  : "bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-200/90 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
              )}
            >
              {drawPolygonPoints.length > 0 ? (
                <><X className="w-5 h-5 text-red-400" /><span className="text-[10px] font-extrabold leading-none text-red-400">Clear</span></>
              ) : isDrawing ? (
                <><X className="w-5 h-5 text-slate-950" /><span className="text-[10px] font-extrabold leading-none">Cancel</span></>
              ) : (
                <><Pencil className="w-5 h-5 text-slate-900 dark:text-white" /><span className="text-[10px] font-extrabold leading-none">Draw</span></>
              )}
            </button>
          </div>

          {/* FLOATING BOTTOM CENTER: Search This Area + Search As I Move */}
          <div
            className={cn(
              "absolute left-1/2 -translate-x-1/2 z-[520] flex-col items-center gap-2 pointer-events-auto transition-all duration-300",
              showMapExplorer ? "hidden md:flex" : "flex",
              showPropertiesTray ? "bottom-[340px] md:bottom-8" : "bottom-14 md:bottom-6"
            )}
          >
            {showSearchThisArea && (
              <button
                type="button"
                onClick={() => { setShowSearchThisArea(false); setMapSearchInput(mapSearchInput + ""); }}
                className="px-5 py-2.5 bg-slate-950/95 text-white rounded-full text-xs font-extrabold flex items-center gap-2 shadow-2xl border border-[#f1a010] animate-in fade-in slide-in-from-bottom-2 duration-200 hover:bg-[#f1a010] hover:text-slate-950 transition-all active:scale-95 cursor-pointer backdrop-blur-md"
              >
                <Search className="w-3.5 h-3.5" /> Search this area
              </button>
            )}
            <button
              type="button"
              onClick={() => setSearchAsMove(!searchAsMove)}
              className={cn(
                "px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-[11px] sm:text-xs font-extrabold flex items-center gap-2 transition-all shadow-xl border active:scale-95 cursor-pointer backdrop-blur-md",
                searchAsMove
                  ? "bg-slate-950/95 text-white border-[#f1a010]/80"
                  : "bg-white/95 text-slate-900 border-slate-300 dark:bg-slate-900/95 dark:text-white"
              )}
            >
              <div className={cn("w-2 h-2 rounded-full", searchAsMove ? "bg-[#f1a010] animate-pulse" : "bg-slate-400")} />
              <span>Search as I move</span>
            </button>
          </div>

          {/* REALTOR.COM AUTHENTIC FLOATING COUNT BADGE (TOP-LEFT) */}
          {drawPolygonPoints.length >= 3 && !isDrawing && (
            <div className="absolute top-4 left-4 z-[550] bg-slate-950/95 text-white border border-slate-800 backdrop-blur-xl px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
              <div>
                <div className="font-extrabold text-xs text-white">
                  Showing {displayedPropertiesFiltered.length} of {mapProperties.length} listings (Properties & Projects)
                </div>
                <div className="text-[10px] text-slate-400 font-medium">
                  Filtered by custom drawn boundary
                </div>
              </div>
              <button
                onClick={handleClearDraw}
                className="ml-1 p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                title="Clear Drawn Area"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* FLOATING BOTTOM FOUND PROPERTIES TRAY — mobile only, desktop has left list pane */}
          {displayedPropertiesFiltered.length > 0 && !isDrawing && !showMapExplorer && (
            <div className="md:hidden absolute bottom-3 left-2 right-2 sm:left-4 sm:right-4 z-[550] pointer-events-auto flex flex-col items-center gap-2">
              {/* TRAY TOGGLE CAPSULE BUTTON */}
              <button
                type="button"
                onClick={() => setShowPropertiesTray(!showPropertiesTray)}
                className="px-4 py-2 rounded-full bg-slate-950/95 text-white border-2 border-amber-500 shadow-2xl backdrop-blur-xl font-extrabold text-xs flex items-center gap-2 transition-all active:scale-95 cursor-pointer hover:bg-slate-900"
              >
                {(() => {
                  const hasProj = displayedPropertiesFiltered.some((p: any) => p._isProject);
                  const hasProp = displayedPropertiesFiltered.some((p: any) => !p._isProject);
                  const entityLabel = hasProj && hasProp
                    ? "Properties & Projects"
                    : hasProj
                    ? (displayedPropertiesFiltered.length === 1 ? "Project" : "Projects")
                    : (displayedPropertiesFiltered.length === 1 ? "Property" : "Properties");
                  return <span>{displayedPropertiesFiltered.length} {entityLabel} Found</span>;
                })()}
                {drawPolygonPoints.length >= 3 && (
                  <span className="bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded text-[10px] font-black">In Drawn Area</span>
                )}
                {!showPropertiesTray && (
                  <span className="animate-pulse text-amber-400 border-l border-slate-700 pl-2 ml-1 whitespace-nowrap">Tap to open</span>
                )}
                {showPropertiesTray ? <ChevronDown className="w-4 h-4 text-amber-400" /> : <ChevronUp className="w-4 h-4 text-amber-400" />}
              </button>

              {/* HORIZONTAL SCROLLABLE PROPERTY CARDS TRAY */}
              {showPropertiesTray && (
                <div className="w-full max-w-5xl bg-slate-950/95 border border-slate-800 rounded-3xl p-3 shadow-2xl backdrop-blur-2xl animate-in slide-in-from-bottom duration-300">
                  <div className="flex items-center justify-between px-2 pb-2 border-b border-slate-800/80 mb-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Found {displayedPropertiesFiltered.length > 0 && (displayedPropertiesFiltered[0] as any)?._isProject ? "Projects" : "Properties"} ({displayedPropertiesFiltered.length})</span>
                    </div>
                    <button
                      onClick={() => setShowPropertiesTray(false)}
                      title="Close Carousel"
                      className="px-3 py-1 rounded-xl bg-red-500/20 hover:bg-red-600 text-red-300 hover:text-white font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-red-500/40 shadow-sm shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Close</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1 touch-pan-x">
                  {isLoading ? (
                    <>
                      <MapCardSkeleton />
                      <MapCardSkeleton />
                      <MapCardSkeleton />
                    </>
                  ) : (
                    <>
                      {displayedPropertiesFiltered.slice(0, mobileTrayCount).map((prop) => {
                        const isSelected = selectedPropertyId === prop.id;
                        const coords = resolvePropertyMapCoords(prop);
                        const distStr = position && prop.location?.latitude && prop.location?.longitude
                          ? calculateDistanceStr(position, prop.location.latitude, prop.location.longitude)
                          : "";
                        
                        let allImages: string[] = [];
                        if (prop.images && Array.isArray(prop.images)) {
                           allImages = (prop.images as any[]).map((img: any) => typeof img === 'string' ? img : (img as any)?.url).filter(Boolean);
                        }
                        if (allImages.length === 0 && (prop as any).coverImage) {
                           allImages = [(prop as any).coverImage];
                        }
                        if (allImages.length === 0) {
                           allImages = ["https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80"];
                        }
                        
                        const propTypeLabel = (prop as any)._isProject ? "Project" : (prop.bedrooms ? `${prop.bedrooms} BHK` : prop.propertyType);

                        return (
                          <div
                            key={prop.id}
                            onClick={() => {
                              setSelectedPropertyId(prop.id);
                              if (mapRef.current) {
                                mapRef.current.setView([coords.lat, coords.lng], 17, { animate: true, duration: 1.2 });
                              }
                            }}
                            className={cn(
                              "w-72 sm:w-80 shrink-0 bg-slate-900 border rounded-2xl p-2.5 transition-all duration-200 cursor-pointer flex gap-3 group hover:border-[#f1a010]",
                              isSelected ? "border-[#f1a010] ring-2 ring-[#f1a010]/30 bg-slate-850 shadow-lg" : "border-slate-800"
                            )}
                          >
                            {/* Thumbnail Image Carousel */}
                            <MapCardImageCarousel images={allImages} title={prop.title || (prop as any).name || "Property"} propertyType={propTypeLabel} />

                            {/* Card Details */}
                            <div className="flex-1 min-w-0 flex flex-col justify-between">
                              <div>
                                <div className="text-[#f1a010] font-black text-sm tracking-tight leading-tight">
                                  {formatPriceCompact(prop.price)}
                                </div>
                                <h4 className="text-white font-bold text-xs truncate group-hover:text-[#f1a010] transition-colors mt-0.5">
                                  {prop.title}
                                </h4>
                                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                  📍 {prop.location?.locality || ""}, {prop.location?.city || ""}
                                </p>
                              </div>

                              <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[10px]">
                                {distStr ? (
                                  <span className="text-[#f1a010] font-extrabold flex items-center gap-1 truncate max-w-[90px]">
                                    <Navigation className="w-3 h-3 text-[#f1a010] shrink-0" /> {distStr}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-medium capitalize">{prop.listingType}</span>
                                )}

                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedPropertyId(prop.id);
                                      if (mapRef.current) {
                                        mapRef.current.setView([coords.lat, coords.lng], 17, { animate: true, duration: 1.2 });
                                      }
                                      setBlinkingPropertyId(prop.id);
                                      setTimeout(() => setBlinkingPropertyId(null), 4000);
                                    }}
                                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white font-bold text-[10px] rounded-lg flex items-center gap-1 transition-all border border-slate-700 hover:border-[#f1a010]/50"
                                  >
                                    <MapPin className="w-3 h-3 text-[#f1a010]" />
                                    <span>View on Map</span>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if ((prop as any)._isProject) {
                                        openProject(prop, e);
                                      } else {
                                        router.push(`/properties/${prop.slug || prop.id}`);
                                      }
                                    }}
                                    className="px-2.5 py-1 bg-[#f1a010] hover:bg-[#d88c0a] text-slate-950 font-black text-[10px] rounded-lg flex items-center gap-0.5 transition-all shadow-xs cursor-pointer"
                                  >
                                    <span>View</span>
                                    <ArrowRight className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Load More Tile in Mobile Tray */}
                      {displayedPropertiesFiltered.length > mobileTrayCount && (
                        <button
                          type="button"
                          onClick={() => setMobileTrayCount((prev) => prev + 12)}
                          className="w-44 shrink-0 bg-slate-900 border-2 border-dashed border-[#f1a010]/50 hover:border-[#f1a010] rounded-2xl p-4 flex flex-col items-center justify-center gap-2 text-center group cursor-pointer transition-all active:scale-95"
                        >
                          <div className="w-9 h-9 rounded-full bg-amber-500/10 text-[#f1a010] flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Plus className="w-5 h-5" />
                          </div>
                          <span className="font-extrabold text-xs text-white">Load More</span>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            +{Math.min(12, displayedPropertiesFiltered.length - mobileTrayCount)} more
                          </span>
                        </button>
                      )}
                    </>
                  )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* FLOATING ZOOM + MY LOCATION CONTROLS (BOTTOM-RIGHT) */}
          <div
            className={cn(
              "absolute right-3 md:right-4 z-[500] flex-col gap-1.5 pointer-events-auto transition-all duration-300",
              showMapExplorer ? "hidden md:flex" : "flex",
              showPropertiesTray ? "bottom-[340px] md:bottom-8" : "bottom-16 md:bottom-8"
            )}
          >
            <button
              type="button"
              onClick={handleGetLocation}
              disabled={isLocating}
              title="My Location"
              className="w-10 h-10 md:w-9 md:h-9 rounded-xl bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 shadow-xl flex items-center justify-center hover:bg-[#f1a010] hover:text-slate-950 hover:border-[#f1a010] transition-all active:scale-95 cursor-pointer mb-1 disabled:opacity-60 backdrop-blur-md"
            >
              <Navigation className={`w-4 h-4 md:w-4 md:h-4 ${isLocating ? "animate-spin text-[#f1a010]" : ""}`} />
            </button>
            <button
              type="button"
              onClick={() => mapRef.current?.zoomIn()}
              title="Zoom In"
              className="w-10 h-10 md:w-9 md:h-9 rounded-t-xl rounded-b-none bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-white border border-b-0 border-slate-200 dark:border-slate-700 shadow-xl flex items-center justify-center font-black text-lg hover:bg-[#f1a010] hover:text-slate-950 transition-all active:scale-95 cursor-pointer backdrop-blur-md select-none"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => mapRef.current?.zoomOut()}
              title="Zoom Out"
              className="w-10 h-10 md:w-9 md:h-9 rounded-b-xl rounded-t-none bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 shadow-xl flex items-center justify-center font-black text-lg hover:bg-[#f1a010] hover:text-slate-950 transition-all active:scale-95 cursor-pointer backdrop-blur-md select-none"
            >
              −
            </button>
          </div>

          <MapContainer
            ref={mapRef}
            center={position ? [position.lat, position.lng] : [16.5062, 80.6480]}
            zoom={12}
            maxZoom={18}
            preferCanvas={true}
            zoomControl={false}
            scrollWheelZoom={false}
            dragging={true}
            touchZoom={true}
            doubleClickZoom={true}
            bounceAtZoomLimits={false}
            inertia={true}
            inertiaDeceleration={3000}
            inertiaMaxSpeed={1500}
            easeLinearity={0.2}
            className="w-full touch-none select-none"
            style={{ touchAction: "none", position: "absolute", inset: 0, height: "100%", width: "100%", overscrollBehavior: "contain" }}
          >
            {/* Must be first child — forces Leaflet to re-measure container & load tiles */}
            <MapInvalidator />

            <FreehandDrawListener
              isDrawing={isDrawing}
              onDrawStart={handleDrawStart}
              onDrawMove={handleDrawMove}
              onDrawEnd={handleDrawEnd}
            />

            {/* Realtor-style: update list panel whenever map viewport changes */}
            <MapViewportListenerDebounced
              mapProperties={displayedProperties}
              displayedProperties={displayedProperties}
              onVisibleItemsChange={onVisibleItemsChange}
              onVisibleAreaChange={setVisibleAreaIds}
            />


            {mapLayerType === "streets" ? (
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url={
                  process.env.NEXT_PUBLIC_MAP_TILE_URL ||
                  (process.env.NEXT_PUBLIC_CARTO_API_KEY
                    ? `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?api_key=${process.env.NEXT_PUBLIC_CARTO_API_KEY}`
                    : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png")
                }
                maxNativeZoom={19}
                maxZoom={20}
                updateWhenIdle={true}
                keepBuffer={4}
              />
            ) : mapLayerType === "terrain" ? (
              <TileLayer
                attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
                maxNativeZoom={18}
                maxZoom={19}
                updateWhenIdle={true}
                keepBuffer={4}
              />
            ) : (
              <>
                <TileLayer
                  attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  maxNativeZoom={18}
                  maxZoom={19}
                  updateWhenIdle={true}
                  keepBuffer={4}
                />
                {/* Place names labels overlay on satellite */}
                <TileLayer
                  attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                  url={
                    process.env.NEXT_PUBLIC_CARTO_API_KEY
                      ? `https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png?api_key=${process.env.NEXT_PUBLIC_CARTO_API_KEY}`
                      : "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                  }
                  maxNativeZoom={19}
                  maxZoom={20}
                  opacity={0.9}
                  updateWhenIdle={true}
                  keepBuffer={4}
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

            {/* INTERACTIVE LANDMARKS & PUBLIC PLACES (Temples, Churches, Hospitals, Parks, Schools, Transit) */}
            {showLandmarks &&
              landmarkOverlays.map((landmark) => {
                const icon = getLandmarkIcon(landmark.type, landmark.name);
                return (
                  <Marker
                    key={landmark.id}
                    position={[landmark.lat, landmark.lng]}
                    icon={icon}
                  >
                    <Popup className="landmark-map-popup">
                      <div className="p-2 text-xs space-y-1 min-w-[180px]">
                        <div className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                          <span>
                            {landmark.type === "temple" ? "🛕" :
                             landmark.type === "church" ? "⛪" :
                             landmark.type === "hospital" ? "🏥" :
                             landmark.type === "park" ? "🌳" :
                             landmark.type === "school" ? "🏫" : "⚡"}
                          </span>
                          <span>{landmark.name}</span>
                        </div>
                        <div className="text-amber-600 font-semibold text-xs">{landmark.tag}</div>
                        <div className="text-[11px] text-slate-500 capitalize">Category: {landmark.type}</div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}


            {/* Render Searched Locality Highlight Boundary (Auto Nagar, Benz Circle, Poranki, etc.) */}
            {activeLocalityBoundary && (
              <Polygon
                positions={activeLocalityBoundary.bounds}
                pathOptions={{
                  color: "#3B82F6",
                  fillColor: "#3B82F6",
                  fillOpacity: 0.18,
                  weight: 3,
                  dashArray: "8, 8",
                }}
              />
            )}

            {/* Active Sketching Polyline (Follows Finger Smoothly without closing wedge) */}
            {isDrawing && drawPolygonPoints.length > 0 && (
              <Polyline
                positions={drawPolygonPoints}
                pathOptions={{
                  color: "#EF4444",
                  weight: 3.5,
                  opacity: 0.95,
                }}
              />
            )}

            {/* Render Completed Drawn Custom Polygon Boundary */}
            {!isDrawing && drawPolygonPoints.length >= 3 && (
              <Polygon
                positions={drawPolygonPoints}
                pathOptions={{
                  color: "#EF4444",
                  fillColor: "#EF4444",
                  fillOpacity: 0.15,
                  weight: 3.5,
                }}
              />
            )}

            {/* Realtor.com Style Price Pill Markers */}
            {displayedPropertiesFiltered.map((property) => {
              const isSelected = selectedPropertyId === property.id;
              const isBlinking = blinkingPropertyId === property.id;
              const hasSearch = Boolean(mapSearchInput.trim());
              const pricePillIcon = getPricePillIcon(property.price ?? 0, isSelected, hasSearch, isBlinking);
              const coords = resolvePropertyMapCoords(property);

              const firstImg = property.images && property.images[0];
              const coverImg: string = typeof firstImg === "string"
                ? firstImg
                : (firstImg as any)?.url || (property as any).coverImage || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80";

              return (
                <Marker
                  key={property.id}
                  position={[coords.lat, coords.lng]}
                  icon={pricePillIcon}
                  eventHandlers={{
                    click: () => {
                      setSelectedPropertyId(property.id);
                      if (mapRef.current) {
                        mapRef.current.setView([coords.lat, coords.lng], 17, { animate: true, duration: 1.2 });
                      }
                      if (!activeUserLocation && "geolocation" in navigator) {
                        navigator.geolocation.getCurrentPosition(
                          (pos) => setInternalUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                          () => console.warn("Geolocation denied or failed")
                        );
                      }
                    },
                  }}
                >
                  <Popup className="property-map-popup-realtor">
                    {(() => {
                      const isProj = (property as any)._isProject;
                      const linkUrl = isProj ? `/projects/${property.slug || property.id}` : `/properties/${property.slug || property.id}`;
                      const orig = (property as any)._originalProjectData;
                      
                      return (
                        <div className="relative w-[260px] h-[190px] rounded-2xl overflow-hidden shadow-2xl group cursor-pointer bg-slate-900">
                          <div
                            onClick={(e) => {
                              if (isProj) {
                                openProject(property, e);
                              } else {
                                router.push(linkUrl);
                              }
                            }}
                            className="absolute inset-0 z-0 cursor-pointer"
                          >
                            <img
                              src={coverImg}
                              alt={property.title}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                          </div>

                          {/* Custom Close Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              const btn = (e.target as HTMLElement).closest('.leaflet-popup')?.querySelector('.leaflet-popup-close-button') as HTMLElement;
                              if (btn) btn.click();
                            }}
                            className="absolute top-2 right-2 w-7 h-7 bg-black/40 hover:bg-black/70 backdrop-blur-md rounded-full flex items-center justify-center text-white z-20 transition-all shadow-md"
                          >
                            <X className="w-4 h-4" />
                          </button>

                          <div className="absolute bottom-3 right-3 flex items-center gap-1.5 z-10">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                shareItem({ item: property, type: (property as any)._isProject ? "project" : "property" });
                              }}
                              title="Share property"
                              className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform text-slate-900 hover:text-amber-500 cursor-pointer"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                toggleFavorite(property.id);
                                toast.success(isFavorite(property.id) ? "Removed from saved properties" : "Saved to your favorites!");
                              }}
                              title={isFavorite(property.id) ? "Remove from saved" : "Save property"}
                              className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform cursor-pointer"
                            >
                              <Heart className={cn("w-5 h-5 transition-colors", isFavorite(property.id) ? "fill-amber-500 text-amber-500" : "text-slate-900")} />
                            </button>
                          </div>

                          <div
                            onClick={(e) => {
                              if (isProj) {
                                openProject(property, e);
                              } else {
                                router.push(linkUrl);
                              }
                            }}
                            className="absolute bottom-3 left-3 right-24 text-white z-0 flex flex-col items-start cursor-pointer"
                          >
                            <div className="text-[28px] font-black drop-shadow-md leading-none mb-1 text-white tracking-tight">
                              {formatPriceCompact(property.price)}
                            </div>
                            
                            {isProj ? (
                              <>
                                <div className="text-sm font-bold drop-shadow-md text-white/95 truncate w-full flex items-center gap-1.5 flex-wrap">
                                  <span>{property.title}</span>
                                </div>
                                <div className="text-sm font-bold drop-shadow-md text-white/95 truncate w-full flex items-center mt-0.5">
                                  <span>By {(property as any).builderName || "Builder"}</span>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="text-sm font-bold drop-shadow-md text-white/95 truncate w-full flex items-center gap-1.5 flex-wrap">
                                  {property.bedrooms ? <span>{property.bedrooms} bed</span> : null}
                                  {property.bathrooms ? <span>• {property.bathrooms} ba</span> : null}
                                  {property.area ? <span>• {property.area.toLocaleString()} sqft</span> : null}
                                </div>
                                <div className="text-sm font-bold drop-shadow-md text-white/95 truncate w-full flex items-center mt-0.5">
                                  <span>{(property as any).plotArea ? `${(((property as any).plotArea as number) / 43560).toFixed(2)} acres lot` : "0.34 acres lot"}</span>
                                </div>
                              </>
                            )}

                            {activeUserLocation && (
                              <div className="text-xs font-extrabold text-amber-400 mt-1 flex items-center gap-1 bg-black/40 px-1.5 py-0.5 rounded backdrop-blur-sm">
                                <Navigation className="w-3 h-3" />
                                {getDistanceFromLatLonInKm(activeUserLocation.lat, activeUserLocation.lng, coords.lat, coords.lng).toFixed(1)} km away from you
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
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
