"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Navigation, Car, Bike, MapPin, Search, Loader2, ArrowUpRight, Building2, MapPinOff } from "lucide-react";
import { Input } from "@/components/ui/input";

interface CommuteRadiusMapProps {
  latitude: number;
  longitude: number;
  projectName: string;
  city: string;
}

interface LocalHub {
  name: string;
  aliases: string[];
  lat: number;
  lng: number;
  category?: "shopping" | "transit" | "health" | "edu" | "suburb";
}

// Built-in high-accuracy landmarks & hubs across Andhra Pradesh
const AP_LOCAL_HUBS: Record<string, LocalHub[]> = {
  vijayawada: [
    // Malls & Leisure
    { name: "PVP Square Mall", aliases: ["pvp", "pvp mall", "pvp square", "pvp cinema"], lat: 16.5065, lng: 80.6412, category: "shopping" },
    { name: "Trendset Mall", aliases: ["trendset", "trendset mall", "benz circle mall"], lat: 16.5028, lng: 80.6558, category: "shopping" },
    { name: "LEPL Centro", aliases: ["centro", "lepl", "lepl centro"], lat: 16.5058, lng: 80.6438, category: "shopping" },
    { name: "Ripples Mall", aliases: ["ripples", "ripples mall", "inox ripples"], lat: 16.5032, lng: 80.6521, category: "shopping" },
    { name: "D-Mart Poranki", aliases: ["dmart poranki", "d mart poranki", "dmart"], lat: 16.4842, lng: 80.7045, category: "shopping" },
    { name: "D-Mart Benz Circle", aliases: ["dmart benz circle", "d mart patamata"], lat: 16.5015, lng: 80.6582, category: "shopping" },
    
    // Suburbs & Junctions
    { name: "Poranki", aliases: ["poranki junction", "poranki center", "poranki bus stop"], lat: 16.4862, lng: 80.7063, category: "suburb" },
    { name: "Benz Circle", aliases: ["benz circle", "benz", "benz centre"], lat: 16.5074, lng: 80.6482, category: "suburb" },
    { name: "Tadigadapa", aliases: ["tadigadapa junction", "tadigadapa 100ft road", "tadigadapa donka road"], lat: 16.4812, lng: 80.6908, category: "suburb" },
    { name: "Kanuru", aliases: ["kanuru junction", "kanuru center", "kanuru road"], lat: 16.4925, lng: 80.6817, category: "suburb" },
    { name: "Penamaluru", aliases: ["penamaluru center", "penamaluru police station"], lat: 16.4715, lng: 80.7258, category: "suburb" },
    { name: "Auto Nagar", aliases: ["autonagar", "auto nagar gate", "autonagar hub"], lat: 16.5012, lng: 80.6725, category: "suburb" },
    { name: "Patamata", aliases: ["patamata center", "patamata high school road"], lat: 16.4988, lng: 80.6625, category: "suburb" },
    { name: "Enikepadu", aliases: ["enikepadu junction", "enikepadu flyover"], lat: 16.5262, lng: 80.6938, category: "suburb" },
    { name: "Prasadampadu", aliases: ["prasadampadu", "prasadampadu ramavarappadu"], lat: 16.5212, lng: 80.6812, category: "suburb" },
    { name: "Ramavarappadu Ring", aliases: ["ramavarappadu", "ramavarappadu junction", "ring"], lat: 16.5192, lng: 80.6712, category: "suburb" },
    { name: "Gollapudi", aliases: ["gollapudi bypass", "gollapudi center"], lat: 16.5492, lng: 80.5925, category: "suburb" },
    { name: "Bhavanipuram", aliases: ["bhavanipuram hub", "swathi hotel"], lat: 16.5312, lng: 80.6015, category: "suburb" },
    { name: "Governorpet", aliases: ["governorpet", "eluru road governorpet"], lat: 16.5125, lng: 80.6275, category: "suburb" },
    { name: "Moghalrajpuram", aliases: ["moghalrajpuram", "caves"], lat: 16.5062, lng: 80.6385, category: "suburb" },
    { name: "Gunadala", aliases: ["gunadala church", "gunadala center"], lat: 16.5245, lng: 80.6592, category: "suburb" },
    { name: "Kankipadu", aliases: ["kankipadu junction", "kankipadu bus stand"], lat: 16.4258, lng: 80.7812, category: "suburb" },
    { name: "Vuyyuru", aliases: ["vuyyuru", "vuyyuru sugar factory"], lat: 16.3685, lng: 80.8415, category: "suburb" },

    // Transit Hubs
    { name: "Gannavaram Airport", aliases: ["airport", "vijayawada airport", "flight"], lat: 16.5291, lng: 80.7931, category: "transit" },
    { name: "Pandit Nehru Bus Station (PNBS)", aliases: ["bus stand", "pnbs", "bus station", "rtc complex"], lat: 16.5186, lng: 80.6201, category: "transit" },
    { name: "Vijayawada Railway Station", aliases: ["railway station", "train station", "station"], lat: 16.5184, lng: 80.6223, category: "transit" },

    // Hospitals
    { name: "Manipal Hospital", aliases: ["manipal", "manipal hospital tadepalli"], lat: 16.4855, lng: 80.6125, category: "health" },
    { name: "Ayush Hospital", aliases: ["ayush", "ayush hospital ramavarappadu"], lat: 16.5188, lng: 80.6698, category: "health" },
    { name: "Ramesh Hospital", aliases: ["ramesh", "ramesh hospitals ring"], lat: 16.5098, lng: 80.6612, category: "health" },
    { name: "Andhra Hospitals", aliases: ["andhra hospital", "andhra hospital bhavanipuram"], lat: 16.5245, lng: 80.6312, category: "health" },
    { name: "Capital Hospital", aliases: ["capital hospital", "capital hospital kanuru"], lat: 16.4912, lng: 80.6845, category: "health" },
    { name: "Time Hospital", aliases: ["time hospital autonagar"], lat: 16.4998, lng: 80.6685, category: "health" },

    // Universities & Tech Parks
    { name: "KL University (KLU)", aliases: ["kl university", "klu", "kl deomed university"], lat: 16.4425, lng: 80.6225, category: "edu" },
    { name: "VR Siddhartha Engineering College", aliases: ["vrsec", "siddhartha engineering", "siddhartha college kanuru"], lat: 16.4835, lng: 80.6938, category: "edu" },
    { name: "Mangalagiri AIIMS / IT Park", aliases: ["aiims", "aiims mangalagiri", "mangalagiri it park"], lat: 16.4385, lng: 80.5790, category: "transit" },
    { name: "AP Secretariat (Velagapudi)", aliases: ["secretariat", "ap secretariat", "velagapudi", "amaravati"], lat: 16.5412, lng: 80.5182, category: "transit" },
    { name: "AP High Court (Nelapadu)", aliases: ["high court", "ap high court"], lat: 16.5215, lng: 80.5058, category: "transit" },
  ],
  guntur: [
    { name: "Gorantla", aliases: ["gorantla hub", "gorantla"], lat: 16.3262, lng: 80.4101, category: "suburb" },
    { name: "Guntur Railway Station", aliases: ["railway station", "guntur station"], lat: 16.3052, lng: 80.4439, category: "transit" },
    { name: "NTR Bus Station Guntur", aliases: ["bus stand", "ntr bus station"], lat: 16.3021, lng: 80.4485, category: "transit" },
    { name: "AIIMS Mangalagiri", aliases: ["aiims", "aiims hospital"], lat: 16.4255, lng: 80.5654, category: "health" },
    { name: "Pattabhipuram", aliases: ["pattabhipuram"], lat: 16.3112, lng: 80.4285, category: "suburb" },
    { name: "Brundavan Gardens", aliases: ["brundavan gardens"], lat: 16.3195, lng: 80.4241, category: "suburb" },
    { name: "Acharya Nagarjuna University (ANU)", aliases: ["anu", "nagarjuna university"], lat: 16.3775, lng: 80.5285, category: "edu" },
  ],
};

