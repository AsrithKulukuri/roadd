import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/server-auth-guard";
import type { HomeCategory } from "@/stores/content-store";

const FALLBACK_CATEGORIES: HomeCategory[] = [
  {
    id: "new-listings",
    name: "New Listings",
    subtitle: "Freshly added properties",
    badge: "Last 30 days",
    badgeClass: "bg-white text-slate-900 font-bold shadow-md border border-slate-200/80 backdrop-blur-md",
    href: "/search?type=buy&sort=newest",
    type: "apartment",
    icon: "Sparkles",
    description: "Freshly added properties",
    count: 12450,
    image: "/images/categories/new_listings_img_1786320051269.png",
    isFeatured: true,
  },
  {
    id: "new-apartments",
    name: "New Apartments",
    subtitle: "Modern flats & high-rises",
    href: "/search?type=buy&propertyType=apartment",
    type: "apartment",
    icon: "Building2",
    description: "Modern flats & high-rises",
    count: 340,
    image: "/images/categories/new_apartments_img_1786320061003.png",
    isFeatured: true,
  },
  {
    id: "new-villas",
    name: "New Villas",
    subtitle: "Luxury standalone villas",
    badge: "Premium",
    badgeClass: "bg-white text-slate-900 font-bold shadow-md border border-slate-200/80 backdrop-blur-md",
    href: "/search?type=buy&propertyType=villa",
    type: "villa",
    icon: "Home",
    description: "Luxury standalone villas",
    count: 18,
    image: "/images/categories/new_villas_img_1786320073700.png",
    isFeatured: true,
  },
  {
    id: "individual",
    name: "Individual Homes",
    subtitle: "Independent homes & bungalows",
    href: "/search?type=buy&propertyType=independent-house",
    type: "independent-house",
    icon: "House",
    description: "Independent homes & bungalows",
    count: 95,
    image: "/images/categories/individual_houses_img_1786320084215.png",
    isFeatured: true,
  },
];

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("homepage_layouts")
      .select("sections, updated_at")
      .eq("id", "browse_categories")
      .maybeSingle();

    if (error) {
      console.warn("[Categories API] GET error:", error);
    }

    if (data?.sections && Array.isArray(data.sections) && data.sections.length > 0) {
      return NextResponse.json({
        categories: data.sections as HomeCategory[],
        updatedAt: data.updated_at,
        source: "database",
      });
    }

    // Default fallback if not yet initialized
    return NextResponse.json({
      categories: FALLBACK_CATEGORIES,
      updatedAt: null,
      source: "fallback",
    });
  } catch (err: any) {
    console.error("[Categories API] GET exception:", err);
    return NextResponse.json({ error: err.message, categories: FALLBACK_CATEGORIES }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { errorResponse } = await requireAdmin(request);
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const categories = body?.categories;

    if (!Array.isArray(categories)) {
      return NextResponse.json({ error: "Invalid categories array format." }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("homepage_layouts").upsert({
      id: "browse_categories",
      sections: categories,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error("[Categories API] Upsert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, categories });
  } catch (err: any) {
    console.error("[Categories API] PUT exception:", err);
    return NextResponse.json({ error: err.message || "Failed to persist categories" }, { status: 500 });
  }
}
