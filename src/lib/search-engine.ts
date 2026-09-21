import type { Property } from "@/types/property";
import type { Project, ProjectConfig } from "@/types/project";
import { isCrdaVerified } from "@/lib/listing-quality";
import type { FilterState } from "@/components/search/search-filters";

/** Older configurations can have a BHK label without the numeric bedrooms field. */
function configurationBedrooms(config: ProjectConfig): number {
  const explicit = Number(config.bedrooms);
  if (Number.isInteger(explicit) && explicit > 0) return explicit;
  const match = normalizeRealEstateText(config.label || "").match(/\b(\d+)\s*(?:bhk|bk|bedrooms?|beds?|b\.h\.k)\b/i);
  return match ? Number(match[1]) : 0;
}

export interface ParsedSearchIntent {
  rawQuery: string;
  normalizedQuery: string;
  tokens: string[];
  bhks: number[];
  propertyTypes: string[];
  listingType?: "sale" | "rent";
  saleType?: "new" | "resale";
  isGatedCommunity?: boolean;
  minPrice?: number;
  maxPrice?: number;
  locationKeywords: string[];
  specificKeywords: string[];
  // 10/10 Natural Language & Spatial Intelligence
  landmark?: {
    name: string;
    latitude: number;
    longitude: number;
    maxDistanceKm: number;
  };
  facings?: string[];
  minAreaSqYds?: number;
  maxAreaSqYds?: number;
  corrections?: Array<{ original: string; corrected: string }>;
}

/**
 * Fast Levenshtein distance calculation for typo tolerance
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const row = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) row[j] = j;

  for (let i = 1; i <= a.length; i++) {
    let prev = i;
    for (let j = 1; j <= b.length; j++) {
      const val = a[i - 1] === b[j - 1] ? row[j - 1] : Math.min(row[j - 1], row[j], prev) + 1;
      row[j - 1] = prev;
      prev = val;
    }
    row[b.length] = prev;
  }
  return row[b.length];
}

/**
 * Returns true if word is within typo tolerance of target.
 * For length <= 4: exact match only (avoids false positives like rent/bent)
 * For length 5-7: 1 edit allowed (e.g. guntor -> guntur, villla -> villa)
 * For length >= 8: 2 edits allowed (e.g. mangalagirii -> mangalagiri, vijaywada -> vijayawada)
 */
export function isFuzzyMatch(word: string, target: string, maxDistance?: number): boolean {
  if (word === target) return true;
  const maxLen = Math.max(word.length, target.length);
  const allowed = maxDistance !== undefined ? maxDistance : (maxLen <= 4 ? 0 : maxLen <= 7 ? 1 : 2);
  if (Math.abs(word.length - target.length) > allowed) return false;
  return levenshteinDistance(word, target) <= allowed;
}

export interface KnownLandmark {
  name: string;
  aliases: string[];
  latitude: number;
  longitude: number;
  maxDistanceKm: number;
}

/**
 * AP Key Landmarks for natural language spatial proximity queries ("near AIIMS", "near Trendset", etc.)
 */
export const AP_LANDMARKS: KnownLandmark[] = [
  {
    name: "AIIMS Mangalagiri",
    aliases: ["aiims", "aiims hospital", "aiims mangalagiri"],
    latitude: 16.4402,
    longitude: 80.5756,
    maxDistanceKm: 12,
  },
  {
    name: "Benz Circle",
    aliases: ["benz circle", "benz circle flyover", "trendset mall", "trendset"],
    latitude: 16.5000,
    longitude: 80.6470,
    maxDistanceKm: 10,
  },
  {
    name: "Gannavaram Airport",
    aliases: ["airport", "vijayawada airport", "gannavaram airport"],
    latitude: 16.5304,
    longitude: 80.7968,
    maxDistanceKm: 15,
  },
  {
    name: "Prakasam Barrage",
    aliases: ["prakasam barrage", "barrage", "krishna river barrage"],
    latitude: 16.5065,
    longitude: 80.6053,
    maxDistanceKm: 10,
  },
  {
    name: "VIT-AP University",
    aliases: ["vit", "vit ap", "vit university", "vit-ap"],
    latitude: 16.4952,
    longitude: 80.4992,
    maxDistanceKm: 15,
  },
  {
    name: "SRM-AP University",
    aliases: ["srm", "srm ap", "srm university", "srm-ap"],
    latitude: 16.4674,
    longitude: 80.5055,
    maxDistanceKm: 15,
  },
  {
    name: "Velagapudi Secretariat",
    aliases: ["secretariat", "ap secretariat", "velagapudi secretariat", "assembly"],
    latitude: 16.5414,
    longitude: 80.5155,
    maxDistanceKm: 15,
  },
  {
    name: "PB Siddhartha College",
    aliases: ["pb siddhartha", "siddhartha college", "siddhartha academy"],
    latitude: 16.5020,
    longitude: 80.6550,
    maxDistanceKm: 10,
  },
  {
    name: "Kanaka Durga Temple",
    aliases: ["kanaka durga temple", "durga temple", "indrakeeladri"],
    latitude: 16.5158,
    longitude: 80.6075,
    maxDistanceKm: 10,
  },
  {
    name: "Auto Nagar Vijayawada",
    aliases: ["auto nagar", "autonagar"],
    latitude: 16.4925,
    longitude: 80.6720,
    maxDistanceKm: 10,
  },
  {
    name: "Acharya Nagarjuna University",
    aliases: ["anu", "nagarjuna university", "acharya nagarjuna university"],
    latitude: 16.3742,
    longitude: 80.5255,
    maxDistanceKm: 15,
  }
];

/**
 * Geodesic distance in kilometers using the Haversine formula
 */
export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Normalizes text, removes punctuation, handles slang and contractions
 */
