import { WhatsAppService } from "@/lib/whatsapp-service";
import type { WhatsAppSendOptions } from "@/lib/whatsapp-types";
import { supabaseAdmin } from "@/lib/supabase-admin";

/** Explicit utility template; do not silently fall back to freeform messages. */
export async function sendListingNotification(phone: string, message: string, options: Pick<WhatsAppSendOptions, "requestId" | "recipientType">, deduplicate = false) {
  if (deduplicate && options.requestId) {
    const { data, error } = await supabaseAdmin.from("whatsapp_message_logs").select("id")
      .eq("request_id", options.requestId).in("status", ["accepted", "sent", "delivered", "read"]).limit(1);
    if (error) throw error;
    if (data?.length) return { success: true, simulated: false };
  }
  return WhatsAppService.sendTextMessage(phone, message, {
    ...options,
    templateName: process.env.META_LISTING_ACTION_TEMPLATE_NAME?.trim() || process.env.META_SITE_VISIT_TEMPLATE_NAME?.trim() || "road_alert_notification",
    languageCode: process.env.META_TEMPLATE_LANGUAGE?.trim() || "en_US",
    components: [{ type: "body", parameters: [{ type: "text", text: message.replace(/\s+/g, " ").trim().slice(0, 1024) }] }],
  });
}