// Haversine formula to calculate accurate geodesic distance in km
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

// Clean normalize string for fuzzy matching
function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export default function CommuteRadiusMap({
  latitude,
  longitude,
  projectName,
  city,
}: CommuteRadiusMapProps) {
  const [vehicle, setVehicle] = useState<"car" | "bike">("car");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    placeName: string;
    distanceKm: number;
    travelMinutes: number;
    destinationLat: number;
    destinationLng: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const cleanCity = city?.toLowerCase().trim() || "vijayawada";
  const allHubs = useMemo(() => {
    const primary = AP_LOCAL_HUBS[cleanCity] || AP_LOCAL_HUBS["vijayawada"];
    const secondary = AP_LOCAL_HUBS["vijayawada"];
    return [...primary, ...secondary.filter((s) => !primary.some((p) => p.name === s.name))];
  }, [cleanCity]);

  // Speeds in km/h accounting for urban traffic
  const speed = vehicle === "car" ? 32 : 28;

  // Filter autocomplete suggestions dynamically as user types
  const filteredSuggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || q.length < 1) return [];

    const normQ = normalizeText(q);
    return allHubs
      .filter((hub) => {
        if (hub.name.toLowerCase().includes(q)) return true;
        if (normalizeText(hub.name).includes(normQ)) return true;
        return hub.aliases.some(
          (alias) => alias.toLowerCase().includes(q) || normalizeText(alias).includes(normQ) || normQ.includes(normalizeText(alias))
        );
      })
      .slice(0, 5);
  }, [searchQuery, allHubs]);

  // Calculate commute data from coordinates
  const computeCommute = (targetLat: number, targetLng: number, name: string) => {
    const rawDist = calculateDistanceKm(latitude, longitude, targetLat, targetLng);
    // 1.22x road routing detour factor
    const roadDist = Math.max(0.4, rawDist * 1.22);
    const travelTime = Math.max(2, Math.round((roadDist / speed) * 60));

    setResult({
      placeName: name,
      distanceKm: parseFloat(roadDist.toFixed(1)),
      travelMinutes: travelTime,
      destinationLat: targetLat,
      destinationLng: targetLng,
    });
    setIsDropdownOpen(false);
  };

  // Select a preset local hub
  const handleSelectPreset = (hub: LocalHub) => {
    setSearchQuery(hub.name);
    computeCommute(hub.lat, hub.lng, hub.name);
  };

  // Search any custom locality or mall via local fuzzy list first, then OpenStreetMap Geocoder
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    const normQ = normalizeText(query);

    // 1. Check local fuzzy list first (instant match for PVP, Trendset, Poranki, etc.)
    const matchedHub = allHubs.find((h) => {
      if (h.name.toLowerCase().includes(query.toLowerCase())) return true;
      if (normalizeText(h.name).includes(normQ)) return true;
      return h.aliases.some(
        (alias) =>
          alias.toLowerCase().includes(query.toLowerCase()) ||
          normalizeText(alias).includes(normQ) ||
          normQ.includes(normalizeText(alias))
      );
    });

    if (matchedHub) {
      computeCommute(matchedHub.lat, matchedHub.lng, matchedHub.name);
      return;
    }

    // 2. Fallback to OpenStreetMap Geocoding API for any locality / shop
    setLoading(true);
    try {
      const fullQuery = `${query}, ${city}, Andhra Pradesh, India`;
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullQuery)}`
      );
      const data = await res.json();

      if (data && data.length > 0) {
        const destLat = parseFloat(data[0].lat);
        const destLng = parseFloat(data[0].lon);
        const displayName = data[0].display_name.split(",")[0] || query;
        computeCommute(destLat, destLng, displayName);
      } else {
        // Broad search
        const broadRes = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ", Andhra Pradesh")}`
        );
        const broadData = await broadRes.json();
        if (broadData && broadData.length > 0) {
          const destLat = parseFloat(broadData[0].lat);
          const destLng = parseFloat(broadData[0].lon);
          const displayName = broadData[0].display_name.split(",")[0] || query;
          computeCommute(destLat, destLng, displayName);
        } else {
          alert(`Could not locate "${query}". Please select from nearby landmarks or search a nearby junction.`);
        }
      }
    } catch (err) {
      console.error("Geocoding lookup failed", err);
    } finally {
      setLoading(false);
    }
  };

  // Recalculate on vehicle mode switch if result exists
  const switchVehicle = (newMode: "car" | "bike") => {
    setVehicle(newMode);
    if (result) {
      const newSpeed = newMode === "car" ? 32 : 28;
      const travelTime = Math.max(2, Math.round((result.distanceKm / newSpeed) * 60));
      setResult({
        ...result,
        travelMinutes: travelTime,
      });
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="space-y-3.5 pt-2 relative">
      {/* Header & Mode Switch */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-bold text-text-primary">Commute & Travel Time</h3>
        </div>

        {/* Vehicle Toggle */}
        <div className="flex items-center bg-bg-primary border border-border-default p-0.5 rounded-xl">
          <button
            type="button"
            onClick={() => switchVehicle("car")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              vehicle === "car"
                ? "bg-slate-950 text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <Car className={`w-3.5 h-3.5 ${vehicle === "car" ? "text-amber-400" : ""}`} />
            <span>Drive</span>
          </button>
          <button
            type="button"
            onClick={() => switchVehicle("bike")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              vehicle === "bike"
                ? "bg-slate-950 text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <Bike className={`w-3.5 h-3.5 ${vehicle === "bike" ? "text-amber-400" : ""}`} />
            <span>Bike</span>
          </button>
        </div>
      </div>

      {/* Smart Search Form with Autocomplete Dropdown */}
      <div className="relative">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              placeholder="Search destination (e.g. PVP Mall, Benz Circle, Airport...)"
              className="pl-9 pr-4 h-10 text-xs sm:text-sm font-medium bg-bg-primary border-border-default rounded-xl"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !searchQuery.trim()}
            className="px-4 h-10 rounded-xl bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs border border-white/15 shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shrink-0"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
            ) : (
              <>
                <span>Check</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-amber-500" />
              </>
            )}
          </button>
        </form>

        {/* Live Auto-Suggest Dropdown */}
        {isDropdownOpen && filteredSuggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-bg-card border border-border-default rounded-2xl shadow-xl z-50 overflow-hidden divide-y divide-border-default/50 animate-in fade-in zoom-in-95 duration-150">
            {filteredSuggestions.map((item) => (
              <button
                key={item.name}
                type="button"
                onClick={() => handleSelectPreset(item)}
                className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-bg-primary transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0">
                    <MapPin className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-text-primary truncate group-hover:text-amber-primary transition-colors">
                    {item.name}
                  </span>
                </div>
                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 shrink-0 ml-2">
                  Calculate ↗
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Instant Commute Result Card */}
      {result && (
        <div className="bg-slate-950 text-white border border-white/15 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md animate-in fade-in duration-300">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 text-amber-400" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-slate-400 truncate">
                From <strong className="text-white">{projectName}</strong> to:
              </div>
              <div className="text-sm font-bold text-white truncate">{result.placeName}</div>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/10 shrink-0">
            <div className="text-left sm:text-right">
              <div className="text-base sm:text-lg font-black text-amber-400">
                ~{result.travelMinutes} mins
              </div>
              <div className="text-[11px] text-slate-400 font-medium">
                {result.distanceKm} km away ({vehicle})
              </div>
            </div>

            <a
              href={`https://www.google.com/maps/dir/?api=1&origin=${latitude},${longitude}&destination=${result.destinationLat},${result.destinationLng}&travelmode=${vehicle === "car" ? "driving" : "bicycling"}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors border border-white/15 shrink-0"
            >
              <span>Directions</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-amber-400" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
