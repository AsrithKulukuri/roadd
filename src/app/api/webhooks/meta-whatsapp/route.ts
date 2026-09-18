import { timingSafeEqual, createHmac } from "node:crypto";
import { normalizeWhatsAppPhone } from "@/lib/whatsapp-audience";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { processInboundWhatsAppMessage } from "@/lib/whatsapp/whatsapp-concierge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// In-memory deduplication cache for Meta webhook deliveries (expires after 30s)
const processedMessageIds = new Map<string, number>();

function safeEqual(left: string, right: string): boolean {
  if (!left || !right) return false;
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function plainTextResponse(body: string, status: number) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    },
  });
}

/**
 * 1. Meta WhatsApp Webhook Verification Handshake (GET)
 * Meta calls this endpoint with hub.mode, hub.verify_token, and hub.challenge.
 * We must respond with the exact hub.challenge as plain text and HTTP 200 when verified.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    // Support both standard META_WEBHOOK_VERIFY_TOKEN and legacy META_WHATSAPP_VERIFY_TOKEN
    const expectedToken = (
      process.env.META_WEBHOOK_VERIFY_TOKEN ||
      process.env.META_WHATSAPP_VERIFY_TOKEN
    )?.trim();

    if (!expectedToken) {
      console.error(
        "[META WEBHOOK] Webhook verification token not configured. Please set META_WEBHOOK_VERIFY_TOKEN in Vercel."
      );
      return plainTextResponse("Webhook verification token is not configured on server.", 500);
    }

    if (!mode || !token || !challenge) {
      return plainTextResponse("Missing required parameters: hub.mode, hub.verify_token, or hub.challenge.", 400);
    }

    if (mode === "subscribe" && safeEqual(token, expectedToken)) {
      console.log("[META WEBHOOK] Verification challenge successfully verified.");
      return plainTextResponse(challenge, 200);
    }

    console.warn("[META WEBHOOK] Verification failed: token mismatch or invalid hub.mode.");
    return plainTextResponse("Verification failed: token mismatch.", 403);
  } catch (err) {
    console.error("[META WEBHOOK GET ERROR]", err);
    return plainTextResponse("Internal server error during verification.", 500);
  }
}

/**
 * 2. Meta WhatsApp Inbound Events (POST)
 * Accepts incoming WhatsApp messages, user interactions, and message delivery statuses.
 * Responds immediately with HTTP 200 to acknowledge receipt to Meta Cloud API.
 */
