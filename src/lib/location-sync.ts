import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * Ensures that any city and locality added to a property or project
 * is automatically registered and updated in trending_locations.
 */
export async function syncLocationToTrending(city?: string, locality?: string) {
  try {
    const cleanCity = (city || "").trim();
    const cleanLoc = (locality || cleanCity).trim();
    if (!cleanCity || !cleanLoc) return;

    // Check if trending_locations already has this city + locality (case-insensitive)
    const { data: existing, error: selectError } = await supabaseAdmin
      .from("trending_locations")
      .select("id, properties_count")
      .ilike("city", cleanCity)
      .ilike("locality", cleanLoc)
      .maybeSingle();

    if (selectError) {
      console.warn("[syncLocationToTrending select error]:", selectError.message);
    }

    if (existing) {
      await supabaseAdmin
        .from("trending_locations")
        .update({
          properties_count: (existing.properties_count || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await supabaseAdmin.from("trending_locations").insert({
        city: cleanCity,
        locality: cleanLoc,
        image: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&q=80",
        properties_count: 1,
      });
    }
  } catch (err) {
    console.warn("[syncLocationToTrending error]:", err);
  }
}
