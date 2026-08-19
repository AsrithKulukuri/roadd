import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { fromSupabaseProperty } from "@/stores/properties-store";
import { evaluatePropertyFilters, matchesPropertySearch, parseSearchIntent } from "@/lib/search-engine";
import type { Property } from "@/types/property";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Fetch all properties from Supabase directly
    const { data: rawProps, error } = await supabaseAdmin
      .from("properties")
      .select("*")
      .order("createdAt", { ascending: false });

    if (error) {
      console.error("[Search API] Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const properties: Property[] = (rawProps || []).map(fromSupabaseProperty);

    // Parse filters from URL
    const query = searchParams.get("q") || searchParams.get("query") || "";
    const type = searchParams.get("type") || "all";
    const propertyTypeStr = searchParams.get("propertyType");
    const propertyTypes = propertyTypeStr ? propertyTypeStr.split(",").filter(Boolean) : [];
    
    const bhkStr = searchParams.get("bhk");
    const bhk = bhkStr ? bhkStr.split(",").filter(Boolean) : [];
    
    const minPrice = parseInt(searchParams.get("minPrice") || "0", 10);
    const maxPrice = parseInt(searchParams.get("maxPrice") || "100000000", 10);
    
    const minArea = parseInt(searchParams.get("minArea") || "0", 10);
    const maxArea = parseInt(searchParams.get("maxArea") || "10000", 10);
    
    const possessionStr = searchParams.get("possession");
    const possessionStatus = possessionStr ? possessionStr.split(",").filter(Boolean) : [];
    
    const amenitiesStr = searchParams.get("amenities");
    const amenities = amenitiesStr ? amenitiesStr.split(",").filter(Boolean) : [];
    
    const verified = searchParams.get("verified") === "true";
    const rera = searchParams.get("rera") === "true";

    const filterObj = {
      transactionType: type,
      propertyType: propertyTypes,
      bhk,
      budget: [minPrice, maxPrice],
      coveredArea: [minArea, maxArea],
      possessionStatus,
      amenities,
      verifiedBadges: [
        ...(verified ? ["owner_verified", "video_verified"] : []),
        ...(rera ? ["rera"] : [])
      ],
      reraApproved: rera
    };

    const parsedIntent = query ? parseSearchIntent(query) : null;

    // Apply evaluation
    const filtered = properties.filter((prop) => {
      if (query && !matchesPropertySearch(prop, query, parsedIntent || undefined)) {
        return false;
      }
      return evaluatePropertyFilters(prop, filterObj);
    });

    // Calculate dynamic counts
    const counts = {
      total: filtered.length,
      apartment: filtered.filter((p) => p.propertyType === "apartment").length,
      villa: filtered.filter((p) => p.propertyType === "villa" || p.propertyType === "independent-house").length,
      plots: filtered.filter((p) => p.propertyType === "residential-land" || p.propertyType === "commercial-lands").length,
      commercial: filtered.filter((p) => ["commercial-spaces", "shops", "buildings", "warehouse"].includes(p.propertyType)).length,
      readyToMove: filtered.filter((p) => p.isReadyToMove).length,
      verified: filtered.filter((p) => p.isVerified || p.isOwnerVerified).length,
      bhk1: filtered.filter((p) => p.bedrooms === 1).length,
      bhk2: filtered.filter((p) => p.bedrooms === 2).length,
      bhk3: filtered.filter((p) => p.bedrooms === 3).length,
      bhk4Plus: filtered.filter((p) => (p.bedrooms || 0) >= 4).length,
    };

    // Extract map markers
    const mapMarkers = filtered
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
        slug: p.slug
      }));

    return NextResponse.json({
      success: true,
      total: filtered.length,
      properties: filtered,
      filterCounts: counts,
      mapMarkers
    });
  } catch (err: any) {
    console.error("[Search API] Unexpected error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
