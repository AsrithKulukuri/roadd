"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import type { Project } from "@/types/project";
import { useSchedulesStore, type SiteVisitSchedule } from "@/stores/schedules-store";
import { readActionSession } from "@/lib/action-auth";

interface ProjectScheduleSectionProps {
  project: Project;
  onOpenScheduleModal: (preselectedSlot?: { date: string; timeSlot: string }) => void;
  className?: string;
}

const TIME_SLOTS = [
  "10:00 AM - 11:00 AM",
  "11:30 AM - 12:30 PM",
  "02:00 PM - 03:00 PM",
  "03:30 PM - 04:30 PM",
  "05:00 PM - 06:00 PM",
];

function getUpcomingDays() {
  const days = [];
  const today = new Date();
  for (let i = 1; i <= 6; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push({
      iso: d.toISOString().slice(0, 10),
      dayName: d.toLocaleDateString("en-US", { weekday: "short" }),
      dateNum: d.getDate(),
      monthName: d.toLocaleDateString("en-US", { month: "short" }),
      formatted: d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    });
  }
  return days;
}

export function ProjectScheduleSection({
  project,
  onOpenScheduleModal,
  className = "",
}: ProjectScheduleSectionProps) {
  const upcomingDays = useMemo(() => getUpcomingDays(), []);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState(TIME_SLOTS[0]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [hasInitError, setHasInitError] = useState(false);

  const schedules = useSchedulesStore((s) => s.schedules);

  // Check if current visitor has already scheduled a visit for this project
  const existingSchedule = useMemo(() => {
    if (!project?.id && !project?.slug) return null;
    return schedules.find(
      (s: SiteVisitSchedule) =>
        (s.projectId === project.id || (project.slug && s.projectSlug === project.slug)) &&
        s.status !== "cancelled"
    );
  }, [project.id, project.slug, schedules]);

  // Pre-warm schedule and user session concurrently
  const loadScheduleData = useCallback(async () => {
    setIsInitializing(true);
    setHasInitError(false);
    try {
      // Parallel fetch of user session and schedules store check
      await Promise.allSettled([
        readActionSession().catch(() => null),
        new Promise((resolve) => setTimeout(resolve, 60)),
      ]);
    } catch {
      setHasInitError(true);
    } finally {
      setIsInitializing(false);
    }
  }, []);

  useEffect(() => {
    loadScheduleData();
  }, [loadScheduleData]);

  const selectedDay = upcomingDays[selectedDayIndex] || upcomingDays[0];

  const handleBookVisit = () => {
    onOpenScheduleModal({
      date: selectedDay.formatted,
      timeSlot: selectedSlot,
    });
  };

  return (
    <div
      className={`bg-white dark:bg-bg-card border border-border-default rounded-3xl p-4 sm:p-6 shadow-sm transition-all ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-border-default/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-extrabold text-sm sm:text-base text-text-primary leading-tight">
              Site Visit & Availability
            </h4>
            <p className="text-[11px] text-text-tertiary">Free assisted walkthrough with site engineer</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Open Daily</span>
        </div>
      </div>

      {/* Loading Skeleton (Compact inline placeholder, never a full-page blocker) */}
      {isInitializing && (
        <div className="py-4 space-y-3 animate-pulse">
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-3/4" />
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 w-14 bg-slate-200 dark:bg-slate-800 rounded-xl" />
            ))}
          </div>
          <div className="h-9 bg-slate-200 dark:bg-slate-800 rounded-xl w-full" />
        </div>
      )}

      {/* Error state with retry */}
      {!isInitializing && hasInitError && (
        <div className="py-4 flex items-center justify-between gap-3 text-xs text-text-secondary">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span>Could not refresh site slots.</span>
          </div>
          <button
            onClick={loadScheduleData}
            className="flex items-center gap-1 text-xs font-bold text-amber-500 hover:underline cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Active Confirmed Visit Card (if visitor already booked for this project) */}
      {!isInitializing && existingSchedule && (
        <div className="mt-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                Your Site Visit is Confirmed
              </span>
            </div>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-300 font-bold">
              {existingSchedule.status}
            </span>
          </div>
          <div className="text-xs font-semibold text-text-primary flex items-center gap-3 pt-1">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-text-tertiary" />
              <span>{existingSchedule.visitDate}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-text-tertiary" />
              <span>{existingSchedule.timeSlot}</span>
            </div>
          </div>
        </div>
      )}

      {/* Slot Selection UI */}
      {!isInitializing && (
        <div className="mt-3.5 space-y-3.5">
          {/* Day Selector Chips */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-text-tertiary block mb-2">
              Select Preferred Date
            </label>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {upcomingDays.map((day, idx) => {
                const isSelected = idx === selectedDayIndex;
                return (
                  <button
                    key={day.iso}
                    onClick={() => setSelectedDayIndex(idx)}
                    className={`flex flex-col items-center justify-center min-w-[54px] py-2 px-1.5 rounded-2xl text-xs font-bold transition-all cursor-pointer border ${
                      isSelected
                        ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950 border-slate-950 dark:border-white shadow-sm scale-102"
                        : "bg-slate-100/70 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-text-primary border-transparent"
                    }`}
                  >
                    <span className="text-[10px] uppercase opacity-75 font-semibold">
                      {idx === 0 ? "Tmrw" : day.dayName}
                    </span>
                    <span className="text-sm font-extrabold mt-0.5 leading-none">
                      {day.dateNum}
                    </span>
                    <span className="text-[9px] opacity-60 font-medium">
                      {day.monthName}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Slot Selector Pills */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-text-tertiary block mb-2">
              Select Time Window
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {TIME_SLOTS.slice(0, 4).map((slot) => {
                const isSelected = slot === selectedSlot;
                return (
                  <button
                    key={slot}
                    onClick={() => setSelectedSlot(slot)}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer border ${
                      isSelected
                        ? "bg-amber-500 text-slate-950 border-amber-500 shadow-xs"
                        : "bg-slate-100/70 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-text-secondary border-transparent"
                    }`}
                  >
                    <Clock className="w-3 h-3 shrink-0" />
                    <span className="truncate">{slot.split(" - ")[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handleBookVisit}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-slate-950 hover:bg-slate-900 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer active:scale-98"
          >
            <span>{existingSchedule ? "Reschedule / Book Another Slot" : "Schedule Free Site Visit"}</span>
            <ChevronRight className="w-4 h-4 text-amber-500" />
          </button>

          {/* Trust points */}
          <div className="flex items-center justify-between text-[10px] text-text-tertiary pt-1">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              <span>Verified site team</span>
            </span>
            <span className="flex items-center gap-1">
              <UserCheck className="w-3 h-3 text-amber-500" />
              <span>Zero brokerage</span>
            </span>
            <span>Instant SMS / WhatsApp alert</span>
          </div>
        </div>
      )}
    </div>
  );
}
