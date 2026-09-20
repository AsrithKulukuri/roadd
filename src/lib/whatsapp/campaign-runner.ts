import { supabaseAdmin } from "@/lib/supabase-admin";
import { WhatsAppService, getWhatsAppProvider } from "@/lib/whatsapp-service";

/** Delay between Meta Cloud API recipients. */
export function getBroadcastIntervalMs(): number {
  const interval = Number(process.env.META_BROADCAST_INTERVAL_MS || 250);
  return Number.isFinite(interval) ? Math.max(50, Math.min(interval, 5000)) : 250;
}

export interface CampaignProgress {
  sentCount: number;
  failedCount: number;
  pending: boolean;
}

export interface ProcessBatchOptions {
  batchSize?: number;
  maxDurationMs?: number;
}

export interface ProcessBatchResult extends CampaignProgress {
  processedCount: number;
  deliveredCount: number;
  skippedCount: number;
  batchFailedCount: number;
  nextDelayMs: number;
}

type RecipientRow = {
  id: string;
  campaign_id: string;
  contact_id: string;
  phone: string;
  attempt_count: number;
};

/**
 * Updates campaign aggregate progress (sent_count, failed_count, status, completed_at) in Supabase.
 */
export async function updateCampaignProgress(campaignId: string): Promise<CampaignProgress> {
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
  } else {
    updates.status = "sending";
  }

  const { error: updateError } = await supabaseAdmin
    .from("whatsapp_campaigns")
    .update(updates)
    .eq("id", campaignId);

  if (updateError) throw updateError;

  return { sentCount, failedCount, pending };
}

/**
 * Atomically claims and dispatches a batch of campaign recipients.
 * Processes up to `batchSize` recipients or until `maxDurationMs` is reached.
 */
export async function processCampaignBatch(
  campaignId: string,
  options?: ProcessBatchOptions
): Promise<ProcessBatchResult> {
  const isMeta = getWhatsAppProvider() === "meta";
  // Default to 20 for Meta, 5 for Meta WhatsApp
  const defaultBatch = isMeta ? 20 : 5;
  const batchSize = Math.max(1, Math.min(options?.batchSize || defaultBatch, 50));
  const maxDurationMs = Math.max(5000, Math.min(options?.maxDurationMs || 24000, 55000));
  const startTime = Date.now();
  const intervalMs = getBroadcastIntervalMs();

  let processedCount = 0;
  let deliveredCount = 0;
  let skippedCount = 0;
  let batchFailedCount = 0;

  // 1. Fetch campaign details once
  const { data: campaign, error: campaignError } = await supabaseAdmin
    .from("whatsapp_campaigns")
    .select("id, message, media_url, media_kind, status")
    .eq("id", campaignId)
    .maybeSingle();

  if (campaignError) throw campaignError;
  if (!campaign || campaign.status === "cancelled") {
    const progress = await updateCampaignProgress(campaignId);
    return {
      processedCount: 0,
      deliveredCount: 0,
      skippedCount: 0,
      batchFailedCount: 0,
      nextDelayMs: intervalMs,
      ...progress,
    };
  }

  // 2. Process batch of recipients
  while (processedCount < batchSize && Date.now() - startTime < maxDurationMs) {
    const { data: claimedRows, error: claimError } = await supabaseAdmin.rpc(
      "claim_next_whatsapp_recipient",
      { p_campaign_id: campaignId }
    );

    if (claimError) {
      console.error("[CAMPAIGN RUNNER CLAIM ERROR]", claimError);
      break;
    }

    const recipient = (claimedRows?.[0] || null) as RecipientRow | null;
    if (!recipient) {
      // No more recipients available right now
      break;
    }

    // Check contact subscription status
    const { data: contact, error: contactError } = await supabaseAdmin
      .from("whatsapp_contacts")
      .select("id, is_subscribed, opted_out_at")
      .eq("id", recipient.contact_id)
      .maybeSingle();

    if (contactError) {
      console.warn("[CAMPAIGN RUNNER CONTACT LOOKUP ERROR]", contactError);
    }

    if (!contact?.is_subscribed || contact.opted_out_at) {
      await supabaseAdmin
        .from("whatsapp_campaign_recipients")
        .update({ status: "skipped", last_error: "Contact opted out or unsubscribed." })
        .eq("id", recipient.id);
      skippedCount++;
      processedCount++;
      continue;
    }

    const requestId = `broadcast-${campaignId}-${recipient.id}`;
    const result =
      campaign.media_kind === "image" && campaign.media_url
        ? await WhatsAppService.sendImageMessage(
            recipient.phone,
            campaign.media_url,
            campaign.message,
            { requestId }
          )
        : await WhatsAppService.sendTextMessage(recipient.phone, campaign.message, {
            requestId,
          });

    if (result.simulated) {
      await supabaseAdmin
        .from("whatsapp_campaign_recipients")
        .update({
          status: "skipped",
          provider_message_id: result.id || null,
          last_error: "Simulation only. No request sent to live provider.",
          sent_at: null,
        })
        .eq("id", recipient.id);
      skippedCount++;
    } else if (result.success) {
      await supabaseAdmin
        .from("whatsapp_campaign_recipients")
        .update({
          status: "sent",
          provider_message_id: result.id || null,
          last_error: null,
          sent_at: new Date().toISOString(),
        })
        .eq("id", recipient.id);
      deliveredCount++;
    } else {
      const retrySeconds = Math.min(
        3600,
        Math.max(result.retryAfterSeconds || 0, 30 * Math.max(1, recipient.attempt_count))
      );
      await supabaseAdmin
        .from("whatsapp_campaign_recipients")
        .update({
          status: "failed",
          last_error: (result.error || "WhatsApp delivery failed.").slice(0, 500),
          next_attempt_at: new Date(Date.now() + retrySeconds * 1000).toISOString(),
        })
        .eq("id", recipient.id);
      batchFailedCount++;
    }

    processedCount++;

    // Spacing delay between consecutive sends
    if (intervalMs > 0 && processedCount < batchSize && Date.now() - startTime < maxDurationMs) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  const progress = await updateCampaignProgress(campaignId);
  return {
    processedCount,
    deliveredCount,
    skippedCount,
    batchFailedCount,
    nextDelayMs: intervalMs,
    ...progress,
  };
}

/**
 * Automatically executes campaign batches continuously in the background until all recipients are processed.
 */
export async function runCampaignToCompletion(
  campaignId: string,
  maxBatches = 50
): Promise<CampaignProgress> {
  let pending = true;
  let batches = 0;
  let lastProgress: CampaignProgress = { sentCount: 0, failedCount: 0, pending: true };

  while (pending && batches < maxBatches) {
    batches++;
    const res = await processCampaignBatch(campaignId, { batchSize: 20, maxDurationMs: 24000 });
    pending = res.pending;
    lastProgress = {
      sentCount: res.sentCount,
      failedCount: res.failedCount,
      pending: res.pending,
    };

    if (res.processedCount === 0) {
      break;
    }

    if (pending) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  return lastProgress;
}
