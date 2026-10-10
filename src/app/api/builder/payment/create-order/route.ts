import { NextResponse } from "next/server";
import { portalAccess, PortalError, portalError } from "@/lib/builder-access";
import { SUBSCRIPTION_PLANS, BASE_MONTHLY_PRICE, DAYS_PER_MONTH } from "@/lib/builder-subscription";
import { createRazorpayOrder, getRazorpayConfig } from "@/lib/razorpay";

export async function POST(request: Request) {
  try {
    const access = await portalAccess(request);
    if (!access.builder) throw new PortalError("Builder authentication required.", 401);

    const body = await request.json();
    const months = Number(body.months) || 1;

    // Find predefined plan or calculate
    const matchedPlan = SUBSCRIPTION_PLANS.find(p => p.months === months);
    const amount = matchedPlan ? matchedPlan.finalPrice : months * BASE_MONTHLY_PRICE;
    const days = months * DAYS_PER_MONTH;

    const receipt = `rcpt_${access.builder.id.slice(0, 8)}_${Date.now().toString().slice(-6)}`;

    const order = await createRazorpayOrder({
      amount,
      receipt,
      notes: {
        builderId: access.builder.id,
        builderName: access.builder.company_name,
        months: String(months),
        days: String(days),
      },
    });

    const { keyId, isConfigured } = getRazorpayConfig();

    return NextResponse.json({
      success: true,
      order,
      plan: {
        months,
        days,
        amount,
        ratePerMonth: BASE_MONTHLY_PRICE,
      },
      razorpayKeyId: keyId || "rzp_test_road_partner",
      isSimulation: order.isSimulated || !isConfigured,
    });
  } catch (error) {
    return portalError(error);
  }
}
