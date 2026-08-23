"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useProjectsStore } from "@/stores/projects-store";
import { ProjectCard } from "@/components/project/project-card";
import { ArrowRight, Building2 } from "lucide-react";

export function FeaturedProjects() {
  const { projects, fetchProjects } = useProjectsStore();

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const featured = projects.filter((p) => p.isPublished && p.isFeatured).slice(0, 6);

  if (featured.length === 0) return null;

  return (
    <section className="py-16 sm:py-20 bg-bg-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-primary/10 border border-amber-primary/20 text-amber-primary text-xs font-semibold mb-3">
              <Building2 className="w-3.5 h-3.5" /> Builder Projects
            </div>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-text-primary tracking-tight">
              Featured Projects
            </h2>
            <p className="text-text-secondary mt-2">
              Apartments, Villas &amp; Ventures from top builders
            </p>
          </div>
          <Link
            href="/search?type=projects"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-primary hover:underline shrink-0"
          >
            View all projects <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {featured.map((project, i) => (
            <ProjectCard key={project.id} project={project} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
