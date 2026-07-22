"use client";

import { CheckCircle2, Clock, HardHat, Sparkles, Building, Key } from "lucide-react";
import Image from "next/image";

interface PropertyTimelineProps {
  possessionStatus?: string;
  possessionDate?: string;
  propertyTitle: string;
}

export function PropertyTimeline({ possessionStatus = "Under Construction", possessionDate = "Dec 2026", propertyTitle }: PropertyTimelineProps) {
  const milestones = [
    {
      id: 1,
      title: "Excavation & Foundation",
      status: "completed",
      date: "Jan 2025",
      percentage: 100,
      description: "Piling and deep foundation work completed with M35 grade concrete.",
      img: "https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?q=80&w=600",
    },
    {
      id: 2,
      title: "Structure & RCC Slabs",
      status: "in-progress",
      date: "Aug 2025",
      percentage: 85,
      description: "12th Floor RCC slab casting in progress. Seismic Zone 3 resistant structure.",
      img: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=600",
    },
    {
      id: 3,
      title: "Brickwork & Plastering",
      status: "upcoming",
      date: "Mar 2026",
      percentage: 0,
      description: "AAC block masonry and internal/external double coat plastering.",
      img: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=600",
    },
    {
      id: 4,
      title: "Finishing & Key Handover",
      status: "upcoming",
      date: possessionDate || "Dec 2026",
      percentage: 0,
      description: "Flooring, painting, lift commissioning, and final RERA handover.",
      img: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=600",
    },
  ];

  const overallProgress = 62;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
      {/* Header & Overall Percentage */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <HardHat className="w-5 h-5 text-amber-500" />
            <h3 className="font-heading text-xl font-bold text-slate-900 dark:text-white">
              Construction Milestone Tracker
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time verified site progress for <strong className="text-slate-900 dark:text-white">{propertyTitle}</strong>
          </p>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/40 px-4 py-2 rounded-2xl flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] uppercase font-extrabold text-amber-600 dark:text-amber-400 block tracking-wider">Project Status</span>
            <span className="font-extrabold text-sm text-slate-900 dark:text-white">{overallProgress}% Completed</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-xs">
            {overallProgress}%
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-extrabold">
          <span className="text-amber-500 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> Construction Velocity: On Schedule
          </span>
          <span className="text-slate-500">Target Possession: {possessionDate}</span>
        </div>
        <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700">
          <div
            className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 rounded-full transition-all duration-1000 shadow-sm"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      {/* Milestones Stepper & Photo Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
        {milestones.map((m) => {
          const isDone = m.status === "completed";
          const isInProgress = m.status === "in-progress";

          return (
            <div
              key={m.id}
              className={`rounded-2xl p-4 border transition-all flex flex-col justify-between space-y-3 ${
                isDone
                  ? "bg-slate-50 dark:bg-slate-900/90 border-emerald-500/40"
                  : isInProgress
                  ? "bg-amber-500/10 border-amber-500/60 shadow-lg ring-1 ring-amber-500/40"
                  : "bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 opacity-70"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                    Phase {m.id}
                  </span>
                  {isDone ? (
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Done
                    </span>
                  ) : isInProgress ? (
                    <span className="px-2 py-0.5 bg-amber-500 text-slate-950 text-[10px] font-extrabold rounded-full flex items-center gap-1 animate-pulse">
                      <Clock className="w-3 h-3" /> In Progress ({m.percentage}%)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-slate-800 text-slate-400 text-[10px] font-bold rounded-full">
                      Upcoming
                    </span>
                  )}
                </div>

                <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-snug">{m.title}</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{m.description}</p>
              </div>

              {/* Site Progress Photo */}
              <div className="relative h-28 w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
                <Image src={m.img} alt={m.title} fill className="object-cover" />
                <div className="absolute bottom-2 left-2 bg-slate-950/80 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] font-extrabold text-white">
                  📅 {m.date}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
