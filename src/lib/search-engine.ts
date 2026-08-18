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
  const tagsText = `${(property.amenities || []).join(" ")} ${(property.features || []).join(" ")} ${property.refId || ""}`.toLowerCase();
  const titleAndDesc = `${property.title || ""} ${property.description || ""}`.toLowerCase();

  const fullCorpus = `${titleAndDesc} ${locationText} ${ownerText} ${propertyTypeText} ${bhkText} ${tagsText}`;

  // 1. Direct exact or full substring match
  if (fullCorpus.includes(norm)) {
    return true;
  }

  // 2. Listing Type requirement (sale / rent)
  if (intent.listingType) {
    if (property.listingType && property.listingType !== intent.listingType) {
      return false;
    }
  }

  // 2b. Sale Type requirement (new / resale)
  if (intent.saleType) {
    if (property.saleType && property.saleType !== intent.saleType) {
      return false;
    }
  }

  // 3. BHK requirement
  if (intent.bhks.length > 0) {
    const hasMatchingBhk = property.bedrooms ? intent.bhks.includes(property.bedrooms) : false;
    if (!hasMatchingBhk && property.bedrooms) {
      return false;
    }
  }

  // 4. Property Type requirement
  if (intent.propertyTypes.length > 0) {
    const pType = property.propertyType?.toLowerCase() || "";
    let typeMatches = intent.propertyTypes.includes(pType);
    if (!typeMatches && pType === "residential-land" && (intent.propertyTypes.includes("residential-land") || intent.propertyTypes.includes("venture"))) typeMatches = true;
    if (!typeMatches && pType === "apartment" && intent.propertyTypes.includes("apartment")) typeMatches = true;
    if (!typeMatches && (pType === "villa" || pType === "independent-house") && intent.propertyTypes.includes("villa")) typeMatches = true;

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

  // 6. Specific Keywords requirement
  if (intent.specificKeywords.length > 0) {
    const allSpecificMatch = intent.specificKeywords.every(kw => fullCorpus.includes(kw));
    if (!allSpecificMatch) {
      return false;
    }
  }

  return true;
}
