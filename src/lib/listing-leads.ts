import { supabaseAdmin } from "@/lib/supabase-admin";
import { WasenderService } from "@/lib/wasender";
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
  if (!/^[a-zA-Z0-9_-]{1,180}$/.test(id)) throw new PortalError("Invalid listing.");
  const table = type === "project" ? "projects" : "properties";
  let result = await supabaseAdmin.from(table).select("*").eq("id", id).maybeSingle();
  if (!result.data) result = await supabaseAdmin.from(table).select("*").eq("slug", id).maybeSingle();
  if (result.error) throw result.error;
  if (!result.data || result.data.isPublished === false || ["draft", "archived", "deleted"].includes(result.data.status)) throw new PortalError("Listing unavailable.", 404);
  return result.data;
}
export function listingPhone(listing: Record<string, any>) {
  return formatWhatsAppPhone(listing.builderWhatsapp || listing.builder_whatsapp || listing.builderPhone || listing.builder_phone || listing.ownerPhone || listing.owner_phone || listing.builder?.whatsapp || listing.builder?.phone || "");
}
export async function recordListingAction(request: Request, type: "project" | "property", id: string, action: ContactAction) {
  const user = await leadUser(request);
  const listing = await getActionListing(type, id);
  const phone = listingPhone(listing);
  if (!phone && action !== "brochure_download") throw new PortalError("Contact details are not available. Please contact ROAD support.", 404);
  if (action === "brochure_download" && !listing.brochureUrl) throw new PortalError("Brochure unavailable.", 404);
  const row = {
    user_id: user.id, listing_type: type, listing_id: String(listing.id), listing_slug: listing.slug,
    listing_name: listing.name || listing.title, action, action_day: new Date().toISOString().slice(0, 10),
    buyer_name: user.name || null, buyer_phone: user.phone || null, buyer_email: user.email || null,
    recipient_phone: phone || null, source: "listing_action", consent_version: "contact-sharing-v1",
  };
  const { data, error } = await supabaseAdmin.from("listing_action_leads").insert(row).select("*").single();
  if (error && error.code !== "23505") throw error;
  if (data) {
    const message = "ROAD Facing — " + ACTION_LABELS[action] + "\n\nListing: " + row.listing_name +
      "\nReference: " + listing.id + "\nName: " + (user.name || "Not provided") +
      "\nPhone: " + (user.phone || "Not provided") + (user.email ? "\nEmail: " + user.email : "") +
      "\nAction: " + ACTION_LABELS[action] + "\nTime: " + new Date().toISOString();
    const adminPhone = formatWhatsAppPhone(process.env.ADMIN_WHATSAPP_PHONE || process.env.NEXT_PUBLIC_ADMIN_WHATSAPP_PHONE || "");
    const recipients = [...new Set([phone, adminPhone].filter(Boolean))];
    const delivered = new Set<string>();
    for (const recipient of recipients) {
      try {
        const sent = await WasenderService.sendTextMessage(recipient, message, { requestId: data.id + ":" + recipient });
        if (sent.success) delivered.add(recipient);
      } catch { /* Saved lead remains available for admin follow-up. */ }
    }
    await supabaseAdmin.from("listing_action_leads").update({ builder_notified: delivered.has(phone), admin_notified: !!adminPhone && delivered.has(adminPhone) }).eq("id", data.id);
  }
  return { listing, phone, duplicate: !data };
}
