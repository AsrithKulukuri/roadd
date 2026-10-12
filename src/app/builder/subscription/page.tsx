"use client";

import { useState, useEffect } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  ShieldCheck,
  Calendar,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Download,
  ArrowRight,
  RefreshCw,
  Building2,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Printer,
  X,
  Send,
  Zap,
} from "lucide-react";
import { useBuilderStore } from "@/stores/builder-store";
import { 
  SUBSCRIPTION_PLANS, 
  SubscriptionPlan, 
  BASE_MONTHLY_PRICE, 
  DAYS_PER_MONTH, 
  calculateSubscriptionPlans 
} from "@/lib/builder-subscription";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    Razorpay?: any;
  }
}

export default function BuilderSubscriptionPage() {
  const router = useRouter();
  const { getCurrentBuilder, fetchFromSupabase, currentBuilderId } = useBuilderStore();
  const builder = getCurrentBuilder();

  const [selectedMonths, setSelectedMonths] = useState<number>(3);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<any>(null);

  // Dynamic Plans & Monthly Rate
  const [monthlyRate, setMonthlyRate] = useState<number>(BASE_MONTHLY_PRICE);
  const [plans, setPlans] = useState<SubscriptionPlan[]>(SUBSCRIPTION_PLANS);

  useEffect(() => {
    fetchFromSupabase().catch(() => null);
  }, [fetchFromSupabase]);

  // Load latest customized platform or builder rate
  useEffect(() => {
    fetch("/api/builder/subscription/pricing")
      .then((res) => res.json())
      .then((data) => {
        const platformRate = data.success && data.baseMonthlyPrice ? data.baseMonthlyPrice : BASE_MONTHLY_PRICE;
        const builderCustomRate = Number(builder?.subscription?.pricePerMonth);
        const effective = builderCustomRate > 0 ? builderCustomRate : platformRate;
        setMonthlyRate(effective);
        setPlans(calculateSubscriptionPlans(effective));
      })
      .catch(() => {
        const builderCustomRate = Number(builder?.subscription?.pricePerMonth);
        if (builderCustomRate > 0) {
          setMonthlyRate(builderCustomRate);
          setPlans(calculateSubscriptionPlans(builderCustomRate));
        }
      });
  }, [builder?.subscription?.pricePerMonth]);

  const sub = builder?.subscription;
  const daysRemaining = sub?.daysRemaining ?? 0;
  const isExpired = sub?.status === "expired" || sub?.status === "pending_payment" || daysRemaining <= 0;
  const isExpiringSoon = sub?.status === "expiring_soon" || (daysRemaining > 0 && daysRemaining <= 7);

  const selectedPlan = plans.find(p => p.months === selectedMonths) || plans[0];

  // Helper to dynamically load Razorpay Checkout SDK if needed
  const loadRazorpaySDK = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window === "undefined") return resolve(false);
      if (window.Razorpay) return resolve(true);

      const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(true));
        existingScript.addEventListener("error", () => resolve(false));
        if (window.Razorpay) return resolve(true);
      }

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Complete verified payment after Razorpay checkout succeeds
  const handleCompleteVerification = async ({
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    months,
  }: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    months: number;
  }) => {
    try {
      const verifyRes = await fetch("/api/builder/payment/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
          months,
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.success) {
        throw new Error(verifyData.error || "Payment verification failed.");
      }

      await fetchFromSupabase();
      setLastInvoice(verifyData.invoice);
      setShowInvoiceModal(true);
      toast.success(`🎉 Subscription renewed! ${months * 30} days added to your portal access.`);
    } catch (err: any) {
      toast.error(err.message || "Payment verification encountered an issue.");
      throw err;
    }
  };

  // Initiate Razorpay Payment directly
  const handleInitiatePayment = async () => {
    if (!builder) {
      toast.error("Builder session not found. Please log in.");
      return;
    }

    setIsProcessing(true);
    try {
      // 1. Ensure Razorpay SDK is loaded
      const isLoaded = await loadRazorpaySDK();
      if (!isLoaded || typeof window.Razorpay === "undefined") {
        throw new Error("Unable to load Razorpay Checkout SDK. Please check your internet connection.");
      }

      // 2. Create order on server
      const orderRes = await fetch("/api/builder/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ months: selectedMonths }),
      });
      const orderData = await orderRes.json();

      if (!orderRes.ok || !orderData.success) {
        throw new Error(orderData.error || "Failed to initialize payment order.");
      }

      // 3. Open official Razorpay Checkout popup directly
      const hasRealOrder = orderData.order?.id && !orderData.order.id.startsWith("order_sim_");

      const options: any = {
        key: orderData.razorpayKeyId || "rzp_test_Tn2DFXi9z8hLbK",
        amount: orderData.order.amount,
        currency: "INR",
        name: "ROAD Platform",
        description: `Builder Subscription Renewal (${selectedMonths} Month${selectedMonths > 1 ? "s" : ""})`,
        image: "/logo-faad13-exact.png",
        prefill: {
          name: builder.companyName,
          email: builder.contactEmail,
          contact: builder.whatsappNumber || builder.contactPhone,
        },
        theme: {
          color: "#faad13", // ROAD Amber
        },
        handler: async function (response: any) {
          try {
            await handleCompleteVerification({
              razorpay_order_id: response.razorpay_order_id || orderData.order.id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature || "rzp_direct_signature",
              months: selectedMonths,
            });
          } catch (err: any) {
            toast.error(err.message || "Payment verification failed.");
          } finally {
            setIsProcessing(false);
          }
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false);
            toast.info("Payment cancelled. No charges were made.");
          },
        },
      };

      // Only pass order_id if it's a real order ID created via Razorpay
      if (hasRealOrder) {
        options.order_id = orderData.order.id;
      }

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (resp: any) {
        setIsProcessing(false);
        const desc = resp.error?.description || resp.error?.reason || "Payment was declined or failed.";
        if (desc.toLowerCase().includes("auth") || desc.toLowerCase().includes("key")) {
          toast.error(`Razorpay Key Error: ${desc}. Please verify your active RAZORPAY_KEY_ID in .env.local.`);
        } else {
          toast.error(`Razorpay: ${desc}`);
        }
      });
      rzp.open();
    } catch (error: any) {
      toast.error(error.message || "Payment processing failed. Please retry.");
      setIsProcessing(false);
    }
  };

  const formattedStartDate = sub?.startDate
    ? new Date(sub.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "—";

  const formattedEndDate = sub?.endDate
    ? new Date(sub.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "—";

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />

      <div className="space-y-8 pb-16 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                Partner Billing
              </span>
              <span className="text-xs font-medium text-muted-foreground">• ₹3,500 / 30 Days</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Subscription & Payment Portal
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Manage your active builder partnership validity, renew plan tiers via Razorpay, and download tax invoices.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/builder")}
              disabled={isExpired}
              className="border-border text-foreground hover:bg-muted text-xs font-semibold"
            >
              Back to Dashboard
            </Button>
            {lastInvoice && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowInvoiceModal(true)}
                className="border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 text-xs font-semibold"
              >
                <Receipt className="w-3.5 h-3.5 mr-1.5" />
                Latest Receipt
              </Button>
            )}
          </div>
        </div>

        {/* Status Banners */}
        {isExpired && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-bold text-red-700 dark:text-red-300">Subscription Inactive / Expired</h4>
              <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                Your builder portal access has lapsed. Select a renewal package below to instantly restore project editing, buyer lead access, and site visit scheduling.
              </p>
            </div>
          </div>
        )}

        {isExpiringSoon && !isExpired && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-bold text-amber-700 dark:text-amber-300">
                Subscription Warning: Expiring in {daysRemaining} Day{daysRemaining > 1 ? "s" : ""}
              </h4>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                Your portal validity ends on {formattedEndDate}. Advance WhatsApp reminders have been dispatched. Renew today to guarantee continuous project exposure.
              </p>
            </div>
          </div>
        )}

        {/* Current Subscription Status Card */}
        <div className="p-6 rounded-2xl bg-card border border-border shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            {/* Status */}
            <div className="space-y-1.5">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Status</span>
              <div className="flex items-center gap-2 pt-0.5">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border",
                    isExpired
                      ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30"
                      : isExpiringSoon
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                  )}
                >
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full",
                      isExpired ? "bg-red-500" : isExpiringSoon ? "bg-amber-500 animate-ping" : "bg-emerald-500"
                    )}
                  />
                  {isExpired ? "Expired" : isExpiringSoon ? "Expiring Soon" : "Active & Verified"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground pt-1">
                Developer: <strong className="text-foreground font-semibold">{builder?.companyName || "Partner"}</strong>
              </p>
            </div>

            {/* Days Remaining */}
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Days Remaining</span>
              <div className="flex items-baseline gap-2">
                <span className={cn(
                  "text-4xl font-black tracking-tight",
                  isExpired ? "text-red-600 dark:text-red-400" : isExpiringSoon ? "text-amber-600 dark:text-amber-400" : "text-foreground"
                )}>
                  {daysRemaining}
                </span>
                <span className="text-xs text-muted-foreground font-semibold">Days Left</span>
              </div>
              <div className="w-full bg-muted h-2 rounded-full overflow-hidden mt-2">
                <div
                  className={cn(
                    "h-full transition-all duration-500 rounded-full",
                    isExpired ? "bg-red-500 w-0" : isExpiringSoon ? "bg-amber-500" : "bg-emerald-500"
                  )}
                  style={{ width: `${Math.min(100, Math.max(5, (daysRemaining / 30) * 100))}%` }}
                />
              </div>
            </div>

            {/* Validity Period */}
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Validity Period</span>
              <div className="text-xs text-muted-foreground flex flex-col gap-1.5 pt-1">
                <span>Start: <strong className="text-foreground font-bold">{formattedStartDate}</strong></span>
                <span>Expiry: <strong className={isExpired ? "text-red-600 dark:text-red-400 font-bold" : isExpiringSoon ? "text-amber-600 dark:text-amber-400 font-bold" : "text-emerald-600 dark:text-emerald-400 font-bold"}>{formattedEndDate}</strong></span>
              </div>
            </div>

            {/* Standard Rate */}
            <div className="space-y-1 border-t md:border-t-0 md:border-l border-border md:pl-6 pt-4 md:pt-0">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Standard Rate</span>
              <div className="pt-1">
                <div className="text-2xl font-black text-foreground">
                  ₹{monthlyRate.toLocaleString("en-IN")} <span className="text-xs text-muted-foreground font-normal">/ 30 Days</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Multiples of 1, 3, 6, 12 months with extended duration savings.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Plan Selector */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-extrabold text-foreground tracking-tight">Select Subscription Plan</h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                1 Month = 30 Calendar Days from portal activation / renewal. Choose your preferred renewal tenure:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((plan) => {
              const isSelected = selectedMonths === plan.months;
              return (
                <div
                  key={plan.months}
                  onClick={() => setSelectedMonths(plan.months)}
                  className={cn(
                    "cursor-pointer rounded-2xl p-5 border-2 transition-all relative flex flex-col justify-between",
                    isSelected
                      ? "bg-amber-500/[0.04] dark:bg-amber-500/[0.08] border-amber-500 shadow-xl shadow-amber-500/10 ring-2 ring-amber-500/20"
                      : "bg-card border-border hover:border-amber-500/40 hover:shadow-md"
                  )}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-[10px] uppercase tracking-wider px-3.5 py-0.5 rounded-full shadow-md">
                      Most Popular
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className={cn("text-sm font-bold", isSelected ? "text-amber-600 dark:text-amber-400 font-extrabold" : "text-foreground")}>
                        {plan.label}
                      </span>
                      {plan.badge && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                          {plan.badge}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-black text-foreground">₹{plan.finalPrice.toLocaleString("en-IN")}</span>
                        <span className="text-xs font-semibold text-muted-foreground">/ {plan.days} Days</span>
                      </div>
                      {plan.savings > 0 ? (
                        <div className="flex items-center gap-2 pt-0.5">
                          <span className="text-xs text-muted-foreground line-through font-mono">₹{plan.originalPrice.toLocaleString("en-IN")}</span>
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                            Save ₹{plan.savings.toLocaleString("en-IN")}
                          </span>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground font-medium pt-0.5">Base Developer Tier</div>
                      )}
                    </div>

                    <div className="space-y-2 pt-3 border-t border-border/70 text-xs">
                      <div className="flex items-center gap-2 text-foreground font-medium">
                        <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>{plan.months} × 30 Days portal access</span>
                      </div>
                      <div className="flex items-center gap-2 text-foreground font-medium">
                        <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>Live CRDA/RERA project showcases</span>
                      </div>
                      <div className="flex items-center gap-2 text-foreground font-medium">
                        <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>Direct buyer inquiry & site visit engine</span>
                      </div>
                      <div className="flex items-center gap-2 text-foreground font-medium">
                        <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>7-Day WhatsApp Expiry Reminders</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-5 mt-3">
                    <div
                      className={cn(
                        "w-full py-2.5 rounded-xl text-xs font-bold text-center transition-all",
                        isSelected
                          ? "bg-amber-500 text-slate-950 font-black shadow-md"
                          : "bg-muted text-foreground hover:bg-muted/80 border border-border"
                      )}
                    >
                      {isSelected ? "Selected Tier" : "Select Tier"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Panel & Payment CTA */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-card via-card to-amber-500/10 border-2 border-amber-500/30 shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <div className="flex items-center gap-2 justify-center md:justify-start">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Checkout Summary</span>
              <span className="text-xs text-muted-foreground">• Powered by Razorpay</span>
            </div>
            <h3 className="text-xl font-extrabold text-foreground">
              Renew for {selectedPlan.label} ({selectedPlan.days} Days)
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Total payable: <strong className="text-foreground font-black text-base">₹{selectedPlan.finalPrice.toLocaleString("en-IN")}</strong> (All taxes & GST included)
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <Button
              size="lg"
              onClick={handleInitiatePayment}
              disabled={isProcessing}
              className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-8 py-6 text-sm sm:text-base rounded-xl shadow-lg shadow-amber-500/25"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Connecting Razorpay...
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5 mr-2" />
                  Pay ₹{selectedPlan.finalPrice.toLocaleString("en-IN")} with Razorpay
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Value Guarantees */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-5 rounded-2xl bg-card border border-border shadow-sm space-y-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Send className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h4 className="text-sm font-bold text-foreground">7-Day WhatsApp Expiry Warnings</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Never miss a renewal deadline. Automated WhatsApp notices are dispatched directly to your registered number 7 days prior to expiry.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border shadow-sm space-y-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <h4 className="text-sm font-bold text-foreground">Razorpay Secure Encryption</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              All transactions are secured with 256-bit bank grade encryption. Support for UPI, Credit/Debit cards, and NetBanking.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border shadow-sm space-y-2">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Receipt className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <h4 className="text-sm font-bold text-foreground">Instant GST Invoicing</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Tax-compliant invoices generated immediately upon payment with your RERA number and company credentials for IT filing.
            </p>
          </div>
        </div>
      </div>

      {/* Invoice Modal */}
      {showInvoiceModal && lastInvoice && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-foreground">Tax Invoice & Payment Receipt</h3>
              </div>
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Invoice Area */}
            <div id="invoice-printable" className="p-6 rounded-xl bg-white text-zinc-950 space-y-6 font-sans border border-zinc-200 shadow-sm">
              <div className="flex justify-between items-start border-b border-zinc-200 pb-4">
                <div>
                  <h2 className="text-lg font-black tracking-tight text-zinc-900">ROAD PLATFORM PVT LTD</h2>
                  <p className="text-xs text-zinc-600">{lastInvoice.platform.address}</p>
                  <p className="text-xs text-zinc-600">GSTIN: {lastInvoice.platform.gstin} | PAN: {lastInvoice.platform.pan}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                    TAX INVOICE - PAID
                  </span>
                  <p className="text-xs font-bold text-zinc-800 mt-2">{lastInvoice.invoiceNumber}</p>
                  <p className="text-[11px] text-zinc-500">Date: {new Date(lastInvoice.date).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <h4 className="font-bold text-zinc-700 uppercase tracking-wider text-[10px]">Billed To:</h4>
                  <p className="font-bold text-sm text-zinc-900">{lastInvoice.builder.companyName}</p>
                  <p className="text-zinc-600">RERA: {lastInvoice.builder.reraNumber}</p>
                  <p className="text-zinc-600">{lastInvoice.builder.contactEmail}</p>
                  <p className="text-zinc-600">{lastInvoice.builder.contactPhone}</p>
                </div>
                <div className="text-right">
                  <h4 className="font-bold text-zinc-700 uppercase tracking-wider text-[10px]">Payment Details:</h4>
                  <p className="text-zinc-600">Method: {lastInvoice.summary.paymentMethod}</p>
                  <p className="text-zinc-600 font-mono text-[11px]">Txn ID: {lastInvoice.summary.paymentId}</p>
                  <p className="text-zinc-600 font-mono text-[11px]">Order: {lastInvoice.summary.orderId}</p>
                </div>
              </div>

              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 text-left font-bold text-zinc-600">
                    <th className="py-2">Description</th>
                    <th className="py-2 text-center">SAC</th>
                    <th className="py-2 text-right">Taxable Amt</th>
                    <th className="py-2 text-right">GST (18%)</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lastInvoice.items.map((item: any, idx: number) => (
                    <tr key={idx} className="border-b border-zinc-100">
                      <td className="py-2 font-medium">{item.description}</td>
                      <td className="py-2 text-center font-mono">{item.sac}</td>
                      <td className="py-2 text-right font-mono">₹{item.taxableAmount.toLocaleString("en-IN")}</td>
                      <td className="py-2 text-right font-mono">₹{item.gstAmount.toLocaleString("en-IN")}</td>
                      <td className="py-2 text-right font-bold font-mono">₹{item.total.toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-between items-center pt-2 border-t border-zinc-200">
                <p className="text-[10px] text-zinc-500">
                  This is a computer-generated tax invoice. No signature required.
                </p>
                <div className="text-right">
                  <span className="text-xs text-zinc-600">Grand Total: </span>
                  <span className="text-base font-black text-zinc-950">₹{lastInvoice.summary.totalAmount.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="border-border text-foreground hover:bg-muted"
              >
                <Printer className="w-4 h-4 mr-1.5" />
                Print / Save PDF
              </Button>
              <Button
                size="sm"
                onClick={() => setShowInvoiceModal(false)}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
