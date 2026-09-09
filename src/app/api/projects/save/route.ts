import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/server-auth-guard";
import { stampCrdaReview, validMeasurements, hasCompleteCrdaEvidence, type CrdaReview } from "@/lib/listing-quality";

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
    const payload = { ...body.payload };
    const location = payload.location as Record<string, unknown> | undefined;
    const review = location?.crdaReview as CrdaReview | undefined;
    const evidence = (location?.crdaEvidence || payload) as Record<string, unknown>;
    if (review?.requested) {
      if (payload.crdaApproved === true && payload.projectType !== "venture") return NextResponse.json({ success: false, error: "Only plot ventures can be marked CRDA approved." }, { status: 400 });
      if (review.approved && !hasCompleteCrdaEvidence(evidence)) {
        return NextResponse.json({ success: false, error: "Official LP number, survey number, layout document and all four boundary measurements with units are required before verification." }, { status: 400 });
      }
      try {
        payload.location = { ...location, crdaReview: stampCrdaReview(review, review.approved === true, new Date().toISOString()) };
      } catch (error) {
        return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Invalid approval review." }, { status: 400 });
      }
    }
    if (Array.isArray(payload.configurations) && payload.configurations.some(config => config.measurements && !validMeasurements(config.measurements))) {
      return NextResponse.json({ success: false, error: "Configuration dimensions need positive width × depth and units, e.g. 30 × 60 ft." }, { status: 400 });
    }

    // Always mirror isRoadExclusive into location JSONB for fail-safe persistence
    if (payload.isRoadExclusive !== undefined) {
      const loc = (payload.location && typeof payload.location === "object")
        ? { ...(payload.location as Record<string, unknown>), isRoadExclusive: Boolean(payload.isRoadExclusive) }
        : { isRoadExclusive: Boolean(payload.isRoadExclusive) };
      payload.location = loc;
    }

    if (body.mode === "update" && !body.id && !body.slug) {
      return NextResponse.json({ success: false, error: "Project identifier required" }, { status: 400 });
    }

    const executeSave = async (dataPayload: Record<string, unknown>) => {
      if (body.mode === "create") {
        return await supabaseAdmin
          .from("projects")
          .insert(dataPayload)
          .select("id, slug")
          .single();
      }
      let query = supabaseAdmin
        .from("projects")
        .update({ ...dataPayload, updatedAt: new Date().toISOString() });
      query = body.id ? query.eq("id", body.id) : query.eq("slug", body.slug!);
      return await query.select("id, slug").maybeSingle();
    };

    let { data, error } = await executeSave(payload);

    // If the physical isRoadExclusive column does not exist on Supabase, retry without it (already safely stored in location)
    if (error && (error.message.includes("isRoadExclusive") || error.message.includes("does not exist"))) {
      delete payload.isRoadExclusive;
      const retryResult = await executeSave(payload);
      data = retryResult.data;
      error = retryResult.error;
    }

    if (error) throw error;
    if (body.mode === "update" && !data) {
      return NextResponse.json({ success: false, error: "Project was not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, project: data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Project persistence failed";
    console.error("[PROJECT SAVE ERROR]", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
