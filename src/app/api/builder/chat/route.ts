import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { camelRow, portalAccess, PortalError, portalError, recordPortalActivity } from "@/lib/builder-access";
export async function GET(request: Request) {
  try {
    const access = await portalAccess(request, new URL(request.url).searchParams.get("builderId"));
    let query = supabaseAdmin.from("builder_messages").select("*").order("created_at");
    if (access.builder) query = query.eq("builder_id", access.builder.id);
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ success: true, messages: data.map(camelRow) });
  } catch (error) { return portalError(error); }
}
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { builder, admin } = await portalAccess(request, body.builderId);
    if (!builder || typeof body.message !== "string" || !body.message.trim() || body.message.length > 10000) throw new PortalError("A message of up to 10,000 characters is required.");
    if (body.requestId) {
      const { data, error } = await supabaseAdmin.from("builder_requests").select("id").eq("id", body.requestId).eq("builder_id", builder.id).maybeSingle();
      if (error) throw error;
      if (!data) throw new PortalError("Request access denied.", 403);
    }
    const { data, error } = await supabaseAdmin.from("builder_messages").insert({
      id: crypto.randomUUID(), builder_id: builder.id, request_id: body.requestId || null,
      sender_role: admin ? "admin" : "builder", sender_name: admin ? "ROAD Concierge" : builder.company_name,
      message: body.message.trim(), attachments: [], is_read: false,
    }).select("*").single();
    if (error) throw error;
    await recordPortalActivity(builder, admin ? "admin_message" : "chat_message", data.id);
    return NextResponse.json({ success: true, message: camelRow(data) });
  } catch (error) { return portalError(error); }
}
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { builder, admin } = await portalAccess(request, body.builderId);
    if (!builder) throw new PortalError("Builder is required.");
    const { error } = await supabaseAdmin.from("builder_messages").update({ is_read: true }).eq("builder_id", builder.id).eq("sender_role", admin ? "builder" : "admin");
    if (error) throw error;
    return NextResponse.json({ success: true, senderRole: admin ? "builder" : "admin" });
  } catch (error) { return portalError(error); }
}
