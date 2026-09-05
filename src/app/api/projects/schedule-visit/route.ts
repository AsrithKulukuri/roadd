import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { WasenderService } from "@/lib/wasender";
import { formatWhatsAppPhone } from "@/lib/whatsapp/whatsapp-share";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      projectId,
      projectSlug,
      projectName,
      projectLocation,
      customerName,
      customerPhone,
      customerEmail,
      builderName,
      builderPhone,
      visitDate,
      timeSlot,
      notes,
    } = body;

    // Validate required fields
    if (!projectName || !customerName || !customerPhone || !visitDate || !timeSlot) {
      return NextResponse.json(
        { success: false, error: "Missing required fields (project name, customer name, phone, date, time slot)" },
        { status: 400 }
      );
    }

    const cleanCustomerPhone = formatWhatsAppPhone(customerPhone);
    const cleanBuilderPhone = builderPhone ? formatWhatsAppPhone(builderPhone) : "";

    const scheduleId = `visit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const createdAt = new Date().toISOString();

    let customerNotified = false;
    let builderNotified = false;

    // 1. Send WhatsApp notification to Customer
    try {
      const customerMsg =
        `Hello ${customerName}! 🏡\n\n` +
        `Your site visit for *${projectName}* is *CONFIRMED*!\n\n` +
        `📅 *Date:* ${visitDate}\n` +
        `⏰ *Time Slot:* ${timeSlot}\n` +
        `📍 *Location:* ${projectLocation || "Project Site"}\n\n` +
        `Our project team will be ready to guide you through the property. We will also send you a reminder 1 hour before your visit.\n\n` +
        `Thank you for using ROAD Facing!`;

      if (cleanCustomerPhone) {
        const custResult = await WasenderService.sendTextMessage(cleanCustomerPhone, customerMsg, {
          requestId: `sched-cust-${scheduleId}`,
        });
        customerNotified = custResult.success;
      }
    } catch (msgErr) {
      console.warn("[SCHEDULE VISIT] Failed to send WhatsApp to customer:", msgErr);
    }

    // 2. Send WhatsApp notification to Builder
    try {
      const targetBuilderPhone = cleanBuilderPhone || formatWhatsAppPhone("+91 8977311418"); // platform support fallback
      if (targetBuilderPhone) {
        const builderMsg =
          `New Site Visit Scheduled! 🔔\n\n` +
          `Project: *${projectName}*\n` +
          `Customer: *${customerName}*\n` +
          `Phone: ${cleanCustomerPhone || customerPhone}\n` +
          (customerEmail ? `Email: ${customerEmail}\n` : "") +
          `📅 *Date:* ${visitDate}\n` +
          `⏰ *Time Slot:* ${timeSlot}\n` +
          `📍 *Location:* ${projectLocation || "Site"}\n` +
          (notes ? `📝 *Notes:* ${notes}\n` : "") +
          `\nPlease ensure a site executive is available for the visit.\n\n` +
          `ROAD Facing Admin`;

        const bldResult = await WasenderService.sendTextMessage(targetBuilderPhone, builderMsg, {
          requestId: `sched-bld-${scheduleId}`,
        });
        builderNotified = bldResult.success;
      }
    } catch (bldErr) {
      console.warn("[SCHEDULE VISIT] Failed to send WhatsApp to builder:", bldErr);
    }

    // 3. Save to Supabase if table exists
    if (supabaseAdmin) {
      try {
        await supabaseAdmin.from("project_site_visits").insert({
          id: scheduleId,
          project_id: projectId || null,
          project_slug: projectSlug || null,
          project_name: projectName,
          project_location: projectLocation || null,
          customer_name: customerName,
          customer_phone: cleanCustomerPhone || customerPhone,
          customer_email: customerEmail || null,
          builder_name: builderName || null,
          builder_phone: cleanBuilderPhone || builderPhone || null,
          visit_date: visitDate,
          time_slot: timeSlot,
          status: "scheduled",
          customer_notified: customerNotified,
          builder_notified: builderNotified,
          reminder_sent: false,
          notes: notes || null,
          created_at: createdAt,
        });
      } catch (dbErr) {
        console.warn("[SCHEDULE VISIT] Supabase insert skipped or table not present:", dbErr);
      }
    }

    const schedule = {
      id: scheduleId,
      projectId: projectId || "",
      projectSlug: projectSlug || "",
      projectName,
      projectLocation: projectLocation || "",
      customerName,
      customerPhone: cleanCustomerPhone || customerPhone,
      customerEmail,
      builderName,
      builderPhone: cleanBuilderPhone || builderPhone,
      visitDate,
      timeSlot,
      status: "scheduled" as const,
      customerNotified,
      builderNotified,
      reminderSent: false,
      notes,
      createdAt,
    };

    return NextResponse.json({
      success: true,
      schedule,
      customerNotified,
      builderNotified,
      message: "Site visit scheduled successfully",
    });
  } catch (error: any) {
    console.error("[SCHEDULE VISIT API ERROR]:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
