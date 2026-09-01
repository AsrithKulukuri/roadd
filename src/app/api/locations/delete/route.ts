import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/server-auth-guard";

export async function POST(request: Request) {
  try {
    const { errorResponse } = await requireAdmin(request);
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const { type, cityId, cityName, subId, subName } = body;

    if (type === "city" && cityName) {
      // 1. Delete all records for this city from Supabase
      const { error } = await supabaseAdmin
        .from("trending_locations")
        .delete()
        .or(`city.ilike.${cityName},locality.ilike.${cityName}`);

      if (error) {
        console.error("[Delete City DB Error]:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, deletedCity: cityName });
    }

    if (type === "sublocation") {
      // 1. Delete sublocation by ID if UUID
      if (subId && subId.includes("-") && subId.length > 20) {
        const { error } = await supabaseAdmin
          .from("trending_locations")
          .delete()
          .eq("id", subId);

        if (error) {
          console.warn("[Delete Sublocation by ID Warning]:", error);
        }
      }

      // 2. Also delete by matching city & locality name to be 100% thorough
      if (cityName && subName) {
        const { error: matchError } = await supabaseAdmin
          .from("trending_locations")
          .delete()
          .ilike("city", cityName)
          .ilike("locality", subName);

        if (matchError) {
          console.warn("[Delete Sublocation by Match Warning]:", matchError);
        }
      }

      return NextResponse.json({ success: true, deletedSub: subName || subId });
    }

    return NextResponse.json({ error: "Invalid delete request parameters" }, { status: 400 });
  } catch (error: any) {
    console.error("[Delete Location Server Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to delete location" }, { status: 500 });
  }
}
