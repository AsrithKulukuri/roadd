import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, city, locality, tagline, properties_count, id } = body;

    if (action === "add_sublocation") {
      const { data, error } = await supabaseAdmin
        .from("trending_locations")
        .insert({
          city: city,
          locality: locality,
          image: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&q=80",
          properties_count: properties_count || 25,
        })
        .select()
        .single();

      if (error) {
        console.error("[Add Sublocation Error]:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, data });
    }

    if (action === "update_sublocation") {
      if (id && id.includes("-") && id.length > 20) {
        await supabaseAdmin
          .from("trending_locations")
          .update({
            locality: locality,
            properties_count: properties_count || 25,
          })
          .eq("id", id);
      } else if (city && locality) {
        await supabaseAdmin
          .from("trending_locations")
          .update({
            locality: locality,
          })
          .ilike("city", city)
          .ilike("locality", locality);
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("[Location Sync Server Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to sync location" }, { status: 500 });
  }
}
