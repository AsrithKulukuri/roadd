import crypto from "crypto";
import { NextResponse } from "next/server";
import { getSanitizedEnv } from "@/lib/wasender";
import { normalizeWhatsAppPhone } from "@/lib/whatsapp-audience";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LooseRecord = Record<string, unknown>;

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function asRecord(value: unknown): LooseRecord {
  return value && typeof value === "object" ? (value as LooseRecord) : {};
}

function extractIncomingMessage(payload: LooseRecord): { text: string; phone: string; fromMe: boolean } | null {
  const data = asRecord(payload.data);
  const rawMessages = data.messages;
  const message = Array.isArray(rawMessages) ? asRecord(rawMessages[0]) : asRecord(rawMessages);
  if (Object.keys(message).length === 0) return null;
  const key = asRecord(message.key);
  const raw = asRecord(message.message);
  const text = String(message.messageBody || raw.conversation || "").trim();
  const phone = normalizeWhatsAppPhone(String(key.cleanedSenderPn || key.senderPn || key.remoteJid || ""));
  return phone && text ? { text, phone, fromMe: Boolean(key.fromMe) } : null;
}

export async function POST(request: Request) {
  const webhookSecret = getSanitizedEnv("WASENDER_WEBHOOK_SECRET");
  const signature = request.headers.get("x-webhook-signature") || "";
  if (!webhookSecret) {
    return NextResponse.json({ received: false, error: "Webhook secret is not configured." }, { status: 503 });
  }
  if (!signature || !safeEqual(signature, webhookSecret)) {
    return NextResponse.json({ received: false, error: "Invalid webhook signature." }, { status: 401 });
  }

  const payload = asRecord(await request.json().catch(() => null));
  const event = String(payload.event || "");
  if (!["messages.received", "messages-personal.received", "messages.upsert"].includes(event)) {
    return NextResponse.json({ received: true, ignored: true });
  }

  const incoming = extractIncomingMessage(payload);
  if (!incoming || incoming.fromMe) {
    return NextResponse.json({ received: true, ignored: true });
  }

  const command = incoming.text.trim().toUpperCase().replace(/[^A-Z]/g, "");
  if (!["STOP", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"].includes(command)) {
    return NextResponse.json({ received: true, ignored: true });
  }

  const now = new Date().toISOString();
  const { data: contact, error } = await supabaseAdmin
    .from("whatsapp_contacts")
    .update({ is_subscribed: false, opted_out_at: now, updated_at: now })
    .eq("phone", incoming.phone)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("[WASENDER OPT-OUT ERROR]", error);
    return NextResponse.json({ received: false }, { status: 500 });
  }

  if (contact) {
    await supabaseAdmin
      .from("whatsapp_campaign_recipients")
      .update({ status: "skipped", last_error: "Recipient opted out through WhatsApp." })
      .eq("contact_id", contact.id)
      .in("status", ["queued", "failed"]);
  }

  return NextResponse.json({ received: true, unsubscribed: Boolean(contact) });
}
