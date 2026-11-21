import type { SublocationRecord, SublocationAliasRecord } from "@/lib/data/sublocations";
import { isForbiddenAreaName } from "./google-maps-service";

export interface SublocationCandidate {
  id?: string;
  name: string;
  source: "exact" | "alias" | "fuzzy" | "proximity";
  confidence: number;
  distanceMeters?: number;
}

export interface MatchSublocationResult {
  detectedName: string;
  candidates: SublocationCandidate[];
  match: { id: string; name: string; confidence: number } | null;
  status: "matched" | "suggested" | "new" | "none";
}

/**
 * Normalizes text for matching: lowercase, strip punctuation, condense whitespace
 */
export function normalizeSublocationText(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Strips common suffix/prefix words (road, nagar, colony, circle, etc.) for deeper fuzzy comparison
 */
export function stripGenericWords(text: string): string {
  return normalizeSublocationText(text)
    .replace(/\b(road|nagar|colony|circle|center|centre|junction|town|extension|layout|bypass)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Standard Levenshtein distance
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const matrix: number[][] = [];
  for (let i = 0; i <= m; i++) matrix[i] = [i];
  for (let j = 0; j <= n; j++) matrix[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[m][n];
}

/**
 * Jaccard / Token-set similarity (0 to 1)
 */
export function tokenSetRatio(a: string, b: string): number {
  const setA = new Set(a.split(" ").filter(Boolean));
  const setB = new Set(b.split(" ").filter(Boolean));
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }

  const union = new Set([...setA, ...setB]).size;
  return union > 0 ? intersection / union : 0;
}

/**
 * Haversine formula in meters
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Matches a detected sublocation name and/or coordinates to master sublocations.
 */
export function matchSublocation({
  detectedName,
  pinLat,
  pinLng,
  cityId,
  masterList,
  aliasList = [],
}: {
  detectedName?: string;
  pinLat?: number | null;
  pinLng?: number | null;
  cityId?: string;
  masterList: SublocationRecord[];
  aliasList?: SublocationAliasRecord[];
}): MatchSublocationResult {
  // STRICT RULE: Reject detectedName if it is a city, district, state, country, or invalid
  const isForbidden = isForbiddenAreaName(detectedName, cityId);
  const cleanDetected = isForbidden ? "" : (detectedName || "").trim();
  const normDetected = normalizeSublocationText(cleanDetected);
  const strippedDetected = stripGenericWords(cleanDetected);

  const candidatesMap = new Map<string, SublocationCandidate>();

  const cityScopedMasters = cityId
    ? masterList.filter((m) => m.city_id.toLowerCase() === cityId.toLowerCase())
    : masterList;

  const cityScopedAliases = cityId
    ? aliasList.filter((a) => a.city_id.toLowerCase() === cityId.toLowerCase())
    : aliasList;

  if (normDetected) {
    // 1. Exact match on normalized master sublocation name -> confidence 1.0
    for (const master of cityScopedMasters) {
      const masterNorm = normalizeSublocationText(master.name);
      if (masterNorm === normDetected) {
        candidatesMap.set(master.id, {
          id: master.id,
          name: master.name,
          source: "exact",
          confidence: 1.0,
        });
      }
    }

    // 2. Exact match on alias -> confidence 0.96
    for (const aliasRec of cityScopedAliases) {
      if (aliasRec.alias_normalized === normDetected) {
        const parent = masterList.find((m) => m.id === aliasRec.sublocation_id);
        if (parent) {
          const existing = candidatesMap.get(parent.id);
          if (!existing || existing.confidence < 0.96) {
            candidatesMap.set(parent.id, {
              id: parent.id,
              name: parent.name,
              source: "alias",
              confidence: 0.96,
            });
          }
        }
      }
    }

    // 3. Fuzzy matches (Levenshtein <= 2 or tokenSetRatio >= 0.85) -> confidence 0.90 to 0.93
    for (const master of cityScopedMasters) {
      if (candidatesMap.has(master.id)) continue;

      const masterNorm = normalizeSublocationText(master.name);
      const masterStripped = stripGenericWords(master.name);

      const lev = Math.min(
        levenshteinDistance(masterNorm, normDetected),
        strippedDetected && masterStripped ? levenshteinDistance(masterStripped, strippedDetected) : 999
      );

      const ratio = Math.max(
        tokenSetRatio(masterNorm, normDetected),
        strippedDetected && masterStripped ? tokenSetRatio(masterStripped, strippedDetected) : 0
      );

      if (lev <= 1) {
        candidatesMap.set(master.id, {
          id: master.id,
          name: master.name,
          source: "fuzzy",
          confidence: 0.93,
        });
      } else if (lev <= 2 || ratio >= 0.85) {
        candidatesMap.set(master.id, {
          id: master.id,
          name: master.name,
          source: "fuzzy",
          confidence: 0.90,
        });
      }
    }
  }

  // 4. Proximity Match (nearest within 2.0 km, confidence capped at 0.85 so NEVER auto-selected)
  if (pinLat != null && pinLng != null) {
    for (const master of cityScopedMasters) {
      if (master.lat != null && master.lng != null) {
        const dist = calculateDistanceMeters(pinLat, pinLng, master.lat, master.lng);
        if (dist <= 2000) {
          // Linear decay from 0.85 at 0m to 0.60 at 2000m
          const proximityConfidence = Math.max(0.6, 0.85 - (dist / 2000) * 0.25);
          const cappedConfidence = Math.min(0.85, parseFloat(proximityConfidence.toFixed(2)));

          const existing = candidatesMap.get(master.id);
          if (!existing) {
            candidatesMap.set(master.id, {
              id: master.id,
              name: master.name,
              source: "proximity",
              confidence: cappedConfidence,
              distanceMeters: Math.round(dist),
            });
          }
        }
      }
    }
  }

  // Sort candidates by confidence desc
  const sortedCandidates = Array.from(candidatesMap.values()).sort(
    (a, b) => b.confidence - a.confidence
  );

  // Check auto-select criteria:
  // Auto-select ONLY if exactly one candidate has confidence >= 0.90
  const strongCandidates = sortedCandidates.filter((c) => c.confidence >= 0.90);

  if (strongCandidates.length === 1 && strongCandidates[0].id) {
    return {
      detectedName: cleanDetected,
      candidates: sortedCandidates,
      match: {
        id: strongCandidates[0].id,
        name: strongCandidates[0].name,
        confidence: strongCandidates[0].confidence,
      },
      status: "matched",
    };
  }

  if (sortedCandidates.length > 0) {
    return {
      detectedName: cleanDetected,
      candidates: sortedCandidates,
      match: null,
      status: "suggested",
    };
  }

  if (cleanDetected) {
    return {
      detectedName: cleanDetected,
      candidates: [],
      match: null,
      status: "new",
    };
  }

  return {
    detectedName: "",
    candidates: [],
    match: null,
    status: "none",
  };
}

