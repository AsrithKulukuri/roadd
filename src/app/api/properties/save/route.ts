import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/server-auth-guard";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const savePropertySchema = z.object({
  mode: z.enum(["create", "update"]),
  id: z.string().trim().min(1).optional(),
  payload: z.record(z.string(), z.unknown()),
});

export async function POST(request: Request) {
  const { errorResponse } = await requireAdmin(request);
  if (errorResponse) return errorResponse;

  const parsed = savePropertySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Invalid property payload." }, { status: 400 });
  }

  const { mode, id, payload } = parsed.data;
  try {
    if (mode === "create") {
      const { data, error } = await supabaseAdmin.from("properties").insert(payload).select("id, slug").single();
      if (error) throw error;
      return NextResponse.json({ success: true, property: data });
    }

    if (!id) {
      return NextResponse.json({ success: false, error: "Property identifier required." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("properties")
      .update({ ...payload, updatedAt: new Date().toISOString() })
      .eq("id", id)
      .select("id, slug")
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ success: false, error: "Property not found." }, { status: 404 });
    return NextResponse.json({ success: true, property: data });
  } catch (error: unknown) {
    console.error("[PROPERTY SAVE ERROR]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Property persistence failed." },
      { status: 500 }
    );
  }
}
