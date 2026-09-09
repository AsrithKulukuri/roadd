import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { INITIAL_MESSAGES } from "@/stores/builder-store";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const builderId = searchParams.get("builderId");

    if (!builderId) {
      return NextResponse.json({ success: false, error: "builderId required" }, { status: 400 });
    }

    if (!isSupabaseConfigured()) {
      const filtered = INITIAL_MESSAGES.filter((m) => m.builderId === builderId);
      return NextResponse.json({ success: true, messages: filtered });
    }

    const { data: messages, error } = await supabase
      .from("builder_messages")
      .select("*")
      .eq("builder_id", builderId)
      .order("created_at", { ascending: true });

    if (error) {
      const filtered = INITIAL_MESSAGES.filter((m) => m.builderId === builderId);
      return NextResponse.json({ success: true, messages: filtered });
    }

    const mapped = messages.map((m: any) => ({
      id: m.id,
      builderId: m.builder_id,
      requestId: m.request_id,
      senderRole: m.sender_role,
      senderName: m.sender_name,
      message: m.message,
      attachments: m.attachments || [],
      isRead: m.is_read,
      createdAt: m.created_at,
    }));

    return NextResponse.json({ success: true, messages: mapped });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { builderId, requestId, senderRole, senderName, message, attachments } = body;

    if (!builderId || !message || !senderRole) {
      return NextResponse.json({ success: false, error: "Missing required message parameters" }, { status: 400 });
    }

    const msgId = `msg-${Date.now()}`;
    const now = new Date().toISOString();

    if (isSupabaseConfigured()) {
      await supabase.from("builder_messages").insert({
        id: msgId,
        builder_id: builderId,
        request_id: requestId || null,
        sender_role: senderRole,
        sender_name: senderName || (senderRole === "admin" ? "ROAD Concierge" : "Builder Partner"),
        message,
        attachments: attachments || [],
        is_read: false,
        created_at: now,
      });
    }

    return NextResponse.json({
      success: true,
      message: {
        id: msgId,
        builderId,
        requestId,
        senderRole,
        senderName: senderName || (senderRole === "admin" ? "ROAD Concierge" : "Builder Partner"),
        message,
        attachments: attachments || [],
        isRead: false,
        createdAt: now,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