export async function POST(request: Request) {
  try {
    const rawBody = await request.text();

    // Verify HMAC SHA-256 signature if META_APP_SECRET is configured
    const appSecret = (process.env.META_APP_SECRET || process.env.META_WHATSAPP_APP_SECRET)?.trim();
    const signature = request.headers.get("x-hub-signature-256");

    if (appSecret && signature) {
      const expectedSig = "sha256=" + createHmac("sha256", appSecret).update(rawBody).digest("hex");
      if (!safeEqual(signature, expectedSig)) {
        console.warn("[META WEBHOOK] HMAC signature mismatch from x-hub-signature-256.");
        return new Response("Invalid signature", { status: 401 });
      }
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return plainTextResponse("Invalid JSON payload", 400);
    }

    // Meta WhatsApp Cloud API webhooks have object === "whatsapp_business_account"
    if (payload.object !== "whatsapp_business_account") {
      return plainTextResponse("Event not supported", 404);
    }

    const entries = Array.isArray(payload.entry) ? payload.entry : [];
    const nowTs = Date.now();

    // Clean up expired message IDs in deduplication cache
    if (processedMessageIds.size > 2000) {
      for (const [key, ts] of processedMessageIds.entries()) {
        if (nowTs - ts > 60000) processedMessageIds.delete(key);
      }
    }

    for (const entry of entries) {
      const changes = Array.isArray(entry.changes) ? entry.changes : [];
      for (const change of changes) {
        if (change.field !== "messages") continue;

        const value = change.value;
        if (!value) continue;

        // 1. Handle Delivery Status Updates (sent, delivered, read, failed)
        if (Array.isArray(value.statuses)) {
          for (const statusObj of value.statuses) {
            console.log(
              `[META WEBHOOK STATUS] ID: ${statusObj.id}, Status: ${statusObj.status}, Recipient: ${statusObj.recipient_id}`
            );
            if (statusObj.errors && statusObj.errors.length > 0) {
              console.error("[META WEBHOOK DELIVERY ERROR]", JSON.stringify(statusObj.errors));
            }
          }
        }

        // 2. Handle Inbound Messages
        if (Array.isArray(value.messages)) {
          for (const msg of value.messages) {
            const messageId = String(msg.id || "").trim();

            // Deduplicate retried webhook deliveries
            if (messageId) {
              const lastSeen = processedMessageIds.get(messageId);
              if (lastSeen && nowTs - lastSeen < 30000) {
                console.log(`[META WEBHOOK DEDUP] Dropping duplicate delivery: ${messageId}`);
                continue;
              }
              processedMessageIds.set(messageId, nowTs);
            }

            const rawSender = String(msg.from || "");
            const phone = normalizeWhatsAppPhone(rawSender);
            if (!phone) continue;

            // Extract message text according to message type
            let text = "";
            if (msg.type === "text" && msg.text?.body) {
              text = String(msg.text.body).trim();
            } else if (msg.type === "interactive") {
              const interactive = msg.interactive || {};
              if (interactive.type === "button_reply" && interactive.button_reply?.title) {
                text = String(interactive.button_reply.title).trim();
              } else if (interactive.type === "list_reply" && interactive.list_reply?.title) {
                text = String(interactive.list_reply.title).trim();
              }
            } else if (msg.type === "button" && msg.button?.text) {
              text = String(msg.button.text).trim();
            }

            if (!text) {
              console.log(`[META WEBHOOK] Received non-text message type "${msg.type}" from ${phone}`);
              continue;
            }

            const cleanText = text.trim().toUpperCase();
            const normalizedKeyword = cleanText.replace(/[^A-Z0-9]/g, "");
            const now = new Date().toISOString();

            console.log(`[META WEBHOOK INBOUND] From: ${phone}, Text: "${text}", Keyword: "${normalizedKeyword}"`);

            // A. Opt-Out (STOP, UNSUBSCRIBE, CANCEL, QUIT)
            const isStopCommand = ["STOP", "UNSUBSCRIBE", "CANCEL", "END", "QUIT", "STOPALL"].includes(
              normalizedKeyword
            );

            if (isStopCommand) {
              const restrictionUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
              try {
                const { data: contact, error } = await supabaseAdmin
                  .from("whatsapp_contacts")
                  .update({
                    is_subscribed: false,
                    opted_out_at: now,
                    restriction_until: restrictionUntil,
                    updated_at: now,
                  })
                  .eq("phone", phone)
                  .select("id")
                  .maybeSingle();

                if (error) console.error("[META WEBHOOK OPT-OUT DB ERROR]", error);

                if (contact) {
                  await supabaseAdmin
                    .from("whatsapp_campaign_recipients")
                    .update({ status: "skipped", last_error: "Recipient opted out via WhatsApp STOP." })
                    .eq("contact_id", contact.id)
                    .in("status", ["queued", "failed"]);
                }
              } catch (optOutErr) {
                console.error("[META WEBHOOK OPT-OUT ERROR]", optOutErr);
              }
              continue;
            }

            // B. Opt-In / Resubscribe (YES, START, RESUME)
            const isResumeKeyword = [
              "YES",
              "START",
              "UNSTOP",
              "RESUME",
              "RESTART",
              "AGREE",
              "OK",
              "OPTIN",
              "HI",
              "HELLO",
            ].includes(normalizedKeyword);

            try {
              const { data: existingContact } = await supabaseAdmin
                .from("whatsapp_contacts")
                .select("id, is_subscribed, opted_out_at, restriction_until")
                .eq("phone", phone)
                .maybeSingle();

              if (
                existingContact &&
                (!existingContact.is_subscribed ||
                  existingContact.opted_out_at ||
                  existingContact.restriction_until)
              ) {
                if (isResumeKeyword || cleanText.length > 0) {
                  await supabaseAdmin
                    .from("whatsapp_contacts")
                    .update({
                      is_subscribed: true,
                      opted_out_at: null,
                      restriction_until: null,
                      opted_in_at: now,
                      consent_source: "whatsapp_user_keyword_meta",
                      updated_at: now,
                    })
                    .eq("phone", phone);
                }
              }
            } catch (resumeErr) {
              console.error("[META WEBHOOK RESUME ERROR]", resumeErr);
            }

            // C. Dispatch to ROAD AI Concierge
            try {
              await processInboundWhatsAppMessage(phone, text);
            } catch (conciergeErr) {
              console.error("[META WEBHOOK CONCIERGE ERROR]", conciergeErr);
            }
          }
        }
      }
    }

    // Meta expects an immediate 200 OK with plain text or JSON
    return new Response("EVENT_RECEIVED", {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    console.error("[META WEBHOOK POST FATAL ERROR]", err);
    // Return 200 anyway so Meta does not repeatedly retry failed events causing retry storms
    return new Response("EVENT_RECEIVED", {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
