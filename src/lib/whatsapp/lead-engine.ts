import { supabaseAdmin } from "@/lib/supabase-admin";

export interface WhatsAppLead {
  id?: string;
  phone: string;
  userName?: string;
  userId?: string | null;
  purpose?: "SELF_USE" | "INVESTMENT" | "COMMERCIAL" | "RENTAL" | "OTHER";
  budgetRange?: string;
  timeline?: "IMMEDIATE" | "1_3_MONTHS" | "3_6_MONTHS" | "EXPLORING";
  stage: "NEW" | "EXPLORING" | "INTERESTED" | "QUALIFIED" | "SITE_VISIT" | "NEGOTIATION" | "CUSTOMER" | "LOST";
  leadScore: number;
  interestedProjectId?: string;
  interestedProjectName?: string;
  notes?: string;
}

/**
 * Calculates a dynamic Lead Quality Score (0 - 100) based on buyer signals.
 */
export function calculateLeadScore(params: {
  hasBudget: boolean;
  hasLocation: boolean;
  hasBhk: boolean;
  timeline?: string;
  purpose?: string;
  isRegistered: boolean;
  siteVisitRequested?: boolean;
  interactionCount?: number;
}): number {
  let score = 15; // base score for chatting

  if (params.isRegistered) score += 20;
  if (params.hasBudget) score += 20;
  if (params.hasLocation) score += 15;
  if (params.hasBhk) score += 10;
  if (params.timeline === "IMMEDIATE" || params.timeline === "1_3_MONTHS") score += 15;
  if (params.purpose === "SELF_USE" || params.purpose === "INVESTMENT") score += 10;
  if (params.siteVisitRequested) score += 25;
  if (params.interactionCount && params.interactionCount >= 5) score += 10;

  return Math.min(100, score);
}

/**
 * Creates or updates a CRM Lead in Supabase.
 */
export async function syncLead(lead: WhatsAppLead) {
  try {
    const { data: existing } = await supabaseAdmin
      .from("whatsapp_leads")
      .select("id, lead_score, stage")
      .eq("phone", lead.phone)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      const updatedScore = Math.max(existing.lead_score || 0, lead.leadScore);
      await supabaseAdmin
        .from("whatsapp_leads")
        .update({
          user_name: lead.userName,
          user_id: lead.userId || null,
          purpose: lead.purpose || undefined,
          budget_range: lead.budgetRange || undefined,
          timeline: lead.timeline || undefined,
          stage: lead.stage || existing.stage,
          lead_score: updatedScore,
          interested_project_id: lead.interestedProjectId || undefined,
          interested_project_name: lead.interestedProjectName || undefined,
          notes: lead.notes || undefined,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      return existing.id;
    }

    const { data: newLead } = await supabaseAdmin
      .from("whatsapp_leads")
      .insert({
        phone: lead.phone,
        user_name: lead.userName,
        user_id: lead.userId || null,
        purpose: lead.purpose || "SELF_USE",
        budget_range: lead.budgetRange || null,
        timeline: lead.timeline || "1_3_MONTHS",
        stage: lead.stage || "NEW",
        lead_score: lead.leadScore,
        interested_project_id: lead.interestedProjectId || null,
        interested_project_name: lead.interestedProjectName || null,
        notes: lead.notes || null,
      })
      .select("id")
      .single();

    return newLead?.id || null;
  } catch (err) {
    console.warn("[LEAD SYNC ERROR]", err);
    return null;
  }
}

/**
 * Saves a property for a WhatsApp user.
 */
export async function savePropertyForUser(phone: string, item: { id: string; title: string; locationText?: string; priceText?: string; type: "property" | "project" }) {
  try {
    const { data: existing } = await supabaseAdmin
      .from("whatsapp_saved_properties")
      .select("id")
      .eq("phone", phone)
      .eq("property_or_project_id", item.id)
      .maybeSingle();

    if (existing) return { saved: true, isNew: false };

    await supabaseAdmin.from("whatsapp_saved_properties").insert({
      phone,
      property_or_project_id: item.id,
      item_type: item.type,
      title: item.title,
      location_text: item.locationText || null,
      price_text: item.priceText || null,
    });

    return { saved: true, isNew: true };
  } catch (err) {
    console.warn("[SAVE PROPERTY ERROR]", err);
    return { saved: false, isNew: false };
  }
}

/**
 * Fetches all saved properties for a WhatsApp user.
 */
export async function getSavedPropertiesForUser(phone: string) {
  try {
    const { data } = await supabaseAdmin
      .from("whatsapp_saved_properties")
      .select("*")
      .eq("phone", phone)
      .order("created_at", { ascending: false })
      .limit(10);

    return data || [];
  } catch (err) {
    console.warn("[GET SAVED PROPERTIES ERROR]", err);
    return [];
  }
}

/**
 * Creates a formal Site Visit Booking Request.
 */
export async function createSiteVisitRequest(params: {
  phone: string;
  userName: string;
  propertyId: string;
  propertyTitle: string;
  preferredDate?: string;
  preferredSlot?: "MORNING" | "AFTERNOON" | "EVENING";
}) {
  try {
    const { data, error } = await supabaseAdmin
      .from("whatsapp_site_visits")
      .insert({
        phone: params.phone,
        user_name: params.userName,
        property_or_project_id: params.propertyId,
        property_title: params.propertyTitle,
        preferred_date: params.preferredDate || new Date().toISOString().split("T")[0],
        preferred_time_slot: params.preferredSlot || "MORNING",
        status: "REQUESTED",
      })
      .select("id")
      .single();

    if (error) throw error;
    return data.id;
  } catch (err) {
    console.warn("[SITE VISIT CREATE ERROR]", err);
    return null;
  }
}
