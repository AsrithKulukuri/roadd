import crypto from "crypto";
import { NextResponse } from "next/server";
import { getSanitizedEnv, WasenderService } from "@/lib/wasender";
import { normalizeWhatsAppPhone } from "@/lib/whatsapp-audience";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LooseRecord = Record<string, unknown>;

function safeEqual(left: string, right: string): boolean {
  if (!left || !right || left.length !== right.length) return false;
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return crypto.timingSafeEqual(a, b);
}

function asRecord(value: unknown): LooseRecord {
  return value && typeof value === "object" ? (value as LooseRecord) : {};
}

function extractIncomingMessage(payload: LooseRecord): { text: string; phone: string; fromMe: boolean } | null {
  const data = asRecord(payload.data);
  const rawMessages = data.messages || payload.messages || (Array.isArray(data) ? data : null);
  const message = Array.isArray(rawMessages) ? asRecord(rawMessages[0]) : asRecord(rawMessages);

  const key = asRecord(message.key) || asRecord(payload.key) || asRecord(data.key) || {};
  const msgObj = asRecord(message.message) || asRecord(payload.message) || {};

  // Extract text body from all possible webhook formats
  const text = String(
    message.messageBody ||
      message.text ||
      message.body ||
      msgObj.conversation ||
      (msgObj.extendedTextMessage as LooseRecord)?.text ||
      msgObj.text ||
      data.messageBody ||
      data.text ||
      data.body ||
      data.message ||
      payload.messageBody ||
      payload.text ||
      payload.body ||
      payload.message ||
      ""
  ).trim();

  // Extract sender phone from all possible webhook formats
  const rawPhone = String(
    key.cleanedSenderPn ||
      key.senderPn ||
      key.remoteJid ||
      key.participant ||
      message.phone ||
      message.from ||
      message.sender ||
      data.phone ||
      data.from ||
      data.sender ||
      data.cleanedSenderPn ||
      payload.phone ||
      payload.from ||
      payload.sender ||
      ""
  );

  const phone = normalizeWhatsAppPhone(rawPhone);
  const fromMe = Boolean(key.fromMe || message.fromMe || data.fromMe || payload.fromMe);

  if (phone && text) {
    return { text, phone, fromMe };
  }

  return null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const challenge = url.searchParams.get("hub.challenge") || url.searchParams.get("challenge");
  if (challenge) {
    return new NextResponse(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }

  return NextResponse.json({
    status: "active",
    endpoint: "/api/webhooks/wasender",
    supportedKeywords: ["STOP", "UNSUBSCRIBE", "CANCEL", "QUIT", "YES", "START", "RESUME"],
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: Request) {
  try {
    const configuredSecret = getSanitizedEnv("WASENDER_WEBHOOK_SECRET");
    const providedSignature =
      request.headers.get("x-webhook-signature") ||
      request.headers.get("x-webhook-secret") ||
      request.headers.get("x-api-key") ||
      request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
      new URL(request.url).searchParams.get("secret") ||
      "";

    // Validate secret if configured
    if (configuredSecret && providedSignature) {
      if (!safeEqual(providedSignature, configuredSecret)) {
        console.warn("[WASENDER WEBHOOK] Secret signature mismatch.");
        return NextResponse.json({ received: false, error: "Invalid webhook secret." }, { status: 401 });
      }
    }

    const payload = asRecord(await request.json().catch(() => null));
    console.log("[WASENDER WEBHOOK INCOMING]", JSON.stringify(payload).slice(0, 500));

    const incoming = extractIncomingMessage(payload);
    if (!incoming || incoming.fromMe) {
      return NextResponse.json({ received: true, ignored: true, reason: incoming?.fromMe ? "outbound" : "unrecognized_format" });
    }

    const cleanText = incoming.text.trim().toUpperCase();
    const normalizedKeyword = cleanText.replace(/[^A-Z0-9]/g, "");
    const now = new Date().toISOString();

    console.log(`[WASENDER WEBHOOK INBOUND] From: ${incoming.phone}, Text: "${incoming.text}", Keyword: "${normalizedKeyword}"`);

    // 1. Check if user typed STOP / UNSUBSCRIBE / QUIT / CANCEL / END
    const isStopCommand = ["STOP", "UNSUBSCRIBE", "CANCEL", "END", "QUIT", "STOPALL"].includes(normalizedKeyword);

    if (isStopCommand) {
      // 7-day lock from current time
      const restrictionUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const { data: contact, error } = await supabaseAdmin
        .from("whatsapp_contacts")
        .update({
          is_subscribed: false,
          opted_out_at: now,
          restriction_until: restrictionUntil,
          updated_at: now,
        })
        .eq("phone", incoming.phone)
        .select("id")
        .maybeSingle();

      if (error) {
        console.error("[WASENDER OPT-OUT DB ERROR]", error);
      }

      if (contact) {
        await supabaseAdmin
          .from("whatsapp_campaign_recipients")
          .update({ status: "skipped", last_error: "Recipient opted out through WhatsApp (STOP command)." })
          .eq("contact_id", contact.id)
          .in("status", ["queued", "failed"]);
      }

      // Auto-respond in that WhatsApp chat saying stopped & how to resume
      try {
        await WasenderService.sendTextMessage(
          incoming.phone,
          "You have unsubscribed from ROAD FACING property updates. You will not receive broadcast messages.\n\nReply YES (or any message) to resume receiving updates again.",
          { requestId: `webhook-stop-${Date.now()}` }
        );
      } catch (sendErr) {
        console.warn("[WASENDER STOP REPLY ERROR]", sendErr);
      }

      return NextResponse.json({ received: true, unsubscribed: true, restrictedUntil: restrictionUntil });
    }

    // 2. Check if user is trying to RESUME / UNLOCK with "YES", "START", "UNSTOP", "RESUME", or any incoming message
    const isResumeKeyword = ["YES", "START", "UNSTOP", "RESUME", "RESTART", "AGREE", "OK", "OPTIN", "HI", "HELLO"].includes(normalizedKeyword);

    const { data: existingContact } = await supabaseAdmin
      .from("whatsapp_contacts")
      .select("id, is_subscribed, opted_out_at, restriction_until")
      .eq("phone", incoming.phone)
      .maybeSingle();

    // If user was previously unsubscribed / restricted and sent a message to resume
    if (existingContact && (!existingContact.is_subscribed || existingContact.opted_out_at || existingContact.restriction_until)) {
      if (isResumeKeyword || cleanText.length > 0) {
        const { error: unlockError } = await supabaseAdmin
          .from("whatsapp_contacts")
          .update({
            is_subscribed: true,
            opted_out_at: null,
            restriction_until: null,
            opted_in_at: now,
            consent_source: "whatsapp_user_keyword_yes",
            updated_at: now,
          })
          .eq("phone", incoming.phone);

        if (!unlockError) {
          // Auto-respond in that WhatsApp chat confirming resume
          try {
            await WasenderService.sendTextMessage(
              incoming.phone,
              "Welcome back! You have successfully resubscribed to ROAD FACING property updates.\n\nYou will now receive alerts on new properties, verified listings, and projects.",
              { requestId: `webhook-resume-${Date.now()}` }
            );
          } catch (sendErr) {
            console.warn("[WASENDER RESUME REPLY ERROR]", sendErr);
          }

          return NextResponse.json({ received: true, resubscribed: true });
        }
      }
    }

    return NextResponse.json({ received: true, ignored: true });
  } catch (err: unknown) {
    console.error("[WASENDER WEBHOOK HANDLER ERROR]", err);
    return NextResponse.json({ received: false, error: "Internal webhook processing error" }, { status: 500 });
  }
}
