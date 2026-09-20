import { MetaWhatsAppService, getMetaWhatsAppMode, type MetaTemplateComponent } from "@/lib/meta-whatsapp";
import { trackWhatsAppSend } from "@/lib/whatsapp/message-log";
import type { WhatsAppSendOptions } from "@/lib/whatsapp-types";
export const getWhatsAppProvider = () => "meta" as const;
export const getWhatsAppNotificationMode = () => getMetaWhatsAppMode("notification");
export const getWhatsAppOtpMode = () => getMetaWhatsAppMode("otp");
// All application sends pass through this boundary, including validation failures and mocks.
export class WhatsAppService {
  static sendOTPMessage(phone: string, otp: string, options?: WhatsAppSendOptions) {
    return trackWhatsAppSend({ phone, provider: getWhatsAppProvider(), messageType: "otp", message: "[REDACTED]", requestId: options?.requestId, recipientType: options?.recipientType },
      () => MetaWhatsAppService.sendOTPMessage(phone, otp, options));
  }
  static sendTextMessage(phone: string, message: string, options?: WhatsAppSendOptions) {
    return trackWhatsAppSend({ phone, provider: getWhatsAppProvider(), messageType: "text", message, requestId: options?.requestId, recipientType: options?.recipientType, templateName: options?.templateName },
      () => MetaWhatsAppService.sendTextMessage(phone, message, options));
  }
  static sendImageMessage(phone: string, imageUrl: string, text: string, options?: WhatsAppSendOptions) {
    return trackWhatsAppSend({ phone, provider: getWhatsAppProvider(), messageType: "image", message: text, mediaUrl: imageUrl, requestId: options?.requestId, recipientType: options?.recipientType },
      () => MetaWhatsAppService.sendImageMessage(phone, imageUrl, text, options));
  }
  static sendTemplateMessage(phone: string, templateName: string, options?: WhatsAppSendOptions) {
    return trackWhatsAppSend({ phone, provider: getWhatsAppProvider(), messageType: "template", message: options?.fallbackText || JSON.stringify(options?.components || []), templateName, requestId: options?.requestId, recipientType: options?.recipientType },
      () => MetaWhatsAppService.sendTemplateMessage(phone, templateName, { ...options, components: options?.components as MetaTemplateComponent[] | undefined }));
  }
}
