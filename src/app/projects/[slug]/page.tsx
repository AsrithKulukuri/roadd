"use client";

import { use, useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { motion, useScroll, useTransform } from "framer-motion";
import { useProjectsStore } from "@/stores/projects-store";
import { getYoutubeEmbedUrl, isYoutubeShort } from "@/lib/utils";
import { resolveMediaUrl } from "@/lib/aws/storage-utils";
import {
  MapPin, CheckCircle2, Phone, MessageCircle, Download,
  ChevronDown, ChevronUp, Star, ArrowLeft, Building2, Home, Landmark,
  Eye, X, ChevronLeft, ChevronRight, Play, Map, Video, Calendar, Activity, LayoutTemplate, Film, Layers, Loader2
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
  "ready-to-move":      "text-amber-600 bg-amber-500/10",
  "new-launch":         "text-amber-500 bg-amber-500/10",
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
      {/* Image Counter top-left */}
      <div className="absolute top-4 left-4 z-20 px-3.5 py-1.5 rounded-full bg-slate-900/90 text-white border border-white/20 text-xs font-bold shadow-lg pointer-events-none">
        {idx + 1} / {images.length}
      </div>

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

const TABS = ["Status", "Floor Plans", "Facilities", "Location", "Brochure", "Builder"] as const;
type Tab = (typeof TABS)[number];

export default function ProjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { projects, fetchProjects } = useProjectsStore();

  const [activeTab, setActiveTab] = useState<Tab>("Status");
  const [statusOpen, setStatusOpen] = useState(true);
  const [galleryIdx, setGalleryIdx] = useState<number | null>(null);
  const [activeConfigLabel, setActiveConfigLabel] = useState<string>("All");
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const openVideo = (url: string | null | undefined) => {
    if (!url) return;
    setIsVideoLoading(true);
    setActiveVideoUrl(url);
  };
  const [floorPlanLightbox, setFloorPlanLightbox] = useState<{ url: string; label: string } | null>(null);
  const [activeMedia, setActiveMedia] = useState<Record<string, 'image' | 'video'>>({});
  const [playingVideos, setPlayingVideos] = useState<Record<string, boolean>>({});

  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const cardsScrollRef = useRef<HTMLDivElement>(null);
  
  const { scrollY } = useScroll();
  const yHero = useTransform(scrollY, [0, 800], [0, 200]);

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
  const galleryAll = project.images || [];
  const heroImage = project.coverImage || galleryAll[0]?.url;
  const sideImages = galleryAll.filter((i) => i.url !== heroImage);

  // WhatsApp URL
  const whatsapp = project.builderWhatsapp
    ? `https://wa.me/${project.builderWhatsapp.replace(/\D/g, "")}?text=Hi, I am interested in ${project.name}`
    : null;
  const phone = project.builderPhone ? `tel:${project.builderPhone.replace(/\s/g, "")}` : null;

  // YouTube embed — use the full utility that handles Shorts, Live, share links, etc.
  const videoEmbed = getYoutubeEmbedUrl(project.videoUrl);
  const isShort = isYoutubeShort(project.videoUrl);
  const activeVideoEmbed = getYoutubeEmbedUrl(activeVideoUrl ?? undefined);
  const activeIsShort = isYoutubeShort(activeVideoUrl ?? undefined);

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
      {activeVideoUrl && (
        <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4" onClick={() => setActiveVideoUrl(null)}>
          <div
            className={`relative w-full bg-black rounded-3xl overflow-hidden shadow-2xl ${activeIsShort ? "max-w-[420px]" : "max-w-4xl"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 bg-slate-900">
              <button
                onClick={() => setActiveVideoUrl(null)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-amber-500 hover:text-slate-950 text-white text-xs font-bold transition-all cursor-pointer shrink-0"
                title="Back to project"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              <div className="flex items-center gap-2 text-white font-bold text-sm truncate mx-2">
                <Play className="w-4 h-4 text-red-500 fill-red-500 shrink-0" />
                {activeIsShort ? "Video Short Tour" : "Video Tour"}
              </div>
              <button onClick={() => setActiveVideoUrl(null)} className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0" title="Close video">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className={`relative w-full bg-black flex items-center justify-center overflow-hidden ${activeIsShort ? "aspect-[9/16] max-h-[75vh]" : "aspect-video"}`}>
              {/* Buffering / Loading Overlay */}
              {isVideoLoading && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-md gap-3 pointer-events-none">
                  {project.videoThumbnail && (
                    <img
                      src={resolveMediaUrl(project.videoThumbnail)}
                      alt="Poster blur"
                      className="absolute inset-0 w-full h-full object-cover opacity-20 filter blur-md"
                    />
                  )}
                  <div className="relative z-10 flex flex-col items-center gap-3">
                    <div className="relative flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full border-3 border-amber-500/20 border-t-amber-500 animate-spin" />
                      <Play className="w-5 h-5 text-amber-500 fill-amber-500 absolute" />
                    </div>
                    <p className="text-white font-bold text-xs sm:text-sm tracking-wider animate-pulse uppercase">
                      Loading Video Walkthrough...
                    </p>
                  </div>
                </div>
              )}

              {activeVideoEmbed ? (
                <iframe
                  src={`${activeVideoEmbed}?autoplay=1`}
                  title={`Video Tour`}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  onLoad={() => setIsVideoLoading(false)}
                />
              ) : (
                <video
                  src={resolveMediaUrl(activeVideoUrl)}
                  controls
                  autoPlay
                  poster={project.videoThumbnail ? resolveMediaUrl(project.videoThumbnail) : undefined}
                  className="w-full h-full object-contain"
                  onLoadedData={() => setIsVideoLoading(false)}
                  onCanPlay={() => setIsVideoLoading(false)}
                />
              )}
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-slate-50 dark:bg-bg-primary pt-16">
        {/* Breadcrumb & Back Button */}
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BackButton />
          </div>
        </div>

        {/* Hero Gallery */}
        <div className="max-w-7xl mx-auto px-3 sm:px-4 mb-4">
          {/* Mobile: Clean Luxury Hero Image with Floating Badges */}
          <div 
            className="sm:hidden relative aspect-[16/11] rounded-2xl overflow-hidden bg-slate-950 cursor-pointer shadow-sm" 
            onClick={() => heroImage && setGalleryIdx(0)}
          >
            {heroImage ? (
              <img src={heroImage} alt={project.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-amber-primary/20 to-amber-primary/5 flex items-center justify-center">
                <TypeIcon className="w-16 h-16 text-amber-primary/30" />
              </div>
            )}
            
            {/* Top-Right: Sleek Video Tour Pill */}
            {project.videoUrl && (
              <button 
                onClick={(e) => { e.stopPropagation(); openVideo(project.videoUrl); }}
                className="absolute top-3 right-3 flex items-center gap-1.5 bg-slate-950/80 hover:bg-slate-950 active:scale-95 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/20 shadow-lg z-10 transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-red-500 text-red-500 shrink-0" />
                <span>Video Tour</span>
              </button>
            )}

            {/* Bottom-Right: Clean Photo Counter Badge */}
            {galleryAll.length > 0 && (
              <button 
                onClick={(e) => { e.stopPropagation(); setGalleryIdx(0); }}
                className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-md text-white text-xs font-bold px-2.5 py-1 rounded-lg border border-white/20 shadow-md z-10"
              >
                <Layers className="w-3.5 h-3.5 text-white" />
                <span>{galleryAll.length}</span>
              </button>
            )}
          </div>

          {/* Desktop & Tablet: 2-Column Luxury 3-Card Grid (Exact Reference UI) */}
          <div className="hidden sm:grid grid-cols-3 gap-3 sm:gap-3.5 h-[340px] sm:h-[400px] lg:h-[440px] select-none rounded-2xl">
            {/* LEFT HERO CARD */}
            <div 
              className="col-span-2 relative h-full w-full rounded-2xl overflow-hidden cursor-pointer group shadow-sm bg-slate-950" 
              onClick={() => heroImage && setGalleryIdx(0)}
            >
              {heroImage ? (
                <img src={heroImage} alt={project.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-amber-primary/20 to-amber-primary/5 flex items-center justify-center">
                  <TypeIcon className="w-16 h-16 text-amber-primary/30" />
                </div>
              )}
              {/* Subtle dark bottom gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent group-hover:from-black/70 transition-colors" />
              
              {/* Bottom Right: Real total media counter */}
              <div className="absolute bottom-3.5 right-4 flex items-center gap-1.5 font-bold text-xs sm:text-sm text-white drop-shadow-md z-10 pointer-events-none bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/15">
                <Layers className="w-4 h-4 text-white" />
                <span>{galleryAll.length + (project.videoUrl ? 1 : 0)}</span>
              </div>
            </div>

            {/* RIGHT COLUMN: 2 Stacked Cards */}
            <div className="grid grid-rows-2 gap-3 sm:gap-3.5 h-full min-h-0">
              {/* TOP RIGHT CARD */}
              <div
                className="relative h-full w-full rounded-2xl overflow-hidden cursor-pointer group shadow-sm bg-slate-950 min-h-0"
                onClick={() => {
                  if (project.videoUrl) {
                    openVideo(project.videoUrl);
                  } else if (sideImages[0]) {
                    const idx = galleryAll.findIndex(img => img.url === sideImages[0].url);
                    setGalleryIdx(idx >= 0 ? idx : 1);
                  } else {
                    setGalleryIdx(0);
                  }
                }}
              >
                <img
                  src={project.videoUrl 
                    ? (project.videoThumbnail ? resolveMediaUrl(project.videoThumbnail) : (sideImages[0]?.url || heroImage || ""))
                    : (sideImages[0]?.url || heroImage || "")
                  }
                  alt={`${project.name} Media`}
                  className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent group-hover:from-black/70 transition-colors" />
                
                {/* Centered Circular Play Button if video exists */}
                {project.videoUrl && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white/95 hover:bg-white text-slate-950 flex items-center justify-center shadow-2xl backdrop-blur-md group-hover:scale-110 transition-transform">
                      <Play className="w-5 h-5 fill-slate-950 text-slate-950 ml-0.5" />
                    </div>
                  </div>
                )}

                {/* Bottom Right Badge */}
                <div className="absolute bottom-3 right-3.5 flex items-center gap-1.5 font-bold text-xs sm:text-sm text-white drop-shadow-md z-10 pointer-events-none bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-lg border border-white/15">
                  <Layers className="w-3.5 h-3.5 text-white" />
                  <span>{project.videoUrl ? 1 : 1}</span>
                </div>
              </div>

              {/* BOTTOM RIGHT CARD */}
              <div 
                className="relative h-full w-full rounded-2xl overflow-hidden cursor-pointer group shadow-sm bg-slate-950 min-h-0" 
                onClick={() => {
                  const targetImage = project.videoUrl ? sideImages[0] : sideImages[1];
                  const targetIdx = targetImage ? galleryAll.findIndex((x) => x.url === targetImage.url) : 0;
                  setGalleryIdx(targetIdx >= 0 ? targetIdx : 0);
                }}
              >
                {((project.videoUrl ? sideImages[0] : sideImages[1]) || sideImages[0]) ? (
                  <img 
                    src={(project.videoUrl ? sideImages[0] : sideImages[1])?.url || sideImages[0]?.url} 
                    alt={`${project.name} Gallery`} 
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" 
                  />
                ) : (
                  <div className="w-full h-full bg-bg-card border border-border-default flex items-center justify-center">
                    <TypeIcon className="w-8 h-8 text-text-tertiary/30" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent group-hover:from-black/70 transition-colors" />
                
                {/* Bottom Right: Real photo count */}
                <div className="absolute bottom-3 right-3.5 flex items-center gap-1.5 font-bold text-xs sm:text-sm text-white drop-shadow-md z-10 pointer-events-none bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-lg border border-white/15">
                  <Layers className="w-3.5 h-3.5 text-white" />
                  <span>{Math.max(1, galleryAll.length - (project.videoUrl ? 1 : 2))}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Tabs */}
        <div className="sticky top-16 z-20 bg-white dark:bg-bg-card border-b border-border-default shadow-sm">
          <div className="max-w-7xl mx-auto px-2 sm:px-4 flex items-center gap-0.5 sm:gap-1 overflow-x-auto scrollbar-none touch-pan-x">
            {TABS.map((tab) => {
              const Icon = tab === "Status" ? Activity : null;
              return (
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
                className={`shrink-0 flex items-center gap-1.5 px-3 sm:px-4 py-3.5 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === tab
                    ? "border-amber-primary text-amber-primary"
                    : "border-transparent text-text-secondary hover:text-text-primary"
                }`}
              >
                {Icon && <Icon className="w-4 h-4" />}
                {tab === "Floor Plans" && project.projectType === "venture" ? "Plot Layouts" : tab}
              </button>
            )})}
            <div className="ml-auto flex items-center gap-2 py-2 shrink-0 pl-2">
              {project.videoUrl && (
                <button
                  onClick={() => setActiveVideoUrl(project.videoUrl || null)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-sm shrink-0 cursor-pointer whitespace-nowrap"
                >
                  <Play className="w-3.5 h-3.5 fill-white text-white shrink-0" /> Watch Tour
                </button>
              )}
              {project.brochureUrl && (
                <a href={project.brochureUrl} target="_blank" rel="noopener noreferrer"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border-default text-xs font-semibold text-text-primary hover:border-amber-primary transition-colors whitespace-nowrap">
                  <Download className="w-3.5 h-3.5 shrink-0" /> Brochure
                </a>
              )}
              {phone && (
                <a href={phone} className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-primary text-slate-950 text-xs font-bold hover:bg-amber-500 transition-colors whitespace-nowrap">
                  <Phone className="w-3.5 h-3.5 shrink-0" /> View Number
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
                      {project.videoUrl && (
                        <button
                          onClick={() => openVideo(project.videoUrl)}
                          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-600 border border-red-500/30 hover:bg-red-500/20 transition-all cursor-pointer whitespace-nowrap"
                        >
                          <Play className="w-3.5 h-3.5 fill-red-600 text-red-600 shrink-0" /> Watch Tour
                        </button>
                      )}
                      {project.reraApproved && (
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 whitespace-nowrap">
                          <CheckCircle2 className="w-3 h-3" /> RERA
                        </span>
                      )}
                      {project.noBrokerage && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 whitespace-nowrap">No Brokerage</span>
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

              {/* Dedicated Project Video Walkthrough Section */}
              {project.videoUrl && (
                <div className="bg-white dark:bg-bg-card border border-border-default rounded-2xl p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-base sm:text-lg text-text-primary flex items-center gap-2">
                      <Film className="w-5 h-5 text-amber-primary" />
                      <span>Project Video Walkthrough</span>
                    </h3>
                    <button
                      onClick={() => openVideo(project.videoUrl)}
                      className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Play Fullscreen</span>
                      <Play className="w-3 h-3 fill-amber-600" />
                    </button>
                  </div>
                  
                  <div 
                    className="relative w-full aspect-video rounded-xl overflow-hidden cursor-pointer group shadow-sm bg-slate-950"
                    onClick={() => openVideo(project.videoUrl)}
                  >
                    <img
                      src={project.videoThumbnail ? resolveMediaUrl(project.videoThumbnail) : (heroImage || "")}
                      alt={`${project.name} Video Walkthrough`}
                      className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent group-hover:from-black/60 transition-colors" />
                    
                    {/* Centered Large Circular Play Button */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/95 text-slate-950 flex items-center justify-center shadow-2xl backdrop-blur-md group-hover:scale-110 active:scale-95 transition-transform">
                        <Play className="w-6 h-6 fill-slate-950 text-slate-950 ml-0.5" />
                      </div>
                    </div>

                    <div className="absolute bottom-3 left-3.5 right-3.5 flex items-center justify-between text-white pointer-events-none">
                      <span className="font-bold text-xs sm:text-sm drop-shadow-md truncate">
                        {project.name} • Virtual Tour
                      </span>
                      <span className="text-[11px] font-semibold bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-white/90 border border-white/10">
                        Watch Tour
                      </span>
                    </div>
                  </div>
                </div>
              )}


              {/* Construction Updates Timeline */}
              {project.constructionUpdates && project.constructionUpdates.length > 0 && (
                <ScrollReveal id="status" className="scroll-mt-32">
                  <div className="bg-white dark:bg-bg-card border border-border-default rounded-2xl p-6">
                    <h3 className="font-bold text-text-primary mb-6 flex items-center gap-2">
                      <Video className="w-5 h-5 text-amber-primary" /> Construction Updates
                    </h3>
                    <div className="relative border-l-2 border-border-default ml-3 space-y-8 pb-4">
                      {project.constructionUpdates.map((update, i) => (
                        <div key={update.id} className="relative pl-6">
                          {/* Timeline dot */}
                          <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-amber-primary border-4 border-white dark:border-bg-card shadow-sm" />
                          
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                            <h4 className="font-bold text-text-primary text-lg">{update.title}</h4>
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-500/10 px-2.5 py-1 rounded-full w-fit">
                              <Calendar className="w-3.5 h-3.5" /> {update.date}
                            </span>
                          </div>
                          
                          {update.description && (
                            <p className="text-sm text-text-secondary leading-relaxed mb-4">
                              {update.description}
                            </p>
                          )}
                          
                          {update.videoUrl && (
                            <button
                              onClick={() => setActiveVideoUrl(update.videoUrl ?? null)}
                              className="flex items-center gap-2 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 border border-red-200 dark:border-red-500/30 transition-colors px-4 py-2.5 rounded-xl text-sm font-bold w-fit"
                            >
                              <Play className="w-4 h-4 fill-red-600 text-red-600" /> Watch Update Video
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </ScrollReveal>
              )}

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
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-amber-primary text-amber-primary font-semibold text-sm hover:bg-amber-primary/10 transition-colors whitespace-nowrap">
                    <Download className="w-4 h-4 shrink-0" /> Download Brochure
                  </a>
                )}
              </div>

              {/* Tab Content Area */}
              <div className="space-y-8">
                <ScrollReveal id="floor-plans" className="scroll-mt-32">
                  <div className="bg-white dark:bg-bg-card border border-border-default rounded-2xl p-6">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <h2 className="text-xl font-bold text-text-primary">
                      {project.projectType === "venture" ? "Plot Layouts & Pricing" : project.projectType === "villa" ? "Villa Configurations & Pricing" : "Floor Plans & Pricing"}
                    </h2>
                    <div className="flex sm:hidden items-center gap-1 text-[10px] text-text-tertiary font-bold uppercase tracking-wide bg-bg-primary px-2.5 py-1 rounded-full border border-border-default shrink-0">
                      <span>Swipe</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {/* Config tabs */}
                  <div className="relative">
                    <button 
                      onClick={() => tabsScrollRef.current?.scrollBy({ left: -200, behavior: "smooth" })}
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center cursor-pointer group z-10"
                    >
                      <ChevronLeft className="w-5 h-5 text-text-tertiary drop-shadow-md group-hover:text-text-primary" />
                    </button>
                    <div ref={tabsScrollRef} className="flex gap-3 overflow-x-auto scrollbar-none touch-pan-x mb-6 pb-1 pr-8 pl-6">
                    <button
                      onClick={() => setActiveConfigLabel("All")}
                      className={`px-5 py-2.5 rounded-full text-sm flex items-center justify-center border transition-all shrink-0 ${
                        currentLabel === "All"
                          ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white"
                          : "bg-white text-text-secondary border-border-default hover:border-amber-primary/40 dark:bg-bg-primary"
                      }`}
                    >
                      <span className="font-bold">All</span>
                    </button>
                    {groupedConfigs.map((group) => (
                      <button key={group.label} onClick={() => setActiveConfigLabel(group.label)}
                        className={`px-5 py-1.5 rounded-full text-sm flex flex-col items-center justify-center border transition-all shrink-0 ${
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
                    <button 
                      onClick={() => tabsScrollRef.current?.scrollBy({ left: 200, behavior: "smooth" })}
                      className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center cursor-pointer group z-10"
                    >
                      <ChevronRight className="w-5 h-5 text-text-tertiary drop-shadow-md animate-pulse group-hover:text-text-primary" />
                    </button>
                  </div>

                  <div className="relative">
                    <button 
                      onClick={() => cardsScrollRef.current?.scrollBy({ left: -320, behavior: "smooth" })}
                      className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 items-center justify-center cursor-pointer group z-10"
                    >
                      <ChevronLeft className="w-6 h-6 text-text-tertiary drop-shadow-md group-hover:text-text-primary" />
                    </button>
                    <div ref={cardsScrollRef} className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-none pb-4 -mx-6 px-6 sm:px-12">
                    {(currentLabel === "All" ? project.configurations : activeGroupConfigs).map((cfg, idx) => (
                      <div key={cfg.id || idx} className="w-[85vw] sm:w-[320px] shrink-0 snap-center p-5 rounded-2xl border border-border-default bg-bg-primary flex flex-col gap-4 sm:hover:-translate-y-1 hover:shadow-xl transition-all duration-300 relative z-0">
                        {/* Top Section */}
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-md bg-amber-500/10 flex items-center justify-center shrink-0">
                                <LayoutTemplate className="w-4 h-4 text-amber-600" />
                              </div>
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-xl font-bold text-slate-800">
                                  {cfg.superBuiltUpAreaMin ?? cfg.builtUpAreaMin ?? cfg.plotSizeMin}
                                  {project.projectType === "venture" ? " sq.yds" : " sq.ft"}
                                </span>
                                {/* If we have max area, show it */}
                                {((cfg.superBuiltUpAreaMax && cfg.superBuiltUpAreaMax !== cfg.superBuiltUpAreaMin) || (cfg.builtUpAreaMax && cfg.builtUpAreaMax !== cfg.builtUpAreaMin) || (cfg.plotSizeMax && cfg.plotSizeMax !== cfg.plotSizeMin)) ? (
                                  <span className="text-sm text-slate-400 font-medium">
                                    – {cfg.superBuiltUpAreaMax ?? cfg.builtUpAreaMax ?? cfg.plotSizeMax} {project.projectType === "venture" ? "sq.yds" : "sq.ft"}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                            <div className="text-sm text-slate-500 ml-8 flex flex-wrap items-center gap-x-0 gap-y-1">
                              <span className="font-medium text-slate-600">{cfg.label}</span>
                              {cfg.uds && (
                                <span className="flex items-center">
                                  <span className="mx-1.5 text-slate-300">|</span>
                                  <span className="font-medium text-slate-600">UDS: {cfg.uds} sq.yds</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Toggle Switch */}
                          {cfg.videoUrl && (
                            <div className="flex items-center bg-slate-100 rounded-md p-1 shrink-0 h-fit">
                              <button
                                onClick={() => setActiveMedia(prev => ({ ...prev, [cfg.id]: 'image' }))}
                                title="View Plan"
                                className={`w-6 h-6 flex items-center justify-center rounded-[4px] transition-all ${(!activeMedia[cfg.id] || activeMedia[cfg.id] === 'image') ? 'bg-white shadow-sm text-amber-600' : 'text-slate-400 hover:text-slate-600'}`}
                              >
                                <LayoutTemplate className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setActiveMedia(prev => ({ ...prev, [cfg.id]: 'video' }))}
                                title="View Video"
                                className={`w-6 h-6 flex items-center justify-center rounded-[4px] transition-all ${(activeMedia[cfg.id] === 'video') ? 'bg-white shadow-sm text-red-500' : 'text-slate-400 hover:text-slate-600'}`}
                              >
                                <Play className="w-3.5 h-3.5 fill-current" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Image/Video Section */}
                        {(activeMedia[cfg.id] === 'video' && cfg.videoUrl) ? (
                          <div className={`rounded-xl overflow-hidden bg-black flex items-center justify-center my-2 relative isolate transform-gpu ${isYoutubeShort(cfg.videoUrl) ? 'aspect-[9/16]' : 'aspect-[4/3]'}`}>
                            <iframe
                              src={`${getYoutubeEmbedUrl(cfg.videoUrl!)!}${playingVideos[cfg.id] ? '&autoplay=1' : ''}`}
                              className="w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                            {!playingVideos[cfg.id] && (
                              <div 
                                className="absolute inset-0 z-10 cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPlayingVideos(prev => ({ ...prev, [cfg.id]: true }));
                                }}
                              />
                            )}
                          </div>
                        ) : (
                          cfg.floorPlanUrl && (
                            <div
                              className="rounded-xl overflow-hidden bg-white aspect-[4/3] cursor-zoom-in flex items-center justify-center relative group my-2"
                              onClick={() => setFloorPlanLightbox({ url: cfg.floorPlanUrl!, label: cfg.label })}
                            >
                              <img src={cfg.floorPlanUrl} alt={`${cfg.label} floor plan`} className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-500" />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-xl" />
                              <div className="absolute top-2 right-2 bg-black/70 text-white text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Eye className="w-3 h-3" /> View
                              </div>
                            </div>
                          )
                        )}

                        {/* Bottom Section */}
                        <div className="mt-auto flex flex-col gap-3">
                          <div className="text-2xl font-black text-slate-900">
                            {formatINRCrore(cfg.priceMin)}
                            {cfg.priceMax && cfg.priceMax !== cfg.priceMin ? ` – ${formatINRCrore(cfg.priceMax)}` : ""}
                          </div>
                          
                          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col gap-1 text-sm">
                            <span className="text-slate-500">
                              New Launch
                            </span>
                            {cfg.possessionDate && (
                              <span className="font-semibold text-slate-700">
                                {cfg.possessionDate} possession
                              </span>
                            )}
                          </div>
                          

                        </div>
                      </div>
                    ))}
                    </div>
                    <button 
                      onClick={() => cardsScrollRef.current?.scrollBy({ left: 320, behavior: "smooth" })}
                      className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 items-center justify-center cursor-pointer group z-10"
                    >
                      <ChevronRight className="w-6 h-6 text-text-tertiary drop-shadow-md animate-pulse group-hover:text-text-primary" />
                    </button>
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
              </ScrollReveal>

              <ScrollReveal id="facilities" className="scroll-mt-32">
                <div className="bg-white dark:bg-bg-card border border-border-default rounded-2xl p-6">
                  <h2 className="text-xl font-bold text-text-primary mb-4">Facilities &amp; Amenities</h2>
                  {project.facilities.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {project.facilities.map((f) => (
                        <span key={f} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-bg-primary border border-border-default text-text-secondary">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" /> {f}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-text-tertiary text-sm">No facilities listed.</p>
                  )}
                </div>
              </ScrollReveal>

              <ScrollReveal id="location" className="scroll-mt-32">
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
              </ScrollReveal>

              <ScrollReveal id="brochure" className="scroll-mt-32">
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
                        className="ml-auto px-5 py-2.5 rounded-xl bg-amber-primary text-slate-950 font-bold text-sm hover:bg-amber-500 transition-colors shrink-0 whitespace-nowrap">
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
              </ScrollReveal>

              <ScrollReveal id="builder" className="scroll-mt-32">
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
                      <a href={phone} className="flex items-center gap-2 px-5 py-3 rounded-xl border border-border-default text-text-primary font-semibold hover:border-amber-primary transition-colors whitespace-nowrap">
                        <Phone className="w-4 h-4 shrink-0" /> Call Builder
                      </a>
                    )}
                    {whatsapp && (
                      <a href={whatsapp} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-colors whitespace-nowrap">
                        <MessageCircle className="w-4 h-4 shrink-0" /> WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              </ScrollReveal>
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
                      onClick={() => setActiveVideoUrl(project.videoUrl || null)}
                      className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition-colors cursor-pointer shadow-md"
                    >
                      <Play className="w-4 h-4 fill-white text-white" /> Watch Tour Video
                    </button>
                  )}
                  {phone && (
                    <a href={phone} className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-amber-primary text-slate-950 font-bold hover:bg-amber-500 transition-colors whitespace-nowrap">
                      <Phone className="w-4 h-4 shrink-0" /> View Number
                    </a>
                  )}
                  {whatsapp && (
                    <a href={whatsapp} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 border-amber-500 text-amber-600 font-bold hover:bg-amber-500/10 transition-colors whitespace-nowrap">
                      <MessageCircle className="w-4 h-4 shrink-0" /> WhatsApp
                    </a>
                  )}
                  {project.brochureUrl && (
                    <a href={project.brochureUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-border-default text-text-secondary font-semibold hover:border-amber-primary hover:text-text-primary transition-colors whitespace-nowrap">
                      <Download className="w-4 h-4 shrink-0" /> Download Brochure
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
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 text-sm">
                  <p className="font-semibold text-amber-700 dark:text-amber-500 mb-1 flex items-center gap-1.5">
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
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/85 dark:bg-slate-950/85 backdrop-blur-xl border-t border-slate-200/50 dark:border-slate-800/50 px-4 py-3 flex items-center gap-2 shadow-[0_-4px_24px_rgba(0,0,0,0.04)]">
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
                onClick={() => setActiveVideoUrl(project.videoUrl || null)}
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
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 text-white font-bold text-xs">
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
