"use client";

import { use, useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { useProjectsStore } from "@/stores/projects-store";
import { getYoutubeEmbedUrl, isYoutubeShort, cn } from "@/lib/utils";
import { resolveMediaUrl } from "@/lib/aws/storage-utils";
import {
  MapPin, CheckCircle2, Phone, MessageCircle, Download, FileText, ExternalLink,
  ChevronDown, ChevronUp, Star, ArrowLeft, Building2, Home, Landmark,
  Eye, X, ChevronLeft, ChevronRight, Play, Map, Video, Calendar, Activity, LayoutTemplate, Film, Layers, Loader2, Copy, Share2, Lock, ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BackButton } from "@/components/ui/back-button";
import type { Project, ProjectConfig } from "@/types/project";
import { ProjectFacilitiesGrid } from "@/components/project/project-facilities-grid";
import { ZoomableImageModal } from "@/components/ui/zoomable-image-modal";
import { getRefId } from "@/lib/ref-id";
import { shareItem } from "@/lib/share-utils";
import { shareOnWhatsApp, formatWhatsAppPhone } from "@/lib/whatsapp/whatsapp-share";
import { WhatsAppIcon } from "@/components/property/whatsapp-share-button";
import { toast } from "sonner";
import { WatermarkOverlay } from "@/components/shared/watermark-overlay";
import { useAuthSession } from "@/hooks/use-auth-session";

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

function RollingStatusTab({ isSelected }: { isSelected?: boolean }) {
  const [index, setIndex] = useState(0);
  const phrases = ["Status", "Project Progress", "Project Updates"];

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % phrases.length);
    }, 2200);
    return () => clearInterval(timer);
  }, [phrases.length]);

  return (
    <span className="relative inline-flex items-center h-4 overflow-hidden text-left min-w-[96px]">
      <AnimatePresence mode="wait">
        <motion.span
          key={phrases[index]}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -10, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className={`inline-block whitespace-nowrap font-bold text-xs ${
            isSelected
              ? "text-white dark:text-slate-950"
              : "text-slate-800 dark:text-slate-200"
          }`}
        >
          {phrases[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
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

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = ["Overview", "Status", "Floor Plans", "Facilities", "Location", "Brochure", "Builder"] as const;
type Tab = (typeof TABS)[number];

export function ProjectDetailView({ 
  slug, 
  initialProject 
}: { 
  slug: string; 
  initialProject?: Project | null;
}) {
  const router = useRouter();
  const { isLoggedIn, getLoginUrl } = useAuthSession();
  const { projects, fetchProjects } = useProjectsStore();

  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [statusOpen, setStatusOpen] = useState(true);
  const [galleryIdx, setGalleryIdx] = useState<number | null>(null);
  const [activeConfigLabel, setActiveConfigLabel] = useState<string>("All");
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const openVideo = (url: string | null | undefined) => {
    if (!url) return;
    setIsVideoLoading(true);
    setActiveVideoUrl(url);
    setTimeout(() => {
      setIsVideoLoading(false);
    }, 2000);
  };
  const [floorPlanLightbox, setFloorPlanLightbox] = useState<{ url: string; label: string } | null>(null);
  const [activeMedia, setActiveMedia] = useState<Record<string, 'image' | 'video'>>({});
  const [playingVideos, setPlayingVideos] = useState<Record<string, boolean>>({});

  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const cardsScrollRef = useRef<HTMLDivElement>(null);
  const updatesScrollRef = useRef<HTMLDivElement>(null);
  
  const { scrollY } = useScroll();
  const yHero = useTransform(scrollY, [0, 800], [0, 200]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const project = projects.find((p) => (p.slug === slug || p.id === slug) && (p.isPublished || true)) || initialProject;

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
        <Link href="/search?type=projects" className="text-amber-primary hover:underline font-bold">← Browse all projects</Link>
      </div>
    );
  }

  const TypeIcon = TYPE_ICONS[project.projectType];
  const priceRange = getPriceRange(project.configurations);

  // Gallery images including all
  const galleryAll = project.images || [];
  const heroImage = project.coverImage || galleryAll[0]?.url;
  const sideImages = galleryAll.filter((i) => i.url !== heroImage);

  // WhatsApp URL & Phone (TODO: production hardening query stripping)
  const rawWhatsapp = project.builderWhatsapp || project.builderPhone;
  const cleanWhatsappNumber = rawWhatsapp ? formatWhatsAppPhone(rawWhatsapp) : null;
  const whatsapp = cleanWhatsappNumber
    ? `https://wa.me/${cleanWhatsappNumber}?text=${encodeURIComponent(`Hi, I am interested in ${project.name}`)}`
    : null;
  const phone = project.builderPhone ? `tel:${project.builderPhone.replace(/\s/g, "")}` : null;
  const targetRedirect = `/projects/${project.slug || slug}`;
  const hasBrochure = Boolean(project.brochureUrl && !project.brochureUrl.startsWith("blob:"));

  const handleDownloadBrochure = async (e: React.MouseEvent, url: string, filename: string) => {
    e.preventDefault();
    if (!url || url.startsWith("blob:")) {
      toast.error("Brochure file is unavailable or expired. Please upload a PDF in the Admin Dashboard.");
      return;
    }
    const resolved = resolveMediaUrl(url);
    try {
      toast.info("Downloading brochure...");
      const res = await fetch(resolved);
      if (!res.ok) throw new Error("Fetch failed");
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      const cleanName = filename.replace(/[^a-zA-Z0-9_-]/g, "_");
      a.download = cleanName.toLowerCase().endsWith(".pdf") ? cleanName : `${cleanName}_Brochure.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
      toast.success("Brochure downloaded!");
    } catch {
      window.open(resolved, "_blank");
    }
  };

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
      {/* Zoomable Photo Gallery Modal (Touch & Pinch-to-Zoom enabled) */}
      <ZoomableImageModal
        isOpen={galleryIdx !== null}
        onClose={() => setGalleryIdx(null)}
        images={galleryAll}
        initialIndex={galleryIdx ?? 0}
        title={project.name}
      />

      {/* Zoomable Floor Plan & Master Plan Lightbox Modal (Touch & Pinch-to-Zoom enabled) */}
      <ZoomableImageModal
        isOpen={floorPlanLightbox !== null}
        onClose={() => setFloorPlanLightbox(null)}
        images={floorPlanLightbox ? [{ url: floorPlanLightbox.url, label: floorPlanLightbox.label }] : []}
        initialIndex={0}
        title={floorPlanLightbox?.label || `${project.name} Plan`}
      />

      {/* Video Tour Modal */}
      {activeVideoUrl && (
        <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-md flex items-center justify-center p-2 sm:p-6" onClick={() => setActiveVideoUrl(null)}>
          <div
            className="relative w-full max-w-5xl h-[88vh] sm:h-[85vh] flex flex-col bg-slate-950 rounded-3xl overflow-hidden shadow-2xl border border-white/15"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-white/10 shrink-0">
              <button
                onClick={() => setActiveVideoUrl(null)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-900 text-white text-xs font-bold transition-all border border-white/15 cursor-pointer shrink-0 shadow-sm"
                title="Back to project"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-amber-500" />
                <span>Back</span>
              </button>
              <div className="flex items-center gap-2 text-white font-bold text-sm truncate mx-2">
                <Play className="w-4 h-4 fill-amber-500 text-amber-500 shrink-0" />
                <span>Video Walkthrough</span>
              </div>
              <button 
                onClick={() => setActiveVideoUrl(null)} 
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0" 
                title="Close video"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Video Player Box (fills all available modal height) */}
            <div className="relative flex-1 w-full h-full min-h-0 bg-black flex items-center justify-center overflow-hidden">
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
                <div className="relative w-full h-full flex items-center justify-center">
                  <video
                    src={resolveMediaUrl(activeVideoUrl)}
                    controls
                    autoPlay
                    playsInline
                    preload="auto"
                    poster={project.videoThumbnail ? resolveMediaUrl(project.videoThumbnail) : undefined}
                    className="w-full h-full max-h-full object-contain"
                    onLoadedData={() => setIsVideoLoading(false)}
                    onCanPlay={() => setIsVideoLoading(false)}
                    onPlaying={() => setIsVideoLoading(false)}
                    onError={() => setIsVideoLoading(false)}
                  />
                  <WatermarkOverlay position="left-middle" />
                </div>
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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => shareOnWhatsApp({ item: project, type: "project", source: "detail" })}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 hover:border-amber-500 shadow-xs cursor-pointer active:scale-95 transition-all"
              title="Share project"
            >
              <Share2 className="w-3.5 h-3.5 text-amber-500" />
              <span>Share</span>
            </button>
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
                className="absolute top-3 right-3 flex items-center gap-1.5 bg-slate-950/85 hover:bg-slate-950 active:scale-95 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/20 shadow-lg z-10 transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-amber-500 text-amber-500 shrink-0" />
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

        {/* Sticky Tabs Bar */}
        <div className="sticky top-16 z-20 bg-white/95 dark:bg-bg-card/95 backdrop-blur-md border-b border-border-default shadow-xs">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 overflow-x-auto scrollbar-none touch-pan-x">
            <div className="flex items-center gap-1.5 shrink-0">
              {TABS.map((tab) => {
                const isStatusTab = tab === "Status";
                const isSelected = activeTab === tab;

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
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer select-none border ${
                      isSelected
                        ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950 border-slate-950 dark:border-white shadow-sm ring-1 ring-black/10"
                        : "bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200/90 dark:border-slate-800 shadow-2xs"
                    }`}
                  >
                    {isStatusTab ? (
                      <>
                        <span className="relative flex h-2 w-2 shrink-0">
                          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isSelected ? "bg-emerald-400" : "bg-emerald-500"}`} />
                          <span className={`relative inline-flex rounded-full h-2 w-2 ${isSelected ? "bg-emerald-400" : "bg-emerald-500"}`} />
                        </span>
                        <RollingStatusTab isSelected={isSelected} />
                      </>
                    ) : (
                      <span>{tab === "Floor Plans" && project.projectType === "venture" ? "Plot Layouts" : tab}</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="hidden sm:flex items-center gap-2 shrink-0">
              {project.videoUrl && (
                <button
                  onClick={() => openVideo(project.videoUrl)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-950 hover:bg-slate-900 text-white text-xs font-bold border border-white/15 transition-all shadow-xs shrink-0 cursor-pointer"
                >
                  <Play className="w-3 h-3 fill-amber-500 text-amber-500 shrink-0" />
                  <span>Watch Tour</span>
                </button>
              )}
              {hasBrochure && (
                <button
                  onClick={(e) => handleDownloadBrochure(e, project.brochureUrl!, project.name)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 transition-all shadow-xs shrink-0 cursor-pointer"
                >
                  <Download className="w-3 h-3 text-slate-700 dark:text-slate-300 shrink-0" />
                  <span>Brochure</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-28 sm:pb-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-8">
            {/* Left / Main column */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              
              {/* Box 1: Project Header & Key Identifiers */}
              <div className="bg-white dark:bg-bg-card border border-border-default rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    {project.builderLogoUrl && (
                      <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 dark:border-slate-800 p-1.5 flex items-center justify-center shrink-0 shadow-2xs">
                        <img src={project.builderLogoUrl} alt={project.builderName} className="w-full h-full object-contain" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="text-xl sm:text-2xl font-black font-heading text-text-primary tracking-tight">
                          {project.name}
                        </h1>
                        {project.reraApproved && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-slate-950 text-white dark:bg-white dark:text-slate-950 shadow-xs">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400 dark:text-emerald-600" /> RERA
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-text-secondary text-xs sm:text-sm font-medium mt-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>{project.location.locality}, {project.location.city}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap sm:justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        const ref = getRefId(project);
                        navigator.clipboard.writeText(ref);
                        toast.success(`Copied Reference ID: ${ref}`);
                      }}
                      title="Click to copy Reference ID"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-2xs"
                    >
                      <span>Ref ID: {getRefId(project)}</span>
                      <Copy className="w-3 h-3 opacity-60" />
                    </button>
                    {project.videoUrl && (
                      <button
                        onClick={() => openVideo(project.videoUrl)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-slate-950 hover:bg-slate-900 text-white shadow-xs transition-all cursor-pointer active:scale-95"
                      >
                        <Play className="w-3 h-3 fill-amber-500 text-amber-500 shrink-0" />
                        <span>Watch Tour</span>
                      </button>
                    )}
                    {project.totalUnits && (
                      <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {project.totalUnits} {project.projectType === "apartment" ? "Units" : project.projectType === "villa" ? "Villas" : "Plots"}
                      </span>
                    )}
                    {project.noBrokerage && (
                      <span className="px-2.5 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        Zero Brokerage
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Box 2: Overview / About This Project Section */}
              <ScrollReveal id="overview" className="scroll-mt-32">
                <div className="bg-white dark:bg-bg-card border border-border-default rounded-3xl p-5 sm:p-6 shadow-sm space-y-6">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h2 className="text-xl font-bold text-text-primary">About {project.name}</h2>
                      {project.reraId && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                          RERA: {project.reraId}
                        </span>
                      )}
                    </div>
                    {project.tagline && (
                      <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                        {project.tagline}
                      </p>
                    )}
                  </div>

                  {/* Rich Description */}
                  {project.description ? (
                    <div className="text-sm sm:text-base text-text-secondary leading-relaxed whitespace-pre-line space-y-3">
                      {project.description}
                    </div>
                  ) : (
                    <p className="text-sm text-text-tertiary italic">
                      Experience modern luxury living at {project.name}, thoughtfully designed by {project.builderName} with world-class architecture and amenities in {project.location.locality}, {project.location.city}.
                    </p>
                  )}

                  {/* Highlights Bullet Matrix */}
                  {project.highlights && project.highlights.length > 0 && (
                    <div className="pt-4 border-t border-border-default">
                      <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-3">Project Highlights</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {project.highlights.map((hl, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs sm:text-sm font-medium text-text-secondary">
                            <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                            <span>{hl}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Project Snapshot Specs */}
                  <div className="pt-4 border-t border-border-default grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-bg-primary p-3 rounded-xl border border-border-default/60">
                      <span className="text-[10px] font-bold text-text-tertiary uppercase block">Project Type</span>
                      <span className="text-xs sm:text-sm font-bold text-text-primary capitalize">{project.projectType}</span>
                    </div>
                    <div className="bg-bg-primary p-3 rounded-xl border border-border-default/60">
                      <span className="text-[10px] font-bold text-text-tertiary uppercase block">Total Area</span>
                      <span className="text-xs sm:text-sm font-bold text-text-primary">{project.totalArea || "On Request"}</span>
                    </div>
                    <div className="bg-bg-primary p-3 rounded-xl border border-border-default/60">
                      <span className="text-[10px] font-bold text-text-tertiary uppercase block">Total Units</span>
                      <span className="text-xs sm:text-sm font-bold text-text-primary">{project.totalUnits ? `${project.totalUnits} Units` : "On Request"}</span>
                    </div>
                    <div className="bg-bg-primary p-3 rounded-xl border border-border-default/60">
                      <span className="text-[10px] font-bold text-text-tertiary uppercase block">Status</span>
                      <span className="text-xs sm:text-sm font-bold text-text-primary capitalize">{project.constructionStatus.replace("-", " ")}</span>
                    </div>
                  </div>
                </div>
              </ScrollReveal>

              {/* Box 3: Price Range & Quick Actions */}
              <div className="bg-white dark:bg-bg-card border border-border-default rounded-3xl p-5 sm:p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-1">Starting Price Range</p>
                  <p className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight">{priceRange}
                    <span className="text-xs font-semibold text-text-secondary ml-2 font-normal">+ Govt. Charges</span>
                  </p>
                  {project.configurations[0] && (
                    <p className="text-xs sm:text-sm text-text-secondary mt-1 font-medium">
                      Available in {[...new Set(project.configurations.map((c) => c.label))].join(", ")} {project.projectType === "venture" ? "Plots" : project.projectType === "villa" ? "Villas" : "Apartments"}
                    </p>
                  )}
                </div>
                {hasBrochure && (
                  <button
                    onClick={(e) => handleDownloadBrochure(e, project.brochureUrl!, project.name)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs sm:text-sm border border-white/15 transition-all shadow-sm whitespace-nowrap cursor-pointer active:scale-95"
                  >
                    <Download className="w-4 h-4 text-amber-500 shrink-0" /> Download Brochure
                  </button>
                )}
              </div>

              {/* Box 4: Construction Updates Box */}
              {project.constructionUpdates && project.constructionUpdates.length > 0 && (
                <ScrollReveal id="status" className="scroll-mt-32">
                  <div className="bg-white dark:bg-bg-card border border-border-default rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-border-default pb-3.5 gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white">
                          <Video className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-bold text-base sm:text-lg text-text-primary">Construction Updates</h3>
                          <p className="text-xs text-text-secondary">Verified site progress and milestone footage</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs">
                          {project.constructionUpdates.length} Updates
                        </span>

                        {/* Navigation Arrows for Scroll Slider */}
                        {project.constructionUpdates.length > 1 && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => updatesScrollRef.current?.scrollBy({ left: -340, behavior: "smooth" })}
                              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-90"
                              title="Previous update"
                              aria-label="Previous update"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => updatesScrollRef.current?.scrollBy({ left: 340, behavior: "smooth" })}
                              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-90"
                              title="Next update"
                              aria-label="Next update"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Updates Horizontal Scroll View */}
                    <div 
                      ref={updatesScrollRef}
                      className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-none pb-2 -mx-1 px-1 touch-pan-x"
                    >
                      {[...project.constructionUpdates].reverse().map((update, i) => (
                        <div
                          key={update.id || i}
                          className="w-[85vw] sm:w-[340px] shrink-0 snap-start bg-slate-50/80 dark:bg-bg-primary border border-border-default/90 rounded-2xl p-4 sm:p-5 flex flex-col justify-between hover:border-slate-400 dark:hover:border-slate-700 hover:shadow-sm transition-all group"
                        >
                          <div>
                            {/* Card Top: Date Badge & Status */}
                            <div className="flex items-center justify-between gap-2 mb-3">
                              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-800 shadow-2xs">
                                <Calendar className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" /> {update.date}
                              </span>
                              <div className="flex items-center gap-1 text-[11px] font-bold text-text-tertiary">
                                <span>Update #{(project.constructionUpdates?.length ?? 0) - i}</span>
                              </div>
                            </div>

                            {/* Optional Thumbnail / Video Preview Box */}
                            {update.videoUrl ? (
                              <div
                                onClick={() => openVideo(update.videoUrl)}
                                className="relative aspect-video rounded-xl overflow-hidden cursor-pointer group/vid mb-3.5 bg-slate-950 shadow-inner"
                              >
                                <img
                                  src={update.imageUrl ? resolveMediaUrl(update.imageUrl) : (project.videoThumbnail ? resolveMediaUrl(project.videoThumbnail) : (heroImage || ""))}
                                  alt={update.title}
                                  className="w-full h-full object-cover opacity-90 group-hover/vid:opacity-100 group-hover/vid:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="w-11 h-11 rounded-full bg-slate-950/90 text-white border border-white/20 flex items-center justify-center shadow-xl backdrop-blur-xs group-hover/vid:scale-110 transition-transform">
                                    <Play className="w-4 h-4 fill-amber-500 text-amber-500 ml-0.5" />
                                  </div>
                                </div>
                                <span className="absolute bottom-2 left-2.5 text-[11px] font-bold text-white drop-shadow-md flex items-center gap-1 bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded-md border border-white/10">
                                  <Film className="w-3 h-3 text-amber-400" /> Progress Video
                                </span>
                              </div>
                            ) : update.imageUrl ? (
                              <div
                                onClick={() => {
                                  const idx = galleryAll.findIndex((g) => g.url === update.imageUrl);
                                  if (idx >= 0) setGalleryIdx(idx);
                                }}
                                className="relative aspect-video rounded-xl overflow-hidden cursor-pointer mb-3.5 bg-slate-950"
                              >
                                <img
                                  src={resolveMediaUrl(update.imageUrl)}
                                  alt={update.title}
                                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                                />
                              </div>
                            ) : null}

                            {/* Title */}
                            <h4 className="font-bold text-text-primary text-base mb-1.5 capitalize">
                              {update.title}
                            </h4>

                            {/* Description */}
                            {update.description && (
                              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed mb-3 line-clamp-3">
                                {update.description}
                              </p>
                            )}
                          </div>

                          {/* Action Button */}
                          {update.videoUrl && (
                            <button
                              type="button"
                              onClick={() => openVideo(update.videoUrl)}
                              className="mt-3 w-full flex items-center justify-center gap-2 bg-slate-950 hover:bg-slate-900 text-white border border-white/15 transition-all py-2.5 rounded-xl text-xs sm:text-sm font-bold cursor-pointer active:scale-98 shadow-sm"
                            >
                              <Play className="w-3.5 h-3.5 fill-amber-500 text-amber-500 shrink-0" />
                              <span>Watch Update Video</span>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </ScrollReveal>
              )}

              {/* Tab Content Area */}
              <div className="space-y-8">

                {/* Box 4: Floor Plans / Configurations */}
                <ScrollReveal id="floor-plans" className="scroll-mt-32">
                  <div className="bg-white dark:bg-bg-card border border-border-default rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <h2 className="text-xl font-bold text-text-primary">
                      {project.projectType === "venture" ? "Plot Layouts & Pricing" : project.projectType === "villa" ? "Villa Configurations & Pricing" : "Floor Plans & Pricing"}
                    </h2>

                    {/* Clean Header Slider Controls */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => cardsScrollRef.current?.scrollBy({ left: -320, behavior: "smooth" })}
                        className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
                        title="Previous layouts"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => cardsScrollRef.current?.scrollBy({ left: 320, behavior: "smooth" })}
                        className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
                        title="Next layouts"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Clean Config tabs */}
                  <div className="flex gap-2 overflow-x-auto scrollbar-none touch-pan-x mb-4 pb-1 items-center">
                    <button
                      onClick={() => setActiveConfigLabel("All")}
                      className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center border transition-all shrink-0 cursor-pointer shadow-2xs ${
                        currentLabel === "All"
                          ? "bg-slate-950 !text-white border-slate-950 dark:bg-white dark:!text-slate-950 shadow-sm ring-1 ring-black/10"
                          : "bg-white dark:bg-slate-900 !text-slate-900 dark:!text-white border-slate-200/90 dark:border-slate-800 hover:border-slate-400"
                      }`}
                    >
                      <span>All</span>
                    </button>

                    {/* Master Plan Tab Button (Only displayed if found) */}
                    {project.masterPlanUrl && (
                      <button
                        onClick={() => setActiveConfigLabel("Master Plan")}
                        className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-1.5 border transition-all shrink-0 cursor-pointer shadow-2xs ${
                          currentLabel === "Master Plan"
                            ? "bg-slate-950 !text-white border-slate-950 dark:bg-white dark:!text-slate-950 shadow-sm ring-1 ring-black/10"
                            : "bg-white dark:bg-slate-900 !text-slate-900 dark:!text-white border-slate-200/90 dark:border-slate-800 hover:border-slate-400"
                        }`}
                      >
                        <LayoutTemplate className="w-3.5 h-3.5 text-amber-500" />
                        <span>Master Plan</span>
                      </button>
                    )}

                    {groupedConfigs.map((group) => {
                      const isSelected = currentLabel === group.label;
                      return (
                        <button
                          key={group.label}
                          onClick={() => setActiveConfigLabel(group.label)}
                          className={`px-4 py-1.5 rounded-2xl text-xs sm:text-sm flex flex-col items-center justify-center border transition-all shrink-0 cursor-pointer shadow-2xs ${
                            isSelected
                              ? "bg-slate-950 !text-white border-slate-950 dark:bg-white dark:!text-slate-950 shadow-sm ring-1 ring-black/10"
                              : "bg-white dark:bg-slate-900 !text-slate-900 dark:!text-white border-slate-200/90 dark:border-slate-800 hover:border-slate-400"
                          }`}
                        >
                          <span className="font-extrabold">{group.label}</span>
                          <span className={`text-[10px] ${isSelected ? "opacity-90" : "text-slate-500 dark:text-slate-400"}`}>
                            {group.configs.length} Size{group.configs.length !== 1 ? 's' : ''}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div>
                    <div ref={cardsScrollRef} className="flex gap-4 sm:gap-5 overflow-x-auto snap-x snap-mandatory scrollbar-none pb-4 -mx-1 px-1">
                    
                    {/* Master Plan Card (Only displayed if found) */}
                    {project.masterPlanUrl && (currentLabel === "All" || currentLabel === "Master Plan") && (
                      <div className="w-[85vw] sm:w-[330px] shrink-0 snap-start p-5 rounded-3xl border border-border-default bg-white dark:bg-bg-card shadow-sm hover:shadow-xl hover:border-amber-500/40 transition-all duration-300 flex flex-col justify-between group">
                        <div>
                          <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-border-default/60">
                            <div>
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                                <LayoutTemplate className="w-3 h-3" /> Master Plan
                              </span>
                              <div className="text-xl font-black text-text-primary mt-1">
                                Overall Site Layout
                              </div>
                              <div className="text-[11px] text-text-secondary font-medium mt-0.5">
                                {project.totalArea ? `Total Area: ${project.totalArea}` : "Complete Project Layout"}
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-border-default shadow-2xs">
                                Site Plan
                              </span>
                            </div>
                          </div>

                          {/* Middle Preview Box */}
                          <div
                            className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-slate-50 dark:bg-bg-primary border border-border-default/80 my-3 flex items-center justify-center cursor-pointer group/media shadow-inner"
                            onClick={() => setFloorPlanLightbox({ url: project.masterPlanUrl!, label: `${project.name} — Master Plan` })}
                          >
                            <img
                              src={resolveMediaUrl(project.masterPlanUrl)}
                              alt={`${project.name} Master Plan`}
                              className="max-w-[95%] max-h-[95%] object-contain group-hover/media:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute bottom-2.5 left-2.5 bg-slate-950/85 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-1 rounded-lg border border-white/15 flex items-center gap-1.5 shadow-md">
                              <Eye className="w-3.5 h-3.5 text-amber-400" />
                              <span>Tap to Zoom</span>
                            </div>
                          </div>

                          {/* Micro-specs */}
                          <div className="grid grid-cols-2 gap-2 my-2">
                            <div className="bg-slate-50 dark:bg-bg-primary border border-border-default/60 rounded-xl px-3 py-2">
                              <div className="text-[10px] uppercase font-bold text-text-tertiary">Type</div>
                              <div className="text-xs font-bold text-text-primary capitalize truncate mt-0.5">
                                {project.projectType} Layout
                              </div>
                            </div>
                            <div className="bg-slate-50 dark:bg-bg-primary border border-border-default/60 rounded-xl px-3 py-2">
                              <div className="text-[10px] uppercase font-bold text-text-tertiary">Total Units</div>
                              <div className="text-xs font-bold text-text-primary truncate mt-0.5">
                                {project.totalUnits ? `${project.totalUnits} Units` : "On Request"}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Card Action Button */}
                        <button
                          type="button"
                          onClick={() => setFloorPlanLightbox({ url: project.masterPlanUrl!, label: `${project.name} — Master Plan` })}
                          className="mt-2 w-full flex items-center justify-center gap-2 bg-slate-950 hover:bg-slate-900 text-white border border-white/15 transition-all py-2.5 rounded-xl text-xs font-bold cursor-pointer active:scale-98 shadow-sm"
                        >
                          <Eye className="w-3.5 h-3.5 text-amber-500" />
                          <span>View Full Master Plan</span>
                        </button>
                      </div>
                    )}

                    {currentLabel !== "Master Plan" && (currentLabel === "All" ? project.configurations : activeGroupConfigs).map((cfg, idx) => {
                      const areaMin = cfg.superBuiltUpAreaMin ?? cfg.builtUpAreaMin ?? cfg.plotSizeMin;
                      const areaMax = cfg.superBuiltUpAreaMax ?? cfg.builtUpAreaMax ?? cfg.plotSizeMax;
                      const hasAreaRange = areaMax && areaMax !== areaMin;
                      const unit = project.projectType === "venture" ? "sq.yds" : "sq.ft";

                      return (
                        <div 
                          key={cfg.id || idx} 
                          className="w-[85vw] sm:w-[330px] shrink-0 snap-start p-5 rounded-3xl border border-border-default bg-white dark:bg-bg-card shadow-sm hover:shadow-xl hover:border-amber-500/40 transition-all duration-300 flex flex-col justify-between group"
                        >
                          {/* Card Top: Configuration Header & Price */}
                          <div>
                            <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-border-default/60">
                              <div>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                                  {cfg.label}
                                </span>
                                <div className="text-xl font-black text-text-primary mt-1">
                                  {areaMin} {hasAreaRange ? `– ${areaMax}` : ""} <span className="text-sm font-semibold text-text-tertiary">{unit}</span>
                                </div>
                                <div className="text-[11px] text-text-secondary font-medium mt-0.5">
                                  {cfg.uds ? `UDS: ${cfg.uds} sq.yds • ` : ""}{project.projectType === "venture" ? "Plot Layout" : "Super Built-up Area"}
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <div className="text-lg font-black text-amber-600 dark:text-amber-400">
                                  {formatINRCrore(cfg.priceMin)}
                                </div>
                                {cfg.priceMax && cfg.priceMax !== cfg.priceMin && (
                                  <div className="text-xs font-bold text-text-secondary">
                                    – {formatINRCrore(cfg.priceMax)}
                                  </div>
                                )}
                                <div className="text-[10px] text-text-tertiary font-semibold mt-0.5">
                                  + Govt. Charges
                                </div>
                              </div>
                            </div>

                            {/* Middle Box: Floor Plan Preview / Video */}
                            <div 
                              className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-slate-50 dark:bg-bg-primary border border-border-default/80 my-3 flex items-center justify-center cursor-pointer group/media shadow-inner"
                              onClick={() => {
                                if (cfg.floorPlanUrl) {
                                  setFloorPlanLightbox({ url: cfg.floorPlanUrl, label: `${cfg.label} (${areaMin} ${unit})` });
                                } else if (cfg.videoUrl) {
                                  openVideo(cfg.videoUrl);
                                }
                              }}
                            >
                              {cfg.floorPlanUrl ? (
                                <img
                                  src={resolveMediaUrl(cfg.floorPlanUrl)}
                                  alt={`${cfg.label} Floor Plan`}
                                  className="max-w-[92%] max-h-[92%] object-contain group-hover/media:scale-105 transition-transform duration-500"
                                />
                              ) : (
                                <div className="flex flex-col items-center justify-center gap-1.5 text-text-tertiary">
                                  <LayoutTemplate className="w-8 h-8 text-text-tertiary/40" />
                                  <span className="text-xs font-semibold">Floor Plan on Request</span>
                                </div>
                              )}

                              {/* Floating Zoom Badge */}
                              {cfg.floorPlanUrl && (
                                <div className="absolute bottom-2.5 left-2.5 bg-slate-950/80 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-1 rounded-lg border border-white/15 flex items-center gap-1.5 shadow-md">
                                  <Eye className="w-3.5 h-3.5 text-amber-400" />
                                  <span>Tap to Zoom</span>
                                </div>
                              )}

                              {/* Floating Video Tour Pill */}
                              {cfg.videoUrl && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openVideo(cfg.videoUrl!);
                                  }}
                                  className="absolute top-2.5 right-2.5 bg-slate-950/85 hover:bg-slate-950 active:scale-95 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-1 rounded-lg border border-white/15 shadow-md flex items-center gap-1 transition-transform cursor-pointer"
                                >
                                  <Play className="w-3 h-3 fill-amber-500 text-amber-500" />
                                  <span>Tour</span>
                                </button>
                              )}
                            </div>

                            {/* Micro-Specs Grid */}
                            <div className="grid grid-cols-2 gap-2 my-2">
                              <div className="bg-bg-primary dark:bg-bg-primary/60 border border-border-default/60 rounded-xl px-3 py-2">
                                <div className="text-[10px] uppercase font-bold text-text-tertiary">Status</div>
                                <div className="text-xs font-bold text-text-primary capitalize truncate mt-0.5">
                                  {(cfg.constructionStatus || project.constructionStatus).replace("-", " ")}
                                </div>
                              </div>
                              <div className="bg-bg-primary dark:bg-bg-primary/60 border border-border-default/60 rounded-xl px-3 py-2">
                                <div className="text-[10px] uppercase font-bold text-text-tertiary">Possession</div>
                                <div className="text-xs font-bold text-text-primary truncate mt-0.5">
                                  {cfg.possessionDate || "On Request"}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Card Action Button */}
                          {cfg.floorPlanUrl && (
                            <button
                              type="button"
                              onClick={() => setFloorPlanLightbox({ url: cfg.floorPlanUrl!, label: `${cfg.label} (${areaMin} ${unit})` })}
                              className="mt-2 w-full flex items-center justify-center gap-2 bg-slate-950 hover:bg-slate-900 text-white border border-white/15 transition-all py-2.5 rounded-xl text-xs font-bold cursor-pointer active:scale-98 shadow-sm"
                            >
                              <Eye className="w-3.5 h-3.5 text-amber-500" />
                              <span>View Full Floor Plan</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                    </div>
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
                <ProjectFacilitiesGrid
                  facilities={project.facilities}
                  projectName={project.name}
                />
              </ScrollReveal>

              <ScrollReveal id="location" className="scroll-mt-32">
                <div className="bg-white dark:bg-bg-card border border-border-default rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
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
                <div className="bg-white dark:bg-bg-card border border-border-default rounded-3xl p-5 sm:p-6 shadow-sm">
                  <h2 className="text-xl font-bold text-text-primary mb-4">Brochure</h2>
                  {hasBrochure ? (
                    <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl border border-border-default bg-bg-primary">
                      <div className="w-12 h-12 rounded-xl bg-amber-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="w-6 h-6 text-amber-primary" />
                      </div>
                      <div className="text-center sm:text-left">
                        <p className="font-semibold text-text-primary">Download {project.name} Brochure</p>
                        <p className="text-sm text-text-secondary">Get complete floor plans, pricing &amp; payment plan</p>
                      </div>
                      <div className="sm:ml-auto flex items-center gap-2.5 w-full sm:w-auto">
                        <a
                          href={resolveMediaUrl(project.brochureUrl!)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-border-default hover:bg-slate-100 dark:hover:bg-slate-800 text-text-primary font-bold text-sm transition-colors text-center shrink-0 flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-amber-500" />
                          View
                        </a>
                        <button
                          type="button"
                          onClick={(e) => handleDownloadBrochure(e, project.brochureUrl!, project.name)}
                          className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-amber-primary text-slate-950 font-bold text-sm hover:bg-amber-500 transition-colors shrink-0 whitespace-nowrap flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </button>
                      </div>
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
                <div className="bg-white dark:bg-bg-card border border-border-default rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
                  <h2 className="text-xl font-bold text-text-primary">About the Builder</h2>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-default/60">
                    <div className="flex items-center gap-4">
                      {project.builderLogoUrl && (
                        <div className="w-16 h-16 rounded-2xl bg-white border border-border-default p-2 flex items-center justify-center shrink-0 shadow-2xs">
                          <img src={project.builderLogoUrl} alt={project.builderName} className="w-full h-full object-contain" />
                        </div>
                      )}
                      <div>
                        <p className="font-black text-xl text-text-primary">{project.builderName}</p>
                        <p className="text-xs text-text-secondary font-medium">Developed By</p>
                      </div>
                    </div>

                    {/* Builder Stats Badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {project.builderExperience && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                          🏆 {project.builderExperience}
                        </span>
                      )}
                      {project.builderProjectsCount && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                          🏢 {project.builderProjectsCount}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Optional Builder Bio / Description */}
                  {project.builderDescription && (
                    <p className="text-xs sm:text-sm text-text-secondary leading-relaxed pt-1">
                      {project.builderDescription}
                    </p>
                  )}

                  {/* Builder Contact Section (Login Gated) */}
                  {!isLoggedIn ? (
                    <div className="mt-4 p-5 rounded-2xl bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 border border-amber-500/40 flex items-center justify-center shrink-0">
                          <Lock className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                          <h4 className="font-heading font-black text-slate-900 dark:text-white text-sm sm:text-base">
                            Log in to view builder contact
                          </h4>
                          <p className="text-xs text-slate-600 dark:text-slate-300">
                            Sign in to call or WhatsApp builder
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => router.push(getLoginUrl(targetRedirect))}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black text-sm shadow-md transition-all cursor-pointer"
                      >
                        <Lock className="w-4 h-4 fill-slate-950 text-slate-950" />
                        <span>Sign in to Contact Builder</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" /> BUILDER CONTACT UNLOCKED
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {phone && (
                          <a
                            href={phone}
                            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs sm:text-sm border border-white/15 transition-all shadow-xs active:scale-95"
                          >
                            <Phone className="w-4 h-4 text-amber-500 shrink-0" />
                            <span>Call Builder {project.builderPhone ? `(${project.builderPhone})` : ""}</span>
                          </a>
                        )}
                        {whatsapp && (
                          <a
                            href={whatsapp}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs sm:text-sm transition-all shadow-xs active:scale-95"
                          >
                            <MessageCircle className="w-4 h-4 shrink-0" />
                            <span>WhatsApp Builder</span>
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollReveal>
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="space-y-5">
              {/* Why consider */}
              {project.highlights.length > 0 && (
                <div className="bg-white dark:bg-bg-card border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm lg:sticky lg:top-32">
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
              <div className="hidden sm:block bg-white dark:bg-bg-card border border-border-default rounded-3xl p-5 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-text-primary">Contact Builder</h3>
                  {isLoggedIn && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      <CheckCircle2 className="w-3 h-3" /> BUILDER CONTACT UNLOCKED
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-tertiary mb-4">
                  {isLoggedIn
                    ? "Get exact pricing, payment plans & site visit"
                    : "Sign in to call or WhatsApp builder"}
                </p>

                <div className="space-y-3">
                  {!isLoggedIn ? (
                    <button
                      type="button"
                      onClick={() => router.push(getLoginUrl(targetRedirect))}
                      className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm shadow-md transition-all cursor-pointer active:scale-98"
                    >
                      <Lock className="w-4 h-4 fill-slate-950 text-slate-950" />
                      <span>Sign in to Contact Builder</span>
                    </button>
                  ) : (
                    <>
                      {phone && (
                        <a href={phone} className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-slate-950 hover:bg-slate-900 text-white font-bold text-sm border border-white/15 transition-all shadow-sm active:scale-98">
                          <Phone className="w-4 h-4 text-amber-500 shrink-0" />
                          <span>Call Builder {project.builderPhone ? `(${project.builderPhone})` : ""}</span>
                        </a>
                      )}
                      {whatsapp && (
                        <a href={whatsapp} target="_blank" rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm transition-all shadow-sm active:scale-98">
                          <MessageCircle className="w-4 h-4 shrink-0" />
                          <span>WhatsApp Builder</span>
                        </a>
                      )}
                    </>
                  )}

                  {project.videoUrl && (
                    <button
                      onClick={() => openVideo(project.videoUrl)}
                      className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-slate-950 hover:bg-slate-900 text-white font-bold text-sm border border-white/15 transition-all cursor-pointer shadow-sm active:scale-98"
                    >
                      <Play className="w-4 h-4 fill-amber-500 text-amber-500" /> Watch Tour Video
                    </button>
                  )}
                  {hasBrochure && (
                    <div className="flex items-center gap-2 w-full">
                      <a
                        href={resolveMediaUrl(project.brochureUrl!)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl border border-border-default hover:bg-slate-100 dark:hover:bg-slate-800 text-text-primary font-bold text-sm transition-colors text-center shrink-0 cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-amber-500" />
                        View
                      </a>
                      <button
                        type="button"
                        onClick={(e) => handleDownloadBrochure(e, project.brochureUrl!, project.name)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-slate-950 hover:bg-slate-900 text-white font-bold text-sm border border-white/15 transition-all shadow-sm cursor-pointer active:scale-98"
                      >
                        <Download className="w-4 h-4 text-amber-500 shrink-0" /> Download
                      </button>
                    </div>
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
    </>
  );
}
