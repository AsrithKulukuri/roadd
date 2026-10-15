"use client";

import { useState } from "react";
import Script from "next/script";

declare global {
  interface Window {
    Razorpay?: any;
  }
}

export interface RazorpayCheckoutButtonProps {
  amount: number; // in paise (e.g. 100 for ₹1, 50000 for ₹500)
  currency?: string;
  receipt?: string;
  name?: string;
  description?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  themeColor?: string;
  buttonText?: string;
  className?: string;
  disabled?: boolean;
  onSuccess?: (result: {
    payment_id: string;
    order_id: string;
    signature: string;
    verification: any;
  }) => void;
  onError?: (error: string) => void;
  onDismiss?: () => void;
}

export default function RazorpayCheckoutButton({
  amount,
  currency = "INR",
  receipt,
  name = "ROAD Platform",
  description = "Standard Razorpay Checkout Payment",
  prefill,
  notes,
  themeColor = "#faad13",
  buttonText = "Pay with Razorpay",
  className = "",
  disabled = false,
  onSuccess,
  onError,
  onDismiss,
}: RazorpayCheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCheckout = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      // 1. Ensure Razorpay Checkout script is loaded
      if (typeof window === "undefined" || !window.Razorpay) {
        // Wait briefly or dynamically load script if not yet ready
        await new Promise<void>((resolve, reject) => {
          if (window.Razorpay) return resolve();
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load Razorpay Checkout SDK"));
          document.body.appendChild(script);
        });
      }

      // 2. Call backend to create Razorpay Order
      const createOrderRes = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          currency,
          receipt: receipt || `rcpt_${Date.now()}`,
          notes,
        }),
      });

      const orderData = await createOrderRes.json();

      if (!createOrderRes.ok || !orderData.order_id) {
        const err = orderData.error || `Order creation failed (${createOrderRes.status})`;
        throw new Error(err);
      }

      const keyId =
        orderData.key_id ||
        process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
        "rzp_live_ToCbZ42PGyUhoQ";

      // 3. Configure Razorpay modal options
      const options: any = {
        key: keyId,
        amount: orderData.amount,
        currency: orderData.currency || currency,
        name: name,
        description: description,
        order_id: orderData.order_id,
        prefill: {
          name: prefill?.name || "",
          email: prefill?.email || "",
          contact: prefill?.contact || "",
        },
        theme: {
          color: themeColor,
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
            if (onDismiss) onDismiss();
          },
        },
        handler: async function (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) {
          try {
            // 4. Send payment credentials to backend verification endpoint
            const verifyRes = await fetch("/api/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();

            if (!verifyRes.ok || !verifyData.verified) {
              const verifyErr = verifyData.error || "Payment signature verification failed";
              throw new Error(verifyErr);
            }

            if (onSuccess) {
              onSuccess({
                payment_id: response.razorpay_payment_id,
                order_id: response.razorpay_order_id,
                signature: response.razorpay_signature,
                verification: verifyData,
              });
            }
          } catch (verifyError: any) {
            const msg = verifyError.message || "Payment verification failed";
            setErrorMessage(msg);
            if (onError) onError(msg);
          } finally {
            setLoading(false);
          }
        },
      };

      const razorpayInstance = new window.Razorpay(options);

      // Handle payment failure event
      razorpayInstance.on("payment.failed", function (resp: any) {
        setLoading(false);
        const failReason =
          resp.error?.description || resp.error?.reason || "Payment failed or declined";
        setErrorMessage(failReason);
        if (onError) onError(failReason);
      });

      // Open Razorpay standard checkout modal
      razorpayInstance.open();
    } catch (err: any) {
      setLoading(false);
      const msg = err.message || "Unable to initialize checkout";
      setErrorMessage(msg);
      if (onError) onError(msg);
    }
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />

      <button
        type="button"
        id="razorpay-checkout-button"
        onClick={handleCheckout}
        disabled={disabled || loading}
        className={
          className ||
          "inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold px-6 py-3 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        }
      >
        {loading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4 text-slate-950"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              ></path>
            </svg>
            Processing Payment...
          </>
        ) : (
          buttonText
        )}
      </button>

      {errorMessage && (
        <p className="text-xs text-rose-500 font-medium mt-1">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
