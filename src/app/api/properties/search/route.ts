import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { fromSupabaseProperty } from "@/stores/properties-store";
import { evaluatePropertyFilters, matchesPropertySearch, parseSearchIntent } from "@/lib/search-engine";
import type { Property } from "@/types/property";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Parse filters from URL
    const query = (searchParams.get("q") || searchParams.get("query") || "").trim();
    const type = searchParams.get("type") || "all";
    const propertyTypeStr = searchParams.get("propertyType");
    const propertyTypes = propertyTypeStr ? propertyTypeStr.split(",").filter(Boolean) : [];

    const bhkStr = searchParams.get("bhk");
    const bhkNumbers = bhkStr
      ? bhkStr.split(",").map((s) => parseInt(s.replace(/\D/g, ""), 10)).filter((n) => !isNaN(n))
      : [];

    const minPrice = parseInt(searchParams.get("minPrice") || "0", 10);
    const maxPrice = parseInt(searchParams.get("maxPrice") || "1000000000", 10);

    const minArea = parseInt(searchParams.get("minArea") || "0", 10);
    const maxArea = parseInt(searchParams.get("maxArea") || "100000", 10);

    const possessionStr = searchParams.get("possession");
    const possessionStatus = possessionStr ? possessionStr.split(",").filter(Boolean) : [];

    const verified = searchParams.get("verified") === "true";
    const rera = searchParams.get("rera") === "true";

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "40", 10)));
    const offset = (page - 1) * limit;

    // 1. Build Database-Level Filtered Query
    let dbQuery = supabaseAdmin
      .from("properties")
      .select("*", { count: "exact" });

    // Apply DB-level filters where indexed
    if (type && type !== "all") {
      dbQuery = dbQuery.or(`listingType.ilike.%${type}%,listingContext.ilike.%${type}%`);
    }

    if (propertyTypes.length > 0) {
      dbQuery = dbQuery.in("propertyType", propertyTypes);
    }

    if (bhkNumbers.length > 0) {
      dbQuery = dbQuery.in("bedrooms", bhkNumbers);
    }

    if (minPrice > 0) {
      dbQuery = dbQuery.gte("price", minPrice);
    }
    if (maxPrice < 1000000000) {
      dbQuery = dbQuery.lte("price", maxPrice);
    }

    if (minArea > 0) {
      dbQuery = dbQuery.gte("area", minArea);
    }
    if (maxArea < 100000) {
      dbQuery = dbQuery.lte("area", maxArea);
    }

    if (verified) {
      dbQuery = dbQuery.or("isVerified.eq.true,isOwnerVerified.eq.true");
    }

    if (possessionStatus.includes("ready_to_move")) {
      dbQuery = dbQuery.eq("isReadyToMove", true);
    }

    // Apply ordering & pagination
    dbQuery = dbQuery.order("createdAt", { ascending: false });

    // If no text search query is present, paginate at the DB level directly
    if (!query) {
      dbQuery = dbQuery.range(offset, offset + limit - 1);
    } else {
      // With search query, limit DB result set to 300 to prevent OOM
      dbQuery = dbQuery.limit(300);
    }

    const { data: rawProps, count: totalDbCount, error } = await dbQuery;

    if (error) {
      console.error("[Search API] Supabase DB error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let properties: Property[] = (rawProps || []).map(fromSupabaseProperty);

    // If full text / fuzzy query is present, apply in-memory scoring over candidate set
    if (query) {
      const parsedIntent = parseSearchIntent(query);
      properties = properties.filter((prop) => {
        return matchesPropertySearch(prop, query, parsedIntent || undefined);
      });
    }

    const totalMatches = query ? properties.length : (totalDbCount || properties.length);
    const paginatedProperties = query ? properties.slice(offset, offset + limit) : properties;

    // Calculate dynamic counts
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
