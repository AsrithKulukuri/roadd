import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/server-auth-guard";

const DEFAULT_FALLBACK_LOCATION = {
  city: "Vijayawada",
  locality: "",
  label: "Vijayawada",
};

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("homepage_layouts")
      .select("sections, updated_at")
      .eq("id", "default_location")
      .maybeSingle();

    if (error) {
      console.warn("[Default Location API] GET error:", error);
    }

    if (
      data?.sections &&
      typeof data.sections === "object" &&
      !Array.isArray(data.sections)
    ) {
      const payload = data.sections as {
        city?: unknown;
        locality?: unknown;
        label?: unknown;
      };

      const city = typeof payload.city === "string" && payload.city.trim()
        ? payload.city.trim()
        : DEFAULT_FALLBACK_LOCATION.city;

      const locality = typeof payload.locality === "string" ? payload.locality.trim() : "";
      const label = typeof payload.label === "string" && payload.label.trim()
        ? payload.label.trim()
        : (locality ? `${locality}, ${city}` : city);

      return NextResponse.json({
        city,
        locality,
        label,
        configured: true,
        updatedAt: data.updated_at,
        source: "database",
      });
    }

    return NextResponse.json({
      ...DEFAULT_FALLBACK_LOCATION,
      configured: false,
      source: "fallback",
    });
  } catch (error: any) {
    console.warn("[Default Location API] unexpected error:", error);
    return NextResponse.json({
      ...DEFAULT_FALLBACK_LOCATION,
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
    const city = typeof body?.city === "string" && body.city.trim()
      ? body.city.trim()
      : DEFAULT_FALLBACK_LOCATION.city;
    const locality = typeof body?.locality === "string" ? body.locality.trim() : "";
    const label = typeof body?.label === "string" && body.label.trim()
      ? body.label.trim()
      : (locality ? `${locality}, ${city}` : city);

    const payload = {
      city,
      locality,
      label,
    };

    const { error } = await supabaseAdmin.from("homepage_layouts").upsert({
      id: "default_location",
      sections: payload,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error("[Default Location API] Upsert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      defaultLocation: payload,
      configured: true,
    });
  } catch (error: any) {
    console.error("[Default Location API] PUT error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to save default location" },
      { status: 500 }
    );
  }
}
