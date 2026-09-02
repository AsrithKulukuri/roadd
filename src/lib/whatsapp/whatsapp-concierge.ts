import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { normalizeWhatsAppPhone, readImageUrl } from "@/lib/whatsapp-audience";
import { WasenderService } from "@/lib/wasender";
import { formatPriceCompact } from "@/lib/utils";

export interface ConciergeExecutionResult {
  handled: boolean;
  intent: string;
  responseSent: boolean;
  ticketCreated?: boolean;
  message?: string;
}

type LooseRecord = Record<string, unknown>;

function str(val: unknown): string {
  return typeof val === "string" ? val.trim() : "";
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
 * Uses Gemini AI to extract real estate search intent from incoming natural language text.
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
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Fallback heuristic if API key is not set
    const lower = text.toLowerCase();
    const bhkMatch = lower.match(/(\d)\s*(?:bhk|bedroom|bed)/i);
    const bedrooms = bhkMatch ? parseInt(bhkMatch[1], 10) : undefined;
    let city: string | undefined;
    if (lower.includes("vijayawada")) city = "Vijayawada";
    else if (lower.includes("guntur")) city = "Guntur";
    else if (lower.includes("amaravati")) city = "Amaravati";
    else if (lower.includes("vizag") || lower.includes("visakhapatnam")) city = "Visakhapatnam";

    const isHumanRequest = lower.includes("call") || lower.includes("agent") || lower.includes("human") || lower.includes("talk to") || lower.includes("negotiat");
    return {
      queryType: isHumanRequest ? "human_agent_request" : (city || bedrooms ? "property_search" : "general_inquiry"),
      city,
      bedrooms,
      summary: text,
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `You are the real estate search parser for "ROAD FACING" (real estate platform in Andhra Pradesh: Vijayawada, Guntur, Amaravati, Visakhapatnam).
Extract the user's property search parameters or inquiry intent from the following message:

Message: "${text}"

Respond ONLY with a JSON object matching this structure (no markdown formatting, no code blocks):
{
  "queryType": "property_search" | "project_search" | "human_agent_request" | "greeting" | "general_inquiry",
  "city": "Vijayawada" | "Guntur" | "Amaravati" | "Visakhapatnam" | null,
  "sublocation": string or null,
  "bedrooms": number or null (e.g. 1, 2, 3, 4),
  "propertyType": "flat" | "apartment" | "villa" | "plot" | "commercial" | null,
  "maxBudget": number in INR or null (e.g. 5000000 for 50 Lakhs, 15000000 for 1.5 Cr),
  "minBudget": number in INR or null,
  "listingType": "buy" | "rent" | null,
  "summary": "one sentence summary of user request"
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
 * Searches active verified properties and projects from Supabase.
 */
async function searchLiveListings(params: {
  city?: string;
  sublocation?: string;
  bedrooms?: number;
  propertyType?: string;
  maxBudget?: number;
  minBudget?: number;
}) {
  try {
    let propQuery = supabaseAdmin
      .from("properties")
      .select("*")
      .eq("is_published", true)
      .limit(20);

    if (params.city) {
      propQuery = propQuery.ilike("city", `%${params.city}%`);
    }
    if (params.sublocation) {
      propQuery = propQuery.ilike("location", `%${params.sublocation}%`);
    }
    if (params.bedrooms) {
      propQuery = propQuery.eq("bedrooms", params.bedrooms);
    }
    if (params.maxBudget) {
      propQuery = propQuery.lte("price", params.maxBudget);
    }
    if (params.minBudget) {
      propQuery = propQuery.gte("price", params.minBudget);
    }

    const { data: properties, error: propError } = await propQuery;
    if (propError) console.warn("[CONCIERGE PROPERTY QUERY ERROR]", propError);

    let projQuery = supabaseAdmin
      .from("projects")
      .select("*")
      .limit(10);

    if (params.city) {
      projQuery = projQuery.ilike("city", `%${params.city}%`);
    }
    const { data: projects, error: projError } = await projQuery;
    if (projError) console.warn("[CONCIERGE PROJECT QUERY ERROR]", projError);

    return {
      properties: (properties || []) as LooseRecord[],
      projects: (projects || []) as LooseRecord[],
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

  // 3. User is registered: Parse intent with Gemini AI
  const intent = await parseRealEstateIntent(text);

  // 4. Handle Human Agent Request or Escalation
  if (intent.queryType === "human_agent_request" || text.toLowerCase().includes("human") || text.toLowerCase().includes("talk to agent")) {
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
  if (intent.queryType === "greeting") {
    const greetingMsg =
      `👋 *Hello ${registeredUser.name}!* Welcome to ROAD Concierge 🏡\n\n` +
      `I can find verified properties, villas, apartments, and open plots for you in real-time.\n\n` +
      `*Try asking:*\n` +
      `• _"2bhk flats in Vijayawada"_\n` +
      `• _"Villas in Guntur under 1.5 Cr"_\n` +
      `• _"Commercial plots in Amaravati"_\n` +
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
  const { properties, projects } = await searchLiveListings({
    city: intent.city,
    sublocation: intent.sublocation,
    bedrooms: intent.bedrooms,
    propertyType: intent.propertyType,
    maxBudget: intent.maxBudget,
    minBudget: intent.minBudget,
  });

  if (properties.length > 0 || projects.length > 0) {
    const topProperty = properties[0];
    const propertyCount = properties.length;
    const projectCount = projects.length;

    let responseText = `🏡 *Found ${propertyCount + projectCount} matching verified listing${propertyCount + projectCount > 1 ? "s" : ""} for you:*\n\n`;

    // Format top 3 properties
    properties.slice(0, 3).forEach((p, idx) => {
      const title = str(p.title) || `${p.bedrooms || 2} BHK Property`;
      const price = typeof p.price === "number" ? formatPriceCompact(p.price) : "Contact for Price";
      const loc = [str(p.location), str(p.city)].filter(Boolean).join(", ");
      const slug = str(p.slug) || str(p.id);
      const url = `${siteUrl}/properties/${slug}`;

      responseText += `*${idx + 1}. ${title}*\n`;
      responseText += `💰 *Price:* ${price}\n`;
      if (loc) responseText += `📍 *Location:* ${loc}\n`;
      if (p.bedrooms) responseText += `🛏️ *Bedrooms:* ${p.bedrooms} BHK\n`;
      if (p.area) responseText += `📐 *Area:* ${p.area} sq.ft\n`;
      responseText += `🔗 *View Details:* ${url}\n\n`;
    });

    // Format top project if available
    if (projects.length > 0) {
      const proj = projects[0];
      const projName = str(proj.name) || str(proj.title) || "Featured Project";
      const projSlug = str(proj.slug) || str(proj.id);
      responseText += `🏗️ *Featured Project:* *${projName}*\n`;
      responseText += `📍 *City:* ${str(proj.city) || "Andhra Pradesh"}\n`;
      responseText += `🔗 *Explore Project:* ${siteUrl}/projects/${projSlug}\n\n`;
    }

    responseText += `🔍 *View all search results:*\n${siteUrl}/search?city=${encodeURIComponent(intent.city || "")}&bedrooms=${intent.bedrooms || ""}\n\n`;
    responseText += `_Reply with specific requirements or type "Talk to agent" anytime._`;

    // Send with primary image if topProperty has an image
    const heroImage = topProperty ? readImageUrl(topProperty) : "";
    if (heroImage && (heroImage.startsWith("http") || heroImage.startsWith("/") || heroImage.startsWith("banners/") || heroImage.startsWith("properties/"))) {
      await WasenderService.sendImageMessage(cleanPhone, heroImage, responseText, {
        requestId: `concierge-prop-${Date.now()}`,
      });
    } else {
      await WasenderService.sendTextMessage(cleanPhone, responseText, {
        requestId: `concierge-prop-${Date.now()}`,
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
      metadata: { matchedCount: propertyCount + projectCount, intent },
    });

    return {
      handled: true,
      intent: "property_search_matched",
      responseSent: true,
      message: responseText,
    };
  }

  // 7. No direct matches found: Provide recommendations & search page
  const noMatchMsg =
    `🔎 *No exact match found for "${text}" right now.*\n\n` +
    `Here are popular verified listings in ${intent.city || "Andhra Pradesh"}:\n` +
    `👉 *Browse Live Search:* ${siteUrl}/search\n` +
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
    metadata: { intent },
  });

  return {
    handled: true,
    intent: "property_search_no_match",
    responseSent: true,
    message: noMatchMsg,
  };
}
