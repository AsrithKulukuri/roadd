import { supabaseAdmin } from "@/lib/supabase-admin";
import type { ParsedSearchIntent } from "@/lib/search-engine";

export interface ConversationState {
  phone: string;
  userId?: string | null;
  userName?: string | null;
  currentIntent: string;
  stage?: "discovery" | "exploring" | "shortlisting" | "site_visit" | "negotiation";
  buyingRentingIntent?: "buy" | "rent" | "invest" | "sell";
  preferredPropertyType?: string;
  preferredLocation?: string;
  preferredBhk?: number;
  minBudget?: number;
  maxBudget?: number;
  lastSearch: Partial<ParsedSearchIntent>;
  lastDisplayedRefIds: string[];
  lastViewedRefId?: string | null;
  selectedPropertyId?: string | null;
  shortlistedRefIds: string[];
  agentMode: boolean;
  activeTicketId?: string | null;
  leadId?: string | null;
  preferredLanguage?: "en" | "te" | "tenglish";
  lastInteractionAt: string;
}

// In-memory local cache with DB persistence fallback
const stateCache = new Map<string, ConversationState>();

/**
 * Loads the active conversation state for a phone number.
 */
export async function getConversationState(phone: string, fallbackName?: string, fallbackUserId?: string): Promise<ConversationState> {
  const cached = stateCache.get(phone);
  if (cached && Date.now() - new Date(cached.lastInteractionAt).getTime() < 30 * 60 * 1000) {
    return cached;
  }

  try {
    const { data } = await supabaseAdmin
      .from("whatsapp_conversation_state")
      .select("*")
      .eq("phone", phone)
      .maybeSingle();

    if (data) {
      const slots = (data.slots && typeof data.slots === "object") ? data.slots : {};
      const state: ConversationState = {
        phone: data.phone,
        userId: data.user_id || fallbackUserId || null,
        userName: data.user_name || fallbackName || "Valued Member",
        currentIntent: data.current_intent || "GREETING",
        stage: data.stage || slots.stage || "discovery",
        buyingRentingIntent: data.buying_renting_intent || slots.buyingRentingIntent || "buy",
        preferredPropertyType: slots.preferredPropertyType || undefined,
        preferredLocation: slots.preferredLocation || undefined,
        preferredBhk: slots.preferredBhk || undefined,
        minBudget: slots.minBudget || undefined,
        maxBudget: slots.maxBudget || undefined,
        lastSearch: (data.last_search as Partial<ParsedSearchIntent>) || {},
        lastDisplayedRefIds: Array.isArray(data.last_displayed_ref_ids)
          ? data.last_displayed_ref_ids
          : (Array.isArray(slots.lastDisplayedRefIds) ? slots.lastDisplayedRefIds : []),
        lastViewedRefId: data.last_viewed_ref_id || slots.lastViewedRefId || null,
        selectedPropertyId: data.selected_property_id || data.last_viewed_ref_id || slots.lastViewedRefId || null,
        shortlistedRefIds: Array.isArray(data.shortlisted_ref_ids)
          ? data.shortlisted_ref_ids
          : (Array.isArray(slots.shortlistedRefIds) ? slots.shortlistedRefIds : []),
        agentMode: Boolean(data.agent_mode),
        activeTicketId: data.active_ticket_id || null,
        leadId: data.lead_id || null,
        preferredLanguage: data.preferred_language || slots.preferredLanguage || "en",
        lastInteractionAt: data.last_interaction_at || new Date().toISOString(),
      };
      stateCache.set(phone, state);
      return state;
    }
  } catch (err) {
    console.warn("[CONVERSATION STATE LOAD ERROR]", err);
  }

  const newState: ConversationState = {
    phone,
    userId: fallbackUserId || null,
    userName: fallbackName || "Valued Member",
    currentIntent: "GREETING",
    stage: "discovery",
    buyingRentingIntent: "buy",
    lastSearch: {},
    lastDisplayedRefIds: [],
    lastViewedRefId: null,
    selectedPropertyId: null,
    shortlistedRefIds: [],
    agentMode: false,
    activeTicketId: null,
    leadId: null,
    preferredLanguage: "en",
    lastInteractionAt: new Date().toISOString(),
  };
  stateCache.set(phone, newState);
  return newState;
}

/**
 * Persists updated conversation state to cache and Supabase.
 */
