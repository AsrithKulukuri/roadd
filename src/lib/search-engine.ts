import type { Property } from "@/types/property";
import type { Project } from "@/types/project";
import type { FilterState } from "@/components/search/search-filters";

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
}

/**
 * Normalizes text, removes punctuation, handles slang and contractions
 */
export function normalizeRealEstateText(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
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
  const listingType: "sale" | "rent" | undefined = undefined;
  const saleType: "new" | "resale" | undefined = undefined;
  const isGatedCommunity: boolean | undefined = undefined;
  const minPrice: number | undefined = undefined;
  const maxPrice: number | undefined = undefined;
  const locationKeywords: string[] = [];

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

  // 2. Detect Property Types
  if (/\b(?:apartment|apartments|flat|flats|penthouse|studio|highrise|society)\b/i.test(norm)) {
    propertyTypes.add("apartment");
  }
  if (/\b(?:villa|villas|row\s*house|bungalow|duplex|independent\s*house|individual\s*house|house|houses)\b/i.test(norm)) {
    propertyTypes.add("villa");
    propertyTypes.add("independent-house");
  }
  if (/\b(?:plot|plots|land|lands|site|sites|layout|layouts|venture|ventures|crda)\b/i.test(norm)) {
    propertyTypes.add("residential-land");
    propertyTypes.add("venture");
  }
  if (/\b(?:farm|farms|farmhouse|farming|organic|agriculture|agricultural|agri)\b/i.test(norm)) {
    propertyTypes.add("farmhouse");
    propertyTypes.add("agricultural-land");
  }
  if (/\b(?:commercial|office|shop|shops|showroom|warehouse|industrial|building|buildings)\b/i.test(norm)) {
    propertyTypes.add("commercial-spaces");
    propertyTypes.add("shops");
    propertyTypes.add("buildings");
  }

  // 3. Detect Listing Type & Sale Type (New / Resale / Old / Rent / Sale)
  let detectedListingType: "sale" | "rent" | undefined = listingType;
  let detectedSaleType: "new" | "resale" | undefined = saleType;

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

  const underCrMatch = norm.match(/(?:under|below|upto|less\s*than|<=|<)\s*(\d+(?:\.\d+)?)\s*(?:cr|crore|crores)\b/i);
  if (underCrMatch) {
    detectedMaxPrice = parseFloat(underCrMatch[1]) * 10000000;
  }
  const underLakhMatch = norm.match(/(?:under|below|upto|less\s*than|<=|<)\s*(\d+(?:\.\d+)?)\s*(?:l|lac|lakh|lakhs)\b/i);
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

  // 6. Common AP Real Estate Localities & Cities
  const KNOWN_PLACES = [
    "vijayawada", "guntur", "amaravati", "vizag", "visakhapatnam", "mangalagiri",
    "tadepalli", "poranki", "kanuru", "benz circle", "auto nagar", "gorantla",
    "brodipet", "pattabhipuram", "gannavaram", "kaza", "penamaluru", "patamata",
    "gunadala", "bhavanipuram", "machilipatnam", "tenali", "kankipadu", "nunna",
    "ennikepadu", "ramavarappadu", "gollapudi", "prasadampadu", "nidamanuru",
    "edupugallu", "yenamalakuduru", "payakapuram", "ayodhya nagar", "mg road"
  ];

  for (const place of KNOWN_PLACES) {
    if (norm.includes(place)) {
      locationKeywords.push(place);
    }
  }

  // Common Real Estate noise / stop words that shouldn't restrict name matching
  const STOP_WORDS = new Set([
    "in", "at", "near", "for", "with", "of", "and", "the", "a", "an", "to", "on", "by", "is", "are", "any", "all",
    "i", "want", "need", "looking", "look", "show", "me", "find", "get", "give", "please", "pls", "best", "top", "good",
    "cheap", "luxury", "budget", "affordable", "premium", "verified", "available", "buy", "rent", "sale", "purchase",
    "bhk", "bk", "rk", "bed", "beds", "bedroom", "bedrooms", "property", "properties", "flat", "flats", "apartment",
    "apartments", "villa", "villas", "house", "houses", "home", "homes", "duplex", "plot", "plots", "land", "lands",
    "venture", "ventures", "commercial", "space", "spaces", "shop", "shops", "building", "buildings", "office", "offices",
    "below", "under", "above", "less", "more", "than", "within", "upto", "lakh", "lakhs", "lac", "lacs", "cr", "crore",
    "crores", "gated", "community", "ready", "move", "new", "old", "resale", "project", "projects", "facing", "road"
  ]);

  const specificKeywords: string[] = [];
  for (const w of words) {
    if (w.length >= 3 && !STOP_WORDS.has(w) && !KNOWN_PLACES.includes(w) && !w.match(/^\d+(?:bhk|bk|rk|l|cr|k)?$/i)) {
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
    specificKeywords
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

  const structuredCorpus = `${city} ${locality} ${address} ${landmark} ${pincode}`;

  return locationKeywords.every((kw) => {
    const target = kw.toLowerCase().trim();
    if (!target) return true;

    // Direct match in structured location fields
    if (structuredCorpus.includes(target)) return true;

    // Check locality / alias expansions
    const aliases = LOCATION_ALIASES[target];
    if (aliases && aliases.some((alias) => structuredCorpus.includes(alias))) {
      return true;
    }

    return false;
  });
}

/**
 * Strict verification of explicit gated community evidence for Properties
 */
export function hasGatedEvidenceProperty(property: Property): boolean {
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

  const fullCorpus = `${titleAndDesc} ${locationText} ${builderText} ${projectTypeText} ${configsText} ${tagsText}`;

  // 1. Budget / Max Price check: If user specified max budget, project's starting price MUST be within budget
  if (intent.maxPrice) {
    const configMinPrices = (project.configurations || []).map((c: any) => c.priceMin).filter(Boolean);
    const minProjectPrice = configMinPrices.length > 0
      ? Math.min(...configMinPrices)
      : (typeof (project as any).minPrice === "number" ? (project as any).minPrice : 0);

    if (minProjectPrice && minProjectPrice > intent.maxPrice) {
      return false;
    }
  }

  // 2. Budget / Min Price check
  if (intent.minPrice) {
    const configMaxPrices = (project.configurations || []).map((c: any) => c.priceMax).filter(Boolean);
    const maxProjectPrice = configMaxPrices.length > 0
      ? Math.max(...configMaxPrices)
      : (typeof (project as any).maxPrice === "number" ? (project as any).maxPrice : Infinity);

    if (maxProjectPrice && maxProjectPrice < intent.minPrice) {
      return false;
    }
  }

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

    const hasMatchingBhk = (project.configurations || []).some(cfg => {
      const bCount = cfg.bedrooms || (cfg.label ? parseInt(cfg.label.replace(/\D/g, ""), 10) : 0);
      return intent.bhks.includes(bCount) || intent.bhks.some(b => cfg.label?.toLowerCase().includes(`${b}bhk`) || cfg.label?.toLowerCase().includes(`${b} bhk`) || cfg.label?.toLowerCase().includes(`${b}bk`));
    });

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

  // 8. Specific Name / Builder Keywords requirement (e.g. "sri", "lansum", "heights")
  if (intent.specificKeywords.length > 0) {
    const allSpecificMatch = intent.specificKeywords.every(kw => fullCorpus.includes(kw));
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
  if (intent.maxPrice && property.price > intent.maxPrice) {
    return false;
  }

  // 7. Hard Location Keywords requirement: Must match structured location fields, NOT marketing descriptions
  if (intent.locationKeywords.length > 0) {
    const matchesLoc = matchesStructuredLocation(property.location, intent.locationKeywords);
    if (!matchesLoc) return false;
  }

  // 8. Specific Name / Keywords requirement
  if (intent.specificKeywords.length > 0) {
    const allSpecificMatch = intent.specificKeywords.every(kw => fullCorpus.includes(kw));
    if (!allSpecificMatch) return false;
  }

  return true;
}

/**
 * Complete Multi-Attribute Filter Engine for Properties
 */
export function evaluatePropertyFilters(property: Property, filters: Partial<FilterState> | Record<string, unknown>, currentTimeMs?: number): boolean {
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
    if (!matchesPropertySearch(property, query)) {
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
      if (rt === "crda-ventures" || rt === "crda" || rt === "crda-venture") {
        const landApproved = String((property as any).landApprovedBy || (property as any).approvedBy || "").toLowerCase();
        const titleLower = (property.title || "").toLowerCase();
        const descLower = (property.description || "").toLowerCase();
        return landApproved.includes("crda") || Boolean((property as any).crdaApproved) || titleLower.includes("crda") || descLower.includes("crda");
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

  return true;
}

/**
 * Complete Multi-Attribute Filter Engine for Builder Projects
 */
export function evaluateProjectFilters(
  project: Project,
  filters: Partial<FilterState> | Record<string, unknown>,
  currentTimeMs?: number
): boolean {
  if (!filters) return true;

  // Query search matching with intelligent search engine
  if (filters.query && typeof filters.query === "string" && filters.query.trim()) {
    const query = filters.query.trim();
    if (!matchesProjectSearch(project, query)) {
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
      if (tt === pType) return true;
      if (tt === "apartment" && pType.includes("apartment")) return true;
      if (tt === "villa" && (pType.includes("villa") || pType.includes("independent-house"))) return true;
      if ((tt === "independent-house" || tt === "house" || tt === "houses") && (pType.includes("house") || (project.name || "").toLowerCase().includes("house"))) return true;
      if (["venture", "crda-ventures", "crda-venture", "crda", "residential-land", "plot", "venture-plot", "land"].includes(tt)) {
        if (tt === "crda-ventures" || tt === "crda" || tt === "crda-venture") {
          return pType === "venture" || Boolean(project.crdaApproved) || (project.name || "").toLowerCase().includes("crda") || (project.description || "").toLowerCase().includes("crda");
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

  // 4. BHK
  const rawBhk = Array.isArray(filters.bhk) ? (filters.bhk as string[]) : [];
  if (rawBhk.length > 0) {
    if (!project.configurations || project.configurations.length === 0) return false;
    const hasMatchingBhk = project.configurations.some((cfg) => {
      const beds = cfg.bedrooms || 0;
      return rawBhk.some((b: string) => {
        if (b === "5+" || b === "4+") return beds >= parseInt(b, 10);
        return beds.toString() === b;
      });
    });
    if (!hasMatchingBhk) return false;
  }

  // 5. Budget Range (INR)
  const rawBudget = Array.isArray(filters.budget) ? (filters.budget as [number, number]) : undefined;
  if (rawBudget) {
    const [minB, maxB] = rawBudget;
    if (minB > 0 || maxB < 100000000) {
      if (project.configurations && project.configurations.length > 0) {
        const hasBudgetOverlap = project.configurations.some((cfg) => {
          const pMin = cfg.priceMin || 0;
          const pMax = cfg.priceMax || pMin;
          return pMin <= maxB && pMax >= minB;
        });
        if (!hasBudgetOverlap) return false;
      }
    }
  }

  // 6. Covered Area (sqft)
  if (filters.coveredArea && Array.isArray(filters.coveredArea)) {
    const [minArea, maxArea] = filters.coveredArea;
    if (minArea > 0 || maxArea < 10000) {
      if (project.configurations && project.configurations.length > 0) {
        const hasAreaOverlap = project.configurations.some((cfg) => {
          const aMin = cfg.builtUpAreaMin || cfg.superBuiltUpAreaMin || cfg.plinthAreaMin || (cfg.plotSizeMin ? cfg.plotSizeMin * 9 : 0) || 0;
          const aMax = cfg.builtUpAreaMax || cfg.superBuiltUpAreaMax || cfg.plinthAreaMax || (cfg.plotSizeMax ? cfg.plotSizeMax * 9 : 0) || aMin;
          if (aMin === 0 && aMax === 0) return true; // unspecified config area
          return aMin <= maxArea && aMax >= minArea;
        });
        if (!hasAreaOverlap) return false;
      }
    }
  }

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

  return true;
}

