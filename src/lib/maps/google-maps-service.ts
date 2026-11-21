import { locationCache } from "./location-cache";

export interface AreaCandidateWithSource {
  name: string;
  source: "google_geocode" | "address_parse" | "nearby_place";
  confidence: number;
  type?: string;
}

export interface GoogleGeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
  placeName?: string;
  city: string;
  district?: string;
  state: string;
  pincode: string;
  areaCandidates: AreaCandidateWithSource[];
  detectedAreaName: string;
  types: string[];
}

export const FORBIDDEN_TYPES = new Set([
  "locality",
  "administrative_area_level_1",
  "administrative_area_level_2",
  "administrative_area_level_3",
  "administrative_area_level_4",
  "administrative_area_level_5",
  "country",
  "postal_code",
  "postal_code_prefix",
  "postal_code_suffix",
  "street_number",
  "floor",
  "room",
]);

const FORBIDDEN_NAMES = new Set([
  "vijayawada",
  "guntur",
  "amaravati",
  "amaravathi",
  "ntr",
  "krishna",
  "ntr district",
  "krishna district",
  "guntur district",
  "andhra pradesh",
  "ap",
  "india",
]);

/**
 * Checks if a candidate area name is forbidden (city, district, state, country, or invalid identifier).
 */
export function isForbiddenAreaName(
  name?: string,
  city?: string,
  district?: string,
  state?: string
): boolean {
  if (!name) return true;
  const clean = name.trim().toLowerCase();
  if (!clean || clean.length < 2) return true;

  if (city && clean === city.trim().toLowerCase()) return true;
  if (district && clean === district.trim().toLowerCase()) return true;
  if (state && clean === state.trim().toLowerCase()) return true;

  if (FORBIDDEN_NAMES.has(clean)) return true;
  if (clean.includes("district") || clean.includes("andhra pradesh")) return true;

  // Ignore Plus Codes (e.g. "8F78+4X Vijayawada")
  if (/^[2-9cfghjmrv]{4,8}\+[2-9cfghjmrv]{2,}/i.test(clean)) return true;

  // Ignore pure numeric / door numbers
  if (/^\d+[-\/]?\d*$/.test(clean)) return true;

  return false;
}

export function getGoogleMapsServerKey(): string {
  const key =
    process.env.GOOGLE_MAPS_SERVER_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY;

  return (key || "").trim();
}

export function roundCoord(coord: number): number {
  return Math.round(coord * 100000) / 100000;
}

/**
 * Parses formattedAddress to extract area/neighborhood names before the city
 * Takes 1-2 comma segments before the city, ignoring door numbers, plus codes, and bare road names.
 */
