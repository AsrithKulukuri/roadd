"use client";

import { useState, useEffect } from "react";
import {
  FileText,
  Share2,
  Copy,
  ExternalLink,
  Eye,
  Clock,
  Sparkles,
  X,
  MessageSquare,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface BrochureTrackerModalProps {
  projectSlug: string;
  projectName: string;
  builderPhone?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function BrochureTrackerModal({
  projectSlug,
  projectName,
  builderPhone,
  isOpen,
  onClose,
}: BrochureTrackerModalProps) {
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState({
    totalViews: 84,
    avgDwell: "3m 42s",
    whatsappShares: 39,
  });

  const appUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const brochureUrl = `${appUrl}/brochure/${projectSlug}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(brochureUrl);
    setCopied(true);
    toast.success("Trackable brochure link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const text = `✨ *${projectName} — Official Digital Master Brochure*\n\nExplore CRDA & RERA verified floor plans, unit configurations, and pricing directly:\n🔗 ${brochureUrl}\n\nSchedule your direct site visit with our developer desk.`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-700 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 dark:text-white">Digital Brochure &amp; Open Tracker</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-800 dark:text-blue-300 border border-blue-500/30 uppercase">
                  P5 Active
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">{projectName} • Trackable mobile brochure with engagement metrics</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Engagement Stats */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Total Opens</span>
            <div className="text-lg font-black text-slate-900 dark:text-white">{stats.totalViews}</div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border-2 border-emerald-300 dark:border-emerald-700">
            <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase">Avg Read Time</span>
            <div className="text-lg font-black text-emerald-700 dark:text-emerald-300">{stats.avgDwell}</div>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border-2 border-amber-300 dark:border-amber-700">
            <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase">WhatsApp Shares</span>
            <div className="text-lg font-black text-amber-700 dark:text-amber-300">{stats.whatsappShares}</div>
          </div>
        </div>

        {/* Trackable Link Box */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Your Unique Trackable Link:</label>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700">
            <span className="text-xs font-mono text-slate-900 dark:text-white truncate flex-1">{brochureUrl}</span>
            <Button size="sm" variant="outline" onClick={handleCopyLink} className="h-8 text-xs gap-1 border-slate-300 dark:border-slate-600 font-bold text-slate-900 dark:text-white shrink-0">
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          <Button
            onClick={handleShareWhatsApp}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-2 py-3 h-auto shadow-md"
          >
            <MessageSquare className="w-4 h-4" />
            Share Trackable Brochure on WhatsApp
          </Button>

          <a
            href={brochureUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
            Preview Brochure as Buyer
          </a>
        </div>

        <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-end">
          <Button size="sm" variant="outline" onClick={onClose} className="border-slate-300 dark:border-slate-700 font-bold text-xs text-slate-900 dark:text-white">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}

export default BrochureTrackerModal;

