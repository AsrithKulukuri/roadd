import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { INITIAL_REQUESTS } from "@/stores/builder-store";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const builderId = searchParams.get("builderId");

    if (!isSupabaseConfigured()) {
      const filtered = builderId
        ? INITIAL_REQUESTS.filter((r) => r.builderId === builderId)
        : INITIAL_REQUESTS;
      return NextResponse.json({ success: true, requests: filtered });
    }

    let query = supabase.from("builder_requests").select("*").order("created_at", { ascending: false });
    if (builderId) {
      query = query.eq("builder_id", builderId);
    }

    const { data: requests, error } = await query;
    if (error) {
      return NextResponse.json({ success: true, requests: INITIAL_REQUESTS });
    }

    const mapped = requests.map((r: any) => ({
      id: r.id,
      builderId: r.builder_id,
      builderName: r.builder_name,
      requestType: r.request_type,
      projectId: r.project_id,
      projectName: r.project_name,
      title: r.title,
      details: r.details || {},
      status: r.status,
      adminNotes: r.admin_notes,
      priority: r.priority || "normal",
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    return NextResponse.json({ success: true, requests: mapped });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { builderId, builderName, requestType, projectId, projectName, title, details, priority } = body;

    if (!builderId || !requestType || !title) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const requestId = `req-${Date.now()}`;
    const now = new Date().toISOString();

    if (isSupabaseConfigured()) {
      await supabase.from("builder_requests").insert({
        id: requestId,
        builder_id: builderId,
        builder_name: builderName || "Builder Partner",
        request_type: requestType,
        project_id: projectId || null,
        project_name: projectName || null,
        title,
        details: details || {},
        status: "pending",
        priority: priority || "normal",
        created_at: now,
        updated_at: now,
      });

      // Also log activity
      await supabase.from("builder_activity_logs").insert({
        builder_id: builderId,
        builder_name: builderName || "Builder Partner",
        action_type: "submit_request",
        entity_id: requestId,
        entity_name: title,
        details: { requestType, projectId },
        created_at: now,
      });
    }

    return NextResponse.json({
      success: true,
      request: {
        id: requestId,
        builderId,
        builderName,
        requestType,
        projectId,
        projectName,
        title,
        details,
        status: "pending",
        priority: priority || "normal",
        createdAt: now,
        updatedAt: now,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status, adminNotes } = body;

    if (!id || !status) {
      return NextResponse.json({ success: false, error: "ID and status required" }, { status: 400 });
    }

    const now = new Date().toISOString();

    if (isSupabaseConfigured()) {
      await supabase
        .from("builder_requests")
        .update({
          status,
          admin_notes: adminNotes || null,
          updated_at: now,
        })
        .eq("id", id);
    }

    return NextResponse.json({ success: true, id, status, adminNotes });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