export function parseAreaFromFormattedAddress(
  formattedAddress: string,
  city: string,
  district?: string,
  state?: string
): AreaCandidateWithSource[] {
  if (!formattedAddress) return [];

  const candidates: AreaCandidateWithSource[] = [];
  const segments = formattedAddress.split(",").map((s) => s.trim()).filter(Boolean);
  if (segments.length < 2) return [];

  const cleanCity = (city || "").toLowerCase().trim();
  let cityIdx = -1;

  for (let i = 0; i < segments.length; i++) {
    const segLower = segments[i].toLowerCase();
    if (cleanCity && (segLower === cleanCity || segLower.includes(cleanCity))) {
      cityIdx = i;
      break;
    }
  }

  const isInvalidSegment = (text: string): boolean => {
    if (isForbiddenAreaName(text, city, district, state)) return true;

    // Ignore door numbers / plot numbers
    if (/^(?:d\.?\s*no|plot|flat|h\.?\s*no|door|#|\d+[-\/]\d+|\d+)/i.test(text)) return true;

    // Ignore plus codes
    if (/^[2-9cfghjmrv]{4}\+[2-9cfghjmrv]{2,}/i.test(text)) return true;

    // Ignore bare road names
    if (/^(?:road|rd|highway|nh\s*\d+|bypass|main road|cross road|lane|street)$/i.test(text)) {
      return true;
    }

    return false;
  };

  if (cityIdx > 0) {
    // Check 1 segment immediately before city (e.g. segments[cityIdx - 1])
    const seg1 = segments[cityIdx - 1];
    if (seg1 && !isInvalidSegment(seg1)) {
      candidates.push({
        name: seg1,
        source: "address_parse",
        confidence: 0.90,
      });
    }

    // Check 2 segments before city (e.g. segments[cityIdx - 2])
    if (cityIdx >= 2) {
      const seg2 = segments[cityIdx - 2];
      if (seg2 && !isInvalidSegment(seg2) && seg2 !== seg1) {
        candidates.push({
          name: seg2,
          source: "address_parse",
          confidence: 0.88,
        });
      }
    }
  }

  return candidates;
}

/**
 * Searches nearby places within 300m radius using Google Places API (New) or Nearby Search
 */
export async function searchNearbyAreasGoogle(
  lat: number,
  lng: number,
  city: string,
  district?: string,
  state?: string
): Promise<AreaCandidateWithSource[]> {
  const apiKey = getGoogleMapsServerKey();
  if (!apiKey) return [];

  const candidates: AreaCandidateWithSource[] = [];
  const seen = new Set<string>();

  // Attempt Places Nearby Search (New or Classic)
  try {
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=300&key=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      if (data.results && Array.isArray(data.results)) {
        for (const place of data.results.slice(0, 8)) {
          // Check place name if it looks like a residential colony/nagar/area
          const name = place.name?.trim();
          if (
            name &&
            !isForbiddenAreaName(name, city, district, state) &&
            /(?:nagar|colony|enclave|layout|puri|puram|circle|heights|residence|apartments)/i.test(name)
          ) {
            const lower = name.toLowerCase();
            if (!seen.has(lower)) {
              seen.add(lower);
              candidates.push({
                name,
                source: "nearby_place",
                confidence: 0.85,
                type: "neighborhood_landmark",
              });
            }
          }

          // Check vicinity
          if (place.vicinity) {
            const vicParts = place.vicinity.split(",").map((s: string) => s.trim());
            for (const part of vicParts) {
              if (
                part &&
                !isForbiddenAreaName(part, city, district, state) &&
                /(?:nagar|colony|enclave|layout|puri|puram|road|corridor)/i.test(part)
              ) {
                const lower = part.toLowerCase();
                if (!seen.has(lower)) {
                  seen.add(lower);
                  candidates.push({
                    name: part,
                    source: "nearby_place",
                    confidence: 0.84,
                    type: "vicinity_area",
                  });
                }
              }
            }
          }
        }
      }
    }
  } catch {}

  return candidates;
}

/**
 * Reverse geocodes coordinates via Google Geocoding API:
 * 1. Scans ALL results with NO result_type filter in priority order (sublocality_level_3/2/1, sublocality, neighborhood).
 * 2. Filters out any candidate matching resolved city, district, state, country, or postal_code.
 * 3. Falls back to parsing formattedAddress (1-2 comma segments before city).
 * 4. Falls back to Places Nearby Search (300m radius).
 */
export async function reverseGeocodeGoogle(
  lat: number,
  lng: number
): Promise<GoogleGeocodeResult | null> {
  const apiKey = getGoogleMapsServerKey();
  if (!apiKey) {
    throw new Error("QUOTA: Google Maps server API key is not configured");
  }

  const cacheKey = `geo_v2:${roundCoord(lat)}:${roundCoord(lng)}`;
  const cached = await locationCache.get(cacheKey);
  if (cached) {
    return cached as GoogleGeocodeResult;
  }

  // Call Geocoding API with NO result_type filter to inspect ALL results
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=en&region=in&key=${apiKey}`;

  let geoData: any = null;
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(7000),
    });
    if (res.ok) {
      geoData = await res.json();
    }
  } catch (err: any) {
    console.warn("[reverseGeocodeGoogle fetch warning]:", err.message);
  }

  let city = "Vijayawada";
  let district = "";
  let state = "Andhra Pradesh";
  let pincode = "";
  let formattedAddress = "";
  const allResults = geoData?.results && Array.isArray(geoData.results) ? geoData.results : [];

  if (allResults.length > 0) {
    formattedAddress = allResults[0].formatted_address || "";

    // First pass: resolve city, district, state, pincode from all results
    for (const result of allResults) {
      for (const comp of result.address_components || []) {
        const types: string[] = comp.types || [];
        const name: string = comp.long_name?.trim() || "";
        if (!name) continue;

        if (types.includes("locality") && !city) {
          city = name;
        }
        if (types.includes("administrative_area_level_2") && !district) {
          district = name;
          if (!city) city = name;
        }
        if (types.includes("administrative_area_level_1")) {
          state = name;
        }
        if (types.includes("postal_code") && !pincode) {
          pincode = name;
        }
      }
    }
  }

  const areaCandidatesMap = new Map<string, AreaCandidateWithSource>();

  // ─── TIER 1: Scan ALL Geocoding results in priority order ───────────────────
  // Order: sublocality_level_3 > sublocality_level_2 > sublocality_level_1 > sublocality > neighborhood
  const PRIORITY_TYPES = [
    "sublocality_level_3",
    "sublocality_level_2",
    "sublocality_level_1",
    "sublocality",
    "neighborhood",
  ];

  for (const targetType of PRIORITY_TYPES) {
    for (const result of allResults) {
      for (const comp of result.address_components || []) {
        const types: string[] = comp.types || [];
        const name: string = comp.long_name?.trim() || "";
        if (!name) continue;

        if (types.includes(targetType)) {
          // STRICT RULE: Reject if equal to city, district, state, country, or postal_code
          if (isForbiddenAreaName(name, city, district, state)) continue;

          // Reject if component types include forbidden jurisdiction types without sublocality
          const hasForbiddenType = types.some((t) => FORBIDDEN_TYPES.has(t) && !PRIORITY_TYPES.includes(t));
          if (hasForbiddenType) continue;

          const lower = name.toLowerCase();
          if (!areaCandidatesMap.has(lower)) {
            areaCandidatesMap.set(lower, {
              name,
              source: "google_geocode",
              confidence: 0.95,
              type: targetType,
            });
          }
        }
      }
    }
  }

  // ─── TIER 2: Parse formattedAddress if Tier 1 returned nothing ───────────────
  if (areaCandidatesMap.size === 0 && formattedAddress) {
    const parsedAddrCandidates = parseAreaFromFormattedAddress(
      formattedAddress,
      city,
      district,
      state
    );
    for (const cand of parsedAddrCandidates) {
      const lower = cand.name.toLowerCase();
      if (!areaCandidatesMap.has(lower)) {
        areaCandidatesMap.set(lower, cand);
      }
    }
  }

  // ─── TIER 3: Places Nearby Search (300m) if still nothing ───────────────────
  if (areaCandidatesMap.size === 0) {
    const nearbyCandidates = await searchNearbyAreasGoogle(
      lat,
      lng,
      city,
      district,
      state
    );
    for (const cand of nearbyCandidates) {
      const lower = cand.name.toLowerCase();
      if (!areaCandidatesMap.has(lower)) {
        areaCandidatesMap.set(lower, cand);
      }
    }
  }

  const areaCandidates = Array.from(areaCandidatesMap.values());
  const detectedAreaName = areaCandidates[0]?.name || "";

  const finalResult: GoogleGeocodeResult = {
    lat,
    lng,
    formattedAddress,
    city: city || "Vijayawada",
    district,
    state: state || "Andhra Pradesh",
    pincode,
    areaCandidates,
    detectedAreaName,
    types: allResults[0]?.types || [],
  };

  await locationCache.set(cacheKey, finalResult, 86400);
  return finalResult;
}

/**
 * Fetches Place Details by place_id
 */
export async function getPlaceDetailsGoogle(
  placeId: string
): Promise<{
  lat: number;
  lng: number;
  name?: string;
  formattedAddress?: string;
  addressComponents?: Array<{ long_name: string; short_name: string; types: string[] }>;
} | null> {
  const apiKey = getGoogleMapsServerKey();
  if (!apiKey) return null;

  const cacheKey = `place_v2:${placeId}`;
  const cached = await locationCache.get(cacheKey);
  if (cached) return cached;

  const classicUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,geometry,formatted_address,address_components&key=${apiKey}`;
  try {
    const classicRes = await fetch(classicUrl, {
      method: "GET",
      signal: AbortSignal.timeout(6000),
    });

    if (classicRes.ok) {
      const classicData = await classicRes.json();
      if (classicData.result?.geometry?.location) {
        const result = {
          lat: classicData.result.geometry.location.lat,
          lng: classicData.result.geometry.location.lng,
          name: classicData.result.name || "",
          formattedAddress: classicData.result.formatted_address || "",
          addressComponents: classicData.result.address_components || [],
        };
        await locationCache.set(cacheKey, result, 86400);
        return result;
      }
    }
  } catch {}

  return null;
}

/**
 * Searches for a place by text query with optional location bias
 */
export async function searchPlaceGoogle(
  query: string,
  biasLat?: number,
  biasLng?: number
): Promise<{ lat: number; lng: number; name?: string; formattedAddress?: string } | null> {
  const apiKey = getGoogleMapsServerKey();
  if (!apiKey) return null;

  const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&language=en&region=in&key=${apiKey}`;
  try {
    const geoRes = await fetch(geoUrl, {
      method: "GET",
      signal: AbortSignal.timeout(6000),
    });

    if (geoRes.ok) {
      const geoData = await geoRes.json();
      const result = geoData.results?.[0];
      if (result?.geometry?.location) {
        return {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
          name: query,
          formattedAddress: result.formatted_address || "",
        };
      }
    }
  } catch {}

  return null;
}
