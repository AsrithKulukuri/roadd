"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  Building2,
  MapPin,
  ShieldCheck,
  Calendar,
  CheckCircle2,
  Phone,
  MessageSquare,
  Download,
  Share2,
  Sparkles,
  ArrowRight,
  Eye,
  Clock,
  Layers,
  ChevronRight,
} from "lucide-react";
import { useProjectsStore } from "@/stores/projects-store";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function DigitalBrochurePage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;
  const { projects, fetchProjects } = useProjectsStore();

  const [dwellSeconds, setDwellSeconds] = useState(0);

  useEffect(() => {
    fetchProjects().catch(() => null);
  }, [fetchProjects]);

  const project = projects.find(p => p.slug === slug || p.id === slug) || projects[0];

  // Track dwell time
  useEffect(() => {
    const timer = setInterval(() => {
      setDwellSeconds(prev => prev + 1);
    }, 1000);

    // Initial view beacon
    fetch("/api/brochure/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectSlug: slug,
        projectName: project?.name,
        builderId: (project as any)?.builderId,
        builderName: project?.builderName,
        dwellSeconds: 1,
      }),
    }).catch(() => null);

    return () => clearInterval(timer);
  }, [slug, project]);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${project?.name} — Official Digital Brochure`,
        text: `Explore verified CRDA & RERA layout, pricing and floor plans for ${project?.name} on ROADFACING.`,
        url: window.location.href,
      }).catch(() => null);
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Brochure link copied to clipboard!");
    }
  };

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="text-center space-y-3">
          <Building2 className="w-10 h-10 text-amber-500 mx-auto animate-pulse" />
          <p className="text-sm text-muted-foreground">Loading Digital Brochure...</p>
        </div>
      </div>
    );
  }

  const phone = project.builderWhatsapp || project.builderPhone || "918885005567";
  const cleanPhone = phone.replace(/\D/g, "");

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-foreground pb-24">
      {/* Top Floating Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center font-black text-xs border border-amber-500/20">
              RF
            </span>
            <div className="flex flex-col">
              <span className="text-xs font-bold leading-tight line-clamp-1">{project.name}</span>
              <span className="text-[10px] text-muted-foreground">Digital Brochure & Master Guide</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleShare} className="h-8 text-xs gap-1.5 border-border">
              <Share2 className="w-3.5 h-3.5" />
              Share
            </Button>
            <a
              href={`https://wa.me/${cleanPhone}?text=Hi%20${encodeURIComponent(project.builderName || "Builder")},%20I%20am%20viewing%20the%20digital%20brochure%20for%20${encodeURIComponent(project.name)}%20on%20ROAD%20Facing.%20Please%20share%20pricing%20details.`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-all"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Chat on WhatsApp
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-6 space-y-6">
        {/* Cover Card */}
        <div className="relative rounded-3xl overflow-hidden border border-border shadow-md bg-card">
          <div className="h-64 sm:h-80 w-full relative">
            <img
              src={project.coverImage || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80"}
              alt={project.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 text-white space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-amber-500 text-slate-950 font-black text-[10px] uppercase px-2.5 py-0.5 rounded-full shadow-sm">
                  Official Developer Portfolio
                </span>
                {project.reraApproved && (
                  <span className="bg-emerald-500/20 backdrop-blur-md text-emerald-300 border border-emerald-500/40 font-semibold text-[10px] px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> RERA Approved: {project.reraId || "Verified"}
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight">{project.name}</h1>
              <p className="text-xs sm:text-sm text-slate-200 line-clamp-2 max-w-2xl">
                {project.tagline || "Prime road-facing landmark living venture designed with precision and architecture."}
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-300 pt-1">
                <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>{project.location?.locality || "Prime Landmark"}, {project.location?.city || "Amaravati"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Specs Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-card border border-border shadow-sm text-center space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Venture Type</span>
            <div className="text-sm font-extrabold text-foreground capitalize">{project.projectType || "Residential"}</div>
          </div>
          <div className="p-4 rounded-2xl bg-card border border-border shadow-sm text-center space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Total Towers / Area</span>
            <div className="text-sm font-extrabold text-foreground">{project.totalTowers || 2} Towers • {project.totalArea || "3.5 Acres"}</div>
          </div>
          <div className="p-4 rounded-2xl bg-card border border-border shadow-sm text-center space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Construction Status</span>
            <div className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 capitalize">{project.constructionStatus || "Active"}</div>
          </div>
          <div className="p-4 rounded-2xl bg-card border border-border shadow-sm text-center space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Possession Timeline</span>
            <div className="text-sm font-extrabold text-foreground">{project.possessionDate || "Dec 2027"}</div>
          </div>
        </div>

        {/* Key Highlights */}
        {project.highlights && project.highlights.length > 0 && (
          <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-3">
            <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Why Choose {project.name}?
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {project.highlights.map((h, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-foreground/90 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span>{h}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Configurations & Floor Plans */}
        <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-500" />
              Available Floor Plans & Configurations
            </h3>
            <span className="text-xs text-muted-foreground font-semibold">
              {project.configurations?.length || 2} Unit Options
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(project.configurations || [
              { label: "3 BHK Luxury Suite", builtUpAreaMin: 1850, priceMin: 7200000, priceMax: 8400000, facing: ["East", "North"] },
              { label: "2 BHK Compact Executive", builtUpAreaMin: 1350, priceMin: 5400000, priceMax: 6200000, facing: ["West"] },
            ]).map((c, i) => (
              <div key={i} className="p-4 rounded-xl border border-border/80 bg-muted/30 space-y-2">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-sm text-foreground">{c.label}</h4>
                  <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                    ₹{(c.priceMin / 100000).toFixed(1)}L - ₹{(c.priceMax / 100000).toFixed(1)}L
                  </span>
                </div>
                <div className="text-xs text-muted-foreground flex gap-3">
                  <span>Size: <strong className="text-foreground">{c.builtUpAreaMin || 1650} sq.ft</strong></span>
                  {c.facing && <span>Facing: <strong className="text-foreground">{Array.isArray(c.facing) ? c.facing.join(", ") : c.facing}</strong></span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Amenities */}
        {project.facilities && project.facilities.length > 0 && (
          <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-3">
            <h3 className="text-base font-extrabold text-foreground">Curated World-Class Amenities</h3>
            <div className="flex flex-wrap gap-2">
              {project.facilities.map((f, i) => (
                <span key={i} className="px-3 py-1.5 rounded-xl bg-muted text-foreground text-xs font-medium border border-border">
                  ✨ {f}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* CTA Bar */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-xl space-y-3">
          <h3 className="text-xl font-black">Plan a Direct Site Visit with {project.builderName}</h3>
          <p className="text-xs text-slate-900 leading-relaxed max-w-xl font-medium">
            Experience the construction quality, model flat, and road connectivity firsthand. No brokerage charges.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href={`/projects/${project.slug}#site-visit`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-950 text-white font-bold text-xs shadow-md hover:bg-slate-900 transition-all"
            >
              <Calendar className="w-4 h-4" />
              Schedule Free Site Visit
            </Link>
            <a
              href={`tel:${cleanPhone}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-slate-950 font-bold text-xs shadow-md hover:bg-slate-100 transition-all"
            >
              <Phone className="w-4 h-4" />
              Call Builder Desk
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
