import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/server-auth-guard";
import { stampCrdaReview, validMeasurements, hasCompleteCrdaEvidence, type CrdaReview } from "@/lib/listing-quality";
import { syncLocationToTrending } from "@/lib/location-sync";
import { getNextProjectRefId } from "@/lib/ref-id";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SaveProjectBody {
  mode?: "create" | "update";
  id?: string;
  slug?: string;
  payload?: Record<string, unknown>;
}

// Physical columns that exist in the Supabase `projects` PostgreSQL table
const PHYSICAL_PROJECT_COLUMNS = new Set([
  "id", "slug", "name", "tagline", "description", "projectType",
  "builderName", "builderLogoUrl", "builderPhone", "builderWhatsapp",
  "location", "reraId", "reraApproved", "noBrokerage",
  "constructionStatus", "totalUnits", "totalArea", "phases",
  "configurations", "images", "coverImage", "videoUrl",
  "brochureUrl", "highlights", "facilities", "isFeatured",
  "isPublished", "viewCount", "createdAt", "updatedAt",
  "crdaApproved", "totalTowers", "constructionUpdates", "displayCategory",
  "masterPlanUrl", "master_plan_url", "isRoadExclusive", "locationHighlights", "location_highlights",
  "refId", "locationUrl"
]);

export async function POST(request: NextRequest) {
  const { errorResponse } = await requireAdmin(request);
  if (errorResponse) return errorResponse;

  const body = (await request.json().catch(() => null)) as SaveProjectBody | null;
  if (!body?.mode || !body.payload || typeof body.payload !== "object") {
    return NextResponse.json({ success: false, error: "Invalid project payload" }, { status: 400 });
  }

  try {
    const rawPayload = { ...body.payload };

    if (body.mode === "update" && !body.id && !body.slug) {
      return NextResponse.json({ success: false, error: "Project identifier required" }, { status: 400 });
    }

    // When updating, load existing project record to safely preserve location fields (coordinates, refId, locationUrl, etc.)
    let existingProject: Record<string, unknown> | null = null;
    if (body.mode === "update") {
      let query = supabaseAdmin.from("projects").select("*");
      query = body.id ? query.eq("id", body.id) : query.eq("slug", body.slug!);
      const { data } = await query.maybeSingle();
      existingProject = (data as Record<string, unknown>) || null;
    }

    const hasIncomingLocation = rawPayload.location !== undefined && typeof rawPayload.location === "object" && rawPayload.location !== null;
    const existingLocation = (existingProject?.location && typeof existingProject.location === "object")
      ? { ...(existingProject.location as Record<string, unknown>) }
      : {};

    const location: Record<string, unknown> = {
      ...existingLocation,
      ...(hasIncomingLocation ? (rawPayload.location as Record<string, unknown>) : {}),
    };

    const review = location?.crdaReview as CrdaReview | undefined;
    const evidence = (location?.crdaEvidence || rawPayload) as Record<string, unknown>;
    if (review?.requested) {
      if (rawPayload.crdaApproved === true && rawPayload.projectType !== "venture") {
        return NextResponse.json({ success: false, error: "Only plot ventures can be marked CRDA approved." }, { status: 400 });
      }
      if (review.approved && !hasCompleteCrdaEvidence(evidence)) {
        return NextResponse.json({ success: false, error: "Official LP number, survey number, layout document and all four boundary measurements with units are required before verification." }, { status: 400 });
      }
      try {
        location.crdaReview = stampCrdaReview(review, review.approved === true, new Date().toISOString());
      } catch (error) {
        return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Invalid approval review." }, { status: 400 });
      }
    }
    if (Array.isArray(rawPayload.configurations) && rawPayload.configurations.some(config => config.measurements && !validMeasurements(config.measurements))) {
      return NextResponse.json({ success: false, error: "Configuration dimensions need positive width × depth and units, e.g. 30 × 60 ft." }, { status: 400 });
    }

    // Always mirror refId across top-level and location JSONB for fail-safe persistence
    const incomingRef = typeof rawPayload.refId === "string" && rawPayload.refId.trim()
      ? rawPayload.refId.trim().toUpperCase()
      : (typeof location.refId === "string" && (location.refId as string).trim()
        ? (location.refId as string).trim().toUpperCase()
        : (typeof existingProject?.refId === "string" && (existingProject.refId as string).trim()
          ? (existingProject.refId as string).trim().toUpperCase()
          : (typeof existingLocation.refId === "string" && (existingLocation.refId as string).trim()
            ? (existingLocation.refId as string).trim().toUpperCase()
            : undefined)));

    if (incomingRef) {
      location.refId = incomingRef;
      rawPayload.refId = incomingRef;
    } else if (body.mode === "create") {
      const { data: existingProjects } = await supabaseAdmin
        .from("projects")
        .select("id, location, createdAt, updatedAt");
      const nextRef = getNextProjectRefId(existingProjects || []);
      location.refId = nextRef;
      rawPayload.refId = nextRef;
    }

    // Always mirror locationUrl / mapUrl across top-level and location JSONB for fail-safe persistence
    const incomingLocationUrl =
      (typeof rawPayload.locationUrl === "string" && rawPayload.locationUrl.trim() ? rawPayload.locationUrl.trim() : undefined) ||
      (typeof location.locationUrl === "string" && (location.locationUrl as string).trim() ? (location.locationUrl as string).trim() : undefined) ||
      (typeof location.mapUrl === "string" && (location.mapUrl as string).trim() ? (location.mapUrl as string).trim() : undefined) ||
      (typeof location.googleMapsUrl === "string" && (location.googleMapsUrl as string).trim() ? (location.googleMapsUrl as string).trim() : undefined) ||
      (typeof existingProject?.locationUrl === "string" && (existingProject.locationUrl as string).trim() ? (existingProject.locationUrl as string).trim() : undefined) ||
      (typeof existingLocation.locationUrl === "string" && (existingLocation.locationUrl as string).trim() ? (existingLocation.locationUrl as string).trim() : undefined) ||
      (typeof existingLocation.mapUrl === "string" && (existingLocation.mapUrl as string).trim() ? (existingLocation.mapUrl as string).trim() : undefined) ||
      (typeof existingLocation.googleMapsUrl === "string" && (existingLocation.googleMapsUrl as string).trim() ? (existingLocation.googleMapsUrl as string).trim() : undefined);

    if (incomingLocationUrl) {
      location.locationUrl = incomingLocationUrl;
      location.mapUrl = incomingLocationUrl;
      location.googleMapsUrl = incomingLocationUrl;
      rawPayload.locationUrl = incomingLocationUrl;
    }

    // Always mirror possessionDate into location JSONB for fail-safe persistence
    if (rawPayload.possessionDate !== undefined) {
      const cleanPossession = typeof rawPayload.possessionDate === "string" ? rawPayload.possessionDate.trim() : undefined;
      if (cleanPossession) location.possessionDate = cleanPossession;
    }

    // Always mirror totalArea into location JSONB for fail-safe persistence
    if (rawPayload.totalArea !== undefined) {
      const cleanArea = typeof rawPayload.totalArea === "string" ? rawPayload.totalArea.trim() : undefined;
      if (cleanArea) location.totalArea = cleanArea;
    }

    // Always mirror isRoadExclusive between top-level column and location JSONB for fail-safe persistence
    if (rawPayload.isRoadExclusive !== undefined) {
      location.isRoadExclusive = Boolean(rawPayload.isRoadExclusive);
    } else if (location.isRoadExclusive !== undefined) {
      rawPayload.isRoadExclusive = Boolean(location.isRoadExclusive);
    }

    // Always mirror isSoldOut into location JSONB
    if (rawPayload.isSoldOut !== undefined) {
      location.isSoldOut = Boolean(rawPayload.isSoldOut);
    }

    // Always mirror builder bio / experience / projects count into location JSONB for fail-safe persistence
    if (rawPayload.builderDescription !== undefined) {
      const cleanDesc = typeof rawPayload.builderDescription === "string" ? rawPayload.builderDescription.trim() : undefined;
      if (cleanDesc) location.builderDescription = cleanDesc;
    }
    if (rawPayload.builderExperience !== undefined) {
      const cleanExp = typeof rawPayload.builderExperience === "string" ? rawPayload.builderExperience.trim() : undefined;
      if (cleanExp) location.builderExperience = cleanExp;
    }
    if (rawPayload.builderProjectsCount !== undefined) {
      const cleanCount = typeof rawPayload.builderProjectsCount === "string" ? rawPayload.builderProjectsCount.trim() : undefined;
      if (cleanCount) location.builderProjectsCount = cleanCount;
    }

    // Always mirror locationHighlights into location JSONB for fail-safe persistence
    if (rawPayload.locationHighlights !== undefined) {
      location.locationHighlights = Array.isArray(rawPayload.locationHighlights)
        ? rawPayload.locationHighlights.filter(Boolean)
        : [];
    }

    // Only assign location back to rawPayload if it's a create, if location was explicitly passed,
    // or if a field that affects location was provided
    if (
      body.mode === "create" ||
      hasIncomingLocation ||
      rawPayload.refId !== undefined ||
      rawPayload.locationUrl !== undefined ||
      rawPayload.locationHighlights !== undefined ||
      rawPayload.builderDescription !== undefined ||
      rawPayload.possessionDate !== undefined ||
      rawPayload.totalArea !== undefined ||
      rawPayload.isSoldOut !== undefined
    ) {
      rawPayload.location = location;
    } else {
      delete rawPayload.location;
    }

    // Filter payload strictly to valid physical columns for Supabase PostgreSQL
    const cleanPayload: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rawPayload)) {
      if (PHYSICAL_PROJECT_COLUMNS.has(key) && value !== undefined) {
        cleanPayload[key] = value;
      }
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

    let saveResult = await executeSave(cleanPayload);
    let attempts = 0;

    // Dynamic recovery loop: If PostgREST returns a schema cache or missing column error,
    // dynamically strip the offending column and retry up to 6 times.
    while (saveResult.error && attempts < 6) {
      attempts++;
      const errMsg = saveResult.error.message || "";
      const match = errMsg.match(/Could not find the '(\w+)' column/i) ||
                    errMsg.match(/column "?(\w+)"? of relation/i) ||
                    errMsg.match(/column projects\.(\w+) does not exist/i) ||
                    errMsg.match(/column "?(\w+)"? does not exist/i);
      if (match && match[1]) {
        const offendingCol = match[1];
        console.warn(`[PROJECT SAVE] Column '${offendingCol}' not recognized by Supabase table. Stripping and retrying...`);
        delete cleanPayload[offendingCol];
        saveResult = await executeSave(cleanPayload);
      } else {
        break;
      }
    }

    if (saveResult.error) throw saveResult.error;
    if (body.mode === "update" && !saveResult.data) {
      return NextResponse.json({ success: false, error: "Project was not found" }, { status: 404 });
    }

    // Automatically update sublocations & locations in trending_locations
    const loc = (rawPayload.location || location) as Record<string, unknown> | undefined;
    const city = typeof loc?.city === "string" ? loc.city : undefined;
    const locality = typeof loc?.locality === "string" ? loc.locality : undefined;
    if (city) {
      void syncLocationToTrending(city, locality);
    }

    return NextResponse.json({ success: true, project: saveResult.data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Project persistence failed";
    console.error("[PROJECT SAVE ERROR]", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
