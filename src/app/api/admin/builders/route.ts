import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/server-auth-guard";
import { camelRow, PortalError, portalError } from "@/lib/builder-access";
import { encodeSubscriptionPayload, decodeSubscriptionPayload, calculateSubscriptionDetails, BASE_MONTHLY_PRICE } from "@/lib/builder-subscription";
import { getPlatformBasePrice } from "@/lib/pricing-service";
import { sendBuilderWelcomeWhatsApp } from "@/lib/whatsapp/builder-notifications";

const fields = [
  "companyName", "slug", "logoUrl", "bannerUrl", "description", "tagline", 
  "reraNumber", "crdaApproved", "contactEmail", "contactPhone", "whatsappNumber", 
  "officeAddress", "experienceYears", "tier", "isVerified", "assignedProjectIds", 
  "assignedPropertyIds", "chatEnabled", "promotedAtTop", "bannerActive", "userId"
];

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const { data, error } = await supabaseAdmin
      .from("builder_profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ success: true, builders: data.map(camelRow) });
  } catch (error) {
    return portalError(error);
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await request.json();
    if (!body.companyName?.trim()) throw new PortalError("Company name is required.");

    const payload: Record<string, unknown> = {};
    for (const key of fields) {
      if (body[key] !== undefined) {
        payload[key.replace(/[A-Z]/g, c => "_" + c.toLowerCase())] = body[key];
      }
    }
    payload.updated_at = new Date().toISOString();

    const isNew = !body.id || body.id.startsWith("bld-");
    let existingProfile: Record<string, any> | null = null;

    if (body.id) {
      const { data: existing } = await supabaseAdmin
        .from("builder_profiles")
        .select("*")
        .eq("id", body.id)
        .maybeSingle();
      existingProfile = existing;
    }

    if (isNew) {
      payload.id = existingProfile?.id || crypto.randomUUID();
    } else {
      payload.id = body.id;
    }

    if (!body.slug) {
      payload.slug = body.companyName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    }

    // Handle Subscription & Credentials Payload
    const decodedExisting = decodeSubscriptionPayload(existingProfile?.login_credentials_hint);
    const planMonths = Number(body.planMonths) || decodedExisting.subscription?.planMonths || 1;
    const now = new Date();
    const startDate = body.subscriptionStartDate || decodedExisting.subscription?.startDate || now.toISOString();
    const endDateMs = new Date(startDate).getTime() + (planMonths * 30 * 24 * 60 * 60 * 1000);
    const endDate = body.subscriptionEndDate || decodedExisting.subscription?.endDate || new Date(endDateMs).toISOString();

    const platformRate = await getPlatformBasePrice();
    const effectivePricePerMonth = Number(body.pricePerMonth) > 0 
      ? Number(body.pricePerMonth) 
      : (Number(decodedExisting.subscription?.pricePerMonth) > 0 ? Number(decodedExisting.subscription?.pricePerMonth) : platformRate);

    const subData = {
      status: body.subscriptionStatus || decodedExisting.subscription?.status || "active",
      planMonths,
      pricePerMonth: effectivePricePerMonth,
      startDate,
      endDate,
      lastPaymentAmount: body.lastPaymentAmount ?? decodedExisting.subscription?.lastPaymentAmount,
      lastPaymentId: body.lastPaymentId ?? decodedExisting.subscription?.lastPaymentId,
      lastPaymentDate: body.lastPaymentDate ?? decodedExisting.subscription?.lastPaymentDate,
      whatsappRemindedAt: decodedExisting.subscription?.whatsappRemindedAt,
    };

    payload.login_credentials_hint = encodeSubscriptionPayload({
      subscription: subData,
      credentialsHint: body.loginCredentialsHint ?? decodedExisting.credentialsHint,
      password: body.initialPassword ?? decodedExisting.password,
    });

    const { data, error } = await supabaseAdmin
      .from("builder_profiles")
      .upsert(payload)
      .select("*")
      .single();

    if (error) throw error;

    // If it's a newly created builder and sendWelcomeWhatsApp is not explicitly false, dispatch warm welcome message!
    const shouldSendWelcome = (isNew || body.sendWelcomeWhatsApp === true) && body.sendWelcomeWhatsApp !== false;
    const phoneToMessage = body.whatsappNumber || body.contactPhone;

    if (shouldSendWelcome && phoneToMessage) {
      sendBuilderWelcomeWhatsApp({
        builderId: data.id,
        companyName: data.company_name,
        contactEmail: data.contact_email,
        phone: phoneToMessage,
        planMonths,
        initialPassword: body.initialPassword || body.loginCredentialsHint,
      }).catch(err => {
        console.error("Welcome WhatsApp dispatch error (non-fatal):", err);
      });
    }

    return NextResponse.json({ success: true, builder: camelRow(data) });
  } catch (error) {
    return portalError(error);
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin(request);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const url = new URL(request.url);
    const deleteAll = url.searchParams.get("all") === "true";

    if (deleteAll) {
      // Purge all builder portals as requested
      await supabaseAdmin.from("builder_messages").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabaseAdmin.from("builder_requests").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabaseAdmin.from("builder_activity_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabaseAdmin.from("builder_profiles").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      return NextResponse.json({ 
        success: true, 
        message: "All existing builder portals and related records have been deleted." 
      });
    }

    const id = url.searchParams.get("id");
    if (!id) throw new PortalError("Builder ID is required.");

    const { data, error } = await supabaseAdmin
      .from("builder_profiles")
      .delete()
      .eq("id", id)
      .select("id")
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, id: data.id });
  } catch (error) {
    return portalError(error);
  }
}
