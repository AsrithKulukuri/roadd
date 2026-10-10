import { NextResponse } from "next/server";
import { portalAccess, PortalError, portalError, camelRow } from "@/lib/builder-access";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { 
  SUBSCRIPTION_PLANS, 
  BASE_MONTHLY_PRICE, 
  DAYS_PER_MONTH, 
  decodeSubscriptionPayload, 
  encodeSubscriptionPayload, 
  calculateSubscriptionDetails,
  generateTaxInvoice 
} from "@/lib/builder-subscription";
import { verifyRazorpayPaymentSignature } from "@/lib/razorpay";
import { sendBuilderPaymentSuccessWhatsApp } from "@/lib/whatsapp/builder-notifications";

export async function POST(request: Request) {
  try {
    const access = await portalAccess(request);
    if (!access.builder) throw new PortalError("Builder authentication required.", 401);

    const body = await request.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, months } = body;

    if (!razorpay_order_id || !razorpay_payment_id) {
      throw new PortalError("Invalid payment verification details.");
    }

    const isValidSignature = verifyRazorpayPaymentSignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature || "",
    });

    if (!isValidSignature) {
      throw new PortalError("Payment signature verification failed.", 400);
    }

    const planMonths = Number(months) || 1;
    const matchedPlan = SUBSCRIPTION_PLANS.find(p => p.months === planMonths);
    const amount = matchedPlan ? matchedPlan.finalPrice : planMonths * BASE_MONTHLY_PRICE;
    const daysToAdd = planMonths * DAYS_PER_MONTH;

    // Load existing builder subscription
    const { data: currentRecord, error: fetchErr } = await supabaseAdmin
      .from("builder_profiles")
      .select("*")
      .eq("id", access.builder.id)
      .single();

    if (fetchErr || !currentRecord) throw new PortalError("Could not retrieve builder record.");

    const decoded = decodeSubscriptionPayload(currentRecord.login_credentials_hint);
    const existingSub = calculateSubscriptionDetails(decoded.subscription, currentRecord.created_at);

    const now = Date.now();
    const currentEndMs = new Date(existingSub.endDate).getTime();
    
    // Only extend from existing end date if the builder already had a verified prior payment AND it's still active.
    // If this is the builder's first payment (activating the initial provisioned portal), validity starts from today for exact daysToAdd.
    const isExtension = Boolean(existingSub.lastPaymentId && currentEndMs > now);
    const baseMs = isExtension ? currentEndMs : now;
    const newEndMs = baseMs + daysToAdd * 24 * 60 * 60 * 1000;
    const newEndDate = new Date(newEndMs).toISOString();
    const newStartDate = isExtension ? existingSub.startDate : new Date().toISOString();

    const invoiceNumber = `ROAD-INV-${new Date().getFullYear()}-${razorpay_payment_id.slice(-6).toUpperCase()}`;

    const updatedSub = {
      ...decoded.subscription,
      status: "active" as const,
      planMonths,
      pricePerMonth: BASE_MONTHLY_PRICE,
      startDate: newStartDate,
      endDate: newEndDate,
      lastPaymentId: razorpay_payment_id,
      lastPaymentOrderId: razorpay_order_id,
      lastPaymentAmount: amount,
      lastPaymentDate: new Date().toISOString(),
      invoiceNumber,
      whatsappRemindedAt: undefined, // Reset reminder flag on renewal
    };

    const newPayloadHint = encodeSubscriptionPayload({
      subscription: updatedSub,
      credentialsHint: decoded.credentialsHint,
      password: decoded.password,
    });

    const { data: updatedBuilder, error: updateErr } = await supabaseAdmin
      .from("builder_profiles")
      .update({
        login_credentials_hint: newPayloadHint,
        updated_at: new Date().toISOString(),
      })
      .eq("id", access.builder.id)
      .select("*")
      .single();

    if (updateErr) throw updateErr;

    // Record activity audit log
    try {
      await supabaseAdmin.from("builder_activity_logs").insert({
        builder_id: access.builder.id,
        builder_name: access.builder.company_name,
        action_type: "payment_completed",
        details: {
          amount,
          planMonths,
          daysAdded: daysToAdd,
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
          newEndDate,
          invoiceNumber,
          paidAt: new Date().toISOString(),
        },
      });
    } catch {
      // non-fatal
    }

    // Send instant WhatsApp receipt
    const phone = access.builder.whatsapp_number || access.builder.contact_phone;
    if (phone) {
      sendBuilderPaymentSuccessWhatsApp({
        builderId: access.builder.id,
        companyName: access.builder.company_name,
        phone,
        amount,
        paymentId: razorpay_payment_id,
        planMonths,
        newExpiryDate: newEndDate,
      }).catch(err => {
        console.error("WhatsApp payment confirmation send error (non-fatal):", err);
      });
    }

    const invoice = generateTaxInvoice({
      companyName: access.builder.company_name,
      contactEmail: access.builder.contact_email,
      contactPhone: access.builder.contact_phone,
      officeAddress: access.builder.office_address,
      reraNumber: access.builder.rera_number,
    }, {
      amount,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      planMonths,
      date: new Date().toISOString(),
      invoiceNumber,
    });

    return NextResponse.json({
      success: true,
      message: `Subscription successfully renewed for ${planMonths} month(s)!`,
      builder: camelRow(updatedBuilder),
      invoice,
    });
  } catch (error) {
    return portalError(error);
  }
}
