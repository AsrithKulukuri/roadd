import { NextResponse } from "next/server";
import { getPlatformBasePrice } from "@/lib/pricing-service";
import { calculateSubscriptionPlans } from "@/lib/builder-subscription";

export async function GET() {
  try {
    const baseMonthlyPrice = await getPlatformBasePrice();
    const plans = calculateSubscriptionPlans(baseMonthlyPrice);

    return NextResponse.json({
      success: true,
      baseMonthlyPrice,
      plans,
      currency: "INR",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load pricing" },
      { status: 500 }
    );
  }
}
