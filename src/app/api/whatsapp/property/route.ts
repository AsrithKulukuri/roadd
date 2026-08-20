import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fromSupabaseProperty } from "@/stores/properties-store";
import { fromSupabaseProject } from "@/stores/projects-store";
import { formatPriceCompact, formatINR } from "@/lib/utils";
import { getRefId } from "@/lib/ref-id";

function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return createClient(url, key);
}

/**
 * Mode 2: WhatsApp Business Cloud API Route
 * Sends pre-approved dynamic property template or custom WhatsApp Business message.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { propertyId, projectId, recipientPhone, mode = "template" } = body;

    if (!recipientPhone || typeof recipientPhone !== "string" || !recipientPhone.trim()) {
      return NextResponse.json(
        { success: false, error: "Recipient phone number is required" },
        { status: 400 }
      );
    }

    const cleanPhone = recipientPhone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      return NextResponse.json(
        { success: false, error: "Invalid phone number format. Please provide a valid 10+ digit number." },
        { status: 400 }
      );
    }

    const targetPhone = cleanPhone.startsWith("91") && cleanPhone.length === 12 
      ? cleanPhone 
      : cleanPhone.length === 10 
        ? `91${cleanPhone}` 
        : cleanPhone;

    const supabase = getSupabaseAdminClient();
    let item: any = null;
    let isProject = false;

    // Fetch authoritative data from database (never trust client payload directly)
    if (propertyId) {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .or(`id.eq.${propertyId},slug.eq.${propertyId}`)
        .single();

      if (!error && data) {
        item = fromSupabaseProperty(data);
      }
    } else if (projectId) {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .or(`id.eq.${projectId},slug.eq.${projectId}`)
        .single();

      if (!error && data) {
        item = fromSupabaseProject(data);
        isProject = true;
      }
    }

    if (!item) {
      return NextResponse.json(
        { success: false, error: "Property or project not found in database" },
        { status: 404 }
      );
    }

    // Resolve details
    const refId = getRefId(item);
    const title = item.title || item.name || "Real Estate Listing";
    const slug = item.slug || item.id;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://roadd-three.vercel.app";
    const propertyPath = isProject ? `projects/${slug}` : `properties/${slug}`;
    const propertyUrl = `${siteUrl}/${propertyPath}?utm_source=whatsapp&utm_medium=business_api&ref=${refId}`;

    // Price
    let priceFormatted = "Price on Request";
    if (typeof item.price === "number" && item.price > 0) {
      priceFormatted = formatPriceCompact(item.price);
    } else if (item.configurations?.[0]?.priceMin) {
      priceFormatted = formatPriceCompact(item.configurations[0].priceMin);
    }

    const location = `${item.location?.locality || ""}, ${item.location?.city || "AP"}`;
    const specs = [
      item.bedrooms ? `${item.bedrooms} BHK` : null,
      item.area ? `${item.area} sq.ft` : null,
      item.propertyType || item.projectType || null,
    ].filter(Boolean).join(" • ") || "Ready to view";

    // Primary image for header
    let imageUrl = item.coverImage || item.images?.[0]?.url || "";
    if (imageUrl && !imageUrl.startsWith("http")) {
      imageUrl = `${siteUrl}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
    }

    // WhatsApp Cloud API Credentials
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const templateName = process.env.WHATSAPP_PROPERTY_TEMPLATE_NAME || "road_property_card_v1";
    const apiVersion = process.env.WHATSAPP_API_VERSION || "v21.0";

    // If Cloud API is configured with live Meta credentials
    if (accessToken && phoneNumberId) {
      const endpoint = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

      let payload: any = {};

      if (mode === "template") {
        payload = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: targetPhone,
          type: "template",
          template: {
            name: templateName,
            language: { code: "en" },
            components: [
              ...(imageUrl ? [
                {
                  type: "header",
                  parameters: [
                    {
                      type: "image",
                      image: { link: imageUrl },
                    },
                  ],
                }
              ] : []),
              {
                type: "body",
                parameters: [
                  { type: "text", text: title },
                  { type: "text", text: location },
                  { type: "text", text: priceFormatted },
                  { type: "text", text: specs },
                  { type: "text", text: refId },
                ],
              },
              {
                type: "button",
                sub_type: "url",
                index: "0",
                parameters: [
                  {
                    type: "text",
                    text: propertyPath, // Dynamic URL suffix {{1}}
                  },
                ],
              },
            ],
          },
        };
      } else {
        // Text fallback message via Business API
        const textMessage = `🏠 *${title}*\n🆔 *Ref:* ${refId}\n📍 *Location:* ${location}\n💰 *Price:* ${priceFormatted}\n📐 *Specs:* ${specs}\n\n✨ View verified details on ROAD:\n${propertyUrl}`;
        payload = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: targetPhone,
          type: "text",
          text: { body: textMessage },
        };
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("[WhatsApp Cloud API Error]:", data);
        const errMsg = data.error?.message || "Failed to send WhatsApp message via Meta Cloud API";
        return NextResponse.json({ success: false, error: errMsg }, { status: res.status });
      }

      return NextResponse.json({
        success: true,
        messageId: data.messages?.[0]?.id,
        recipient: targetPhone,
        propertyTitle: title,
        refId,
      });
    }

    // Graceful response when credentials are not yet set in environment (Dev/Sandbox Mode)
    return NextResponse.json({
      success: true,
      mode: "simulated",
      message: "WhatsApp Business API payload compiled successfully (Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in production).",
      preview: {
        to: targetPhone,
        title,
        refId,
        price: priceFormatted,
        location,
        url: propertyUrl,
        imageUrl,
      },
    });
  } catch (error: any) {
    console.error("[WhatsApp API Handler Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
