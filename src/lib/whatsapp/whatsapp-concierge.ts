import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { normalizeWhatsAppPhone } from "@/lib/whatsapp-audience";
import { WhatsAppService } from "@/lib/whatsapp-service";
import { formatPriceCompact } from "@/lib/utils";
import { parseSearchIntent, matchesPropertySearch, matchesProjectSearch, type ParsedSearchIntent } from "@/lib/search-engine";
import { mockProperties } from "@/lib/mock-data";
import { getPublicSiteUrl, getListingCanonicalUrl } from "@/lib/canonical-url";
import { extractRefNumber } from "@/lib/ref-id";
import { getConversationState, updateConversationState, mergeSearchContext } from "@/lib/whatsapp/conversation-state";
import { extractAllRefIds, resolveAnaphoricQuery, formatMultiPropertyComparisonCard } from "@/lib/whatsapp/property-intelligence";
import { parseFinancialQuery, calculateHomeLoanEmi, calculateApStampDuty } from "@/lib/whatsapp/financial-calculators";
import { isSiteVisitIntent, handleSiteVisitBooking } from "@/lib/whatsapp/site-visit-engine";
import { detectLanguage, getLocalizedGreeting, type SupportedLanguage } from "@/lib/whatsapp/bilingual-engine";
import type { Property } from "@/types/property";
import type { Project } from "@/types/project";

export interface ConciergeExecutionResult {
  handled: boolean;
  intent: string;
  responseSent: boolean;
  ticketCreated?: boolean;
  message?: string;
  matchedCount?: number;
}

export const WHATSAPP_CONCIERGE_NUMBER = "8466965567";
export const WHATSAPP_CONCIERGE_DISPLAY = "+91 8466965567";
export const WHATSAPP_CONCIERGE_URL = "https://wa.me/918466965567";

function str(val: unknown): string {
  return typeof val === "string" ? val.trim() : "";
}

/**
 * Safely extracts image URL from any property or project record
 */
export function extractHeroImage(item: any): string {
  if (!item) return "";
  if (typeof item.coverImage === "string" && item.coverImage.trim()) return item.coverImage.trim();
  if (Array.isArray(item.images) && item.images.length > 0) {
    const first = item.images[0];
    if (typeof first === "string" && first.trim()) return first.trim();
    if (first && typeof first.url === "string" && first.url.trim()) return first.url.trim();
  }
  if (typeof item.imageUrl === "string" && item.imageUrl.trim()) return item.imageUrl.trim();
  if (typeof item.mediaUrl === "string" && item.mediaUrl.trim()) return item.mediaUrl.trim();
  return "";
}

/**
 * Safely formats location string from property or project
 */
export function formatLocation(item: any): string {
  if (!item) return "";
  if (typeof item.location === "string") {
    return [item.location, item.city].filter(Boolean).join(", ");
  }
  if (item.location && typeof item.location === "object") {
    const loc = item.location;
    return [loc.locality || loc.address, loc.city].filter(Boolean).join(", ");
  }
  return [item.subLocation, item.city].filter(Boolean).join(", ");
}

/**
 * Deterministic Reference ID extractor and normalizer.
 * Extracts patterns like:
 * - "ref001", "Ref0001", "REF-0001", "ref 001", "ref1" -> "REF0001"
 * - "prop002", "ROAD-104" -> "REF0104"
 * - "REF0003" -> "REF0003"
 * Returns canonical normalized 'REF' + digits.padStart(4, '0') or null.
 */
