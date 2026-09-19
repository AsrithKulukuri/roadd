import { NextResponse, after } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/server-auth-guard";
import {
  processCampaignBatch,
  runCampaignToCompletion,
  getBroadcastIntervalMs,
} from "@/lib/whatsapp/campaign-runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const processSchema = z.object({
  campaignId: z.string().uuid(),
  batchSize: z.number().int().min(1).max(50).optional(),
  auto: z.boolean().optional().default(true),
});

export async function POST(request: Request) {
  const { errorResponse } = await requireAdmin(request);
  if (errorResponse) return errorResponse;

  const parsed = processSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "A valid campaign identifier is required." },
      { status: 400 }
    );
  }

  const { campaignId, batchSize, auto } = parsed.data;

  try {
    const result = await processCampaignBatch(campaignId, { batchSize });

    // When auto is enabled and recipients remain, run server background task to complete all remaining sends
    if (result.pending && auto) {
      after(async () => {
        try {
          await runCampaignToCompletion(campaignId);
        } catch (bgErr) {
          console.error("[CAMPAIGN AUTO-BACKGROUND ERROR]", bgErr);
        }
      });
    }

    return NextResponse.json({
      success: true,
      processed: result.processedCount > 0,
      intervalMs: getBroadcastIntervalMs(),
      ...result,
    });
  } catch (error: unknown) {
    console.error("[CAMPAIGN PROCESS ROUTE ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Campaign processing failed.",
      },
      { status: 500 }
    );
  }
}
