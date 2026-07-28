"use client";

import { use } from "react";
import { useProjectsStore } from "@/stores/projects-store";
import { ProjectForm } from "@/components/admin/project-form";
import { Building2 } from "lucide-react";

export default function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const project = useProjectsStore((state) => state.projects.find((p) => p.id === id));

  if (!project) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-text-secondary">
        <Building2 className="w-12 h-12 opacity-30" />
        <p className="font-semibold text-lg">Project not found</p>
        <a href="/admin/projects" className="text-amber-primary hover:underline text-sm">← Back to Projects</a>
      </div>
    );
  }

  return <ProjectForm mode="edit" initialData={project} />;
}
