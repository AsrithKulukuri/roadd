import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/server-auth-guard";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  isTrustedCustomMediaUrl,
  readImageUrl,
  toPublicMediaUrl,
  withWhatsAppOptOut,
} from "@/lib/whatsapp-audience";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createCampaignSchema = z.object({
  name: z.string().trim().min(3).max(120),
  message: z.string().trim().min(5).max(3500),
  contentType: z.enum(["custom", "property", "project", "banner"]),
  contentId: z.string().trim().max(160).optional(),
  customMediaUrl: z.string().trim().max(2048).optional(),
  selectedContactIds: z.array(z.string().uuid()).max(2000).default([]),
  selectAllEligible: z.boolean().default(false),
});

type LooseRecord = Record<string, unknown>;

async function resolveCampaignMedia(
  contentType: "custom" | "property" | "project" | "banner",
  contentId?: string,
  customMediaUrl?: string
): Promise<{ mediaUrl: string; contentUrl: string }> {
  if (contentType === "custom") {
    if (!customMediaUrl) return { mediaUrl: "", contentUrl: "" };
    if (!isTrustedCustomMediaUrl(customMediaUrl)) {
      throw new Error("Custom media must be an HTTPS image uploaded to ROAD storage.");
    }
    return { mediaUrl: customMediaUrl, contentUrl: "" };
  }

  if (!contentId) throw new Error("Select content to attach to this campaign.");
  const table = contentType === "property" ? "properties" : contentType === "project" ? "projects" : "banners";
  const { data, error } = await supabaseAdmin.from(table).select("*").eq("id", contentId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("The selected property, project, or banner no longer exists.");
  const item = data as LooseRecord;
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  const slug = typeof item.slug === "string" ? item.slug : "";
  const bannerLink = typeof item.link_url === "string" ? item.link_url : "";
  const contentUrl =
    contentType === "banner"
      ? toPublicMediaUrl(bannerLink)
      : siteUrl && slug
      ? `${siteUrl}/${contentType === "property" ? "properties" : "projects"}/${slug}`
      : "";
  return { mediaUrl: toPublicMediaUrl(readImageUrl(item)), contentUrl };
}

export async function GET(request: Request) {
  const { errorResponse } = await requireAdmin(request);
  if (errorResponse) return errorResponse;

  const { data, error } = await supabaseAdmin
    .from("whatsapp_campaigns")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true, campaigns: data || [] });
}

export async function POST(request: Request) {
  const { errorResponse, user } = await requireAdmin(request);
  if (errorResponse) return errorResponse;

  const parsed = createCampaignSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message || "Invalid campaign details." },
      { status: 400 }
    );
  }

  const input = parsed.data;
  if (!input.selectAllEligible && input.selectedContactIds.length === 0) {
    return NextResponse.json({ success: false, error: "Select at least one opted-in contact." }, { status: 400 });
  }

  try {
    let contactsQuery = supabaseAdmin
      .from("whatsapp_contacts")
      .select("id, name, phone")
      .eq("is_subscribed", true)
      .is("opted_out_at", null)
      .limit(2000);
    if (!input.selectAllEligible) contactsQuery = contactsQuery.in("id", input.selectedContactIds);
    const { data: contacts, error: contactsError } = await contactsQuery;
    if (contactsError) throw contactsError;
    if (!contacts?.length) throw new Error("No eligible opted-in contacts were found.");

    const resolvedContent = await resolveCampaignMedia(input.contentType, input.contentId, input.customMediaUrl);
    const messageWithLink =
      resolvedContent.contentUrl && !input.message.includes(resolvedContent.contentUrl)
        ? `${input.message}\n\nView details: ${resolvedContent.contentUrl}`
        : input.message;
    const message = withWhatsAppOptOut(messageWithLink).slice(0, 4000);
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from("whatsapp_campaigns")
      .insert({
        name: input.name,
        message,
        media_url: resolvedContent.mediaUrl || null,
        media_kind: resolvedContent.mediaUrl ? "image" : "none",
        content_type: input.contentType,
        content_id: input.contentId || null,
        status: "queued",
        recipient_count: contacts.length,
        created_by: user!.id,
      })
      .select("id, recipient_count")
      .single();
    if (campaignError) throw campaignError;

    const recipients = contacts.map((contact) => ({
      campaign_id: campaign.id,
      contact_id: contact.id,
      name: contact.name,
      phone: contact.phone,
      status: "queued",
    }));
    const { error: recipientsError } = await supabaseAdmin
      .from("whatsapp_campaign_recipients")
      .insert(recipients);
    if (recipientsError) {
      await supabaseAdmin.from("whatsapp_campaigns").delete().eq("id", campaign.id);
      throw recipientsError;
    }

    return NextResponse.json({ success: true, campaignId: campaign.id, recipientCount: contacts.length });
  } catch (error: unknown) {
    console.error("[WHATSAPP CAMPAIGN CREATE ERROR]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Campaign could not be created." },
      { status: 500 }
    );
  }
}
