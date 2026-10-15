"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, CreditCard, Sparkles, RefreshCw, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { calculateSubscriptionPlans } from "@/lib/builder-subscription";

export default function AdminSettingsPage() {
  const [platformName, setPlatformName] = useState("ROADFACING");
  const [supportEmail, setSupportEmail] = useState("care@roadfacing.com");
  const [contactPhone, setContactPhone] = useState("+91 88850 05567");
  
  // Dynamic Subscription Pricing State (Default ₹3,600)
  const [baseMonthlyPrice, setBaseMonthlyPrice] = useState<number>(3600);
  const [isLoadingPricing, setIsLoadingPricing] = useState(true);
  const [isSavingPricing, setIsSavingPricing] = useState(false);

  // Load existing configured pricing from server
  useEffect(() => {
    fetch("/api/admin/subscription/pricing")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.baseMonthlyPrice) {
          setBaseMonthlyPrice(data.baseMonthlyPrice);
        }
      })
      .catch((err) => {
        console.warn("Could not load pricing settings:", err);
      })
      .finally(() => {
        setIsLoadingPricing(false);
      });
  }, []);

  const previewPlans = calculateSubscriptionPlans(baseMonthlyPrice);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPricing(true);

    try {
      // Save subscription pricing to backend
      const res = await fetch("/api/admin/subscription/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseMonthlyPrice }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update subscription pricing");
      }

      toast.success(`Platform settings & subscription price (₹${baseMonthlyPrice.toLocaleString("en-IN")}/mo) saved successfully!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings.");
    } finally {
      setIsSavingPricing(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-4xl mx-auto">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold font-heading text-text-primary">Settings</h1>
        <p className="text-text-secondary text-xs sm:text-sm mt-1">
          Manage global platform configurations, builder subscription rates, and metadata.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Builder Subscription Pricing Customization Card */}
        <div className="bg-bg-card border border-amber-500/30 rounded-2xl p-6 shadow-sm space-y-5 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-default pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                  Builder Subscription Pricing
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-normal">
                    Admin Customizable
                  </span>
                </h2>
                <p className="text-xs text-text-secondary">
                  Set the monthly base subscription rate. Multi-month plans, discounts, and invoices update automatically.
                </p>
              </div>
            </div>
            {isLoadingPricing && (
              <span className="text-xs text-text-tertiary flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" /> Loading rate...
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Monthly Base Price (₹ INR / month)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm text-text-tertiary">₹</span>
                <Input
                  type="number"
                  min="100"
                  step="50"
                  value={baseMonthlyPrice}
                  onChange={(e) => setBaseMonthlyPrice(Math.max(100, Number(e.target.value) || 0))}
                  className="pl-8 bg-bg-primary/50 text-base font-semibold text-text-primary"
                  placeholder="3600"
                  required
                />
              </div>
              <p className="text-xs text-text-tertiary mt-1">
                Standard default is ₹3,600 for 1 month (30 days access).
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Quick Preset Rates
              </label>
              <div className="flex flex-wrap gap-2">
                {[3500, 3600, 4000, 5000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setBaseMonthlyPrice(preset)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      baseMonthlyPrice === preset
                        ? "bg-amber-500 text-slate-950 border-amber-500 font-bold"
                        : "bg-bg-primary/60 border-border-default text-text-secondary hover:text-text-primary hover:border-amber-500/50"
                    }`}
                  >
                    ₹{preset.toLocaleString("en-IN")}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Live Calculated Package Plans Preview */}
          <div className="pt-2">
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
              Live Package Plans Preview (Calculated from ₹{baseMonthlyPrice.toLocaleString("en-IN")}/mo)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {previewPlans.map((plan) => (
                <div
                  key={plan.months}
                  className="p-3.5 rounded-xl border border-border-default bg-bg-primary/40 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text-primary">{plan.months} Month{plan.months > 1 ? "s" : ""}</span>
                    {plan.badge && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-medium">
                        {plan.badge}
                      </span>
                    )}
                  </div>
                  <div className="text-lg font-bold text-amber-400">
                    ₹{plan.finalPrice.toLocaleString("en-IN")}
                  </div>
                  <div className="text-[11px] text-text-tertiary">
                    {plan.days} Days Validity
                    {plan.savings > 0 && (
                      <span className="block text-emerald-400 font-medium">
                        Save ₹{plan.savings.toLocaleString("en-IN")} ({plan.discountPercent}%)
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* General Info Card */}
        <div className="bg-bg-card border border-border-default rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-xl font-bold text-text-primary border-b border-border-default pb-2">General Info</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Platform Name</label>
              <Input
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
                className="bg-bg-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Support Email</label>
              <Input
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                className="bg-bg-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Contact Phone</label>
              <Input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="bg-bg-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Default Currency</label>
              <Input defaultValue="INR (₹)" disabled className="bg-bg-primary/50 opacity-70" />
            </div>
          </div>
        </div>

        {/* SEO & Metadata Card */}
        <div className="bg-bg-card border border-border-default rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-xl font-bold text-text-primary border-b border-border-default pb-2">SEO & Metadata</h2>
          
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Meta Title</label>
            <Input defaultValue="ROADFACING — India's Premium Real Estate Platform" className="bg-bg-primary/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Meta Description</label>
            <textarea 
              defaultValue="Buy, sell, and rent properties across India with ROADFACING. Verified listings, RERA-compliant, AI-powered search, and trusted agents."
              className="w-full h-24 rounded-xl border border-border-input bg-bg-primary/50 px-3 py-2 text-sm text-text-primary outline-none focus-visible:ring-1 focus-visible:ring-amber-primary"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            variant="amber"
            disabled={isSavingPricing}
            className="h-12 px-8 gap-2 rounded-xl shadow-amber-glow"
          >
            <Save className="w-4 h-4" />
            {isSavingPricing ? "Saving Changes..." : "Save All Settings"}
          </Button>
        </div>
      </form>
    </div>
  );
}
