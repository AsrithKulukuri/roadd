import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/server-auth-guard";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("homepage_layouts")
      .select("sections, updated_at")
      .eq("id", "admin_locations")
      .maybeSingle();

    if (error) {
      console.warn("[Locations API] GET error:", error);
    }

    if (data?.sections && Array.isArray(data.sections)) {
      return NextResponse.json({
        cities: data.sections,
        configured: true,
        updatedAt: data.updated_at,
        source: "database",
      });
    }

    return NextResponse.json({
      cities: null,
      configured: false,
      source: "fallback",
    });
  } catch (error: any) {
    console.warn("[Locations API] unexpected GET error:", error);
    return NextResponse.json({
      cities: null,
      configured: false,
      source: "fallback_error",
    });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { errorResponse } = await requireAdmin(request);
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const cities = Array.isArray(body?.cities) ? body.cities : [];

    // Save master locations config to Supabase homepage_layouts
    const { error: upsertError } = await supabaseAdmin
      .from("homepage_layouts")
      .upsert({
        id: "admin_locations",
        sections: cities,
        updated_at: new Date().toISOString(),
      });

    if (upsertError) {
      console.error("[Locations API] Upsert error:", upsertError);
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      cities,
      configured: true,
    });
  } catch (error: any) {
    console.error("[Locations API] PUT error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to save locations" },
      { status: 500 }
    );
  }
}
