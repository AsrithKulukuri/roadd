"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Building2, Search, ArrowRight } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { ProjectCard } from "@/components/project/project-card";
import { useProjectsStore } from "@/stores/projects-store";
import { evaluateProjectFilters, parseSearchIntent } from "@/lib/search-engine";

export function ProjectsOnlyLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const browse = pathname === "/" || pathname === "/search" || pathname === "/projects";
  const unavailable = /^\/(properties|property|list-with-us|dashboard)(\/|$)/.test(pathname);
  return <>
    <header className="border-b border-border-default bg-bg-card">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6">
        <Logo />
        <nav aria-label="Main navigation" className="flex items-center gap-5 text-sm font-semibold">
          <Link href="/search?type=projects" className="hover:text-amber-600">Projects</Link>
          <Link href="/contact" className="hover:text-amber-600">Contact</Link>
          <Link href="/login" className="rounded-xl border border-border-default px-4 py-2 hover:bg-amber-500/10">Account</Link>
        </nav>
      </div>
    </header>
    <main className="flex-1">
      {browse ? <ProjectExplorer key={pathname} /> : unavailable ? <section className="mx-auto max-w-2xl px-5 py-24 text-center">
        <Building2 className="mx-auto mb-5 h-10 w-10 text-amber-600" />
        <h1 className="text-3xl font-bold">Discover your next project</h1>
        <p className="mt-4 text-text-secondary">This section is currently unavailable. Explore apartments, villas and ventures from our builders.</p>
        <Link href="/search?type=projects" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 font-bold text-slate-950">Explore projects <ArrowRight size={18} /></Link>
      </section> : children}
    </main>
    <footer className="border-t border-border-default bg-bg-card px-4 py-8">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 text-sm text-text-secondary">
        <p>Road Facing · Real projects. Real updates.</p>
        <nav aria-label="Footer navigation" className="flex flex-wrap gap-5"><Link href="/about">About</Link><Link href="/contact">Contact</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></nav>
      </div>
    </footer>
  </>;
}

function ProjectExplorer() {
  const params = useSearchParams();
  const pathname = usePathname();
  const { projects, isLoading, error, fetchProjects } = useProjectsStore();
  const [query, setQuery] = useState(params.get("q") || params.get("city") || "");
  const [kind, setKind] = useState(params.get("projectType") || params.get("propertyType") || "all");
  const [status, setStatus] = useState("all");
  const intent = parseSearchIntent(query);
  const results = projects.filter(project => project.isPublished &&
    (kind === "all" || project.projectType === kind) &&
    (status === "all" || project.constructionStatus === status) &&
    evaluateProjectFilters(project, { query }, undefined, intent));
  const control = "min-h-12 w-full rounded-xl border border-border-default bg-bg-card px-4 text-sm text-text-primary focus-visible:outline-2 focus-visible:outline-amber-500";
  return <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16">
    <section className="mb-8 rounded-3xl border border-amber-500/20 bg-amber-500/5 p-6 sm:p-10">
      <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400"><Building2 size={16} /> Builder projects</p>
      <h1 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-5xl">{pathname === "/" ? "Find a place to build your future." : "Explore projects"}</h1>
      <p className="mt-4 max-w-xl text-text-secondary">Discover apartments, villas and ventures. Explore plans, follow construction updates and connect with builders.</p>
      <div className="mt-7 grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]">
        <label className="space-y-2 text-sm font-semibold"><span>Search projects</span><div className="relative"><Search className="pointer-events-none absolute left-4 top-4 h-4 w-4 text-text-secondary" /><input className={`${control} pl-11`} type="search" placeholder="Project name, city or locality" value={query} onChange={event => setQuery(event.target.value)} /></div></label>
        <label className="space-y-2 text-sm font-semibold"><span>Project type</span><select aria-label="Project type" className={control} value={kind} onChange={event => setKind(event.target.value)}><option value="all">All projects</option><option value="apartment">Apartments</option><option value="villa">Villas</option><option value="venture">Ventures</option></select></label>
        <label className="space-y-2 text-sm font-semibold"><span>Construction status</span><select aria-label="Construction status" className={control} value={status} onChange={event => setStatus(event.target.value)}><option value="all">Any status</option><option value="new-launch">New launch</option><option value="under-construction">Under construction</option><option value="ready-to-move">Ready to move</option></select></label>
      </div>
    </section>
    <div className="mb-5 flex items-center justify-between gap-4"><h2 className="text-xl font-bold" aria-live="polite">{isLoading ? "Loading projects…" : `${results.length} projects`}</h2><button className="min-h-11 cursor-pointer text-sm font-semibold underline underline-offset-4" onClick={() => { setQuery(""); setKind("all"); setStatus("all"); }}>Clear filters</button></div>
    {error ? <div role="alert" className="rounded-2xl border border-border-default p-8"><p>Projects could not be loaded.</p><button className="mt-3 cursor-pointer underline" onClick={() => void fetchProjects()}>Try again</button></div> : isLoading && !projects.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading projects">{[0, 1, 2].map(i => <div key={i} className="h-80 animate-pulse rounded-2xl bg-bg-card motion-reduce:animate-none" />)}</div> : results.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{results.map((project, index) => <ProjectCard key={project.id} project={project} index={index} />)}</div> : <div className="rounded-2xl border border-dashed border-border-default p-12 text-center"><h3 className="font-bold">No projects found</h3><p className="mt-2 text-sm text-text-secondary">Try another location or clear your filters.</p></div>}
  </div>;
}
