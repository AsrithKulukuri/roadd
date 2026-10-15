import { WhatsAppService } from "@/lib/whatsapp-service";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { formatWhatsAppPhone } from "@/lib/whatsapp/whatsapp-share";

/**
 * Returns the production base URL for external WhatsApp links.
 * Avoids sending localhost links to real recipients.
 */
export function getLiveAppUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
    return envUrl.replace(/\/+$/, "");
  }
  return "https://www.roadfacing.com";
}

export interface BuilderWelcomeNotificationParams {
  builderId: string;
  companyName: string;
  contactEmail: string;
  phone: string;
  planMonths?: number;
  initialPassword?: string;
  loginUrl?: string;
}

export interface BuilderExpiryWarningNotificationParams {
  builderId: string;
  companyName: string;
  phone: string;
  daysRemaining: number;
  expiryDate: string;
  renewUrl?: string;
}

export interface BuilderPaymentReceiptNotificationParams {
  builderId: string;
  companyName: string;
  phone: string;
  amount: number;
  paymentId: string;
  planMonths: number;
  newExpiryDate: string;
  portalUrl?: string;
}

/**
 * Sends a warm, executive welcome message to the builder upon portal creation
 * Uses live https://www.roadfacing.com links and excludes static pricing.
 */
export async function sendBuilderWelcomeWhatsApp(params: BuilderWelcomeNotificationParams) {
  const phone = formatWhatsAppPhone(params.phone);
  const liveBase = getLiveAppUrl();
  const loginUrl =
    params.loginUrl && !params.loginUrl.includes("localhost") && !params.loginUrl.includes("127.0.0.1")
      ? params.loginUrl
      : `${liveBase}/builder/login`;
  const planMonths = params.planMonths || 1;

  const message = [
    `✨ Welcome to ROAD — India's Premier Developer Ecosystem!`,
    `Dear *${params.companyName}*, your exclusive Builder Partner Portal is officially activated.`,
    `🔑 Login Email: ${params.contactEmail}`,
    params.initialPassword ? `🔐 Initial Password: ${params.initialPassword}` : `📱 Access: WhatsApp OTP / Password`,
    `📅 Initial Plan: ${planMonths} Month${planMonths > 1 ? "s" : ""} (${planMonths * 30} Days Active)`,
    `🔗 Builder Portal: ${loginUrl}`,
    `Showcase CRDA/RERA developments, track live buyer site visits & manage listings. Welcome aboard! 🚀`,
    `Team ROAD Partner Success`,
  ].join(" • ");

  const sendResult = await WhatsAppService.sendTextMessage(phone, message, {
    recipientType: "builder",
    requestId: `welcome_${params.builderId}`,
    templateName: "road_alert_notification",
  });

  // Record audit log
  try {
    await supabaseAdmin.from("builder_activity_logs").insert({
      builder_id: params.builderId,
      builder_name: params.companyName,
      action_type: "welcome_whatsapp_sent",
      details: {
        phone,
        loginUrl,
        planMonths,
        sendResult,
        sentAt: new Date().toISOString(),
      },
    });
  } catch {
    // non-fatal
  }

  return sendResult;
}

/**
 * Sends a high-priority 7-day expiration warning to builder
 * Directs to live portal renewal link without hardcoding static prices.
 */
export async function sendBuilderExpiryWarningWhatsApp(params: BuilderExpiryWarningNotificationParams) {
  const phone = formatWhatsAppPhone(params.phone);
  const liveBase = getLiveAppUrl();
  const renewUrl =
    params.renewUrl && !params.renewUrl.includes("localhost") && !params.renewUrl.includes("127.0.0.1")
      ? params.renewUrl
      : `${liveBase}/builder/subscription`;
  const formattedDate = new Date(params.expiryDate).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const message = [
    `⚠️ ROAD Partner Alert: Subscription Renewal Due in ${params.daysRemaining} Days`,
    `Dear *${params.companyName}*, your Builder Portal validity expires on ${formattedDate} (${params.daysRemaining} days remaining).`,
    `Renew online to ensure uninterrupted visibility of your projects, live buyer leads & site visits.`,
    `🔗 Instant Renewal Link: ${renewUrl}`,
    `Instant online checkout via Razorpay (UPI, Credit/Debit Cards, NetBanking).`,
    `Team ROAD Billing Desk`,
  ].join(" • ");

  const sendResult = await WhatsAppService.sendTextMessage(phone, message, {
    recipientType: "builder",
    requestId: `warning_7d_${params.builderId}_${Date.now()}`,
    templateName: "road_alert_notification",
  });

  // Record audit log
  try {
    await supabaseAdmin.from("builder_activity_logs").insert({
      builder_id: params.builderId,
      builder_name: params.companyName,
      action_type: "subscription_reminder_sent",
      details: {
        phone,
        daysRemaining: params.daysRemaining,
        expiryDate: params.expiryDate,
        sendResult,
        sentAt: new Date().toISOString(),
      },
    });
  } catch {
    // non-fatal
  }

  return sendResult;
}

