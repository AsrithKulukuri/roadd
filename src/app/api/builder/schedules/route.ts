import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { portalAccess, projectAccess, ownsProject, camelRow, PortalError, portalError } from "@/lib/builder-access";
export async function GET(request: Request) {
  try {
    const access = await portalAccess(request);
    const { data: projects, error: projectError } = await supabaseAdmin.from("projects").select("id,slug");
    if (projectError) throw projectError;
    const assigned = projects.filter(p => access.admin || ownsProject(access.builder.assigned_project_ids, p));
    if (!assigned.length) return NextResponse.json({ success: true, schedules: [] });
    const results = await Promise.all([
      supabaseAdmin.from("project_site_visits").select("*").in("project_id", assigned.map(p => p.id)),
      supabaseAdmin.from("project_site_visits").select("*").in("project_slug", assigned.map(p => p.slug)),
    ]);
    for (const result of results) if (result.error) throw result.error;
    const rows = [...new Map(results.flatMap(r => r.data || []).filter(row => assigned.some(p => row.project_id ? row.project_id === p.id && (!row.project_slug || row.project_slug === p.slug) : row.project_slug === p.slug)).map(row => [row.id, row])).values()];
    return NextResponse.json({ success: true, schedules: rows.map(camelRow) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return portalError(error); }
}
export async function PATCH(request: Request) {
  try {
    await portalAccess(request);
    const body = await request.json();
    if (!["scheduled", "completed", "cancelled"].includes(body.status)) throw new PortalError("Invalid visit status.");
    const { data: visit, error: readError } = await supabaseAdmin.from("project_site_visits").select("*").eq("id", body.id).single();
    if (readError) throw readError;
    await projectAccess(request, visit.project_id || "", visit.project_slug || undefined);
    const { error } = await supabaseAdmin.from("project_site_visits").update({ status: body.status }).eq("id", visit.id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) { return portalError(error); }
}
