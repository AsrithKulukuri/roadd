import { NextResponse } from "next/server";
import { getRazorpayConfig } from "@/lib/razorpay";

export async function POST(request: Request) {
  try {
    const { keyId, keySecret, isConfigured } = getRazorpayConfig();

    if (!isConfigured || !keyId || !keySecret) {
      return NextResponse.json(
        { success: false, error: "Razorpay credentials not configured" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const amount = Number(body.amount); // in paise
    const currency = body.currency || "INR";
    const receipt = body.receipt || `receipt_${Date.now()}`;
    const notes = body.notes || {};

    if (!amount || isNaN(amount) || amount < 100) {
      return NextResponse.json(
        { success: false, error: "Amount must be at least 100 paise (₹1.00)" },
        { status: 400 }
      );
    }

    const basicAuth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Math.round(amount),
        currency,
        receipt,
        notes,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const statusCode = response.status === 401 ? 401 : 500;
      return NextResponse.json(
        {
          success: false,
          error: data.error?.description || data.error?.message || "Failed to create Razorpay order",
        },
        { status: statusCode }
      );
    }

    return NextResponse.json({
      success: true,
      order_id: data.id,
      amount: data.amount,
      currency: data.currency,
      key_id: keyId,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
