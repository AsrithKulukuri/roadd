import { NextResponse } from "next/server";
import { portalAccess, PortalError, portalError } from "@/lib/builder-access";
import { 
  DAYS_PER_MONTH, 
  decodeSubscriptionPayload, 
  calculateSubscriptionPlans 
} from "@/lib/builder-subscription";
import { getPlatformBasePrice } from "@/lib/pricing-service";
import { createRazorpayOrder, getRazorpayConfig } from "@/lib/razorpay";

export async function POST(request: Request) {
  try {
    const access = await portalAccess(request);
    if (!access.builder) throw new PortalError("Builder authentication required.", 401);

    const body = await request.json();
    const months = Number(body.months) || 1;

    // Check if this specific builder has a custom rate set by admin, otherwise use global platform rate
    const decoded = decodeSubscriptionPayload(access.builder.login_credentials_hint);
    const builderCustomRate = Number(decoded.subscription?.pricePerMonth);
    const platformRate = await getPlatformBasePrice();
    const effectiveMonthlyRate = builderCustomRate > 0 ? builderCustomRate : platformRate;

    // Calculate dynamically customized plans based on effective rate
    const dynamicPlans = calculateSubscriptionPlans(effectiveMonthlyRate);
    const matchedPlan = dynamicPlans.find(p => p.months === months);
    const amount = matchedPlan ? matchedPlan.finalPrice : months * effectiveMonthlyRate;
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
        ratePerMonth: String(effectiveMonthlyRate),
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
        ratePerMonth: effectiveMonthlyRate,
      },
      razorpayKeyId: keyId || "rzp_test_road_partner",
      isSimulation: order.isSimulated || !isConfigured,
    });
  } catch (error) {
    return portalError(error);
  }
}
