import { NextResponse } from "next/server";
import { camelRow, portalAccess, portalError, ownsProject } from "@/lib/builder-access";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  try {
    const access = await portalAccess(request);
    let profiles = supabaseAdmin.from("builder_profiles").select("*");
    let requests = supabaseAdmin.from("builder_requests").select("*").order("created_at", { ascending: false });
    let messages = supabaseAdmin.from("builder_messages").select("*").order("created_at");
    if (!access.admin) {
      profiles = profiles.eq("id", access.builder.id);
      requests = requests.eq("builder_id", access.builder.id);
      messages = messages.eq("builder_id", access.builder.id);
    }
    const results = await Promise.all([profiles, requests, messages, supabaseAdmin.from("projects").select("*")]);
    for (const result of results) if (result.error) throw result.error;
    const activity = access.admin ? await supabaseAdmin.from("builder_activity_logs").select("*").order("created_at", { ascending: false }).limit(200) : { data: [], error: null };
    if (activity.error) throw activity.error;
    return NextResponse.json({ success: true, currentBuilderId: access.builder?.id || null,
      builders: results[0].data!.map(camelRow), requests: results[1].data!.map(camelRow), messages: results[2].data!.map(camelRow),
      projects: results[3].data!.filter(project => access.admin || ownsProject(access.builder.assigned_project_ids, project)),
      activityLogs: (activity.data || []).map(camelRow),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return portalError(error); }
}
