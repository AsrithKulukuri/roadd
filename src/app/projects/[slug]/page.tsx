"use client";

import { use, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useProjectsStore } from "@/stores/projects-store";
import { getYoutubeEmbedUrl, isYoutubeShort } from "@/lib/utils";
import {
  MapPin, CheckCircle2, Phone, MessageCircle, Download,
  ChevronDown, ChevronUp, Star, ArrowLeft, Building2, Home, Landmark,
  Eye, X, ChevronLeft, ChevronRight, Play, Map,
} from "lucide-react";
import Link from "next/link";
import { BackButton } from "@/components/ui/back-button";
import type { Project, ProjectConfig } from "@/types/project";

// ─── Lazy map (SSR unsafe) ─────────────────────────────────────────────────────
const ProjectMapView = dynamic(
  () => import("@/components/project/project-map-view"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[320px] flex items-center justify-center bg-bg-primary rounded-2xl border border-border-default animate-pulse">
        <Map className="w-8 h-8 text-text-tertiary/40" />
      </div>
    ),
  }
);

const CommuteRadiusMap = dynamic(
  () => import("@/components/project/commute-radius-map"),
  { ssr: false }
);

const LandUseSimulator = dynamic(
  () => import("@/components/project/land-use-simulator"),
  { ssr: false }
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatINRCrore(amount: number): string {
  if (!amount) return "—";
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000)   return `₹${(amount / 100000).toFixed(2)} L`;
  return `₹${amount.toLocaleString("en-IN")}`;
}

function getPriceRange(configs: ProjectConfig[]): string {
  const prices = configs.flatMap((c) => [c.priceMin, c.priceMax]).filter(Boolean);
  if (!prices.length) return "Price on request";
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? formatINRCrore(min) : `${formatINRCrore(min)} – ${formatINRCrore(max)}`;
}

const STATUS_COLORS = {
  "under-construction": "text-orange-500 bg-orange-500/10",
  "ready-to-move":      "text-green-600 bg-green-500/10",
  "new-launch":         "text-blue-500 bg-blue-500/10",
};
const STATUS_LABELS = {
  "under-construction": "Under Construction",
  "ready-to-move":      "Ready to Move",
  "new-launch":         "New Launch",
};
const TYPE_ICONS = { apartment: Building2, villa: Home, venture: Landmark };

// ─── Gallery Modal ─────────────────────────────────────────────────────────────

