"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  FolderOpen,
  Eye,
  Calendar,
  Lock,
  Edit3,
  ShieldCheck,
  Sparkles,
  Check,
  X,
  ArrowUpRight,
  Clock,
  AlertTriangle,
  TrendingUp,
  Building2,
  Phone,
  FileText,
  Sliders,
  CheckCircle2,
  ExternalLink,
  MousePointerClick,
  Share2,
  FileSpreadsheet
} from "lucide-react";
import { useBuilderStore } from "@/stores/builder-store";
import { useProjectsStore } from "@/stores/projects-store";
import { useSchedulesStore } from "@/stores/schedules-store";
import { ProjectRealtimeActivity } from "@/components/builder/project-realtime-activity";
import { ProjectActivityModal } from "@/components/admin/project-activity-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Project } from "@/types/project";

export default function BuilderProjectsPage() {
  const { getCurrentBuilder, updateProjectContentGuarded, submitRequest } = useBuilderStore();
  const { projects, fetchProjects, updateProject } = useProjectsStore();
  const { schedules } = useSchedulesStore();

  const currentBuilder = getCurrentBuilder();

  // Selected Project for Editing
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Editable Form Fields (Allowed)
  const [description, setDescription] = useState("");
  const [constructionStatus, setConstructionStatus] = useState("");
  const [highlightsInput, setHighlightsInput] = useState("");
  const [facilitiesInput, setFacilitiesInput] = useState("");
  const [progressPercentage, setProgressPercentage] = useState(65);
  const [isSaving, setIsSaving] = useState(false);

  // Caption Approval Modal states
  const [isCaptionModalOpen, setIsCaptionModalOpen] = useState(false);
  const [captionProject, setCaptionProject] = useState<Project | null>(null);
  const [proposedCaption, setProposedCaption] = useState("");
  const [captionReason, setCaptionReason] = useState("");
  const [activityModalProject, setActivityModalProject] = useState<Project | null>(null);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // STRICT TENANT ISOLATION: Show ONLY assigned projects
  const assignedProjects = useMemo(() => {
    if (!currentBuilder?.assignedProjectIds) return [];
    return projects.filter((p) =>
      currentBuilder.assignedProjectIds.some(
        (id) => id === p.id || id === p.slug || p.id.includes(id) || p.slug.includes(id)
      )
    );
  }, [projects, currentBuilder]);

  // Open Edit Modal
  const handleOpenEdit = (project: Project) => {
    setEditingProject(project);
    setDescription(project.description || "");
    setConstructionStatus(project.constructionStatus || (project as any).status || "Under Construction");
    setHighlightsInput(Array.isArray(project.highlights) ? project.highlights.join("\n") : "");
    setFacilitiesInput(Array.isArray(project.facilities) ? project.facilities.join(", ") : "");
  };

  // Save allowed changes with guardrail enforcement
  const handleSaveContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject || !currentBuilder) return;

    setIsSaving(true);
    try {
      const allowedPayload = {
        description: description.trim(),
        constructionStatus: constructionStatus.trim(),
        highlights: highlightsInput
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        facilities: facilitiesInput
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };

      // Guardrail enforcement via store
      const result = await updateProjectContentGuarded(
        editingProject.id,
        currentBuilder.id,
        allowedPayload
      );

      if (!result.success) {
        toast.error(result.error || "Update rejected by security guardrails.");
        return;
      }

      // Also update client memory store
      updateProject(editingProject.id, allowedPayload as any);

      toast.success("Project text and milestones updated successfully!");
      setEditingProject(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to update project content");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle caption approval request submission
  const handleSubmitCaptionRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captionProject || !currentBuilder || !proposedCaption.trim()) return;

    await submitRequest({
      builderId: currentBuilder.id,
      builderName: currentBuilder.companyName,
      requestType: "caption_change",
      projectId: captionProject.id,
      projectName: captionProject.name,
      title: `Caption Revision for ${captionProject.name}`,
      details: {
        proposedCaption: proposedCaption.trim(),
        notes: captionReason.trim(),
      },
      priority: "normal",
    });

    toast.success("Caption change request dispatched to ROAD Admin for review!");
    setIsCaptionModalOpen(false);
    setProposedCaption("");
    setCaptionReason("");
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="border-b border-border/40 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <FolderOpen className="h-6 w-6 text-amber-500" />
              My Assigned Projects & Content Editor
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
              Guarded Access
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Strictly scoped to your developer inventory. Update project narratives, milestone notes, and view real-time buyer analytics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/builder/requests"
            className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Request Marketing Push
          </Link>
        </div>
      </div>

      {/* Security Guardrail Notice */}
      <div className="p-4 rounded-xl bg-amber-500/[0.04] border border-amber-500/20 flex items-start gap-3 text-xs">
        <Lock className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-foreground">ROAD Guardrail Security Policy:</span>
          <span className="text-muted-foreground ml-1">
            Builders can freely edit project descriptions, construction status, milestone notes, and amenities.
            However, <strong>Legal Brand Captions, Project Names, and RERA IDs</strong> are strictly locked against unauthorized changes. To update a caption, click the <em>"Request Caption Approval"</em> button for instant admin review.
          </span>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="space-y-6">
        {assignedProjects.length > 0 ? (
          assignedProjects.map((project) => {
            const projectVisits = schedules.filter(
              (s) => s.projectId === project.id || s.projectId === project.slug
            );
            return (
              <div
                key={project.id}
                className="bg-card border border-border/50 hover:border-amber-500/40 rounded-2xl p-6 shadow-sm transition-all space-y-6"
              >
                {/* Top Row: Info + Actions */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                  <div className="flex items-start gap-4">
                    {project.coverImage ? (
                      <img
                        src={project.coverImage}
                        alt={project.name}
                        className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl object-cover border border-border/50 shrink-0"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-xl bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                        <Building2 className="h-10 w-10" />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-bold text-foreground">{project.name}</h2>
                        {project.isFeatured && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            Featured
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground">
                          {project.projectType || "Residential Venture"}
                        </span>
                      </div>

                      {/* Locked Caption Bar */}
                      <div className="flex items-center gap-2 text-xs">
                        <span className="flex items-center gap-1 font-semibold text-muted-foreground">
                          <Lock className="h-3 w-3 text-amber-500" /> Caption:
                        </span>
                        <span className="text-foreground italic bg-muted/40 px-2 py-0.5 rounded border border-border/40 line-clamp-1 max-w-md">
                          "{project.tagline || "Landmark road-facing luxury development"}"
                        </span>
                        <button
                          onClick={() => {
                            setCaptionProject(project);
                            setProposedCaption(project.tagline || "");
                            setIsCaptionModalOpen(true);
                          }}
                          className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 hover:underline shrink-0"
                        >
                          Request Caption Approval
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
                        <span>RERA: {project.reraId || "Verified"}</span>
                        <span>•</span>
                        <span className="font-semibold text-amber-400">{project.constructionStatus || "Ongoing"}</span>
                        <span>•</span>
                        <span>Total Units: {project.totalUnits || "120 Units"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/projects/${project.slug}`}
                      target="_blank"
                      className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700/60 inline-flex items-center gap-1.5"
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-amber-400" />
                      Live Listing
                    </Link>
                    <Button
                      onClick={() => handleOpenEdit(project)}
                      className="bg-amber-500 hover:bg-amber-600 text-zinc-950 text-xs font-semibold gap-1.5"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Edit Text & Milestones
                    </Button>
                    <Button
                      onClick={() => setActivityModalProject(project)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5 shadow-sm"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                      Activity & Excel
                    </Button>
                  </div>
                </div>

                {/* 100% Realtime Activity & Excel System (Same as Admin Portal) */}
                <ProjectRealtimeActivity
                  project={project}
                  onOpenModal={() => setActivityModalProject(project)}
                  defaultExpanded={true}
                />

                {/* Narrative Preview */}
                <div className="bg-muted/20 p-4 rounded-xl border border-border/30 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">Current Narrative / Description:</span>
                    <span className="text-muted-foreground text-[11px]">Click 'Edit Text' to adjust</span>
                  </div>
                  <p className="text-muted-foreground line-clamp-2">
                    {project.description || "No custom description configured yet."}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-12 text-center bg-card border border-dashed border-border rounded-2xl text-muted-foreground">
            No projects currently assigned. Please contact the ROAD administrator.
          </div>
        )}
      </div>

      {/* GUARDED EDIT CONTENT MODAL */}
      {editingProject && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Edit3 className="h-5 w-5 text-amber-500" />
                  Edit Project Text & Milestones — {editingProject.name}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Update descriptions and construction milestones. Protected legal fields are read-only.
                </p>
              </div>
              <button
                onClick={() => setEditingProject(null)}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveContent} className="space-y-4 text-xs">
              {/* LOCKED FIELDS PREVIEW */}
              <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-amber-500" />
                    Protected Guarded Fields (Locked)
                  </span>
                  <span className="text-[10px] text-zinc-500">Requires Admin Sign-off</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 opacity-80">
                  <div>
                    <label className="text-[11px] text-zinc-400">Project Name (Certified)</label>
                    <Input disabled value={editingProject.name} className="bg-zinc-900/80 border-zinc-800 text-zinc-400 cursor-not-allowed text-xs" />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400">Marketing Caption / Tagline</label>
                    <Input disabled value={editingProject.tagline || ""} className="bg-zinc-900/80 border-zinc-800 text-zinc-400 cursor-not-allowed text-xs" />
                  </div>
                </div>

                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => {
                      setCaptionProject(editingProject);
                      setProposedCaption(editingProject.tagline || "");
                      setIsCaptionModalOpen(true);
                    }}
                    className="text-[11px] font-semibold text-amber-400 hover:underline"
                  >
                    Need to change caption? Propose revision to admin →
                  </button>
                </div>
              </div>

              {/* ALLOWED EDITABLE FIELDS */}
              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <label className="text-zinc-300 font-semibold">Construction Status & Current Stage *</label>
                  <select
                    value={constructionStatus}
                    onChange={(e) => setConstructionStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-xs"
                  >
                    <option value="Under Construction">Under Construction</option>
                    <option value="Foundation Complete">Foundation Complete</option>
                    <option value="Structural Framing">Structural Framing</option>
                    <option value="Finishing & Interiors">Finishing & Interiors</option>
                    <option value="Ready to Move">Ready to Move</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-300 font-semibold">Project Narrative / Detailed Description *</label>
                  <Textarea
                    required
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide full project narrative, lifestyle appeal, architecture details..."
                    className="bg-zinc-800 border-zinc-700 text-white text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-300 font-semibold">Key Highlights (1 per line)</label>
                  <Textarea
                    rows={3}
                    value={highlightsInput}
                    onChange={(e) => setHighlightsInput(e.target.value)}
                    placeholder="100% Vastu Compliant&#10;100ft Master Road Facing&#10;Private Clubhouse with Infinity Pool"
                    className="bg-zinc-800 border-zinc-700 text-white text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-300 font-semibold">Facilities & Amenities (comma separated)</label>
                  <Input
                    value={facilitiesInput}
                    onChange={(e) => setFacilitiesInput(e.target.value)}
                    placeholder="Swimming Pool, Gym, 24/7 Security, Children Play Area, EV Charging"
                    className="bg-zinc-800 border-zinc-700 text-white text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditingProject(null)}
                  className="text-zinc-400 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-semibold gap-2"
                >
                  {isSaving ? "Saving Content..." : "Save Text Updates"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CAPTION APPROVAL MODAL */}
      {isCaptionModalOpen && captionProject && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  Request Marketing Caption Revision
                </h3>
                <p className="text-xs text-zinc-400">{captionProject.name}</p>
              </div>
              <button
                onClick={() => setIsCaptionModalOpen(false)}
                className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitCaptionRequest} className="space-y-4 text-xs">
              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                <span className="text-[11px] text-zinc-400">Current Caption:</span>
                <p className="text-zinc-200 italic mt-0.5">"{captionProject.tagline || "No caption set"}"</p>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-300 font-semibold">Proposed New Caption *</label>
                <Input
                  required
                  value={proposedCaption}
                  onChange={(e) => setProposedCaption(e.target.value)}
                  placeholder="e.g. Amaravati's Most Exclusive 4 BHK Sky Mansions on MG Road"
                  className="bg-zinc-800 border-zinc-700 text-white text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-300 font-semibold">Reason for Change / Campaign Objective</label>
                <Textarea
                  rows={2}
                  value={captionReason}
                  onChange={(e) => setCaptionReason(e.target.value)}
                  placeholder="e.g. Launching Tower C premium penthouses, updating to match regional newspaper campaign."
                  className="bg-zinc-800 border-zinc-700 text-white text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsCaptionModalOpen(false)}
                  className="text-zinc-400 hover:text-white"
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-semibold">
                  Submit for Admin Approval
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Standalone Project Real Activity & Excel Export Modal */}
      <ProjectActivityModal
        isOpen={Boolean(activityModalProject)}
        onClose={() => setActivityModalProject(null)}
        project={activityModalProject}
      />
    </div>
  );
}
