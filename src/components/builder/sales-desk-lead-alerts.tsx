"use client";

import { useState, useEffect } from "react";
import {
  Bell,
  Phone,
  Send,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  MessageSquare,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SalesDeskLeadAlertsProps {
  builderId: string;
  builderName: string;
  defaultPhone?: string;
  projectName?: string;
}

export function SalesDeskLeadAlerts({
  builderId,
  builderName,
  defaultPhone,
  projectName = "Serene Grande Luxury Residences",
}: SalesDeskLeadAlertsProps) {
  const [salesPhone, setSalesPhone] = useState(defaultPhone || "918977311418");
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAlerts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/builder/sales-alerts");
      const data = await res.json();
      if (data.success) {
        if (data.salesPhone) setSalesPhone(data.salesPhone);
        setAlerts(data.alerts || []);
      }
    } catch {
      // non-fatal
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleTestDispatch = async () => {
    if (!salesPhone.trim()) {
      toast.error("Please enter a sales phone number.");
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch("/api/builder/sales-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testSalesPhone: salesPhone.trim(),
          buyerName: "Srikanth M. (Verified CRDA Buyer)",
          buyerPhone: "+91 98480 33445",
          projectName,
          unitInterest: "3 BHK East Facing (1,850 sq.ft)",
          preferredTime: "Today at 5:00 PM",
          inquiryType: "Urgent Site Visit Request",
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`🚀 Test WhatsApp alert dispatched to sales desk: ${salesPhone}!`);
        fetchAlerts();
      } else {
        throw new Error(data.error || "Failed to dispatch alert.");
      }
    } catch (err: any) {
      toast.error(err.message || "Alert dispatch encountered an error.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Sales Desk WhatsApp Auto-Routing</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 uppercase">
                Zero Lead-Loss Active
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Instant automated WhatsApp ping dispatched to sales executives within 5 seconds of buyer inquiry
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleTestDispatch}
            disabled={isSending}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs gap-1.5 shadow-sm"
          >
            {isSending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Test Sales Desk Alert
          </Button>
        </div>
      </div>

      {/* Configuration Row */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="flex-1 w-full space-y-1">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-amber-500" />
            Assigned Sales Manager WhatsApp Phone:
          </label>
          <Input
            value={salesPhone}
            onChange={e => setSalesPhone(e.target.value)}
            placeholder="+91 98765 43210"
            className="h-9 text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 pt-5">
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-800 dark:text-emerald-300 font-bold bg-emerald-500/15 border border-emerald-500/30 px-3 py-2 rounded-xl">
            <CheckCircle2 className="w-4 h-4" /> Auto-Routing Enabled
          </span>
        </div>
      </div>

      {/* Dispatched Alerts History */}
      <div className="space-y-2 pt-2">
        <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Recent Lead Dispatch Logs:</span>
        {alerts.length === 0 ? (
          <p className="text-xs text-slate-500 italic">
            No recent dispatch logs. Click "Test Sales Desk Alert" to trigger a live WhatsApp notification.
          </p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {alerts.slice(0, 3).map((a, i) => (
              <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">{a.details?.buyerName || "Verified Buyer"}</span>
                    <span className="text-[10px] text-slate-500">({a.details?.buyerPhone})</span>
                    <span className="text-[10px] bg-amber-500/15 text-amber-800 dark:text-amber-300 font-bold px-1.5 py-0.2 rounded border border-amber-500/30">
                      {a.details?.inquiryType || "Lead"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Project: <strong className="text-slate-900 dark:text-white">{a.entity_name}</strong> • Alert sent to: {a.details?.salesPhone}
                  </p>
                </div>
                <div className="text-right shrink-0 pl-2">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">✓ Dispatched</span>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    {a.created_at ? new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
