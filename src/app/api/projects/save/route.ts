import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/server-auth-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SaveProjectBody {
  mode?: "create" | "update";
  id?: string;
  slug?: string;
  payload?: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  const { errorResponse } = await requireAdmin(request);
  if (errorResponse) return errorResponse;

  const body = (await request.json().catch(() => null)) as SaveProjectBody | null;
  if (!body?.mode || !body.payload || typeof body.payload !== "object") {
    return NextResponse.json({ success: false, error: "Invalid project payload" }, { status: 400 });
  }

  try {
    if (body.mode === "create") {
      const { data, error } = await supabaseAdmin
        .from("projects")
        .insert(body.payload)
        .select("id, slug")
        .single();
      if (error) throw error;
      return NextResponse.json({ success: true, project: data });
    }

    if (!body.id && !body.slug) {
      return NextResponse.json({ success: false, error: "Project identifier required" }, { status: 400 });
    }

    let query = supabaseAdmin
      .from("projects")
      .update({ ...body.payload, updatedAt: new Date().toISOString() });
    query = body.id ? query.eq("id", body.id) : query.eq("slug", body.slug!);
    const { data, error } = await query.select("id, slug").maybeSingle();
    if (error) throw error;
    if (!data) {
      return NextResponse.json({ success: false, error: "Project was not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, project: data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Project persistence failed";
    console.error("[PROJECT SAVE ERROR]", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
