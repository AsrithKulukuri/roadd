import { NextResponse } from "next/server";
import { getPlatformBasePrice, savePlatformBasePrice } from "@/lib/pricing-service";
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
      { success: false, error: error.message || "Failed to fetch pricing" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const newPrice = Number(body.baseMonthlyPrice);

    if (!newPrice || isNaN(newPrice) || newPrice < 100) {
      return NextResponse.json(
        {
          success: false,
          error: "Base monthly price must be at least ₹100",
        },
        { status: 400 }
      );
    }

    const updated = await savePlatformBasePrice(newPrice);

    return NextResponse.json({
      success: true,
      message: `Monthly subscription price updated to ₹${updated.baseMonthlyPrice.toLocaleString("en-IN")}`,
      baseMonthlyPrice: updated.baseMonthlyPrice,
      plans: updated.plans,
      currency: "INR",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update pricing" },
      { status: 500 }
    );
  }
}
