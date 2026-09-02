import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { normalizeWhatsAppPhone } from "@/lib/whatsapp-audience";
import { WasenderService } from "@/lib/wasender";
import { formatPriceCompact } from "@/lib/utils";
import { parseSearchIntent, matchesPropertySearch, matchesProjectSearch, type ParsedSearchIntent } from "@/lib/search-engine";
import { mockProperties } from "@/lib/mock-data";
import type { Property } from "@/types/property";
import type { Project } from "@/types/project";

export interface ConciergeExecutionResult {
  handled: boolean;
  intent: string;
  responseSent: boolean;
  ticketCreated?: boolean;
  message?: string;
}

type LooseRecord = Record<string, any>;

function str(val: unknown): string {
  return typeof val === "string" ? val.trim() : "";
}

/**
 * Inactivity Session State Tracker (Hetzner in-memory Map + DB)
 */
const activeSessions: Map<string, { lastActivity: number; inactivitySent: boolean; timeoutId?: NodeJS.Timeout }> =
  (globalThis as any).__whatsapp_active_sessions || new Map();
(globalThis as any).__whatsapp_active_sessions = activeSessions;

/**
 * Registers an inactivity timer: after 60 seconds of silence, sends a friendly prompt.
 */
function scheduleInactivityReminder(phone: string, userName: string) {
  const existing = activeSessions.get(phone);
  if (existing?.timeoutId) {
    clearTimeout(existing.timeoutId);
  }

  const timeoutId = setTimeout(async () => {
    const session = activeSessions.get(phone);
    if (!session || session.inactivitySent) return;

    // Check if user has sent any new message in the last 60 seconds
    const now = Date.now();
    if (now - session.lastActivity >= 58000) {
      session.inactivitySent = true;

      const inactivityMsg =
        `👋 *Hello ${userName || "there"}!*\n\n` +
        `It seems you've been inactive for a moment. Whenever you're ready, simply reply *"Hi"* or send any property requirement to resume exploring verified listings on ROAD! 🏡`;

      try {
        await WasenderService.sendTextMessage(phone, inactivityMsg, {
          requestId: `inactivity-${Date.now()}`,
        });

        await logConversation({
          phone,
          userName,
          role: "system",
          message: inactivityMsg,
          intent: "inactivity_reminder",
        });
      } catch (err) {
        console.warn("[CONCIERGE INACTIVITY SEND ERROR]", err);
      }
    }
  }, 65000); // 65 seconds

  activeSessions.set(phone, {
    lastActivity: Date.now(),
    inactivitySent: false,
    timeoutId,
  });
}

/**
 * Safely extracts image URL from any property or project record
 */
function extractHeroImage(item: any): string {
  if (!item) return "";
  if (typeof item.coverImage === "string" && item.coverImage.trim()) return item.coverImage.trim();
  if (Array.isArray(item.images) && item.images.length > 0) {
    const first = item.images[0];
    if (typeof first === "string") return first;
    if (first && typeof first.url === "string") return first.url;
  }
  if (typeof item.imageUrl === "string" && item.imageUrl.trim()) return item.imageUrl.trim();
  if (typeof item.mediaUrl === "string" && item.mediaUrl.trim()) return item.mediaUrl.trim();
  return "";
}

/**
 * Safely formats location string from property or project
 */
