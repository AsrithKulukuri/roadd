import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/server-auth-guard";
import { camelRow, PortalError, portalError } from "@/lib/builder-access";
const fields = ["companyName", "slug", "logoUrl", "bannerUrl", "description", "tagline", "reraNumber", "crdaApproved", "contactEmail", "contactPhone", "whatsappNumber", "officeAddress", "experienceYears", "tier", "isVerified", "assignedProjectIds", "assignedPropertyIds", "chatEnabled", "promotedAtTop", "bannerActive", "userId"];
export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const { data, error } = await supabaseAdmin.from("builder_profiles").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ success: true, builders: data.map(camelRow) });
  } catch (error) { return portalError(error); }
}
export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await request.json();
    if (!body.companyName?.trim()) throw new PortalError("Company name is required.");
    const payload: Record<string, unknown> = {};
    for (const key of fields) if (body[key] !== undefined) payload[key.replace(/[A-Z]/g, c => "_" + c.toLowerCase())] = body[key];
    payload.updated_at = new Date().toISOString();
    if (!body.id || body.id.startsWith("bld-")) {
      // Existing text IDs are retained; new profiles use database-compatible UUIDs.
      const { data: existing, error: lookupError } = body.id ? await supabaseAdmin.from("builder_profiles").select("id").eq("id", body.id).maybeSingle() : { data: null, error: null };
      if (lookupError && lookupError.code !== "22P02") throw lookupError;
      payload.id = existing?.id || crypto.randomUUID();
    } else payload.id = body.id;
    if (!body.slug) payload.slug = body.companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const { data, error } = await supabaseAdmin.from("builder_profiles").upsert(payload).select("*").single();
    if (error) throw error;
    return NextResponse.json({ success: true, builder: camelRow(data) });
  } catch (error) { return portalError(error); }
}
export async function DELETE(request: Request) {
  const auth = await requireAdmin(request);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) throw new PortalError("Builder ID is required.");
    const { data, error } = await supabaseAdmin.from("builder_profiles").delete().eq("id", id).select("id").single();
    if (error) throw error;
    return NextResponse.json({ success: true, id: data.id });
  } catch (error) { return portalError(error); }
}
