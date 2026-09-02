import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { normalizeWhatsAppPhone } from "@/lib/whatsapp-audience";
import { WasenderService } from "@/lib/wasender";
import { formatPriceCompact } from "@/lib/utils";
import { parseSearchIntent, matchesPropertySearch, matchesProjectSearch } from "@/lib/search-engine";
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
 * Intelligent Real Estate Intent Classifier using Gemini AI + Heuristics
 */
async function parseRealEstateIntent(text: string): Promise<{
  queryType: "property_search" | "project_search" | "human_agent_request" | "greeting" | "general_inquiry";
  city?: string;
  sublocation?: string;
  bedrooms?: number;
  propertyType?: string;
  maxBudget?: number;
  minBudget?: number;
  listingType?: "buy" | "rent";
  summary: string;
}> {
  const lower = text.toLowerCase();
  const isHumanRequest =
    lower.includes("call") ||
    lower.includes("agent") ||
    lower.includes("human") ||
    lower.includes("talk to") ||
    lower.includes("negotiat") ||
    lower.includes("contact owner");

  if (isHumanRequest) {
    return { queryType: "human_agent_request", summary: text };
  }

  const isGreeting = ["hi", "hello", "hey", "namaste", "good morning", "good evening"].includes(lower.trim());
  if (isGreeting) {
    return { queryType: "greeting", summary: text };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      queryType: "property_search",
      summary: text,
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `You are the real estate search parser for "ROAD FACING" (real estate discovery platform in Andhra Pradesh: Vijayawada, Guntur, Amaravati, Visakhapatnam).
Extract the user's property or project search intent from the message:

Message: "${text}"

Respond ONLY with a JSON object (no markdown, no code blocks):
{
  "queryType": "property_search" | "project_search" | "human_agent_request" | "greeting" | "general_inquiry",
  "city": "Vijayawada" | "Guntur" | "Amaravati" | "Visakhapatnam" | null,
  "sublocation": string or null (e.g. Edupugallu, Poranki, Autonagar, Benz Circle, Mangalagiri, Kunchanapalli, Tadepalli, etc.),
  "bedrooms": number or null (e.g. 1, 2, 3, 4),
  "propertyType": "flat" | "apartment" | "villa" | "plot" | "commercial" | null,
  "maxBudget": number in INR or null,
  "minBudget": number in INR or null,
  "listingType": "buy" | "rent" | null,
  "summary": "short summary"
}`;

    const result = await model.generateContent(prompt);
    const rawResponse = result.response.text().trim();
    const cleanJson = rawResponse.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    return JSON.parse(cleanJson);
  } catch (err) {
    console.warn("[CONCIERGE GEMINI PARSE ERROR]", err);
    return {
      queryType: "property_search",
      summary: text,
    };
  }
}

/**
 * Searches active verified properties and projects from Supabase with smart fallback matching.
 */
