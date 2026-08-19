import type { Property } from "@/types/property";
import type { Project } from "@/types/project";

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
  let listingType: "sale" | "rent" | undefined = undefined;
  let saleType: "new" | "resale" | undefined = undefined;
  let isGatedCommunity: boolean | undefined = undefined;
  let minPrice: number | undefined = undefined;
  let maxPrice: number | undefined = undefined;
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
  if (/\b(?:plot|plots|venture|ventures|layout|land|lands|residential\s*plot|residential\s*land)\b/i.test(norm)) {
    propertyTypes.add("venture");
    propertyTypes.add("residential-land");
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
  if (/\b(?:resale|old|used|pre-owned|preowned|second\s*hand)\b/i.test(norm)) {
    saleType = "resale";
    listingType = "sale";
  } else if (/\b(?:brand\s*new|new\s*launch|new\s*flat|new\s*flats|new\s*house|new\s*houses|new\s*villa|new\s*villas|new\s*property|new\s*project)\b/i.test(norm)) {
    saleType = "new";
    listingType = "sale";
  } else if (/\b(?:rent|rental|lease|to\s*rent|for\s*rent)\b/i.test(norm)) {
    listingType = "rent";
  } else if (/\b(?:buy|sale|purchase|for\s*sale)\b/i.test(norm)) {
    listingType = "sale";
  }

  // 4. Detect Gated Community
  if (/\b(?:gated|gated\s*community|township)\b/i.test(norm)) {
    isGatedCommunity = true;
  }

  // 5. Detect Budget terms (e.g. "under 50 lakhs", "under 1 cr", "below 2 crore", "50l", "1cr")
  const underCrMatch = norm.match(/(?:under|below|upto|less\s*than|<=|<)\s*(\d+(?:\.\d+)?)\s*(?:cr|crore|crores)\b/i);
  if (underCrMatch) {
    maxPrice = parseFloat(underCrMatch[1]) * 10000000;
  }
  const underLakhMatch = norm.match(/(?:under|below|upto|less\s*than|<=|<)\s*(\d+(?:\.\d+)?)\s*(?:l|lac|lakh|lakhs)\b/i);
  if (underLakhMatch) {
    maxPrice = parseFloat(underLakhMatch[1]) * 100000;
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
    "in", "at", "near", "for", "with", "of", "and", "the", "a", "an", "to", "on", "by", "is",
    "looking", "want", "need", "show", "me", "find", "best", "top", "good", "cheap", "luxury",
    "buy", "rent", "sale", "bhk", "bk", "bed", "beds", "bedroom", "bedrooms", "property", "properties",
    "project", "projects", "flat", "flats", "apartment", "apartments", "villa", "villas", "house", "houses",
    "plot", "plots", "land", "lands", "venture", "ventures", "commercial", "space", "spaces", "ready", "move", "new", "old", "resale"
  ]);

  const specificKeywords: string[] = [];
  for (const w of words) {
    if (!STOP_WORDS.has(w) && !bhks.has(parseInt(w, 10)) && !w.match(/^\d+(?:bhk|bk|cr|l|lac|bed)$/i)) {
      specificKeywords.push(w);
    }
  }

  return {
    rawQuery: query,
    normalizedQuery: norm,
    tokens: words,
    bhks: Array.from(bhks),
    propertyTypes: Array.from(propertyTypes),
    listingType,
    saleType,
    isGatedCommunity,
    minPrice,
    maxPrice,
    locationKeywords,
    specificKeywords
  };
}

/**
 * Intelligent Project Matcher
 */
