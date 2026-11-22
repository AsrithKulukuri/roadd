"use client";

import React, { useState, useMemo } from "react";
import {
  MapPin,
  Sparkles,
  Building2,
  Search,
  ChevronRight,
  BookmarkCheck,
  Compass,
  PlusCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocationsStore, LocationCity } from "@/stores/locations-store";
import { isForbiddenAreaName } from "@/lib/maps/google-maps-service";
import { calculateDistanceMeters } from "@/lib/maps/sublocation-matcher";
import { VIJAYAWADA_LOCALITIES, GUNTUR_LOCALITIES } from "@/lib/seeded-dataset";
import { toast } from "sonner";

export interface CandidateSublocation {
  id?: string;
  name: string;
  source?: "exact" | "alias" | "fuzzy" | "proximity" | "google_geocode" | "address_parse" | "nearby_place" | string;
  confidence?: number | "high" | "medium" | "low";
  distanceMeters?: number;
}

export interface LocationResolutionData {
  city: string;
  detectedLocality: string;
  candidateSublocations: CandidateSublocation[];
  address?: string;
  latitude?: number;
  longitude?: number;
  resolvedUrl?: string;
  precision?: "pin" | "viewport" | "geocoded";
}

interface SublocationResolverModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: LocationResolutionData | null;
  onSelectLocality: (locality: string, city?: string) => void;
}

