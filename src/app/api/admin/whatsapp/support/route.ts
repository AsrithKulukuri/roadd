import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/server-auth-guard";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { WasenderService } from "@/lib/wasender";
import { normalizeWhatsAppPhone } from "@/lib/whatsapp-audience";
import { getSavedPropertiesForUser } from "@/lib/whatsapp/lead-engine";
import { getConversationState } from "@/lib/whatsapp/conversation-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { errorResponse } = await requireAdmin(request);
  if (errorResponse) return errorResponse;

  const url = new URL(request.url);
  const selectedPhone = url.searchParams.get("phone");

  try {
    const phoneMap = new Map<string, any>();

    // 1. Fetch formal tickets
    const { data: ticketsData } = await supabaseAdmin
      .from("whatsapp_support_tickets")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(100);

    if (ticketsData) {
      for (const t of ticketsData) {
        phoneMap.set(t.phone, t);
      }
    }

    // 2. Fetch recent WhatsApp conversations to ensure every active chatting user appears in inbox
    const { data: convData } = await supabaseAdmin
      .from("whatsapp_support_conversations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (convData) {
      for (const conv of convData) {
        if (!phoneMap.has(conv.phone)) {
          phoneMap.set(conv.phone, {
            id: conv.id || `chat-${conv.phone}`,
            phone: conv.phone,
            user_name: conv.user_name || "WhatsApp User",
            user_id: conv.user_id || null,
            subject: conv.message?.slice(0, 80) || "WhatsApp Chat",
            last_message: conv.message || "",
            status: "open",
            priority: "normal",
            created_at: conv.created_at,
            updated_at: conv.created_at,
          });
        }
      }
    }

    const tickets = Array.from(phoneMap.values()).sort(
      (a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
    );

    const stats = {
      urgentCount: tickets.filter((t) => t.priority === "urgent" || t.priority === "high").length,
      openCount: tickets.filter((t) => t.status === "open").length,
      inProgressCount: tickets.filter((t) => t.status === "in_progress").length,
      resolvedCount: tickets.filter((t) => t.status === "resolved" || t.status === "closed").length,
      totalTickets: tickets.length,
    };

    let conversations: any[] = [];
    let customerProfile: any = null;
    let savedProperties: any[] = [];
    let aiCopilot: any = null;

    if (selectedPhone) {
      const cleanPhone = normalizeWhatsAppPhone(selectedPhone) || selectedPhone;

      // Conversations thread
      const { data: selectedConvData } = await supabaseAdmin
        .from("whatsapp_support_conversations")
        .select("*")
        .eq("phone", cleanPhone)
        .order("created_at", { ascending: true })
        .limit(200);

      conversations = selectedConvData || [];

      // Customer CRM Data
      const [leadRes, savedPropsRes, stateRes] = await Promise.all([
        supabaseAdmin.from("whatsapp_leads").select("*").eq("phone", cleanPhone).maybeSingle(),
        getSavedPropertiesForUser(cleanPhone),
        getConversationState(cleanPhone),
      ]);

      const lead = leadRes.data;
      savedProperties = savedPropsRes;

      const currentTicket = tickets.find((t) => t.phone === cleanPhone);

      customerProfile = {
        name: lead?.user_name || currentTicket?.user_name || stateRes.userName || "Valued Buyer",
        phone: cleanPhone,
        leadScore: lead?.lead_score || 55,
        stage: lead?.stage || "EXPLORING",
        purpose: lead?.purpose || "SELF_USE",
        budgetRange: lead?.budget_range || (stateRes.lastSearch.maxPrice ? `Under ₹${(stateRes.lastSearch.maxPrice / 100000).toFixed(0)}L` : "Flexible"),
        timeline: lead?.timeline || "1_3_MONTHS",
        interestedProject: lead?.interested_project_name || stateRes.selectedPropertyId || "General Inquiry",
        lastSearch: stateRes.lastSearch,
        agentMode: Boolean(stateRes.agentMode || currentTicket?.status === "in_progress"),
      };

      // AI Copilot for Human Agent (Silent Assistant)
      aiCopilot = {
        buyerIntentSummary: `Buyer is interested in ${customerProfile.budgetRange} options in ${stateRes.lastSearch.locationKeywords?.join(", ") || "Andhra Pradesh"}.`,
        likelyObjection: "Pricing / Payment Flexibility / Delivery Timeline",
        recommendedAction: "Confirm specific requirements and offer high-res site photos or arrange a site visit.",
        suggestedResponses: [
          `Hello ${customerProfile.name}! I am reviewing verified availability in your budget right now. What is your preferred move-in date?`,
          `We have exclusive developer pricing available on verified 3 BHK projects in this corridor. Would you like me to share the brochure?`,
          `Would you like to schedule an on-site visit this weekend with our area consultant?`,
        ],
      };
    }

    return NextResponse.json({
      success: true,
      tickets,
      stats,
      conversations,
      customerProfile,
      savedProperties,
      aiCopilot,
    });
  } catch (err: unknown) {
    console.error("[ADMIN SUPPORT API GET ERROR]", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to load support data" },
      { status: 500 }
    );
  }
}

const postSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("send_reply"),
    phone: z.string().min(10),
    message: z.string().trim().min(1).max(3000),
    ticketId: z.string().optional(),
  }),
  z.object({
    action: z.literal("update_ticket_status"),
    ticketId: z.string().optional(),
    phone: z.string().min(10),
    status: z.enum(["open", "in_progress", "resolved", "closed"]),
    priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
    resolutionNote: z.string().trim().max(1000).optional(),
  }),
]);

export async function POST(request: Request) {
  const { errorResponse, user } = await requireAdmin(request);
  if (errorResponse) return errorResponse;

  const parsed = postSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message || "Invalid support action request" },
      { status: 400 }
    );
  }

  const data = parsed.data;

  try {
    if (data.action === "send_reply") {
      const cleanPhone = normalizeWhatsAppPhone(data.phone);
      if (!cleanPhone) {
        return NextResponse.json({ success: false, error: "Invalid phone number." }, { status: 400 });
      }

      // 1. Send live WhatsApp message to user
      const sendResult = await WasenderService.sendTextMessage(cleanPhone, data.message, {
        requestId: `admin-reply-${Date.now()}`,
      });

      if (!sendResult.success && !sendResult.simulated) {
        return NextResponse.json(
          { success: false, error: sendResult.error || "Failed to send WhatsApp message via Wasender." },
          { status: 502 }
        );
      }

      // 2. Log in conversation history
      await supabaseAdmin.from("whatsapp_support_conversations").insert({
        phone: cleanPhone,
        user_name: user?.name || "Admin Advisor",
        role: "agent",
        message: data.message,
        intent: "admin_manual_reply",
        metadata: { adminId: user?.id, adminEmail: user?.email },
      });

      // 3. Update all tickets for this phone to in_progress & activate agent mode
      await supabaseAdmin
        .from("whatsapp_support_tickets")
        .update({
          last_message: `Agent: ${data.message.slice(0, 100)}`,
          status: "in_progress",
          assigned_to: user?.id,
          assigned_name: user?.name || "Admin Advisor",
          updated_at: new Date().toISOString(),
        })
        .eq("phone", cleanPhone);

      await supabaseAdmin.from("whatsapp_conversation_state").upsert({
        phone: cleanPhone,
        agent_mode: true,
        updated_at: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        message: "Reply sent successfully via WhatsApp",
      });
    }

    if (data.action === "update_ticket_status") {
      const cleanPhone = normalizeWhatsAppPhone(data.phone) || data.phone;
      const isResolved = data.status === "resolved" || data.status === "closed";

      const updates: Record<string, unknown> = {
        status: data.status,
        updated_at: new Date().toISOString(),
      };
      if (data.priority) updates.priority = data.priority;
      if (data.resolutionNote !== undefined) updates.resolution_note = data.resolutionNote;
      if (isResolved) {
        updates.resolved_at = new Date().toISOString();
      }

      // Update in whatsapp_support_tickets by phone to ensure all records for this contact are updated
      await supabaseAdmin
        .from("whatsapp_support_tickets")
        .update(updates)
        .eq("phone", cleanPhone);

      // If specific ID is provided and not synthetic
      if (data.ticketId && !data.ticketId.startsWith("chat-") && !data.ticketId.startsWith("conv-")) {
        await supabaseAdmin
          .from("whatsapp_support_tickets")
          .update(updates)
          .eq("id", data.ticketId);
      }

      // Update agent_mode in conversation state: false when resolved, true when reopened/in_progress
      await supabaseAdmin.from("whatsapp_conversation_state").upsert({
        phone: cleanPhone,
        agent_mode: !isResolved,
        updated_at: new Date().toISOString(),
      });

      // If resolved, notify the user that AI Concierge has resumed
      if (isResolved) {
        const resumeNotice = `🤖 *AI Concierge Resumed*\n\nYour support session has been completed by our advisor. I am back and ready to assist you with property searches across Andhra Pradesh! 🏡\n\n*Try asking:* _"3 bhk flats in Poranki"_ or _"Flats under 1 Cr"_`;
        await WasenderService.sendTextMessage(cleanPhone, resumeNotice, {
          requestId: `resume-notice-${Date.now()}`,
        }).catch(() => null);

        try {
          await supabaseAdmin.from("whatsapp_support_conversations").insert({
            phone: cleanPhone,
            role: "system",
            message: resumeNotice,
            intent: "ai_resumed_notice",
          });
        } catch {
          // ignore logging failure
        }
      }

      return NextResponse.json({
        success: true,
        message: `Ticket status updated to ${data.status}. AI Concierge ${isResolved ? "resumed" : "paused"}.`,
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    console.error("[ADMIN SUPPORT API POST ERROR]", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Support action failed" },
      { status: 500 }
    );
  }
}
