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
 * Fetches recent conversation history for multi-turn Gemini context
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
      .map((m) => `${m.role === "user" ? "User" : "ROAD AI"}: ${m.message}`)
      .join("\n");
  } catch {
    return "";
  }
}

/**
 * Uses Gemini 2.5 Flash to intelligently understand conversational questions and classify user requests.
 */
async function analyzeWithGemini(userText: string, conversationHistory: string, userName: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `You are "ROAD Facing AI Concierge" 🏡 — the smart, polite, expert AI real estate assistant on WhatsApp for "ROAD FACING" (Andhra Pradesh's verified MLS real estate platform in Vijayawada, Guntur, Amaravati, Visakhapatnam).
User Name: ${userName || "Valued Member"}

Recent Conversation Context:
${conversationHistory || "No previous messages"}

User's Latest Message: "${userText}"

Classify the user message into ONE of these categories:
1. "interactive_chat": If the user is asking general questions, chatting, asking about your identity ("Who are you?", "Are you a robot?", "What's your name?"), asking about real estate trends, RERA, registration process in Andhra Pradesh, or thanking you.
2. "property_search": If the user is actively searching for properties, flats, apartments, villas, plots, land, or specific projects (e.g. "3bhk flats in poranki", "Avenue Serene", "flats under 50L").
3. "human_agent": If the user is asking to talk to a real person, agent, phone call, negotiation, or contact owner.
4. "greeting": If the user simply said "Hi", "Hello", "Hey", "Good morning".

If the category is "interactive_chat", generate a warm, concise, WhatsApp-formatted response (using *bold* and emojis) answering their question naturally and offering real estate help.

Respond ONLY with a valid JSON object (no markdown code fences):
{
  "category": "interactive_chat" | "property_search" | "human_agent" | "greeting",
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
 * Searches active verified properties and projects from Supabase with strict location, BHK, and budget enforcement.
 */
async function searchLiveListings(queryText: string, parsedIntent: ParsedSearchIntent) {
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

    // Precise fallback: Only match if criteria match
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

  // 3. Human Takeover Check: If an agent is actively conversing, PAUSE bot completely
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

    return {
      handled: true,
      intent: "agent_mode_active",
      responseSent: false,
      message: "Agent mode active - automated bot search paused",
    };
  }

  // 4. Multi-Turn Context & Gemini AI Intelligence
  const conversationHistory = await getRecentConversationHistory(cleanPhone, 6);
  const geminiAnalysis = await analyzeWithGemini(text, conversationHistory, registeredUser.name);

  const lower = text.toLowerCase().trim();

  // 5. Handle Human Agent Request
  const isHumanRequest =
    geminiAnalysis?.category === "human_agent" ||
    lower.includes("connect me with agent") ||
    lower.includes("talk to agent") ||
    lower.includes("human") ||
    lower.includes("call me") ||
    lower.includes("talk to human") ||
    lower.includes("speak with agent");

  if (isHumanRequest) {
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

  // 6. Handle Interactive Chat / Q&A ("Are you a robot?", "What is your name?", etc.)
  if (geminiAnalysis?.category === "interactive_chat" && geminiAnalysis.chatResponse) {
    await WasenderService.sendTextMessage(cleanPhone, geminiAnalysis.chatResponse, {
      requestId: `chat-ai-${Date.now()}`,
    });

    await logConversation({
      phone: cleanPhone,
      userId: registeredUser.id,
      userName: registeredUser.name,
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

  // 7. Handle Greeting
  const isGreeting =
    geminiAnalysis?.category === "greeting" ||
    ["hi", "hello", "helo", "hey", "namaste", "good morning", "good evening", "start"].includes(lower);

  if (isGreeting) {
    const greetingMsg =
      `👋 *Hello ${registeredUser.name}!* Welcome to ROAD Facing Concierge 🏡\n\n` +
      `I am your AI Real Estate Assistant. I can find verified properties, builder projects, villas, apartments, and open plots for you in real-time.\n\n` +
      `*Try asking:*\n` +
      `• _"3 bhk flats in Poranki"_\n` +
      `• _"Flats in Vijayawada under 1 Crore"_\n` +
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

  // 8. Search Listings
  const searchEngineIntent = parseSearchIntent(text);
  const { properties, projects } = await searchLiveListings(text, searchEngineIntent);
  const totalMatches = properties.length + projects.length;

  if (totalMatches > 0) {
    const topProjects = projects.slice(0, 2);
    const topProps = properties.slice(0, 2);

    let responseText = `🏡 *Found ${totalMatches} verified listing${totalMatches > 1 ? "s" : ""} matching your search:*\n\n`;

    // Format Projects
    topProjects.forEach((proj: any, idx) => {
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

    // Format individual Properties
    topProps.forEach((p: any, idx) => {
      const title = str(p.title) || `${p.bedrooms || 2} BHK Property`;
      const price = typeof p.price === "number" ? formatPriceCompact(p.price) : "Contact for Price";
      const loc = formatLocation(p);
      const slug = str(p.slug) || str(p.id);
      const url = `${siteUrl}/properties/${slug}`;

      responseText += `🏠 *${topProjects.length + idx + 1}. ${title}*\n`;
      responseText += `💰 *Price:* ${price}\n`;
      if (loc) responseText += `📍 *Location:* ${loc}\n`;
      if (p.bedrooms) responseText += `🛏️ *Bedrooms:* ${p.bedrooms} BHK\n`;
      if (p.area) responseText += `📐 *Area:* ${p.area} sq.ft\n`;
      responseText += `🔗 *View Details:* ${url}\n\n`;
    });

    responseText += `🔍 *Browse all search results on ROAD:*\n${siteUrl}/search?q=${encodeURIComponent(text)}\n\n`;
    responseText += `_Reply with specific budget/BHK or type "Talk to agent" anytime._`;

    let heroImage = "";
    if (topProjects.length > 0) {
      heroImage = extractHeroImage(topProjects[0]);
    } else if (topProps.length > 0) {
      heroImage = extractHeroImage(topProps[0]);
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

  // 9. No Direct Search Match -> Intelligent AI Explanation / Fallback
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
  } else {
    fallbackMsg =
      `🔎 *No exact listings found for "${text}" right now.*\n\n` +
      `👉 *Browse Live Search:* ${siteUrl}/search?q=${encodeURIComponent(text)}\n` +
      `👉 *View Latest Projects:* ${siteUrl}/projects\n\n` +
      `Reply with specific requirements (e.g. *"3 bhk in Poranki"*) or type *"Talk to agent"* anytime!`;
  }

  await WasenderService.sendTextMessage(cleanPhone, fallbackMsg, {
    requestId: `no-match-${Date.now()}`,
  });

  await logConversation({
    phone: cleanPhone,
    userId: registeredUser.id,
    userName: registeredUser.name,
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
