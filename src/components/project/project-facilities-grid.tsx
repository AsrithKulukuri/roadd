"use client";

import { useState } from "react";
import { 
  Waves, 
  Dumbbell, 
  Building2, 
  Armchair, 
  Smile, 
  Flower2, 
  Trees, 
  Footprints, 
  Droplet, 
  Zap, 
  ShieldCheck, 
  Car, 
  Sparkles, 
  Heart, 
  Trophy, 
  Sun, 
  CloudRain, 
  Wifi, 
  ArrowUpDown, 
  Film, 
  Check, 
  X,
  Layers
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface FacilityMeta {
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  bgClass: string;
}

// Smart mapping from facility names to icons & luxury pastel styles
function getFacilityMeta(name: string): FacilityMeta {
  const clean = name.toLowerCase();

  if (clean.includes("pool") || clean.includes("swimming")) {
    return { icon: Waves, colorClass: "text-cyan-600 dark:text-cyan-400", bgClass: "bg-cyan-500/10 border-cyan-500/20" };
  }
  if (clean.includes("gym") || clean.includes("fitness") || clean.includes("workout")) {
    return { icon: Dumbbell, colorClass: "text-rose-600 dark:text-rose-400", bgClass: "bg-rose-500/10 border-rose-500/20" };
  }
  if (clean.includes("club") || clean.includes("clubhouse")) {
    return { icon: Building2, colorClass: "text-amber-700 dark:text-amber-400", bgClass: "bg-amber-500/10 border-amber-500/20" };
  }
  if (clean.includes("lounge") || clean.includes("hall") || clean.includes("party")) {
    return { icon: Armchair, colorClass: "text-emerald-600 dark:text-emerald-400", bgClass: "bg-emerald-500/10 border-emerald-500/20" };
  }
  if (clean.includes("play") || clean.includes("child") || clean.includes("kid") || clean.includes("creche")) {
    return { icon: Smile, colorClass: "text-orange-600 dark:text-orange-400", bgClass: "bg-orange-500/10 border-orange-500/20" };
  }
  if (clean.includes("garden") || clean.includes("terrace")) {
    return { icon: Flower2, colorClass: "text-emerald-600 dark:text-emerald-400", bgClass: "bg-emerald-500/10 border-emerald-500/20" };
  }
  if (clean.includes("landscape") || clean.includes("park") || clean.includes("green")) {
    return { icon: Trees, colorClass: "text-teal-600 dark:text-teal-400", bgClass: "bg-teal-500/10 border-teal-500/20" };
  }
  if (clean.includes("pond") || clean.includes("water body") || clean.includes("fountain")) {
    return { icon: Droplet, colorClass: "text-blue-600 dark:text-blue-400", bgClass: "bg-blue-500/10 border-blue-500/20" };
  }
  if (clean.includes("jogging") || clean.includes("walk") || clean.includes("track")) {
    return { icon: Footprints, colorClass: "text-amber-600 dark:text-amber-400", bgClass: "bg-amber-500/10 border-amber-500/20" };
  }
  if (clean.includes("power") || clean.includes("generator") || clean.includes("backup")) {
    return { icon: Zap, colorClass: "text-amber-500 dark:text-amber-400", bgClass: "bg-amber-500/10 border-amber-500/20" };
  }
  if (clean.includes("security") || clean.includes("cctv") || clean.includes("guard") || clean.includes("surveillance")) {
    return { icon: ShieldCheck, colorClass: "text-blue-600 dark:text-blue-400", bgClass: "bg-blue-500/10 border-blue-500/20" };
  }
  if (clean.includes("park") || clean.includes("car") || clean.includes("parking") || clean.includes("garage")) {
    return { icon: Car, colorClass: "text-slate-700 dark:text-slate-300", bgClass: "bg-slate-500/10 border-slate-500/20" };
  }
  if (clean.includes("yoga") || clean.includes("meditation") || clean.includes("aerobics")) {
    return { icon: Heart, colorClass: "text-rose-500 dark:text-rose-400", bgClass: "bg-rose-500/10 border-rose-500/20" };
  }
  if (clean.includes("badminton") || clean.includes("tennis") || clean.includes("court") || clean.includes("games") || clean.includes("sport")) {
    return { icon: Trophy, colorClass: "text-yellow-600 dark:text-yellow-400", bgClass: "bg-yellow-500/10 border-yellow-500/20" };
  }
  if (clean.includes("solar") || clean.includes("sun")) {
    return { icon: Sun, colorClass: "text-amber-500 dark:text-amber-400", bgClass: "bg-amber-500/10 border-amber-500/20" };
  }
  if (clean.includes("rain") || clean.includes("harvesting")) {
    return { icon: CloudRain, colorClass: "text-sky-600 dark:text-sky-400", bgClass: "bg-sky-500/10 border-sky-500/20" };
  }
  if (clean.includes("lift") || clean.includes("elevator")) {
    return { icon: ArrowUpDown, colorClass: "text-indigo-600 dark:text-indigo-400", bgClass: "bg-indigo-500/10 border-indigo-500/20" };
  }
  if (clean.includes("theatre") || clean.includes("cinema") || clean.includes("mini")) {
    return { icon: Film, colorClass: "text-purple-600 dark:text-purple-400", bgClass: "bg-purple-500/10 border-purple-500/20" };
  }
  if (clean.includes("wifi") || clean.includes("internet") || clean.includes("smart")) {
    return { icon: Wifi, colorClass: "text-blue-500 dark:text-blue-400", bgClass: "bg-blue-500/10 border-blue-500/20" };
  }

  // Default elegant fallback
  return { icon: Sparkles, colorClass: "text-amber-600 dark:text-amber-400", bgClass: "bg-amber-500/10 border-amber-500/20" };
}

interface ProjectFacilitiesGridProps {
  facilities: string[];
  projectName: string;
}

export function ProjectFacilitiesGrid({ facilities, projectName }: ProjectFacilitiesGridProps) {
  const [isAllModalOpen, setIsAllModalOpen] = useState(false);

  if (!facilities || facilities.length === 0) {
    return null;
  }

  // Show top 8 or 10 on the main card view
  const previewList = facilities.slice(0, 10);
  const hasMore = facilities.length > 10;

  return (
    <div className="bg-white dark:bg-bg-card border border-border-default rounded-3xl p-5 sm:p-6 shadow-sm">
      {/* Section Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Top Facilities</h2>
          <p className="text-xs text-text-secondary mt-0.5">
            {projectName} presents exclusive lifestyle amenities designed for comfort & luxury.
          </p>
        </div>

        {facilities.length > 0 && (
          <button
            type="button"
            onClick={() => setIsAllModalOpen(true)}
            className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 hover:underline shrink-0 whitespace-nowrap cursor-pointer mt-1"
          >
            View All ({facilities.length})
          </button>
        )}
      </div>

      {/* Modern Dedicated Vertical Tile Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5 sm:gap-3.5">
        {previewList.map((facility, idx) => {
          const { icon: Icon, colorClass } = getFacilityMeta(facility);
          return (
            <div
              key={`${facility}-${idx}`}
              className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-bg-card border border-border-default hover:border-amber-500/30 flex flex-col items-center justify-center text-center gap-2.5 transition-all duration-300 hover:scale-105 hover:shadow-md cursor-default group"
            >
              {/* Icon Container */}
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center bg-slate-900 dark:bg-slate-800 shadow-xs group-hover:scale-110 transition-transform">
                <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${colorClass}`} />
              </div>

              {/* Title */}
              <span className="text-[11px] sm:text-xs font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug">
                {facility}
              </span>
            </div>
          );
        })}
      </div>

      {/* "View All" Lightbox Dialog */}
      <Dialog open={isAllModalOpen} onOpenChange={setIsAllModalOpen}>
        <DialogContent className="max-w-2xl bg-white dark:bg-bg-card border-border-default rounded-3xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
          <div className="flex items-center justify-between pb-3 border-b border-border-default">
            <div>
              <DialogTitle className="text-lg sm:text-xl font-bold text-text-primary">
                All Facilities & Amenities
              </DialogTitle>
              <DialogDescription className="text-xs text-text-secondary mt-0.5">
                Complete list of {facilities.length} features available at {projectName}
              </DialogDescription>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-4">
            {facilities.map((facility, idx) => {
              const { icon: Icon, colorClass } = getFacilityMeta(facility);
              return (
                <div
                  key={`all-${facility}-${idx}`}
                  className="p-3 rounded-2xl bg-white dark:bg-bg-card border border-border-default hover:border-amber-500/30 flex flex-col items-center justify-center text-center gap-2 hover:shadow-md transition-all group"
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-900 dark:bg-slate-800 shadow-xs">
                    <Icon className={`w-5 h-5 ${colorClass}`} />
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                    {facility}
                  </span>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