export function normalizeRealEstateText(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/\bamaravathi\b/g, "amaravati")
    .replace(/\bedupugalu\b/g, "edupugallu")
    .replace(/\bb\.h\.k\.?/g, "bhk")
    .replace(/₹/g, " ")
    .replace(/(\d),(?=\d)/g, "$1")
    .replace(/[,;+&/\\()\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Intelligent Real Estate Query Parser
 */
export function parseSearchIntent(query: string): ParsedSearchIntent {
  const norm = normalizeRealEstateText(query);
  const words = norm.split(" ").filter(Boolean);

  const bhks = new Set<number>();
  const propertyTypes = new Set<string>();
  const locationKeywords: string[] = [];
  const corrections: Array<{ original: string; corrected: string }> = [];

  // 1. Detect BHK patterns: 1bhk, 2bhk, 3bhk, 4bhk, 5bhk, 1bk, 2bk, 3bk, 4bk, 5bk, 3 bhk, 3 bed, 3 bedroom
  const bhkRegex = /\b(\d+)\s*(?:bhk|bk|bed|beds|bedroom|bedrooms|b\.h\.k|rk)\b/gi;
  let bhkMatch;
  while ((bhkMatch = bhkRegex.exec(norm)) !== null) {
    const num = parseInt(bhkMatch[1], 10);
    if (num >= 1 && num <= 10) bhks.add(num);
  }

  // Check standalone tokens like "3bhk", "3bk", "2bk"
  for (const w of words) {
    const standaloneMatch = w.match(/^(\d+)(?:bhk|bk|rk|bed)$/i);
    if (standaloneMatch) {
      const num = parseInt(standaloneMatch[1], 10);
      if (num >= 1 && num <= 10) bhks.add(num);
    }
  }

  // 2. Detect Property Types (with typo tolerance)
  if (/\b(?:apartment|apartments|appartment|apartmnt|flat|flats|flatts|penthouse|penthuose|studio|highrise|society)\b/i.test(norm)) {
    propertyTypes.add("apartment");
  }
  if (/\b(?:villa|villas|villla|vilas|vila|row\s*house|bungalow|duplex|duplexx|independent\s*house|individual\s*house|independant\s*house|house|houses)\b/i.test(norm)) {
    propertyTypes.add("villa");
    propertyTypes.add("independent-house");
  }
  if (/\b(?:plot|plots|ploat|ploats|plott|land|lands|landd|site|sites|layout|layouts|venture|ventures|crda)\b/i.test(norm)) {
    propertyTypes.add("residential-land");
    propertyTypes.add("venture");
  }
  if (/\b(?:farm|farms|farmhouse|farming|organic|agriculture|agricultural|agri)\b/i.test(norm)) {
    propertyTypes.add("farmhouse");
    propertyTypes.add("agricultural-land");
  }
  if (/\b(?:commercial|comercial|commerical|office|offce|shop|shops|shopp|showroom|warehouse|industrial|building|buildings)\b/i.test(norm)) {
    propertyTypes.add("commercial-spaces");
    propertyTypes.add("shops");
    propertyTypes.add("buildings");
  }

  // 3. Detect Listing Type & Sale Type (New / Resale / Old / Rent / Sale)
  let detectedListingType: "sale" | "rent" | undefined = undefined;
  let detectedSaleType: "new" | "resale" | undefined = undefined;

  if (/\b(?:resale|old|used|pre-owned|preowned|second\s*hand)\b/i.test(norm)) {
    detectedSaleType = "resale";
    detectedListingType = "sale";
  } else if (/\b(?:brand\s*new|new\s*launch|new\s*flat|new\s*flats|new\s*house|new\s*houses|new\s*villa|new\s*villas|new\s*property|new\s*project)\b/i.test(norm)) {
    detectedSaleType = "new";
    detectedListingType = "sale";
  } else if (/\b(?:rent|rental|lease|to\s*rent|for\s*rent)\b/i.test(norm)) {
    detectedListingType = "rent";
  } else if (/\b(?:buy|sale|purchase|for\s*sale)\b/i.test(norm)) {
    detectedListingType = "sale";
  }

  // 4. Detect Gated Community
  let detectedGated: boolean | undefined = undefined;
  if (/\b(?:gated|gated\s*community|township)\b/i.test(norm)) {
    detectedGated = true;
  }

  // 5. Detect Budget terms (e.g. "under 50 lakhs", "under 1 cr", "below 2 crore", "50l", "1cr", "above 80l")
  let detectedMaxPrice: number | undefined = undefined;
  let detectedMinPrice: number | undefined = undefined;

  const underCrMatch = norm.match(/(?:under|below|upto|up\s+to|within|less\s*than|<=|<)\s*(\d+(?:\.\d+)?)\s*(?:cr|crore|crores)\b/i);
  if (underCrMatch) {
    detectedMaxPrice = parseFloat(underCrMatch[1]) * 10000000;
  }
  const underLakhMatch = norm.match(/(?:under|below|upto|up\s+to|within|less\s*than|<=|<)\s*(\d+(?:\.\d+)?)\s*(?:l|lac|lakh|lakhs)\b/i);
  if (underLakhMatch) {
    detectedMaxPrice = parseFloat(underLakhMatch[1]) * 100000;
  }

  const aboveCrMatch = norm.match(/(?:above|more\s*than|min|minimum|>=|>)\s*(\d+(?:\.\d+)?)\s*(?:cr|crore|crores)\b/i);
  if (aboveCrMatch) {
    detectedMinPrice = parseFloat(aboveCrMatch[1]) * 10000000;
  }
  const aboveLakhMatch = norm.match(/(?:above|more\s*than|min|minimum|>=|>)\s*(\d+(?:\.\d+)?)\s*(?:l|lac|lakh|lakhs)\b/i);
  if (aboveLakhMatch) {
    detectedMinPrice = parseFloat(aboveLakhMatch[1]) * 100000;
  }

  const range = norm.match(/between\s+(\d+(?:\.\d+)?)\s*(cr|crores?|l|lacs?|lakhs?)?\s+and\s+(\d+(?:\.\d+)?)\s*(cr|crores?|l|lacs?|lakhs?)\b/);
  if (range) {
    const multiplier = (unit: string) => unit.startsWith("cr") ? 10000000 : 100000;
    detectedMinPrice = Number(range[1]) * multiplier(range[2] || range[4]);
    detectedMaxPrice = Number(range[3]) * multiplier(range[4]);
  }

  // 6. AP Regional Land & Area Units (Gajalu / Gajam, Cents, Ankanam)
  let detectedMinAreaSqYds: number | undefined = undefined;
  let detectedMaxAreaSqYds: number | undefined = undefined;

  const gajaluMatch = norm.match(/(?:under|below|upto|within|<=|<)?\s*(\d+(?:\.\d+)?)\s*(?:gajalu|gajam|sq\s*yds?|sq\s*yards?)\b/i);
  if (gajaluMatch) {
    detectedMaxAreaSqYds = parseFloat(gajaluMatch[1]);
  }
  const centsMatch = norm.match(/(?:under|below|upto|within|<=|<)?\s*(\d+(?:\.\d+)?)\s*cents?\b/i);
  if (centsMatch) {
    detectedMaxAreaSqYds = parseFloat(centsMatch[1]) * 48.4;
  }
  const ankanamMatch = norm.match(/(?:under|below|upto|within|<=|<)?\s*(\d+(?:\.\d+)?)\s*ankanam\b/i);
  if (ankanamMatch) {
    detectedMaxAreaSqYds = parseFloat(ankanamMatch[1]) * 8;
  }

  // 7. Facing Alignment (East, West, North, South, Corner)
  const detectedFacings: string[] = [];
  const facingRegex = /\b(east|west|north|south|north-east|north-west|south-east|south-west|northeast|northwest|southeast|southwest|corner)\s*(?:facing|face)?\b/gi;
  let facingMatch;
  while ((facingMatch = facingRegex.exec(norm)) !== null) {
    const f = facingMatch[1].toLowerCase().replace("-", "");
    if (!detectedFacings.includes(f)) detectedFacings.push(f);
  }

  // 8. Landmark Proximity Detection ("near AIIMS", "near Trendset Mall", "near VIT")
  let detectedLandmark: ParsedSearchIntent["landmark"] = undefined;
  for (const lm of AP_LANDMARKS) {
    const isPurePoi = !["Benz Circle", "Auto Nagar Vijayawada"].includes(lm.name);
    const hasAlias = lm.aliases.some(alias => {
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s*");
      if (isPurePoi) {
        const regex = new RegExp(`(?:near|close\\s*to|around|opposite|opp|adj(?:acent)?\\s*to)?\\s*\\b${escaped}\\b`, "i");
        return regex.test(norm);
      } else {
        const regex = new RegExp(`(?:near|close\\s*to|around|opposite|opp|adj(?:acent)?\\s*to)\\s*\\b${escaped}\\b`, "i");
        return regex.test(norm);
      }
    });
    if (hasAlias) {
      detectedLandmark = {
        name: lm.name,
        latitude: lm.latitude,
        longitude: lm.longitude,
        maxDistanceKm: lm.maxDistanceKm,
      };
      break;
    }
  }

  // 9. Common AP Real Estate Localities & Cities with Typo Tolerance
  const KNOWN_PLACES = [
    "vijayawada", "guntur", "amaravati", "vizag", "visakhapatnam", "mangalagiri",
    "tadepalli", "poranki", "kanuru", "benz circle", "auto nagar", "gorantla",
    "brodipet", "pattabhipuram", "gannavaram", "kaza", "penamaluru", "patamata",
    "gunadala", "bhavanipuram", "machilipatnam", "tenali", "kankipadu", "nunna",
    "ennikepadu", "ramavarappadu", "gollapudi", "prasadampadu", "nidamanuru",
    "edupugallu", "yenamalakuduru", "payakapuram", "ayodhya nagar", "mg road"
  ];

  const matchedPlaces = new Set<string>();

  // Exact substring containment first
  for (const place of KNOWN_PLACES) {
    if ((" " + norm + " ").includes(" " + place + " ")) {
      matchedPlaces.add(place);
      locationKeywords.push(place);
    }
  }

  // Fuzzy match single tokens against known places (e.g. "mangalagirii" -> "mangalagiri", "vijaywada" -> "vijayawada")
  for (const w of words) {
    if (w.length >= 5) {
      for (const place of KNOWN_PLACES) {
        if (!place.includes(" ") && !matchedPlaces.has(place) && isFuzzyMatch(w, place)) {
          matchedPlaces.add(place);
          locationKeywords.push(place);
          if (w !== place) {
            corrections.push({ original: w, corrected: place });
          }
        }
      }
    }
  }

  // Check multi-word known places with minor typo in secondary token (e.g. "benz circel")
  for (const place of KNOWN_PLACES) {
    if (place.includes(" ") && !matchedPlaces.has(place)) {
      const placeTokens = place.split(" ");
      const matchesAllTokens = placeTokens.every(pt => words.some(w => isFuzzyMatch(w, pt)));
      if (matchesAllTokens) {
        matchedPlaces.add(place);
        locationKeywords.push(place);
        corrections.push({ original: norm, corrected: place });
      }
    }
  }

  // Common Real Estate noise / stop words that shouldn't restrict name matching
  const STOP_WORDS = new Set([
    "between", "up", "in", "at", "near", "close", "for", "with", "of", "and", "the", "a", "an", "to", "on", "by", "is", "are", "any", "all",
    "i", "want", "need", "looking", "look", "show", "me", "find", "get", "give", "please", "pls", "best", "top", "good",
    "cheap", "luxury", "budget", "affordable", "premium", "verified", "available", "buy", "rent", "sale", "purchase",
    "bhk", "bk", "rk", "bed", "beds", "bedroom", "bedrooms", "property", "properties", "flat", "flats", "apartment",
    "apartments", "villa", "villas", "house", "houses", "home", "homes", "duplex", "plot", "plots", "land", "lands",
    "venture", "ventures", "commercial", "space", "spaces", "shop", "shops", "building", "buildings", "office", "offices",
    "below", "under", "above", "less", "more", "than", "within", "upto", "lakh", "lakhs", "lac", "lacs", "cr", "crore",
    "crores", "gated", "community", "ready", "move", "new", "old", "resale", "project", "projects", "facing", "road",
    "gajalu", "gajam", "cents", "cent", "ankanam", "east", "west", "north", "south", "corner", "hospital", "mall", "airport", "barrage", "temple"
  ]);

  const landmarkStopTokens = new Set(AP_LANDMARKS.flatMap(l => l.aliases.flatMap(a => a.split(" "))));
  const locationTokens = new Set([
    ...locationKeywords.flatMap(p => p.split(" ")),
    ...corrections.map(c => c.original)
  ]);

  const specificKeywords: string[] = [];
  for (const w of words) {
    if (
      w.length >= 3 &&
      !STOP_WORDS.has(w) &&
      !landmarkStopTokens.has(w) &&
      !locationTokens.has(w) &&
      !w.match(/^\d+(?:\.\d+)?(?:bhk|bk|rk|beds?|bedrooms?|l|lacs?|lakhs?|cr|crores?|k|cents?|gajalu|gajam)?$/i)
    ) {
      specificKeywords.push(w);
    }
  }

  return {
    rawQuery: query,
    normalizedQuery: norm,
    tokens: words,
    bhks: Array.from(bhks),
    propertyTypes: Array.from(propertyTypes),
    listingType: detectedListingType,
    saleType: detectedSaleType,
    isGatedCommunity: detectedGated,
    minPrice: detectedMinPrice,
    maxPrice: detectedMaxPrice,
    locationKeywords,
    specificKeywords,
    landmark: detectedLandmark,
    facings: detectedFacings.length ? detectedFacings : undefined,
    minAreaSqYds: detectedMinAreaSqYds,
    maxAreaSqYds: detectedMaxAreaSqYds,
    corrections: corrections.length ? corrections : undefined
  };
}

const LOCATION_ALIASES: Record<string, string[]> = {
  "benz circle": ["benz circle", "patamata", "mg road", "m.g. road", "bandar road"],
  "amaravati": ["amaravati", "amaravathi", "thullur", "velagapudi", "mandadam", "rayapudi", "nekkallu", "inavolu", "anantavaram", "dharanikota"],
  "guntur": ["guntur", "gorantla", "brodipet", "pattabhipuram", "amaravati road", "kaza", "pedakakani", "vidhyanagar", "nallapadu"],
  "vijayawada": ["vijayawada", "kanuru", "poranki", "penamaluru", "benz circle", "auto nagar", "patamata", "gunadala", "bhavanipuram", "gannavaram", "tadepalli", "mangalagiri", "gollapudi", "prasadampadu", "ramavarappadu", "ennikepadu", "nidamanuru", "edupugallu", "yenamalakuduru", "payakapuram", "ayodhya nagar"],
  "mangalagiri": ["mangalagiri", "kaza", "chinakakani", "aiims", "atmakur"],
  "tadepalli": ["tadepalli", "undavalli", "dolhas nagar", "kolanukonda", "seethanagaram"],
  "vizag": ["vizag", "visakhapatnam", "madhurawada", "gajuwaka", "rushikonda"],
  "visakhapatnam": ["vizag", "visakhapatnam", "madhurawada", "gajuwaka", "rushikonda"],
};

export function matchesStructuredLocation(
  locObj?: { city?: string; locality?: string; address?: string; landmark?: string; state?: string; pincode?: string },
  locationKeywords: string[] = []
): boolean {
  if (!locationKeywords || locationKeywords.length === 0) return true;
  if (!locObj) return false;

  const city = (locObj.city || "").toLowerCase().trim();
  const locality = (locObj.locality || "").toLowerCase().trim();
  const address = (locObj.address || "").toLowerCase().trim();
  const landmark = (locObj.landmark || "").toLowerCase().trim();
  const pincode = (locObj.pincode || "").toLowerCase().trim();

  const structuredCorpus = normalizeRealEstateText(`${city} ${locality} ${address} ${landmark} ${pincode}`);
  const corpusTokens = structuredCorpus.split(" ").filter(Boolean);

  return locationKeywords.every((kw) => {
    const target = normalizeRealEstateText(kw);
    if (!target) return true;

    // Direct match in structured location fields
    if (structuredCorpus.includes(target)) return true;

    // Check locality / alias expansions
    const aliases = LOCATION_ALIASES[target];
    if (aliases && aliases.some((alias) => structuredCorpus.includes(alias))) {
      return true;
    }

    // Token-level fuzzy match against structured location tokens
    const targetTokens = target.split(" ").filter(Boolean);
    if (targetTokens.length > 0) {
      const allTokensMatch = targetTokens.every(tTok =>
        corpusTokens.some(cTok => isFuzzyMatch(tTok, cTok))
      );
      if (allTokensMatch) return true;
    }

    return false;
  });
}

/**
 * Strict verification of explicit gated community evidence for Properties
 */
export function hasGatedEvidenceProperty(property: Property): boolean {
  const structuredGated = property.attributes?.gatedCommunity;
  if (structuredGated === false || structuredGated === "no") return false;
  if (structuredGated === true || structuredGated === "yes") return true;
  const pRecord = property as unknown as Record<string, unknown>;
  if (pRecord.gatedCommunity === true || pRecord.isGatedCommunity === true || pRecord.gatedSecurity === true) {
    return true;
  }
  if (Array.isArray(property.amenities)) {
    const hasAmenity = property.amenities.some((a: unknown) => {
      if (typeof a === "object" && a !== null) {
        const rec = a as Record<string, unknown>;
        const id = String(rec.id || "").toLowerCase();
        const name = String(rec.name || "").toLowerCase();
        return id === "gated-security" || name.includes("gated community") || name.includes("gated security") || name.includes("24/7 security & gated");
      }
      if (typeof a === "string") {
        const str = a.toLowerCase();
        return str === "gated-security" || str.includes("gated community") || str.includes("gated security");
      }
      return false;
    });
    if (hasAmenity) return true;
  }
  if (Array.isArray(property.features)) {
    const hasFeature = property.features.some((f: unknown) => {
      const text = (typeof f === "string" ? f : String((f as Record<string, unknown>)?.name || "")).toLowerCase();
      return text.includes("gated community") || text.includes("gated security");
    });
    if (hasFeature) return true;
  }
  return false;
}

/**
 * Strict verification of explicit gated community evidence for Projects
 */
export function hasGatedEvidenceProject(project: Project): boolean {
  const pRecord = project as unknown as Record<string, unknown>;
  if (pRecord.isGated === true || pRecord.gatedCommunity === true || pRecord.isGatedCommunity === true || pRecord.gatedSecurity === true) {
    return true;
  }
  if (Array.isArray(project.highlights)) {
    if (project.highlights.some((h) => /gated\s*(?:community|security)/i.test(h))) return true;
  }
  if (Array.isArray(project.facilities)) {
    if (project.facilities.some((f) => {
      const text = typeof f === "string" ? f : String((f as any)?.name || (f as any)?.label || "");
      return /gated\s*(?:community|security)/i.test(text);
    })) return true;
  }
  const projAmenities = (project as any).amenities;
  if (Array.isArray(projAmenities)) {
    const hasAmenity = projAmenities.some((a: unknown) => {
      const text = (typeof a === "string" ? a : String((a as Record<string, unknown>)?.name || "")).toLowerCase();
      return text.includes("gated community") || text.includes("gated security");
    });
    if (hasAmenity) return true;
  }
  return false;
}

/**
 * Intelligent Project Matcher
 */
export function matchesProjectSearch(project: Project, query: string, parsedIntent?: ParsedSearchIntent): boolean {
  if (!query || !query.trim()) return true;

  const intent = parsedIntent || parseSearchIntent(query);
  const norm = intent.normalizedQuery;

  // Searchable text corpus for the project
  const projLandmark = (project.location as any)?.landmark || "";
  const locationText = `${project.location?.city || ""} ${project.location?.locality || ""} ${project.location?.address || ""} ${projLandmark} ${project.location?.state || ""} ${project.location?.pincode || ""}`.toLowerCase();
  const builderObj = "builder" in project ? (project as { builder?: { name?: string } }).builder : undefined;
  const builderText = `${project.builderName || ""} ${builderObj?.name || ""}`.toLowerCase();
  const projectTypeText = `${project.projectType || ""}`.toLowerCase();
  const configsText = (project.configurations || []).map(c => `${c.label || ""} ${c.bedrooms ? c.bedrooms + "bhk " + c.bedrooms + "bk " + c.bedrooms + " bed" : ""} ${c.facing?.join(" ") || ""}`).join(" ").toLowerCase();
  const tagsText = `${(project.highlights || []).join(" ")} ${(project.facilities || []).map((f: any) => typeof f === 'string' ? f : (f?.name || f?.label || "")).join(" ")}`.toLowerCase();
  const titleAndDesc = `${project.name || ""} ${project.tagline || ""} ${project.description || ""}`.toLowerCase();
  const refText = `${project.refId || ""} ${(project.location as any)?.refId || ""}`.toLowerCase();
  const possessionText = `${project.possessionDate || ""} ${(project.location as any)?.possessionDate || ""}`.toLowerCase();
  const areaText = `${project.totalArea || ""} ${(project.location as any)?.totalArea || ""}`.toLowerCase();

  // Instant direct match if query matches project's Ref ID directly
  const cleanRef = refText.replace(/[\s-_]/g, "");
  const cleanNorm = norm.replace(/[\s-_]/g, "");
  if (cleanNorm && [project.refId, project.location?.refId].some(ref => ref && String(ref).toLowerCase().replace(/[\s-_]/g, "") === cleanNorm)) {
    return true;
  }

  const fullCorpus = `${titleAndDesc} ${locationText} ${builderText} ${projectTypeText} ${configsText} ${tagsText} ${refText} ${possessionText} ${areaText}`;

  // BHK and price must belong to the same offered configuration.
  if ((intent.bhks.length || intent.minPrice !== undefined || intent.maxPrice !== undefined) && !matchingProjectConfigurations(project, {}, intent).length) return false;

  // 3. Listing Type requirement: If user specifically searches for "rent", projects are typically for sale
  if (intent.listingType === "rent") {
    return false;
  }

  // 4. Gated Community requirement: Queries like "gated villa in Guntur" strictly require gated evidence
  if (intent.isGatedCommunity) {
    if (!hasGatedEvidenceProject(project)) {
      return false;
    }
  }

  // 5. Property Type requirement (e.g. "apartment" must not return plot ventures)
  if (intent.propertyTypes.length > 0) {
    const pType = project.projectType?.toLowerCase() || "";
    let typeMatches = false;
    if (intent.propertyTypes.includes(pType)) typeMatches = true;
    if (pType === "venture" && (intent.propertyTypes.includes("residential-land") || intent.propertyTypes.includes("venture"))) typeMatches = true;
    if (pType === "apartment" && intent.propertyTypes.includes("apartment")) typeMatches = true;
    if (pType === "villa" && (intent.propertyTypes.includes("villa") || intent.propertyTypes.includes("independent-house"))) typeMatches = true;

    if (!typeMatches) {
      return false;
    }
  }

  // 6. BHK requirement (e.g. "2 BHK" requires project to offer 2 BHK configs, and excludes plot ventures)
  if (intent.bhks.length > 0) {
    if (project.projectType === "venture") {
      return false;
    }

    const hasMatchingBhk = (project.configurations || []).some(cfg => intent.bhks.includes(configurationBedrooms(cfg)));

    if (!hasMatchingBhk) {
      return false;
    }
  }

  // 7. Hard Location Keywords requirement: Must match structured location fields only
  if (intent.locationKeywords.length > 0) {
    const matchesLoc = matchesStructuredLocation(project.location, intent.locationKeywords);
    if (!matchesLoc) {
      return false;
    }
  }

  // Landmark Proximity requirement ("near AIIMS", "near Benz Circle")
  if (intent.landmark) {
    const lat = project.location?.latitude;
    const lng = project.location?.longitude;
    const maxDist = intent.landmark.maxDistanceKm || 12;
    let matchesProximity = false;
    if (typeof lat === "number" && typeof lng === "number" && !isNaN(lat) && !isNaN(lng)) {
      const dist = haversineDistanceKm(lat, lng, intent.landmark.latitude, intent.landmark.longitude);
      if (dist <= maxDist) matchesProximity = true;
    } else {
      const landmarkAliases = AP_LANDMARKS.find(l => l.name === intent.landmark?.name)?.aliases || [intent.landmark.name.toLowerCase()];
      if (landmarkAliases.some(alias => fullCorpus.includes(alias) || matchesStructuredLocation(project.location, [alias]))) {
        matchesProximity = true;
      }
    }
    if (!matchesProximity) {
      return false;
    }
  }

  // Facing requirement
  if (intent.facings && intent.facings.length > 0) {
    const configs = project.configurations || [];
    const hasConfigFacings = configs.some(c => c.facing && c.facing.length > 0);
    if (hasConfigFacings) {
      const allConfigFacings = configs.flatMap(c => c.facing || []).map(f => f.toLowerCase());
      const hasFacingMatch = intent.facings.some(f => allConfigFacings.some(cf => cf.includes(f)));
      if (!hasFacingMatch) return false;
    }
  }

  // 8. Specific Name / Builder Keywords requirement (with typo tolerance)
  if (intent.specificKeywords.length > 0) {
    const corpusWords = fullCorpus.split(/\s+/).filter(Boolean);
    const allSpecificMatch = intent.specificKeywords.every(kw => {
      if (fullCorpus.includes(kw)) return true;
      if (kw.length >= 5) {
        return corpusWords.some(cw => isFuzzyMatch(kw, cw, 1));
      }
      return false;
    });
    if (!allSpecificMatch) {
      return false;
    }
  }

  return true;
}

/**
 * Intelligent Property Matcher
 */
export function matchesPropertySearch(property: Property, query: string, parsedIntent?: ParsedSearchIntent): boolean {
  if (!query || !query.trim()) return true;

  const intent = parsedIntent || parseSearchIntent(query);

  // Searchable text corpus for the property
  const locationText = `${property.location?.city || ""} ${property.location?.locality || ""} ${property.location?.address || ""} ${property.location?.landmark || ""} ${property.location?.state || ""} ${property.location?.pincode || ""}`.toLowerCase();
  const ownerText = `${property.ownerName || ""} ${property.postedBy || ""}`.toLowerCase();
  const pType = (property.propertyType || "").toLowerCase();
  const pCategory = (property.category || "").toLowerCase();
  const pSubtype = (property.subtype || "").toLowerCase();
  const propertyTypeText = `${pType} ${property.listingType || ""} ${pCategory} ${pSubtype}`.toLowerCase();
  const bhkText = property.bedrooms ? `${property.bedrooms}bhk ${property.bedrooms}bk ${property.bedrooms} bhk ${property.bedrooms} bed ${property.bedrooms} bedroom` : "";
  const tagsText = `${(property.amenities || []).map((a: unknown) => typeof a === "string" ? a : ((a as Record<string, unknown>)?.name as string) || "").join(" ")} ${(property.features || []).map((f: unknown) => typeof f === "string" ? f : ((f as Record<string, unknown>)?.name as string) || "").join(" ")} ${property.refId || ""}`.toLowerCase();
  const titleAndDesc = `${property.title || ""} ${property.description || ""}`.toLowerCase();

  const fullCorpus = `${titleAndDesc} ${locationText} ${ownerText} ${propertyTypeText} ${bhkText} ${tagsText}`;

  // 1. Property Type intent constraint (e.g. searching "apartment" MUST NOT return plots or lands)
  if (intent.propertyTypes.length > 0) {
    let typeMatches = false;
    for (const req of intent.propertyTypes) {
      if (req === pType || req === pSubtype || req === pCategory) {
        typeMatches = true;
        break;
      }
      if (req === "apartment" && (pType.includes("apartment") || pSubtype === "flat" || pSubtype === "pent-house" || pSubtype === "duplex-flat")) {
        typeMatches = true;
        break;
      }
      if ((req === "villa" || req === "independent-house") && (pType.includes("villa") || pType.includes("independent-house") || pSubtype === "villa" || pSubtype === "house")) {
        typeMatches = true;
        break;
      }
      if ((req === "residential-land" || req === "venture") && (pType.includes("land") || pType.includes("plot") || pSubtype === "venture-plot" || pSubtype === "land")) {
        typeMatches = true;
        break;
      }
      if ((req === "commercial-spaces" || req === "shops" || req === "buildings") && (pCategory === "commercial" || pType.includes("commercial") || pType === "shops" || pType === "buildings")) {
        typeMatches = true;
        break;
      }
    }
    if (!typeMatches) {
      return false;
    }
  }

  // 2. BHK intent constraint (e.g. searching "2 BHK" requires a residential property with 2 bedrooms)
  if (intent.bhks.length > 0) {
    const bedrooms = property.bedrooms || 0;
    if (!bedrooms || !intent.bhks.includes(bedrooms)) {
      return false;
    }
  }

  // 3. Listing Type requirement
  if (intent.listingType) {
    const lType = (property.listingType || "").toLowerCase();
    if (intent.listingType === "rent" && lType !== "rent") return false;
    if (intent.listingType === "sale" && lType !== "sale" && lType !== "buy") return false;
  }

  // 4. Sale Type requirement
  if (intent.saleType && property.saleType && property.saleType.toLowerCase() !== intent.saleType) {
    return false;
  }

  // 5. Gated Community requirement: Queries like "gated villa in Guntur" strictly require gated evidence
  if (intent.isGatedCommunity) {
    if (!hasGatedEvidenceProperty(property)) {
      return false;
    }
  }

  // 6. Budget constraint (e.g. "under 50 lakhs")
  if ((intent.minPrice !== undefined || intent.maxPrice !== undefined) && (!(property.price > 0) || property.price < (intent.minPrice ?? 0) || property.price > (intent.maxPrice ?? Infinity))) {
    return false;
  }

  // 7. Hard Location Keywords requirement: Must match structured location fields, NOT marketing descriptions
  if (intent.locationKeywords.length > 0) {
    const matchesLoc = matchesStructuredLocation(property.location, intent.locationKeywords);
    if (!matchesLoc) return false;
  }

  // Landmark Proximity requirement ("near AIIMS", "near Trendset Mall")
  if (intent.landmark) {
    const lat = property.location?.latitude;
    const lng = property.location?.longitude;
    const maxDist = intent.landmark.maxDistanceKm || 12;
    let matchesProximity = false;
    if (typeof lat === "number" && typeof lng === "number" && !isNaN(lat) && !isNaN(lng)) {
      const dist = haversineDistanceKm(lat, lng, intent.landmark.latitude, intent.landmark.longitude);
      if (dist <= maxDist) matchesProximity = true;
    } else {
      const landmarkAliases = AP_LANDMARKS.find(l => l.name === intent.landmark?.name)?.aliases || [intent.landmark.name.toLowerCase()];
      if (landmarkAliases.some(alias => fullCorpus.includes(alias) || matchesStructuredLocation(property.location, [alias]))) {
        matchesProximity = true;
      }
    }
    if (!matchesProximity) {
      return false;
    }
  }

  // Facing requirement
  if (intent.facings && intent.facings.length > 0 && property.facing) {
    const propFacing = property.facing.toLowerCase();
    const hasFacingMatch = intent.facings.some(f => propFacing.includes(f));
    if (!hasFacingMatch) return false;
  }

  // 8. Specific Name / Keywords requirement (with typo tolerance)
  if (intent.specificKeywords.length > 0) {
    const corpusWords = fullCorpus.split(/\s+/).filter(Boolean);
    const allSpecificMatch = intent.specificKeywords.every(kw => {
      if (fullCorpus.includes(kw)) return true;
      if (kw.length >= 5) {
        return corpusWords.some(cw => isFuzzyMatch(kw, cw, 1));
      }
      return false;
    });
    if (!allSpecificMatch) return false;
  }

  return true;
}

/**
 * Complete Multi-Attribute Filter Engine for Properties
 */
export function evaluatePropertyFilters(property: Property, filters: Partial<FilterState> | Record<string, unknown>, currentTimeMs?: number, parsedIntent?: ParsedSearchIntent): boolean {
  if (!filters) return true;

  // 0. Location & Geography (Cities, Localities, Query)
  const propCity = (property.location?.city || "").toLowerCase();
  const propLocality = (property.location?.locality || "").toLowerCase();
  const propAddress = (property.location?.address || "").toLowerCase();
  const propLandmark = (property.location?.landmark || "").toLowerCase();

  // Multiple Cities selection: Match structured location fields only
  if (filters.cities && Array.isArray(filters.cities) && filters.cities.length > 0) {
    const matchesCity = filters.cities.some((c: string) => {
      const target = c.toLowerCase().trim();
      if (!target) return false;
      return matchesStructuredLocation(property.location, [target]);
    });
    if (!matchesCity) return false;
  }

  // Sublocations / Localities selection
  const rawSublocations = ("sublocations" in filters ? (filters as Record<string, unknown>).sublocations : undefined) || filters.localities;
  if (rawSublocations && Array.isArray(rawSublocations) && rawSublocations.length > 0) {
    const matchesSub = (rawSublocations as string[]).some((sub: string) => {
      const target = sub.toLowerCase().trim();
      if (!target) return false;
      return propLocality.includes(target) || propAddress.includes(target) || propLandmark.includes(target);
    });
    if (!matchesSub) return false;
  }

  // Query search matching with intelligent search engine
  if (filters.query && typeof filters.query === "string" && filters.query.trim()) {
    const query = filters.query.trim();
    if (!matchesPropertySearch(property, query, parsedIntent)) {
      return false;
    }
  }

  // 1. Listing Type (Buy/Sale vs Rent vs Commercial vs PG)
  if (filters.listingType && Array.isArray(filters.listingType) && filters.listingType.length > 0) {
    const lType = (property.listingType || "").toLowerCase();
    const matchesListing = filters.listingType.some((req: string) => {
      const r = req.toLowerCase();
      if (r === "buy" || r === "sale") return lType === "sale" || lType === "buy";
      if (r === "rent") return lType === "rent";
      if (r === "pg" || r === "pg-coliving") return lType === "pg" || (property.propertyType || "").toLowerCase() === "pg-coliving";
      if (r === "commercial") return (property.category || "").toLowerCase() === "commercial" || (property.propertyType || "").toLowerCase().includes("commercial");
      return lType === r;
    });
    if (!matchesListing) return false;
  }

  // 2. Budget (Min / Max)
  if (filters.budget && Array.isArray(filters.budget)) {
    const min = filters.budget[0] || 0;
    const max = filters.budget[1] || 100000000;
    if (property.price < min || property.price > max) return false;
  }

  // 3. Property Category / Type
  if (filters.propertyType && Array.isArray(filters.propertyType) && filters.propertyType.length > 0) {
    const pType = (property.propertyType || "").toLowerCase();
    const pCategory = (property.category || "").toLowerCase();
    const pSubtype = (property.subtype || "").toLowerCase();

    const hasMatch = filters.propertyType.some((reqType: string) => {
      const rt = reqType.toLowerCase();
      if (rt === pType || rt === pSubtype || rt === pCategory) return true;
      
      // Strict Gated Community: requires explicit gated evidence
      if (rt === "gated-community") {
        return hasGatedEvidenceProperty(property);
      }

      // Apartment matches
      if (rt === "apartment" && (pType.includes("apartment") || pSubtype === "flat" || pSubtype === "pent-house" || pSubtype === "duplex-flat")) return true;
      
      // Independent House matches
      if ((rt === "independent-house" || rt === "house" || rt === "houses") && (pType.includes("independent-house") || pType.includes("house") || pSubtype.includes("house") || (property.title || "").toLowerCase().includes("house"))) return true;

      // Villa matches
      if (rt === "villa" && (pType.includes("villa") || pSubtype === "villa" || (property.title || "").toLowerCase().includes("villa"))) return true;
      
      // Land & Plot matches for standalone properties
      if ((rt === "residential-land" || rt === "plot" || rt === "residential-plot" || rt === "venture-plot") && (pType.includes("land") || pType.includes("plot") || pSubtype === "venture-plot" || pSubtype === "land")) return true;
      
      // CRDA Ventures & CRDA Approved matches
      if (rt === "venture" || rt === "crda-ventures" || rt === "crda" || rt === "crda-venture") {
        const landApproved = String(property.attributes?.landApprovedBy ?? (property as unknown as Record<string, unknown>).landApprovedBy ?? "").toLowerCase();
        return (pType.includes("land") || pSubtype === "venture-plot" || pSubtype === "land") && (landApproved === "crda" || (property as unknown as Record<string, unknown>).crdaApproved === true);
      }

      // Commercial matches
      if ((rt === "commercial-spaces" || rt === "commercial" || rt === "shops" || rt === "buildings" || rt === "commercial-lands" || rt === "industrial-lands") && (pCategory === "commercial" || pType.includes("commercial") || pType === "shops" || pType === "buildings" || pSubtype === "shop" || pSubtype === "building")) return true;
      
      // PG & Co-living matches
      if ((rt === "pg" || rt === "pg-coliving") && (pType === "pg-coliving" || pType === "pg" || property.listingType === "pg")) return true;
      
      // Farmhouse & Agricultural matches
      if ((rt === "farmhouse" || rt === "agricultural-lands" || rt === "agricultural-land" || rt === "agricultural" || rt === "agriculture") && (pType === "farmhouse" || pType === "agricultural-lands" || pCategory === "agricultural" || pSubtype === "farm-house" || pSubtype === "land" || (property.title || "").toLowerCase().includes("agri") || (property.title || "").toLowerCase().includes("farm"))) return true;

      return false;
    });
    if (!hasMatch) return false;
  }

  // Explicit Gated Community toggle
  if (filters.gatedCommunity && !hasGatedEvidenceProperty(property)) {
    return false;
  }

  // 4. BHK
  if (filters.bhk && Array.isArray(filters.bhk) && filters.bhk.length > 0) {
    const bedrooms = property.bedrooms || 0;
    const matchesBhk = filters.bhk.some((b: string) => {
      if (b === "5+" || b === "4+") return bedrooms >= parseInt(b, 10);
      if (b === "1rk") return bedrooms === 1 && (property.propertyType as string) === "1rk";
      return bedrooms.toString() === b;
    });
    if (!matchesBhk) return false;
  }

  // 5. Bathrooms
  if (filters.bathrooms && Array.isArray(filters.bathrooms) && filters.bathrooms.length > 0) {
    const baths = property.bathrooms || 0;
    const matchesBath = filters.bathrooms.some((b: string) => {
      if (b.includes("+")) return baths >= parseInt(b, 10);
      return baths.toString() === b;
    });
    if (!matchesBath) return false;
  }

  // 6. Balconies
  if (filters.balconies && Array.isArray(filters.balconies) && filters.balconies.length > 0) {
    const balcs = property.balconies || 0;
    const matchesBalc = filters.balconies.some((b: string) => {
      if (b.includes("+")) return balcs >= parseInt(b, 10);
      return balcs.toString() === b;
    });
    if (!matchesBalc) return false;
  }

  // 7. Covered Area
  if (filters.coveredArea && Array.isArray(filters.coveredArea)) {
    const area = property.area || property.carpetArea || property.builtUpArea || 0;
    if (area > 0) {
      const min = filters.coveredArea[0] || 0;
      const max = filters.coveredArea[1] || 10000;
      if (area < min || area > max) return false;
    }
  }

  // 8. Possession Status & Availability
  const rawAvailability = "availability" in filters && Array.isArray((filters as Record<string, unknown>).availability) ? ((filters as Record<string, unknown>).availability as string[]) : [];
  const rawPossession = Array.isArray(filters.possessionStatus) ? filters.possessionStatus : [];
  const possessionFilters = [...rawPossession, ...rawAvailability];
  if (possessionFilters.length > 0) {
    const isReady = property.isReadyToMove;
    const matchesPossession = possessionFilters.some((ps: string) => {
      if (ps === "ready" || ps === "immediate") return isReady || property.possessionDate?.toLowerCase().includes("ready") || property.possessionDate?.toLowerCase().includes("immediate") || (property.ageOfProperty || 0) === 0;
      if (ps === "under-construction") return !isReady || property.possessionDate?.toLowerCase().includes("2026") || property.possessionDate?.toLowerCase().includes("2027");
      return true;
    });
    if (!matchesPossession) return false;
  }

  // 9. Property Age
  if (filters.propertyAge && Array.isArray(filters.propertyAge) && filters.propertyAge.length > 0 && property.ageOfProperty !== undefined) {
    const age = property.ageOfProperty;
    const matchesAge = filters.propertyAge.some((r: string) => {
      if (r === "0-1") return age <= 1;
      if (r === "1-5") return age >= 1 && age <= 5;
      if (r === "5-10") return age >= 5 && age <= 10;
      if (r === "10-15") return age >= 10 && age <= 15;
      if (r === "15+") return age > 15;
      return false;
    });
    if (!matchesAge) return false;
  }

  // 10. Sale Type (new vs resale)
  if (filters.saleType && Array.isArray(filters.saleType) && filters.saleType.length > 0) {
    if (filters.saleType.includes("resale")) {
      if (property.saleType && property.saleType.toLowerCase() !== "resale") return false;
    }
    if (filters.saleType.includes("new")) {
      if (property.saleType && property.saleType.toLowerCase() === "resale") return false;
    }
  }

  // 11. Posted By / Owner Type
  if (filters.postedBy && Array.isArray(filters.postedBy) && filters.postedBy.length > 0) {
    const poster = (property.ownerType || property.postedBy || "").toLowerCase();
    const hasPosterMatch = filters.postedBy.some((req: string) => {
      const r = req.toLowerCase();
      if (r === poster) return true;
      if (r === "developer" && poster === "builder") return true;
      if (r === "builder" && poster === "developer") return true;
      return false;
    });
    if (!hasPosterMatch && poster) return false;
  }

  // 12. Furnishing
  if (filters.furnished && Array.isArray(filters.furnished) && filters.furnished.length > 0 && property.furnishing) {
    const furn = property.furnishing.toLowerCase();
    if (!filters.furnished.some((f: string) => furn.includes(f.toLowerCase()))) return false;
  }

  // 13. Facing & Vastu
  if (filters.facing && Array.isArray(filters.facing) && filters.facing.length > 0 && property.facing) {
    const propFacing = property.facing.toLowerCase();
    if (!filters.facing.some((f: string) => propFacing.includes(f.toLowerCase()))) return false;
  }
  if (filters.vastuCompliant && !property.vastuCompliant) return false;
  if (filters.gatedCommunity && !hasGatedEvidenceProperty(property)) return false;

  // 14. Amenities
  if (filters.amenities && Array.isArray(filters.amenities) && filters.amenities.length > 0) {
    const propAmenities = (property.amenities || []).map((a: unknown) =>
      typeof a === "string" ? a.toLowerCase() : (((a as Record<string, unknown>)?.name as string) || ((a as Record<string, unknown>)?.label as string) || "").toLowerCase()
    );
    const hasReqAmenity = filters.amenities.some((req: string) =>
      propAmenities.some((pa: string) => pa.includes(req.toLowerCase()))
    );
    if (!hasReqAmenity && propAmenities.length > 0) return false;
  }

  // 16. Verified & RERA Badges
  if (filters.verifiedBadges && Array.isArray(filters.verifiedBadges) && filters.verifiedBadges.length > 0) {
    if (filters.verifiedBadges.includes("rera") && !property.reraId) return false;
    if (filters.verifiedBadges.includes("video_verified") && !property.videoUrl) return false;
    if (filters.verifiedBadges.includes("zero_brokerage") && (property.ownerType || property.postedBy) !== "owner" && (property.ownerType || property.postedBy) !== "builder") return false;
    if (filters.verifiedBadges.includes("owner_verified") && !property.isOwnerVerified) return false;
  }
  const reraRegProps = "reraRegisteredProperties" in filters ? (filters as Record<string, unknown>).reraRegisteredProperties : undefined;
  if ((filters.reraApproved || reraRegProps) && !property.reraId) return false;

  // 17. Media (Photos / Video / Floorplan)
  if (filters.mediaTypes && Array.isArray(filters.mediaTypes) && filters.mediaTypes.length > 0) {
    if (filters.mediaTypes.includes("photos") && (!property.images || property.images.length === 0)) return false;
    if (filters.mediaTypes.includes("video") && !property.videoUrl) return false;
    if (filters.mediaTypes.includes("floorplan") && !property.floorPlanUrl) return false;
  }

  // 18. Water & Agriculture (AP Specs)
  if (filters.waterSource && Array.isArray(filters.waterSource) && filters.waterSource.length > 0 && property.waterSource) {
    const hasWater = filters.waterSource.some((w: string) => property.waterSource?.includes(w));
    if (!hasWater) return false;
  }

  // 19. Display Category (Featured / Recommended / Budget Friendly)
  const rawDisplayCat = "displayCategory" in filters && typeof (filters as Record<string, unknown>).displayCategory === "string" ? String((filters as Record<string, unknown>).displayCategory) : undefined;
  if (rawDisplayCat && rawDisplayCat !== "all") {
    const cat = rawDisplayCat.toLowerCase();
    if (cat === "featured" && !(property.displayCategory === "featured" || property.isFeatured)) {
      return false;
    }
    if (cat === "recommended" && !(property.displayCategory === "recommended" || property.isRecommended)) {
      return false;
    }
    if ((cat === "budget" || cat === "budget_friendly") && !(property.displayCategory === "budget_friendly" || property.price <= 4500000)) {
      return false;
    }
  }

  // 20. Posted Since Date Filter
  const rawPostedSince = typeof filters.postedSince === "string" ? filters.postedSince : undefined;
  if (rawPostedSince && rawPostedSince !== "any" && rawPostedSince !== "") {
    const propDateStr = property.createdAt || property.publishedAt || property.updatedAt;
    if (propDateStr) {
      const propTime = new Date(propDateStr).getTime();
      const now = currentTimeMs ?? 1788155000000;
      const ps = rawPostedSince.toLowerCase();
      let maxAgeMs = 0;
      if (ps === "1day" || ps === "yesterday" || ps === "1d") maxAgeMs = 1 * 24 * 60 * 60 * 1000;
      else if (ps === "3days" || ps === "3d") maxAgeMs = 3 * 24 * 60 * 60 * 1000;
      else if (ps === "7days" || ps === "1week" || ps === "7d") maxAgeMs = 7 * 24 * 60 * 60 * 1000;
      else if (ps === "15days" || ps === "2weeks" || ps === "15d") maxAgeMs = 15 * 24 * 60 * 60 * 1000;
      else if (ps === "30days" || ps === "1month" || ps === "30d") maxAgeMs = 30 * 24 * 60 * 60 * 1000;
      else if (ps === "60days" || ps === "2months" || ps === "60d") maxAgeMs = 60 * 24 * 60 * 60 * 1000;
      else if (ps === "90days" || ps === "3months" || ps === "90d") maxAgeMs = 90 * 24 * 60 * 60 * 1000;

      if (maxAgeMs > 0 && (now - propTime) > maxAgeMs) {
        return false;
      }
    }
  }

  // 21. ROAD Exclusive Filter
  if (filters.roadExclusive && !property.isRoadExclusive) {
    return false;
  }

  return true;
}

/**
 * Complete Multi-Attribute Filter Engine for Builder Projects
 */
export function evaluateProjectFilters(
  project: Project,
  filters: Partial<FilterState> | Record<string, unknown>,
  currentTimeMs?: number,
  parsedIntent?: ParsedSearchIntent
): boolean {
  if (!filters) return true;

  // Query search matching with intelligent search engine
  if (filters.query && typeof filters.query === "string" && filters.query.trim()) {
    const query = filters.query.trim();
    if (!matchesProjectSearch(project, query, parsedIntent)) {
      return false;
    }
  }

  // 0. Location & Geography (Cities, Localities) - Match structured location fields
  if (filters.cities && Array.isArray(filters.cities) && filters.cities.length > 0) {
    const matchesCity = filters.cities.some((c: string) => {
      const target = c.toLowerCase().trim();
      if (!target) return false;
      return matchesStructuredLocation(project.location, [target]);
    });
    if (!matchesCity) return false;
  }

  if (filters.localities && Array.isArray(filters.localities) && filters.localities.length > 0) {
    const matchesLoc = filters.localities.some((l: string) => {
      const target = l.toLowerCase().trim();
      if (!target) return false;
      const projLocality = String(project.location?.locality || "").toLowerCase();
      const projAddress = String(project.location?.address || "").toLowerCase();
      const projLandmark = String((project.location as any)?.landmark || "").toLowerCase();
      return projLocality.includes(target) || projAddress.includes(target) || projLandmark.includes(target);
    });
    if (!matchesLoc) return false;
  }

  // 1. Transaction Type & Listing Type (Projects are for sale / primary developments; strictly exclude rent & PG)
  const tType = typeof filters.transactionType === "string" ? filters.transactionType.toLowerCase() : "";
  const isRentListing =
    tType === "rent" || tType === "pg" ||
    (Array.isArray(filters.listingType) && filters.listingType.length > 0 && filters.listingType.some((t) => typeof t === "string" && (t.toLowerCase() === "rent" || t.toLowerCase() === "pg")));
  if (isRentListing) {
    return false;
  }

  // 2. Property Type
  const rawPropType = Array.isArray(filters.propertyType) ? filters.propertyType : [];
  const rawSubPropType = Array.isArray(filters.subPropertyType) ? filters.subPropertyType : [];
  const pType = (project.projectType || "").toLowerCase();

  if (rawPropType.length > 0) {
    const matchesType = rawPropType.some((t: string) => {
      const tt = t.toLowerCase();
      if (tt === "venture") return pType === "venture" && isCrdaVerified(project);
      if (tt === pType) return true;
      if (tt === "apartment" && pType.includes("apartment")) return true;
      if (tt === "villa" && (pType.includes("villa") || pType.includes("independent-house"))) return true;
      if ((tt === "independent-house" || tt === "house" || tt === "houses") && (pType.includes("house") || (project.name || "").toLowerCase().includes("house"))) return true;
      if (["venture", "crda-ventures", "crda-venture", "crda", "residential-land", "plot", "venture-plot", "land"].includes(tt)) {
        if (tt === "crda-ventures" || tt === "crda" || tt === "crda-venture") {
          return pType === "venture" && isCrdaVerified(project);
        }
        return pType === "venture" || pType === "plot" || pType === "land";
      }
      if (["commercial-spaces", "commercial", "shops", "commercial-shop"].includes(tt) && pType.includes("commercial")) return true;
      if (tt === "gated-community") return hasGatedEvidenceProject(project);
      return false;
    });
    if (!matchesType) return false;
  }

  // 3. Sub Property Type
  if (rawSubPropType.length > 0) {
    const matchesSubType = rawSubPropType.some((st: string) => {
      const sub = st.toLowerCase();
      if (["residential-flat", "apartment", "builder-floor", "flat"].includes(sub) && pType === "apartment") return true;
      if (["villa", "independent-house", "house"].includes(sub) && (pType === "villa" || pType === "independent-house")) return true;
      if (["plot", "venture", "land", "residential-plot", "venture-plot"].includes(sub) && (pType === "venture" || pType === "plot" || pType === "land")) return true;
      if (["commercial-shop", "office", "commercial", "retail"].includes(sub) && pType === "commercial") return true;
      return false;
    });
    if (!matchesSubType) return false;
  }

  // Require one configuration to satisfy all requested bedroom, budget and area constraints.
  const intent = parsedIntent || parseSearchIntent(typeof filters.query === "string" ? filters.query : "");
  const constrained = (Array.isArray(filters.bhk) && filters.bhk.length > 0) || intent.bhks.length > 0 || intent.minPrice !== undefined || intent.maxPrice !== undefined ||
    (Array.isArray(filters.budget) && (filters.budget[0] > 0 || filters.budget[1] < 100000000)) ||
    (Array.isArray(filters.coveredArea) && (filters.coveredArea[0] > 0 || filters.coveredArea[1] < 10000));
  if (constrained && !matchingProjectConfigurations(project, filters, intent).length) return false;

  // 7. Possession Status & Construction Status & Availability
  const rawAvailability = Array.isArray((filters as Record<string, unknown>).availability) ? ((filters as Record<string, unknown>).availability as string[]) : [];
  const rawPossession = Array.isArray(filters.possessionStatus) ? filters.possessionStatus : [];
  const rawStatus = "status" in filters && typeof (filters as Record<string, unknown>).status === "string" ? [String((filters as Record<string, unknown>).status)] : [];
  const possessionFilters = [...rawPossession, ...rawAvailability, ...rawStatus];

  if (possessionFilters.length > 0) {
    const status = (project.constructionStatus || "").toLowerCase();
    const isReady = status === "ready-to-move" || status === "ready";
    const isUnderConstruction = status === "under-construction";
    const isNewLaunch = status === "new-launch" || status === "upcoming" || status === "new_launch";

    const matchesPossession = possessionFilters.some((ps: string) => {
      const p = ps.toLowerCase();
      if (p === "ready" || p === "immediate" || p === "ready-to-move" || p === "ready_to_move") return isReady;
      if (p === "under-construction" || p === "under_construction") return isUnderConstruction;
      if (p === "upcoming" || p === "new-launch" || p === "new_launch") return isNewLaunch;
      return true;
    });
    if (!matchesPossession) return false;
  }

  // 8. Posted By / Owner Type (Projects are from Builders / Developers / Channel Partners)
  if (filters.postedBy && Array.isArray(filters.postedBy) && filters.postedBy.length > 0) {
    const hasBuilderOrAgent = filters.postedBy.some((pb: string) => {
      const p = pb.toLowerCase();
      return p === "builder" || p === "developer" || p === "agent" || p === "channel_partner";
    });
    if (!hasBuilderOrAgent) {
      // User selected ONLY "owner" or other non-builder roles
      return false;
    }
  }

  // 9. Sale Type (Projects are always "new" launches/primary developments)
  if (filters.saleType && Array.isArray(filters.saleType) && filters.saleType.length > 0) {
    if (filters.saleType.includes("resale") && !filters.saleType.includes("new")) {
      return false;
    }
  }

  // 10. RERA Approved & Badges
  if (filters.reraApproved && !project.reraApproved && !project.reraId) {
    return false;
  }
  const reraRegProps = "reraRegisteredProperties" in filters ? (filters as Record<string, unknown>).reraRegisteredProperties : undefined;
  if (reraRegProps && !project.reraApproved && !project.reraId) {
    return false;
  }
  if (filters.verifiedBadges && Array.isArray(filters.verifiedBadges) && filters.verifiedBadges.length > 0) {
    if (filters.verifiedBadges.includes("rera") && !project.reraApproved && !project.reraId) return false;
    if (filters.verifiedBadges.includes("video_verified") && !project.videoUrl) return false;
    if (filters.verifiedBadges.includes("zero_brokerage") && !project.noBrokerage) return false;
  }

  // 11. Gated Community
  if (filters.gatedCommunity && !hasGatedEvidenceProject(project)) {
    return false;
  }

  // 12. Facing
  if (filters.facing && Array.isArray(filters.facing) && filters.facing.length > 0) {
    const configFacings = (project.configurations || []).flatMap((c) => c.facing || []).map((f) => f.toLowerCase());
    if (configFacings.length > 0) {
      const hasFacing = filters.facing.some((req: string) => configFacings.some((cf) => cf.includes(req.toLowerCase())));
      if (!hasFacing) return false;
    }
  }

  // 13. Amenities / Facilities
  if (filters.amenities && Array.isArray(filters.amenities) && filters.amenities.length > 0) {
    const projFacilities = (project.facilities || []).map((f: unknown) =>
      typeof f === "string" ? f.toLowerCase() : (((f as Record<string, unknown>)?.name as string) || ((f as Record<string, unknown>)?.label as string) || "").toLowerCase()
    );
    if (projFacilities.length > 0) {
      const hasReqFacility = filters.amenities.some((req: string) =>
        projFacilities.some((pf: string) => pf.includes(req.toLowerCase()))
      );
      if (!hasReqFacility) return false;
    }
  }

  // 14. Media Types (Photos / Video / Brochure / Floor Plan)
  if (filters.mediaTypes && Array.isArray(filters.mediaTypes) && filters.mediaTypes.length > 0) {
    if (filters.mediaTypes.includes("photos") && (!project.images || project.images.length === 0)) return false;
    if (filters.mediaTypes.includes("video") && !project.videoUrl) return false;
    if (filters.mediaTypes.includes("brochure") && !project.brochureUrl) return false;
    if (filters.mediaTypes.includes("floorplan") && !project.configurations?.some((c) => c.floorPlanUrl)) return false;
  }

  // 15. Display Category
  const rawDisplayCat = "displayCategory" in filters && typeof (filters as Record<string, unknown>).displayCategory === "string" ? String((filters as Record<string, unknown>).displayCategory) : undefined;
  if (rawDisplayCat && rawDisplayCat !== "all") {
    const cat = rawDisplayCat.toLowerCase();
    if (cat === "featured" && !(project.displayCategory === "featured" || project.isFeatured)) return false;
    if (cat === "recommended" && !(project.displayCategory === "recommended" || (project as unknown as { isRecommended?: boolean }).isRecommended)) return false;
    if ((cat === "budget" || cat === "budget_friendly") && project.displayCategory !== "budget_friendly") return false;
  }

  // 16. Posted Since Date Filter
  const rawPostedSince = typeof filters.postedSince === "string" ? filters.postedSince : undefined;
  if (rawPostedSince && rawPostedSince !== "any" && rawPostedSince !== "") {
    const projDateStr = project.createdAt || (project as unknown as { publishedAt?: string }).publishedAt || (project as unknown as { updatedAt?: string }).updatedAt;
    if (projDateStr) {
      const projTime = new Date(projDateStr).getTime();
      const now = currentTimeMs ?? 1788155000000;
      const ps = rawPostedSince.toLowerCase();
      let maxAgeMs = 0;
      if (ps === "1day" || ps === "yesterday" || ps === "1d") maxAgeMs = 1 * 24 * 60 * 60 * 1000;
      else if (ps === "3days" || ps === "3d") maxAgeMs = 3 * 24 * 60 * 60 * 1000;
      else if (ps === "7days" || ps === "1week" || ps === "7d") maxAgeMs = 7 * 24 * 60 * 60 * 1000;
      else if (ps === "15days" || ps === "2weeks" || ps === "15d") maxAgeMs = 15 * 24 * 60 * 60 * 1000;
      else if (ps === "30days" || ps === "1month" || ps === "30d") maxAgeMs = 30 * 24 * 60 * 60 * 1000;
      else if (ps === "60days" || ps === "2months" || ps === "60d") maxAgeMs = 60 * 24 * 60 * 60 * 1000;
      else if (ps === "90days" || ps === "3months" || ps === "90d") maxAgeMs = 90 * 24 * 60 * 60 * 1000;

      if (maxAgeMs > 0 && (now - projTime) > maxAgeMs) {
        return false;
      }
    }
  }

  // 17. ROAD Exclusive Filter
  if (filters.roadExclusive && !project.isRoadExclusive) {
    return false;
  }

  return true;
}


export function matchingProjectConfigurations(project: Project, filters: Partial<FilterState> | Record<string, unknown> = {}, intent = parseSearchIntent(typeof filters.query === "string" ? filters.query : "")): ProjectConfig[] {
  const bhks = Array.isArray(filters.bhk) ? filters.bhk.map(String) : [];
  const budget = Array.isArray(filters.budget) && (filters.budget[0] > 0 || filters.budget[1] < 100000000) ? filters.budget as number[] : undefined;
  const area = Array.isArray(filters.coveredArea) && (filters.coveredArea[0] > 0 || filters.coveredArea[1] < 10000) ? filters.coveredArea as number[] : undefined;
  const min = Math.max(intent.minPrice ?? 0, budget?.[0] ?? 0);
  const max = Math.min(intent.maxPrice ?? Infinity, budget?.[1] ?? Infinity);
  return (project.configurations || []).filter(config => {
    const beds = configurationBedrooms(config);
    if ((bhks.length || intent.bhks.length) && project.projectType === "venture") return false;
    if (intent.bhks.length && !intent.bhks.includes(beds)) return false;
    if (bhks.length && !bhks.some(b => b.endsWith("+") ? beds >= parseInt(b, 10) : beds === Number(b))) return false;
    if (min > 0 || max < Infinity) {
      const low = Number(config.priceMin) || Number(config.priceMax);
      const high = Number(config.priceMax) || low;
      if (!(low > 0) || low > max || high < min || min > max) return false;
    }
    if (area) {
      const low = config.superBuiltUpAreaMin || config.builtUpAreaMin || config.plinthAreaMin || (config.plotSizeMin ? config.plotSizeMin * 9 : 0);
      const high = (config.superBuiltUpAreaMin ? config.superBuiltUpAreaMax : config.builtUpAreaMin ? config.builtUpAreaMax : config.plinthAreaMin ? config.plinthAreaMax : config.plotSizeMax ? config.plotSizeMax * 9 : 0) || low;
      if (!low || low > area[1] || high < area[0]) return false;
    }
    return true;
  });
}

/** Rank only eligible results; never relax hard location, budget or bedroom filters. */
export function searchRelevanceScore(item: Project | Property, intent: ParsedSearchIntent): number {
  const isProject = "name" in item;
  const name = normalizeRealEstateText(isProject ? item.name : item.title);
  const location = normalizeRealEstateText([item.location?.locality, item.location?.city].filter(Boolean).join(" "));
  const query = intent.normalizedQuery;
  if (!query) return 0;

  // 1. Text Title Relevance
  let score = name === query ? 1000 : name.startsWith(query) ? 500 : name.includes(query) ? 250 : 0;

  // Fuzzy Title Match if query is reasonably long and didn't match directly
  if (score === 0 && query.length >= 5 && isFuzzyMatch(name, query)) {
    score = 220;
  }

  // 2. Specific Keyword Matches
  const nameWords = name.split(" ").filter(Boolean);
  for (const word of intent.specificKeywords) {
    if (nameWords.includes(word)) {
      score += 40;
    } else if (name.includes(word)) {
      score += 20;
    } else if (word.length >= 5 && nameWords.some(nw => isFuzzyMatch(word, nw, 1))) {
      score += 25;
    }
    if (location.includes(word)) {
      score += 10;
    }
  }

  // 3. Location Keyword Matches
  for (const place of intent.locationKeywords) {
    if (location.includes(place)) {
      score += 60;
    } else if (isFuzzyMatch(location, place)) {
      score += 40;
    }
  }

  // 4. Landmark Proximity Boost
  if (intent.landmark) {
    const lat = item.location?.latitude;
    const lng = item.location?.longitude;
    if (typeof lat === "number" && typeof lng === "number" && !isNaN(lat) && !isNaN(lng)) {
      const dist = haversineDistanceKm(lat, lng, intent.landmark.latitude, intent.landmark.longitude);
      if (dist <= 2) score += 180;
      else if (dist <= 5) score += 120;
      else if (dist <= 10) score += 60;
      else if (dist <= 15) score += 30;
    }
    const locText = normalizeRealEstateText([item.location?.locality, item.location?.address, (item.location as any)?.landmark].filter(Boolean).join(" "));
    const landmarkAliases = AP_LANDMARKS.find(l => l.name === intent.landmark?.name)?.aliases || [intent.landmark.name.toLowerCase()];
    if (landmarkAliases.some(alias => locText.includes(alias))) {
      score += 50;
    }
  }

  // 5. Facing Alignment Boost
  if (intent.facings && intent.facings.length > 0) {
    if (isProject) {
      const configFacings = ((item as Project).configurations || []).flatMap(c => c.facing || []).map(f => f.toLowerCase());
      if (intent.facings.some(f => configFacings.some(cf => cf.includes(f)))) {
        score += 40;
      }
    } else {
      const propFacing = ((item as Property).facing || "").toLowerCase();
      if (intent.facings.some(f => propFacing.includes(f))) {
        score += 40;
      }
    }
  }

  // 6. Quality, Trust & Verification Signals (Reranking Boosts)
  if (isProject) {
    const proj = item as Project;
    if (proj.reraApproved || proj.reraId) score += 40;
    if (isCrdaVerified(proj)) score += 40;
    if (proj.isRoadExclusive) score += 35;
    if (proj.videoUrl) score += 25;
    if (proj.constructionStatus === "ready-to-move") score += 15;
    if (proj.images && proj.images.length >= 4) score += 15;
    if (proj.isFeatured) score += 15;
  } else {
    const prop = item as Property;
    if (prop.reraId) score += 40;
    const landApproved = String(prop.attributes?.landApprovedBy ?? (prop as unknown as Record<string, unknown>).landApprovedBy ?? "").toLowerCase();
    if (landApproved === "crda" || (prop as unknown as Record<string, unknown>).crdaApproved === true) score += 40;
    if (prop.isRoadExclusive) score += 35;
    if (prop.videoUrl) score += 25;
    if (prop.isReadyToMove) score += 15;
    if (prop.images && prop.images.length >= 4) score += 15;
    if (prop.ownerType === "builder" || prop.postedBy === "builder" || prop.isOwnerVerified) score += 20;
    if (prop.displayCategory === "featured" || prop.isFeatured) score += 15;
  }

  return score;
}
