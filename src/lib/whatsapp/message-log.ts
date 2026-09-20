import { supabaseAdmin } from "@/lib/supabase-admin";
import { formatWhatsAppPhone } from "@/lib/whatsapp/whatsapp-share";
import type { WasenderExecutionResult } from "@/lib/wasender";
import { resolveWasenderMessageId } from "./wasender-message-id";

export interface MessageLogInput {
  phone: string;
  provider: "meta" | "wasender";
  messageType: string;
  message: string;
  requestId?: string;
  recipientType?: "user" | "builder" | "admin";
  mediaUrl?: string;
  templateName?: string;
}

let logTableRetryAfter = 0;

/** Await persistence, but never resend a message because writing its log failed. */
export async function trackWhatsAppSend(input: MessageLogInput, send: () => Promise<WasenderExecutionResult>): Promise<WasenderExecutionResult> {
  const id = crypto.randomUUID();
  let inserted = false;
  if (Date.now() >= logTableRetryAfter) {
    try {
      const { error } = await supabaseAdmin.from("whatsapp_message_logs").insert({
        id, phone: formatWhatsAppPhone(input.phone) || input.phone,
        provider: input.provider, message_type: input.messageType,
        message_body: input.messageType === "otp" ? "Verification code: [REDACTED]" : input.message.replace(/https?:\/\/[^\s"<>]+/g, value => {
          try { const url = new URL(value); if (url.searchParams.has("X-Amz-Signature")) { url.search = ""; return url.toString(); } } catch {}
          return value;
        }),
        recipient_type: input.recipientType || "user", request_id: input.requestId,
        // Never persist signed URL credentials.
        media_url: input.mediaUrl?.split("?")[0], template_name: input.templateName,
      });
      if (error) {
        if (error.message?.includes("Could not find the table")) {
          logTableRetryAfter = Date.now() + 60000;
          console.warn("[WhatsApp Logs] Apply the WhatsApp Logs database migration; retrying in one minute.");
        } else {
          throw error;
        }
      } else {
        logTableRetryAfter = 0;
        inserted = true;
      }
    } catch (error) {
      console.warn("[WhatsApp Logs] Log table not ready or write skipped:", error);
    }
  }

  let result: WasenderExecutionResult;
  try {
    result = await send();
  } catch {
    result = { success: false, error: "Message dispatch failed unexpectedly", errorCategory: "NETWORK_ERROR" };
  }
  if (inserted) {
  try {
    const provider = result.provider || input.provider;
    const messageId = provider === "wasender" && result.id && !result.simulated
      ? await resolveWasenderMessageId(result.id) : result.id;
    const { error } = await supabaseAdmin.rpc("finish_whatsapp_log", {
      p_id: id, p_provider: provider,
      p_message_id: messageId || null,
        p_status: result.simulated ? "simulated" : result.success ? "accepted" : "failed",
        p_error: input.messageType === "otp" && result.error ? "Verification message failed to send" : result.error || null,
        p_error_category: result.errorCategory || null,
      });
      if (error) throw error;
    } catch (error) {
      console.warn("[WhatsApp Logs] Could not record send result:", error);
    }
  }
  return result;
}

export async function recordWhatsAppReceipt(provider: string, messageId: string, status: string, timestamp: unknown, errorMessage?: string) {
  if (!messageId || !["sent", "delivered", "read", "failed"].includes(status)) return;
  const number = Number(timestamp);
  const date = Number.isFinite(number) && number > 0 ? new Date(number < 1e12 ? number * 1000 : number) : new Date();
  const { error } = await supabaseAdmin.rpc("record_whatsapp_receipt", {
    p_provider: provider, p_message_id: messageId, p_status: status,
    p_occurred_at: Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString(),
    p_error: errorMessage || null,
  });
  if (error) throw error;
}
