import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { WasenderService } from "@/lib/wasender";
import { formatWhatsAppPhone } from "@/lib/whatsapp/whatsapp-share";
import { getRefId } from "@/lib/ref-id";
import { authenticateServerRequest } from "@/lib/server-auth-guard";

export const dynamic = "force-dynamic";

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey);
}

// Global In-Memory State for Hetzner persistent Node.js process
interface BuilderSurgeState {
  lastAlertTime: number;
  recentLeads: Array<{
    name: string;
    phone: string;
    email?: string;
    time: string;
  }>;
  burstCount: number;
  surgeAlertSentAt: number;
}

const surgeStateMap: Map<string, BuilderSurgeState> =
  (globalThis as any).__road_surge_state || new Map<string, BuilderSurgeState>();
(globalThis as any).__road_surge_state = surgeStateMap;

export async function POST(req: NextRequest) {
  try {
    // 1. Mandatory Server-Side Authentication Verification
    const auth = await authenticateServerRequest(req);

    if (!auth.authorized || !auth.user) {
      return NextResponse.json(
        { success: false, reason: "Authentication required: Please sign in to view project details" },
        { status: 401 }
      );
    }

    const verifiedUser = auth.user;
    const viewerPhone = (verifiedUser.phone || "").trim();

    if (!viewerPhone || viewerPhone.length < 8) {
      return NextResponse.json(
        { success: false, reason: "Authenticated user phone number required" },
        { status: 401 }
      );
    }

    // Strict viewer name validation from verified user profile
    const rawName = (verifiedUser.name || verifiedUser.user_metadata?.full_name || verifiedUser.user_metadata?.name || "").trim();
    const isPlaceholder = (n: string) => {
      if (!n || n.trim().length < 2) return true;
      const lower = n.trim().toLowerCase();
      return (
        lower === "interested buyer" ||
        lower === "verified buyer" ||
        lower === "guest" ||
        lower === "anonymous" ||
        lower === "user" ||
        lower === "na" ||
        lower === "n/a"
      );
    };

    const supabase = getSupabaseClient();

    let viewerName = isPlaceholder(rawName) ? "" : rawName;
    let viewerEmail = verifiedUser.email && !verifiedUser.email.endsWith("@road.internal") ? verifiedUser.email : "";

    // If name is placeholder or missing, lookup Supabase DB profiles table
    if (!viewerName && supabase) {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email")
          .or(`phone.eq.${viewerPhone},phone.eq.${viewerPhone.replace(/\D/g, "")}`)
          .maybeSingle();

        if (profile?.full_name && !isPlaceholder(profile.full_name)) {
          viewerName = profile.full_name.trim();
        }
        if (profile?.email && !profile.email.endsWith("@road.internal")) {
          viewerEmail = profile.email.trim();
        }
      } catch {}
    }

    // Require real viewer name before sending notification to builder
    if (!viewerName || isPlaceholder(viewerName)) {
      return NextResponse.json(
        {
          success: false,
          reason: "Profile completion required before notifying builder",
        },
        { status: 200 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { projectId, projectSlug, projectName, projectRefId } = body;

    // 2. Fetch Verified Project Record from Supabase Database ONLY
    let dbProject: any = null;

    if (supabase && (projectId || projectSlug)) {
      try {
        let query = supabase.from("projects").select("*");
        if (projectId) {
          query = query.eq("id", projectId);
        } else if (projectSlug) {
          query = query.eq("slug", projectSlug);
        }
        const { data } = await query.maybeSingle();
        if (data) {
          dbProject = data;
        }
      } catch (dbErr) {
        console.warn("[PROJECT VIEW NOTIFICATION] Could not fetch project from DB:", dbErr);
      }
    }

    const resolvedName = dbProject?.name || projectName || "ROAD Project";
    const resolvedSlug = dbProject?.slug || projectSlug || "";
    const resolvedRef = dbProject
      ? getRefId(dbProject)
      : projectRefId || `PRJ-${String(projectId || resolvedSlug || "ROAD").slice(0, 6).toUpperCase()}`;

    // 3. Derive Builder WhatsApp / Phone from Database Record ONLY
    const rawBuilderPhone =
      dbProject?.builder_whatsapp ||
      dbProject?.builderWhatsapp ||
      dbProject?.builder_phone ||
      dbProject?.builderPhone ||
      dbProject?.builder?.whatsapp ||
      dbProject?.builder?.phone ||
      "";

    const cleanRecipientPhone = formatWhatsAppPhone(rawBuilderPhone);

    // If no builder number registered in DB, log lead and return clean reason
    if (!cleanRecipientPhone || cleanRecipientPhone.length < 10) {
      if (supabase) {
        try {
          await supabase.from("project_leads").insert({
            project_id: projectId || dbProject?.id || null,
            project_slug: resolvedSlug || null,
            project_name: resolvedName,
            project_ref_id: resolvedRef,
            builder_phone: "NO_BUILDER_PHONE",
            viewer_name: viewerName,
            viewer_phone: viewerPhone,
            viewer_email: viewerEmail || "Not provided",
            delivery_status: "no_builder_phone",
          });
        } catch {}
      }

      return NextResponse.json(
        {
          success: false,
          reason: "No valid builder phone registered for this project in database",
        },
        { status: 200 }
      );
    }

    const now = new Date();
    const formattedDate = now.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "medium",
      timeStyle: "short",
    });
    const formattedTimeOnly = now.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      timeStyle: "short",
    });

    // 4. Record lead in Supabase (Zero Lead Loss)
    let leadRecordId: string | null = null;
    if (supabase) {
      try {
        const { data: insertedLead } = await supabase
          .from("project_leads")
          .insert({
            project_id: projectId || dbProject?.id || null,
            project_slug: resolvedSlug || null,
            project_name: resolvedName,
            project_ref_id: resolvedRef,
            builder_phone: cleanRecipientPhone,
            builder_whatsapp: rawBuilderPhone,
            viewer_name: viewerName,
            viewer_phone: viewerPhone,
            viewer_email: viewerEmail || "Not provided",
            delivery_status: "logged",
          })
          .select("id")
          .single();

        if (insertedLead) {
          leadRecordId = insertedLead.id;
        }
      } catch (dbInsertEx) {
        console.warn("[PROJECT LEADS INSERT EXCEPTION]:", dbInsertEx);
      }
    }

    // 5. Surge Pacer & Notification Dispatch
    const nowMs = Date.now();
    let state = surgeStateMap.get(cleanRecipientPhone);
    if (!state) {
      state = {
        lastAlertTime: 0,
        recentLeads: [],
        burstCount: 0,
        surgeAlertSentAt: 0,
      };
      surgeStateMap.set(cleanRecipientPhone, state);
    }

    state.recentLeads.unshift({
      name: viewerName,
      phone: viewerPhone,
      email: viewerEmail,
      time: formattedTimeOnly,
    });
    if (state.recentLeads.length > 15) {
      state.recentLeads = state.recentLeads.slice(0, 15);
    }

    state.burstCount += 1;
    const timeSinceLastAlert = nowMs - state.lastAlertTime;
    const timeSinceLastSurge = nowMs - state.surgeAlertSentAt;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://roadd-three.vercel.app";
    const projectUrl = `${siteUrl}/projects/${resolvedSlug || projectId}`;

    // CASE A: Normal Flow (First view in > 30 seconds)
    if (timeSinceLastAlert > 30000 && state.burstCount <= 1) {
      state.lastAlertTime = nowMs;
      state.burstCount = 1;

      const singleMessage = [
        `*New Buyer Interest on ROAD FACING* 🏢`,
        ``,
        `Hello! A verified buyer is actively exploring *${resolvedName}* (Ref: ${resolvedRef}).`,
        ``,
        `👤 *Buyer Name:* ${viewerName}`,
        `📞 *Phone Number:* ${viewerPhone}`,
        viewerEmail && viewerEmail !== "Not provided" ? `✉️ *Email:* ${viewerEmail}` : null,
        `🕒 *Time:* ${formattedDate} IST`,
        ``,
        `🔗 *Project URL:* ${projectUrl}`,
        ``,
        `💬 *Would you like us to schedule a site visit with this buyer?* Reply *YES* or call them directly at ${viewerPhone}.`,
        ``,
        `_Reply 'STOP' to unsubscribe from view alerts._`,
      ].filter(Boolean).join("\n");

      const sendResult = await WasenderService.sendTextMessage(cleanRecipientPhone, singleMessage);

      if (leadRecordId && supabase) {
        try {
          await supabase
            .from("project_leads")
            .update({ delivery_status: "instant_sent" })
            .eq("id", leadRecordId);
        } catch {}
      }

      return NextResponse.json({
        success: true,
        mode: "single_instant",
        message: "Instant WhatsApp view notification dispatched to builder",
        leadId: leadRecordId,
        wasender: sendResult,
      });
    }

    // CASE B: Traffic Surge (> 1 view within 30s) -> Consolidated Surge Alert
    if (timeSinceLastSurge > 120000 || state.surgeAlertSentAt === 0) {
      state.surgeAlertSentAt = nowMs;
      state.lastAlertTime = nowMs;

      const topRecent = state.recentLeads.slice(0, 5);
      const leadItemsFormatted = topRecent
        .map((l, i) => {
          const emailLine = l.email && l.email !== "Not provided" ? `\n   ✉️ Email: ${l.email}` : "";
          return `${i + 1}️⃣ *${l.name}*\n   📞 Phone: ${l.phone}${emailLine}\n   🕒 Time: ${l.time} IST`;
        })
        .join("\n\n");

      const surgeMessage = [
        `🔥 *HIGH BUYER TRAFFIC ALERT — ROAD FACING* 🏢`,
        ``,
        `*${state.burstCount} Verified Buyers* are actively exploring *${resolvedName}* (Ref: ${resolvedRef})!`,
        ``,
        `📋 *Recent Interested Buyers:*`,
        ``,
        leadItemsFormatted,
        ``,
        `🔗 *Project URL:* ${projectUrl}`,
        `───────────────────`,
        `_Tip: Tap any phone number above to call or chat with the buyer directly._`,
      ].filter(Boolean).join("\n");

      const sendResult = await WasenderService.sendTextMessage(cleanRecipientPhone, surgeMessage);

      if (leadRecordId && supabase) {
        try {
          await supabase
            .from("project_leads")
            .update({ delivery_status: "surge_batched" })
            .eq("id", leadRecordId);
        } catch {}
      }

      return NextResponse.json({
        success: true,
        mode: "surge_alert",
        message: "Surge alert dispatched to builder",
        leadId: leadRecordId,
        wasender: sendResult,
      });
    }

    // CASE C: High-frequency surge continuation (silently logged)
    return NextResponse.json({
      success: true,
      mode: "surge_silent_record",
      message: "Lead recorded in database",
      leadId: leadRecordId,
    });
  } catch (error: any) {
    console.error("[PROJECT VIEW NOTIFICATION ERROR]:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