export function matchesProjectSearch(project: Project, query: string, parsedIntent?: ParsedSearchIntent): boolean {
  if (!query || !query.trim()) return true;

  const intent = parsedIntent || parseSearchIntent(query);
  const norm = intent.normalizedQuery;

  // Searchable text corpus for the project
  const locationText = `${project.location?.city || ""} ${project.location?.locality || ""} ${project.location?.address || ""} ${project.location?.state || ""} ${project.location?.pincode || ""}`.toLowerCase();
  const builderText = `${project.builderName || ""} ${(project as any).builder?.name || ""}`.toLowerCase();
  const projectTypeText = `${project.projectType || ""}`.toLowerCase();
  const configsText = (project.configurations || []).map(c => `${c.label || ""} ${c.bedrooms ? c.bedrooms + "bhk " + c.bedrooms + "bk " + c.bedrooms + " bed" : ""} ${c.facing?.join(" ") || ""}`).join(" ").toLowerCase();
  const tagsText = `${(project.highlights || []).join(" ")} ${(project.facilities || []).join(" ")}`.toLowerCase();
  const titleAndDesc = `${project.name || ""} ${project.tagline || ""} ${project.description || ""}`.toLowerCase();

  const fullCorpus = `${titleAndDesc} ${locationText} ${builderText} ${projectTypeText} ${configsText} ${tagsText}`;

  // 1. Direct exact or full substring match
  if (fullCorpus.includes(norm)) {
    return true;
  }

  // 2. Listing Type requirement: If user specifically searches for "rent", projects are typically for sale
  if (intent.listingType === "rent") {
    return false;
  }

  // 3. BHK requirement
  if (intent.bhks.length > 0) {
    const hasMatchingBhk = (project.configurations || []).some(cfg => {
      const bCount = cfg.bedrooms || (cfg.label ? parseInt(cfg.label.replace(/\D/g, ""), 10) : 0);
      return intent.bhks.includes(bCount) || intent.bhks.some(b => cfg.label?.toLowerCase().includes(`${b}bhk`) || cfg.label?.toLowerCase().includes(`${b} bhk`) || cfg.label?.toLowerCase().includes(`${b}bk`));
    });

    if (!hasMatchingBhk && project.configurations && project.configurations.length > 0 && project.projectType !== "venture") {
      return false;
    }
  }

  // 4. Property Type requirement
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

  // 5. Location Keywords requirement (e.g. "edupugallu", "benz circle", "guntur")
  if (intent.locationKeywords.length > 0) {
    const matchesLoc = intent.locationKeywords.some(loc => locationText.includes(loc) || fullCorpus.includes(loc));
    if (!matchesLoc) {
      return false;
    }
  }

  // 6. Specific Name / Builder Keywords requirement (e.g. "sri", "lansum", "heights")
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
  const norm = intent.normalizedQuery;

  // Searchable text corpus for the property
  const locationText = `${property.location?.city || ""} ${property.location?.locality || ""} ${property.location?.address || ""} ${property.location?.state || ""} ${property.location?.pincode || ""}`.toLowerCase();
  const ownerText = `${property.ownerName || ""} ${property.postedBy || ""}`.toLowerCase();
  const propertyTypeText = `${property.propertyType || ""} ${property.listingType || ""}`.toLowerCase();
  const bhkText = property.bedrooms ? `${property.bedrooms}bhk ${property.bedrooms}bk ${property.bedrooms} bhk ${property.bedrooms} bed ${property.bedrooms} bedroom` : "";
  const tagsText = `${(property.amenities || []).map((a: any) => typeof a === "string" ? a : a.name || "").join(" ")} ${(property.features || []).map((f: any) => typeof f === "string" ? f : f.name || "").join(" ")} ${property.refId || ""}`.toLowerCase();
  const titleAndDesc = `${property.title || ""} ${property.description || ""}`.toLowerCase();

  const fullCorpus = `${titleAndDesc} ${locationText} ${ownerText} ${propertyTypeText} ${bhkText} ${tagsText}`;

  if (fullCorpus.includes(norm)) return true;

  if (intent.listingType && property.listingType && property.listingType !== intent.listingType) return false;
  if (intent.saleType && property.saleType && property.saleType !== intent.saleType) return false;

  if (intent.bhks.length > 0) {
    const hasMatchingBhk = property.bedrooms ? intent.bhks.includes(property.bedrooms) : false;
    if (!hasMatchingBhk && property.bedrooms) return false;
  }

  if (intent.locationKeywords.length > 0) {
    const matchesLoc = intent.locationKeywords.some(loc => locationText.includes(loc) || fullCorpus.includes(loc));
    if (!matchesLoc) return false;
  }

  if (intent.specificKeywords.length > 0) {
    const allSpecificMatch = intent.specificKeywords.every(kw => fullCorpus.includes(kw));
    if (!allSpecificMatch) return false;
  }

  return true;
}

/**
 * Complete Multi-Attribute Filter Engine for Properties
 */
