import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { fromSupabaseProperty } from "@/stores/properties-store";
import { matchesPropertySearch, parseSearchIntent, matchesStructuredLocation } from "@/lib/search-engine";
import type { Property } from "@/types/property";

export const dynamic = "force-dynamic";

function normalizePropertyTypes(rawTypes: string[]): string[] {
  const normalized = new Set<string>();
  for (const raw of rawTypes) {
    const t = raw.toLowerCase().trim();
    if (!t) continue;
    if (["residential-plot", "plot", "plots", "land", "lands", "residential-plots"].includes(t)) {
      normalized.add("residential-land");
      normalized.add("commercial-lands");
      normalized.add("agricultural-land");
    } else if (["flat", "flats", "condo", "condos", "apartment", "apartments"].includes(t)) {
      normalized.add("apartment");
    } else if (["house", "houses", "independent-house", "individual-house", "bungalow"].includes(t)) {
      normalized.add("independent-house");
      normalized.add("villa");
    } else if (["villa", "villas"].includes(t)) {
      normalized.add("villa");
    } else if (["commercial", "commercial-space", "commercial-spaces", "office", "offices", "shop", "shops", "building", "buildings"].includes(t)) {
      normalized.add("commercial-spaces");
      normalized.add("shops");
      normalized.add("buildings");
    } else {
      normalized.add(t);
    }
  }
  return Array.from(normalized);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // 1. Text Query
    const query = (searchParams.get("q") || searchParams.get("query") || searchParams.get("location") || "").trim();

    // 2. Listing Type (buy / sale / rent / pg / commercial)
    const rawType = (searchParams.get("type") || searchParams.get("listingType") || "all").toLowerCase().trim();

    // 3. City / Cities
    const cityParam = searchParams.get("city") || searchParams.get("cities");
    const cities = cityParam ? cityParam.split(",").map((c) => c.trim()).filter(Boolean) : [];

    // 4. Locality / Localities
    const localityParam = searchParams.get("locality") || searchParams.get("localities");
    const localities = localityParam ? localityParam.split(",").map((l) => l.trim()).filter(Boolean) : [];

    // 5. Property Types & Aliases
    const propertyTypeStr = searchParams.get("propertyType") || searchParams.get("type_alias");
    const rawPropertyTypes = propertyTypeStr ? propertyTypeStr.split(",").filter(Boolean) : [];
    const propertyTypes = normalizePropertyTypes(rawPropertyTypes);

    // 6. BHK
    const bhkStr = searchParams.get("bhk");
    const bhkNumbers = bhkStr
      ? bhkStr.split(",").map((s) => parseInt(s.replace(/\D/g, ""), 10)).filter((n) => !isNaN(n))
      : [];

    // 7. Budget / Price Range
    let minPrice = parseInt(searchParams.get("minPrice") || "0", 10);
    let maxPrice = parseInt(searchParams.get("maxPrice") || "1000000000", 10);
    const budgetParam = searchParams.get("budget");
    if (budgetParam) {
      const parts = budgetParam.split(",");
      if (parts.length === 2) {
        const bMin = parseInt(parts[0], 10);
        const bMax = parseInt(parts[1], 10);
        if (!isNaN(bMin)) minPrice = Math.max(minPrice, bMin);
        if (!isNaN(bMax)) maxPrice = Math.min(maxPrice, bMax);
      }
    }

    // 8. Covered Area
    let minArea = parseInt(searchParams.get("minArea") || "0", 10);
    let maxArea = parseInt(searchParams.get("maxArea") || "100000", 10);
    const coveredAreaParam = searchParams.get("coveredArea");
    if (coveredAreaParam) {
      const parts = coveredAreaParam.split(",");
      if (parts.length === 2) {
        const aMin = parseInt(parts[0], 10);
        const aMax = parseInt(parts[1], 10);
        if (!isNaN(aMin)) minArea = Math.max(minArea, aMin);
        if (!isNaN(aMax)) maxArea = Math.min(maxArea, aMax);
      }
    }

    // 9. Possession / Status
    const possessionStr = searchParams.get("possession") || searchParams.get("possessionStatus") || searchParams.get("status");
    const possessionStatus = possessionStr ? possessionStr.toLowerCase().split(",").map((s) => s.trim()).filter(Boolean) : [];

    // 10. Badges (RERA, Verified)
    const verified = searchParams.get("verified") === "true";
    const reraApproved = searchParams.get("reraApproved") === "true" || searchParams.get("rera") === "true";

    // 11. Pagination
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "40", 10)));
    const offset = (page - 1) * limit;

    // Build DB Query
    let dbQuery = supabaseAdmin.from("properties").select("*", { count: "exact" });

    // Listing Type filter
    if (rawType && rawType !== "all") {
      if (rawType === "buy" || rawType === "sale") {
        dbQuery = dbQuery.or("listingType.ilike.%sale%,listingType.ilike.%buy%,listingContext.ilike.%sale%");
      } else if (rawType === "rent") {
        dbQuery = dbQuery.or("listingType.ilike.%rent%,listingContext.ilike.%rent%");
      } else {
        dbQuery = dbQuery.or(`listingType.ilike.%${rawType}%,listingContext.ilike.%${rawType}%`);
      }
    }

    // Property Type filter
    if (propertyTypes.length > 0) {
      dbQuery = dbQuery.in("propertyType", propertyTypes);
    }

    // BHK filter
    if (bhkNumbers.length > 0) {
      dbQuery = dbQuery.in("bedrooms", bhkNumbers);
    }

    // Price filters
    if (minPrice > 0) {
      dbQuery = dbQuery.gte("price", minPrice);
    }
    if (maxPrice < 1000000000) {
      dbQuery = dbQuery.lte("price", maxPrice);
    }

    // Area filters
    if (minArea > 0) {
      dbQuery = dbQuery.gte("area", minArea);
    }
    if (maxArea < 100000) {
      dbQuery = dbQuery.lte("area", maxArea);
    }

    // Verified badge
    if (verified) {
      dbQuery = dbQuery.or("isVerified.eq.true,isOwnerVerified.eq.true");
    }

    // RERA Approved: When true, require reraId or verified
    if (reraApproved) {
      dbQuery = dbQuery.not("reraId", "is", null).neq("reraId", "");
    }

    // Ready to Move
    if (possessionStatus.some((s) => s === "ready" || s === "ready_to_move" || s === "ready-to-move" || s === "immediate")) {
      dbQuery = dbQuery.eq("isReadyToMove", true);
    }

    // Try DB-level City filtering if single city provided
    if (cities.length === 1) {
      try {
        dbQuery = dbQuery.ilike("location->>city", `%${cities[0]}%`);
      } catch {
        // Fallback to in-memory filtering
      }
    }

    // Ordering
    dbQuery = dbQuery.order("createdAt", { ascending: false });

    // When query or multi-city is active, load candidate set for in-memory scoring
    const needsInMemoryRefinement = Boolean(query) || cities.length > 0 || localities.length > 0;
    if (!needsInMemoryRefinement) {
      dbQuery = dbQuery.range(offset, offset + limit - 1);
    } else {
      dbQuery = dbQuery.limit(300);
    }

    const { data: rawProps, count: totalDbCount, error } = await dbQuery;

    if (error) {
      console.error("[Search API] Supabase DB error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let properties: Property[] = (rawProps || []).map(fromSupabaseProperty);

    // In-memory City & Locality refinement
    if (cities.length > 0) {
      properties = properties.filter((p) => {
        return cities.some((c) => matchesStructuredLocation(p.location, [c]));
      });
    }

    if (localities.length > 0) {
      properties = properties.filter((p) => {
        const propLocality = (p.location?.locality || "").toLowerCase();
        const propAddress = (p.location?.address || "").toLowerCase();
        const propLandmark = (p.location?.landmark || "").toLowerCase();
        return localities.some((l) => {
          const target = l.toLowerCase();
          return propLocality.includes(target) || propAddress.includes(target) || propLandmark.includes(target);
        });
      });
    }

    // In-memory RERA refinement
    if (reraApproved) {
      properties = properties.filter((p) => Boolean(p.reraId && p.reraId.trim() !== ""));
    }

    // In-memory Text Search refinement
    if (query) {
      const parsedIntent = parseSearchIntent(query);
      properties = properties.filter((prop) => {
        return matchesPropertySearch(prop, query, parsedIntent || undefined);
      });
    }

    const totalMatches = needsInMemoryRefinement ? properties.length : (totalDbCount || properties.length);
    const paginatedProperties = needsInMemoryRefinement ? properties.slice(offset, offset + limit) : properties;

    // Dynamic counts
    const counts = {
      total: totalMatches,
      apartment: properties.filter((p) => p.propertyType === "apartment").length,
      villa: properties.filter((p) => p.propertyType === "villa" || p.propertyType === "independent-house").length,
      plots: properties.filter((p) => p.propertyType === "residential-land" || p.propertyType === "commercial-lands").length,
      commercial: properties.filter((p) => ["commercial-spaces", "shops", "buildings", "warehouse"].includes(p.propertyType)).length,
      readyToMove: properties.filter((p) => p.isReadyToMove).length,
      verified: properties.filter((p) => p.isVerified || p.isOwnerVerified).length,
      bhk1: properties.filter((p) => p.bedrooms === 1).length,
      bhk2: properties.filter((p) => p.bedrooms === 2).length,
      bhk3: properties.filter((p) => p.bedrooms === 3).length,
      bhk4Plus: properties.filter((p) => (p.bedrooms || 0) >= 4).length,
    };

    // Extract map markers
    const mapMarkers = paginatedProperties
      .filter((p) => p.location?.latitude && p.location?.longitude)
      .map((p) => ({
        id: p.id,
        title: p.title,
        price: p.price,
        bedrooms: p.bedrooms,
        area: p.area || p.carpetArea,
        propertyType: p.propertyType,
        coverImage: p.coverImage || p.images?.[0]?.url,
        lat: p.location.latitude,
        lng: p.location.longitude,
        slug: p.slug,
      }));

    return NextResponse.json({
      success: true,
      total: totalMatches,
      page,
      limit,
      totalPages: Math.ceil(totalMatches / limit),
      properties: paginatedProperties,
      filterCounts: counts,
      mapMarkers,
    });
  } catch (err: any) {
    console.error("[Search API] Unexpected error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
