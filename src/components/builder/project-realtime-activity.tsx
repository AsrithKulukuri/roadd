"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Clock,
  Users,
  Eye,
  RefreshCw,
  ShieldCheck,
  Phone,
  Mail,
  MessageSquare,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { toast } from "sonner";
import type { Project } from "@/types/project";

interface ProjectRealtimeActivityProps {
  project: Project;
  onOpenModal?: () => void;
  defaultExpanded?: boolean;
}

type DatePreset = "today" | "yesterday" | "7days" | "30days" | "all" | "custom";

export function ProjectRealtimeActivity({
  project,
  onOpenModal,
  defaultExpanded = true,
}: ProjectRealtimeActivityProps) {
  const [preset, setPreset] = useState<DatePreset>("7days");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const [metrics, setMetrics] = useState({
    todayClicks: 0,
    totalClicks: 0,
    avgDwellSeconds: 0,
    avgDwellFormatted: "0s",
    detailsSharedCount: 0,
  });

  const [sharedMembers, setSharedMembers] = useState<
    Array<{
      sNo: number;
      date: string;
      name: string;
      phone: string;
      email: string;
      action: string;
      dwellTime: string;
    }>
  >([]);

  // Compute preset date bounds
  useEffect(() => {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    if (preset === "today") {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === "yesterday") {
      const y = new Date(today);
      y.setDate(today.getDate() - 1);
      const yStr = y.toISOString().slice(0, 10);
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (preset === "7days") {
      const past = new Date(today);
      past.setDate(today.getDate() - 7);
      setStartDate(past.toISOString().slice(0, 10));
      setEndDate(todayStr);
    } else if (preset === "30days") {
      const past = new Date(today);
      past.setDate(today.getDate() - 30);
      setStartDate(past.toISOString().slice(0, 10));
      setEndDate(todayStr);
    } else if (preset === "all") {
      setStartDate("");
      setEndDate("");
    }
  }, [preset]);

  // Fetch real metrics from API
  const fetchMetrics = useCallback(async () => {
    if (!project) return;
    setIsLoading(true);

    try {
      const params = new URLSearchParams();
      params.set("projectId", project.id);
      if (project.slug) params.set("projectSlug", project.slug);
      params.set("projectName", project.name);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      params.set("format", "json");

      const res = await fetch(`/api/projects/activity/report?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success || !data.metrics) throw new Error(data.error || "Activity report unavailable.");
      setLoadError("");
      if (data.success && data.metrics) {
        setMetrics(data.metrics);
        setSharedMembers(data.sharedMembers || []);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Activity report unavailable.");
    } finally {
      setIsLoading(false);
    }
  }, [project, startDate, endDate]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Download Excel Report
  const handleDownloadExcel = async () => {
    if (!project) return;
    setIsDownloading(true);

    const params = new URLSearchParams();
    params.set("projectId", project.id);
    if (project.slug) params.set("projectSlug", project.slug);
    params.set("projectName", project.name);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    params.set("format", "excel");

    const downloadUrl = `/api/projects/activity/report?${params.toString()}`;
    try {
    const response = await fetch(downloadUrl);
    if (!response.ok) throw new Error("Report download failed.");
    const objectUrl = URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    link.href = objectUrl;
    link.setAttribute("download", `ROAD_Activity_${project.name}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    toast.success("Report downloaded.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Download failed."); }
    finally { setIsDownloading(false); }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label}: ${text}`);
  };

  return (
    <div className="space-y-4 pt-4 border-t border-border/40">
      {loadError && <p role="alert" className="text-sm text-red-500">{loadError} — refresh to retry.</p>}
      {/* Date Range Selector Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <span>Select Date Range</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Activity report
            </span>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: "today", label: "Today" },
              { id: "yesterday", label: "Yesterday" },
              { id: "7days", label: "Last 7 Days" },
              { id: "30days", label: "Last 30 Days" },
              { id: "all", label: "All Time" },
              { id: "custom", label: "Custom Range" },
            ] as const
          ).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPreset(p.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                preset === p.id
                  ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm font-bold"
                  : "bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Pickers */}
      {preset === "custom" && (
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <label className="text-[11px] text-muted-foreground font-medium block mb-1">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground font-medium block mb-1">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>
      )}

      {/* 4 Real-time Metric Cards (Identical to Admin Portal) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Today's Clicks */}
        <div className="bg-amber-500/[0.06] border border-amber-500/20 rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs font-bold text-amber-500">
            <span>Today's Clicks</span>
            <Eye className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-foreground mt-2">
            {isLoading ? "..." : metrics.todayClicks}
          </p>
          <span className="text-[10px] text-amber-500/80 font-medium block mt-1">Real visits today</span>
        </div>

        {/* Period Clicks */}
        <div className="bg-muted/40 border border-border/60 rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
            <span>Period Clicks</span>
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-foreground mt-2">
            {isLoading ? "..." : metrics.totalClicks}
          </p>
          <span className="text-[10px] text-muted-foreground font-medium block mt-1">In selected range</span>
        </div>

        {/* Average Time Spent */}
        <div className="bg-blue-500/[0.06] border border-blue-500/20 rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs font-bold text-blue-400">
            <span>Avg Time</span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-foreground mt-2">
            {isLoading ? "..." : metrics.avgDwellFormatted}
          </p>
          <span className="text-[10px] text-blue-400/80 font-medium block mt-1">Dwell time per visitor</span>
        </div>

        {/* Details Shared */}
        <div className="bg-emerald-500/[0.06] border border-emerald-500/20 rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
            <span>Details Shared</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-400 mt-2">
            {isLoading ? "..." : metrics.detailsSharedCount}
          </p>
          <span className="text-[10px] text-emerald-400/80 font-medium block mt-1">Members sent to builder</span>
        </div>
      </div>

      {/* Members Details Shared Feed */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <span>Members Details Shared With Builder ({sharedMembers.length})</span>
          </h4>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchMetrics}
              disabled={isLoading}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-amber-400" : ""}`} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 cursor-pointer"
            >
              {isExpanded ? (
                <>
                  <span>Hide</span>
                  <ChevronUp className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <span>Show</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>

        {isExpanded && (
          <>
            {sharedMembers.length === 0 ? (
              <div className="p-6 text-center bg-muted/20 border border-border/50 rounded-2xl text-xs text-muted-foreground">
                No member details shared with the builder in this date range. Details are shared when a prospective buyer views contact or clicks WhatsApp Builder.
              </div>
            ) : (
              <div className="border border-border/60 rounded-2xl overflow-hidden bg-card/60 shadow-sm">
                <div className="max-h-60 overflow-y-auto divide-y divide-border/40">
                  {sharedMembers.map((m) => {
                    const cleanPhone = m.phone.replace(/[^0-9]/g, "");
                    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                      `Hello ${m.name}, thank you for your interest in ${project.name}. We are delighted to connect with you directly!`
                    )}`;

                    return (
                      <div
                        key={m.sNo}
                        className="p-3.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                      >
                        <div className="space-y-1 min-w-0">
                          <p className="font-bold text-foreground text-sm">{m.name}</p>
                          <div className="flex flex-wrap items-center gap-3 text-muted-foreground text-[11px]">
                            <div className="flex items-center gap-1.5 font-mono text-foreground font-semibold">
                              <Phone className="w-3 h-3 text-emerald-500" />
                              <span>{m.phone}</span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(m.phone, "Phone")}
                                className="text-muted-foreground hover:text-amber-400 p-0.5 rounded transition-colors"
                                title="Copy Phone"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>

                            {m.email && m.email !== "-" && (
                              <div className="flex items-center gap-1">
                                <Mail className="w-3 h-3 text-muted-foreground" />
                                <span>{m.email}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 sm:text-right shrink-0">
                          <div>
                            <span className="inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              {m.action}
                            </span>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{m.date}</p>
                          </div>

                          {/* Instant WhatsApp & Call Actions */}
                          <div className="flex items-center gap-1.5 ml-2">
                            <a
                              href={whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 transition-colors"
                              title="Connect on WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </a>
                            <a
                              href={`tel:${m.phone}`}
                              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 transition-colors"
                              title="Direct Phone Call"
                            >
                              <Phone className="w-3.5 h-3.5 text-amber-400" />
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer with Download Excel button */}
      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Opens directly in Microsoft Excel with formatted sections</span>
        </div>

        <div className="flex items-center gap-2">
          {onOpenModal && (
            <button
              type="button"
              onClick={onOpenModal}
              className="px-3.5 py-2.5 bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground font-semibold rounded-xl transition-all flex items-center gap-1.5 text-xs cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
              <span>Full Analytics Window</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleDownloadExcel}
            disabled={isDownloading}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2 text-xs cursor-pointer active:scale-98"
          >
            {isDownloading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Exporting Excel...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download Excel Sheet</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
