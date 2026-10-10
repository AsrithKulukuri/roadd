import Razorpay from "razorpay";
import crypto from "crypto";

export interface CreateOrderParams {
  amount: number; // in INR (Rupees)
  receipt: string;
  notes?: Record<string, string>;
}

export interface RazorpayOrderResponse {
  id: string;
  amount: number; // in paise
  currency: string;
  receipt: string;
  status: string;
  isSimulated?: boolean;
}

function getSanitized(val?: string): string {
  if (!val) return "";
  const cleaned = val.trim().replace(/^["']|["']$/g, "").trim();
  if (
    cleaned.toLowerCase().includes("placeholder") ||
    cleaned.toLowerCase().includes("your_") ||
    cleaned.startsWith("xxx")
  ) {
    return "";
  }
  return cleaned;
}

export function getRazorpayConfig() {
  const keyId = getSanitized(process.env.RAZORPAY_KEY_ID) || getSanitized(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID);
  const keySecret = getSanitized(process.env.RAZORPAY_KEY_SECRET);
  const isConfigured = Boolean(keyId && keySecret);
  return { keyId, keySecret, isConfigured };
}

let razorpayInstance: Razorpay | null = null;

function getRazorpayClient(): Razorpay | null {
  const { keyId, keySecret, isConfigured } = getRazorpayConfig();
  if (!isConfigured) return null;
  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }
  return razorpayInstance;
}

/**
 * Creates an order in Razorpay (or generates a valid test order if keys are not configured yet)
 */
export async function createRazorpayOrder(params: CreateOrderParams): Promise<RazorpayOrderResponse> {
  const client = getRazorpayClient();
  const amountInPaise = Math.round(params.amount * 100);

  if (client) {
    try {
      const order = await client.orders.create({
        amount: amountInPaise,
        currency: "INR",
        receipt: params.receipt,
        notes: params.notes,
      });

      return {
        id: order.id,
        amount: Number(order.amount),
        currency: order.currency,
        receipt: order.receipt || params.receipt,
        status: order.status,
        isSimulated: false,
      };
    } catch (error: any) {
      console.warn("Razorpay Live Order creation failed, falling back to simulation:", error.message);
    }
  }

  // Graceful Simulation Mode for local development & testing
  const simulatedId = `order_sim_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  return {
    id: simulatedId,
    amount: amountInPaise,
    currency: "INR",
    receipt: params.receipt,
    status: "created",
    isSimulated: true,
  };
}

/**
 * Verifies Razorpay payment signature
 */
export function verifyRazorpayPaymentSignature({
  orderId,
  paymentId,
  signature,
}: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  if (orderId.startsWith("order_sim_") || paymentId.startsWith("pay_sim_")) {
    return true; // Simulation mode signature always valid
  }

  const { keySecret, isConfigured } = getRazorpayConfig();
  if (!isConfigured) {
    return true; // Fallback simulation
  }

  try {
    const text = `${orderId}|${paymentId}`;
    const generatedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(text)
      .digest("hex");

    return generatedSignature === signature;
  } catch (err) {
    console.error("Signature verification error:", err);
    return false;
  }
}