export function extractAndNormalizeRefId(text: string): string | null {
  if (!text || !text.trim()) return null;
  const trimmed = text.trim();

  // 1. Explicit REF pattern: ref followed by optional separator and 1 to 6 digits
  const refMatch = trimmed.match(/\bref[\s\-_]*0*(\d{1,6})\b/i);
  if (refMatch && refMatch[1]) {
    return `REF${refMatch[1].padStart(4, "0")}`;
  }

  // 2. Alternative prefixes used on ROAD (prop, property, road)
  const altMatch = trimmed.match(/\b(?:prop|property|road)[\s\-_]*0*(\d{1,6})\b/i);
  if (altMatch && altMatch[1]) {
    return `REF${altMatch[1].padStart(4, "0")}`;
  }

  // 3. Standalone pure ref identifier
  const directMatch = trimmed.match(/^#?REF[\s\-_]*0*(\d{1,6})$/i);
  if (directMatch && directMatch[1]) {
    return `REF${directMatch[1].padStart(4, "0")}`;
  }

  return null;
}

/**
 * Performs an exact database lookup for a Reference ID.
 * Never performs fuzzy fallbacks.
 */
export async function lookupExactRefId(normalizedRef: string): Promise<{
  type: "project" | "property";
  item: any;
  canonicalUrl: string;
  refId: string;
} | null> {
  const cleanRef = normalizedRef.toUpperCase().trim();
  const digitsMatch = cleanRef.match(/\d+/);
  const num = digitsMatch ? parseInt(digitsMatch[0], 10) : null;

  try {
    // 1. Exact query in projects table
    const { data: dbProjects } = await supabaseAdmin
      .from("projects")
      .select("*")
      .limit(100);

    if (dbProjects && dbProjects.length > 0) {
      const match = dbProjects.find((p) => {
        const r = String(p.refId || p.ref_id || (p.location as any)?.refId || "").toUpperCase().replace(/[\s-_]/g, "");
        if (r === cleanRef) return true;
        if (num && extractRefNumber(r)?.num === num) return true;
        if (String(p.id || "").toUpperCase() === cleanRef || String(p.slug || "").toUpperCase() === cleanRef) return true;
        return false;
      });

      if (match) {
        const actualRef = match.refId || cleanRef;
        return {
          type: "project",
          item: match,
          canonicalUrl: getListingCanonicalUrl("project", match.slug || match.id),
          refId: actualRef,
        };
      }
    }

    // 2. Exact query in properties table
    const { data: dbProps } = await supabaseAdmin
      .from("properties")
      .select("*")
      .limit(100);

    const allProps = dbProps && dbProps.length > 0 ? dbProps : mockProperties;
    const propMatch = allProps.find((p) => {
      const r = String(p.refId || p.ref_id || (p.location as any)?.refId || "").toUpperCase().replace(/[\s-_]/g, "");
      if (r === cleanRef) return true;
      if (num && extractRefNumber(r)?.num === num) return true;
      if (String(p.id || "").toUpperCase() === cleanRef || String(p.slug || "").toUpperCase() === cleanRef) return true;
      return false;
    });

    if (propMatch) {
      const actualRef = propMatch.refId || cleanRef;
      return {
        type: "property",
        item: propMatch,
        canonicalUrl: getListingCanonicalUrl("property", propMatch.slug || propMatch.id),
        refId: actualRef,
      };
    }
  } catch (err) {
    console.error("[REF ID LOOKUP ERROR]", err);
  }

  return null;
}

/**
 * Formats a single rich card for an exact Reference ID match.
 */
export function formatSingleRefCard(item: any, type: "project" | "property", refId: string, canonicalUrl: string): string {
  const isProj = type === "project";
  const name = str(item.name) || str(item.title) || (isProj ? "Featured Project" : "Verified Property");
  const loc = formatLocation(item);

  let priceStr = "Contact for Pricing";
  if (isProj) {
    if (item.minPrice && item.maxPrice) {
      priceStr = `${formatPriceCompact(item.minPrice)} - ${formatPriceCompact(item.maxPrice)}`;
    } else if (item.minPrice) {
      priceStr = `Starting at ${formatPriceCompact(item.minPrice)}`;
    } else if (Array.isArray(item.configurations) && item.configurations[0]?.priceMin) {
      const prices = item.configurations.map((c: any) => c.priceMin).filter(Boolean);
      priceStr = `Starting at ${formatPriceCompact(Math.min(...prices))}`;
    }
  } else {
    priceStr = typeof item.price === "number" ? formatPriceCompact(item.price) : "Contact for Price";
  }

  const configs = Array.isArray(item.configurations)
    ? item.configurations.map((c: any) => c.label || `${c.bedrooms} BHK`).filter(Boolean).join(", ")
    : (item.bedrooms ? `${item.bedrooms} BHK` : "");

  const statusText = item.constructionStatus || item.status || "Verified";

  let card = `🎯 *Found Listing ${refId}*\n\n`;
  card += `${isProj ? "🏗️" : "🏠"} *${name}* (${isProj ? "Project" : "Property"})\n`;
  card += `🆔 *Ref ID:* ${refId}\n`;
  if (loc) card += `📍 *Location:* ${loc}\n`;
  card += `💰 *Price:* ${priceStr}\n`;
  if (configs) card += `🛏️ *Configurations:* ${configs}\n`;
  if (item.totalArea || item.area) card += `📐 *Area:* ${item.totalArea || item.area + " sq.ft"}\n`;
  card += `📊 *Status:* ${str(statusText).replace("-", " ").toUpperCase()}\n`;
  card += `✅ *Verification:* Verified on ROAD\n\n`;
  card += `🔗 *Explore Complete Details & Photos:*\n${canonicalUrl}\n\n`;
  card += `_Reply "Book site visit", "Talk to agent", or ask any question about this listing!_`;

  return card;
}

/**
 * Checks whether a sender's phone number is registered and verified on ROAD.
 */
export async function getRegisteredUserByPhone(rawPhone: string) {
  const phone = normalizeWhatsAppPhone(rawPhone);
  if (!phone) return null;

  const phoneVariants = Array.from(
    new Set([
      phone,
      `+${phone}`,
      phone.startsWith("91") ? phone.slice(2) : phone,
      phone.startsWith("+91") ? phone.slice(3) : phone,
      `91${phone}`,
      phone.replace(/\D/g, ""),
    ])
  ).filter(Boolean);

  try {
    const [userProfilesRes, profilesRes, contactsRes] = await Promise.all([
      supabaseAdmin
        .from("user_profiles")
        .select("id, full_name, email, phone, role, is_verified, is_profile_complete")
        .in("phone", phoneVariants)
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from("profiles")
        .select("id, full_name, email, phone, role, is_verified, is_profile_complete")
        .in("phone", phoneVariants)
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from("whatsapp_contacts")
        .select("id, name, phone, profile_id")
        .in("phone", phoneVariants)
        .limit(1)
        .maybeSingle(),
    ]);

    const contactName = str(contactsRes.data?.name);

    if (userProfilesRes.data) {
      const u = userProfilesRes.data;
      return {
        id: str(u.id),
        name: str(u.full_name) || contactName || "",
        email: str(u.email),
        phone: str(u.phone) || phone,
        role: str(u.role) || "buyer",
        isVerified: Boolean(u.is_verified),
        isProfileComplete: Boolean(u.is_profile_complete),
      };
    }

    if (profilesRes.data) {
      const p = profilesRes.data;
      return {
        id: str(p.id),
        name: str(p.full_name) || contactName || "",
        email: str(p.email),
        phone: str(p.phone) || phone,
        role: str(p.role) || "buyer",
        isVerified: Boolean(p.is_verified),
        isProfileComplete: Boolean(p.is_profile_complete),
      };
    }

    if (contactsRes.data && contactsRes.data.name) {
      const c = contactsRes.data;
      return {
        id: str(c.profile_id) || str(c.id),
        name: str(c.name),
        email: "",
        phone: str(c.phone) || phone,
        role: "buyer",
        isVerified: true,
        isProfileComplete: Boolean(c.name),
      };
    }
  } catch (err) {
    console.warn("[CONCIERGE USER LOOKUP ERROR]", err);
  }

  return null;
}

/**
 * Fetches recent conversation history for multi-turn Gemini context
 */
async function getRecentConversationHistory(phone: string, limit = 6): Promise<{ historyText: string; lastUserMessage: string; lastAssistantMessage: string }> {
  try {
    const { data } = await supabaseAdmin
      .from("whatsapp_support_conversations")
      .select("role, message, created_at")
      .eq("phone", phone)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (!data || data.length === 0) {
      return { historyText: "", lastUserMessage: "", lastAssistantMessage: "" };
    }

    const lastUser = data.find((m) => m.role === "user")?.message || "";
    const lastAssistant = data.find((m) => m.role === "assistant")?.message || "";

    const historyText = [...data]
      .reverse()
      .map((m) => `${m.role === "user" ? "User" : "ROAD AI"}: ${m.message}`)
      .join("\n");

    return { historyText, lastUserMessage: lastUser, lastAssistantMessage: lastAssistant };
  } catch {
    return { historyText: "", lastUserMessage: "", lastAssistantMessage: "" };
  }
}

/**
 * Grounded Gemini Analysis: strictly forbids inventing prices, availability, or legal claims.
 */
async function analyzeWithGemini(userText: string, conversationHistory: string, userName: string, language: SupportedLanguage = "en") {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const langInstruction =
      language === "te"
        ? "The user is communicating in Telugu (తెలుగు). Provide conversational responses in Telugu script."
        : language === "tenglish"
        ? "The user is communicating in Tenglish (Telugu words transliterated in English script, e.g. 'namaskaram', 'kavali', 'entha'). Provide conversational responses in natural Tenglish."
        : "The user is communicating in English. Provide responses in English.";

    const prompt = `You are "ROADFACING AI Concierge" 🏡 — the friendly, expert AI real estate assistant on WhatsApp for "ROADFACING" (Andhra Pradesh's verified real estate platform in Vijayawada, Guntur, Amaravati, Visakhapatnam).
User Name: ${userName || "Valued Member"}
Preferred Language: ${language} (${langInstruction})

GROUNDING & INTEGRITY RULES (STRICT):
1. Never invent or hallucinate property details, prices, availability, approvals, or legal claims.
2. If the user asks for specific listings or Reference IDs, categorize as "property_search".
3. Never use or generate 'localhost' links.
4. Keep WhatsApp responses warm, concise, with bold text and emojis.

Recent Conversation Context:
${conversationHistory || "No previous messages"}

User's Latest Message: "${userText}"

Classify into ONE of these:
1. "interactive_chat": General chat, questions about your identity ("Who are you?", "Are you a robot?"), general AP real estate questions (RERA guidance, stamp duty concepts, localities in AP), greetings, or compliments.
2. "property_search": User is searching for properties/projects (e.g. "3bhk in poranki", "Avenue Serene", "villas in guntur", "plots in amaravati", "flats under 60L").
3. "human_agent": User asks for a human consultant, agent, phone call, or negotiation.

Respond ONLY with valid JSON:
{
  "category": "interactive_chat" | "property_search" | "human_agent",
  "chatResponse": string | null
}`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();
    const cleanJson = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    return JSON.parse(cleanJson);
  } catch (err) {
    console.warn("[GEMINI ANALYZE ERROR]", err);
    return null;
  }
}

