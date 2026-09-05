import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { WasenderService } from "@/lib/wasender";
import { formatWhatsAppPhone } from "@/lib/whatsapp/whatsapp-share";
import { getActivityStore, ProjectActivityRecord } from "../track/route";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      projectId,
      projectSlug,
      projectName,
      builderPhone,
      action,
      sessionId,
      viewerName,
      viewerPhone,
      viewerEmail,
      notes,
      timestamp = new Date().toISOString(),
    } = body;

    const cleanViewerPhone = viewerPhone ? formatWhatsAppPhone(viewerPhone) : "";
    const cleanBuilderPhone = builderPhone
      ? formatWhatsAppPhone(builderPhone)
      : formatWhatsAppPhone("+91 8977311418");

    let builderNotified = false;

    // 1. Send automated WhatsApp notification to builder if phone exists
    if (cleanViewerPhone && cleanBuilderPhone) {
      let message = "";
      if (action === "save") {
        message =
          `Project Shortlisted! ⭐\n\n` +
          `A buyer has saved *${projectName || "your project"}* to their favorites!\n\n` +
          `👤 *Buyer:* ${viewerName || "Prospective Buyer"}\n` +
          `📱 *Phone:* ${cleanViewerPhone}\n` +
          (viewerEmail ? `✉️ *Email:* ${viewerEmail}\n` : "") +
          `\nConnect with this interested buyer soon.\n\n` +
          `ROAD Facing Lead Alert`;
      } else if (action === "contact_builder") {
        message =
          `New Buyer Contact Inquiry! 💬\n\n` +
          `A buyer clicked to message you about *${projectName || "your project"}*.\n\n` +
          `👤 *Buyer:* ${viewerName || "Prospective Buyer"}\n` +
          `📱 *Phone:* ${cleanViewerPhone}\n` +
          (viewerEmail ? `✉️ *Email:* ${viewerEmail}\n` : "") +
          (notes ? `📝 *Notes:* ${notes}\n` : "") +
          `\nROAD Facing Lead Alert`;
      } else {
        message =
          `New Buyer Action! 🔔\n\n` +
          `Buyer: *${viewerName || "Interested Buyer"}* (${cleanViewerPhone})\n` +
          `Project: *${projectName}*\n` +
          `Action: ${action}\n\n` +
          `ROAD Facing Lead Alert`;
      }

      try {
        const res = await WasenderService.sendTextMessage(cleanBuilderPhone, message, {
          requestId: `lead-${action}-${Date.now()}`,
        });
        builderNotified = res.success;
      } catch (sendErr) {
        console.warn("[SHARE DETAILS API] WhatsApp builder dispatch error:", sendErr);
      }
    }

    // 2. Mark detailsShared in activity store
    const projectKey = projectId || projectSlug || "unknown_project";
    const store = getActivityStore();
    const existingList = store.get(projectKey) || [];

    const matchedRecord = existingList.find((r) => r.sessionId === sessionId);
    if (matchedRecord) {
      matchedRecord.detailsShared = true;
      matchedRecord.action = action;
      if (viewerName) matchedRecord.viewerName = viewerName;
      if (cleanViewerPhone) matchedRecord.viewerPhone = cleanViewerPhone;
      if (viewerEmail) matchedRecord.viewerEmail = viewerEmail;
      matchedRecord.updatedAt = timestamp;
    } else {
      const newRecord: ProjectActivityRecord = {
        id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        projectId: projectId || "",
        projectSlug: projectSlug || "",
        projectName: projectName || "ROAD Project",
        sessionId: sessionId || `ses-${Date.now()}`,
        dwellSeconds: 15,
        detailsShared: true,
        action,
        viewerName,
        viewerPhone: cleanViewerPhone || viewerPhone,
        viewerEmail,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      existingList.push(newRecord);
    }
    store.set(projectKey, existingList);

    // 3. Insert into Supabase project_leads & project_activity_logs
    if (supabaseAdmin) {
      try {
        await supabaseAdmin.from("project_leads").insert({
          project_id: projectId || null,
          project_slug: projectSlug || null,
          project_name: projectName,
          builder_phone: cleanBuilderPhone,
          viewer_name: viewerName || "Buyer",
          viewer_phone: cleanViewerPhone || viewerPhone,
          viewer_email: viewerEmail || null,
          delivery_status: builderNotified ? "instant_sent" : "recorded",
          created_at: timestamp,
        });

        await supabaseAdmin.from("project_activity_logs").insert({
          project_id: projectId || null,
          project_slug: projectSlug || null,
          project_name: projectName,
          session_id: sessionId || `ses-${Date.now()}`,
          dwell_seconds: 15,
          details_shared: true,
          action,
          viewer_name: viewerName || null,
          viewer_phone: cleanViewerPhone || viewerPhone || null,
          viewer_email: viewerEmail || null,
          created_at: timestamp,
          updated_at: timestamp,
        });
      } catch (dbErr) {
        console.warn("[SHARE DETAILS API] DB logging skipped:", dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      builderNotified,
      message: "Details shared and builder notified",
    });
  } catch (error: any) {
    console.error("[SHARE DETAILS API ERROR]:", error);
    return NextResponse.json({ success: false, error: error?.message || "Internal error" }, { status: 500 });
  }
}
