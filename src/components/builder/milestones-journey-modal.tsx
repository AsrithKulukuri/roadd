"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  Camera,
  MapPin,
  ShieldCheck,
  X,
  Upload,
  RefreshCw,
  Plus,
  Send,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ConstructionMilestone } from "@/lib/project-milestones";

interface MilestonesJourneyModalProps {
  projectId: string;
  projectName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function MilestonesJourneyModal({
  projectId,
  projectName,
  isOpen,
  onClose,
}: MilestonesJourneyModalProps) {
  const [milestones, setMilestones] = useState<ConstructionMilestone[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeStageId, setActiveStageId] = useState<string | null>(null);

  // Form for adding photo / editing milestone
  const [selectedPhotoStage, setSelectedPhotoStage] = useState<ConstructionMilestone | null>(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoCaption, setPhotoCaption] = useState("");
  const [photoGeoTag, setPhotoGeoTag] = useState("Amaravati Site Work Block (16.5064° N, 80.6481° E)");
  const [percentageInput, setPercentageInput] = useState<number>(65);

  const fetchMilestones = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/builder/milestones?projectId=${encodeURIComponent(projectId)}`);
      const data = await res.json();
      if (data.success) {
        setMilestones(data.milestones || []);
        setSummary(data.summary);
        if (data.milestones?.length > 0 && !activeStageId) {
          setActiveStageId(data.milestones[0].id);
        }
      }
    } catch {
      toast.error("Failed to load construction milestones.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMilestones();
    }
  }, [isOpen, projectId]);

  const handleSaveMilestoneUpdate = async (milestoneId: string, status: "completed" | "in_progress" | "upcoming", percentage: number) => {
    try {
      const res = await fetch("/api/builder/milestones", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          milestoneId,
          status,
          completionPercentage: percentage,
          newPhoto: photoUrl.trim()
            ? {
                url: photoUrl.trim(),
                caption: photoCaption.trim() || "Site inspection update",
                geoTag: photoGeoTag,
              }
            : undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Milestone updated successfully!");
        setSelectedPhotoStage(null);
        setPhotoUrl("");
        setPhotoCaption("");
        fetchMilestones();
      }
    } catch {
      toast.error("Failed to save milestone update.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">Construction Milestone Journey</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 uppercase">
                  RERA Compliant
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">{projectName} • Verified structural milestones &amp; monthly inspection gallery</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Overall Completion Bar */}
        {summary && (
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-900 dark:text-white">Overall Construction Progress: {summary.overallPercentage}%</span>
              <span className="text-slate-600 dark:text-slate-400 font-semibold">Active Stage: {summary.activeStage}</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
              <div
                className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${summary.overallPercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Milestones Stepper & Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50 dark:bg-slate-950">
          {isLoading ? (
            <div className="py-16 text-center text-slate-600 dark:text-slate-400 text-xs flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
              Loading RERA milestone journey...
            </div>
          ) : (
            <div className="space-y-4">
              {milestones.map((m, idx) => {
                const isComplete = m.status === "completed";
                const isInProg = m.status === "in_progress";

                return (
                  <div
                    key={m.id}
                    className={cn(
                      "p-5 rounded-2xl border-2 transition-all space-y-3",
                      isComplete
                        ? "bg-white dark:bg-slate-900 border-emerald-400 dark:border-emerald-600 shadow-sm"
                        : isInProg
                        ? "bg-amber-50/70 dark:bg-slate-900 border-amber-500 shadow-sm ring-1 ring-amber-500/30"
                        : "bg-slate-100 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 opacity-90"
                    )}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5",
                            isComplete
                              ? "bg-emerald-600 text-white"
                              : isInProg
                              ? "bg-amber-500 text-slate-950 font-black animate-pulse"
                              : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600"
                          )}
                        >
                          {isComplete ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">{m.stageName}</h4>
                            <span
                              className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase",
                                isComplete
                                  ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
                                  : isInProg
                                  ? "bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700"
                                  : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                              )}
                            >
                              {m.status.replace("_", " ")} ({m.completionPercentage}%)
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 pt-0.5">
                            Target / Verified: <strong className="text-slate-900 dark:text-white">{m.targetDate}</strong> • {m.inspectionStatus}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedPhotoStage(m);
                            setPercentageInput(m.completionPercentage);
                          }}
                          className="h-8 text-xs gap-1 border-slate-300 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                        >
                          <Camera className="w-3.5 h-3.5 text-amber-500" />
                          Update / Add Photos
                        </Button>
                      </div>
                    </div>

                    {m.notes && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 pl-11 leading-relaxed">
                        {m.notes}
                      </p>
                    )}

                    {/* Photos Preview */}
                    {m.photos && m.photos.length > 0 && (
                      <div className="pl-11 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                        {m.photos.map(p => (
                          <div key={p.id} className="rounded-xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 group relative shadow-xs">
                            <img src={p.url} alt={p.caption} className="w-full h-28 object-cover" />
                            <div className="p-2 space-y-0.5">
                              <p className="text-[11px] font-bold text-slate-900 dark:text-white line-clamp-1">{p.caption}</p>
                              <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                                <span>{p.date}</span>
                                {p.geoTag && <span className="flex items-center gap-0.5 truncate max-w-[120px]"><MapPin className="w-2.5 h-2.5 text-amber-500" /> {p.geoTag}</span>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 shrink-0">
          <span>Buyers can view verified construction milestones directly on your project listing.</span>
          <Button size="sm" variant="outline" onClick={onClose} className="h-8 text-xs border-slate-300 dark:border-slate-700 font-bold text-slate-900 dark:text-white">
            Close Timeline
          </Button>
        </div>
      </div>

      {/* Update Stage / Add Photo Dialog */}
      {selectedPhotoStage && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-3">
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">Update Milestone</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400">{selectedPhotoStage.stageName}</p>
              </div>
              <button
                onClick={() => setSelectedPhotoStage(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Completion Percentage: {percentageInput}%</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={percentageInput}
                  onChange={e => setPercentageInput(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Stage Status</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["upcoming", "in_progress", "completed"] as const).map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => {
                        const newPct = st === "completed" ? 100 : st === "upcoming" ? 0 : 50;
                        setPercentageInput(newPct);
                      }}
                      className={cn(
                        "py-1.5 px-2 rounded-lg font-bold capitalize text-xs border-2 transition-all",
                        (percentageInput === 100 && st === "completed") ||
                          (percentageInput === 0 && st === "upcoming") ||
                          (percentageInput > 0 && percentageInput < 100 && st === "in_progress")
                          ? "bg-amber-500 text-slate-950 font-black border-amber-500"
                          : "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                      )}
                    >
                      {st.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-slate-700">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Site Photo URL (Optional)</label>
                <Input
                  value={photoUrl}
                  onChange={e => setPhotoUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/... or S3 URL"
                  className="h-8.5 text-xs bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Photo Caption</label>
                <Input
                  value={photoCaption}
                  onChange={e => setPhotoCaption(e.target.value)}
                  placeholder="e.g. 8th floor slab rebar casting"
                  className="h-8.5 text-xs bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Inspection Geo-Tag</label>
                <Input
                  value={photoGeoTag}
                  onChange={e => setPhotoGeoTag(e.target.value)}
                  className="h-8.5 text-xs bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
              <Button size="sm" variant="outline" onClick={() => setSelectedPhotoStage(null)} className="border-slate-300 dark:border-slate-700">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const status = percentageInput >= 100 ? "completed" : percentageInput > 0 ? "in_progress" : "upcoming";
                  handleSaveMilestoneUpdate(selectedPhotoStage.id, status, percentageInput);
                }}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
              >
                Save Milestone Update
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
