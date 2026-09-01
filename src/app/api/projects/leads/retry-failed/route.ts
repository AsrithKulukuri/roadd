import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { WasenderService } from "@/lib/wasender";
import { authenticateServerRequest } from "@/lib/server-auth-guard";

export const dynamic = "force-dynamic";

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey);
}

/**
 * Background retry worker for un-delivered project leads
 * Can be triggered via Hetzner cron job:
 * curl -X POST https://road.in/api/projects/leads/retry-failed -H "x-admin-secret: <ADMIN_SECRET_KEY>"
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateServerRequest(req);
    if (!auth.authorized || auth.role !== "admin") {
      return NextResponse.json({ success: false, error: "Forbidden: Admin or server secret required" }, { status: 403 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 500 });
    }

    // Pick leads that were logged or failed, older than 2 minutes and within last 24h
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: pendingLeads, error } = await supabase
      .from("project_leads")
      .select("*")
      .in("delivery_status", ["logged", "failed"])
      .neq("builder_phone", "NO_BUILDER_PHONE")
      .gte("created_at", twentyFourHoursAgo)
      .lte("created_at", twoMinutesAgo)
      .order("created_at", { ascending: true })
      .limit(25);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    if (!pendingLeads || pendingLeads.length === 0) {
      return NextResponse.json({ success: true, retriedCount: 0, message: "No pending leads to retry" });
    }

    let successCount = 0;
    let failureCount = 0;

    for (const lead of pendingLeads) {
      if (!lead.builder_phone || lead.builder_phone === "NO_BUILDER_PHONE") continue;

      const dateObj = lead.created_at ? new Date(lead.created_at) : new Date();
      const formattedDate = dateObj.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "short",
      });

      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://road.in";
      const projectUrl = `${siteUrl}/projects/${lead.project_slug || lead.project_id || ""}`;

      const retryMessage = [
        `*New Buyer Interest on ROAD FACING* 🏢`,
        ``,
        `Hello! A verified buyer explored *${lead.project_name || "your project"}* (Ref: ${lead.project_ref_id || "-"}).`,
        ``,
        `👤 *Buyer Name:* ${lead.viewer_name || "Verified Buyer"}`,
        `📞 *Phone Number:* ${lead.viewer_phone}`,
        lead.viewer_email && lead.viewer_email !== "Not provided" ? `✉️ *Email:* ${lead.viewer_email}` : null,
        `🕒 *Time:* ${formattedDate} IST`,
        ``,
        `🔗 *Project URL:* ${projectUrl}`,
        ``,
        `💬 *Would you like us to schedule a site visit with this buyer?* Reply *YES* or call them directly at ${lead.viewer_phone}.`,
      ].filter(Boolean).join("\n");

      try {
        const sendRes = await WasenderService.sendTextMessage(lead.builder_phone, retryMessage);
        if (sendRes && sendRes.success !== false) {
          await supabase
            .from("project_leads")
            .update({ delivery_status: "retry_sent" })
            .eq("id", lead.id);
          successCount++;
        } else {
          await supabase
            .from("project_leads")
            .update({ delivery_status: "failed" })
            .eq("id", lead.id);
          failureCount++;
        }
      } catch {
        failureCount++;
      }
    }

    return NextResponse.json({
      success: true,
      retriedCount: pendingLeads.length,
      successCount,
      failureCount,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
