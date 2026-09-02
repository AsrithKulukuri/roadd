import { supabaseAdmin } from "@/lib/supabase-admin";
import type { ParsedSearchIntent } from "@/lib/search-engine";

export interface ConversationState {
  phone: string;
  userId?: string | null;
  userName?: string | null;
  currentIntent: string;
  lastSearch: Partial<ParsedSearchIntent>;
  selectedPropertyId?: string | null;
  agentMode: boolean;
  activeTicketId?: string | null;
  leadId?: string | null;
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
      const state: ConversationState = {
        phone: data.phone,
        userId: data.user_id || fallbackUserId || null,
        userName: data.user_name || fallbackName || "Valued Member",
        currentIntent: data.current_intent || "GREETING",
        lastSearch: (data.last_search as Partial<ParsedSearchIntent>) || {},
        selectedPropertyId: data.selected_property_id || null,
        agentMode: Boolean(data.agent_mode),
        activeTicketId: data.active_ticket_id || null,
        leadId: data.lead_id || null,
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
    lastSearch: {},
    selectedPropertyId: null,
    agentMode: false,
    activeTicketId: null,
    leadId: null,
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

  try {
    await supabaseAdmin.from("whatsapp_conversation_state").upsert({
      phone: merged.phone,
      user_id: merged.userId || null,
      user_name: merged.userName || null,
      current_intent: merged.currentIntent,
      last_search: merged.lastSearch,
      selected_property_id: merged.selectedPropertyId || null,
      agent_mode: merged.agentMode,
      active_ticket_id: merged.activeTicketId || null,
      lead_id: merged.leadId || null,
      last_interaction_at: merged.lastInteractionAt,
      updated_at: new Date().toISOString(),
    });
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
