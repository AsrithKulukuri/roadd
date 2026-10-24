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
  X,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocationsStore, LocationCity } from "@/stores/locations-store";
import { toast } from "sonner";

export interface CandidateSublocation {
  name: string;
  type?: string;
  confidence?: "high" | "medium" | "low";
}

export interface LocationResolutionData {
  city: string;
  detectedLocality: string;
  candidateSublocations: CandidateSublocation[];
  address?: string;
  latitude?: number;
  longitude?: number;
  resolvedUrl?: string;
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

  // Normalize candidates & deduplicate
  const candidates = useMemo(() => {
    if (!data) return [];
    const list: CandidateSublocation[] = [...(data.candidateSublocations || [])];

    // If primary detected locality is not in list, add it
    if (data.detectedLocality && !list.some((c) => c.name.toLowerCase() === data.detectedLocality.toLowerCase())) {
      list.unshift({
        name: data.detectedLocality,
        type: "primary",
        confidence: "high",
      });
    }

    // Deduplicate case-insensitively
    const seen = new Set<string>();
    return list.filter((c) => {
      const lower = c.name.trim().toLowerCase();
      if (!lower || seen.has(lower) || lower === cityName.toLowerCase()) return false;
      seen.add(lower);
      return true;
    });
  }, [data, cityName]);

  // Split candidates into: matches existing master DB vs new/unmatched
  const { matchedCandidates, newCandidates } = useMemo(() => {
    const matched: Array<{ candidate: CandidateSublocation; existingMatch: string; count?: string }> = [];
    const unmatched: CandidateSublocation[] = [];

    candidates.forEach((cand) => {
      const found = existingSublocations.find(
        (s) => s.name.toLowerCase().trim() === cand.name.toLowerCase().trim()
      );
      if (found) {
        matched.push({ candidate: cand, existingMatch: found.name, count: found.count });
      } else {
        unmatched.push(cand);
      }
    });

    return { matchedCandidates: matched, newCandidates: unmatched };
  }, [candidates, existingSublocations]);

