import { WhatsAppService } from "@/lib/whatsapp-service";
import type { WhatsAppSendOptions } from "@/lib/whatsapp-types";

/** Use the approved utility notification template for proactive visit messages. */
export function sendSiteVisitNotification(phone: string, message: string, options: Pick<WhatsAppSendOptions, "requestId" | "recipientType">) {
  return WhatsAppService.sendTextMessage(phone, message, {
    ...options,
    templateName: process.env.META_SITE_VISIT_TEMPLATE_NAME?.trim() || "road_alert_notification",
    languageCode: process.env.META_TEMPLATE_LANGUAGE?.trim() || "en_US",
    components: [{ type: "body", parameters: [{ type: "text", text: message.replace(/\s+/g, " ").trim().slice(0, 1024) }] }],
  });
}
