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
    const cleanPayload = { ...payload };

    // Always mirror isRoadExclusive into attributes JSONB for fail-safe persistence
    if (cleanPayload.isRoadExclusive !== undefined) {
      const attr = (cleanPayload.attributes && typeof cleanPayload.attributes === "object")
        ? { ...(cleanPayload.attributes as Record<string, unknown>), isRoadExclusive: Boolean(cleanPayload.isRoadExclusive) }
        : { isRoadExclusive: Boolean(cleanPayload.isRoadExclusive) };
      cleanPayload.attributes = attr;
    }

    if (mode === "update" && !id) {
      return NextResponse.json({ success: false, error: "Property identifier required." }, { status: 400 });
    }

    const executeSave = async (dataPayload: Record<string, unknown>) => {
      if (mode === "create") {
        return await supabaseAdmin.from("properties").insert(dataPayload).select("id, slug").single();
      }
      return await supabaseAdmin
        .from("properties")
        .update({ ...dataPayload, updatedAt: new Date().toISOString() })
        .eq("id", id!)
        .select("id, slug")
        .maybeSingle();
    };

    let { data, error } = await executeSave(cleanPayload);

    // If the physical isRoadExclusive column does not exist on Supabase, retry without it (already safely stored in attributes)
    if (error && (error.message.includes("isRoadExclusive") || error.message.includes("does not exist"))) {
      delete cleanPayload.isRoadExclusive;
      const retryResult = await executeSave(cleanPayload);
      data = retryResult.data;
      error = retryResult.error;
    }

    if (error) throw error;
    if (mode === "update" && !data) return NextResponse.json({ success: false, error: "Property not found." }, { status: 404 });
    return NextResponse.json({ success: true, property: data });
  } catch (error: unknown) {
    console.error("[PROPERTY SAVE ERROR]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Property persistence failed." },
      { status: 500 }
    );
  }
}