async function searchLiveListings(queryText: string, parsedIntent: ReturnType<typeof parseSearchIntent>) {
  try {
    // 1. Fetch live properties and projects from Supabase
    const [{ data: dbProps }, { data: dbProjects }] = await Promise.all([
      supabaseAdmin.from("properties").select("*").limit(200),
      supabaseAdmin.from("projects").select("*").limit(200),
    ]);

    const allProperties: any[] = dbProps && dbProps.length > 0 ? dbProps : mockProperties;
    const allProjects: any[] = dbProjects && dbProjects.length > 0 ? dbProjects : [];

    // 2. Perform search engine matching
    const matchedProperties = allProperties.filter((p) => matchesPropertySearch(p as Property, queryText, parsedIntent));
    const matchedProjects = allProjects.filter((p) => matchesProjectSearch(p as Project, queryText, parsedIntent));

    // 3. If exact matches found, return them
    if (matchedProperties.length > 0 || matchedProjects.length > 0) {
      return {
        properties: matchedProperties,
        projects: matchedProjects,
      };
    }

    // 4. Fallback: Multi-field text token search (matching sublocation, locality, name, or city token)
    const normTokens = queryText
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length >= 3 && !["any", "the", "and", "for", "with", "find", "properties", "property"].includes(t));

    const fallbackProps = allProperties.filter((p) => {
      const locText = formatLocation(p);
      const searchTarget = `${p.title || ""} ${locText} ${p.description || ""} ${p.propertyType || ""}`.toLowerCase();
      return normTokens.length === 0 || normTokens.some((t) => searchTarget.includes(t));
    });

    const fallbackProjects = allProjects.filter((p) => {
      const locText = formatLocation(p);
      const searchTarget = `${p.name || ""} ${p.title || ""} ${locText} ${p.builderName || ""} ${p.description || ""}`.toLowerCase();
      return normTokens.length === 0 || normTokens.some((t) => searchTarget.includes(t));
    });

    return {
      properties: fallbackProps,
      projects: fallbackProjects,
    };
  } catch (err) {
    console.error("[CONCIERGE DB SEARCH ERROR]", err);
    return { properties: [], projects: [] };
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

  // 3. User is registered: Parse intent with search engine parser & Gemini AI
  const searchEngineIntent = parseSearchIntent(text);
  const geminiIntent = await parseRealEstateIntent(text);

  // 4. Handle Human Agent Request or Escalation
  if (geminiIntent.queryType === "human_agent_request") {
    const ticketId = await createOrUpdateTicket({
      phone: cleanPhone,
      userName: registeredUser.name,
      userId: registeredUser.id,
      subject: `Inquiry from ${registeredUser.name}: "${text.slice(0, 80)}"`,
      lastMessage: text,
      priority: "high",
    });

    const humanAck =
      `👨‍💼 *Request Forwarded to Real Estate Advisor*\n\n` +
      `Hello ${registeredUser.name}, we have connected you with our dedicated property advisory team.\n\n` +
      `📌 *Your Inquiry:* "${text}"\n` +
      `🎫 *Ticket ID:* #${ticketId ? ticketId.slice(0, 8) : "ROAD-" + Date.now().toString().slice(-4)}\n\n` +
      `A senior property consultant will reply directly to this chat shortly.`;

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

  // 5. Handle Greeting
  if (geminiIntent.queryType === "greeting") {
    const greetingMsg =
      `👋 *Hello ${registeredUser.name}!* Welcome to ROAD Concierge 🏡\n\n` +
      `I can find verified properties, new projects, villas, apartments, and open plots for you in real-time.\n\n` +
      `*Try asking:*\n` +
      `• _"Any properties in edupugallu"_\n` +
      `• _"2bhk flats in Vijayawada under 60L"_\n` +
      `• _"Villas in Guntur"_\n` +
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

  // 6. Handle Property / Project Search
  const { properties, projects } = await searchLiveListings(text, searchEngineIntent);

  if (properties.length > 0 || projects.length > 0) {
    const propertyCount = properties.length;
    const projectCount = projects.length;
    const totalCount = propertyCount + projectCount;

    let responseText = `🏡 *Found ${totalCount} verified listing${totalCount > 1 ? "s" : ""} matching your search:*\n\n`;

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
      metadata: { matchedCount: totalCount, query: text },
    });

    return {
      handled: true,
      intent: "property_search_matched",
      responseSent: true,
      message: responseText,
    };
  }

  // 7. No direct matches found: Provide recommendations & direct search link
  const noMatchMsg =
    `🔎 *No exact match found for "${text}" right now.*\n\n` +
    `Here are popular verified listings on ROAD:\n` +
    `👉 *Browse Live Search:* ${siteUrl}/search?q=${encodeURIComponent(text)}\n` +
    `👉 *View Latest Projects:* ${siteUrl}/projects\n\n` +
    `Would you like our team to source this specific property for you? Reply *"Yes, find for me"* and our advisor will assist you!`;

  await WasenderService.sendTextMessage(cleanPhone, noMatchMsg, {
    requestId: `no-match-${Date.now()}`,
  });

  await logConversation({
    phone: cleanPhone,
    userId: registeredUser.id,
    userName: registeredUser.name,
    role: "assistant",
    message: noMatchMsg,
    intent: "property_search_no_match",
    metadata: { query: text },
  });

  return {
    handled: true,
    intent: "property_search_no_match",
    responseSent: true,
    message: noMatchMsg,
  };
}
