import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/server-auth-guard";
import { camelRow, PortalError, portalError } from "@/lib/builder-access";
import { decodeSubscriptionPayload, encodeSubscriptionPayload, calculateSubscriptionDetails, BASE_MONTHLY_PRICE } from "@/lib/builder-subscription";
import { getPlatformBasePrice } from "@/lib/pricing-service";
import { sendBuilderExpiryWarningWhatsApp } from "@/lib/whatsapp/builder-notifications";

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { data: builders, error } = await supabaseAdmin
      .from("builder_profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const mapped = (builders || []).map(camelRow);
    const total = mapped.length;
    const active = mapped.filter(b => b.subscription?.status === "active").length;
    const expiringSoon = mapped.filter(b => b.subscription?.status === "expiring_soon").length;
    const expired = mapped.filter(b => b.subscription?.status === "expired" || b.subscription?.status === "pending_payment").length;
    const currentRate = await getPlatformBasePrice();

    return NextResponse.json({
      success: true,
      stats: { total, active, expiringSoon, expired, ratePerMonth: currentRate },
      builders: mapped,
    });
  } catch (error) {
    return portalError(error);
  }
}

// POST: Admin manually extends subscription or adjusts validity
export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await request.json();
    const { builderId, days = 30, status = "active", notes } = body;
    if (!builderId) throw new PortalError("Builder ID is required.");

    const { data: builder, error } = await supabaseAdmin
      .from("builder_profiles")
      .select("*")
      .eq("id", builderId)
      .single();

    if (error || !builder) throw new PortalError("Builder not found.");

    const decoded = decodeSubscriptionPayload(builder.login_credentials_hint);
    const existingSub = calculateSubscriptionDetails(decoded.subscription, builder.created_at);

    // Calculate new end date (if already expired, add from today; if still active, add to existing end date)
    const baseMs = existingSub.status === "expired" ? Date.now() : new Date(existingSub.endDate).getTime();
    const newEndMs = baseMs + Number(days) * 24 * 60 * 60 * 1000;
    const newEndDate = new Date(newEndMs).toISOString();

    const updatedSub = {
      ...decoded.subscription,
      status: status as any,
      endDate: newEndDate,
      lastPaymentDate: new Date().toISOString(),
    };

    const newHint = encodeSubscriptionPayload({
      subscription: updatedSub,
      credentialsHint: decoded.credentialsHint,
      password: decoded.password,
    });

    const { data: updatedBuilder, error: updateErr } = await supabaseAdmin
      .from("builder_profiles")
      .update({
        login_credentials_hint: newHint,
        updated_at: new Date().toISOString(),
      })
      .eq("id", builderId)
      .select("*")
      .single();

    if (updateErr) throw updateErr;

    // Log admin activity
    try {
      await supabaseAdmin.from("builder_activity_logs").insert({
        builder_id: builder.id,
        builder_name: builder.company_name,
        action_type: "subscription_extended",
        details: {
          extendedDays: days,
          newEndDate,
          adminNotes: notes || "Manual extension by ROAD administration",
          extendedBy: auth.user?.email || "admin",
        },
      });
    } catch {
      // non-fatal
    }

    return NextResponse.json({
      success: true,
      message: `Subscription extended by ${days} days for ${builder.company_name}`,
      builder: camelRow(updatedBuilder),
    });
  } catch (error) {
    return portalError(error);
  }
}

// PATCH: Dispatch 7-Day Warning WhatsApp Message to this builder
export async function PATCH(request: Request) {
  const auth = await requireAdmin(request);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { builderId } = await request.json();
    if (!builderId) throw new PortalError("Builder ID is required.");

    const { data: builder, error } = await supabaseAdmin
      .from("builder_profiles")
      .select("*")
      .eq("id", builderId)
      .single();

    if (error || !builder) throw new PortalError("Builder not found.");

    const phone = builder.whatsapp_number || builder.contact_phone;
    if (!phone) throw new PortalError("Builder does not have a contact phone/WhatsApp number.");

    const decoded = decodeSubscriptionPayload(builder.login_credentials_hint);
    const sub = calculateSubscriptionDetails(decoded.subscription, builder.created_at);

    const result = await sendBuilderExpiryWarningWhatsApp({
      builderId: builder.id,
      companyName: builder.company_name,
      phone,
      daysRemaining: sub.daysRemaining,
      expiryDate: sub.endDate,
    });

    // Record reminded timestamp
    const updatedSub = {
      ...decoded.subscription,
      whatsappRemindedAt: new Date().toISOString(),
    };
    await supabaseAdmin
      .from("builder_profiles")
      .update({
        login_credentials_hint: encodeSubscriptionPayload({
          subscription: updatedSub,
          credentialsHint: decoded.credentialsHint,
          password: decoded.password,
        }),
      })
      .eq("id", builder.id);

    return NextResponse.json({
      success: true,
      message: `7-Day Expiry Warning sent to ${builder.company_name} (${phone})`,
      result,
    });
  } catch (error) {
    return portalError(error);
  }
}
