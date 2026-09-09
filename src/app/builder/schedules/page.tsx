"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  Building2,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Send,
  Bell,
  Check,
  X
} from "lucide-react";
import { useSchedulesStore, SiteVisitSchedule } from "@/stores/schedules-store";
import { useBuilderStore } from "@/stores/builder-store";
import { formatWhatsAppPhone } from "@/lib/whatsapp/whatsapp-share";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function BuilderSchedulesPage() {
  const { schedules, fetchSchedules, updateStatus, isLoading } = useSchedulesStore();
  const { getCurrentBuilder } = useBuilderStore();

  const currentBuilder = getCurrentBuilder();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "scheduled" | "completed" | "cancelled">("all");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchSchedules();
    setIsRefreshing(false);
    toast.success("Site visit schedules synchronized with central admin.");
  };

  // FILTER ONLY VISITS FOR ASSIGNED PROJECTS (Two-Way Sync Isolation)
  const assignedSchedules = useMemo(() => {
    if (!currentBuilder?.assignedProjectIds) return [];
    return schedules.filter((s) =>
      currentBuilder.assignedProjectIds.some(
        (pid) => pid === s.projectId || s.projectId.includes(pid) || pid.includes(s.projectId)
      )
    );
  }, [schedules, currentBuilder]);

  // Apply search and status filters
  const filteredSchedules = useMemo(() => {
    return assignedSchedules.filter((s) => {
      const matchesSearch =
        s.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.customerPhone.includes(searchQuery) ||
        s.projectName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || s.status === statusFilter;
      const matchesProject = selectedProjectId === "all" || s.projectId === selectedProjectId;

      return matchesSearch && matchesStatus && matchesProject;
    });
  }, [assignedSchedules, searchQuery, statusFilter, selectedProjectId]);

  // Handle status update (Syncs with admin simultaneously)
  const handleStatusChange = async (scheduleId: string, newStatus: "scheduled" | "completed" | "cancelled") => {
    await updateStatus(scheduleId, newStatus);
    toast.success(`Schedule marked as ${newStatus}. Synced with Admin.`);
  };

  // Build WhatsApp confirmation link
  const getWhatsAppConfirmationUrl = (schedule: SiteVisitSchedule) => {
    const rawPhone = schedule.customerPhone.replace(/[^0-9]/g, "");
    const formattedPhone = rawPhone.startsWith("91") ? rawPhone : `91${rawPhone}`;
    const text = encodeURIComponent(
      `Hello ${schedule.customerName}, this is the official sales management desk for ${schedule.projectName}. We are pleased to confirm your scheduled site visit tour on ${schedule.visitDate} at ${schedule.timeSlot}. Our project advisors look forward to hosting you!`
    );
    return `https://wa.me/${formattedPhone}?text=${text}`;
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="border-b border-border/40 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Calendar className="h-6 w-6 text-amber-500" />
              Site Visit Schedules & Tours
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
              Two-Way Synced
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Any tour appointment booked by buyers or assigned by ROAD Admin automatically reflects here in real time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            className="text-xs h-9 gap-1.5"
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
            Sync Now
          </Button>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border/50 rounded-xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Upcoming Scheduled Tours</span>
          <div className="text-2xl font-bold text-amber-500 mt-1">
            {assignedSchedules.filter((s) => s.status === "scheduled").length}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">Awaiting site visit</p>
        </div>

        <div className="bg-card border border-border/50 rounded-xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Completed Tours</span>
          <div className="text-2xl font-bold text-emerald-500 mt-1">
            {assignedSchedules.filter((s) => s.status === "completed").length}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">Successfully conducted</p>
        </div>

        <div className="bg-card border border-border/50 rounded-xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Total Visits Booked</span>
          <div className="text-2xl font-bold text-foreground mt-1">{assignedSchedules.length}</div>
          <p className="text-xs text-muted-foreground mt-0.5">Across your assigned projects</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border/50">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customer name, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg bg-background border border-border text-foreground"
          >
            <option value="all">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Schedules List */}
      <div className="space-y-4">
        {filteredSchedules.length > 0 ? (
          filteredSchedules.map((schedule) => (
            <div
              key={schedule.id}
              className={cn(
                "bg-card border rounded-xl p-5 shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-4",
                schedule.status === "scheduled" ? "border-amber-500/40 bg-amber-500/[0.01]" : "border-border/50"
              )}
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                    <User className="h-4 w-4 text-amber-500" />
                    {schedule.customerName}
                  </h3>
                  <span
                    className={cn(
                      "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      schedule.status === "scheduled"
                        ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                        : schedule.status === "completed"
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                    )}
                  >
                    {schedule.status}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-amber-500" />
                    {schedule.projectName}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-mono text-zinc-300">
                    <Calendar className="h-3.5 w-3.5 text-blue-400" />
                    {schedule.visitDate}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-mono text-zinc-300">
                    <Clock className="h-3.5 w-3.5 text-purple-400" />
                    {schedule.timeSlot}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3 text-emerald-400" />
                    {schedule.customerPhone}
                  </span>
                  {schedule.customerEmail && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3 text-blue-400" />
                        {schedule.customerEmail}
                      </span>
                    </>
                  )}
                  {schedule.notes && (
                    <>
                      <span>•</span>
                      <span className="italic text-zinc-400">Note: {schedule.notes}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <a
                  href={getWhatsAppConfirmationUrl(schedule)}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-semibold inline-flex items-center gap-1.5 transition-all"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Confirm via WhatsApp
                </a>

                {schedule.status === "scheduled" && (
                  <>
                    <Button
                      onClick={() => handleStatusChange(schedule.id, "completed")}
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 gap-1"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Mark Conducted
                    </Button>
                    <Button
                      onClick={() => handleStatusChange(schedule.id, "cancelled")}
                      variant="ghost"
                      size="sm"
                      className="text-xs text-rose-400 hover:bg-rose-500/10 h-8 gap-1"
                    >
                      <X className="h-3.5 w-3.5" />
                      Cancel
                    </Button>
                  </>
                )}

                {schedule.status === "completed" && (
                  <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" /> Tour Completed
                  </span>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="p-12 text-center bg-card border border-dashed border-border rounded-2xl text-muted-foreground text-xs">
            No site visits found matching your filters.
          </div>
        )}
      </div>
    </div>
  );
}