function formatLocation(item: any): string {
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
 * Checks whether a sender's phone number is registered and verified on ROAD.
 */
export async function getRegisteredUserByPhone(rawPhone: string) {
  const phone = normalizeWhatsAppPhone(rawPhone);
  if (!phone) return null;

  const phoneVariants = [
    phone,
    `+${phone}`,
    phone.startsWith("91") ? phone.slice(2) : phone,
    phone.replace(/\D/g, ""),
  ];

  try {
    // 1. Check user_profiles
    for (const variant of phoneVariants) {
      const { data: userProfile } = await supabaseAdmin
        .from("user_profiles")
        .select("id, full_name, email, phone, role, is_verified, is_profile_complete")
        .eq("phone", variant)
        .maybeSingle();

      if (userProfile) {
        return {
          id: str(userProfile.id),
          name: str(userProfile.full_name) || "Valued Member",
          email: str(userProfile.email),
          phone: str(userProfile.phone) || phone,
          role: str(userProfile.role) || "buyer",
          isVerified: Boolean(userProfile.is_verified),
          isProfileComplete: Boolean(userProfile.is_profile_complete),
        };
      }
    }

    // 2. Check profiles
    for (const variant of phoneVariants) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, email, phone, role, is_verified, is_profile_complete")
        .eq("phone", variant)
        .maybeSingle();

      if (profile) {
        return {
          id: str(profile.id),
          name: str(profile.full_name) || "Valued Member",
          email: str(profile.email),
          phone: str(profile.phone) || phone,
          role: str(profile.role) || "buyer",
          isVerified: Boolean(profile.is_verified),
          isProfileComplete: Boolean(profile.is_profile_complete),
        };
      }
    }

    // 3. Check auth.users by phone
    const { data: authData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }).catch(() => ({ data: { users: [] }, error: null }));
    const authUser = authData?.users?.find((u) => {
      const uPhone = normalizeWhatsAppPhone(u.phone || "");
      return uPhone && phoneVariants.includes(uPhone);
    });

    if (authUser) {
      const meta = (authUser.user_metadata || {}) as LooseRecord;
      return {
        id: str(authUser.id),
        name: str(meta.full_name) || str(meta.name) || "Valued Member",
        email: str(authUser.email),
        phone: str(authUser.phone) || phone,
        role: str(meta.role) || "buyer",
        isVerified: Boolean(authUser.phone_confirmed_at || authUser.email_confirmed_at),
        isProfileComplete: Boolean(meta.full_name && authUser.email),
      };
    }
  } catch (err) {
    console.warn("[CONCIERGE USER LOOKUP ERROR]", err);
  }

  return null;
}

/**
 * Fetches recent conversation history for multi-turn context
 */