export async function updateConversationState(state: Partial<ConversationState> & { phone: string }): Promise<void> {
  const current = await getConversationState(state.phone);
  const merged: ConversationState = {
    ...current,
    ...state,
    lastInteractionAt: new Date().toISOString(),
  };

  stateCache.set(state.phone, merged);

  const slotsPayload = {
    stage: merged.stage,
    buyingRentingIntent: merged.buyingRentingIntent,
    preferredPropertyType: merged.preferredPropertyType,
    preferredLocation: merged.preferredLocation,
    preferredBhk: merged.preferredBhk,
    minBudget: merged.minBudget,
    maxBudget: merged.maxBudget,
    lastDisplayedRefIds: merged.lastDisplayedRefIds,
    lastViewedRefId: merged.lastViewedRefId,
    shortlistedRefIds: merged.shortlistedRefIds,
    preferredLanguage: merged.preferredLanguage,
  };

  try {
    const { error: fullUpsertError } = await supabaseAdmin.from("whatsapp_conversation_state").upsert({
      phone: merged.phone,
      user_id: merged.userId || null,
      user_name: merged.userName || null,
      current_intent: merged.currentIntent,
      last_search: merged.lastSearch,
      selected_property_id: merged.selectedPropertyId || merged.lastViewedRefId || null,
      agent_mode: merged.agentMode,
      active_ticket_id: merged.activeTicketId || null,
      lead_id: merged.leadId || null,
      last_displayed_ref_ids: merged.lastDisplayedRefIds,
      last_viewed_ref_id: merged.lastViewedRefId || null,
      shortlisted_ref_ids: merged.shortlistedRefIds,
      stage: merged.stage || "discovery",
      buying_renting_intent: merged.buyingRentingIntent || "buy",
      slots: slotsPayload,
      preferred_language: merged.preferredLanguage || "en",
      last_interaction_at: merged.lastInteractionAt,
      updated_at: new Date().toISOString(),
    });

    if (fullUpsertError) {
      console.warn("[CONVERSATION STATE FULL UPSERT WARN]", fullUpsertError.message);
      // If table schema does not yet have newly added columns, fall back to core schema
      const { error: fallbackError } = await supabaseAdmin.from("whatsapp_conversation_state").upsert({
        phone: merged.phone,
        user_id: merged.userId || null,
        user_name: merged.userName || null,
        current_intent: merged.currentIntent,
        last_search: {
          ...merged.lastSearch,
          _slots: slotsPayload,
        },
        selected_property_id: merged.lastViewedRefId || null,
        agent_mode: merged.agentMode,
        active_ticket_id: merged.activeTicketId || null,
        lead_id: merged.leadId || null,
        last_interaction_at: merged.lastInteractionAt,
        updated_at: new Date().toISOString(),
      });
      if (fallbackError) {
        console.warn("[CONVERSATION STATE FALLBACK WARN]", fallbackError.message);
      }
    }
  } catch (err) {
    console.warn("[CONVERSATION STATE SAVE ERROR]", err);
  }
}

/**
 * Merges previous search context with new follow-up constraints.
 */
export function mergeSearchContext(
  previousSearch: Partial<ParsedSearchIntent>,
  newIntent: ParsedSearchIntent
): ParsedSearchIntent {
  return {
    rawQuery: newIntent.rawQuery,
    normalizedQuery: newIntent.normalizedQuery,
    tokens: newIntent.tokens,
    bhks: newIntent.bhks.length > 0 ? newIntent.bhks : (previousSearch.bhks || []),
    propertyTypes: newIntent.propertyTypes.length > 0 ? newIntent.propertyTypes : (previousSearch.propertyTypes || []),
    listingType: newIntent.listingType || previousSearch.listingType,
    saleType: newIntent.saleType || previousSearch.saleType,
    isGatedCommunity: newIntent.isGatedCommunity !== undefined ? newIntent.isGatedCommunity : previousSearch.isGatedCommunity,
    minPrice: newIntent.minPrice !== undefined ? newIntent.minPrice : previousSearch.minPrice,
    maxPrice: newIntent.maxPrice !== undefined ? newIntent.maxPrice : previousSearch.maxPrice,
    locationKeywords: newIntent.locationKeywords.length > 0 ? newIntent.locationKeywords : (previousSearch.locationKeywords || []),
    specificKeywords: newIntent.specificKeywords.length > 0 ? newIntent.specificKeywords : (previousSearch.specificKeywords || []),
  };
}