  // Filtered master sublocations for manual browse/search
  const filteredExisting = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return existingSublocations;
    return existingSublocations.filter((s) => s.name.toLowerCase().includes(q));
  }, [existingSublocations, searchTerm]);

  // Action: Select existing locality directly
  const handleSelect = (localityName: string) => {
    onSelectLocality(localityName, cityName);
    toast.success(`📍 Selected sublocation: ${localityName}`);
    onClose();
  };

  // Action: Add new candidate to Master DB and select it
  const handleAddToMasterAndSelect = async (candidateName: string) => {
    if (!targetCity) {
      handleSelect(candidateName);
      return;
    }

    setIsAdding(true);
    try {
      await addSublocation(targetCity.id, {
        name: candidateName,
        tagline: `${candidateName}, ${cityName}`,
      });
      toast.success(`✨ Added "${candidateName}" to ${cityName} master list!`);
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
          <div className="flex items-center gap-2.5 text-amber-400 font-black text-xs uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Smart Sublocation Matcher</span>
          </div>
          <DialogTitle className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
            <span>Confirm Project Sublocation in {cityName}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400 leading-relaxed pt-1">
            Google Maps detected multiple area names for this coordinate. Pick an existing master sublocation or add a new one with 1 click.
          </DialogDescription>

          {data.address && (
            <div className="mt-2.5 p-2.5 bg-slate-950/80 rounded-xl border border-slate-800/80 text-[11px] text-slate-300 flex items-start gap-2">
              <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <span className="truncate flex-1 font-mono text-[11px]">{data.address}</span>
              {data.latitude && data.longitude && (
                <span className="shrink-0 text-amber-400 font-mono text-[10px] bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                  {data.latitude.toFixed(4)}, {data.longitude.toFixed(4)}
                </span>
              )}
            </div>
          )}
        </DialogHeader>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 divide-y divide-slate-800/60">
          {/* SECTION 1: Matches in Master Database */}
          {matchedCandidates.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Matches Existing Master Sublocations ({matchedCandidates.length})</span>
                </h4>
                <span className="text-[10px] text-slate-400">Recommended</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {matchedCandidates.map(({ candidate, existingMatch, count }) => (
                  <button
                    key={`matched-${existingMatch}`}
                    type="button"
                    onClick={() => handleSelect(existingMatch)}
                    className="p-3.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border-2 border-emerald-500/50 hover:border-emerald-400 text-left transition-all cursor-pointer group flex items-center justify-between shadow-xs active:scale-98"
                  >
                    <div>
                      <div className="font-extrabold text-sm text-white group-hover:text-emerald-300 flex items-center gap-1.5">
                        <span>{existingMatch}</span>
                        <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">
                          Master DB
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {count || "Active in search filters"}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 2: New Detected Areas (Not yet in Master List) */}
          {newCandidates.length > 0 && (
            <div className={matchedCandidates.length > 0 ? "pt-5" : ""}>
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>New Areas Detected From Google Maps ({newCandidates.length})</span>
                </h4>
                <span className="text-[10px] text-slate-400">1-Click Add to Master</span>
              </div>

              <div className="space-y-2">
                {newCandidates.map((cand) => (
                  <div
                    key={`new-${cand.name}`}
                    className="p-3.5 rounded-xl bg-slate-900 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-extrabold text-sm text-white flex items-center gap-2">
                        <span>{cand.name}</span>
                        {cand.type && (
                          <span className="text-[10px] font-bold bg-slate-800 text-amber-400 px-2 py-0.5 rounded capitalize">
                            {cand.type}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Not in {cityName} master list. Adding will enable it in search pills and filters.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        type="button"
                        disabled={isAdding}
                        onClick={() => handleAddToMasterAndSelect(cand.name)}
                        className="h-8 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-lg cursor-pointer shadow-xs gap-1.5 transition-all"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Add to Master &amp; Select</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => handleSelect(cand.name)}
                        className="h-8 px-2.5 text-slate-400 hover:text-white hover:bg-slate-800 text-xs rounded-lg cursor-pointer"
                        title="Use only for this project without saving to master list"
                      >
                        Use As-Is
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 3: Browse All Existing Sublocations in this City */}
          <div className="pt-5">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-slate-400" />
                <span>Or Select from Existing {cityName} Areas ({existingSublocations.length})</span>
              </h4>
            </div>

            {/* Search Input for existing sublocations */}
            <div className="relative mb-2.5">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder={`Search ${cityName} areas (e.g. Poranki, Kanuru, Tadepalli)...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 pl-9 text-xs bg-slate-900 border-slate-800 text-white placeholder:text-slate-500 rounded-xl focus:border-amber-500"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Sublocations Chip Grid */}
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 bg-slate-900/60 rounded-xl border border-slate-800/80">
              {filteredExisting.length > 0 ? (
                filteredExisting.map((sub) => (
                  <button
                    key={`sub-chip-${sub.id}`}
                    type="button"
                    onClick={() => handleSelect(sub.name)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 border border-slate-700/60 transition-all cursor-pointer flex items-center gap-1"
                  >
                    <span>{sub.name}</span>
                    {sub.count && sub.count !== "Available" && (
                      <span className="text-[10px] opacity-75 font-normal">({sub.count})</span>
                    )}
                  </button>
                ))
              ) : (
                <div className="py-4 px-3 text-center w-full text-xs text-slate-500">
                  No areas matching &ldquo;{searchTerm}&rdquo;
                </div>
              )}
            </div>
          </div>

          {/* SECTION 4: Type Custom Locality */}
          <div className="pt-5">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
              Custom Locality / Landmark
            </h4>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Input
                type="text"
                placeholder={`Type custom locality or landmark (e.g. Penamaluru)...`}
                value={customLocality}
                onChange={(e) => setCustomLocality(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && customLocality.trim()) {
                    e.preventDefault();
                    handleAddToMasterAndSelect(customLocality.trim());
                  }
                }}
                className="h-10 text-xs bg-slate-900 border-slate-800 text-white placeholder:text-slate-500 rounded-xl focus:border-amber-500 flex-1"
              />
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  disabled={!customLocality.trim() || isAdding}
                  onClick={() => handleAddToMasterAndSelect(customLocality.trim())}
                  className="h-10 px-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl cursor-pointer shadow-xs gap-1.5 transition-all"
                  title={`Add to ${cityName} master list and select for this project`}
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Add to Master &amp; Apply</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={!customLocality.trim()}
                  onClick={() => handleSelect(customLocality.trim())}
                  className="h-10 px-3 text-slate-400 hover:text-white hover:bg-slate-800 text-xs rounded-xl cursor-pointer"
                  title="Use only for this project without saving to master list"
                >
                  Use As-Is
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-slate-400">
            Selected sublocation will power search filters, nearby recommendations, and listings.
          </p>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="h-8 px-3 text-xs text-slate-400 hover:text-white"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
