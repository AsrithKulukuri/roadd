import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/server-auth-guard";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { WasenderService } from "@/lib/wasender";
import { normalizeWhatsAppPhone } from "@/lib/whatsapp-audience";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { errorResponse } = await requireAdmin(request);
  if (errorResponse) return errorResponse;

  const url = new URL(request.url);
  const selectedPhone = url.searchParams.get("phone");

  try {
    const phoneMap = new Map<string, any>();

    // 1. Fetch formal tickets if table exists
    const { data: ticketsData, error: ticketsErr } = await supabaseAdmin
      .from("whatsapp_support_tickets")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(100);

    if (ticketsData) {
      for (const t of ticketsData) {
        phoneMap.set(t.phone, t);
      }
    }

    // 2. Fetch recent WhatsApp conversations to ensure every active chatting user appears in the inbox
    const { data: convData, error: convErr } = await supabaseAdmin
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

    // 3. Fallback: If no tickets/convs exist yet, check requirements/inquiries
    if (phoneMap.size === 0) {
      const { data: inqData } = await supabaseAdmin
        .from("inquiries")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (inqData) {
        for (const inq of inqData) {
          const ph = normalizeWhatsAppPhone(inq.phone || "");
          if (ph && !phoneMap.has(ph)) {
            phoneMap.set(ph, {
              id: inq.id,
              phone: ph,
              user_name: inq.name || "Inquiry Lead",
              user_id: inq.user_id || null,
              subject: inq.message || inq.property_title || "Property Requirement",
              last_message: inq.message || "Expressed interest in property",
              status: inq.status || "open",
              priority: "normal",
              created_at: inq.created_at,
              updated_at: inq.created_at,
            });
          }
        }
      }
    }

    const tickets = Array.from(phoneMap.values()).sort(
      (a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
    );

    const stats = {
      openCount: tickets.filter((t) => t.status === "open").length,
      inProgressCount: tickets.filter((t) => t.status === "in_progress").length,
      resolvedCount: tickets.filter((t) => t.status === "resolved" || t.status === "closed").length,
      totalTickets: tickets.length,
    };

    let conversations: any[] = [];
    if (selectedPhone) {
      const cleanPhone = normalizeWhatsAppPhone(selectedPhone);
      const { data: selectedConvData } = await supabaseAdmin
        .from("whatsapp_support_conversations")
        .select("*")
        .eq("phone", cleanPhone || selectedPhone)
        .order("created_at", { ascending: true })
        .limit(200);

      conversations = selectedConvData || [];
    }

    return NextResponse.json({
      success: true,
      tickets,
      stats,
      conversations,
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
    ticketId: z.string(),
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

      // 3. Update ticket if associated
      if (data.ticketId && !data.ticketId.startsWith("chat-") && !data.ticketId.startsWith("conv-")) {
        await supabaseAdmin
          .from("whatsapp_support_tickets")
          .update({
            last_message: `Agent: ${data.message.slice(0, 100)}`,
            status: "in_progress",
            assigned_to: user?.id,
            assigned_name: user?.name || "Admin",
            updated_at: new Date().toISOString(),
          })
          .eq("id", data.ticketId);
      }

      return NextResponse.json({
        success: true,
        message: "Reply sent successfully via WhatsApp",
      });
    }

    if (data.action === "update_ticket_status") {
      const updates: Record<string, unknown> = {
        status: data.status,
        updated_at: new Date().toISOString(),
      };
      if (data.priority) updates.priority = data.priority;
      if (data.resolutionNote !== undefined) updates.resolution_note = data.resolutionNote;
      if (data.status === "resolved" || data.status === "closed") {
        updates.resolved_at = new Date().toISOString();
      }

      if (!data.ticketId.startsWith("chat-") && !data.ticketId.startsWith("conv-")) {
        await supabaseAdmin
          .from("whatsapp_support_tickets")
          .update(updates)
          .eq("id", data.ticketId);
      }

      return NextResponse.json({
        success: true,
        message: `Ticket status updated to ${data.status}`,
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
