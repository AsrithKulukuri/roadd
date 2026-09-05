"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Clock,
  Users,
  Eye,
  X,
  RefreshCw,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Phone,
  Mail,
} from "lucide-react";
import { toast } from "sonner";

interface ProjectActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: {
    id: string;
    slug?: string;
    name: string;
    builderName?: string;
  } | null;
}

type DatePreset = "today" | "yesterday" | "7days" | "30days" | "all" | "custom";

export function ProjectActivityModal({
  isOpen,
  onClose,
  project,
}: ProjectActivityModalProps) {
  const [mounted, setMounted] = useState(false);
  const [preset, setPreset] = useState<DatePreset>("7days");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

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

  useEffect(() => {
    setMounted(true);
  }, []);

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

  // Fetch real metrics from API whenever project or dates change
  const fetchMetrics = async () => {
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

      if (data.success && data.metrics) {
        setMetrics(data.metrics);
        setSharedMembers(data.sharedMembers || []);
      }
    } catch (err) {
      console.warn("Failed to load activity metrics:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && project) {
      fetchMetrics();
    }
  }, [isOpen, project, startDate, endDate]);

  const handleDownloadExcel = () => {
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
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.setAttribute("download", `ROAD_Activity_${project.name}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setIsDownloading(false);
      toast.success("Excel report downloaded successfully!");
    }, 1000);
  };

  if (!isOpen || !mounted || !project) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-neutral-200 flex flex-col max-h-[90vh] overflow-hidden my-auto animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-white shrink-0">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-neutral-900 leading-tight">
                  Project Activity &amp; Performance
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  100% Real Data
                </span>
              </div>
              <p className="text-xs text-neutral-500 truncate mt-0.5">
                {project.name} {project.builderName ? `• ${project.builderName}` : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1 min-h-0 space-y-6">
          {/* Date Range Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600">
              Select Date Range
            </label>
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
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    preset === p.id
                      ? "bg-neutral-900 text-white shadow-xs font-bold"
                      : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {preset === "custom" && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-[11px] text-neutral-500 font-medium block mb-1">From Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-neutral-500 font-medium block mb-1">To Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* KPI Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Today's Clicks */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
              <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                <span>Today's Clicks</span>
                <Eye className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-neutral-950 mt-2">
                {isLoading ? "..." : metrics.todayClicks}
              </p>
              <span className="text-[10px] text-amber-800/80 font-medium block mt-1">Real visits today</span>
            </div>

            {/* Total Clicks in Period */}
            <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4">
              <div className="flex items-center justify-between text-xs font-bold text-neutral-700">
                <span>Period Clicks</span>
                <Calendar className="w-4 h-4 text-neutral-400" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-neutral-950 mt-2">
                {isLoading ? "..." : metrics.totalClicks}
              </p>
              <span className="text-[10px] text-neutral-500 font-medium block mt-1">In selected range</span>
            </div>

            {/* Average Time Spent */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
              <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                <span>Avg Time</span>
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-neutral-950 mt-2">
                {isLoading ? "..." : metrics.avgDwellFormatted}
              </p>
              <span className="text-[10px] text-blue-700/80 font-medium block mt-1">Dwell time per visitor</span>
            </div>

            {/* Details Shared with Builder */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                <span>Details Shared</span>
                <Users className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-emerald-700 mt-2">
                {isLoading ? "..." : metrics.detailsSharedCount}
              </p>
              <span className="text-[10px] text-emerald-800/80 font-medium block mt-1">Members sent to builder</span>
            </div>
          </div>

          {/* Members Details Shared Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                Members Details Shared With Builder ({sharedMembers.length})
              </h4>
              <button
                type="button"
                onClick={fetchMetrics}
                className="text-xs text-neutral-500 hover:text-neutral-800 flex items-center gap-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>
            </div>

            {sharedMembers.length === 0 ? (
              <div className="p-6 text-center bg-neutral-50 border border-neutral-200 rounded-2xl text-xs text-neutral-500">
                No member details shared with the builder in this date range. Details are shared when a buyer saves the project, clicks WhatsApp Builder, or schedules a site visit.
              </div>
            ) : (
              <div className="border border-neutral-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                <div className="max-h-52 overflow-y-auto divide-y divide-neutral-100">
                  {sharedMembers.map((m) => (
                    <div key={m.sNo} className="p-3 text-xs flex items-center justify-between gap-3 hover:bg-neutral-50">
                      <div className="space-y-0.5 min-w-0">
                        <p className="font-bold text-neutral-900">{m.name}</p>
                        <div className="flex items-center gap-2 text-neutral-500 text-[11px]">
                          <span className="flex items-center gap-1 font-mono">
                            <Phone className="w-3 h-3 text-emerald-600" /> {m.phone}
                          </span>
                          {m.email && m.email !== "-" && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-neutral-400" /> {m.email}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {m.action}
                        </span>
                        <p className="text-[10px] text-neutral-400 mt-0.5">{m.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer with Download Excel button */}
        <div className="p-4 bg-neutral-50 border-t border-neutral-100 shrink-0 flex items-center justify-between gap-3">
          <div className="text-xs text-neutral-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Opens directly in Microsoft Excel with formatted sections</span>
          </div>

          <button
            type="button"
            onClick={handleDownloadExcel}
            disabled={isDownloading}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 text-xs cursor-pointer active:scale-98"
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

  return createPortal(modalContent, document.body);
}
