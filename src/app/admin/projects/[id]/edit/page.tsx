"use client";

import { use, useEffect, useState } from "react";
import { useProjectsStore, fromSupabaseProject } from "@/stores/projects-store";
import { supabase } from "@/lib/supabase";
import { ProjectForm } from "@/components/admin/project-form";
import { Building2, Loader2 } from "lucide-react";
import type { Project } from "@/types/project";

export default function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { projects, fetchProjects } = useProjectsStore();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProject() {
      setLoading(true);
      try {
        // 1. Always query Supabase directly for the freshest data
        const { data, error } = await supabase
          .from("projects")
          .select("*")
          .or(`id.eq.${id},slug.eq.${id}`)
          .maybeSingle();

        if (data && !error) {
          setProject(fromSupabaseProject(data));
        } else {
          // Fallback to local store
          const found = projects.find((p) => p.id === id || p.slug === id);
          if (found) setProject(found);
        }
      } catch (err) {
        console.error("Error loading project for edit:", err);
      } finally {
        setLoading(false);
      }
    }

    loadProject();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-text-secondary">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <p className="font-semibold text-sm">Loading project details...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-text-secondary">
        <Building2 className="w-12 h-12 opacity-30" />
        <p className="font-semibold text-lg">Project not found</p>
        <a href="/admin/projects" className="text-amber-primary hover:underline text-sm">← Back to Projects</a>
      </div>
    );
  }

  return <ProjectForm key={project.id || project.slug} mode="edit" initialData={project} />;
}
