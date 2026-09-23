import { NextResponse } from "next/server";
import { readSiteFeatures } from "@/lib/site-features";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/server-auth-guard";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await readSiteFeatures(), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Site settings could not be loaded." }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  const { errorResponse } = await requireAdmin(request);
  if (errorResponse) return errorResponse;
  const body = await request.json().catch(() => null);
  if (typeof body?.propertiesEnabled !== "boolean") {
    return NextResponse.json({ error: "propertiesEnabled must be a boolean." }, { status: 400 });
  }
  try {
    const { error } = await supabaseAdmin.from("homepage_layouts").upsert({
      id: "site_features", sections: { propertiesEnabled: body.propertiesEnabled },
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    return NextResponse.json({ propertiesEnabled: body.propertiesEnabled });
  } catch {
    return NextResponse.json({ error: "Could not save. Please try again." }, { status: 500 });
  }
}
