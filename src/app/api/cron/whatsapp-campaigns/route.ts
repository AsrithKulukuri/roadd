import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { processCampaignBatch } from "@/lib/whatsapp/campaign-runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cron Job / Scheduled Worker:
 * Sweeps all active WhatsApp campaigns in "queued" or "sending" status
 * and pushes pending recipients forward automatically.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(5, Math.max(1, Number(searchParams.get("limit") || 3)));

    const { data: activeCampaigns, error } = await supabaseAdmin
      .from("whatsapp_campaigns")
      .select("id, name, status, recipient_count, sent_count")
      .in("status", ["queued", "sending"])
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) throw error;

    if (!activeCampaigns || activeCampaigns.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No active campaigns queued for dispatch.",
        activeCampaignCount: 0,
      });
    }

    const results = [];
    for (const campaign of activeCampaigns) {
      try {
        const batchResult = await processCampaignBatch(campaign.id, {
          batchSize: 20,
          maxDurationMs: 15000,
        });
        results.push({
          campaignId: campaign.id,
          name: campaign.name,
          ...batchResult,
        });
      } catch (cErr) {
        console.error(`[CRON CAMPAIGN ${campaign.id} ERROR]`, cErr);
        results.push({
          campaignId: campaign.id,
          name: campaign.name,
          error: cErr instanceof Error ? cErr.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      activeCampaignCount: activeCampaigns.length,
      results,
    });
  } catch (err: unknown) {
    console.error("[CRON WHATSAPP CAMPAIGNS ERROR]", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Cron processing failed." },
      { status: 500 }
    );
  }
}
