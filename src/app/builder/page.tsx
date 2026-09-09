"use client";
import { ListingLeadsPanel } from "@/components/admin/listing-leads-panel";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import {
  FolderOpen,
  Calendar,
  Sparkles,
  Eye,
  Users,
  Clock,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Flame,
  MessageSquare,
  Phone,
  FileSpreadsheet,
  Download,
  Building2,
  ExternalLink,
  MapPin,
  CheckCircle2,
  Share2,
  Copy,
  Activity
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from "recharts";
import { useBuilderStore } from "@/stores/builder-store";
import { useProjectsStore } from "@/stores/projects-store";
import { useSchedulesStore, SiteVisitSchedule } from "@/stores/schedules-store";
import { ProjectActivityModal } from "@/components/admin/project-activity-modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function BuilderOverviewPage() {
  const { getCurrentBuilder, requests } = useBuilderStore();
  const { projects } = useProjectsStore();
  const { schedules, updateStatus } = useSchedulesStore();

  const currentBuilder = getCurrentBuilder();

  // STRICT TENANT ISOLATION: Show ONLY assigned projects for this specific builder
  const assignedProjects = useMemo(() => {
    if (!currentBuilder?.assignedProjectIds || currentBuilder.assignedProjectIds.length === 0) return [];
    return projects.filter((p) =>
      currentBuilder.assignedProjectIds.some(
        (id) => id === p.id || id === p.slug
      )
    );
  }, [projects, currentBuilder]);

  // Synchronized site visits / contacts shared for this builder's projects
  const builderSchedules = useMemo(() => {
    if (!currentBuilder?.assignedProjectIds || currentBuilder.assignedProjectIds.length === 0) return [];
    return schedules.filter((s) =>
      currentBuilder.assignedProjectIds.some(
        (pid) => pid === s.projectId || pid === s.projectSlug
      )
    );
  }, [schedules, currentBuilder]);

  const [realtimeReport, setRealtimeReport] = useState<{
    todayClicks: number;
    totalClicks: number;
    avgDwellFormatted: string;
    detailsSharedCount: number;
    sharedMembers: Array<{
      sNo: number;
      date: string;
      name: string;
      phone: string;
      email: string;
      action: string;
      dwellTime: string;
      projectName?: string;
    }>;
  }>({
    todayClicks: 0,
    totalClicks: 0,
    avgDwellFormatted: "0s",
    detailsSharedCount: 0,
    sharedMembers: [],
  });
  const [activityModalProject, setActivityModalProject] = useState<any>(null);

  const [reportError, setReportError] = useState("");
  const [reportUpdated, setReportUpdated] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [monthlyData, setMonthlyData] = useState<Array<{ name: string; views: number; leads: number }>>([]);

  // Fetch real-time activity metrics across all assigned projects
  useEffect(() => {
    if (assignedProjects.length === 0) return;

    let isMounted = true;
    async function loadRealtimeReports() {
      try {
        setReportError("");
        let aggToday = 0;
        let aggTotal = 0;
        let aggDwell = 0;
        let aggShared = 0;
        const allMembers: any[] = [];
        const monthly = new Map<string, { name: string; views: number; leads: number }>();

        for (const p of assignedProjects) {
          const res = await fetch(
            `/api/projects/activity/report?projectId=${p.id}&projectSlug=${p.slug}&projectName=${encodeURIComponent(
              p.name
            )}&format=json`
          );
          const data = await res.json();
          if (!res.ok || !data.success || !data.metrics) throw new Error(data.error || "Activity report unavailable.");
          if (data.success && data.metrics) {
            for (const bucket of data.monthlyActivity || []) {
              const row = monthly.get(bucket.month) || { name: bucket.month, views: 0, leads: 0 };
              row.views += bucket.views; row.leads += bucket.leads; monthly.set(bucket.month, row);
            }
            aggToday += data.metrics.todayClicks || 0;
            aggTotal += data.metrics.totalClicks || 0;
            aggDwell += (data.metrics.avgDwellSeconds || 0) * (data.metrics.totalClicks || 0);
            aggShared += data.metrics.detailsSharedCount || 0;
            if (data.sharedMembers && Array.isArray(data.sharedMembers)) {
              allMembers.push(
                ...data.sharedMembers.map((m: any) => ({
                  ...m,
                  projectName: p.name,
                }))
              );
            }
          }
        }

        if (isMounted) {
          const avgD = aggTotal > 0 ? Math.round(aggDwell / aggTotal) : 0;
          const m = Math.floor(avgD / 60);
          const s = Math.round(avgD % 60);
          const formattedDwell = m === 0 ? `${s}s` : `${m}m ${s}s`;

          setMonthlyData([...monthly.values()].sort((a, b) => a.name.localeCompare(b.name)).slice(-6));
          setReportUpdated(new Date().toLocaleTimeString());
          setRealtimeReport({
            todayClicks: aggToday,
            totalClicks: aggTotal,
            avgDwellFormatted: formattedDwell,
            detailsSharedCount: aggShared,
            sharedMembers: allMembers,
          });
        }
      } catch (err) {
        if (isMounted) setReportError(err instanceof Error ? err.message : "Reports unavailable.");
      }
    }

    loadRealtimeReports();
    return () => {
      isMounted = false;
    };
  }, [assignedProjects, refreshKey]);

  // REAL DATA CALCULATIONS (Zero hardcoded numbers)
  const totalRealViews = useMemo(() => {
    const baseViews = assignedProjects.reduce((sum, p) => sum + (p.viewCount || 0), 0);
    return Math.max(baseViews, realtimeReport.totalClicks);
  }, [assignedProjects, realtimeReport.totalClicks]);

  const upcomingVisitsCount = useMemo(() => {
    return builderSchedules.filter((s) => s.status === "scheduled").length;
  }, [builderSchedules]);

  const totalContactsShared = useMemo(() => {
    return builderSchedules.length + realtimeReport.detailsSharedCount;
  }, [builderSchedules.length, realtimeReport.detailsSharedCount]);

  // Inventory by Type / Project (Recharts Bar Chart - same as Admin Portal)
  const inventoryData = useMemo(() => {
    if (assignedProjects.length === 0) return [];
    return assignedProjects.map((p) => ({
      name: p.name.length > 18 ? p.name.slice(0, 18) + "..." : p.name,
      views: p.viewCount || 0,
      tours: builderSchedules.filter((s) => s.projectId === p.id || s.projectSlug === p.slug).length,
    }));
  }, [assignedProjects, builderSchedules]);

  // EXCEL / CSV DOWNLOAD
  const handleDownloadExcel = () => {
    if (assignedProjects.length === 0 && builderSchedules.length === 0) {
      toast.error("No active project data available to export.");
      return;
    }

    const builderName = currentBuilder?.companyName || "Builder";
    const dateStr = new Date().toISOString().split("T")[0];

    const cell = (value: unknown) => {
      let text = String(value ?? "");
      if (/^[=+\-@\t\r]/.test(text.trimStart())) text = "'" + text;
      return '"' + text.replace(/"/g, '""') + '"';
    };
    // UTF-8 BOM for seamless Microsoft Excel compatibility
    let csvContent = "\uFEFF";

    // 1. Executive Summary
    csvContent += `ROAD FACING - BUILDER PERFORMANCE REPORT\n`;
    csvContent += `Company Name,${cell(builderName)}\n`;
    csvContent += `RERA Number,${cell(currentBuilder?.reraNumber || "N/A")}\n`;
    csvContent += `Developer Tier,${cell(currentBuilder?.tier || "Standard")}\n`;
    csvContent += `Generated On,${new Date().toLocaleString()}\n\n`;

    // 2. Project Inventory Table
    csvContent += `PROJECT INVENTORY & PERFORMANCE\n`;
    csvContent += `Project Name,Category / Type,Location,Verified Clicks / Views,Contacts / Tours Booked,RERA ID\n`;
    assignedProjects.forEach((p) => {
      const tours = builderSchedules.filter((s) => s.projectId === p.id || s.projectSlug === p.slug).length;
      const locStr = typeof p.location === "string" ? p.location : p.location?.city || "AP";
      csvContent += [p.name, p.projectType, locStr, p.viewCount || 0, tours, p.reraId || ""].map(cell).join(",") + "\n";
    });

    // 3. Contacts Shared & Tour Bookings Table
    csvContent += `\nCUSTOMER CONTACTS SHARED & SITE VISITS\n`;
    csvContent += `Customer Name,Phone Number,Email,Project,Visit Date,Time Slot,Status,Notes\n`;
    if (builderSchedules.length > 0) {
      builderSchedules.forEach((s) => {
        csvContent += [s.customerName, s.customerPhone, s.customerEmail, s.projectName, s.visitDate, s.timeSlot, s.status, s.notes].map(cell).join(",") + "\n";
      });
    } else {
      csvContent += `No site visit contacts shared yet for assigned ventures.,,,,,,\n`;
    }

    // 4. Realtime Shared Buyer Contacts (WhatsApp Reveals & Inquiries)
    if (realtimeReport.sharedMembers.length > 0) {
      csvContent += `\nVERIFIED BUYER CONTACTS SHARED (WHATSAPP & DIRECT INQUIRIES)\n`;
      csvContent += `Buyer Name,Phone Number,Email,Venture,Action Taken,Date & Time,Dwell Time\n`;
      realtimeReport.sharedMembers.forEach((m) => {
        csvContent += [m.name, m.phone, m.email, m.projectName || builderName, m.action, m.date, m.dwellTime].map(cell).join(",") + "\n";
      });
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `ROAD_Builder_Report_${currentBuilder?.slug || "portal"}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Excel performance sheet downloaded successfully!");
  };

  const copyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    toast.success(`Copied phone: ${phone}`);
  };

  return (
    <div className="space-y-8 pb-16">
      <ListingLeadsPanel />
      <div className="flex items-center gap-3 text-sm"><Button variant="outline" onClick={() => setRefreshKey(key => key + 1)}>Refresh reports</Button><span>{reportUpdated ? "Updated " + reportUpdated : assignedProjects.length ? "Reports loading" : "No assigned projects"}</span></div>
      {reportError && <p role="alert" className="text-red-500">{reportError} — displayed figures may be out of date.</p>}
      {/* 1. BUILDER HEADER WITH REAL INFO */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-zinc-950 p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            {currentBuilder?.logoUrl ? (
              <img
                src={currentBuilder.logoUrl}
                alt={currentBuilder.companyName}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-amber-500/40 shadow-xl shrink-0"
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 flex items-center justify-center text-amber-400 font-bold text-2xl shrink-0 shadow-xl">
                {currentBuilder?.companyName?.charAt(0) || "B"}
              </div>
            )}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {currentBuilder?.companyName || "Developer Partner"}
                </h1>
                {currentBuilder?.isVerified && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <ShieldCheck className="h-3.5 w-3.5" /> Verified builder
                  </span>
                )}
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  {currentBuilder?.tier || "Standard"} Developer
                </span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-300 max-w-2xl line-clamp-1 font-medium">
                {currentBuilder?.tagline || "Real Estate Developer Portal"}
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400 pt-0.5">
                <span>RERA: <strong className="text-zinc-200">{currentBuilder?.reraNumber || "Approved"}</strong></span>
                <span>•</span>
                <span>Assigned Projects: <strong className="text-amber-400">{assignedProjects.length} Active</strong></span>
                {currentBuilder?.contactPhone && (
                  <>
                    <span>•</span>
                    <span>Direct Desk: <strong className="text-zinc-200">{currentBuilder.contactPhone}</strong></span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ACTION BUTTONS: DOWNLOAD EXCEL SHEET */}
          <div className="flex items-center gap-3 shrink-0">
            <Button
              onClick={handleDownloadExcel}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md gap-2 py-2 px-4 rounded-xl"
            >
              <FileSpreadsheet className="h-4 w-4 text-white" />
              Download Excel Sheet
            </Button>
            <Link
              href="/builder/requests"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 hover:text-amber-300 text-xs font-bold transition-all shadow-sm"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Req Concierge
            </Link>
          </div>
        </div>
      </div>

      {/* 2. REAL METRIC CARDS (STRICTLY ASSIGNED DATA) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CARD 1: REAL CLICKS / VIEWS */}
        <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Property Clicks & Views
            </span>
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Eye className="h-4 w-4" />
            </span>
          </div>
          <div className="text-3xl font-extrabold text-foreground mt-3">
            {totalRealViews.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Real visitor views on your {assignedProjects.length} assigned venture{assignedProjects.length === 1 ? "" : "s"}
          </p>
        </div>

        {/* CARD 2: CONTACTS SHARED / TOURS */}
        <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Contacts Shared / Leads
            </span>
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <Share2 className="h-4 w-4" />
            </span>
          </div>
          <div className="text-3xl font-extrabold text-foreground mt-3">
            {totalContactsShared}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Prospective buyers who booked tours or requested contact
          </p>
        </div>

        {/* CARD 3: SITE VISITS */}
        <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Site Visits (Two-Way Sync)
            </span>
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <Calendar className="h-4 w-4" />
            </span>
          </div>
          <div className="text-3xl font-extrabold text-foreground mt-3">
            {builderSchedules.length}
          </div>
          <p className="text-xs text-amber-400 mt-1 font-semibold flex items-center gap-1">
            <Clock className="h-3 w-3" /> {upcomingVisitsCount} Upcoming Scheduled Tour{upcomingVisitsCount === 1 ? "" : "s"}
          </p>
        </div>

        {/* CARD 4: CONCIERGE REQUESTS */}
        <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Concierge Requests
            </span>
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Sparkles className="h-4 w-4" />
            </span>
          </div>
          <div className="text-3xl font-extrabold text-foreground mt-3">
            {requests.filter((r) => r.builderId === currentBuilder?.id).length}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Direct marketing tickets & admin communications
          </p>
        </div>
      </div>

      {/* 3. ADMIN-STYLE ANALYTICS CHARTS (RECHARTS - REAL INVENTORY DATA) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CHART 1: TRAFFIC & CONTACTS (AREA CHART) */}
        <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-foreground">Traffic & Leads (6 Months)</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Real trajectory across your assigned ventures</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
                <span className="text-muted-foreground">Views / Clicks</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                <span className="text-muted-foreground">Contacts / Leads</span>
              </div>
            </div>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="builderColorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="builderColorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.25} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px', fontSize: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="views" name="Property Views" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#builderColorViews)" />
                <Area type="monotone" dataKey="leads" name="Contacts Shared" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#builderColorLeads)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: INVENTORY & ENGAGEMENT (BAR CHART) */}
        <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-foreground">Assigned Inventory Engagement</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Views & tours per assigned project</p>
            </div>
            <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
              {assignedProjects.length} Venture{assignedProjects.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="h-[280px] w-full">
            {inventoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={inventoryData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.25} />
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px', fontSize: '12px' }}
                  />
                  <Bar dataKey="views" name="Total Views" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="tours" name="Site Tours" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-muted/10 rounded-xl border border-dashed border-border/60">
                <FolderOpen className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm font-semibold text-foreground">No projects mapped</p>
                <p className="text-xs text-muted-foreground">Admin will assign your ventures to display engagement here.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. REAL CONTACTS SHARED & SITE VISITS TABLE */}
      <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Phone className="h-5 w-5 text-emerald-500" />
              Contacts Shared & Site Visit Tours
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Buyers who booked tours or requested developer contact for your assigned ventures.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadExcel}
              className="text-xs border-zinc-700 hover:bg-zinc-800 flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5 text-amber-400" /> Export to Excel
            </Button>
            <Link
              href="/builder/schedules"
              className="text-xs font-bold text-amber-500 hover:text-amber-400 flex items-center gap-1"
            >
              Open Schedules Calendar <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {builderSchedules.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-border/50">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">Contact Phone</th>
                  <th className="py-3 px-4">Interested Venture</th>
                  <th className="py-3 px-4">Visit Date & Slot</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {builderSchedules.map((schedule) => {
                  const cleanPhone = schedule.customerPhone.replace(/[^0-9]/g, "");
                  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                    `Hello ${schedule.customerName}, this is ${currentBuilder?.companyName || "the developer"}. Confirming your site visit to ${schedule.projectName} on ${schedule.visitDate} at ${schedule.timeSlot}. Our site engineer will welcome you!`
                  )}`;

                  return (
                    <tr key={schedule.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-foreground">
                        {schedule.customerName}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium text-foreground">
                        <div className="flex items-center gap-1.5">
                          <span>{schedule.customerPhone}</span>
                          <button
                            type="button"
                            onClick={() => copyPhone(schedule.customerPhone)}
                            className="text-muted-foreground hover:text-amber-400 p-0.5 rounded transition-colors"
                            title="Copy phone"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground font-medium">
                        {schedule.projectName}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-foreground">{schedule.visitDate}</div>
                        <div className="text-[11px] text-amber-400 font-mono">{schedule.timeSlot}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <select
                          value={schedule.status}
                          onChange={(e) => updateStatus(schedule.id, e.target.value as any)}
                          className={cn(
                            "text-[11px] font-bold rounded-lg px-2 py-1 border transition-all focus:outline-none",
                            schedule.status === "scheduled"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                              : schedule.status === "completed"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : "bg-red-500/10 text-red-400 border-red-500/30"
                          )}
                        >
                          <option value="scheduled" className="bg-zinc-900 text-amber-400">Scheduled</option>
                          <option value="completed" className="bg-zinc-900 text-emerald-400">Completed</option>
                          <option value="cancelled" className="bg-zinc-900 text-red-400">Cancelled</option>
                        </select>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 transition-colors"
                            title="Confirm on WhatsApp"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                          </a>
                          <a
                            href={`tel:${schedule.customerPhone}`}
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 transition-colors"
                            title="Call Customer"
                          >
                            <Phone className="h-3.5 w-3.5 text-amber-400" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center bg-muted/10 border border-dashed border-border/60 rounded-xl space-y-2">
            <Users className="h-8 w-8 text-muted-foreground mx-auto" />
            <h4 className="text-sm font-semibold text-foreground">No direct contacts or tours shared yet</h4>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              When prospective buyers view your property listing on ROAD Facing and schedule a site visit or reveal your contact, their details will appear here automatically.
            </p>
          </div>
        )}
      </div>

      {/* 5. ASSIGNED PROJECTS INVENTORY LIST */}
      <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-amber-500" />
              Assigned Project Inventory & Performance
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live properties mapped to your developer partner credentials by ROAD Admin.
            </p>
          </div>
          <Link
            href="/builder/projects"
            className="text-xs font-bold text-amber-500 hover:text-amber-400 flex items-center gap-1"
          >
            Open Guarded Content Editor <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {assignedProjects.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-border/50">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Project Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Real Views / Clicks</th>
                  <th className="py-3 px-4">Tours Booked</th>
                  <th className="py-3 px-4 text-right">Content Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {assignedProjects.map((p) => {
                  const tours = builderSchedules.filter((s) => s.projectId === p.id || s.projectSlug === p.slug).length;
                  const locStr = typeof p.location === "string" ? p.location : p.location?.city || "Vijayawada, AP";

                  return (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-foreground">
                        <div className="flex items-center gap-3">
                          {p.coverImage ? (
                            <img src={p.coverImage} alt={p.name} className="w-10 h-10 rounded-lg object-cover border border-border shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-bold text-amber-400 shrink-0">
                              {p.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <span className="text-foreground hover:text-amber-400 transition-colors">{p.name}</span>
                            <div className="text-[10px] text-muted-foreground">RERA: {(p as any).reraId || (p as any).reraNumber || currentBuilder?.reraNumber || "Approved"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground">
                        {p.projectType || "Residential Venture"}
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-amber-500" />
                          <span>{locStr}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-500">
                        {(p.viewCount || 0).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                        {tours} tour{tours === 1 ? "" : "s"}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setActivityModalProject(p)}
                            className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 transition-colors cursor-pointer"
                            title="Realtime Activity & Excel Report"
                          >
                            <FileSpreadsheet className="h-3.5 w-3.5" />
                          </button>
                          <Link
                            href={`/projects/${p.slug}`}
                            target="_blank"
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 transition-colors"
                            title="View Public Listing"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                          <Link
                            href="/builder/projects"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 text-xs font-semibold"
                          >
                            Edit Text
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center bg-muted/10 border border-dashed border-border/60 rounded-xl space-y-2">
            <Building2 className="h-8 w-8 text-muted-foreground mx-auto" />
            <h4 className="text-sm font-semibold text-foreground">No ventures currently mapped</h4>
            <p className="text-xs text-muted-foreground">
              ROAD Administrator will assign your properties to this partner console.
            </p>
          </div>
        )}
      </div>

      {/* 6. CONCIERGE AMPLIFICATION LAUNCHPAD */}
      <div className="bg-card border border-amber-500/20 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Concierge Request Launchpad
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Amplify views and contact reveals by requesting premium shelf spots, homepage hero banners, or lead chat.
            </p>
          </div>
          <Link
            href="/builder/requests"
            className="text-xs font-semibold text-amber-500 hover:text-amber-400 flex items-center gap-1"
          >
            View All Requests ({requests.filter((r) => r.builderId === currentBuilder?.id).length}) <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/builder/requests?type=promote_top"
            className="p-4 rounded-xl bg-muted/30 hover:bg-muted/60 border border-border/50 hover:border-amber-500/40 transition-all group"
          >
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-500 w-fit mb-3 group-hover:scale-105 transition-transform">
              <Flame className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-xs text-foreground group-hover:text-amber-400 transition-colors">
              Promote at Top of Shelf
            </h3>
            <p className="text-[11px] text-muted-foreground mt-1">
              Pin your project to the very top of category and search results.
            </p>
          </Link>

          <Link
            href="/builder/requests?type=publish_banner"
            className="p-4 rounded-xl bg-muted/30 hover:bg-muted/60 border border-border/50 hover:border-purple-500/40 transition-all group"
          >
            <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400 w-fit mb-3 group-hover:scale-105 transition-transform">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-xs text-foreground group-hover:text-purple-400 transition-colors">
              Publish in Hero Banner
            </h3>
            <p className="text-[11px] text-muted-foreground mt-1">
              Submit high-resolution banner creatives for the homepage spotlight.
            </p>
          </Link>

          <Link
            href="/builder/requests?type=enable_chat"
            className="p-4 rounded-xl bg-muted/30 hover:bg-muted/60 border border-border/50 hover:border-emerald-500/40 transition-all group"
          >
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 w-fit mb-3 group-hover:scale-105 transition-transform">
              <MessageSquare className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-xs text-foreground group-hover:text-emerald-400 transition-colors">
              Enable Direct Buyer Chat
            </h3>
            <p className="text-[11px] text-muted-foreground mt-1">
              Route real-time WhatsApp & in-app inquiries directly to your sales managers.
            </p>
          </Link>

          <Link
            href="/builder/requests?type=caption_change"
            className="p-4 rounded-xl bg-muted/30 hover:bg-muted/60 border border-border/50 hover:border-blue-500/40 transition-all group"
          >
            <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 w-fit mb-3 group-hover:scale-105 transition-transform">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-xs text-foreground group-hover:text-blue-400 transition-colors">
              Request Caption Change
            </h3>
            <p className="text-[11px] text-muted-foreground mt-1">
              Submit proposed marketing captions or legal adjustments for admin sign-off.
            </p>
          </Link>
        </div>
      </div>

      {/* Standalone Project Real Activity & Excel Export Modal */}
      <ProjectActivityModal
        isOpen={Boolean(activityModalProject)}
        onClose={() => setActivityModalProject(null)}
        project={activityModalProject}
      />
    </div>
  );
}
