import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { camelRow, portalAccess, projectAccess, PortalError, portalError } from "@/lib/builder-access";
import { requireAdmin } from "@/lib/server-auth-guard";
import { z } from "zod";
import { verificationEvidenceSchema } from "@/lib/builder-validation";
const schema = z.object({
  requestType: z.enum(["promote_top", "publish_banner", "enable_chat", "caption_change", "custom_concierge"]),
  title: z.string().trim().min(1).max(200),
  priority: z.enum(["low", "normal", "urgent"]).default("normal"),
  details: z.object({
    verification: verificationEvidenceSchema.optional(),
    proposedCaption: z.string().max(2000).optional(), proposedBannerUrl: z.string().url().optional(),
    shelfId: z.string().max(200).optional(), durationDays: z.number().int().min(1).max(365).optional(),
    notes: z.string().max(20000).optional(), targetUrl: z.string().url().optional(),
  }).strict().default({}),
});
export async function GET(request: Request) {
  try {
    const access = await portalAccess(request, new URL(request.url).searchParams.get("builderId"));
    let query = supabaseAdmin.from("builder_requests").select("*").order("created_at", { ascending: false });
    if (access.builder) query = query.eq("builder_id", access.builder.id);
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ success: true, requests: data.map(camelRow) });
  } catch (error) { return portalError(error); }
}
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { builder } = await portalAccess(request, body.builderId);
    if (!builder) throw new PortalError("Builder is required.");
    const parsed = schema.safeParse(body);
    if (!parsed.success) throw new PortalError("Check the request title, type, and details.");
    const project = body.projectId ? (await projectAccess(request, body.projectId)).project : null;
    const evidence = parsed.data.details.verification;
    if (evidence) {
      if (!project || project.projectType !== "venture" || parsed.data.requestType !== "custom_concierge") throw new PortalError("Select an assigned plot venture for verification.");
      if (!evidence.documentPath.startsWith(builder.id + "/" + project.id + "/") || evidence.documentPath.includes("..")) throw new PortalError("Document does not belong to this project.");
      const { data: document, error: documentError } = await supabaseAdmin.storage.from("builder-evidence").download(evidence.documentPath);
      if (documentError || !document) throw new PortalError("Upload the layout PDF before submitting.");
    }
    const { data, error } = await supabaseAdmin.from("builder_requests").insert({
      id: crypto.randomUUID(), builder_id: builder.id, builder_name: builder.company_name,
      project_id: project?.id || null, project_name: project?.name || null,
      request_type: parsed.data.requestType, title: parsed.data.title, details: parsed.data.details,
      status: "pending", priority: parsed.data.priority,
    }).select("*").single();
    if (error) throw error;
    return NextResponse.json({ success: true, request: camelRow(data) });
  } catch (error) { return portalError(error); }
}
export async function PATCH(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.errorResponse) return auth.errorResponse;
    const body = await request.json();
    if (!["pending", "under_review", "approved", "rejected", "active", "completed"].includes(body.status)) throw new PortalError("Invalid request status.");
    const { data: existing, error: readError } = await supabaseAdmin.from("builder_requests").select("*").eq("id", body.id).single();
    if (readError) throw readError;
    if (existing.details?.verification && body.status === "approved") {
      const proof = verificationEvidenceSchema.safeParse(existing.details.verification);
      if (!proof.success) throw new PortalError("The submitted evidence is incomplete.");
      if (body.confirmVerified !== true) throw new PortalError("Confirm that you checked the official LP order and boundary measurements.");
    }
    const { error: reviewError } = await supabaseAdmin.rpc("review_builder_request", {
      request_id: body.id, new_status: body.status, reviewer_id: auth.user!.id, review_notes: typeof body.adminNotes === "string" ? body.adminNotes.slice(0, 10000) : null,
    });
    if (reviewError) throw reviewError;
    const { data, error } = await supabaseAdmin.from("builder_requests").select("*").eq("id", body.id).single();
    if (error) throw error;
    return NextResponse.json({ success: true, request: camelRow(data) });
  } catch (error) { return portalError(error); }
}
