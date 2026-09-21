import { NextResponse } from "next/server";
import { portalAccess, ownsProject, portalError } from "@/lib/builder-access";
import { supabaseAdmin } from "@/lib/supabase-admin";
export async function GET(request: Request) {
  try {
    const access = await portalAccess(request);
    let query = supabaseAdmin.from("listing_action_leads").select("*");
    if (!access.admin) {
      const { data, error } = await supabaseAdmin.from("projects").select("id,slug");
      if (error) throw error;
      const ids = (data || []).filter(p => ownsProject(access.builder.assigned_project_ids, p)).map(p => p.id);
      // Scope property enquiries to the authenticated builder's ownership IDs.
      const { data: properties, error: propertyError } = await supabaseAdmin.from("properties").select('id,ownerId');
      if (propertyError) throw propertyError;
      const ownerIds = [access.user.id, access.builder.id, access.builder.user_id].filter(Boolean);
      const propertyIds = (properties || []).filter(p => ownerIds.includes(p.ownerId)).map(p => p.id);
      const results = await Promise.all([
        ids.length ? supabaseAdmin.from("listing_action_leads").select("*").eq("listing_type", "project").in("listing_id", ids).order("created_at", { ascending: false }).limit(200) : Promise.resolve({ data: [], error: null }),
        propertyIds.length ? supabaseAdmin.from("listing_action_leads").select("*").eq("listing_type", "property").in("listing_id", propertyIds).order("created_at", { ascending: false }).limit(200) : Promise.resolve({ data: [], error: null }),
      ]);
      for (const result of results) if (result.error) throw result.error;
      const leads = results.flatMap(result => result.data || []).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 200);
      return NextResponse.json({ leads }, { headers: { "Cache-Control": "private, no-store" } });
    }
    const { data, error } = await query.order("created_at", { ascending: false }).limit(200);
    if (error) throw error;
    return NextResponse.json({ leads: data }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return portalError(error); }
}