/**
 * Searches active verified properties and projects from Supabase.
 */
async function searchLiveListings(queryText: string, parsedIntent: ParsedSearchIntent) {
  const hasSearchCriteria =
    parsedIntent.locationKeywords.length > 0 ||
    parsedIntent.bhks.length > 0 ||
    parsedIntent.propertyTypes.length > 0 ||
    parsedIntent.maxPrice !== undefined ||
    parsedIntent.minPrice !== undefined ||
    parsedIntent.specificKeywords.length > 0;

  if (!hasSearchCriteria) {
    return { properties: [], projects: [], allProjects: [], allProperties: [] };
  }

  try {
    const [{ data: dbProps }, { data: dbProjects }] = await Promise.all([
      supabaseAdmin.from("properties").select("*").limit(200),
      supabaseAdmin.from("projects").select("*").limit(200),
    ]);

    const allProperties: any[] = dbProps && dbProps.length > 0 ? dbProps : mockProperties;
    const allProjects: any[] = dbProjects && dbProjects.length > 0 ? dbProjects : [];

    const matchedProperties = allProperties.filter((p) => matchesPropertySearch(p as Property, queryText, parsedIntent));
    const matchedProjects = allProjects.filter((p) => matchesProjectSearch(p as Project, queryText, parsedIntent));

    if (matchedProperties.length > 0 || matchedProjects.length > 0) {
      return {
        properties: matchedProperties,
        projects: matchedProjects,
        allProjects,
        allProperties,
      };
    }

    // Precise fallback: Only return items matching the exact location/BHK/budget criteria
    const fallbackProjects = allProjects.filter((p) => {
      const locText = formatLocation(p).toLowerCase();
      const nameText = `${p.name || ""} ${p.title || ""}`.toLowerCase();

      if (parsedIntent.locationKeywords.length > 0) {
        const matchesLoc = parsedIntent.locationKeywords.some((loc) => locText.includes(loc) || nameText.includes(loc));
        if (!matchesLoc) return false;
      }
      if (parsedIntent.bhks.length > 0) {
        const configs = p.configurations || [];
        const matchesBhk = configs.some((c: any) => {
          const b = c.bedrooms || (c.label ? parseInt(c.label.replace(/\D/g, ""), 10) : 0);
          return parsedIntent.bhks.includes(b);
        });
        if (!matchesBhk) return false;
      }
      if (parsedIntent.maxPrice) {
        const configMinPrices = (p.configurations || []).map((c: any) => c.priceMin).filter(Boolean);
        const minProjectPrice = configMinPrices.length > 0 ? Math.min(...configMinPrices) : (p.minPrice || 0);
        if (minProjectPrice && minProjectPrice > parsedIntent.maxPrice) return false;
      }
      return true;
    });

    const fallbackProps = allProperties.filter((p) => {
      const locText = formatLocation(p).toLowerCase();
      const titleText = (p.title || "").toLowerCase();

      if (parsedIntent.locationKeywords.length > 0) {
        const matchesLoc = parsedIntent.locationKeywords.some((loc) => locText.includes(loc) || titleText.includes(loc));
        if (!matchesLoc) return false;
      }
      if (parsedIntent.bhks.length > 0) {
        if (!p.bedrooms || !parsedIntent.bhks.includes(p.bedrooms)) return false;
      }
      if (parsedIntent.maxPrice && typeof p.price === "number" && p.price > parsedIntent.maxPrice) return false;
      return true;
    });

    return {
      properties: fallbackProps,
      projects: fallbackProjects,
      allProjects,
      allProperties,
    };
  } catch (err) {
    console.error("[CONCIERGE DB SEARCH ERROR]", err);
    return { properties: [], projects: [], allProjects: [], allProperties: [] };
  }
}

/**
 * Logs a message into whatsapp_support_conversations.
 */
async function logConversation(params: {
  phone: string;
  role: "user" | "assistant" | "agent" | "system";
  message: string;
  userId?: string;
  userName?: string;
  mediaUrl?: string;
  intent?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await supabaseAdmin.from("whatsapp_support_conversations").insert({
      phone: params.phone,
      user_id: params.userId || null,
      user_name: params.userName || null,
      role: params.role,
      message: params.message,
      media_url: params.mediaUrl || null,
      intent: params.intent || null,
      metadata: params.metadata || {},
    });
  } catch (err) {
    console.warn("[CONCIERGE LOG ERROR]", err);
  }
}

/**
 * Creates or updates an escalated support ticket in Supabase.
 */