function GalleryModal({
  images, startIdx, onClose,
}: {
  images: { url: string; alt?: string; category?: string }[];
  startIdx: number;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(startIdx);
  const prev = () => setIdx((i) => (i - 1 + images.length) % images.length);
  const next = () => setIdx((i) => (i + 1) % images.length);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  return (
    <div className="fixed inset-0 z-[9999] bg-black/95 flex flex-col items-center justify-center p-4">
      {/* Back button top-left */}
      <button
        onClick={onClose}
        className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 hover:bg-amber-500 hover:text-slate-950 text-white border border-white/20 text-xs font-bold transition-all cursor-pointer shadow-lg"
        title="Back to project"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Project ({idx + 1}/{images.length})</span>
      </button>

      {/* Close X button top-right */}
      <button onClick={onClose} className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-slate-900/90 hover:bg-amber-500 hover:text-slate-950 text-white border border-white/20 transition-all cursor-pointer shadow-lg" title="Close photo gallery">
        <X className="w-5 h-5" />
      </button>

      <button onClick={prev} className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-slate-900/80 hover:bg-amber-500 hover:text-slate-950 text-white transition-all cursor-pointer z-10">
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button onClick={next} className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-slate-900/80 hover:bg-amber-500 hover:text-slate-950 text-white transition-all cursor-pointer z-10">
        <ChevronRight className="w-6 h-6" />
      </button>
      <img src={images[idx].url} alt={images[idx].alt ?? "Project image"} className="max-h-[85vh] max-w-full object-contain rounded-xl" />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = ["Floor Plans", "Facilities", "Location", "Brochure", "Builder"] as const;
type Tab = (typeof TABS)[number];

export default function ProjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { projects, fetchProjects } = useProjectsStore();

  const [activeTab, setActiveTab] = useState<Tab>("Floor Plans");
  const [statusOpen, setStatusOpen] = useState(true);
  const [galleryIdx, setGalleryIdx] = useState<number | null>(null);
  const [activeConfigLabel, setActiveConfigLabel] = useState<string>("All");
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [floorPlanLightbox, setFloorPlanLightbox] = useState<{ url: string; label: string } | null>(null);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const project = projects.find((p) => p.slug === slug && p.isPublished);

  useEffect(() => {
    if (!project) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleSections = entries.filter((entry) => entry.isIntersecting);
        if (visibleSections.length > 0) {
          const visible = visibleSections[0];
          const tabName = TABS.find((t) => t.toLowerCase().replace(" ", "-") === visible.target.id);
          if (tabName) setActiveTab(tabName as Tab);
        }
      },
      { rootMargin: "-120px 0px -40% 0px" }
    );

    setTimeout(() => {
      TABS.forEach((tab) => {
        const el = document.getElementById(tab.toLowerCase().replace(" ", "-"));
        if (el) observer.observe(el);
      });
    }, 100);

    return () => observer.disconnect();
  }, [project?.id]);

  if (!project) {
    return (
      <div className="min-h-screen pt-24 flex flex-col items-center justify-center gap-4 text-text-secondary">
        <Building2 className="w-12 h-12 opacity-30" />
        <h2 className="text-xl font-bold text-text-primary">Project not found</h2>
        <Link href="/projects" className="text-amber-primary hover:underline">← Browse all projects</Link>
      </div>
    );
  }

  const TypeIcon = TYPE_ICONS[project.projectType];
  const priceRange = getPriceRange(project.configurations);

  // Gallery images including all
  const galleryAll = project.images;
  const heroImage  = project.coverImage ?? galleryAll[0]?.url;
  const sideImages = galleryAll.filter((i) => i.url !== heroImage).slice(0, 2);

  // WhatsApp URL
  const whatsapp = project.builderWhatsapp
    ? `https://wa.me/${project.builderWhatsapp.replace(/\D/g, "")}?text=Hi, I am interested in ${project.name}`
    : null;
  const phone = project.builderPhone ? `tel:${project.builderPhone.replace(/\s/g, "")}` : null;

  // YouTube embed — use the full utility that handles Shorts, Live, share links, etc.
  const videoEmbed = getYoutubeEmbedUrl(project.videoUrl);
  const isShort = isYoutubeShort(project.videoUrl);

  // Group configurations by label
  const groupedConfigs = project.configurations.reduce((acc, cfg) => {
    const found = acc.find(g => g.label === cfg.label);
    if (found) found.configs.push(cfg);
    else acc.push({ label: cfg.label, configs: [cfg] });
    return acc;
  }, [] as { label: string; configs: ProjectConfig[] }[]);

  const currentLabel = activeConfigLabel === "All" ? "All" : (activeConfigLabel || groupedConfigs[0]?.label || "All");
  const activeGroupConfigs = groupedConfigs.find(g => g.label === currentLabel)?.configs || [];

  return (
    <>
      {/* Gallery modal */}
      {galleryIdx !== null && (
        <GalleryModal images={galleryAll} startIdx={galleryIdx} onClose={() => setGalleryIdx(null)} />
      )}

      {/* Floor Plan Lightbox */}
      {floorPlanLightbox && (
        <div
          className="fixed inset-0 z-[9999] bg-black/95 flex flex-col items-center justify-center p-4"
          onClick={() => setFloorPlanLightbox(null)}
        >
          {/* Back button top-left */}
          <button
            onClick={() => setFloorPlanLightbox(null)}
            className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 hover:bg-amber-500 hover:text-slate-950 text-white border border-white/20 text-xs font-bold transition-all cursor-pointer shadow-lg"
            title="Back to project"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Project</span>
          </button>
          {/* Close button top-right */}
          <button
            onClick={() => setFloorPlanLightbox(null)}
            className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-slate-900/90 hover:bg-amber-500 hover:text-slate-950 text-white border border-white/20 transition-all cursor-pointer shadow-lg"
            title="Close floor plan"
          >
            <X className="w-5 h-5" />
          </button>
          <p className="absolute top-5 left-5 text-white/70 text-sm font-semibold">
            {floorPlanLightbox.label} — Floor Plan
          </p>
          <div
            className="w-full max-w-3xl max-h-[85vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={floorPlanLightbox.url}
              alt={`${floorPlanLightbox.label} floor plan`}
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
            />
          </div>
          <p className="mt-4 text-white/40 text-xs">Click anywhere outside to close</p>
        </div>
      )}

      {/* Video Tour Modal */}
      {isVideoOpen && videoEmbed && (
        <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4" onClick={() => setIsVideoOpen(false)}>
          <div
            className={`relative w-full bg-black rounded-3xl overflow-hidden shadow-2xl ${isShort ? "max-w-[420px]" : "max-w-4xl"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 bg-slate-900">
              <button
                onClick={() => setIsVideoOpen(false)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-amber-500 hover:text-slate-950 text-white text-xs font-bold transition-all cursor-pointer shrink-0"
                title="Back to project"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              <div className="flex items-center gap-2 text-white font-bold text-sm truncate mx-2">
                <Play className="w-4 h-4 text-red-500 fill-red-500 shrink-0" />
                {isShort ? "Video Short Tour" : "Project Video Tour"} — {project.name}
              </div>
              <button onClick={() => setIsVideoOpen(false)} className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0" title="Close video">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className={`relative w-full bg-black flex items-center justify-center ${isShort ? "aspect-[9/16] max-h-[75vh]" : "aspect-video"}`}>
              <iframe
                src={`${videoEmbed}?autoplay=1`}
                title={`${project.name} Video Tour`}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-slate-50 dark:bg-bg-primary pt-16">
        {/* Breadcrumb & Back Button */}
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BackButton />
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <Link href="/" className="hover:text-amber-primary transition-colors">Home</Link>
              <span>/</span>
              <Link href="/projects" className="hover:text-amber-primary transition-colors">Projects</Link>
              <span>/</span>
              <span className="text-text-primary font-medium">{project.name}</span>
            </div>
          </div>
        </div>

        {/* Hero Gallery */}
        <div className="max-w-7xl mx-auto px-3 sm:px-4 mb-4">
          {/* Mobile: single full image with photo count badge */}
          <div className="sm:hidden relative aspect-[4/3] rounded-2xl overflow-hidden bg-bg-card cursor-pointer" onClick={() => heroImage && setGalleryIdx(0)}>
            {heroImage ? (
              <img src={heroImage} alt={project.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-amber-primary/20 to-amber-primary/5 flex items-center justify-center">
                <TypeIcon className="w-16 h-16 text-amber-primary/30" />
              </div>
            )}
            {galleryAll.length > 0 && (
              <button onClick={(e) => { e.stopPropagation(); setGalleryIdx(0); }}
                className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/70 text-white text-xs font-semibold px-3 py-1.5 rounded-full z-10">
                <Eye className="w-3.5 h-3.5" /> {galleryAll.length} Photos
              </button>
            )}
            {videoEmbed && (
              <button onClick={(e) => { e.stopPropagation(); setIsVideoOpen(true); }}
                className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-full shadow-lg z-10">
                <Play className="w-3.5 h-3.5 fill-white text-white" /> Watch Tour
              </button>
            )}
            {/* Thumbnail strip */}
            {galleryAll.length > 1 && (
              <div className="absolute bottom-0 left-0 right-0 px-3 pb-2 pt-6 bg-gradient-to-t from-black/60 flex gap-2 overflow-x-auto scrollbar-none">
                {galleryAll.slice(0, 6).map((img, i) => (
                  <div key={i} onClick={(e) => { e.stopPropagation(); setGalleryIdx(i); }}
                    className="shrink-0 w-12 h-9 rounded-lg overflow-hidden border-2 border-white/60 cursor-pointer">
                    <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Desktop: 3-col grid */}
          <div className="hidden sm:grid grid-cols-3 gap-2 rounded-2xl overflow-hidden h-[400px] md:h-[450px] lg:h-[500px]">
            <div className="col-span-2 relative cursor-pointer group" onClick={() => heroImage && setGalleryIdx(0)}>
              {heroImage ? (
                <img src={heroImage} alt={project.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-amber-primary/20 to-amber-primary/5 flex items-center justify-center">
                  <TypeIcon className="w-16 h-16 text-amber-primary/30" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
              {/* Bottom action bar */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
                {galleryAll.length > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setGalleryIdx(0); }}
                    className="pointer-events-auto flex items-center gap-2 bg-black/70 text-white text-xs font-medium px-3 py-1.5 rounded-full hover:bg-black/90 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" /> All Photos ({galleryAll.length})
                  </button>
                )}
                {videoEmbed && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setIsVideoOpen(true); }}
                    className="pointer-events-auto flex items-center gap-2 bg-white/90 hover:bg-white text-slate-950 text-xs font-black px-4 py-1.5 rounded-full shadow-xl transition-all hover:scale-105"
                  >
                    <Play className="w-3.5 h-3.5 fill-red-600 text-red-600" /> Watch Tour
                  </button>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {sideImages.length > 0 ? (
                sideImages.map((img, i) => (
                  <div key={i} className="flex-1 relative cursor-pointer group" onClick={() => setGalleryIdx(galleryAll.findIndex((x) => x.url === img.url))}>
                    <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    {img.category && (
                      <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded text-[10px] font-medium bg-black/60 text-white capitalize">{img.category}</span>
                    )}
                  </div>
                ))
              ) : (
                <>
                  <div className="flex-1 bg-bg-card border border-border-default flex items-center justify-center">
                    <TypeIcon className="w-8 h-8 text-text-tertiary/30" />
                  </div>
                  <div className="flex-1 bg-bg-card border border-border-default flex items-center justify-center">
                    <TypeIcon className="w-8 h-8 text-text-tertiary/30" />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Sticky Tabs */}
        <div className="sticky top-16 z-20 bg-white dark:bg-bg-card border-b border-border-default shadow-sm">
          <div className="max-w-7xl mx-auto px-2 sm:px-4 flex items-center gap-0.5 sm:gap-1 overflow-x-auto scrollbar-none touch-pan-x">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  const el = document.getElementById(tab.toLowerCase().replace(" ", "-"));
                  if (el) {
                    const y = el.getBoundingClientRect().top + window.scrollY - 120;
                    window.scrollTo({ top: y, behavior: "smooth" });
                  }
                }}
                className={`shrink-0 px-3 sm:px-4 py-3.5 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === tab
                    ? "border-amber-primary text-amber-primary"
                    : "border-transparent text-text-secondary hover:text-text-primary"
                }`}
              >
                {tab === "Floor Plans" && project.projectType === "venture" ? "Plot Layouts" : tab}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2 py-2 shrink-0 pl-2">
              {videoEmbed && (
                <button
                  onClick={() => setIsVideoOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-sm shrink-0 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-white text-white" /> Watch Tour
                </button>
              )}
              {project.brochureUrl && (
                <a href={project.brochureUrl} target="_blank" rel="noopener noreferrer"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border-default text-xs font-semibold text-text-primary hover:border-amber-primary transition-colors">
                  <Download className="w-3.5 h-3.5" /> Brochure
                </a>
              )}
              {phone && (
                <a href={phone} className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-primary text-slate-950 text-xs font-bold hover:bg-amber-500 transition-colors">
                  <Phone className="w-3.5 h-3.5" /> View Number
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-28 sm:pb-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-8">
            {/* Left / Main column */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              {/* Project Header */}
              <div className="bg-white dark:bg-bg-card border border-border-default rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  {project.builderLogoUrl && (
                    <img src={project.builderLogoUrl} alt={project.builderName} className="h-14 w-14 object-contain rounded-xl border border-border-default p-1 shrink-0" />
                  )}
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold font-heading text-text-primary">{project.name}</h1>
                    <div className="flex items-center gap-1 text-text-secondary text-sm mt-1">
                      <MapPin className="w-4 h-4" />
                      {project.location.locality}, {project.location.city}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {videoEmbed && (
                        <button
                          onClick={() => setIsVideoOpen(true)}
                          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-600 border border-red-500/30 hover:bg-red-500/20 transition-all cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-red-600 text-red-600" /> Watch Tour
                        </button>
                      )}
                      {project.reraApproved && (
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-500/10 text-green-600 border border-green-500/20">
                          <CheckCircle2 className="w-3 h-3" /> RERA
                        </span>
                      )}
                      {project.noBrokerage && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20">No Brokerage</span>
                      )}
                      {project.totalUnits && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-bg-primary border border-border-default text-text-secondary">
                          {project.totalUnits} {project.projectType === "apartment" ? "Units" : project.projectType === "villa" ? "Villas" : "Plots"}
                          {project.totalArea && ` in ${project.totalArea}`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Construction Status */}
              <div className="bg-white dark:bg-bg-card border border-border-default rounded-2xl overflow-hidden">
                <button
                  onClick={() => setStatusOpen((v) => !v)}
                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-bg-primary/50 transition-colors"
                >
                  <div>
                    <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-1">Construction Status</p>
                    <p className={`text-lg font-bold ${STATUS_COLORS[project.constructionStatus].split(" ")[0]}`}>
                      {STATUS_LABELS[project.constructionStatus]}
                    </p>
                  </div>
                  {statusOpen ? <ChevronUp className="w-5 h-5 text-text-tertiary" /> : <ChevronDown className="w-5 h-5 text-text-tertiary" />}
                </button>
                {statusOpen && project.phases.length > 0 && (
                  <div className="px-6 pb-5 space-y-3 border-t border-border-default pt-4">
                    {project.phases.map((phase, i) => (
                      <div key={phase.id} className="flex items-center gap-3 p-3 rounded-xl bg-bg-primary border border-border-default">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${STATUS_COLORS[phase.status]}`}>
                          {i + 1}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-text-primary">{phase.name} <span className={`ml-2 text-xs font-medium ${STATUS_COLORS[phase.status]}`}>is {STATUS_LABELS[phase.status]}</span></p>
                          {phase.possessionDate && (
                            <p className="text-xs text-text-tertiary">Possession: {phase.possessionDate}</p>
                          )}
                          {phase.totalUnits && (
                            <p className="text-xs text-text-tertiary">{phase.totalUnits} {project.projectType === "venture" ? "plots" : "units"}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Price Range */}
              <div className="bg-white dark:bg-bg-card border border-border-default rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-1">Price Range</p>
                  <p className="text-2xl font-bold text-amber-primary">{priceRange}
                    <span className="text-sm font-medium text-text-secondary ml-2">+ Charges</span>
                  </p>
                  {project.configurations[0] && (
                    <p className="text-sm text-text-secondary mt-1">
                      {[...new Set(project.configurations.map((c) => c.label))].join(", ")} {project.projectType === "venture" ? "Plots" : project.projectType === "villa" ? "Villa" : "Apartment"}
                    </p>
                  )}
                </div>
                {project.brochureUrl && (
                  <a href={project.brochureUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-amber-primary text-amber-primary font-semibold text-sm hover:bg-amber-primary/10 transition-colors">
                    <Download className="w-4 h-4" /> Download Brochure
                  </a>
                )}
              </div>

              {/* Tab Content Area */}
              <div className="space-y-8">
                <section id="floor-plans" className="scroll-mt-32">
                  <div className="bg-white dark:bg-bg-card border border-border-default rounded-2xl p-6">
                  <h2 className="text-xl font-bold text-text-primary mb-4">
                    {project.projectType === "venture" ? "Plot Layouts & Pricing" : project.projectType === "villa" ? "Villa Configurations & Pricing" : "Floor Plans & Pricing"}
                  </h2>

                  {/* Config tabs */}
                  <div className="flex gap-3 flex-wrap mb-6">
                    <button
                      onClick={() => setActiveConfigLabel("All")}
                      className={`px-5 py-2.5 rounded-full text-sm flex items-center justify-center border transition-all ${
                        currentLabel === "All"
                          ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white"
                          : "bg-white text-text-secondary border-border-default hover:border-amber-primary/40 dark:bg-bg-primary"
                      }`}
                    >
                      <span className="font-bold">All</span>
                    </button>
                    {groupedConfigs.map((group) => (
                      <button key={group.label} onClick={() => setActiveConfigLabel(group.label)}
                        className={`px-5 py-1.5 rounded-full text-sm flex flex-col items-center justify-center border transition-all ${
                          currentLabel === group.label
                            ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white"
                            : "bg-white text-text-secondary border-border-default hover:border-amber-primary/40 dark:bg-bg-primary"
                        }`}
                      >
                        <span className="font-bold">{group.label}</span>
                        <span className="text-[10px] opacity-80">{group.configs.length} Size{group.configs.length !== 1 ? 's' : ''}</span>
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-none pb-4 -mx-6 px-6">
                    {(currentLabel === "All" ? project.configurations : activeGroupConfigs).map((cfg, idx) => (
                      <div key={cfg.id || idx} className="w-[85vw] sm:w-[320px] shrink-0 snap-center p-4 rounded-2xl border border-border-default bg-bg-primary flex flex-col gap-4">
                        {cfg.floorPlanUrl && (
                          <div
                            className="rounded-xl overflow-hidden bg-white aspect-[4/3] cursor-zoom-in border border-border-default flex items-center justify-center relative group"
                            onClick={() => setFloorPlanLightbox({ url: cfg.floorPlanUrl!, label: cfg.label })}
                          >
                            <img src={cfg.floorPlanUrl} alt={`${cfg.label} floor plan`} className="max-w-full max-h-full object-contain p-2" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-xl" />
                            <div className="absolute top-2 right-2 bg-black/70 text-white text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1">
                              <Eye className="w-3 h-3" /> View
                            </div>
                          </div>
                        )}
                        
                        <div className="space-y-1 flex-1">
                          {cfg.possessionDate && (
                            <p className="text-sm text-text-secondary font-medium mb-1">Possession by {cfg.possessionDate}</p>
                          )}
                          <p className="text-lg font-bold text-text-primary">{cfg.label}</p>
                          
                          <div className="flex justify-between items-end mt-2">
                            <div>
                              <p className="text-xs text-text-tertiary">
                                {project.projectType === "venture" ? "Plot Area" : "Super built-up area"}
                              </p>
                              {cfg.builtUpAreaMin != null && project.projectType !== "venture" && (
                                <div className="flex items-center gap-1">
                                  <p className="text-sm font-semibold text-text-secondary">
                                    {cfg.builtUpAreaMin} – {cfg.builtUpAreaMax} sq.ft
                                  </p>
                                </div>
                              )}
                              {cfg.superBuiltUpAreaMin != null && (
                                <div className="flex items-center gap-1 mt-0.5">
                                  <p className="text-sm font-semibold text-text-secondary">
                                    {cfg.superBuiltUpAreaMin}
                                    {cfg.superBuiltUpAreaMax && cfg.superBuiltUpAreaMax !== cfg.superBuiltUpAreaMin ? ` – ${cfg.superBuiltUpAreaMax}` : ""} sq.ft
                                  </p>
                                  <ChevronDown className="w-3.5 h-3.5 text-text-tertiary" />
                                </div>
                              )}
                              {cfg.plotSizeMin != null && (
                                <div className="flex items-center gap-1 mt-0.5">
                                  <p className="text-sm font-semibold text-text-secondary">
                                    {cfg.plotSizeMin}
                                    {cfg.plotSizeMax && cfg.plotSizeMax !== cfg.plotSizeMin ? ` – ${cfg.plotSizeMax}` : ""} sq.yds
                                  </p>
                                  <ChevronDown className="w-3.5 h-3.5 text-text-tertiary" />
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="mt-3">
                            <p className="text-xl font-bold text-text-primary">
                              {formatINRCrore(cfg.priceMin)}
                              {cfg.priceMax && cfg.priceMax !== cfg.priceMin ? ` – ${formatINRCrore(cfg.priceMax)}` : ""}
                            </p>
                          </div>
                        </div>
                        
                        <div className="pt-2 flex gap-2 border-t border-border-default/50 mt-auto">
                          {whatsapp && (
                            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="w-11 h-11 flex items-center justify-center rounded-xl border border-green-500 text-green-600 hover:bg-green-500/10 transition-colors shrink-0">
                              <MessageCircle className="w-5 h-5" />
                            </a>
                          )}
                          <a href={phone || "#"} className="flex-1 flex items-center justify-center rounded-xl border-2 border-amber-primary text-amber-primary font-bold text-sm hover:bg-amber-primary/5 transition-colors">
                            Contact
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Simulator for Ventures */}
                  {project.projectType === "venture" && (
                    <LandUseSimulator
                      minSize={project.configurations[0]?.plotSizeMin || 150}
                      maxSize={Math.max(...project.configurations.map(c => c.plotSizeMax || c.plotSizeMin || 0), 1000)}
                      pricePerSqYd={project.configurations[0]?.pricePerUnit || 25000}
                    />
                  )}
                </div>
              </section>

              <section id="facilities" className="scroll-mt-32">
                <div className="bg-white dark:bg-bg-card border border-border-default rounded-2xl p-6">
                  <h2 className="text-xl font-bold text-text-primary mb-4">Facilities &amp; Amenities</h2>
                  {project.facilities.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {project.facilities.map((f) => (
                        <span key={f} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-bg-primary border border-border-default text-text-secondary">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> {f}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-text-tertiary text-sm">No facilities listed.</p>
                  )}
                </div>
              </section>

              <section id="location" className="scroll-mt-32">
                <div className="bg-white dark:bg-bg-card border border-border-default rounded-2xl p-6 space-y-4">
                  <h2 className="text-xl font-bold text-text-primary">Location & Map</h2>
                  <div className="flex items-center gap-2 text-text-secondary text-sm">
                    <MapPin className="w-4 h-4 text-amber-primary shrink-0" />
                    <span>{project.location.address || `${project.location.locality}, ${project.location.city}, ${project.location.state}`}</span>
                  </div>

                  {/* Map */}
                  <div style={{ height: "380px" }}>
                    <ProjectMapView
                      latitude={project.location.latitude}
                      longitude={project.location.longitude}
                      projectName={project.name}
                      locality={project.location.locality}
                      city={project.location.city}
                      projectType={project.projectType}
                    />
                  </div>

                  {/* Google Maps link */}
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${project.location.latitude},${project.location.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border-default text-sm font-semibold text-text-primary hover:border-amber-primary hover:text-amber-primary transition-colors"
                  >
                    <MapPin className="w-4 h-4" /> Open in Google Maps
                  </a>

                  {/* Commute Radius Map */}
                  <div className="pt-6 mt-6 border-t border-border-default">
                    <CommuteRadiusMap
                      latitude={project.location.latitude}
                      longitude={project.location.longitude}
                      projectName={project.name}
                      city={project.location.city}
                    />
                  </div>

                  {project.location.pincode && (
                    <p className="text-xs text-text-tertiary">Pincode: {project.location.pincode}</p>
                  )}
                </div>
              </section>

              <section id="brochure" className="scroll-mt-32">
                <div className="bg-white dark:bg-bg-card border border-border-default rounded-2xl p-6">
                  <h2 className="text-xl font-bold text-text-primary mb-4">Brochure</h2>
                  {project.brochureUrl ? (
                    <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl border border-border-default bg-bg-primary">
                      <div className="w-12 h-12 rounded-xl bg-amber-primary/10 flex items-center justify-center shrink-0">
                        <Download className="w-6 h-6 text-amber-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-text-primary">Download {project.name} Brochure</p>
                        <p className="text-sm text-text-secondary">Get complete floor plans, pricing &amp; payment plan</p>
                      </div>
                      <a href={project.brochureUrl} target="_blank" rel="noopener noreferrer"
                        className="ml-auto px-5 py-2.5 rounded-xl bg-amber-primary text-slate-950 font-bold text-sm hover:bg-amber-500 transition-colors shrink-0">
                        Download
                      </a>
                    </div>
                  ) : (
                    <p className="text-text-tertiary text-sm">No brochure available.</p>
                  )}
                  {videoEmbed && (
                    <div className="mt-6">
                      <p className="font-semibold text-text-primary mb-3">Project Video</p>
                      <div className="aspect-video rounded-2xl overflow-hidden border border-border-default">
                        <iframe src={videoEmbed} title="Project video" className="w-full h-full" allowFullScreen />
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section id="builder" className="scroll-mt-32">
                <div className="bg-white dark:bg-bg-card border border-border-default rounded-2xl p-6">
                  <h2 className="text-xl font-bold text-text-primary mb-4">About the Builder</h2>
                  <div className="flex items-center gap-4">
                    {project.builderLogoUrl && (
                      <img src={project.builderLogoUrl} alt={project.builderName} className="h-16 object-contain border border-border-default rounded-xl p-2" />
                    )}
                    <div>
                      <p className="font-bold text-xl text-text-primary">{project.builderName}</p>
                      <p className="text-sm text-text-secondary">Developed By</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-5">
                    {phone && (
                      <a href={phone} className="flex items-center gap-2 px-5 py-3 rounded-xl border border-border-default text-text-primary font-semibold hover:border-amber-primary transition-colors">
                        <Phone className="w-4 h-4" /> Call Builder
                      </a>
                    )}
                    {whatsapp && (
                      <a href={whatsapp} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 px-5 py-3 rounded-xl bg-green-500 text-white font-semibold hover:bg-green-600 transition-colors">
                        <MessageCircle className="w-4 h-4" /> WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              </section>
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="space-y-5">
              {/* Why consider */}
              {project.highlights.length > 0 && (
                <div className="bg-white dark:bg-bg-card border border-amber-primary/20 rounded-2xl p-5 lg:sticky lg:top-32">
                  <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-primary fill-amber-primary" />
                    Why {project.name}?
                  </h3>
                  <ul className="space-y-3">
                    {project.highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-text-secondary">
                        <span className="text-amber-primary font-bold mt-0.5">•</span>
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Quick contact — desktop only (mobile has fixed bar) */}
              <div className="hidden sm:block bg-white dark:bg-bg-card border border-border-default rounded-2xl p-5">
                <h3 className="font-bold text-text-primary mb-1">Contact Builder</h3>
                <p className="text-xs text-text-tertiary mb-4">Get exact pricing, payment plans &amp; site visit</p>
                <div className="space-y-3">
                  {videoEmbed && (
                    <button
                      onClick={() => setIsVideoOpen(true)}
                      className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition-colors cursor-pointer shadow-md"
                    >
                      <Play className="w-4 h-4 fill-white text-white" /> Watch Tour Video
                    </button>
                  )}
                  {phone && (
                    <a href={phone} className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-amber-primary text-slate-950 font-bold hover:bg-amber-500 transition-colors">
                      <Phone className="w-4 h-4" /> View Number
                    </a>
                  )}
                  {whatsapp && (
                    <a href={whatsapp} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 border-green-500 text-green-600 font-bold hover:bg-green-500/10 transition-colors">
                      <MessageCircle className="w-4 h-4" /> WhatsApp
                    </a>
                  )}
                  {project.brochureUrl && (
                    <a href={project.brochureUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-border-default text-text-secondary font-semibold hover:border-amber-primary hover:text-text-primary transition-colors">
                      <Download className="w-4 h-4" /> Download Brochure
                    </a>
                  )}
                </div>
                {project.builderLogoUrl && (
                  <div className="mt-4 pt-4 border-t border-border-default flex items-center gap-2">
                    <img src={project.builderLogoUrl} alt={project.builderName} className="h-7 object-contain" />
                    <div>
                      <p className="text-[10px] text-text-tertiary uppercase font-semibold">Developed by</p>
                      <p className="text-sm font-bold text-text-primary">{project.builderName}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* RERA info */}
              {project.reraId && (
                <div className="bg-green-500/5 border border-green-500/20 rounded-2xl p-4 text-sm">
                  <p className="font-semibold text-green-700 dark:text-green-500 mb-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> RERA Registered
                  </p>
                  <p className="text-text-secondary">RERA ID: <span className="font-mono font-semibold text-text-primary">{project.reraId}</span></p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile Fixed Bottom CTA ─────────────────────────────────────── */}
      {(phone || whatsapp || project.brochureUrl) && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-bg-card border-t border-border-default px-4 py-3 flex items-center gap-2 shadow-elevated">
          {project.builderLogoUrl && (
            <img src={project.builderLogoUrl} alt={project.builderName} className="h-8 w-8 object-contain rounded-lg border border-border-default p-0.5 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-text-primary truncate">{project.name}</p>
            <p className="text-[10px] text-text-tertiary truncate">{project.builderName}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {videoEmbed && (
              <button
                onClick={() => setIsVideoOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-red-600 text-white font-bold text-xs shrink-0 shadow-sm"
              >
                <Play className="w-3.5 h-3.5 fill-white text-white" /> Watch Tour
              </button>
            )}
            {project.brochureUrl && (
              <a href={project.brochureUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-2 rounded-xl border border-border-default text-text-secondary text-xs font-semibold">
                <Download className="w-3.5 h-3.5" />
              </a>
            )}
            {whatsapp && (
              <a href={whatsapp} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-green-500 text-white font-bold text-xs">
                <MessageCircle className="w-4 h-4" /> Chat
              </a>
            )}
            {phone && (
              <a href={phone}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-primary text-slate-950 font-bold text-xs">
                <Phone className="w-4 h-4" /> Call
              </a>
            )}
          </div>
        </div>
      )}
    </>
  );
}
