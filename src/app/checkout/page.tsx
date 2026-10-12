"use client";

import { useState } from "react";
import Link from "next/link";
import RazorpayCheckoutButton from "@/components/RazorpayCheckoutButton";
import { CheckCircle2, ShieldCheck, ArrowLeft, RefreshCw, CreditCard, Sparkles } from "lucide-react";

export default function CheckoutPage() {
  const [amountInRupees, setAmountInRupees] = useState<number>(100);
  const [currency] = useState<string>("INR");
  const [customerName, setCustomerName] = useState("Test User");
  const [customerEmail, setCustomerEmail] = useState("test.user@roadplatform.in");
  const [customerContact, setCustomerContact] = useState("9876543210");
  
  const [paymentResult, setPaymentResult] = useState<{
    order_id: string;
    payment_id: string;
    signature: string;
    verified: boolean;
  } | null>(null);

  const [paymentError, setPaymentError] = useState<string | null>(null);

  const amountInPaise = Math.round(amountInRupees * 100);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between pt-8 pb-32 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto w-full">
        {/* Back Link */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-amber-400 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Home
          </Link>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Razorpay Standard Web Checkout
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Secure Payment Gateway
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Official Razorpay Standard Checkout integration with backend order creation & HMAC signature verification.
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl backdrop-blur-md">
          {paymentResult ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-white">Payment Verified Successfully!</h2>
              <p className="text-xs text-slate-400">
                The HMAC-SHA256 signature was verified by the backend endpoint.
              </p>

              <div className="bg-slate-950 rounded-xl p-4 text-left text-xs font-mono space-y-2 border border-slate-800">
                <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                  <span className="text-slate-500">Order ID:</span>
                  <span className="text-amber-400 font-semibold">{paymentResult.order_id}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                  <span className="text-slate-500">Payment ID:</span>
                  <span className="text-emerald-400 font-semibold">{paymentResult.payment_id}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-slate-500">HMAC-SHA256 Signature:</span>
                  <span className="text-slate-400 break-all text-[11px]">{paymentResult.signature}</span>
                </div>
              </div>

              <button
                onClick={() => setPaymentResult(null)}
                className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Make Another Test Payment
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Amount Selection */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Select Amount (INR)
                </label>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[1, 100, 3600].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAmountInRupees(val)}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                        amountInRupees === val
                          ? "bg-amber-500/20 border-amber-500 text-amber-400"
                          : "bg-slate-800/60 border-slate-700/60 text-slate-300 hover:border-slate-600"
                      }`}
                    >
                      ₹{val.toLocaleString("en-IN")}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-500">₹</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={amountInRupees}
                    onChange={(e) => setAmountInRupees(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-7 pr-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
                    placeholder="Enter custom amount"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Equivalent to {amountInPaise} paise (minimum 100 paise required).
                </p>
              </div>

              {/* Customer Details */}
              <div className="space-y-3 pt-2 border-t border-slate-800/80">
                <div className="text-xs font-medium text-slate-300">Customer Information</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Name</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Phone</label>
                    <input
                      type="text"
                      value={customerContact}
                      onChange={(e) => setCustomerContact(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Email</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Error display */}
              {paymentError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-400">
                  {paymentError}
                </div>
              )}

              {/* Checkout Button */}
              <div className="pt-2">
                <RazorpayCheckoutButton
                  amount={amountInPaise}
                  currency={currency}
                  name="ROAD Platform"
                  description={`Payment of ₹${amountInRupees}`}
                  buttonText={`Pay ₹${amountInRupees.toLocaleString("en-IN")} via Razorpay`}
                  className="w-full py-3.5 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer"
                  prefill={{
                    name: customerName,
                    email: customerEmail,
                    contact: customerContact,
                  }}
                  onSuccess={(data) => {
                    setPaymentError(null);
                    setPaymentResult({
                      order_id: data.order_id,
                      payment_id: data.payment_id,
                      signature: data.signature,
                      verified: true,
                    });
                  }}
                  onError={(err) => setPaymentError(err)}
                  onDismiss={() => {
                    setPaymentError("Payment modal was cancelled.");
                  }}
                />
              </div>

              {/* Trust badges */}
              <div className="flex items-center justify-center gap-4 pt-4 border-t border-slate-800 text-slate-500 text-xs">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>256-Bit SSL Encrypted</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-amber-400" />
                  <span>Cards, UPI, Netbanking</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="text-center text-xs text-slate-600 mt-8">
        ROAD Platform • Razorpay Standard Web Integration
      </div>
    </div>
  );
}
