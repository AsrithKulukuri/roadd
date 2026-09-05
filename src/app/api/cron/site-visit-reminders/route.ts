import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { WasenderService } from "@/lib/wasender";
import { formatWhatsAppPhone } from "@/lib/whatsapp/whatsapp-share";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Parses date string (e.g. "2026-09-08" or "Tue, Sep 8, 2026") and timeSlot (e.g. "11:30 AM")
 * into a approximate timestamp (assuming Asia/Kolkata timezone UTC+5:30)
 */
function parseScheduleTimestamp(dateStr: string, timeSlot: string): number | null {
  try {
    const combinedStr = `${dateStr} ${timeSlot}`;
    const parsed = new Date(combinedStr);
    if (!isNaN(parsed.getTime())) {
      return parsed.getTime();
    }
  } catch {}
  return null;
}

export async function GET(request: Request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({
        success: false,
        message: "Database admin client not configured",
      });
    }

    // Fetch upcoming scheduled visits where reminder hasn't been sent
    const { data: visits, error } = await supabaseAdmin
      .from("project_site_visits")
      .select("*")
      .eq("status", "scheduled")
      .eq("reminder_sent", false)
      .limit(50);

    if (error) {
      console.warn("[SITE VISIT REMINDERS CRON] Error querying visits:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    if (!visits || visits.length === 0) {
      return NextResponse.json({ success: true, processed: 0, message: "No pending reminders found" });
    }

    const nowMs = Date.now();
    let sentCount = 0;

    for (const visit of visits) {
      const scheduledTime = parseScheduleTimestamp(visit.visit_date, visit.time_slot);

      // Check window: between 30 minutes and 90 minutes before the visit (target is 1 hour before)
      let isWithinWindow = false;
      if (scheduledTime) {
        const diffMinutes = (scheduledTime - nowMs) / (1000 * 60);
        // If scheduled within 30 to 90 minutes from now
        if (diffMinutes >= 30 && diffMinutes <= 90) {
          isWithinWindow = true;
        }
      } else {
        // Fallback: If date matches today's date string, we can send reminder
        const todayStr = new Date().toISOString().slice(0, 10);
        if (visit.visit_date && visit.visit_date.includes(todayStr)) {
          isWithinWindow = true;
        }
      }

      if (isWithinWindow) {
        const cleanPhone = formatWhatsAppPhone(visit.customer_phone);
        if (cleanPhone) {
          const reminderMsg =
            `Site Visit Reminder! ⏰\n\n` +
            `Hello ${visit.customer_name}, your site visit for *${visit.project_name}* is in 1 hour!\n\n` +
            `📅 *Date:* ${visit.visit_date}\n` +
            `⏰ *Time:* ${visit.time_slot}\n` +
            `📍 *Location:* ${visit.project_location || "Project Site"}\n\n` +
            `Our site executive is ready to welcome you. See you shortly!\n\n` +
            `ROAD Facing Support`;

          try {
            await WasenderService.sendTextMessage(cleanPhone, reminderMsg, {
              requestId: `remind-${visit.id}`,
            });
            sentCount++;

            // Update reminder_sent flag
            await supabaseAdmin
              .from("project_site_visits")
              .update({ reminder_sent: true })
              .eq("id", visit.id);
          } catch (sendErr) {
            console.warn(`[SITE VISIT REMINDER] Failed to send to ${cleanPhone}:`, sendErr);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      processed: visits.length,
      remindersSent: sentCount,
    });
  } catch (err: any) {
    console.error("[SITE VISIT REMINDERS CRON ERROR]:", err);
    return NextResponse.json({ success: false, error: err?.message || "Internal error" }, { status: 500 });
  }
}
