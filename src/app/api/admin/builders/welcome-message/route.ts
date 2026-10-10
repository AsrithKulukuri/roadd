import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/server-auth-guard";
import { PortalError, portalError } from "@/lib/builder-access";
import { decodeSubscriptionPayload } from "@/lib/builder-subscription";
import { sendBuilderWelcomeWhatsApp } from "@/lib/whatsapp/builder-notifications";

export async function POST(request: Request) {
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
    if (!phone) throw new PortalError("Builder does not have a contact phone/WhatsApp number configured.");

    const decoded = decodeSubscriptionPayload(builder.login_credentials_hint);
    const planMonths = decoded.subscription?.planMonths || 1;

    const result = await sendBuilderWelcomeWhatsApp({
      builderId: builder.id,
      companyName: builder.company_name,
      contactEmail: builder.contact_email,
      phone,
      planMonths,
      initialPassword: decoded.credentialsHint || decoded.password,
    });

    return NextResponse.json({
      success: true,
      message: `Warm welcome message dispatched to ${builder.company_name} (${phone})`,
      result,
    });
  } catch (error) {
    return portalError(error);
  }
}
