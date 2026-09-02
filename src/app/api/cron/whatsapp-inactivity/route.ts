import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { WasenderService } from "@/lib/wasender";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    // 1. Find recent conversations in the last 15 minutes
    const { data: recentMessages, error } = await supabaseAdmin
      .from("whatsapp_support_conversations")
      .select("id, phone, user_name, role, intent, created_at")
      .gte("created_at", fifteenMinutesAgo)
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!recentMessages || recentMessages.length === 0) {
      return NextResponse.json({ success: true, processed: 0, message: "No recent conversations" });
    }

    // 2. Group messages by phone to find the latest state per phone
    const phoneMap = new Map<string, { latestMsg: any; allMsgs: any[] }>();
    for (const msg of recentMessages) {
      if (!phoneMap.has(msg.phone)) {
        phoneMap.set(msg.phone, { latestMsg: msg, allMsgs: [msg] });
      } else {
        phoneMap.get(msg.phone)!.allMsgs.push(msg);
      }
    }

    let sentCount = 0;

    for (const [phone, { latestMsg, allMsgs }] of phoneMap.entries()) {
      // If the latest message is an inactivity reminder or from user, skip
      if (latestMsg.intent === "inactivity_reminder" || latestMsg.role === "user") continue;

      // Check if the user is in an active human agent takeover session (in_progress)
      const { data: activeTicket } = await supabaseAdmin
        .from("whatsapp_support_tickets")
        .select("id, status")
        .eq("phone", phone)
        .eq("status", "in_progress")
        .maybeSingle();

      if (activeTicket) continue; // Don't interrupt human agent chat

      // Check if last activity happened more than 2.5 minutes (150s) ago and less than 15 minutes ago
      const lastActivityTime = new Date(latestMsg.created_at).getTime();
      const idleTimeMs = Date.now() - lastActivityTime;
      const isEligibleForReminder = idleTimeMs >= 150 * 1000 && idleTimeMs <= 15 * 60 * 1000;

      // Check if an inactivity reminder was already sent for this conversation session
      const alreadySentInactivity = allMsgs.some((m) => m.intent === "inactivity_reminder");

      if (isEligibleForReminder && !alreadySentInactivity) {
        const userName = latestMsg.user_name || "there";
        const inactivityText =
          `👋 *Seems you are inactive!*\n\n` +
          `Please type *"Hi"* or continue typing to proceed with exploring verified properties & projects on ROAD! 🏡`;

        try {
          await WasenderService.sendTextMessage(phone, inactivityText, {
            requestId: `cron-inactivity-${phone}-${Date.now()}`,
          });

          await supabaseAdmin.from("whatsapp_support_conversations").insert({
            phone,
            user_name: userName,
            role: "system",
            message: inactivityText,
            intent: "inactivity_reminder",
          });

          sentCount++;
        } catch (sendErr) {
          console.warn(`[INACTIVITY CRON SEND ERROR] Phone: ${phone}`, sendErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      processed: phoneMap.size,
      remindersSent: sentCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error("[INACTIVITY CRON ERROR]", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Inactivity cron failed" },
      { status: 500 }
    );
  }
}