export function evaluatePropertyFilters(property: Property, filters: any): boolean {
  if (!filters) return true;

  // 0. Location & Geography (Cities, Localities, Query)
  const propCity = (property.location?.city || "").toLowerCase();
  const propLocality = (property.location?.locality || "").toLowerCase();
  const propAddress = (property.location?.address || "").toLowerCase();
  const propLandmark = (property.location?.landmark || "").toLowerCase();
  const propTitle = (property.title || "").toLowerCase();
  const propLocationCorpus = `${propCity} ${propLocality} ${propAddress} ${propLandmark} ${propTitle}`;

  // Multiple Cities selection
  if (filters.cities && Array.isArray(filters.cities) && filters.cities.length > 0) {
    const matchesCity = filters.cities.some((c: string) => {
      const target = c.toLowerCase().trim();
      if (!target) return false;
      return (
        propCity.includes(target) ||
        propLocality.includes(target) ||
        propLocationCorpus.includes(target)
      );
    });
    if (!matchesCity) return false;
  }

  // Multiple Localities selection
  if (filters.localities && Array.isArray(filters.localities) && filters.localities.length > 0) {
    const matchesLocality = filters.localities.some((l: string) => {
      const target = l.toLowerCase().trim();
      if (!target) return false;
      return (
        propLocality.includes(target) ||
        propAddress.includes(target) ||
        propLandmark.includes(target) ||
        propLocationCorpus.includes(target)
      );
    });
    if (!matchesLocality) return false;
  }

  // Location string parameter (single location / query)
  if (filters.location && typeof filters.location === "string" && filters.location.trim()) {
    const locTarget = filters.location.toLowerCase().trim();
    if (!propLocationCorpus.includes(locTarget)) return false;
  }

  // General text query fallback
  if (filters.query && typeof filters.query === "string" && filters.query.trim()) {
    const q = filters.query.toLowerCase().trim();
    if (!propLocationCorpus.includes(q)) {
      const tagsText = `${(property.amenities || []).map((a: any) => typeof a === "string" ? a : a.name || "").join(" ")}`.toLowerCase();
      if (!tagsText.includes(q) && !(property.propertyType || "").toLowerCase().includes(q)) {
        return false;
      }
    }
  }

  // 1. Transaction Type / Listing Type
  if (filters.transactionType && filters.transactionType !== "all") {
    if (filters.transactionType === "rent" && property.listingType !== "rent") return false;
    if (filters.transactionType === "buy" && property.listingType !== "sale") return false;
    if (filters.transactionType === "commercial" && !["commercial-spaces", "shops", "buildings", "warehouse"].includes(property.propertyType)) return false;
    if (filters.transactionType === "pg" && property.propertyType !== "pg-coliving") return false;
  }
  if (filters.listingType && filters.listingType.length > 0) {
    if (!filters.listingType.includes(property.listingType)) return false;
  }

  // 2. Budget (Min / Max)
  if (filters.budget && Array.isArray(filters.budget)) {
    const min = filters.budget[0] || 0;
    const max = filters.budget[1] || 100000000;
    if (property.price < min || property.price > max) return false;
  }

  // 3. Property Category / Type
  if (filters.propertyType && filters.propertyType.length > 0) {
    const pType = (property.propertyType || "").toLowerCase();
    const hasMatch = filters.propertyType.some((reqType: string) => {
      const rt = reqType.toLowerCase();
      if (rt === pType) return true;
      if (rt === "apartment" && pType.includes("apartment")) return true;
      if (rt === "villa" && (pType.includes("villa") || pType.includes("independent-house"))) return true;
      if (rt === "residential-land" && (pType.includes("land") || pType.includes("plot") || pType === "venture")) return true;
      if (rt === "commercial-spaces" && (pType.includes("commercial") || pType.includes("shop") || pType.includes("building"))) return true;
      return false;
    });
    if (!hasMatch) return false;
  }

  // 4. BHK
  if (filters.bhk && filters.bhk.length > 0) {
    const bedrooms = property.bedrooms || 0;
    const matchesBhk = filters.bhk.some((b: string) => {
      if (b === "5+" || b === "4+") return bedrooms >= parseInt(b, 10);
      if (b === "1rk") return bedrooms === 1 && (property.propertyType as string) === "1rk";
      return bedrooms.toString() === b;
    });
    if (!matchesBhk) return false;
  }

  // 5. Bathrooms
  if (filters.bathrooms && filters.bathrooms.length > 0) {
    const baths = property.bathrooms || 0;
    const matchesBath = filters.bathrooms.some((b: string) => {
      if (b.includes("+")) return baths >= parseInt(b, 10);
      return baths.toString() === b;
    });
    if (!matchesBath) return false;
  }

  // 6. Balconies
  if (filters.balconies && filters.balconies.length > 0) {
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

  // 8. Possession Status
  if (filters.possessionStatus && filters.possessionStatus.length > 0) {
    const isReady = property.isReadyToMove;
    const matchesPossession = filters.possessionStatus.some((ps: string) => {
      if (ps === "ready") return isReady;
      if (ps === "under-construction") return !isReady;
      if (ps === "immediate") return isReady;
      return true;
    });
    if (!matchesPossession) return false;
  }

  // 9. Property Age
  if (filters.propertyAge && filters.propertyAge.length > 0 && property.ageOfProperty !== undefined) {
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

  // 10. Sale Type
  if (filters.saleType && filters.saleType.length > 0 && property.saleType) {
    if (!filters.saleType.includes(property.saleType.toLowerCase())) return false;
  }

  // 11. Posted By
  if (filters.postedBy && filters.postedBy.length > 0 && property.postedBy) {
    if (!filters.postedBy.includes(property.postedBy.toLowerCase())) return false;
  }

  // 12. Furnishing
  if (filters.furnished && filters.furnished.length > 0 && property.furnishing) {
    if (!filters.furnished.includes(property.furnishing.toLowerCase())) return false;
  }

  // 13. Facing & Vastu
  if (filters.facing && filters.facing.length > 0 && property.facing) {
    if (!filters.facing.includes(property.facing.toLowerCase())) return false;
  }
  if (filters.vastuCompliant && !property.vastuCompliant) return false;

  // 14. Ownership
  if (filters.ownership && filters.ownership.length > 0 && property.ownership) {
    if (!filters.ownership.includes(property.ownership.toLowerCase())) return false;
  }

  // 15. Amenities
  if (filters.amenities && filters.amenities.length > 0) {
    const propAmenities = (property.amenities || []).map((a: any) =>
      typeof a === "string" ? a.toLowerCase() : (a.name || a.label || "").toLowerCase()
    );
    const hasReqAmenity = filters.amenities.some((req: string) =>
      propAmenities.some((pa: string) => pa.includes(req.toLowerCase()))
    );
    if (!hasReqAmenity && propAmenities.length > 0) return false;
  }

  // 16. Verified & RERA Badges
  if (filters.verifiedBadges && filters.verifiedBadges.length > 0) {
    if (filters.verifiedBadges.includes("rera") && !property.reraId) return false;
    if (filters.verifiedBadges.includes("video_verified") && !property.videoUrl) return false;
    if (filters.verifiedBadges.includes("zero_brokerage") && property.postedBy !== "owner") return false;
    if (filters.verifiedBadges.includes("owner_verified") && !property.isOwnerVerified) return false;
  }
  if (filters.reraApproved && !property.reraId) return false;

  // 17. Media (Photos / Video / Floorplan)
  if (filters.mediaTypes && filters.mediaTypes.length > 0) {
    if (filters.mediaTypes.includes("photos") && (!property.images || property.images.length === 0)) return false;
    if (filters.mediaTypes.includes("video") && !property.videoUrl) return false;
    if (filters.mediaTypes.includes("floorplan") && !property.floorPlanUrl) return false;
  }

  // 18. Water & Agriculture (AP Specs)
  if (filters.waterSource && filters.waterSource.length > 0 && property.waterSource) {
    const hasWater = filters.waterSource.some((w: string) => property.waterSource?.includes(w));
    if (!hasWater) return false;
  }

  // 19. Display Category (Featured / Recommended / Budget Friendly)
  if (filters.displayCategory && filters.displayCategory !== "all") {
    const cat = filters.displayCategory.toLowerCase();
    if (cat === "featured" && !(property.displayCategory === "featured" || property.isFeatured)) {
      return false;
    }
    if (cat === "recommended" && !(property.displayCategory === "recommended" || property.isRecommended)) {
      return false;
    }
    if ((cat === "budget" || cat === "budget_friendly") && property.displayCategory !== "budget_friendly") {
      return false;
    }
  }

  return true;
}
