import { supabaseAdmin } from "@/lib/supabase-admin";
import { lookupExactRefId, formatLocation } from "@/lib/whatsapp/whatsapp-concierge";
import { syncLead } from "@/lib/whatsapp/lead-engine";
import { updateConversationState } from "@/lib/whatsapp/conversation-state";

export interface SiteVisitRequest {
  phone: string;
  userName: string;
  refId?: string;
  preferredDate?: string;
  preferredTimeSlot?: string;
  rawText: string;
}

export interface SiteVisitResult {
  isBooking: boolean;
  scheduled: boolean;
  confirmationMessage: string;
  ticketId?: string;
}

/**
 * Checks if incoming user message has site visit intent.
 */
export function isSiteVisitIntent(text: string): boolean {
  const norm = text.toLowerCase().trim();
  return (
    /\b(?:book|schedule|arrange|want|plan|request)\s*(?:a\s+)?(?:site\s*)?visit\b/i.test(norm) ||
    /\b(?:site\s*visit)\b/i.test(norm) ||
    /\b(?:visit\s+(?:the\s+)?(?:site|property|project|flat|house))\b/i.test(norm) ||
    /\b(?:see\s+(?:the\s+)?(?:site|property|project))\b/i.test(norm) ||
    norm.includes("site visit") ||
    norm.includes("visit site")
  );
}

/**
 * Extracts candidate date/time strings from text.
 */
export function extractVisitTimeSlot(text: string): { dateStr: string; timeStr: string } {
  const norm = text.toLowerCase();
  let dateStr = "Upcoming Saturday (Recommended)";
  let timeStr = "11:00 AM";

  if (norm.includes("today")) dateStr = "Today";
  else if (norm.includes("tomorrow")) dateStr = "Tomorrow";
  else if (norm.includes("saturday")) dateStr = "This Saturday";
  else if (norm.includes("sunday")) dateStr = "This Sunday";
  else if (norm.includes("monday")) dateStr = "This Monday";

  const timeMatch = norm.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  if (timeMatch) {
    const hour = timeMatch[1].padStart(2, "0");
    const min = timeMatch[2] || "00";
    const period = timeMatch[3].toUpperCase();
    timeStr = `${hour}:${min} ${period}`;
  } else if (norm.includes("morning")) {
    timeStr = "10:30 AM";
  } else if (norm.includes("afternoon")) {
    timeStr = "02:30 PM";
  } else if (norm.includes("evening")) {
    timeStr = "04:30 PM";
  }

  return { dateStr, timeStr };
}

/**
 * Processes and confirms a site visit booking on WhatsApp.
 */
export async function handleSiteVisitBooking(params: {
  phone: string;
  userName: string;
  text: string;
  lastViewedRefId?: string | null;
}): Promise<SiteVisitResult> {
  const { dateStr, timeStr } = extractVisitTimeSlot(params.text);
  const targetRef = params.lastViewedRefId || "REF0001";

  const match = await lookupExactRefId(targetRef);
  const targetName = match?.item.name || match?.item.title || "Selected Project";
  const targetLoc = match ? formatLocation(match.item) : "Andhra Pradesh";
  const canonicalUrl = match?.canonicalUrl || "https://www.roadfacing.com";

  // Create support ticket for sales advisory desk
  let ticketId = `SV-${Date.now().toString().slice(-6)}`;
  try {
    const { data: ticket } = await supabaseAdmin
      .from("whatsapp_support_tickets")
      .insert({
        phone: params.phone,
        user_name: params.userName || "Valued Member",
        subject: `📅 Site Visit: ${targetName} (${targetRef}) on ${dateStr} at ${timeStr}`,
        last_message: params.text,
        priority: "urgent",
        status: "open",
      })
      .select("id")
      .single();

    if (ticket?.id) ticketId = ticket.id.slice(0, 8).toUpperCase();
  } catch {}

  // Sync high-intent lead in CRM (score 85+)
  await syncLead({
    phone: params.phone,
    userName: params.userName,
    stage: "SITE_VISIT",
    leadScore: 90,
    interestedProjectId: match?.item.id,
    interestedProjectName: targetName,
    notes: `Site visit requested for ${targetRef} on ${dateStr} at ${timeStr}`,
  });

  // Update conversation state to site_visit stage
  await updateConversationState({
    phone: params.phone,
    stage: "site_visit",
    lastViewedRefId: targetRef,
  });

  const confirmationMessage =
    `📅 *Site Visit Confirmed!* 🎉\n\n` +
    `Hello ${params.userName || "Valued Member"}, your private property tour has been scheduled:\n\n` +
    `🏡 *Listing:* ${targetName} (*${targetRef}*)\n` +
    `📍 *Location:* ${targetLoc}\n` +
    `🗓️ *Date:* ${dateStr}\n` +
    `⏰ *Time Slot:* ${timeStr}\n` +
    `🎫 *Booking Reference:* #${ticketId}\n\n` +
    `🔗 *Project Details & Directions:*\n${canonicalUrl}\n\n` +
    `👨‍💼 A dedicated ROAD property advisor has been notified and will call you prior to the visit to share exact gate directions and meet you on site.\n\n` +
    `_Need to reschedule? Simply reply "Reschedule visit" or "Cancel visit" anytime._`;

  return {
    isBooking: true,
    scheduled: true,
    confirmationMessage,
    ticketId,
  };
}
