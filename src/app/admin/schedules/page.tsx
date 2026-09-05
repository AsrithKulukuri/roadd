"use client";

import React, { useEffect, useState, useMemo } from "react";
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
  ChevronDown,
  Trash2,
  Send,
  Bell,
  Sparkles,
} from "lucide-react";
import { useSchedulesStore, SiteVisitSchedule } from "@/stores/schedules-store";
import { formatWhatsAppPhone } from "@/lib/whatsapp/whatsapp-share";
import { toast } from "sonner";

export default function AdminSchedulesPage() {
  const {
    schedules,
    isLoading,
    fetchSchedules,
    updateStatus,
    deleteSchedule,
    getUpcomingCount,
    getTodayCount,
  } = useSchedulesStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "scheduled" | "completed" | "cancelled">("all");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchSchedules();
    setIsRefreshing(false);
    toast.success("Schedules refreshed");
  };

  // Extract unique projects for dropdown
  const uniqueProjects = useMemo(() => {
    const set = new Set<string>();
    schedules.forEach((s) => {
      if (s.projectName) set.add(s.projectName);
    });
    return Array.from(set);
  }, [schedules]);

  // Filtered schedules
  const filteredSchedules = useMemo(() => {
    return schedules.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (selectedProject !== "all" && s.projectName !== selectedProject) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = s.customerName?.toLowerCase().includes(q);
        const matchPhone = s.customerPhone?.includes(q);
        const matchProject = s.projectName?.toLowerCase().includes(q);
        const matchLocation = s.projectLocation?.toLowerCase().includes(q);
        const matchDate = s.visitDate?.toLowerCase().includes(q);
        return matchName || matchPhone || matchProject || matchLocation || matchDate;
      }
      return true;
    });
  }, [schedules, statusFilter, selectedProject, searchQuery]);

  const upcomingCount = getUpcomingCount();
  const todayCount = getTodayCount();
  const completedCount = schedules.filter((s) => s.status === "completed").length;

  const handleStatusChange = async (id: string, newStatus: "scheduled" | "completed" | "cancelled") => {
    try {
      await updateStatus(id, newStatus);
      toast.success(`Schedule status updated to ${newStatus}`);
    } catch {
      toast.error("Failed to update schedule status");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to remove this visit schedule?")) {
      await deleteSchedule(id);
      toast.success("Schedule deleted");
    }
  };

  const handleSendReminderManually = async (schedule: SiteVisitSchedule) => {
    const cleanPhone = formatWhatsAppPhone(schedule.customerPhone);
    if (!cleanPhone) {
      toast.error("No valid customer phone number");
      return;
    }

    const text = encodeURIComponent(
      `Site Visit Reminder! ⏰\n\nHello ${schedule.customerName}, your site visit for *${schedule.projectName}* is scheduled for today at *${schedule.timeSlot}*.\n\n📍 Location: ${schedule.projectLocation || "Site"}\n\nOur site team is expecting you. See you soon!`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, "_blank");
  };

  const handleChatCustomer = (schedule: SiteVisitSchedule) => {
    const cleanPhone = formatWhatsAppPhone(schedule.customerPhone);
    if (!cleanPhone) return;
    const text = encodeURIComponent(
      `Hello ${schedule.customerName}, this is regarding your upcoming site visit for *${schedule.projectName}* on *${schedule.visitDate}* (${schedule.timeSlot}). How can we assist you?`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, "_blank");
  };

  const handleChatBuilder = (schedule: SiteVisitSchedule) => {
    const cleanPhone = formatWhatsAppPhone(schedule.builderPhone || "");
    if (!cleanPhone) {
      toast.info("No direct builder phone registered for this project");
      return;
    }
    const text = encodeURIComponent(
      `Hello, customer *${schedule.customerName}* (${schedule.customerPhone}) has scheduled a site visit for *${schedule.projectName}* on *${schedule.visitDate}* at *${schedule.timeSlot}*. Please ensure team availability.`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, "_blank");
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 font-bold">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
                Site Visit Schedules
              </h1>
              <p className="text-xs text-neutral-500">
                Manage upcoming customer property tours with automated WhatsApp alerts
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing || isLoading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-neutral-300 text-neutral-800 text-xs font-semibold hover:bg-neutral-50 transition-all shadow-xs"
        >
          <RefreshCw className={`w-4 h-4 text-neutral-600 ${isRefreshing ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Total Bookings</span>
            <Calendar className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-neutral-900 mt-2">{schedules.length}</p>
          <span className="text-[11px] text-neutral-500 mt-1 block">Lifetime site visits</span>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Upcoming</span>
            <Clock className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-600 mt-2">{upcomingCount}</p>
          <span className="text-[11px] text-neutral-500 mt-1 block">Scheduled visits</span>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Today's Visits</span>
            <Sparkles className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-600 mt-2">{todayCount}</p>
          <span className="text-[11px] text-neutral-500 mt-1 block">Due today</span>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-neutral-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-neutral-900 mt-2">{completedCount}</p>
          <span className="text-[11px] text-neutral-500 mt-1 block">Visited & checked in</span>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-neutral-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by customer, phone, project..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:bg-white transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status Tabs */}
          <div className="inline-flex p-1 bg-neutral-100 rounded-xl border border-neutral-200 text-xs font-semibold">
            {(["all", "scheduled", "completed", "cancelled"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-lg capitalize transition-all ${
                  statusFilter === tab
                    ? "bg-white text-neutral-950 shadow-xs font-bold"
                    : "text-neutral-600 hover:text-neutral-950"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Project Filter */}
          {uniqueProjects.length > 0 && (
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium text-neutral-800 focus:outline-none"
            >
              <option value="all">All Projects ({uniqueProjects.length})</option>
              {uniqueProjects.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Schedules List */}
      <div className="space-y-3">
        {filteredSchedules.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-neutral-200">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-neutral-900">No site visits found</h3>
            <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your search terms or filter settings."
                : "When prospective buyers schedule visits from project pages, they will appear here with WhatsApp alert records."}
            </p>
          </div>
        ) : (
          filteredSchedules.map((schedule) => {
            const isScheduled = schedule.status === "scheduled";
            const isCompleted = schedule.status === "completed";
            const isCancelled = schedule.status === "cancelled";

            return (
              <div
                key={schedule.id}
                className="bg-white rounded-2xl border border-neutral-200 p-4 sm:p-5 shadow-xs hover:border-neutral-300 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                {/* Left: Customer & Project Details */}
                <div className="space-y-2.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                        isScheduled
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : isCompleted
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "bg-red-50 text-red-700 border border-red-200"
                      }`}
                    >
                      {schedule.status}
                    </span>

                    <span className="text-xs font-mono text-neutral-400">
                      ID: {schedule.id.slice(0, 16)}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
                    <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                      <User className="w-4 h-4 text-neutral-400" />
                      {schedule.customerName}
                    </h3>
                    <span className="text-xs font-semibold text-neutral-600 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-neutral-400" />
                      {schedule.customerPhone}
                    </span>
                    {schedule.customerEmail && (
                      <span className="text-xs text-neutral-500 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-neutral-400" />
                        {schedule.customerEmail}
                      </span>
                    )}
                  </div>

                  {/* Project info */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-600">
                    <div className="flex items-center gap-1.5 font-medium text-neutral-900">
                      <Building2 className="w-3.5 h-3.5 text-amber-500" />
                      {schedule.projectSlug ? (
                        <Link
                          href={`/projects/${schedule.projectSlug}`}
                          target="_blank"
                          className="hover:text-amber-600 underline decoration-neutral-300 flex items-center gap-1"
                        >
                          {schedule.projectName}
                          <ExternalLink className="w-3 h-3 text-neutral-400" />
                        </Link>
                      ) : (
                        <span>{schedule.projectName}</span>
                      )}
                    </div>
                    {schedule.projectLocation && (
                      <div className="flex items-center gap-1 text-neutral-500">
                        <MapPin className="w-3 h-3 text-neutral-400" />
                        <span>{schedule.projectLocation}</span>
                      </div>
                    )}
                  </div>

                  {/* Notes if present */}
                  {schedule.notes && (
                    <p className="text-xs text-neutral-600 bg-neutral-50 p-2 rounded-lg border border-neutral-100 italic">
                      "{schedule.notes}"
                    </p>
                  )}

                  {/* Notification Status Badges */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md font-medium ${
                        schedule.customerNotified
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-neutral-100 text-neutral-500"
                      }`}
                    >
                      <MessageSquare className="w-3 h-3" />
                      {schedule.customerNotified ? "Customer Notified via WhatsApp" : "Customer Notification Pending"}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md font-medium ${
                        schedule.builderNotified
                          ? "bg-blue-50 text-blue-700"
                          : "bg-neutral-100 text-neutral-500"
                      }`}
                    >
                      <Bell className="w-3 h-3" />
                      {schedule.builderNotified ? "Builder Dispatched" : "Builder Pending"}
                    </span>

                    {schedule.reminderSent && (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md font-medium bg-amber-50 text-amber-800">
                        <Clock className="w-3 h-3" />
                        1-Hr Reminder Sent
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Date Slot Box & Action Controls */}
                <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-3 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-neutral-100">
                  {/* Scheduled Date & Time box */}
                  <div className="bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2 text-right">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-900 justify-end">
                      <Calendar className="w-3.5 h-3.5 text-amber-500" />
                      <span>{schedule.visitDate}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 justify-end mt-0.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{schedule.timeSlot}</span>
                    </div>
                  </div>

                  {/* WhatsApp Quick Actions */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleChatCustomer(schedule)}
                      title="WhatsApp Customer"
                      className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Customer</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleChatBuilder(schedule)}
                      title="WhatsApp Builder"
                      className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-900 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
                    >
                      <Building2 className="w-3.5 h-3.5 text-amber-400" />
                      <span>Builder</span>
                    </button>

                    {isScheduled && (
                      <button
                        type="button"
                        onClick={() => handleSendReminderManually(schedule)}
                        title="Send 1-hour WhatsApp reminder manually"
                        className="p-1.5 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 rounded-lg text-xs transition-all"
                      >
                        <Bell className="w-3.5 h-3.5 text-amber-500" />
                      </button>
                    )}
                  </div>

                  {/* Status Change & Delete */}
                  <div className="flex items-center gap-2">
                    {isScheduled && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(schedule.id, "completed")}
                        className="text-xs text-emerald-700 hover:underline font-semibold"
                      >
                        Mark Completed
                      </button>
                    )}
                    {isScheduled && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(schedule.id, "cancelled")}
                        className="text-xs text-red-600 hover:underline font-semibold"
                      >
                        Cancel
                      </button>
                    )}
                    {(isCompleted || isCancelled) && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(schedule.id, "scheduled")}
                        className="text-xs text-blue-600 hover:underline font-semibold"
                      >
                        Re-schedule
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(schedule.id)}
                      title="Delete Schedule"
                      className="text-neutral-400 hover:text-red-600 p-1 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
