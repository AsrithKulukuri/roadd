import { supabaseAdmin } from "@/lib/supabase-admin";
import { BASE_MONTHLY_PRICE, calculateSubscriptionPlans, SubscriptionPlan } from "@/lib/builder-subscription";

let cachedPrice: { value: number; timestamp: number } | null = null;

/**
 * Retrieves the current platform base monthly price.
 * Reads from Supabase (homepage_layouts table 'subscription_pricing' key) with in-memory caching.
 * Falls back to BASE_MONTHLY_PRICE (3600).
 */
export async function getPlatformBasePrice(): Promise<number> {
  if (cachedPrice && Date.now() - cachedPrice.timestamp < 30000) {
    return cachedPrice.value;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("homepage_layouts")
      .select("sections")
      .eq("id", "subscription_pricing")
      .single();

    if (!error && data?.sections && typeof data.sections === "object") {
      const price = Number((data.sections as any).baseMonthlyPrice);
      if (price > 0) {
        cachedPrice = { value: price, timestamp: Date.now() };
        return price;
      }
    }
  } catch (err) {
    console.warn("Failed to fetch subscription pricing from Supabase:", err);
  }

  return BASE_MONTHLY_PRICE;
}

/**
 * Updates the platform base monthly price in Supabase.
 */
export async function savePlatformBasePrice(price: number): Promise<{
  baseMonthlyPrice: number;
  plans: SubscriptionPlan[];
}> {
  const sanitized = Math.max(100, Math.round(Number(price) || BASE_MONTHLY_PRICE));

  const { error } = await supabaseAdmin
    .from("homepage_layouts")
    .upsert({
      id: "subscription_pricing",
      sections: {
        baseMonthlyPrice: sanitized,
        updatedAt: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    });

  if (error) {
    throw new Error(`Database update failed: ${error.message}`);
  }

  cachedPrice = { value: sanitized, timestamp: Date.now() };

  return {
    baseMonthlyPrice: sanitized,
    plans: calculateSubscriptionPlans(sanitized),
  };
}
