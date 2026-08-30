import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { WasenderService } from "@/lib/wasender";
import { formatWhatsAppPhone } from "@/lib/whatsapp/whatsapp-share";
import { getRefId } from "@/lib/ref-id";

export const dynamic = "force-dynamic";

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { projectId, projectSlug, projectName, projectRefId, builderPhone, builderWhatsapp, viewer } = body;

    // 1. Strict validation of viewer details
    if (!viewer || typeof viewer !== "object") {
      return NextResponse.json(
        { success: false, reason: "Viewer details required" },
        { status: 200 }
      );
    }

    const viewerName = (viewer.name || "").trim() || "Interested Buyer";
    const viewerPhone = (viewer.phone || "").trim();
    const viewerEmail = (viewer.email || "").trim() || "Not provided";

    if (!viewerPhone || viewerPhone.length < 8) {
      return NextResponse.json(
        { success: false, reason: "Viewer phone is required" },
        { status: 200 }
      );
    }

    // 2. Resolve project information
    let resolvedName = projectName || "ROAD Project";
    let resolvedRef = projectRefId || "";
    let resolvedSlug = projectSlug || "";
    let resolvedBuilderPhone =
      builderWhatsapp ||
      builderPhone ||
      body.builder?.whatsapp ||
      body.builder?.phone ||
      "";

    // Server-side verification via Supabase if possible
    const supabase = getSupabaseClient();
    if (supabase && (projectId || projectSlug)) {
      try {
        const query = supabase.from("projects").select("*");
        if (projectId) {
          query.eq("id", projectId);
        } else if (projectSlug) {
          query.eq("slug", projectSlug);
        }
        const { data: dbProject } = await query.single();
        if (dbProject) {
          resolvedName = dbProject.name || resolvedName;
          resolvedSlug = dbProject.slug || resolvedSlug;
          resolvedRef = resolvedRef || getRefId(dbProject);
          resolvedBuilderPhone =
            resolvedBuilderPhone ||
            dbProject.builder_whatsapp ||
            dbProject.builderWhatsapp ||
            dbProject.builder_phone ||
            dbProject.builderPhone ||
            dbProject.builder?.whatsapp ||
            dbProject.builder?.phone ||
            "";
        }
      } catch (dbErr) {
        console.warn("[PROJECT VIEW NOTIFICATION] Could not fetch project from DB:", dbErr);
      }
    }

    if (!resolvedRef) {
      resolvedRef = `PRJ-${String(projectId || resolvedSlug || "ROAD").slice(0, 6).toUpperCase()}`;
    }

    // 3. Resolve recipient phone number (with verified platform fallback if project has no builder contact)
    const DEFAULT_BUILDER_PHONE = "918885005567";
    const cleanRecipientPhone = formatWhatsAppPhone(resolvedBuilderPhone || DEFAULT_BUILDER_PHONE);
    if (!cleanRecipientPhone || cleanRecipientPhone.length < 10) {
      console.log(`[PROJECT VIEW NOTIFICATION] Skipped: Invalid recipient phone for ${resolvedName}`);
      return NextResponse.json(
        { success: false, reason: "Invalid builder phone number" },
        { status: 200 }
      );
    }

    // In-memory recipient throttle cache to avoid sending >1 alert per 30s per builder number
    const globalThrottle = (globalThis as any).__wasender_recipient_throttle || new Map<string, number>();
    (globalThis as any).__wasender_recipient_throttle = globalThrottle;

    const lastSentTime = globalThrottle.get(cleanRecipientPhone);
    const nowMs = Date.now();

    if (lastSentTime && nowMs - lastSentTime < 30000) {
      console.log(`[PROJECT VIEW NOTIFICATION] Throttled (${Math.round((30000 - (nowMs - lastSentTime)) / 1000)}s) to protect WhatsApp quality rating`);
      return NextResponse.json({
        success: true,
        message: "Message queued / throttled for recipient protection",
        throttled: true,
      });
    }
    globalThrottle.set(cleanRecipientPhone, nowMs);

    // 4. Construct project URL
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://roadd-three.vercel.app";
    const projectUrl = `${siteUrl}/projects/${resolvedSlug || projectId}`;

    // 5. Format timestamp (IST)
    const now = new Date();
    const formattedDate = now.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "medium",
      timeStyle: "short",
    });

    // 6. Natural greeting variations to avoid repetitive spam classification
    const greetings = [
      `*New Buyer Interest on ROAD FACING* 🏢`,
      `*Verified Buyer Inquiry — ROAD FACING* ✨`,
      `*Project Lead Alert — ROAD FACING* 📍`,
    ];
    const headerGreeting = greetings[Math.floor(Math.random() * greetings.length)];

    // 7. Build compliant, personalized message with interactive question & opt-out footer
    const message = [
      headerGreeting,
      ``,
      `Hello! A verified buyer is actively exploring *${resolvedName}* (Ref: ${resolvedRef}).`,
      ``,
      `👤 *Buyer Name:* ${viewerName}`,
      `📞 *Phone Number:* ${viewerPhone}`,
      viewerEmail && viewerEmail !== "Not provided" ? `✉️ *Email:* ${viewerEmail}` : null,
      `🕒 *Time:* ${formattedDate} IST`,
      ``,
      `🔗 *View Project:* ${projectUrl}`,
      ``,
      `💬 *Would you like us to schedule a site visit with this buyer?* Reply *YES* or call them directly at ${viewerPhone}.`,
      ``,
      `_Reply 'STOP' to unsubscribe from view alerts._`,
    ].filter(Boolean).join("\n");

    // 8. Dispatch via Wasender (with human jitter delay)
    const sendResult = await WasenderService.sendTextMessage(cleanRecipientPhone, message);

    return NextResponse.json({
      success: sendResult.success,
      message: sendResult.message,
      id: sendResult.id,
      error: sendResult.error,
    });
  } catch (error: any) {
    console.error("[PROJECT VIEW NOTIFICATION ERROR]:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 200 }
    );
  }
}