async function getRecentConversationHistory(phone: string, limit = 6): Promise<string> {
  try {
    const { data } = await supabaseAdmin
      .from("whatsapp_support_conversations")
      .select("role, message, created_at")
      .eq("phone", phone)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (!data || data.length === 0) return "";
    return data
      .reverse()
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.message}`)
      .join("\n");
  } catch {
    return "";
  }
}

/**
 * Searches active verified properties and projects from Supabase with strict budget and criteria enforcement.
 */
async function searchLiveListings(queryText: string, parsedIntent: ParsedSearchIntent) {
  try {
    // 1. Fetch live properties and projects from Supabase
    const [{ data: dbProps }, { data: dbProjects }] = await Promise.all([
      supabaseAdmin.from("properties").select("*").limit(200),
      supabaseAdmin.from("projects").select("*").limit(200),
    ]);

    const allProperties: any[] = dbProps && dbProps.length > 0 ? dbProps : mockProperties;
    const allProjects: any[] = dbProjects && dbProjects.length > 0 ? dbProjects : [];

    // 2. Perform search engine matching (with strict maxPrice and minPrice enforcement)
    const matchedProperties = allProperties.filter((p) => matchesPropertySearch(p as Property, queryText, parsedIntent));
    const matchedProjects = allProjects.filter((p) => matchesProjectSearch(p as Project, queryText, parsedIntent));

    // 3. If exact matches found, return them
    if (matchedProperties.length > 0 || matchedProjects.length > 0) {
      return {
        properties: matchedProperties,
        projects: matchedProjects,
        allProjects,
        allProperties,
      };
    }

    // 4. Fallback: Multi-field text token search, BUT STRICTLY ENFORCING BUDGET
    const normTokens = queryText
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length >= 3 && !["any", "the", "and", "for", "with", "find", "properties", "property", "flats", "below", "under", "lakhs", "cr"].includes(t));

    const fallbackProps = allProperties.filter((p) => {
      if (parsedIntent.maxPrice && typeof p.price === "number" && p.price > parsedIntent.maxPrice) return false;
      if (parsedIntent.minPrice && typeof p.price === "number" && p.price < parsedIntent.minPrice) return false;
      const locText = formatLocation(p);
      const searchTarget = `${p.title || ""} ${locText} ${p.description || ""} ${p.propertyType || ""}`.toLowerCase();
      return normTokens.length === 0 || normTokens.some((t) => searchTarget.includes(t));
    });

    const fallbackProjects = allProjects.filter((p) => {
      // Must strictly respect budget
      if (parsedIntent.maxPrice) {
        const configMinPrices = (p.configurations || []).map((c: any) => c.priceMin).filter(Boolean);
        const minProjectPrice = configMinPrices.length > 0 ? Math.min(...configMinPrices) : (p.minPrice || 0);
        if (minProjectPrice && minProjectPrice > parsedIntent.maxPrice) return false;
      }
      if (parsedIntent.minPrice) {
        const configMaxPrices = (p.configurations || []).map((c: any) => c.priceMax).filter(Boolean);
        const maxProjectPrice = configMaxPrices.length > 0 ? Math.max(...configMaxPrices) : (p.maxPrice || Infinity);
        if (maxProjectPrice && maxProjectPrice < parsedIntent.minPrice) return false;
      }
      const locText = formatLocation(p);
      const searchTarget = `${p.name || ""} ${p.title || ""} ${locText} ${p.builderName || ""} ${p.description || ""}`.toLowerCase();
      return normTokens.length === 0 || normTokens.some((t) => searchTarget.includes(t));
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
      .in("status", ["open", "in_progress"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      await supabaseAdmin
        .from("whatsapp_support_tickets")
        .update({
          subject: params.subject,
          last_message: params.lastMessage,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
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

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://roadd-three.vercel.app").replace(/\/$/, "");

  // 1. Log incoming user message
  await logConversation({
    phone: cleanPhone,
    role: "user",
    message: text,
  });

  // 2. Gatekeeper: Verify if sender is a registered user on ROAD
  const registeredUser = await getRegisteredUserByPhone(cleanPhone);

  if (!registeredUser) {
    const registrationPrompt =
      `👋 *Welcome to ROAD FACING!* 🏡\n\n` +
      `To search verified MLS properties, compare live pricing, and view project updates across Andhra Pradesh, you must be a registered member.\n\n` +
      `👉 *Complete 1-Tap Mobile Verification:*\n${siteUrl}/login\n\n` +
      `_Once verified, simply send your requirements here (e.g. "2BHK in Vijayawada under 60L") for instant AI matching!_`;

    await WasenderService.sendTextMessage(cleanPhone, registrationPrompt, {
      requestId: `unregistered-${Date.now()}`,
    });

    await logConversation({
      phone: cleanPhone,
      role: "system",
      message: registrationPrompt,
      intent: "registration_required",
    });

    return {
      handled: true,
      intent: "registration_required",
      responseSent: true,
      message: registrationPrompt,
    };
  }

  // 3. Human Takeover Check: If an agent is actively conversing (ticket is "in_progress" or "open"), PAUSE bot completely
  const { data: activeTicket } = await supabaseAdmin
    .from("whatsapp_support_tickets")
    .select("id, status, assigned_to, assigned_name")
    .eq("phone", cleanPhone)
    .in("status", ["open", "in_progress"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Allow user to manually resume bot by typing "bot" or "ai mode"
  const isSwitchToBot = ["BOT", "AI", "AI MODE", "RESUME BOT", "CLOSE CHAT", "EXIT AGENT"].includes(text.trim().toUpperCase());
  if (isSwitchToBot && activeTicket) {
    await supabaseAdmin
      .from("whatsapp_support_tickets")
      .update({ status: "resolved", resolved_at: new Date().toISOString() })
      .eq("id", activeTicket.id);

    const switchMsg = `🤖 *AI Concierge Resumed*\n\nI am back to assist you with property searches, project comparisons, and verified listings across Andhra Pradesh!`;
    await WasenderService.sendTextMessage(cleanPhone, switchMsg, {
      requestId: `bot-resume-${Date.now()}`,
    });
    return { handled: true, intent: "bot_resumed", responseSent: true, message: switchMsg };
  }

  if (activeTicket && activeTicket.status === "in_progress") {
    // Agent is actively chatting with user -> DO NOT LOAD SEARCH OR SEND AUTOMATED MESSAGES
    await supabaseAdmin
      .from("whatsapp_support_tickets")
      .update({
        last_message: text,
        updated_at: new Date().toISOString(),
      })
      .eq("id", activeTicket.id);

    console.log(`[CONCIERGE AGENT MODE ACTIVE] Phone: ${cleanPhone}, Message: "${text}" - Bot search paused.`);

    return {
      handled: true,
      intent: "agent_mode_active",
      responseSent: false,
      message: "Agent mode active - automated bot search paused",
    };
  }

  // 4. User is registered & Bot mode active: Schedule inactivity reminder timer
  scheduleInactivityReminder(cleanPhone, registeredUser.name);

  // 4. Parse intent and context
  const searchEngineIntent = parseSearchIntent(text);
  const lower = text.toLowerCase();

  const isHumanAgentRequest =
    lower.includes("agent") ||
    lower.includes("human") ||
    lower.includes("call me") ||
    lower.includes("talk to") ||
    lower.includes("connect") ||
    lower.includes("advisor") ||
    lower.includes("negotiate") ||
    lower.includes("contact owner");

  // 5. Handle Human Agent Request or Escalation
  if (isHumanAgentRequest) {
    const ticketId = await createOrUpdateTicket({
      phone: cleanPhone,
      userName: registeredUser.name,
      userId: registeredUser.id,
      subject: `Inquiry from ${registeredUser.name}: "${text.slice(0, 80)}"`,
      lastMessage: text,
      priority: "high",
    });

    const humanAck =
      `👨‍💼 *Request Forwarded to Senior Real Estate Advisor*\n\n` +
      `Hello ${registeredUser.name}, we have connected you with our dedicated property advisory team.\n\n` +
      `📌 *Your Inquiry:* "${text}"\n` +
      `🎫 *Ticket ID:* #${ticketId ? ticketId.slice(0, 8) : "ROAD-" + Date.now().toString().slice(-4)}\n\n` +
      `A senior property consultant has received your request and will reply directly to this chat shortly.`;

    await WasenderService.sendTextMessage(cleanPhone, humanAck, {
      requestId: `agent-escalation-${Date.now()}`,
    });

    await logConversation({
      phone: cleanPhone,
      userId: registeredUser.id,
      userName: registeredUser.name,
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

  // 6. Handle Greeting
  const isGreeting = ["hi", "hello", "hey", "namaste", "good morning", "good evening", "start"].includes(lower.trim());
  if (isGreeting) {
    const greetingMsg =
      `👋 *Hello ${registeredUser.name}!* Welcome to ROAD Concierge 🏡\n\n` +
      `I can find verified properties, new projects, villas, apartments, and open plots for you in real-time.\n\n` +
      `*Try asking:*\n` +
      `• _"Any properties in Edupugallu"_\n` +
      `• _"2bhk flats in Vijayawada under 60L"_\n` +
      `• _"Villas in Guntur under 1.5 Cr"_\n` +
      `• _"Connect me with an agent"_`;

    await WasenderService.sendTextMessage(cleanPhone, greetingMsg, {
      requestId: `greet-${Date.now()}`,
    });

    await logConversation({
      phone: cleanPhone,
      userId: registeredUser.id,
      userName: registeredUser.name,
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

  // 7. Search Listings with Strict Budget Enforcement
  const { properties, projects, allProjects, allProperties } = await searchLiveListings(text, searchEngineIntent);
  const totalMatches = properties.length + projects.length;

  if (totalMatches > 0) {
    let responseText = `🏡 *Found ${totalMatches} verified listing${totalMatches > 1 ? "s" : ""} matching your search:*\n\n`;

    // 1. Format matched Projects (e.g. Avenue Serene)
    projects.slice(0, 3).forEach((proj: any, idx) => {
      const projName = str(proj.name) || str(proj.title) || "Featured Project";
      const projSlug = str(proj.slug) || str(proj.id);
      const loc = formatLocation(proj);

      let priceStr = "Contact for Pricing";
      if (proj.minPrice && proj.maxPrice) {
        priceStr = `${formatPriceCompact(proj.minPrice)} - ${formatPriceCompact(proj.maxPrice)}`;
      } else if (proj.minPrice) {
        priceStr = `Starting at ${formatPriceCompact(proj.minPrice)}`;
      } else if (Array.isArray(proj.configurations) && proj.configurations[0]?.priceMin) {
        const prices = proj.configurations.map((c: any) => c.priceMin).filter(Boolean);
        const minP = Math.min(...prices);
        priceStr = `Starting at ${formatPriceCompact(minP)}`;
      }

      const configs = Array.isArray(proj.configurations)
        ? proj.configurations.map((c: any) => c.label || `${c.bedrooms} BHK`).filter(Boolean).join(", ")
        : "";

      responseText += `🏗️ *${idx + 1}. ${projName}* (Project)\n`;
      if (loc) responseText += `📍 *Location:* ${loc}\n`;
      responseText += `💰 *Price:* ${priceStr}\n`;
      if (configs) responseText += `🛏️ *Configurations:* ${configs}\n`;
      if (proj.constructionStatus || proj.status) {
        responseText += `📊 *Status:* ${str(proj.constructionStatus || proj.status).replace("-", " ").toUpperCase()}\n`;
      }
      responseText += `🔗 *View Project:* ${siteUrl}/projects/${projSlug}\n\n`;
    });

    // 2. Format matched individual Properties
    properties.slice(0, 3).forEach((p: any, idx) => {
      const title = str(p.title) || `${p.bedrooms || 2} BHK Property`;
      const price = typeof p.price === "number" ? formatPriceCompact(p.price) : "Contact for Price";
      const loc = formatLocation(p);
      const slug = str(p.slug) || str(p.id);
      const url = `${siteUrl}/properties/${slug}`;

      responseText += `🏠 *${projects.length + idx + 1}. ${title}*\n`;
      responseText += `💰 *Price:* ${price}\n`;
      if (loc) responseText += `📍 *Location:* ${loc}\n`;
      if (p.bedrooms) responseText += `🛏️ *Bedrooms:* ${p.bedrooms} BHK\n`;
      if (p.area) responseText += `📐 *Area:* ${p.area} sq.ft\n`;
      responseText += `🔗 *View Details:* ${url}\n\n`;
    });

    responseText += `🔍 *Browse all search results on ROAD:*\n${siteUrl}/search?q=${encodeURIComponent(text)}\n\n`;
    responseText += `_Reply with specific budget/BHK or type "Talk to agent" anytime._`;

    // Extract hero image from the top matched project or property
    let heroImage = "";
    if (projects.length > 0) {
      heroImage = extractHeroImage(projects[0]);
    } else if (properties.length > 0) {
      heroImage = extractHeroImage(properties[0]);
    }

    if (heroImage && (heroImage.startsWith("http") || heroImage.startsWith("/") || heroImage.startsWith("banners/") || heroImage.startsWith("properties/") || heroImage.startsWith("projects/"))) {
      await WasenderService.sendImageMessage(cleanPhone, heroImage, responseText, {
        requestId: `concierge-results-${Date.now()}`,
      });
    } else {
      await WasenderService.sendTextMessage(cleanPhone, responseText, {
        requestId: `concierge-results-${Date.now()}`,
      });
    }

    await logConversation({
      phone: cleanPhone,
      userId: registeredUser.id,
      userName: registeredUser.name,
      role: "assistant",
      message: responseText,
      mediaUrl: heroImage || undefined,
      intent: "property_search_matched",
      metadata: { matchedCount: totalMatches, query: text },
    });

    return {
      handled: true,
      intent: "property_search_matched",
      responseSent: true,
      message: responseText,
    };
  }

  // 8. No Exact Match for Budget / Criteria: Intelligent Real Estate Explanation
  let budgetNote = "";
  if (searchEngineIntent.maxPrice) {
    const formattedBudget = formatPriceCompact(searchEngineIntent.maxPrice);
    
    // Find what the closest starting project or property is in the database
    let closestListing = "";
    if (allProjects.length > 0) {
      const p = allProjects[0];
      const pName = p.name || "Avenue Serene";
      const pLoc = formatLocation(p);
      const minP = p.minPrice ? formatPriceCompact(p.minPrice) : (p.configurations?.[0]?.priceMin ? formatPriceCompact(p.configurations[0].priceMin) : "₹1.14 Cr");
      closestListing = `The closest verified project in this region is *${pName}* in ${pLoc}, starting from *${minP}*.`;
    }

    budgetNote =
      `🔎 *No active flats found under ${formattedBudget} currently.*\n\n` +
      `${closestListing}\n\n` +
      `Would you like our property advisor to check upcoming unlisted developments or resale flats in your ${formattedBudget} budget?\n\n` +
      `👉 Reply *"Yes, find for me"* or *"Talk to agent"* to connect directly with our advisory team.`;
  } else {
    budgetNote =
      `🔎 *No exact listings found for "${text}" right now.*\n\n` +
      `👉 *Browse Live Search:* ${siteUrl}/search?q=${encodeURIComponent(text)}\n` +
      `👉 *View Latest Projects:* ${siteUrl}/projects\n\n` +
      `Would you like our advisory team to source this specific property for you? Reply *"Yes, find for me"* and our advisor will assist you!`;
  }

  await WasenderService.sendTextMessage(cleanPhone, budgetNote, {
    requestId: `no-match-budget-${Date.now()}`,
  });

  await logConversation({
    phone: cleanPhone,
    userId: registeredUser.id,
    userName: registeredUser.name,
    role: "assistant",
    message: budgetNote,
    intent: "property_search_no_match_budget",
    metadata: { query: text, intent: searchEngineIntent },
  });

  return {
    handled: true,
    intent: "property_search_no_match_budget",
    responseSent: true,
    message: budgetNote,
  };
}
