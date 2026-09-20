import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth-guard";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { resolveWasenderMessageId } from "@/lib/whatsapp/wasender-message-id";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { errorResponse } = await requireAdmin(request);
  if (errorResponse) return errorResponse;
  const params = new URL(request.url).searchParams;
  const page = Math.max(1, Math.min(10000, Number(params.get("page")) || 1));
  if (!Number.isInteger(page)) return NextResponse.json({ error: "Invalid page" }, { status: 400 });
  const status = params.get("status");
  const recipient = params.get("recipient");
  const phone = (params.get("phone") || "").replace(/\D/g, "").slice(0, 20);
  const from = params.get("from");
  const to = params.get("to");
  const statuses = ["queued", "accepted", "sent", "delivered", "read", "failed", "simulated"];
  if ((status && !statuses.includes(status)) || (recipient && !["user", "builder", "admin"].includes(recipient)) ||
      [from, to].some(value => value && !/^\d{4}-\d{2}-\d{2}$/.test(value))) {
    return NextResponse.json({ error: "Invalid log filters" }, { status: 400 });
  }
  try {
    // Retry id correlation if WaSender's send response arrived before its message info.
    // Limit work and retry frequency; no messages are sent by this read operation.
    const pending = await supabaseAdmin.from("whatsapp_message_logs").select("id,provider_message_id")
      .eq("provider", "wasender").eq("status", "accepted")
      .eq("receipt_id_pending", true)
      .lt("updated_at", new Date(Date.now() - 30000).toISOString())
      .order("updated_at").limit(5);
    for (const log of pending.data || []) {
      if (!/^\d+$/.test(log.provider_message_id || "")) continue;
      const receiptId = await resolveWasenderMessageId(log.provider_message_id);
      const linked = await supabaseAdmin.rpc("link_whatsapp_receipt_id", { p_id: log.id, p_message_id: receiptId });
      if (linked.error) throw linked.error;
    }
    let query = supabaseAdmin.from("whatsapp_message_logs").select("*", { count: "exact" });
    if (status) query = query.eq("status", status);
    if (recipient) query = query.eq("recipient_type", recipient);
    if (phone) query = query.like("phone", `%${phone}%`);
    // Dashboard dates use India Standard Time.
    if (from) query = query.gte("created_at", `${from}T00:00:00+05:30`);
    if (to) query = query.lte("created_at", `${to}T23:59:59.999999+05:30`);
    const { data, count, error } = await query.order("created_at", { ascending: false }).order("id", { ascending: false }).range((page - 1) * 50, page * 50 - 1);
    if (error) throw error;
    return NextResponse.json({ logs: data || [], total: count || 0, page, pageSize: 50 }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[WhatsApp Logs] Read failed", error);
    return NextResponse.json({ error: "WhatsApp logs are unavailable. Check the database migration and server connection." }, { status: 503 });
  }
}
