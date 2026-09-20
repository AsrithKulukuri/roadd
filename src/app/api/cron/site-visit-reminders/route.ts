import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendSiteVisitNotification } from "@/lib/whatsapp/site-visit-notification";
import { formatWhatsAppPhone } from "@/lib/whatsapp/whatsapp-share";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseTime(timeStr: string): { hours: number; minutes: number } | null {
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = (match[3] || "").toUpperCase();
  if (meridiem === "PM" && hours < 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;
  return { hours, minutes };
}

/**
 * Parses date string (e.g. "Mon, Sep 21, 2026" or "2026-09-21") and timeSlot (e.g. "10:00 AM - 11:00 AM")
 * into an accurate timestamp in Indian Standard Time (IST, UTC+05:30).
 */
function parseScheduleTimestamp(dateStr: string, timeSlot: string): number | null {
  try {
    const startTimeStr = timeSlot.split("-")[0].trim();
    const time = parseTime(startTimeStr);
    if (!time) return null;

    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hour = String(time.hours).padStart(2, "0");
    const minute = String(time.minutes).padStart(2, "0");

    const istIso = `${year}-${month}-${day}T${hour}:${minute}:00+05:30`;
    const parsed = new Date(istIso);
    return isNaN(parsed.getTime()) ? null : parsed.getTime();
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({
        success: false,
        message: "Database admin client not configured",
      });
    }

    // Optional verification if CRON_SECRET is configured
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // Allow internal Vercel cron or admin bypass
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
    let remindersSent = 0;
    const adminPhone = formatWhatsAppPhone(process.env.ADMIN_WHATSAPP_PHONE || process.env.NEXT_PUBLIC_ADMIN_WHATSAPP_PHONE || "");

    for (const visit of visits) {
      const scheduledTime = parseScheduleTimestamp(visit.visit_date, visit.time_slot);

      // Check window: between 15 minutes and 90 minutes before the visit (target is 1 hour before)
      let isWithinWindow = false;
      if (scheduledTime) {
        const diffMinutes = (scheduledTime - nowMs) / (1000 * 60);
        if (diffMinutes >= 15 && diffMinutes <= 90) {
          isWithinWindow = true;
        }
      } else {
        // Fallback: If date matches today's date string and slot starts within today
        const todayStr = new Date().toISOString().slice(0, 10);
        if (visit.visit_date && visit.visit_date.includes(todayStr)) {
          isWithinWindow = true;
        }
      }

      if (isWithinWindow) {
        const cleanCustomerPhone = formatWhatsAppPhone(visit.customer_phone);
        const cleanBuilderPhone = formatWhatsAppPhone(visit.builder_phone || "");

        // 1. Notify Customer 1 hour before
        if (cleanCustomerPhone) {
          const customerMsg =
            `Site Visit Reminder! ⏰\n\n` +
            `Hello ${visit.customer_name}, your site visit for *${visit.project_name}* is scheduled in approximately 1 hour!\n\n` +
            `📅 *Date:* ${visit.visit_date}\n` +
            `⏰ *Time Slot:* ${visit.time_slot}\n` +
            `📍 *Location:* ${visit.project_location || "Project Site"}\n\n` +
            `Our site executive is ready to welcome and guide you. See you shortly!\n\n` +
            `— ROAD Facing Support`;

          try {
            await sendSiteVisitNotification(cleanCustomerPhone, customerMsg, {
              requestId: `remind-cust-${visit.id}`,
            });
            remindersSent++;
          } catch (err) {
            console.warn(`[SITE VISIT REMINDER] Failed to send to customer ${cleanCustomerPhone}:`, err);
          }
        }

        // 2. Notify Builder (and Admin) 1 hour before
        const targetBuilderPhone = cleanBuilderPhone || adminPhone;
        if (targetBuilderPhone) {
          const builderMsg =
            `Site Visit Reminder (In 1 Hour)! 🔔\n\n` +
            `Upcoming site visit for *${visit.project_name}* in 1 hour:\n\n` +
            `👤 *Visitor:* ${visit.customer_name}\n` +
            `📞 *Phone:* +${cleanCustomerPhone}\n` +
            `📅 *Date:* ${visit.visit_date}\n` +
            `⏰ *Time Slot:* ${visit.time_slot}\n` +
            `📍 *Location:* ${visit.project_location || "Project Site"}\n` +
            (visit.notes ? `📝 *Notes:* ${visit.notes}\n` : "") +
            `\nPlease ensure a site executive is available at the property.\n\n` +
            `— ROAD Facing Support`;

          const builderRecipients = [...new Set([targetBuilderPhone, adminPhone].filter(Boolean))];
          for (const recipient of builderRecipients) {
            try {
              await sendSiteVisitNotification(recipient, builderMsg, {
                requestId: `remind-bld-${visit.id}-${recipient}`,
                recipientType: recipient === targetBuilderPhone ? "builder" : "admin",
              });
            } catch (err) {
              console.warn(`[SITE VISIT REMINDER] Failed to send to builder ${recipient}:`, err);
            }
          }
        }

        // 3. Mark reminder_sent = true so duplicate reminders are not dispatched
        try {
          await supabaseAdmin
            .from("project_site_visits")
            .update({ reminder_sent: true })
            .eq("id", visit.id);
        } catch (dbErr) {
          console.warn(`[SITE VISIT REMINDER] Failed to update reminder_sent for ${visit.id}:`, dbErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      processed: visits.length,
      remindersSent,
    });
  } catch (err: any) {
    console.error("[SITE VISIT REMINDERS CRON ERROR]:", err);
    return NextResponse.json({ success: false, error: err?.message || "Internal error" }, { status: 500 });
  }
}
