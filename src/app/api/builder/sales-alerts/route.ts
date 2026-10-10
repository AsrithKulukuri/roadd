import { NextResponse } from "next/server";
import { portalAccess, PortalError, portalError } from "@/lib/builder-access";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendBuilderLeadAlertWhatsApp } from "@/lib/whatsapp/builder-notifications";

export async function GET(request: Request) {
  try {
    const access = await portalAccess(request);
    if (!access.builder) throw new PortalError("Builder authentication required.", 401);

    // Fetch lead alert logs for this builder
    const { data: logs } = await supabaseAdmin
      .from("builder_activity_logs")
      .select("*")
      .eq("builder_id", access.builder.id)
      .eq("action_type", "lead_alert_dispatched")
      .order("created_at", { ascending: false })
      .limit(20);

    return NextResponse.json({
      success: true,
      salesPhone: access.builder.whatsappNumber || access.builder.contactPhone,
      alerts: logs || [],
    });
  } catch (error) {
    return portalError(error);
  }
}

export async function POST(request: Request) {
  try {
    const access = await portalAccess(request);
    if (!access.builder) throw new PortalError("Builder authentication required.", 401);

    const body = await request.json();
    const { testSalesPhone, buyerName, buyerPhone, projectName, unitInterest, preferredTime, inquiryType } = body;

    const phoneToAlert = testSalesPhone || access.builder.whatsappNumber || access.builder.contactPhone;

    if (!phoneToAlert) {
      throw new PortalError("No sales phone number configured for alert dispatch.", 400);
    }

    const result = await sendBuilderLeadAlertWhatsApp({
      builderId: access.builder.id,
      builderName: access.builder.companyName,
      salesPhone: phoneToAlert,
      buyerName: buyerName || "Ramesh V. (Verified Buyer)",
      buyerPhone: buyerPhone || "+91 98480 22338",
      projectName: projectName || "Serene Grande Luxury Residences",
      unitInterest: unitInterest || "3 BHK East Facing (1,850 sq.ft)",
      preferredTime: preferredTime || "Today, 4:30 PM",
      inquiryType: inquiryType || "Site Visit Inbound",
    });

    return NextResponse.json({
      success: true,
      message: "Lead alert dispatched to builder sales desk on WhatsApp!",
      sendResult: result,
    });
  } catch (error) {
    return portalError(error);
  }
}