export function SublocationResolverModal({
  isOpen,
  onClose,
  data,
  onSelectLocality,
}: SublocationResolverModalProps) {
  const { cities, addSublocation } = useLocationsStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [customLocality, setCustomLocality] = useState("");
  const [rememberAlias, setRememberAlias] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  // Identify active target city from the resolved data
  const targetCity: LocationCity | undefined = useMemo(() => {
    if (!data?.city) return cities[0];
    const clean = data.city.toLowerCase().trim();
    return (
      cities.find((c) => c.name.toLowerCase().trim() === clean) ||
      cities.find((c) => clean.includes(c.name.toLowerCase().trim())) ||
      cities[0]
    );
  }, [data?.city, cities]);

  const cityName = targetCity?.name || data?.city || "Vijayawada";
  const existingSublocations = useMemo(() => targetCity?.sublocations || [], [targetCity]);

  // Coordinates lookup table for master sublocations
  const localityCoords = useMemo(() => {
    const map = new Map<string, { lat: number; lng: number }>();
    VIJAYAWADA_LOCALITIES.forEach((l) => map.set(l.name.toLowerCase().trim(), { lat: l.lat, lng: l.lng }));
    GUNTUR_LOCALITIES.forEach((l) => map.set(l.name.toLowerCase().trim(), { lat: l.lat, lng: l.lng }));
    return map;
  }, []);

  // Filter out any candidates that match city / district / state
  const validDetectedName = useMemo(() => {
    if (!data?.detectedLocality) return "";
    return isForbiddenAreaName(data.detectedLocality, cityName) ? "" : data.detectedLocality.trim();
  }, [data?.detectedLocality, cityName]);

  // Normalize detected candidates & reject city names
  const detectedCandidates = useMemo(() => {
    if (!data) return [];
    const rawList: CandidateSublocation[] = [...(data.candidateSublocations || [])];

    if (validDetectedName && !rawList.some((c) => c.name.toLowerCase() === validDetectedName.toLowerCase())) {
      rawList.unshift({
        name: validDetectedName,
        source: "google_geocode",
        confidence: 0.95,
      });
    }

    const seen = new Set<string>();
    return rawList.filter((c) => {
      const lower = c.name.trim().toLowerCase();
      if (!lower || seen.has(lower)) return false;
      if (isForbiddenAreaName(c.name, cityName)) return false;
      seen.add(lower);
      return true;
    });
  }, [data, validDetectedName, cityName]);

  // Compute Nearby Master Sublocations within 2 km of Pin
  const nearbyMasterAreas = useMemo(() => {
    if (!data?.latitude || !data?.longitude) return [];
    const results: Array<{ name: string; distanceMeters: number; subId?: string }> = [];

    existingSublocations.forEach((sub) => {
      const coords = localityCoords.get(sub.name.toLowerCase().trim());
      if (coords) {
        const dist = calculateDistanceMeters(data.latitude!, data.longitude!, coords.lat, coords.lng);
        if (dist <= 2000) {
          results.push({
            name: sub.name,
            distanceMeters: Math.round(dist),
            subId: sub.id,
          });
        }
      }
    });

    return results.sort((a, b) => a.distanceMeters - b.distanceMeters);
  }, [data?.latitude, data?.longitude, existingSublocations, localityCoords]);

  // Filtered master sublocations for manual search
  const filteredExisting = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return existingSublocations;
    return existingSublocations.filter((s) => s.name.toLowerCase().includes(q));
  }, [existingSublocations, searchTerm]);

  // Check if typed search query is a new custom candidate
  const isSearchMatchingExisting = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return existingSublocations.some((s) => s.name.toLowerCase() === q);
  }, [existingSublocations, searchTerm]);

  // Action: Select existing locality directly
  const handleSelect = async (localityName: string, sublocationId?: string) => {
    const detected = validDetectedName;

    // If "remember alias" is checked and detected differs from chosen master sublocation:
    if (rememberAlias && detected && detected.toLowerCase() !== localityName.toLowerCase()) {
      try {
        await fetch("/api/admin/sublocations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "alias",
            city_id: cityName.toLowerCase().trim(),
            sublocation_id: sublocationId || localityName,
            alias: detected,
          }),
        });
        toast.success(`🔗 Remembered "${detected}" as alias of "${localityName}"!`);
      } catch {}
    }

    onSelectLocality(localityName, cityName);
    toast.success(`📍 Selected sublocation: ${localityName}`);
    onClose();
  };

  // Action: Add new candidate to Master DB and select it
  const handleAddToMasterAndSelect = async (candidateName: string) => {
    if (isForbiddenAreaName(candidateName, cityName)) {
      toast.error(`"${candidateName}" cannot be used as an area name.`);
      return;
    }

    setIsAdding(true);
    try {
      if (targetCity) {
        await addSublocation(targetCity.id, {
          name: candidateName,
          tagline: `${candidateName}, ${cityName}`,
        });
      }

      await fetch("/api/admin/sublocations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          city_id: cityName.toLowerCase().trim(),
          name: candidateName,
          lat: data?.latitude,
          lng: data?.longitude,
        }),
      });

      toast.success(`✨ Added "${candidateName}" to ${cityName} master sublocations!`);
      onSelectLocality(candidateName, cityName);
      onClose();
    } catch (err: any) {
      toast.error(`Could not add sublocation: ${err.message || "Unknown error"}`);
    } finally {
      setIsAdding(false);
    }
  };

  if (!data) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] sm:max-w-xl max-h-[90dvh] sm:max-h-[85vh] flex flex-col p-0 overflow-hidden bg-black border border-zinc-800 text-white shadow-2xl rounded-2xl">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-5 pb-3 sm:pb-4 bg-black border-b border-zinc-800/80 shrink-0 text-left pr-12">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-400">
              <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Select Area in <span className="text-white font-extrabold">{cityName}</span></span>
            </div>
            {data.precision && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-zinc-900 text-zinc-300 border-zinc-800 shrink-0">
                {data.precision === "pin" ? "🎯 Exact Pin" : "⚠️ Approx"}
              </span>
            )}
          </div>

          <DialogTitle className="text-base sm:text-lg font-black text-white pt-1">
            Choose Locality / Sublocation
          </DialogTitle>

          <DialogDescription className="text-xs text-zinc-400 leading-relaxed pt-0.5">
            {validDetectedName ? (
              <>
                Detected area from link: <strong className="text-white">&quot;{validDetectedName}&quot;</strong>. Tap to confirm or pick an area below.
              </>
            ) : (
              "Google could not detect an area name for this pin. Select a sublocation below or type a custom name."
            )}
          </DialogDescription>

          {data.address && (
            <div className="mt-2 p-2 bg-zinc-900/80 rounded-xl border border-zinc-800/80 text-[11px] text-zinc-400 flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="truncate flex-1 font-mono text-[11px] text-zinc-300">{data.address}</span>
            </div>
          )}

          {/* Alias Remember Option */}
          {validDetectedName && (
            <label className="flex items-center gap-2 mt-2 pt-2 border-t border-zinc-900 text-xs text-zinc-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberAlias}
                onChange={(e) => setRememberAlias(e.target.checked)}
                className="w-4 h-4 rounded text-black accent-white cursor-pointer"
              />
              <span className="flex items-center gap-1.5 text-zinc-300 text-[11px]">
                <BookmarkCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                Remember <strong className="text-white">&quot;{validDetectedName}&quot;</strong> for future matches
              </span>
            </label>
          )}
        </DialogHeader>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 divide-y divide-zinc-900">
          {/* SECTION 1: Detected Area Candidates (Tappable Chips at Top) */}
          {detectedCandidates.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Detected Area ({detectedCandidates.length})</span>
                </span>
                <span className="text-[10px] text-zinc-500">Tap to select</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {detectedCandidates.map((cand) => (
                  <button
                    key={`cand-${cand.name}`}
                    type="button"
                    onClick={() => handleSelect(cand.name)}
                    className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 text-white font-bold text-xs sm:text-sm transition-all cursor-pointer active:scale-95 shadow-xs min-h-[44px]"
                  >
                    <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>{cand.name}</span>
                    <span className="text-[10px] font-bold bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded">
                      {cand.source === "address_parse" ? "From Address" : "Detected"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 2: Nearby Master Areas (Within 2 km of Pin) */}
          {nearbyMasterAreas.length > 0 && (
            <div className={detectedCandidates.length > 0 ? "pt-4" : ""}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-amber-500" />
                  <span>Nearby Master Areas (within 2 km)</span>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {nearbyMasterAreas.map((area) => (
                  <button
                    key={`nearby-${area.name}`}
                    type="button"
                    onClick={() => handleSelect(area.name, area.subId)}
                    className="p-3 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800/80 text-left transition-all cursor-pointer group flex items-center justify-between min-h-[46px] active:scale-[0.99]"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-bold text-sm text-white flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="truncate">{area.name}</span>
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        📍 {(area.distanceMeters / 1000).toFixed(1)} km from pin
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-amber-500 transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 3: Search All Master Sublocations */}
          <div className="pt-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-amber-500" />
                <span>Search All {cityName} Areas ({filteredExisting.length})</span>
              </span>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-amber-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                type="text"
                placeholder={`Search sublocations in ${cityName}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-11 text-sm bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500 focus:border-zinc-500 focus:ring-0 rounded-xl"
              />
            </div>

            {/* Quick 1-Tap Add Action if Search Term Doesn't Match Master List */}
            {searchTerm.trim().length > 1 && !isSearchMatchingExisting && (
              <button
                type="button"
                onClick={() => handleAddToMasterAndSelect(searchTerm.trim())}
                disabled={isAdding}
                className="w-full p-3 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-dashed border-zinc-700 text-left transition-all cursor-pointer flex items-center justify-between text-sm text-white min-h-[48px] active:scale-[0.99]"
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <PlusCircle className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="truncate text-xs sm:text-sm">
                    Add new area: <strong className="text-white underline decoration-amber-500">&quot;{searchTerm.trim()}&quot;</strong>
                  </span>
                </div>
                <span className="text-xs font-bold text-black bg-white hover:bg-zinc-200 px-3 py-1.5 rounded-lg shrink-0">
                  {isAdding ? "Adding..." : "Add & Select"}
                </span>
              </button>
            )}

            <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
              {filteredExisting.map((sub) => (
                <button
                  key={`all-${sub.name}`}
                  type="button"
                  onClick={() => handleSelect(sub.name, sub.id)}
                  className="w-full px-3.5 py-3 rounded-xl bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800/80 text-left transition-all cursor-pointer flex items-center justify-between text-sm text-white min-h-[48px] group active:scale-[0.99]"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="font-semibold text-white truncate">{sub.name}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-amber-500 transition-colors shrink-0" />
                </button>
              ))}

              {filteredExisting.length === 0 && !searchTerm.trim() && (
                <p className="text-xs text-zinc-500 py-3 text-center">
                  No sublocations listed for {cityName}
                </p>
              )}

              {filteredExisting.length === 0 && searchTerm.trim() && isSearchMatchingExisting && (
                <p className="text-xs text-zinc-500 py-3 text-center">
                  No sublocations match &quot;{searchTerm}&quot;
                </p>
              )}
            </div>
          </div>

          {/* SECTION 4: Type Custom Area Name (Mobile-Responsive Stack) */}
          <div className="pt-3 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Or Type Custom Area Name
            </span>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                type="text"
                placeholder="e.g. Srinivasa Nagar, KCP Colony, Bhagat Singh Nagar..."
                value={customLocality}
                onChange={(e) => setCustomLocality(e.target.value)}
                className="h-11 text-sm bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500 focus:border-zinc-500 focus:ring-0 rounded-xl flex-1"
              />
              <Button
                type="button"
                onClick={() => {
                  const clean = customLocality.trim();
                  if (clean) handleAddToMasterAndSelect(clean);
                }}
                disabled={!customLocality.trim() || isAdding}
                className="h-11 px-5 bg-white hover:bg-zinc-200 text-black font-bold text-sm shrink-0 rounded-xl min-h-[44px] w-full sm:w-auto"
              >
                {isAdding ? "Adding..." : "Create & Select"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
