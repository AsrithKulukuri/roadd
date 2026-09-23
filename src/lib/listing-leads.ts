import { readSiteFeatures } from "@/lib/site-features";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendListingNotification } from "@/lib/whatsapp/listing-notification";
import { authenticateServerRequest } from "@/lib/server-auth-guard";
import { PortalError } from "@/lib/builder-access";
import { ACTION_LABELS, type ContactAction } from "@/lib/listing-actions";
import { formatWhatsAppPhone } from "@/lib/whatsapp/whatsapp-share";

export async function leadUser(request: Request) {
  const auth = await authenticateServerRequest(request);
  if (!auth.authorized || !auth.user) throw new PortalError("Verify your phone to continue.", 401);
  if (!/^91[6-9]\d{9}$/.test(formatWhatsAppPhone(auth.user.phone || ""))) throw new PortalError("Verify your phone to continue.", 401);
  return auth.user;
}
export async function getActionListing(type: "project" | "property", id: string) {
  if (type === "property" && !(await readSiteFeatures()).propertiesEnabled) throw new PortalError("Property features are currently unavailable.", 404);
  if (!/^[a-zA-Z0-9_-]{1,180}$/.test(id)) throw new PortalError("Invalid listing.");
  const table = type === "project" ? "projects" : "properties";
  let result = await supabaseAdmin.from(table).select("*").eq("id", id).maybeSingle();
  if (!result.data) result = await supabaseAdmin.from(table).select("*").eq("slug", id).maybeSingle();
  if (result.error) throw result.error;
  if (!result.data || result.data.isPublished === false || ["draft", "archived", "deleted"].includes(result.data.status)) throw new PortalError("Listing unavailable.", 404);
  return result.data;
}
export function listingPhone(listing: Record<string, any>) {
  const b = typeof listing.builder === "object" && listing.builder ? listing.builder : {};
  const raw =
    listing.builderWhatsapp ||
    listing.builder_whatsapp ||
    listing.builderPhone ||
    listing.builder_phone ||
    listing.ownerWhatsapp ||
    listing.owner_whatsapp ||
    listing.ownerPhone ||
    listing.owner_phone ||
    listing.contactWhatsapp ||
    listing.contact_whatsapp ||
    listing.contactPhone ||
    listing.contact_phone ||
    b.whatsapp ||
    b.phone ||
    "";
  return formatWhatsAppPhone(raw);
}
export async function recordListingAction(request: Request, type: "project" | "property", id: string, action: ContactAction) {
  const user = await leadUser(request);
  const listing = await getActionListing(type, id);
  const phone = listingPhone(listing);
  const adminPhone = formatWhatsAppPhone(process.env.ADMIN_WHATSAPP_PHONE || process.env.NEXT_PUBLIC_ADMIN_WHATSAPP_PHONE || "");
  const targetRecipient = phone || adminPhone;
  if (!targetRecipient && ["reveal_phone", "whatsapp_click"].includes(action)) {
    throw new PortalError("Contact details are not available. Please contact ROAD support.", 404);
  }
  if (action === "brochure_download" && !listing.brochureUrl) throw new PortalError("Brochure unavailable.", 404);
  const row = {
    user_id: user.id, listing_type: type, listing_id: String(listing.id), listing_slug: listing.slug,
    listing_name: listing.name || listing.title, action, action_day: new Date().toISOString().slice(0, 10),
    buyer_name: user.name || null, buyer_phone: user.phone || null, buyer_email: user.email || null,
    recipient_phone: phone || null, source: "listing_action", consent_version: "contact-sharing-v1",
  };
  const saved = await supabaseAdmin.from("listing_action_leads").insert(row).select("*").single();
  const { error } = saved;
  let data = saved.data;
  if (error && error.code !== "23505") throw error;
  // Repeated callback clicks can recover missing/failed notifications without adding another lead.
  if (!data && action === "callback_request") {
    const existing = await supabaseAdmin.from("listing_action_leads").select("*")
      .eq("user_id", user.id).eq("listing_type", type).eq("listing_id", String(listing.id))
      .eq("action", action).eq("action_day", row.action_day).single();
    if (existing.error || !existing.data) throw existing.error || new Error("Callback request unavailable.");
    data = existing.data;
  }
  const notifications = { builderAccepted: false, adminAccepted: false, userAccepted: false };
  if (data) {
    const timeFormatted = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "medium",
      timeStyle: "short",
    });
    const message =
      (action === "callback_request" ? `📞 *Callback requested on ROAD Facing!*\n\n` : `🔔 *New Lead Alert on ROAD Facing!*\n\n`) +
      `📌 *Listing:* ${row.listing_name}\n` +
      `⚡ *Action:* ${ACTION_LABELS[action]}\n\n` +
      `👤 *Viewer Details:*\n` +
      `• *Name:* ${user.name || "Interested Buyer"}\n` +
      `• *Phone:* +${formatWhatsAppPhone(user.phone || "")}\n` +
      (user.email ? `• *Email:* ${user.email}\n` : "") +
      `• *Time:* ${timeFormatted}\n\n` +
      (action === "callback_request" ? `This buyer wants a callback. Please call them shortly on the number above.\n\n` : `Please connect with this interested buyer.\n\n`) +
      `— ROAD Facing`;
    const recipients = [...new Set([phone, adminPhone].filter(Boolean))];
    const delivered = new Set<string>();
    for (const recipient of recipients) {
      try {
        const sent = await sendListingNotification(recipient, message, { requestId: data.id + (action === "callback_request" ? ":callback-v2:" : ":") + recipient, recipientType: recipient === phone ? "builder" : "admin" }, action === "callback_request");
        if (sent.success && !sent.simulated) delivered.add(recipient);
      } catch { /* Saved lead remains available for admin follow-up. */ }
    }
    notifications.builderAccepted = !!phone && delivered.has(phone);
    notifications.adminAccepted = !!adminPhone && delivered.has(adminPhone);
    if (action === "callback_request") {
      try {
        const confirmation = await sendListingNotification(formatWhatsAppPhone(user.phone),
          `Hello ${user.name || "there"}! Your callback request for ${row.listing_name} has been received. Our team will call you shortly on your verified number. — ROAD Facing`,
          { requestId: data.id + ":callback:user", recipientType: "user" }, true);
        notifications.userAccepted = confirmation.success && !confirmation.simulated;
      } catch { /* A confirmation failure must not discard the saved callback. */ }
    }
    await supabaseAdmin.from("listing_action_leads").update({ builder_notified: notifications.builderAccepted, admin_notified: notifications.adminAccepted }).eq("id", data.id);
  }
  return { listing, phone: targetRecipient, duplicate: !saved.data, notifications: data ? notifications : null };
}
