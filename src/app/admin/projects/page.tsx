"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useProjectsStore } from "@/stores/projects-store";
import { Button } from "@/components/ui/button";
import { formatPriceCompact } from "@/lib/utils";
import { toast } from "sonner";
import {
  Plus, Trash2, Edit3, Star, Eye, EyeOff,
  Building2, Home, Landmark, MoreHorizontal,
  MapPin, CheckCircle2, AlertCircle, Play, Copy, Search, PowerOff, Sparkles
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Project, ProjectType } from "@/types/project";
import { getRefId, findItemByRefId } from "@/lib/ref-id";
import { WhatsAppIcon } from "@/components/property/whatsapp-share-button";
import { AdminWhatsAppModal } from "@/components/admin/admin-whatsapp-modal";
import { ProjectActivityModal } from "@/components/admin/project-activity-modal";
import { FileSpreadsheet } from "lucide-react";

const TYPE_CONFIG: Record<ProjectType, { label: string; icon: React.ElementType; color: string }> = {
  apartment: { label: "Apartment", icon: Building2, color: "text-amber-500 bg-amber-500/10 border-amber-500/30" },
  villa:     { label: "Villa",     icon: Home,      color: "text-amber-500 bg-amber-500/10 border-amber-500/30" },
  venture:   { label: "CRDA Ventures", icon: Landmark,  color: "text-amber-500 bg-amber-500/10 border-amber-500/30" },
};

const STATUS_CONFIG = {
  "under-construction": { label: "Under Construction", color: "text-orange-500 bg-orange-500/10" },
  "ready-to-move":      { label: "Ready to Move",      color: "text-amber-500 bg-amber-500/10" },
  "new-launch":         { label: "✨ New Launch",       color: "text-amber-300 bg-amber-500/20 border border-amber-500/30" },
};

