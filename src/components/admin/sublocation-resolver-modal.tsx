"use client";

import React, { useState, useMemo } from "react";
import {
  MapPin,
  CheckCircle2,
  PlusCircle,
  Sparkles,
  Building2,
  Search,
  ChevronRight,
  BookmarkCheck,
  Compass,
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
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-slate-950 border-2 border-amber-500/40 text-white shadow-2xl rounded-2xl">
        {/* Header */}
        <DialogHeader className="p-5 pb-4 bg-slate-900 border-b border-slate-800 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-400 font-black text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Smart Sublocation Matcher</span>
            </div>
            {data.precision && (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  data.precision === "pin"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                }`}
              >
                {data.precision === "pin" ? "🎯 Exact Pin" : "⚠️ Approximate Viewport"}
              </span>
            )}
          </div>

          <DialogTitle className="text-lg sm:text-xl font-black text-white pt-1">
            Select Area / Sublocation for {cityName}
          </DialogTitle>

          <DialogDescription className="text-xs text-slate-300 leading-relaxed pt-0.5">
            {validDetectedName ? (
              <>
                Google Maps detected area:{" "}
                <span className="font-bold text-amber-400">&quot;{validDetectedName}&quot;</span>.
                Tap to confirm, select a nearby master area, or type a custom name.
              </>
            ) : (
              <span className="text-amber-400 font-medium">
                Google could not find an area name for this pin. Please select an area from the nearby suggestions or search list below.
              </span>
            )}
          </DialogDescription>

          {data.address && (
            <div className="mt-2 p-2 bg-slate-950/80 rounded-xl border border-slate-800 text-[11px] text-slate-300 flex items-start gap-2">
              <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <span className="truncate flex-1 font-mono text-[11px]">{data.address}</span>
              {data.latitude && data.longitude && (
                <span className="shrink-0 text-amber-400 font-mono text-[10px] bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                  {data.latitude.toFixed(4)}, {data.longitude.toFixed(4)}
                </span>
              )}
            </div>
          )}

          {/* Alias Remember Checkbox */}
          {validDetectedName && (
            <label className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800 text-xs text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberAlias}
                onChange={(e) => setRememberAlias(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 accent-amber-500 cursor-pointer"
              />
              <span className="flex items-center gap-1.5 text-slate-300">
                <BookmarkCheck className="w-3.5 h-3.5 text-amber-400" />
                Remember <strong className="text-white">&quot;{validDetectedName}&quot;</strong> as an alias for future auto-matches
              </span>
            </label>
          )}
        </DialogHeader>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 divide-y divide-slate-800/60">
          {/* SECTION 1: Detected Area Candidates (Tappable Chips at Top) */}
          {detectedCandidates.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Detected Area Candidates ({detectedCandidates.length})</span>
                </h4>
                <span className="text-[10px] text-slate-400">Tap to select immediately</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {detectedCandidates.map((cand) => (
                  <button
                    key={`cand-${cand.name}`}
                    type="button"
                    onClick={() => handleSelect(cand.name)}
                    className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border-2 border-amber-500/50 hover:border-amber-400 text-white font-extrabold text-sm transition-all cursor-pointer active:scale-95 shadow-sm min-h-[44px]"
                  >
                    <span>{cand.name}</span>
                    <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">
                      {cand.source === "address_parse" ? "Address segment" : cand.source === "nearby_place" ? "Nearby" : "Detected"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 2: Nearby Master Areas (Within 2 km of Pin) */}
          {nearbyMasterAreas.length > 0 && (
            <div className={detectedCandidates.length > 0 ? "pt-5" : ""}>
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-emerald-400" />
                  <span>Nearby Master Areas (within 2 km of pin)</span>
                </h4>
                <span className="text-[10px] text-emerald-400 font-bold">Recommended Centroids</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {nearbyMasterAreas.map((area) => (
                  <button
                    key={`nearby-${area.name}`}
                    type="button"
                    onClick={() => handleSelect(area.name, area.subId)}
                    className="p-3.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border-2 border-emerald-500/40 hover:border-emerald-400 text-left transition-all cursor-pointer group flex items-center justify-between shadow-xs min-h-[44px]"
                  >
                    <div>
                      <div className="font-extrabold text-sm text-white group-hover:text-emerald-300">
                        {area.name}
                      </div>
                      <div className="text-[11px] text-emerald-400/90 font-semibold mt-0.5">
                        📍 {(area.distanceMeters / 1000).toFixed(1)} km from pin
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 3: Search All Master Sublocations */}
          <div className="pt-5 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-slate-400" />
              <span>Search All {cityName} Sublocations</span>
            </h4>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder={`Search sublocations in ${cityName}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-11 text-xs bg-slate-900 border-slate-800 text-white placeholder:text-slate-500 focus:border-amber-500"
              />
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
              {filteredExisting.map((sub) => (
                <button
                  key={`all-${sub.name}`}
                  type="button"
                  onClick={() => handleSelect(sub.name, sub.id)}
                  className="w-full p-2.5 rounded-lg bg-slate-900/60 hover:bg-slate-800 border border-slate-800/80 text-left transition-all cursor-pointer flex items-center justify-between text-xs text-slate-200 hover:text-white min-h-[44px]"
                >
                  <span className="font-semibold">{sub.name}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                </button>
              ))}

              {filteredExisting.length === 0 && (
                <p className="text-xs text-slate-500 py-3 text-center">
                  No sublocations match &quot;{searchTerm}&quot;
                </p>
              )}
            </div>
          </div>

          {/* SECTION 4: Type Custom Sublocation Name */}
          <div className="pt-5 space-y-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
              Type Custom Area / Sublocation Name
            </h4>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="e.g. Srinivasa Nagar, KCP Colony, Bhagat Singh Nagar..."
                value={customLocality}
                onChange={(e) => setCustomLocality(e.target.value)}
                className="h-11 text-xs bg-slate-900 border-slate-800 text-white placeholder:text-slate-500 focus:border-amber-500"
              />
              <Button
                type="button"
                onClick={() => {
                  const clean = customLocality.trim();
                  if (clean) handleAddToMasterAndSelect(clean);
                }}
                disabled={!customLocality.trim() || isAdding}
                className="h-11 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shrink-0 rounded-xl min-h-[44px]"
              >
                Create &amp; Select
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
