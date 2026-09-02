import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/server-auth-guard";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { WasenderService } from "@/lib/wasender";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getBroadcastIntervalMs(): number {
  const configured = Number(process.env.WASENDER_BROADCAST_INTERVAL_MS || 60000);
  if (!Number.isFinite(configured)) return 60000;
  return Math.max(5000, Math.min(configured, 300000));
}

const processSchema = z.object({
  campaignId: z.string().uuid(),
});

type RecipientRow = {
  id: string;
  campaign_id: string;
  contact_id: string;
  phone: string;
  attempt_count: number;
};

async function updateCampaignProgress(campaignId: string) {
  const { data: recipients, error } = await supabaseAdmin
    .from("whatsapp_campaign_recipients")
    .select("status, attempt_count")
    .eq("campaign_id", campaignId);
  if (error) throw error;

  const rows = recipients || [];
  const sentCount = rows.filter((row) => row.status === "sent").length;
  const failedCount = rows.filter(
    (row) => row.status === "skipped" || (row.status === "failed" && row.attempt_count >= 3)
  ).length;
  const pending = rows.some(
    (row) =>
      row.status === "queued" ||
      row.status === "sending" ||
      (row.status === "failed" && row.attempt_count < 3)
  );

  const updates: Record<string, unknown> = {
    sent_count: sentCount,
    failed_count: failedCount,
  };
  if (!pending) {
    updates.status = failedCount > 0 ? "completed_with_failures" : "completed";
    updates.completed_at = new Date().toISOString();
  }

  const { error: updateError } = await supabaseAdmin
    .from("whatsapp_campaigns")
    .update(updates)
    .eq("id", campaignId);
  if (updateError) throw updateError;

  return { sentCount, failedCount, pending };
}

export async function POST(request: Request) {
  const { errorResponse } = await requireAdmin(request);
  if (errorResponse) return errorResponse;

  const parsed = processSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "A valid campaign identifier is required." }, { status: 400 });
  }

  const { campaignId } = parsed.data;
  try {
    const { data: claimedRows, error: claimError } = await supabaseAdmin.rpc(
      "claim_next_whatsapp_recipient",
      { p_campaign_id: campaignId }
    );
    if (claimError) throw claimError;

    const recipient = (claimedRows?.[0] || null) as RecipientRow | null;
    if (!recipient) {
      const progress = await updateCampaignProgress(campaignId);
      return NextResponse.json({ success: true, processed: false, nextDelayMs: getBroadcastIntervalMs(), ...progress });
    }

    const [{ data: campaign, error: campaignError }, { data: contact, error: contactError }] = await Promise.all([
      supabaseAdmin
        .from("whatsapp_campaigns")
        .select("id, message, media_url, media_kind, status")
        .eq("id", campaignId)
        .maybeSingle(),
      supabaseAdmin
        .from("whatsapp_contacts")
        .select("id, is_subscribed, opted_out_at")
        .eq("id", recipient.contact_id)
        .maybeSingle(),
    ]);
    if (campaignError) throw campaignError;
    if (contactError) throw contactError;

    if (!campaign || campaign.status === "cancelled" || !contact?.is_subscribed || contact.opted_out_at) {
      await supabaseAdmin
        .from("whatsapp_campaign_recipients")
        .update({ status: "skipped", last_error: "Contact opted out or campaign cancelled." })
        .eq("id", recipient.id);
      const progress = await updateCampaignProgress(campaignId);
      return NextResponse.json({ success: true, processed: true, skipped: true, nextDelayMs: getBroadcastIntervalMs(), ...progress });
    }

    const requestId = `broadcast-${campaignId}-${recipient.id}`;
    const result =
      campaign.media_kind === "image" && campaign.media_url
        ? await WasenderService.sendImageMessage(recipient.phone, campaign.media_url, campaign.message, { requestId })
        : await WasenderService.sendTextMessage(recipient.phone, campaign.message, { requestId });

    if (result.simulated) {
      const { error } = await supabaseAdmin
        .from("whatsapp_campaign_recipients")
        .update({
          status: "skipped",
          provider_message_id: result.id || null,
          last_error: "Simulation only. No request was sent to Wasender.",
          sent_at: null,
        })
        .eq("id", recipient.id);
      if (error) throw error;
    } else if (result.success) {
      const { error } = await supabaseAdmin
        .from("whatsapp_campaign_recipients")
        .update({
          status: "sent",
          provider_message_id: result.id || null,
          last_error: null,
          sent_at: new Date().toISOString(),
        })
        .eq("id", recipient.id);
      if (error) throw error;
    } else {
      const retrySeconds = Math.min(
        3600,
        Math.max(result.retryAfterSeconds || 0, 30 * Math.max(1, recipient.attempt_count))
      );
      const { error } = await supabaseAdmin
        .from("whatsapp_campaign_recipients")
        .update({
          status: "failed",
          last_error: (result.error || "Wasender delivery failed.").slice(0, 500),
          next_attempt_at: new Date(Date.now() + retrySeconds * 1000).toISOString(),
        })
        .eq("id", recipient.id);
      if (error) throw error;
    }

    const progress = await updateCampaignProgress(campaignId);
    return NextResponse.json({
      success: true,
      processed: true,
      delivered: result.success && !result.simulated,
      simulated: Boolean(result.simulated),
      providerStatus: result.statusCode || null,
      nextDelayMs: getBroadcastIntervalMs(),
      ...progress,
    });
  } catch (error: unknown) {
    console.error("[WHATSAPP CAMPAIGN PROCESS ERROR]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Campaign queue processing failed." },
      { status: 500 }
    );
  }
}