function ConfirmDeleteModal({
  project,
  onConfirm,
  onCancel,
}: {
  project: Project;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-bg-card border border-border-default rounded-2xl shadow-2xl p-6 max-w-sm w-full">
        <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6 text-red-500" />
        </div>
        <h3 className="text-lg font-bold text-text-primary text-center mb-1">Delete Project?</h3>
        <p className="text-sm text-text-secondary text-center mb-6">
          This will permanently delete <span className="font-semibold text-text-primary">{project.name}</span>.
          This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
          <Button className="flex-1 bg-red-500 hover:bg-red-600 text-white border-0" onClick={onConfirm}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AdminProjectsPage() {
  const { projects, fetchProjects, deleteProject, toggleFeatured, togglePublished, updateDisplayCategory, toggleSoldOut, toggleRoadExclusive } = useProjectsStore();
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [whatsAppModalProject, setWhatsAppModalProject] = useState<Project | null>(null);
  const [activityModalProject, setActivityModalProject] = useState<Project | null>(null);
  const [filterType, setFilterType] = useState<ProjectType | "all" | "exclusive">("all");

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const filtered = filterType === "all"
    ? projects
    : filterType === "exclusive"
    ? projects.filter((p) => p.isRoadExclusive)
    : projects.filter((p) => p.projectType === filterType);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteProject(deleteTarget.id);
    toast.success(`"${deleteTarget.name}" deleted.`);
    setDeleteTarget(null);
  };

  const getPriceRange = (project: Project) => {
    if (!project.configurations.length) return "—";
    const allPrices = project.configurations.flatMap((c) => [c.priceMin, c.priceMax]).filter(Boolean);
    if (!allPrices.length) return "—";
    const min = Math.min(...allPrices);
    const max = Math.max(...allPrices);
    return min === max
      ? formatPriceCompact(min)
      : `${formatPriceCompact(min)} – ${formatPriceCompact(max)}`;
  };

  return (
    <>
      {deleteTarget && (
        <ConfirmDeleteModal
          project={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <div className="p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-heading text-text-primary">Projects ({projects.length})</h1>
            <p className="text-text-secondary text-xs sm:text-sm mt-0.5">
              Manage builder projects — Apartments, Villas & Ventures.
            </p>
          </div>
          <Button variant="amber" asChild className="w-full sm:w-auto">
            <Link href="/admin/projects/new" className="gap-2 text-xs sm:text-sm">
              <Plus className="w-4 h-4" /> Add New Project
            </Link>
          </Button>
        </div>

        {/* Stats Row with Horizontal Touch Scrolling on Mobile */}
        <div className="flex sm:grid sm:grid-cols-5 gap-2.5 sm:gap-4 mb-6 overflow-x-auto pb-1.5 sm:pb-0 scrollbar-none touch-pan-x">
          {(
            [
              { type: "all", label: "All Projects", count: projects.length },
              { type: "exclusive", label: "ROAD Exclusive ⭐", count: projects.filter((p) => p.isRoadExclusive).length },
              { type: "apartment", label: "Apartments", count: projects.filter((p) => p.projectType === "apartment").length },
              { type: "villa", label: "Villas", count: projects.filter((p) => p.projectType === "villa").length },
              { type: "venture", label: "CRDA Ventures", count: projects.filter((p) => p.projectType === "venture").length },
            ] as const
          ).map((item) => {
            const active = filterType === item.type;
            return (
              <button
                key={item.type}
                onClick={() => setFilterType(item.type)}
                className={`p-3 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer shrink-0 min-w-[130px] sm:min-w-0 ${
                  active
                    ? "border-amber-primary/50 bg-amber-primary/10 shadow-xs"
                    : "border-border-default bg-bg-card hover:border-amber-primary/30"
                }`}
              >
                <div className={`text-xl sm:text-2xl font-bold font-heading ${item.type === "exclusive" ? "text-amber-500" : "text-text-primary"}`}>{item.count}</div>
                <div className="text-xs sm:text-sm text-text-secondary capitalize mt-0.5 font-medium whitespace-nowrap sm:whitespace-normal">
                  {item.label}
                </div>
              </button>
            );
          })}
        </div>

        {/* Table */}
        <div className="bg-bg-card border border-border-default rounded-2xl overflow-hidden shadow-sm">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-default bg-bg-primary/50">
                  <th className="text-left px-6 py-4 font-semibold text-text-secondary">Project</th>
                  <th className="text-left px-4 py-4 font-semibold text-text-secondary">Type</th>
                  <th className="text-left px-4 py-4 font-semibold text-text-secondary">Location</th>
                  <th className="text-left px-4 py-4 font-semibold text-text-secondary">Price Range</th>
                  <th className="text-left px-4 py-4 font-semibold text-text-secondary">Status</th>
                  <th className="text-left px-4 py-4 font-semibold text-text-secondary">ROAD Exclusive</th>
                  <th className="text-left px-4 py-4 font-semibold text-text-secondary">Flags</th>
                  <th className="text-left px-4 py-4 font-semibold text-text-secondary">Display Category</th>
                  <th className="px-4 py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-20 text-center text-text-secondary">
                      <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="font-medium">No projects yet.</p>
                      <Link href="/admin/projects/new" className="text-amber-primary text-sm mt-1 inline-block hover:underline">
                        Add your first project →
                      </Link>
                    </td>
                  </tr>
                ) : (
                  filtered.map((project) => {
                    const TC = TYPE_CONFIG[project.projectType];
                    const SC = STATUS_CONFIG[project.constructionStatus];
                    const Icon = TC.icon;
                    return (
                      <tr key={project.id} className="hover:bg-bg-primary/40 transition-colors">
                        {/* Project name + builder */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-border-default shrink-0">
                              {project.coverImage ? (
                                <img src={project.coverImage} alt={project.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-amber-primary/10">
                                  <Icon className="w-5 h-5 text-amber-primary" />
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-text-primary truncate max-w-[200px]">{project.name}</p>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const ref = getRefId(project);
                                    navigator.clipboard.writeText(ref);
                                    toast.success(`Copied Ref ID: ${ref}`);
                                  }}
                                  title="Click to copy Ref ID"
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-mono text-[10px] font-black tracking-wide border border-amber-500/30 transition-all cursor-pointer"
                                >
                                  <span>{getRefId(project)}</span>
                                  <Copy className="w-2.5 h-2.5 opacity-60" />
                                </button>
                              </div>
                              <p className="text-xs text-text-tertiary">{project.builderName}</p>
                            </div>
                          </div>
                        </td>
                        {/* Type badge */}
                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-1 items-start">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${TC.color}`}>
                              <Icon className="w-3 h-3" />
                              {TC.label}
                            </span>
                            {project.crdaApproved && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                🏛️ CRDA Approved
                              </span>
                            )}
                          </div>
                        </td>
                        {/* Location */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1 text-text-secondary text-xs">
                            <MapPin className="w-3 h-3 shrink-0" />
                            {project.location.locality}, {project.location.city}
                          </div>
                        </td>
                        {/* Price range */}
                        <td className="px-4 py-4">
                          <span className="font-semibold text-amber-primary text-xs">{getPriceRange(project)}</span>
                          <div className="text-[10px] text-text-tertiary mt-0.5">
                            {project.configurations.length} config{project.configurations.length !== 1 ? "s" : ""}
                          </div>
                        </td>
                        {/* Construction status & Sold Out */}
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={async () => {
                              const wasSaved = await toggleSoldOut(project.id);
                              if (wasSaved) {
                                toast.success(project.isSoldOut ? "Project marked as Active" : "Project marked as Sold Out");
                              }
                            }}
                            className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                              project.isSoldOut
                                ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/25"
                                : `${SC.color} border-transparent hover:opacity-80`
                            }`}
                            title="Click to toggle Sold Out status"
                          >
                            {project.isSoldOut ? "● Sold Out" : SC.label}
                          </button>
                        </td>
                        {/* ROAD Exclusive */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={async () => {
                              const wasSaved = await toggleRoadExclusive(project.id);
                              if (wasSaved) {
                                toast.success(project.isRoadExclusive ? "Removed from ROAD Exclusive" : "Marked as ROAD Exclusive ⭐");
                              }
                            }}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                              project.isRoadExclusive
                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40 shadow-xs'
                                : 'border-border-default text-text-tertiary hover:text-text-primary hover:bg-bg-primary'
                            }`}
                            title="Click to toggle ROAD Exclusive"
                          >
                            <Sparkles className={`w-3.5 h-3.5 ${project.isRoadExclusive ? "text-amber-500 fill-amber-500/20" : "opacity-40"}`} />
                            <span>{project.isRoadExclusive ? 'ROAD Exclusive' : 'Normal'}</span>
                          </button>
                        </td>
                        {/* Flags */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={async () => { if (await toggleFeatured(project.id)) toast.success("Updated!"); }}
                              title={project.isFeatured ? "Unfeature" : "Feature"}
                              className={`p-2 rounded-full transition-colors ${project.isFeatured ? "text-amber-500 hover:bg-amber-50" : "text-text-tertiary hover:text-amber-500 hover:bg-bg-primary"}`}
                            >
                              <Star className={`w-4 h-4 ${project.isFeatured ? "fill-amber-500" : ""}`} />
                            </button>
                            <button
                              onClick={async () => { if (await togglePublished(project.id)) toast.success("Updated!"); }}
                              title={project.isPublished ? "Unpublish" : "Publish"}
                              className={`p-2 rounded-full transition-colors ${project.isPublished ? "text-amber-600 hover:bg-amber-50" : "text-text-tertiary hover:text-amber-600 hover:bg-bg-primary"}`}
                            >
                              {project.isPublished ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </button>
                            {project.videoUrl && (
                              <span title="Has Watch Tour video" className="p-2 rounded-full text-red-500 hover:bg-red-50 cursor-help transition-colors">
                                <Play className="w-4 h-4 fill-red-500" />
                              </span>
                            )}
                          </div>
                        </td>
                        {/* Display Category */}
                        <td className="px-4 py-4">
                          <select
                            value={project.displayCategory || "none"}
                            onChange={async (e) => {
                              const wasSaved = await updateDisplayCategory(project.id, e.target.value as any);
                              if (wasSaved) toast.success("Category updated!");
                            }}
                            className="appearance-none bg-bg-primary border border-border-default text-text-secondary text-xs rounded-full px-3 py-1.5 pr-7 focus:outline-none focus:ring-1 focus:ring-amber-primary transition-colors hover:bg-bg-card"
                          >
                            <option value="none">None</option>
                            <option value="featured">Featured</option>
                            <option value="recommended">Recommended</option>
                            <option value="budget_friendly">Budget Friendly</option>
                          </select>
                        </td>
                        {/* Actions */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setActivityModalProject(project)}
                              className="p-1.5 rounded-lg border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
                              title="Download Activity Excel Report"
                            >
                              <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span className="hidden xl:inline">Activity Excel</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setWhatsAppModalProject(project)}
                              className="p-1.5 rounded-lg border border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                              title="Share on WhatsApp"
                            >
                              <WhatsAppIcon className="w-4 h-4 fill-emerald-500/20" />
                            </button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="p-2 rounded-lg hover:bg-bg-primary text-text-secondary hover:text-text-primary transition-colors">
                                  <MoreHorizontal className="w-4 h-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 bg-white dark:bg-bg-card border border-border-default">
                                <DropdownMenuItem
                                  className="text-emerald-600 focus:text-emerald-600 flex items-center gap-2 cursor-pointer font-semibold"
                                  onClick={() => setActivityModalProject(project)}
                                >
                                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Activity Excel Report
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-emerald-500 focus:text-emerald-500 flex items-center gap-2 cursor-pointer"
                                  onClick={() => setWhatsAppModalProject(project)}
                                >
                                  <WhatsAppIcon className="w-4 h-4 fill-emerald-500/20" /> Share on WhatsApp
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href={`/projects/${project.slug}`} target="_blank" className="flex items-center gap-2">
                                    <Eye className="w-4 h-4" /> View
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href={`/admin/projects/${project.id}/edit`} className="flex items-center gap-2">
                                    <Edit3 className="w-4 h-4" /> Edit
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="cursor-pointer gap-2 text-amber-500 focus:text-amber-500 focus:bg-amber-500/10"
                                  onClick={async () => {
                                    const wasSaved = await toggleRoadExclusive(project.id);
                                    if (wasSaved) {
                                      toast.success(project.isRoadExclusive ? "Removed from ROAD Exclusive" : "Marked as ROAD Exclusive ⭐");
                                    }
                                  }}
                                >
                                  <Sparkles className="w-4 h-4" />
                                  {project.isRoadExclusive ? "Remove ROAD Exclusive" : "Mark as ROAD Exclusive"}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className={`cursor-pointer flex items-center gap-2 font-medium ${
                                    project.isSoldOut
                                      ? "text-emerald-600 focus:text-emerald-600 focus:bg-emerald-500/10"
                                      : "text-rose-600 focus:text-rose-600 focus:bg-rose-500/10"
                                  }`}
                                  onClick={async () => {
                                    const wasSaved = await toggleSoldOut(project.id);
                                    if (wasSaved) {
                                      toast.success(project.isSoldOut ? "Project marked as Active" : "Project marked as Sold Out");
                                    }
                                  }}
                                >
                                  <PowerOff className="w-4 h-4" />
                                  {project.isSoldOut ? "Mark Active" : "Mark Sold Out"}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-500 focus:text-red-500 flex items-center gap-2"
                                  onClick={() => setDeleteTarget(project)}
                                >
                                  <Trash2 className="w-4 h-4" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-border-default">
            {filtered.length === 0 ? (
              <div className="py-16 text-center text-text-secondary px-6">
                <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium mb-2">No projects yet.</p>
                <Button variant="amber" size="sm" asChild>
                  <Link href="/admin/projects/new"><Plus className="w-4 h-4 mr-1" /> Add Project</Link>
                </Button>
              </div>
            ) : (
              filtered.map((project) => {
                const TC = TYPE_CONFIG[project.projectType];
                const SC = STATUS_CONFIG[project.constructionStatus];
                const Icon = TC.icon;
                return (
                  <div key={project.id} className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-border-default shrink-0">
                        {project.coverImage ? (
                          <img src={project.coverImage} alt={project.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-amber-primary/10">
                            <Icon className="w-6 h-6 text-amber-primary" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-text-primary truncate">{project.name}</p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const ref = getRefId(project);
                              navigator.clipboard.writeText(ref);
                              toast.success(`Copied Ref ID: ${ref}`);
                            }}
                            title="Click to copy Ref ID"
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-mono text-[10px] font-black tracking-wide border border-amber-500/30 transition-all cursor-pointer shrink-0"
                          >
                            <span>{getRefId(project)}</span>
                            <Copy className="w-2.5 h-2.5 opacity-60" />
                          </button>
                        </div>
                        <p className="text-xs text-text-tertiary">{project.builderName}</p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${TC.color}`}>
                            <Icon className="w-2.5 h-2.5" />{TC.label}
                          </span>
                          {project.isRoadExclusive && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5 fill-amber-500/20" /> ROAD Exclusive
                            </span>
                          )}
                          {project.isSoldOut ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                              ● Sold Out
                            </span>
                          ) : (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${SC.color}`}>
                              {SC.label}
                            </span>
                          )}
                          {project.displayCategory && project.displayCategory !== "none" && (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              project.displayCategory === "featured"
                                ? "bg-amber-500/15 text-amber-500 border border-amber-500/30"
                                : project.displayCategory === "recommended"
                                ? "bg-blue-500/15 text-blue-500 border border-blue-500/30"
                                : "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
                            }`}>
                              {project.displayCategory === "featured" ? "⭐ Featured" : project.displayCategory === "recommended" ? "👍 Recommended" : "💰 Budget Friendly"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Category Selector & ROAD Exclusive Bar on Mobile */}
                    <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-bg-primary/60 border border-border-default/60 text-xs">
                      <button
                        type="button"
                        onClick={async () => {
                          const wasSaved = await toggleRoadExclusive(project.id);
                          if (wasSaved) {
                            toast.success(project.isRoadExclusive ? "Removed from ROAD Exclusive" : "Marked as ROAD Exclusive ⭐");
                          }
                        }}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                          project.isRoadExclusive
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40 shadow-xs'
                            : 'border-border-default text-text-tertiary hover:text-text-primary bg-bg-card'
                        }`}
                        title="Toggle ROAD Exclusive"
                      >
                        <Sparkles className={`w-3 h-3 ${project.isRoadExclusive ? "text-amber-500 fill-amber-500/20" : "opacity-40"}`} />
                        <span>{project.isRoadExclusive ? '⭐ Exclusive' : 'Exclusive: Off'}</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-medium text-text-secondary">Category:</span>
                        <select
                          value={project.displayCategory || (project.isFeatured ? "featured" : "none")}
                          onChange={async (e) => {
                            const wasSaved = await updateDisplayCategory(project.id, e.target.value as any);
                            if (wasSaved) toast.success("Project category updated!");
                          }}
                          className="bg-bg-card border border-border-default text-text-primary text-xs rounded-lg px-2.5 py-1 font-semibold focus:outline-none focus:ring-1 focus:ring-amber-primary cursor-pointer"
                        >
                          <option value="none">None (Regular)</option>
                          <option value="featured">⭐ Featured</option>
                          <option value="recommended">👍 Recommended</option>
                          <option value="budget_friendly">💰 Budget Friendly</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
                      <span className="text-amber-primary font-bold text-sm">{getPriceRange(project)}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={async () => {
                            const wasSaved = await toggleSoldOut(project.id);
                            if (wasSaved) toast.success(project.isSoldOut ? "Project marked as Active" : "Project marked as Sold Out");
                          }}
                          title={project.isSoldOut ? "Mark Active" : "Mark Sold Out"}
                          className={`px-2 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer border ${
                            project.isSoldOut
                              ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
                              : "bg-bg-primary text-text-tertiary border-border-default hover:text-text-primary"
                          }`}
                        >
                          {project.isSoldOut ? "Sold Out" : "Active"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setActivityModalProject(project)}
                          className="p-2 rounded-full text-emerald-600 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                          title="Activity Excel Report"
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setWhatsAppModalProject(project)}
                          className="p-2 rounded-full text-emerald-500 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                          title="Share on WhatsApp"
                        >
                          <WhatsAppIcon className="w-4 h-4 fill-emerald-500/20" />
                        </button>
                        <button onClick={async () => { if (await toggleFeatured(project.id)) toast.success("Updated!"); }} title={project.isFeatured ? "Unfeature" : "Feature"} className={`p-2 rounded-full transition-colors ${project.isFeatured ? "text-amber-500 hover:bg-amber-50" : "text-text-tertiary hover:text-amber-500 hover:bg-bg-primary"}`}>
                          <Star className={`w-4 h-4 ${project.isFeatured ? "fill-amber-500" : ""}`} />
                        </button>
                        <button onClick={async () => { if (await togglePublished(project.id)) toast.success("Updated!"); }} title={project.isPublished ? "Unpublish" : "Publish"} className={`p-2 rounded-full transition-colors ${project.isPublished ? "text-amber-600 hover:bg-amber-50" : "text-text-tertiary hover:text-amber-600 hover:bg-bg-primary"}`}>
                          {project.isPublished ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                        <Link href={`/admin/projects/${project.id}/edit`} className="p-2 rounded-full text-text-tertiary hover:text-text-primary hover:bg-bg-primary transition-colors">
                          <Edit3 className="w-4 h-4" />
                        </Link>
                        <button onClick={() => setDeleteTarget(project)} className="p-2 rounded-full text-red-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* WhatsApp Sharing & Business API Modal */}
      <AdminWhatsAppModal
        item={whatsAppModalProject}
        type="project"
        isOpen={Boolean(whatsAppModalProject)}
        onClose={() => setWhatsAppModalProject(null)}
      />

      {/* Project Real Activity & Excel Export Modal */}
      <ProjectActivityModal
        isOpen={Boolean(activityModalProject)}
        onClose={() => setActivityModalProject(null)}
        project={activityModalProject}
      />
    </>
  );
}
