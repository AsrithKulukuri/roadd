"use client";

import { use, useEffect, useState } from "react";
import { useProjectsStore } from "@/stores/projects-store";
import {
  MapPin, CheckCircle2, Phone, MessageCircle, Download,
  ChevronDown, ChevronUp, Star, ArrowLeft, Building2, Home, Landmark,
  Eye, X, ChevronLeft, ChevronRight, Play,
} from "lucide-react";
import Link from "next/link";
import type { Project, ProjectConfig } from "@/types/project";

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
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4">
      <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
        <X className="w-5 h-5" />
      </button>
      <p className="absolute top-4 left-4 text-white/60 text-sm">{idx + 1} / {images.length}</p>
      <button onClick={prev} className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button onClick={next} className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
        <ChevronRight className="w-5 h-5" />
      </button>
      <img src={images[idx].url} alt={images[idx].alt ?? "Project image"} className="max-h-[85vh] max-w-full object-contain rounded-xl" />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = ["Floor Plans", "Facilities", "Brochure", "Builder"] as const;
type Tab = (typeof TABS)[number];

export default function ProjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { projects, fetchProjects } = useProjectsStore();

  const [activeTab, setActiveTab] = useState<Tab>("Floor Plans");
  const [statusOpen, setStatusOpen] = useState(true);
  const [galleryIdx, setGalleryIdx] = useState<number | null>(null);
  const [activeConfigIdx, setActiveConfigIdx] = useState(0);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const project = projects.find((p) => p.slug === slug && p.isPublished);

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

  // YouTube embed
  const getEmbed = (url?: string) => {
    if (!url) return null;
    const m = url.match(/(?:youtu\.be\/|v=)([^#&?]+)/);
    return m ? `https://www.youtube.com/embed/${m[1]}` : null;
  };
  const videoEmbed = getEmbed(project.videoUrl);

  // Active config
  const activeConfig = project.configurations[activeConfigIdx];

  return (
    <>
      {/* Gallery modal */}
      {galleryIdx !== null && (
        <GalleryModal images={galleryAll} startIdx={galleryIdx} onClose={() => setGalleryIdx(null)} />
      )}

      <div className="min-h-screen bg-slate-50 dark:bg-bg-primary pt-16">
        {/* Breadcrumb */}
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <Link href="/" className="hover:text-amber-primary transition-colors">Home</Link>
            <span>/</span>
            <Link href="/projects" className="hover:text-amber-primary transition-colors">Projects</Link>
            <span>/</span>
            <span className="text-text-primary font-medium">{project.name}</span>
          </div>
        </div>

        {/* Hero Gallery */}
        <div className="max-w-7xl mx-auto px-4 mb-4">
          <div className="grid grid-cols-3 gap-2 rounded-2xl overflow-hidden" style={{ height: "320px" }}>
            {/* Main image */}
            <div className="col-span-2 relative cursor-pointer group" onClick={() => heroImage && setGalleryIdx(0)}>
              {heroImage ? (
                <img src={heroImage} alt={project.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-amber-primary/20 to-amber-primary/5 flex items-center justify-center">
                  <TypeIcon className="w-16 h-16 text-amber-primary/30" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
              {galleryAll.length > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); setGalleryIdx(0); }}
                  className="absolute bottom-3 left-3 flex items-center gap-2 bg-black/70 text-white text-xs font-medium px-3 py-1.5 rounded-full hover:bg-black/90 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" /> All Photos &amp; Videos ({galleryAll.length})
                </button>
              )}
            </div>
            {/* Side images */}
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
          <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3.5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === tab
                    ? "border-amber-primary text-amber-primary"
                    : "border-transparent text-text-secondary hover:text-text-primary"
                }`}
              >
                {tab}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2 py-2 shrink-0">
              {project.brochureUrl && (
                <a href={project.brochureUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border-default text-xs font-semibold text-text-primary hover:border-amber-primary transition-colors">
                  <Download className="w-3.5 h-3.5" /> Brochure
                </a>
              )}
              {phone && (
                <a href={phone} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-primary text-slate-950 text-xs font-bold hover:bg-amber-500 transition-colors">
                  <Phone className="w-3.5 h-3.5" /> View Number
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left / Main column */}
            <div className="lg:col-span-2 space-y-6">
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
                            <p className="text-xs text-text-tertiary">{phase.totalUnits} units</p>
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
              {activeTab === "Floor Plans" && (
                <div className="bg-white dark:bg-bg-card border border-border-default rounded-2xl p-6">
                  <h2 className="text-xl font-bold text-text-primary mb-4">Floor Plans &amp; Pricing</h2>

                  {/* Config tabs */}
                  <div className="flex gap-2 flex-wrap mb-5">
                    {project.configurations.map((cfg, i) => (
                      <button key={cfg.id} onClick={() => setActiveConfigIdx(i)}
                        className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                          activeConfigIdx === i
                            ? "bg-amber-primary/10 border-amber-primary text-amber-primary"
                            : "border-border-default text-text-secondary hover:border-amber-primary/40"
                        }`}
                      >
                        {cfg.label}
                      </button>
                    ))}
                  </div>

                  {activeConfig && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 rounded-2xl border border-border-default bg-bg-primary space-y-2">
                        <p className="text-xs font-semibold text-text-tertiary uppercase">Area</p>
                        {activeConfig.builtUpAreaMin != null && (
                          <p className="text-base font-bold text-text-primary">
                            {activeConfig.builtUpAreaMin} – {activeConfig.builtUpAreaMax} sq.ft
                            <span className="text-xs text-text-tertiary ml-1">(Built-up)</span>
                          </p>
                        )}
                        {activeConfig.plotSizeMin != null && (
                          <p className="text-base font-bold text-text-primary">
                            {activeConfig.plotSizeMin} – {activeConfig.plotSizeMax} sq.yds
                          </p>
                        )}
                        <p className="text-xl font-bold text-amber-primary">
                          {formatINRCrore(activeConfig.priceMin)} – {formatINRCrore(activeConfig.priceMax)}
                        </p>
                        {activeConfig.constructionStatus && (
                          <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[activeConfig.constructionStatus]}`}>
                            {STATUS_LABELS[activeConfig.constructionStatus]}
                          </span>
                        )}
                        {activeConfig.possessionDate && (
                          <p className="text-xs text-text-tertiary">{activeConfig.possessionDate} possession</p>
                        )}
                      </div>
                      {activeConfig.floorPlanUrl && (
                        <div className="rounded-2xl overflow-hidden border border-border-default aspect-video cursor-pointer" onClick={() => {
                          const imgIdx = project.images.findIndex((x) => x.url === activeConfig.floorPlanUrl);
                          setGalleryIdx(imgIdx >= 0 ? imgIdx : 0);
                        }}>
                          <img src={activeConfig.floorPlanUrl} alt={`${activeConfig.label} floor plan`} className="w-full h-full object-contain bg-bg-primary" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "Facilities" && (
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
              )}

              {activeTab === "Brochure" && (
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
              )}

              {activeTab === "Builder" && (
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
              )}
            </div>

            {/* Right Sidebar */}
            <div className="space-y-5">
              {/* Why consider */}
              {project.highlights.length > 0 && (
                <div className="bg-white dark:bg-bg-card border border-amber-primary/20 rounded-2xl p-5 sticky top-32">
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

              {/* Quick contact */}
              <div className="bg-white dark:bg-bg-card border border-border-default rounded-2xl p-5">
                <h3 className="font-bold text-text-primary mb-1">Contact Builder</h3>
                <p className="text-xs text-text-tertiary mb-4">Get exact pricing, payment plans & site visit</p>
                <div className="space-y-3">
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
    </>
  );
}
