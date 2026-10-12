import { NextResponse } from "next/server";
import crypto from "crypto";
import { getRazorpayConfig } from "@/lib/razorpay";

export async function POST(request: Request) {
  try {
    const { keySecret, isConfigured } = getRazorpayConfig();

    if (!isConfigured || !keySecret) {
      return NextResponse.json(
        { success: false, error: "Razorpay credentials not configured" },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const order_id = body.razorpay_order_id || body.order_id;
    const payment_id = body.razorpay_payment_id || body.payment_id;
    const signature = body.razorpay_signature || body.signature;

    // Validate required fields (return 400 if any are missing)
    if (!order_id || !payment_id || !signature) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: order_id, payment_id, signature",
        },
        { status: 400 }
      );
    }

    // Compute HMAC-SHA256 signature
    const text = `${order_id}|${payment_id}`;
    const generatedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(text)
      .digest("hex");

    // Timing-safe comparison to prevent timing attacks
    let isSignatureValid = false;
    try {
      const genBuf = Buffer.from(generatedSignature, "utf8");
      const sigBuf = Buffer.from(signature, "utf8");
      if (genBuf.length === sigBuf.length && crypto.timingSafeEqual(genBuf, sigBuf)) {
        isSignatureValid = true;
      }
    } catch {
      isSignatureValid = false;
    }

    if (!isSignatureValid) {
      return NextResponse.json(
        {
          success: false,
          verified: false,
          error: "Invalid signature: payment verification failed",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      verified: true,
      message: "Payment signature verified successfully",
      order_id,
      payment_id,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
