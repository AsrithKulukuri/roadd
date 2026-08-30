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

    const viewerName = (viewer.name || "").trim();
    const viewerPhone = (viewer.phone || "").trim();
    const viewerEmail = (viewer.email || "").trim() || "Not provided";

    if (!viewerName || !viewerPhone) {
      return NextResponse.json(
        { success: false, reason: "Viewer name and phone are required" },
        { status: 200 }
      );
    }

    // 2. Resolve project information
    let resolvedName = projectName || "ROAD Project";
    let resolvedRef = projectRefId || "";
    let resolvedSlug = projectSlug || "";
    let resolvedBuilderPhone = builderWhatsapp || builderPhone || "";

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
            dbProject.builder_whatsapp ||
            dbProject.builderWhatsapp ||
            dbProject.builder_phone ||
            dbProject.builderPhone ||
            resolvedBuilderPhone;
        }
      } catch (dbErr) {
        console.warn("[PROJECT VIEW NOTIFICATION] Could not fetch project from DB:", dbErr);
      }
    }

    if (!resolvedRef) {
      resolvedRef = `PRJ-${String(projectId || resolvedSlug || "ROAD").slice(0, 6).toUpperCase()}`;
    }

    // 3. Resolve recipient phone number
    const cleanRecipientPhone = formatWhatsAppPhone(resolvedBuilderPhone);
    if (!cleanRecipientPhone || cleanRecipientPhone.length < 10) {
      console.log(`[PROJECT VIEW NOTIFICATION] Skipped: No valid builder contact for ${resolvedName}`);
      return NextResponse.json(
        { success: false, reason: "No valid builder phone/WhatsApp found for this project" },
        { status: 200 }
      );
    }

    // 4. Construct project URL
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://roadd-three.vercel.app";
    const projectUrl = `${siteUrl}/projects/${resolvedSlug || projectId}`;

    // 5. Format formatted timestamp (IST)
    const now = new Date();
    const formattedDate = now.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "medium",
      timeStyle: "short",
    });

    // 6. Build concise WhatsApp message
    const message = [
      `*New project view on ROAD FACING*`,
      ``,
      `*Project:* ${resolvedName}`,
      `*Ref:* ${resolvedRef}`,
      `*Viewer:* ${viewerName}`,
      `*Phone:* ${viewerPhone}`,
      `*Email:* ${viewerEmail}`,
      `*Viewed at:* ${formattedDate} IST`,
      ``,
      `This user viewed your project details and may be interested.`,
      ``,
      `*Project link:* ${projectUrl}`,
    ].join("\n");

    // 7. Dispatch via Wasender
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
