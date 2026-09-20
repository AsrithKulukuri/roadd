import { supabaseAdmin } from "@/lib/supabase-admin";
import { formatWhatsAppPhone } from "@/lib/whatsapp/whatsapp-share";
import type { WhatsAppExecutionResult } from "@/lib/whatsapp-types";


export interface MessageLogInput {
  phone: string;
  provider: "meta";
  messageType: string;
  message: string;
  requestId?: string;
  recipientType?: "user" | "builder" | "admin";
  mediaUrl?: string;
  templateName?: string;
}

/** Retry persistence independently; never repeat a provider send because logging failed. */
export async function trackWhatsAppSend(input: MessageLogInput, send: () => Promise<WhatsAppExecutionResult>): Promise<WhatsAppExecutionResult> {
  const id = crypto.randomUUID();
  const row = {
    id, phone: formatWhatsAppPhone(input.phone) || input.phone, provider: "meta",
    message_type: input.messageType,
    message_body: input.messageType === "otp" ? "Verification code: [REDACTED]" : input.message.replace(/https?:\/\/[^\s"<>]+/g, value => {
      try { const url = new URL(value); if (url.searchParams.has("X-Amz-Signature")) { url.search = ""; return url.toString(); } } catch {}
      return value;
    }),
    recipient_type: input.recipientType || "user", request_id: input.requestId,
    media_url: input.mediaUrl?.split("?")[0], template_name: input.templateName,
    created_at: new Date().toISOString(),
  };
  const persistAttempt = async () => {
    try {
      const { error } = await supabaseAdmin.from("whatsapp_message_logs").insert(row);
      if (error && error.code !== "23505") throw error;
      return true;
    } catch (error) {
      console.error("[WhatsApp Logs] Send attempt persistence failed", { logId: id, requestId: input.requestId, error });
      return false;
    }
  };
  let inserted = await persistAttempt();
  let result: WhatsAppExecutionResult;
  try { result = await send(); }
  catch { result = { success: false, error: "Message dispatch failed unexpectedly", errorCategory: "NETWORK_ERROR" }; }
  if (!inserted) inserted = await persistAttempt();
  let logRecorded = false;
  if (inserted) {
    for (let attempt = 0; attempt < 2 && !logRecorded; attempt++) {
      try {
        const { error } = await supabaseAdmin.rpc("finish_whatsapp_log", {
          p_id: id, p_provider: "meta", p_message_id: result.id || null,
          p_status: result.simulated ? "simulated" : result.success ? "accepted" : "failed",
          p_error: input.messageType === "otp" && result.error ? "Verification message failed to send" : result.error || null,
          p_error_category: result.errorCategory || null,
        });
        if (error) throw error;
        logRecorded = true;
      } catch (error) { console.error("[WhatsApp Logs] Send result persistence failed", { logId: id, error }); }
    }
  }
  return { ...result, provider: "meta", logRecorded };
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