async function createOrUpdateTicket(params: {
  phone: string;
  userName: string;
  userId?: string;
  subject: string;
  lastMessage: string;
  priority?: "low" | "normal" | "high" | "urgent";
}) {
  try {
    const { data: existing } = await supabaseAdmin
      .from("whatsapp_support_tickets")
      .select("id, status")
      .eq("phone", params.phone)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      await supabaseAdmin
        .from("whatsapp_support_tickets")
        .update({
          subject: params.subject,
          last_message: params.lastMessage,
          status: "open",
          resolved_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      await supabaseAdmin.from("whatsapp_conversation_state").upsert({
        phone: params.phone,
        agent_mode: true,
        active_ticket_id: existing.id,
        updated_at: new Date().toISOString(),
      });

      return existing.id;
    }

    const { data: newTicket, error } = await supabaseAdmin
      .from("whatsapp_support_tickets")
      .insert({
        phone: params.phone,
        user_name: params.userName,
        user_id: params.userId || null,
        subject: params.subject,
        last_message: params.lastMessage,
        priority: params.priority || "normal",
        status: "open",
      })
      .select("id")
      .single();

    if (error) throw error;

    await supabaseAdmin.from("whatsapp_conversation_state").upsert({
      phone: params.phone,
      agent_mode: true,
      active_ticket_id: newTicket.id,
      updated_at: new Date().toISOString(),
    });

    return newTicket.id;
  } catch (err) {
    console.error("[CONCIERGE CREATE TICKET ERROR]", err);
    return null;
  }
}

/**
 * Main Entry Point: Processes any inbound WhatsApp message for real estate intelligence & support.
 */
export async function processInboundWhatsAppMessage(
  phone: string,
  text: string
): Promise<ConciergeExecutionResult> {
  const cleanPhone = normalizeWhatsAppPhone(phone);
  if (!cleanPhone || !text.trim()) {
    return { handled: false, intent: "empty", responseSent: false };
  }

  const siteUrl = getPublicSiteUrl();

  // 1. Log incoming user message
  await logConversation({
    phone: cleanPhone,
    role: "user",
    message: text,
  });

  // 2. Fetch conversation context (history, previous user & bot messages)
  const { historyText, lastUserMessage, lastAssistantMessage } = await getRecentConversationHistory(cleanPhone, 6);

  // 3. Identify user (registered member or guest)
  const registeredUser = await getRegisteredUserByPhone(cleanPhone);
  const rawUserName = registeredUser?.name || "";
  const isGenericName = !rawUserName || ["user", "valued member", "member", "whatsapp member"].includes(rawUserName.toLowerCase().trim());
  let effectiveUserName = isGenericName ? "" : rawUserName.trim();

  // Check if user is introducing their name after being prompted
  if (!effectiveUserName && lastAssistantMessage.includes("What may I call you?")) {
    const nameCandidate = text.replace(/^(?:my name is|i am|i'm|this is|call me)\s*/i, "").trim();
    if (nameCandidate && nameCandidate.length >= 2 && nameCandidate.length <= 30 && !/^(?:hi|hello|hey|help|agent|bot|ref\d+)/i.test(nameCandidate)) {
      effectiveUserName = nameCandidate;
      try {
        await supabaseAdmin
          .from("whatsapp_contacts")
          .upsert({
            phone: cleanPhone,
            name: effectiveUserName,
            updated_at: new Date().toISOString(),
          }, { onConflict: "phone" });
      } catch (err) {
        console.warn("[NAME SAVE ERROR]", err);
      }

      const welcomeNamedMsg = `👋 *Nice to meet you, ${effectiveUserName}!* Welcome to ROADFACING Concierge 🏡\n\nI am your 24/7 personal real estate assistant. How can I help you find your dream property today?\n\n*Try asking:*\n• _"3 bhk in Poranki under 80 Lakhs"_\n• _"Flats in Vijayawada under 1 Crore"_\n• _"Avenue Serene project"_\n• _"REF0001"_`;
      await WhatsAppService.sendTextMessage(cleanPhone, welcomeNamedMsg, {
        requestId: `name-welcome-${Date.now()}`,
        allowFreeformOnly: true,
      });

      await logConversation({
        phone: cleanPhone,
        userName: effectiveUserName,
        role: "assistant",
        message: welcomeNamedMsg,
        intent: "name_introduced",
      });

      return {
        handled: true,
        intent: "name_introduced",
        responseSent: true,
        message: welcomeNamedMsg,
      };
    }
  }

  // Auto-record/update in whatsapp_contacts
  try {
    await supabaseAdmin
      .from("whatsapp_contacts")
      .upsert(
        {
          phone: cleanPhone,
          name: effectiveUserName || "WhatsApp Member",
          is_subscribed: true,
          opted_in_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "phone", ignoreDuplicates: true }
      );
  } catch (contactErr) {
    console.warn("[CONCIERGE CONTACT UPSERT ERROR]", contactErr);
  }

  const norm = text.toLowerCase().trim();

  // 4. User manual switch back to bot
  const isSwitchToBot = ["BOT", "AI", "AI MODE", "RESUME BOT", "CLOSE CHAT", "EXIT AGENT", "RESUME"].includes(text.trim().toUpperCase());
  if (isSwitchToBot) {
    await supabaseAdmin
      .from("whatsapp_support_tickets")
      .update({ status: "resolved", resolved_at: new Date().toISOString() })
      .eq("phone", cleanPhone)
      .in("status", ["open", "in_progress"]);

    const switchMsg = `🤖 *AI Concierge Resumed*\n\nI am back to assist you with property searches, project comparisons, and verified listings across Andhra Pradesh! 🏡\n\n*Try asking:* _"3 bhk flats in Poranki"_ or _"Flats under 1 Cr"_`;
    await WhatsAppService.sendTextMessage(cleanPhone, switchMsg, {
      requestId: `bot-resume-${Date.now()}`,
      allowFreeformOnly: true,
    });
    return { handled: true, intent: "bot_resumed", responseSent: true, message: switchMsg };
  }

  // 5. Human Agent Escalation Check
  const isHumanRequest =
    /\b(?:agent|human|advisor|consultant|broker|representative|executive|call me|connect|talk (?:to|with)|speak (?:to|with)|negotiat|contact (?:owner|builder|advisor))\b/i.test(norm) ||
    norm.includes("agent") ||
    norm.includes("human") ||
    norm.includes("advisor") ||
    norm.includes("call me");

  if (isHumanRequest) {
    const callerName = effectiveUserName || "Valued Member";
    const ticketId = await createOrUpdateTicket({
      phone: cleanPhone,
      userName: callerName,
      userId: registeredUser?.id,
      subject: `Inquiry from ${callerName}: "${text.slice(0, 80)}"`,
      lastMessage: text,
      priority: "high",
    });

    const humanAck =
      `👨‍💼 *Request Forwarded to Real Estate Advisor*\n\n` +
      `Hello ${callerName}, we have connected you with our dedicated property advisory team.\n\n` +
      `📌 *Your Inquiry:* "${text}"\n` +
      `🎫 *Ticket ID:* #${ticketId ? ticketId.slice(0, 8) : "ROAD-" + Date.now().toString().slice(-4)}\n\n` +
      `A senior property consultant has received your request and will reply directly to this chat shortly.`;

    await WhatsAppService.sendTextMessage(cleanPhone, humanAck, {
      requestId: `agent-escalation-${Date.now()}`,
      allowFreeformOnly: true,
    });

    await logConversation({
      phone: cleanPhone,
      userId: registeredUser?.id,
      userName: callerName,
      role: "assistant",
      message: humanAck,
      intent: "human_agent_escalation",
    });

    return {
      handled: true,
      intent: "human_agent_escalation",
      responseSent: true,
      ticketCreated: true,
      message: humanAck,
    };
  }

  // 6. Check if an agent is currently in an active 1-on-1 chat session
  const { data: activeTicket } = await supabaseAdmin
    .from("whatsapp_support_tickets")
    .select("id, status, assigned_to, assigned_name")
    .eq("phone", cleanPhone)
    .in("status", ["open", "in_progress"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeTicket && activeTicket.status === "in_progress") {
    await supabaseAdmin
      .from("whatsapp_support_tickets")
      .update({
        last_message: text,
        updated_at: new Date().toISOString(),
      })
      .eq("id", activeTicket.id);

    return {
      handled: true,
      intent: "agent_mode_active",
      responseSent: false,
      message: "Agent mode active - automated bot search paused",
    };
  }

  // =========================================================================
  // 6a. SITE VISIT SCHEDULING (Date/Time Slot Selection & Booking Confirmation)
  // =========================================================================
  const convState = await getConversationState(cleanPhone, effectiveUserName, registeredUser?.id);
  if (isSiteVisitIntent(text)) {
    const booking = await handleSiteVisitBooking({
      phone: cleanPhone,
      userName: effectiveUserName,
      text,
      lastViewedRefId: convState.lastViewedRefId,
    });

    await WhatsAppService.sendTextMessage(cleanPhone, booking.confirmationMessage, {
      requestId: `sitevisit-${Date.now()}`,
      allowFreeformOnly: true,
    });

    await logConversation({
      phone: cleanPhone,
      userId: registeredUser?.id,
      userName: effectiveUserName || "Member",
      role: "assistant",
      message: booking.confirmationMessage,
      intent: "site_visit_booking",
      metadata: { ticketId: booking.ticketId },
    });

    return {
      handled: true,
      intent: "site_visit_booking",
      responseSent: true,
      message: booking.confirmationMessage,
    };
  }

  // =========================================================================
  // 6b. REAL ESTATE FINANCIAL CALCULATORS (EMI & AP Stamp Duty Estimator)
  // =========================================================================
  const financialQuery = parseFinancialQuery(text);
  if (financialQuery.type === "emi" && financialQuery.principal) {
    const emi = calculateHomeLoanEmi(financialQuery.principal, financialQuery.rate, financialQuery.years);
    await WhatsAppService.sendTextMessage(cleanPhone, emi.formattedMessage, {
      requestId: `emi-${Date.now()}`,
      allowFreeformOnly: true,
    });

    await logConversation({
      phone: cleanPhone,
      userId: registeredUser?.id,
      userName: effectiveUserName || "Member",
      role: "assistant",
      message: emi.formattedMessage,
      intent: "emi_calculation",
      metadata: { principal: financialQuery.principal, monthlyEmi: emi.monthlyEmi },
    });

    return {
      handled: true,
      intent: "emi_calculation",
      responseSent: true,
      message: emi.formattedMessage,
    };
  }

  if (financialQuery.type === "stamp_duty" && financialQuery.principal) {
    const stamp = calculateApStampDuty(financialQuery.principal);
    await WhatsAppService.sendTextMessage(cleanPhone, stamp.formattedMessage, {
      requestId: `stamp-${Date.now()}`,
      allowFreeformOnly: true,
    });

    await logConversation({
      phone: cleanPhone,
      userId: registeredUser?.id,
      userName: effectiveUserName || "Member",
      role: "assistant",
      message: stamp.formattedMessage,
      intent: "stamp_duty_estimate",
      metadata: { propertyValue: financialQuery.principal, totalCharges: stamp.totalGovernmentCharges },
    });

    return {
      handled: true,
      intent: "stamp_duty_estimate",
      responseSent: true,
      message: stamp.formattedMessage,
    };
  }

  // =========================================================================
  // 6b. MULTI-PROPERTY COMPARISON (e.g. "compare REF0001 and REF0002")
  // =========================================================================
  const allDetectedRefs = extractAllRefIds(text);
  if (allDetectedRefs.length >= 2) {
    const matches = await Promise.all(allDetectedRefs.slice(0, 3).map((r) => lookupExactRefId(r)));
    const validMatches = matches.filter(Boolean) as Array<NonNullable<typeof matches[0]>>;

    if (validMatches.length >= 2) {
      const comparisonCard = formatMultiPropertyComparisonCard(validMatches);
      await WhatsAppService.sendTextMessage(cleanPhone, comparisonCard, {
        requestId: `compare-${Date.now()}`,
        allowFreeformOnly: true,
      });

      await updateConversationState({
        phone: cleanPhone,
        lastDisplayedRefIds: validMatches.map((m) => m.refId),
        stage: "exploring",
      });

      await logConversation({
        phone: cleanPhone,
        userId: registeredUser?.id,
        userName: effectiveUserName || "Member",
        role: "assistant",
        message: comparisonCard,
        intent: "multi_property_comparison",
        metadata: { comparedRefs: validMatches.map((m) => m.refId) },
      });

      return {
        handled: true,
        intent: "multi_property_comparison",
        responseSent: true,
        message: comparisonCard,
      };
    }
  }

  // =========================================================================
  // 6c. CONTEXTUAL ANAPHORIC FOLLOW-UPS ("show the second one", "compare 1 and 2")
  // =========================================================================
  const anaphora = resolveAnaphoricQuery(text, convState.lastDisplayedRefIds);

  if (anaphora.isAnaphoric) {
    if (anaphora.type === "single_selection" && anaphora.targetRefId) {
      const targetMatch = await lookupExactRefId(anaphora.targetRefId);
      if (targetMatch) {
        const cardText = formatSingleRefCard(
          targetMatch.item,
          targetMatch.type,
          targetMatch.refId,
          targetMatch.canonicalUrl
        );

        const heroImage = extractHeroImage(targetMatch.item);
        let sentWithImage = false;
        if (heroImage && (heroImage.startsWith("https://") || heroImage.startsWith("http://"))) {
          try {
            const imgResult = await WhatsAppService.sendImageMessage(cleanPhone, heroImage, cardText, {
              requestId: `anaphora-img-${Date.now()}`,
            });
            sentWithImage = Boolean(imgResult?.success);
          } catch {}
        }

        if (!sentWithImage) {
          await WhatsAppService.sendTextMessage(cleanPhone, cardText, {
            requestId: `anaphora-txt-${Date.now()}`,
            allowFreeformOnly: true,
          });
        }

        await updateConversationState({
          phone: cleanPhone,
          lastViewedRefId: anaphora.targetRefId,
          stage: "exploring",
        });

        await logConversation({
          phone: cleanPhone,
          userId: registeredUser?.id,
          userName: effectiveUserName || "Member",
          role: "assistant",
          message: cardText,
          intent: "anaphora_selection",
          metadata: { resolvedRefId: anaphora.targetRefId },
        });

        return {
          handled: true,
          intent: "anaphora_selection",
          responseSent: true,
          message: cardText,
        };
      }
    } else if (anaphora.type === "comparison" && anaphora.compareRefIds && anaphora.compareRefIds.length >= 2) {
      const compareMatches = await Promise.all(anaphora.compareRefIds.map((r) => lookupExactRefId(r)));
      const validCompare = compareMatches.filter(Boolean) as Array<NonNullable<typeof compareMatches[0]>>;
      if (validCompare.length >= 2) {
        const comparisonCard = formatMultiPropertyComparisonCard(validCompare);
        await WhatsAppService.sendTextMessage(cleanPhone, comparisonCard, {
          requestId: `anaphora-compare-${Date.now()}`,
          allowFreeformOnly: true,
        });

        await updateConversationState({
          phone: cleanPhone,
          lastDisplayedRefIds: validCompare.map((m) => m.refId),
          stage: "exploring",
        });

        await logConversation({
          phone: cleanPhone,
          userId: registeredUser?.id,
          userName: effectiveUserName || "Member",
          role: "assistant",
          message: comparisonCard,
          intent: "anaphora_comparison",
          metadata: { comparedRefs: validCompare.map((m) => m.refId) },
        });

        return {
          handled: true,
          intent: "anaphora_comparison",
          responseSent: true,
          message: comparisonCard,
        };
      }
    }
  }

  // =========================================================================
  // 7. DETERMINISTIC REFERENCE ID LOOKUP (RUNS BEFORE ANY LLM OR FUZZY SEARCH)
  // =========================================================================
  const detectedRef = extractAndNormalizeRefId(text);
  if (detectedRef) {
    const refMatch = await lookupExactRefId(detectedRef);

    if (refMatch) {
      const cardText = formatSingleRefCard(
        refMatch.item,
        refMatch.type,
        refMatch.refId,
        refMatch.canonicalUrl
      );

      const heroImage = extractHeroImage(refMatch.item);
      let sentWithImage = false;

      if (heroImage && (heroImage.startsWith("https://") || heroImage.startsWith("http://"))) {
        try {
          const imgResult = await WhatsAppService.sendImageMessage(cleanPhone, heroImage, cardText, {
            requestId: `ref-img-${Date.now()}`,
          });
          sentWithImage = Boolean(imgResult?.success);
        } catch (imgErr) {
          console.warn(`[CONCIERGE MEDIA] Image send failed for ${detectedRef}:`, imgErr);
        }
      } else {
        console.warn(`[CONCIERGE MEDIA] No hero photo found for ${detectedRef} (${refMatch.item.title || refMatch.item.name || "Listing"}); falling back to text card.`);
      }

      if (!sentWithImage) {
        await WhatsAppService.sendTextMessage(cleanPhone, cardText, {
          requestId: `ref-txt-${Date.now()}`,
          allowFreeformOnly: true,
        });
      }

      await updateConversationState({
        phone: cleanPhone,
        lastViewedRefId: detectedRef,
        lastDisplayedRefIds: [detectedRef],
        stage: "exploring",
      });

      await logConversation({
        phone: cleanPhone,
        userId: registeredUser?.id,
        userName: effectiveUserName || "Member",
        role: "assistant",
        message: cardText,
        mediaUrl: heroImage || undefined,
        intent: "ref_id_direct_lookup",
        metadata: { refId: detectedRef, found: true, type: refMatch.type },
      });

      return {
        handled: true,
        intent: "ref_id_direct_lookup",
        responseSent: true,
        message: cardText,
      };
    } else {
      // Deterministic Ref ID Not Found Response — Never fall back to fuzzy search or hallucination
      const notFoundMsg =
        `🔎 *Listing ${detectedRef} Not Found*\n\n` +
        `I couldn't find reference ID *${detectedRef}* in our verified database.\n\n` +
        `Would you like to search by area or budget? Try asking:\n` +
        `• _"Flats in Vijayawada under 1 Crore"_\n` +
        `• _"3 BHK in Poranki"_\n` +
        `• _"Talk to agent"_`;

      await WhatsAppService.sendTextMessage(cleanPhone, notFoundMsg, {
        requestId: `ref-notfound-${Date.now()}`,
        allowFreeformOnly: true,
      });

      await logConversation({
        phone: cleanPhone,
        userId: registeredUser?.id,
        userName: effectiveUserName || "Member",
        role: "assistant",
        message: notFoundMsg,
        intent: "ref_id_not_found",
        metadata: { refId: detectedRef, found: false },
      });

      return {
        handled: true,
        intent: "ref_id_not_found",
        responseSent: true,
        message: notFoundMsg,
      };
    }
  }

  // 8. Deterministic Identity & Conversational Rules
  const isIdentityQuestion =
    /\b(?:who are you|what(?:'s| is)? (?:ur|your) name|ur name|your name|who r u|who made you|created you|who is this)\b/i.test(norm) ||
    norm === "u r name" || norm === "ur name" || norm === "name" || norm === "who are you";

  if (isIdentityQuestion) {
    const identityMsg =
      `🤖 *I am the ROADFACING AI Concierge!*\n\n` +
      `I am your 24/7 personal real estate assistant for Andhra Pradesh 🏡\n\n` +
      `I can find verified properties, builder projects, gated villas, apartments, and open plots across *Vijayawada, Guntur, Amaravati, and Visakhapatnam* in real-time.\n\n` +
      `*How can I help you today? Try asking:*\n` +
      `• _"3 bhk flats in Poranki"_\n` +
      `• _"Flats under 1 Crore"_\n` +
      `• _"Avenue Serene project"_\n` +
      `• _"REF0001"_\n` +
      `• _"Talk to agent"_`;

    await WhatsAppService.sendTextMessage(cleanPhone, identityMsg, {
      requestId: `identity-${Date.now()}`,
      allowFreeformOnly: true,
    });

    await logConversation({
      phone: cleanPhone,
      userId: registeredUser?.id,
      userName: effectiveUserName || "Member",
      role: "assistant",
      message: identityMsg,
      intent: "identity_answer",
    });

    return {
      handled: true,
      intent: "identity_answer",
      responseSent: true,
      message: identityMsg,
    };
  }

  const isRobotQuestion = /\b(?:are you (?:a )?(?:robot|bot|ai|human|real)|is this (?:a )?(?:bot|ai))\b/i.test(norm);
  if (isRobotQuestion) {
    const botMsg =
      `🤖 *Yes, I am an AI Real Estate Assistant!*\n\n` +
      `I use advanced AI to instantly search verified properties, compare configurations, and deliver project insights for ROADFACING.\n\n` +
      `If you'd like to speak with a human property consultant, simply reply *"Talk to agent"* anytime! 👨‍💼`;

    await WhatsAppService.sendTextMessage(cleanPhone, botMsg, {
      requestId: `bot-q-${Date.now()}`,
      allowFreeformOnly: true,
    });

    await logConversation({
      phone: cleanPhone,
      userId: registeredUser?.id,
      userName: effectiveUserName || "Member",
      role: "assistant",
      message: botMsg,
      intent: "robot_answer",
    });

    return {
      handled: true,
      intent: "robot_answer",
      responseSent: true,
      message: botMsg,
    };
  }

  const isGratitude = /\b(?:thank you|thanks|tq|thx|great|awesome|super|nice)\b/i.test(norm) && norm.split(/\s+/).length <= 4;
  if (isGratitude) {
    const thanksMsg = effectiveUserName
      ? `😊 *You're very welcome, ${effectiveUserName}!* Let me know whenever you want to explore more verified properties or projects in Andhra Pradesh. 🏡`
      : `😊 *You're very welcome!* Let me know whenever you want to explore more verified properties or projects in Andhra Pradesh. 🏡`;
    await WhatsAppService.sendTextMessage(cleanPhone, thanksMsg, {
      requestId: `thanks-${Date.now()}`,
      allowFreeformOnly: true,
    });
    await logConversation({
      phone: cleanPhone,
      userId: registeredUser?.id,
      userName: effectiveUserName || "Member",
      role: "assistant",
      message: thanksMsg,
      intent: "gratitude_reply",
    });
    return { handled: true, intent: "gratitude_reply", responseSent: true, message: thanksMsg };
  }

  // 9. Natural Greeting (Never says "User" or "Hello User!", supports Telugu/Tenglish/English)
  const isGreeting =
    ["hi", "hello", "helo", "hey", "namaste", "good morning", "good evening", "start"].includes(norm) ||
    /^(?:namaskaram|namasthe|hai|helo|vanakkam)\b/i.test(norm);
  const detectedUserLang = convState.preferredLanguage || detectLanguage(text);

  if (isGreeting) {
    const greetingMsg = getLocalizedGreeting(detectedUserLang, effectiveUserName || undefined);

    await WhatsAppService.sendTextMessage(cleanPhone, greetingMsg, {
      requestId: `greet-${Date.now()}`,
      allowFreeformOnly: true,
    });

    await updateConversationState({
      phone: cleanPhone,
      preferredLanguage: detectedUserLang,
    });

    await logConversation({
      phone: cleanPhone,
      userId: registeredUser?.id,
      userName: effectiveUserName || "Member",
      role: "assistant",
      message: greetingMsg,
      intent: "greeting",
    });

    return {
      handled: true,
      intent: "greeting",
      responseSent: true,
      message: greetingMsg,
    };
  }

  // 10. Repeat Query Detection (Failure Signal)
  let repeatNoticePrefix = "";
  const isRepeatQuery = lastUserMessage && lastUserMessage.toLowerCase().trim() === norm;

  if (isRepeatQuery) {
    // If user repeats their message multiple times, offer human consultant instead of blaming them
    const repeatCount = (historyText.match(new RegExp(norm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length;
    if (repeatCount >= 2) {
      const repeatEscalationMsg =
        `👨‍💼 *I want to make sure you get the exact details you need.*\n\n` +
        `Since this search didn't return what you were looking for, would you like me to connect you directly with our dedicated property consultant for this area?\n\n` +
        `👉 Reply *"Talk to agent"* or *"Yes"* to connect right away.`;

      await WhatsAppService.sendTextMessage(cleanPhone, repeatEscalationMsg, {
        requestId: `repeat-escalation-${Date.now()}`,
        allowFreeformOnly: true,
      });

      await logConversation({
        phone: cleanPhone,
        userId: registeredUser?.id,
        userName: effectiveUserName || "Member",
        role: "assistant",
        message: repeatEscalationMsg,
        intent: "repeat_query_escalation",
      });

      return {
        handled: true,
        intent: "repeat_query_escalation",
        responseSent: true,
        message: repeatEscalationMsg,
      };
    } else {
      repeatNoticePrefix = `🔄 *Let me try a different search approach for you...*\n\n`;
    }
  }

  // 11. Multi-Turn Gemini Analysis for Open-Ended Real Estate Q&A
  const geminiAnalysis = await analyzeWithGemini(text, historyText, effectiveUserName || "Member", detectedUserLang);

  if (geminiAnalysis?.category === "interactive_chat" && geminiAnalysis.chatResponse) {
    await WhatsAppService.sendTextMessage(cleanPhone, geminiAnalysis.chatResponse, {
      requestId: `chat-ai-${Date.now()}`,
      allowFreeformOnly: true,
    });

    await logConversation({
      phone: cleanPhone,
      userId: registeredUser?.id,
      userName: effectiveUserName || "Member",
      role: "assistant",
      message: geminiAnalysis.chatResponse,
      intent: "interactive_chat",
    });

    return {
      handled: true,
      intent: "interactive_chat",
      responseSent: true,
      message: geminiAnalysis.chatResponse,
    };
  }

  // 12. Search Database Listings with Strict Count Integrity
  const searchEngineIntent = parseSearchIntent(text);
  const { properties, projects } = await searchLiveListings(text, searchEngineIntent);
  const totalMatches = properties.length + projects.length;

  if (totalMatches > 0) {
    const topProjects = projects.slice(0, 2);
    const topProps = properties.slice(0, 2);
    const renderedItems = [...topProjects, ...topProps];
    const renderedCount = renderedItems.length;

    // Strict Count Integrity: "Found N" must strictly equal the number of items rendered
    let responseText = repeatNoticePrefix + `🏡 *Found ${renderedCount} verified listing${renderedCount > 1 ? "s" : ""} matching your search:*\n\n`;

    topProjects.forEach((proj: any, idx) => {
      const projName = str(proj.name) || str(proj.title) || "Featured Project";
      const projSlug = str(proj.slug) || str(proj.id);
      const loc = formatLocation(proj);
      const projRef = proj.refId || (proj.location as any)?.refId || "";

      let priceStr = "Contact for Pricing";
      if (proj.minPrice && proj.maxPrice) {
        priceStr = `${formatPriceCompact(proj.minPrice)} - ${formatPriceCompact(proj.maxPrice)}`;
      } else if (proj.minPrice) {
        priceStr = `Starting at ${formatPriceCompact(proj.minPrice)}`;
      } else if (Array.isArray(proj.configurations) && proj.configurations[0]?.priceMin) {
        const prices = proj.configurations.map((c: any) => c.priceMin).filter(Boolean);
        priceStr = `Starting at ${formatPriceCompact(Math.min(...prices))}`;
      }

      const configs = Array.isArray(proj.configurations)
        ? proj.configurations.map((c: any) => c.label || `${c.bedrooms} BHK`).filter(Boolean).join(", ")
        : "";

      responseText += `🏗️ *${idx + 1}. ${projName}* (Project)\n`;
      if (projRef) responseText += `🆔 *Ref ID:* ${projRef}\n`;
      if (loc) responseText += `📍 *Location:* ${loc}\n`;
      responseText += `💰 *Price:* ${priceStr}\n`;
      if (configs) responseText += `🛏️ *Configurations:* ${configs}\n`;
      if (proj.constructionStatus || proj.status) {
        responseText += `📊 *Status:* ${str(proj.constructionStatus || proj.status).replace("-", " ").toUpperCase()}\n`;
      }
      responseText += `🔗 *View Project:* ${getListingCanonicalUrl("project", projSlug)}\n\n`;
    });

    topProps.forEach((p: any, idx) => {
      const title = str(p.title) || `${p.bedrooms || 2} BHK Property`;
      const price = typeof p.price === "number" ? formatPriceCompact(p.price) : "Contact for Price";
      const loc = formatLocation(p);
      const slug = str(p.slug) || str(p.id);
      const propRef = p.refId || "";

      responseText += `🏠 *${topProjects.length + idx + 1}. ${title}*\n`;
      if (propRef) responseText += `🆔 *Ref ID:* ${propRef}\n`;
      responseText += `💰 *Price:* ${price}\n`;
      if (loc) responseText += `📍 *Location:* ${loc}\n`;
      if (p.bedrooms) responseText += `🛏️ *Bedrooms:* ${p.bedrooms} BHK\n`;
      if (p.area) responseText += `📐 *Area:* ${p.area} sq.ft\n`;
      responseText += `🔗 *View Details:* ${getListingCanonicalUrl("property", slug)}\n\n`;
    });

    if (totalMatches > renderedCount) {
      responseText += `🔍 *View all ${totalMatches} matching verified properties on ROAD:*\n${siteUrl}/search?q=${encodeURIComponent(text)}\n\n`;
    }

    if (!registeredUser) {
      responseText += `💡 *Free 1-tap save & updates:* ${siteUrl}/login\n\n`;
    }

    responseText += `_Reply with specific budget/BHK or type "Talk to agent" anytime._`;

    let heroImage = "";
    if (topProjects.length > 0) {
      heroImage = extractHeroImage(topProjects[0]);
    } else if (topProps.length > 0) {
      heroImage = extractHeroImage(topProps[0]);
    }

    let imageSent = false;
    if (heroImage && (heroImage.startsWith("https://") || heroImage.startsWith("http://"))) {
      try {
        const imgResult = await WhatsAppService.sendImageMessage(cleanPhone, heroImage, responseText, {
          requestId: `concierge-results-${Date.now()}`,
        });
        imageSent = Boolean(imgResult?.success);
      } catch (imgErr) {
        console.warn("[CONCIERGE IMAGE SEND ERROR]", imgErr);
      }
    } else {
      console.warn(`[CONCIERGE MEDIA] No hero photo found for search results; falling back to text message.`);
    }

    if (!imageSent) {
      await WhatsAppService.sendTextMessage(cleanPhone, responseText, {
        requestId: `concierge-results-${Date.now()}`,
        allowFreeformOnly: true,
      });
    }

    const renderedRefIds = renderedItems
      .map((it: any) => it.refId || (it.location as any)?.refId || "")
      .filter(Boolean);

    await updateConversationState({
      phone: cleanPhone,
      lastDisplayedRefIds: renderedRefIds,
      lastSearch: searchEngineIntent,
      preferredLocation: searchEngineIntent.locationKeywords[0] || undefined,
      preferredBhk: searchEngineIntent.bhks[0] || undefined,
      maxBudget: searchEngineIntent.maxPrice || undefined,
      stage: "discovery",
    });

    await logConversation({
      phone: cleanPhone,
      userId: registeredUser?.id,
      userName: effectiveUserName || "Member",
      role: "assistant",
      message: responseText,
      mediaUrl: heroImage || undefined,
      intent: "property_search_matched",
      metadata: { matchedCount: renderedCount, totalMatches, query: text },
    });

    return {
      handled: true,
      intent: "property_search_matched",
      responseSent: true,
      message: responseText,
      matchedCount: renderedCount,
    };
  }

  // 13. No Direct Search Match -> Helpful Fallback
  let fallbackMsg = "";
  if (geminiAnalysis?.chatResponse) {
    fallbackMsg = geminiAnalysis.chatResponse;
  } else if (searchEngineIntent.maxPrice) {
    const formattedBudget = formatPriceCompact(searchEngineIntent.maxPrice);
    fallbackMsg =
      `🔎 *No active listings found under ${formattedBudget} currently.*\n\n` +
      `Our verified projects in this region start from higher budget ranges.\n\n` +
      `👉 *Browse Live Search:* ${siteUrl}/search?q=${encodeURIComponent(text)}\n\n` +
      `Would you like our property advisor to check upcoming unlisted developments or resale options in your ${formattedBudget} budget?\n\n` +
      `👉 Reply *"Talk to agent"* or *"Yes, find for me"* to connect directly with our advisory team.`;
  } else if (searchEngineIntent.locationKeywords.length > 0) {
    const loc = searchEngineIntent.locationKeywords[0];
    fallbackMsg =
      `🔎 *No active listings found matching "${text}" right now in ${loc}.*\n\n` +
      `👉 *Browse Live Search:* ${siteUrl}/search?q=${encodeURIComponent(text)}\n` +
      `👉 *View Latest Projects:* ${siteUrl}/projects\n\n` +
      `Reply with specific requirements (e.g. *"3 bhk in Poranki"*) or type *"Talk to agent"* anytime!`;
  } else {
    fallbackMsg =
      `🤖 *I am the ROADFACING AI Concierge!*\n\n` +
      `I can find verified properties, builder projects, villas, apartments, and open plots for you in real-time.\n\n` +
      `*Try asking:*\n` +
      `• _"3 bhk flats in Poranki"_\n` +
      `• _"Flats in Vijayawada under 1 Crore"_\n` +
      `• _"Villas in Guntur"_\n` +
      `• _"REF0001"_\n` +
      `• _"Talk to agent"_`;
  }

  await WhatsAppService.sendTextMessage(cleanPhone, fallbackMsg, {
    requestId: `no-match-${Date.now()}`,
    allowFreeformOnly: true,
  });

  await logConversation({
    phone: cleanPhone,
    userId: registeredUser?.id,
    userName: effectiveUserName || "Member",
    role: "assistant",
    message: fallbackMsg,
    intent: "property_search_no_match",
  });

  return {
    handled: true,
    intent: "property_search_no_match",
    responseSent: true,
    message: fallbackMsg,
  };
}
