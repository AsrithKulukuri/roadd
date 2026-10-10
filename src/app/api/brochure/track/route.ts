import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectSlug, projectName, builderId, builderName, dwellSeconds } = body;

    if (!projectSlug) {
      return NextResponse.json({ success: false, error: "Missing slug" }, { status: 400 });
    }

    const userAgent = request.headers.get("user-agent") || "unknown";
    const ip = request.headers.get("x-forwarded-for") || "local";

    await supabaseAdmin.from("builder_activity_logs").insert({
      builder_id: builderId || "unassigned",
      builder_name: builderName || "ROAD Developer Partner",
      action_type: "brochure_viewed" as any,
      entity_name: projectName || projectSlug,
      details: {
        projectSlug,
        dwellSeconds: dwellSeconds || 0,
        userAgent,
        ip,
        viewedAt: new Date().toISOString(),
      },
    });

    return NextResponse.json({ success: true, tracked: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Tracking error" }, { status: 500 });
  }
}
