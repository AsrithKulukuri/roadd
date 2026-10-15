import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getNextProjectRefId } from "@/lib/ref-id";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("projects")
      .select("id, location, createdAt, updatedAt")
      .order("id");

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const nextRefId = getNextProjectRefId(data || []);
    return NextResponse.json(
      { success: true, nextRefId },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to calculate next reference ID";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
