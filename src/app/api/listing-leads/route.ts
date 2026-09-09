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
      if (!ids.length) return NextResponse.json({ leads: [] }, { headers: { "Cache-Control": "private, no-store" } });
      query = query.eq("listing_type", "project").in("listing_id", ids);
    }
    const { data, error } = await query.order("created_at", { ascending: false }).limit(200);
    if (error) throw error;
    return NextResponse.json({ leads: data }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return portalError(error); }
}