/**
 * Sends an instant payment receipt & subscription confirmation
 */
export async function sendBuilderPaymentSuccessWhatsApp(params: BuilderPaymentReceiptNotificationParams) {
  const phone = formatWhatsAppPhone(params.phone);
  const liveBase = getLiveAppUrl();
  const portalUrl =
    params.portalUrl && !params.portalUrl.includes("localhost") && !params.portalUrl.includes("127.0.0.1")
      ? params.portalUrl
      : `${liveBase}/builder`;
  const formattedDate = new Date(params.newExpiryDate).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const message = [
    `✅ Payment Confirmed — ROAD Builder Subscription`,
    `Dear *${params.companyName}*, your subscription renewal payment was received successfully!`,
    `🧾 Transaction ID: ${params.paymentId}`,
    `⏳ Plan Duration: ${params.planMonths} Month${params.planMonths > 1 ? "s" : ""} (${params.planMonths * 30} Days)`,
    `📅 New Expiry Date: ${formattedDate}`,
    `🔗 Access Portal: ${portalUrl}`,
    `GST Tax Invoice is ready in your billing section. Thank you for partnering with ROAD! 🚀`,
    `Team ROAD Accounts Desk`,
  ].join(" • ");

  const sendResult = await WhatsAppService.sendTextMessage(phone, message, {
    recipientType: "builder",
    requestId: `receipt_${params.paymentId}`,
    templateName: "road_alert_notification",
  });

  return sendResult;
}

export interface BuilderLeadAlertNotificationParams {
  builderId: string;
  builderName: string;
  salesPhone: string;
  buyerName: string;
  buyerPhone: string;
  projectName: string;
  inquiryType?: string;
  unitInterest?: string;
  preferredTime?: string;
}

/**
 * Sends real-time WhatsApp alert to builder sales team when buyer submits inquiry or site visit
 */
export async function sendBuilderLeadAlertWhatsApp(params: BuilderLeadAlertNotificationParams) {
  const phone = formatWhatsAppPhone(params.salesPhone);
  const inquiryType = params.inquiryType || "Site Visit Inbound";
  const unitInterest = params.unitInterest || "Premium Venture";

  const message = [
    `🔔 ROAD Sales Alert: New Buyer Lead for ${params.projectName}`,
    `Buyer: ${params.buyerName} (${params.buyerPhone})`,
    `Inquiry Type: ${inquiryType}`,
    `Interest: ${unitInterest}`,
    params.preferredTime ? `Scheduled Time: ${params.preferredTime}` : `Status: Active Buyer Waiting`,
    `Please contact the buyer immediately to confirm site visit details.`,
    `Team ROAD Lead Desk`,
  ].join(" • ");

  const sendResult = await WhatsAppService.sendTextMessage(phone, message, {
    recipientType: "builder",
    requestId: `lead_alert_${params.builderId}_${Date.now()}`,
    templateName: "road_alert_notification",
  });

  try {
    await supabaseAdmin.from("builder_activity_logs").insert({
      builder_id: params.builderId,
      builder_name: params.builderName,
      action_type: "lead_alert_dispatched" as any,
      entity_name: params.projectName,
      details: {
        buyerName: params.buyerName,
        buyerPhone: params.buyerPhone,
        salesPhone: phone,
        inquiryType,
        unitInterest,
        sendResult,
        sentAt: new Date().toISOString(),
      },
    });
  } catch {
    // non-fatal
  }

  return sendResult;
}
