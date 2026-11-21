import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth-guard";
import {
  getMasterSublocations,
  createSublocation,
  addSublocationAlias,
} from "@/lib/data/sublocations";

export async function GET(request: NextRequest) {
  try {
    const { errorResponse } = await requireAdmin(request);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const city = searchParams.get("city") || undefined;
    const sublocations = await getMasterSublocations(city);

    return NextResponse.json({ success: true, sublocations });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch sublocations" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { errorResponse } = await requireAdmin(request);
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const { action } = body;

    if (action === "create") {
      const { city_id, name, lat, lng } = body;
      if (!city_id || !name) {
        return NextResponse.json(
          { error: "city_id and name are required to create a sublocation" },
          { status: 400 }
        );
      }

      const created = await createSublocation({
        city_id,
        name,
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
      });

      return NextResponse.json({ success: true, sublocation: created });
    }

    if (action === "alias") {
      const { city_id, sublocation_id, alias } = body;
      if (!city_id || !sublocation_id || !alias) {
        return NextResponse.json(
          { error: "city_id, sublocation_id, and alias are required" },
          { status: 400 }
        );
      }

      const aliasRecord = await addSublocationAlias({
        city_id,
        sublocation_id,
        alias,
        source: "admin",
      });

      return NextResponse.json({ success: true, alias: aliasRecord });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to process sublocation request" },
      { status: 500 }
    );
  }
}

