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
  MapPin, CheckCircle2, AlertCircle, Play,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Project, ProjectType } from "@/types/project";

const TYPE_CONFIG: Record<ProjectType, { label: string; icon: React.ElementType; color: string }> = {
  apartment: { label: "Apartment", icon: Building2, color: "text-amber-500 bg-amber-500/10 border-amber-500/30" },
  villa:     { label: "Villa",     icon: Home,      color: "text-amber-500 bg-amber-500/10 border-amber-500/30" },
  venture:   { label: "Venture",   icon: Landmark,  color: "text-amber-500 bg-amber-500/10 border-amber-500/30" },
};

const STATUS_CONFIG = {
  "under-construction": { label: "Under Construction", color: "text-orange-500 bg-orange-500/10" },
  "ready-to-move":      { label: "Ready to Move",      color: "text-amber-500 bg-amber-500/10" },
  "new-launch":         { label: "New Launch",          color: "text-amber-500 bg-amber-500/10" },
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
  const { projects, fetchProjects, deleteProject, toggleFeatured, togglePublished } = useProjectsStore();
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [filterType, setFilterType] = useState<ProjectType | "all">("all");

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const filtered = filterType === "all"
    ? projects
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

      <div className="p-6 lg:p-10 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold font-heading text-text-primary">Projects</h1>
            <p className="text-text-secondary mt-1">
              Manage builder projects — Apartments, Villas & Ventures.
            </p>
          </div>
          <Button variant="amber" asChild>
            <Link href="/admin/projects/new" className="gap-2">
              <Plus className="w-4 h-4" /> Add New Project
            </Link>
          </Button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {(["all", "apartment", "villa", "venture"] as const).map((type) => {
            const count = type === "all" ? projects.length : projects.filter((p) => p.projectType === type).length;
            const active = filterType === type;
            return (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  active
                    ? "border-amber-primary/50 bg-amber-primary/10"
                    : "border-border-default bg-bg-card hover:border-amber-primary/30"
                }`}
              >
                <div className="text-2xl font-bold font-heading text-text-primary">{count}</div>
                <div className="text-sm text-text-secondary capitalize mt-0.5">
                  {type === "all" ? "All Projects" : `${type}s`}
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
                  <th className="text-left px-4 py-4 font-semibold text-text-secondary">Flags</th>
                  <th className="px-4 py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-20 text-center text-text-secondary">
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
                              <p className="font-semibold text-text-primary truncate max-w-[200px]">{project.name}</p>
                              <p className="text-xs text-text-tertiary">{project.builderName}</p>
                            </div>
                          </div>
                        </td>
                        {/* Type badge */}
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${TC.color}`}>
                            <Icon className="w-3 h-3" />
                            {TC.label}
                          </span>
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
                        {/* Construction status */}
                        <td className="px-4 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${SC.color}`}>
                            {SC.label}
                          </span>
                        </td>
                        {/* Flags */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={async () => { await toggleFeatured(project.id); toast.success("Updated!"); }}
                              title={project.isFeatured ? "Unfeature" : "Feature"}
                              className={`p-2 rounded-full transition-colors ${project.isFeatured ? "text-amber-500 hover:bg-amber-50" : "text-text-tertiary hover:text-amber-500 hover:bg-bg-primary"}`}
                            >
                              <Star className={`w-4 h-4 ${project.isFeatured ? "fill-amber-500" : ""}`} />
                            </button>
                            <button
                              onClick={async () => { await togglePublished(project.id); toast.success("Updated!"); }}
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
                        {/* Actions */}
                        <td className="px-4 py-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-2 rounded-lg hover:bg-bg-primary text-text-secondary hover:text-text-primary transition-colors">
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40 bg-white dark:bg-bg-card border border-border-default">
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
                                className="text-red-500 focus:text-red-500 flex items-center gap-2"
                                onClick={() => setDeleteTarget(project)}
                              >
                                <Trash2 className="w-4 h-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
                        <p className="font-bold text-text-primary truncate">{project.name}</p>
                        <p className="text-xs text-text-tertiary">{project.builderName}</p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${TC.color}`}>
                            <Icon className="w-2.5 h-2.5" />{TC.label}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${SC.color}`}>
                            {SC.label}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
                      <span className="text-amber-primary font-bold text-sm">{getPriceRange(project)}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={async () => { await toggleFeatured(project.id); toast.success("Updated!"); }} className={`p-2 rounded-full transition-colors ${project.isFeatured ? "text-amber-500 hover:bg-amber-50" : "text-text-tertiary hover:text-amber-500 hover:bg-bg-primary"}`}>
                          <Star className={`w-4 h-4 ${project.isFeatured ? "fill-amber-500" : ""}`} />
                        </button>
                        <button onClick={async () => { await togglePublished(project.id); toast.success("Updated!"); }} className={`p-2 rounded-full transition-colors ${project.isPublished ? "text-amber-600 hover:bg-amber-50" : "text-text-tertiary hover:text-amber-600 hover:bg-bg-primary"}`}>
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
    </>
  );
}
