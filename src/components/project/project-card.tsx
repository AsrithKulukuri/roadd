"use client";

import { MapPin, Building2, Home, Landmark, CheckCircle2, Navigation, ArrowRight, Ruler, SquareDashed, Trees, Heart, Share2, Sparkles, Award, Tag, Shield, Image as ImageIcon, Maximize2 } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn, formatPriceCompact } from "@/lib/utils";
import type { Project, ProjectType } from "@/types/project";
import { useFavoritesStore } from "@/stores/favorites-store";
import { useAuthSession } from "@/hooks/use-auth-session";
import { triggerProjectViewNotification } from "@/lib/project-notifications";
import { getRefId } from "@/lib/ref-id";
import { shareItem } from "@/lib/share-utils";
import { shareOnWhatsApp } from "@/lib/whatsapp/whatsapp-share";
import { WhatsAppIcon } from "@/components/property/whatsapp-share-button";

// ─── Constants ──────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<ProjectType, { icon: React.ElementType; label: string }> = {
  apartment: {
    icon: Building2,
    label: "Apartment",
  },
  villa: {
    icon: Home,
    label: "Villa",
  },
  venture: {
    icon: Landmark,
    label: "Venture",
  },
};

const STATUS_COLORS: Record<string, string> = {
  "under-construction": "bg-orange-500/10 text-orange-600",
  "ready-to-move":      "bg-amber-500/10 text-amber-600",
  "new-launch":         "bg-amber-500/10 text-amber-600",
};
const STATUS_LABELS: Record<string, string> = {
  "under-construction": "Under Construction",
  "ready-to-move":      "Ready to Move",
  "new-launch":         "New Launch",
};

// ─── Formatting ──────────────────────────────────────────────────────────────
function getPriceLabel(project: Project): string {
  const isVenture = project.projectType === "venture" || (project.projectType as string) === "residential-land";
  const allPrices = project.configurations?.flatMap((c) => [c.priceMin, c.priceMax]).filter(Boolean) || [];

  if (isVenture) {
    if (allPrices.length) {
      const min = Math.min(...allPrices);
      return formatPriceCompact(min);
    }
    const unitPrices = project.configurations?.map((c) => c.pricePerUnit).filter(Boolean) as number[];
    if (unitPrices && unitPrices.length) {
      const uMin = Math.min(...unitPrices);
      return `₹${uMin.toLocaleString("en-IN")}/sq.yd`;
    }
    return "Price on request";
  }

  if (!allPrices.length) {
    if (project.configurations?.length) {
      const unitPrices = project.configurations.map((c) => c.pricePerUnit).filter(Boolean) as number[];
      if (unitPrices.length) {
        const uMin = Math.min(...unitPrices);
        const uMax = Math.max(...unitPrices);
        return uMin === uMax ? `₹${uMin.toLocaleString("en-IN")}/sq.yd` : `₹${uMin.toLocaleString("en-IN")}–₹${uMax.toLocaleString("en-IN")}/sq.yd`;
      }
    }
    return "Price on request";
  }
  const min = Math.min(...allPrices);
  const max = Math.max(...allPrices);
  return min === max ? formatPriceCompact(min) : `${formatPriceCompact(min)} – ${formatPriceCompact(max)}`;
}

function getVenturePricePerUnit(project: Project): string | null {
  const prices = project.configurations.map((c) => c.pricePerUnit).filter(Boolean) as number[];
  if (!prices.length) return null;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max
    ? `₹${min.toLocaleString("en-IN")}/sq.yd`
    : `₹${min.toLocaleString("en-IN")} – ₹${max.toLocaleString("en-IN")}/sq.yd`;
}

function getPlotSizeRange(project: Project): string | null {
  const sizes = project.configurations.flatMap((c) => [c.plotSizeMin, c.plotSizeMax]).filter(Boolean) as number[];
  if (!sizes.length) return null;
  const min = Math.min(...sizes);
  const max = Math.max(...sizes);
  return min === max ? `${min} sq.yds` : `${min}–${max} sq.yds`;
}

function getAreaRange(project: Project): string | null {
  const sizes = project.configurations.flatMap((c) => [c.builtUpAreaMin, c.builtUpAreaMax]).filter(Boolean) as number[];
  if (!sizes.length) return null;
  const min = Math.min(...sizes);
  const max = Math.max(...sizes);
  return min === max ? `${min} sq.ft` : `${min}–${max} sq.ft`;
}

// ─── Component ───────────────────────────────────────────────────────────────
interface ProjectCardProps {
  project: Project;
  index?: number;
  variant?: "default" | "compact" | "horizontal" | "category-style";
}

import { useProjectOpenGuard } from "@/hooks/useProjectOpenGuard";

export function ProjectCard({ project, index = 0, variant = "default" }: ProjectCardProps) {
  const { toggleFavorite, isFavorite } = useFavoritesStore();
  const isSaved = isFavorite(project.id);
  const TC   = TYPE_CONFIG[project.projectType];
  const Icon = TC.icon;
  const isVenture   = project.projectType === "venture";
  const isVilla     = project.projectType === "villa";
  const isApartment = project.projectType === "apartment";

  // Config display labels (BHK / plot types)
  const configLabels = [...new Set(project.configurations.map((c) => c.label))];

  // Price + unit info
  const priceLabel      = getPriceLabel(project);
  const pricePerUnit    = isVenture ? getVenturePricePerUnit(project) : null;
  const plotSizeRange   = (isVenture || isVilla) ? getPlotSizeRange(project) : null;
  const builtUpRange    = (isApartment || isVilla) ? getAreaRange(project) : null;

  // Total info
  const totalLabel = isVenture
    ? project.totalUnits ? `${project.totalUnits} Plots` : project.totalArea
    : project.totalUnits
    ? `${project.totalUnits} ${isVilla ? "Villas" : "Units"}`
    : null;

  const { openProject } = useProjectOpenGuard();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCardClick = (e: React.MouseEvent) => {
    openProject(project, e);
  };

  if (variant === "compact") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25, delay: index * 0.03 }}
        className="h-full"
      >
        <Link
          href={`/projects/${project.slug}`}
          onClick={handleCardClick}
          className="block h-full group"
        >
          <div
            className={cn(
              "flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs hover:shadow-lg transition-all duration-200"
            )}
          >
            {/* Image Thumbnail */}
            <div className="relative w-full h-[95px] sm:h-[135px] md:h-[160px] overflow-hidden bg-slate-100 dark:bg-slate-800">
              {project.coverImage ? (
                <img
                  src={project.coverImage}
                  alt={project.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-500">
                  <Icon className="w-8 h-8 opacity-40" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

              {/* Monochromatic White Badge */}
              <div className="absolute top-1.5 left-1.5">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-slate-900 shadow-sm border border-slate-200/80 backdrop-blur-md">
                  {TC.label}
                </span>
              </div>

              {/* Price Tag Overlay on Image bottom-left */}
              <div className="absolute bottom-1.5 left-2">
                <span className="text-white font-extrabold text-xs sm:text-sm drop-shadow-md">
                  {priceLabel}
                </span>
              </div>
            </div>

            {/* Compact Details below Image */}
            <div className="p-2.5 sm:p-3 flex flex-col justify-between">
              <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate transition-colors">
                {project.name}
              </h4>
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                <span>{project.location?.locality}, {project.location?.city}</span>
              </p>
            </div>
          </div>
        </Link>
      </motion.div>
    );
  }

  if (variant === "category-style" && !isExpanded) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
        onClick={(e) => {
          openProject(project, e);
        }}
        className="w-[160px] h-[160px] sm:w-[220px] sm:h-[220px] rounded-2xl relative overflow-hidden group cursor-pointer border border-border-default shadow-sm shrink-0"
      >
        {project.coverImage ? (
          <img src={project.coverImage} alt={project.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 gap-3">
            <Icon className="w-10 h-10 sm:w-14 sm:h-14 text-text-tertiary/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10">
          <span className="bg-white text-slate-900 shadow-md border border-slate-200/80 font-extrabold text-[10px] sm:text-xs px-2.5 py-1 rounded-full">
            {priceLabel}
          </span>
        </div>
        <div className="absolute bottom-2 left-2 right-2 sm:bottom-4 sm:left-4 sm:right-4 text-white">
          <h3 className="font-extrabold text-sm sm:text-lg leading-tight line-clamp-1 text-white transition-colors">{project.name}</h3>
          <p className="text-[10px] sm:text-xs text-white/80 flex items-center gap-1 mt-0.5 sm:mt-1 truncate">
            <MapPin className="w-3 h-3 text-slate-300 shrink-0" /> {project.location.locality}
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <Link href={`/projects/${project.slug}`} onClick={handleCardClick} className="group block h-full">
      <div className="relative h-full flex flex-col justify-between bg-white dark:bg-bg-card border border-border-default rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">

        {/* Image with 16/10 uniform aspect ratio */}
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
          {project.coverImage ? (
            <img
              src={project.coverImage}
              alt={project.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 gap-3">
              <Icon className="w-14 h-14 text-text-tertiary/30" />
              <span className="text-xs text-text-tertiary font-medium">{TC.label} Project</span>
            </div>
          )}

          {/* Top Badges (Max 2 badges + '+N' chip, with dedicated margin so it never collides with actions) */}
          {(() => {
            const badges: React.ReactNode[] = [];
            badges.push(
              <span key="type" className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-white/95 text-slate-900 shadow-sm border border-slate-200/80 backdrop-blur-md tracking-tight truncate max-w-[120px]">
                {TC.label}
              </span>
            );
            if (project.reraApproved || (project as any).reraId) {
              badges.push(
                <span key="rera" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/95 text-slate-900 shadow-sm border border-slate-200/80 backdrop-blur-md tracking-tight shrink-0">
                  <Shield className="w-3 h-3 text-amber-500" /> RERA
                </span>
              );
            }
            if (project.isFeatured) {
              badges.push(
                <span key="feat" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/95 text-slate-900 shadow-sm border border-slate-200/80 backdrop-blur-md tracking-tight shrink-0">
                  <Sparkles className="w-3 h-3 text-amber-500" /> Featured
                </span>
              );
            }

            const visibleBadges = badges.slice(0, 2);
            const extraCount = badges.length - 2;

            return (
              <div className="absolute top-2.5 left-2.5 max-w-[calc(100%-74px)] flex items-center gap-1 overflow-hidden z-10">
                {visibleBadges}
                {extraCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-white/95 text-slate-900 shadow-sm border border-slate-200/80 backdrop-blur-md shrink-0">
                    +{extraCount}
                  </span>
                )}
              </div>
            );
          })()}

          {/* Top Right Action Buttons (Share & Save) */}
          <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1 pointer-events-auto">
            <button
              type="button"
              className="w-7 h-7 rounded-full bg-white/95 hover:bg-white text-slate-800 shadow-md flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer border border-slate-200/60 backdrop-blur-md"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                shareOnWhatsApp({ item: project, type: "project", source: "card" });
              }}
              title="Share project"
              aria-label="Share project"
            >
              <Share2 className="h-3 w-3 text-slate-800 hover:text-amber-500 transition-colors" />
            </button>
            <button
              type="button"
              className="w-7 h-7 rounded-full bg-white/95 hover:bg-white text-slate-800 shadow-md flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer border border-slate-200/60 backdrop-blur-md"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleFavorite(project.id);
              }}
              title={isSaved ? "Remove from saved" : "Save project"}
              aria-label={isSaved ? "Remove from saved" : "Save project"}
            >
              <Heart className={cn("h-3 w-3 transition-all", isSaved ? "fill-red-500 text-red-500 scale-110" : "text-slate-800")} />
            </button>
          </div>

          {/* Subtle Bottom Gradient for Status/Media readability (no dark overlay on top/middle) */}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

          {/* Bottom Left Status */}
          <div className="absolute bottom-2.5 left-2.5 z-10">
            <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold backdrop-blur-md border border-white/10 bg-slate-950/85 text-amber-400 shadow-sm">
              {STATUS_LABELS[project.constructionStatus] || "New Launch"}
            </span>
          </div>

          {/* Bottom Right Media Indicator */}
          {project.images && project.images.length > 1 && (
            <div className="absolute bottom-2.5 right-2.5 z-10">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-950/80 text-white backdrop-blur-md border border-white/10 flex items-center gap-1 shadow-sm">
                <ImageIcon className="w-3 h-3 text-amber-400" /> {project.images.length}
              </span>
            </div>
          )}
        </div>

        {/* Details Section */}
        <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between space-y-2.5 sm:space-y-3">

          <div className="space-y-1.5 sm:space-y-2">
            {/* Title (2 lines clamp) & Locality */}
            <div>
              <h3 className="font-bold text-text-primary text-sm sm:text-base leading-snug group-hover:text-amber-primary transition-colors line-clamp-2 min-h-[38px] sm:min-h-[42px]">
                {project.name}
              </h3>
              <div className="flex items-center gap-1.5 text-text-secondary text-xs mt-1 truncate">
                <MapPin className="w-3.5 h-3.5 shrink-0 text-amber-primary" />
                <span className="truncate">{project.location.locality}, {project.location.city}</span>
              </div>
            </div>

            {/* Clean 1-Row Config Pills */}
            <div className="h-[24px] flex items-center gap-1.5 overflow-hidden">
              {configLabels.length > 0 ? (
                <>
                  {configLabels.slice(0, 2).map((label) => (
                    <span key={label} className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-bg-primary border border-border-default text-text-secondary whitespace-nowrap truncate max-w-[120px]">
                      {label}
                    </span>
                  ))}
                  {configLabels.length > 2 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 whitespace-nowrap shrink-0">
                      +{configLabels.length - 2}
                    </span>
                  )}
                </>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-bg-primary border border-border-default text-text-tertiary">
                  {TC.label} Project
                </span>
              )}
            </div>

            {/* Area Row */}
            <div className="h-[18px] flex items-center gap-1.5 text-xs text-text-secondary">
              {builtUpRange ? (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="truncate font-medium">{builtUpRange}</span>
                </>
              ) : plotSizeRange ? (
                <>
                  <SquareDashed className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="truncate font-medium">{plotSizeRange}</span>
                </>
              ) : totalLabel ? (
                <>
                  <Trees className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="truncate font-medium">{totalLabel}</span>
                </>
              ) : (
                <span className="text-text-tertiary text-[11px]">Premium Specifications</span>
              )}
            </div>
          </div>

          {/* Locked Bottom Price & Builder Row */}
          <div className="mt-auto pt-2.5 sm:pt-3 border-t border-border-default">
            {/* Top Sub-row: Category label on left, Ref ID on right so it doesn't steal price width */}
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="text-[9.5px] text-text-tertiary uppercase tracking-wider font-extrabold truncate">
                {isVenture ? "Starting Price" : "Price Range"}
              </p>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                {getRefId(project)}
              </span>
            </div>

            {/* Main Row: Big Bold Price (Left, broad) + Builder (Right, compact) */}
            <div className="flex items-end justify-between gap-3">
              <div className="flex-1 min-w-0 pr-1">
                <p className="font-black text-text-primary text-base sm:text-lg leading-snug tracking-tight break-words">
                  {priceLabel}
                </p>
                {pricePerUnit && !isVenture && pricePerUnit !== priceLabel && (
                  <p className="text-[10px] text-text-secondary font-semibold truncate mt-0.5">{pricePerUnit}</p>
                )}
              </div>
              <div className="text-right shrink-0 max-w-[105px] sm:max-w-[125px]">
                <p className="text-[9px] text-text-tertiary uppercase tracking-wider font-extrabold truncate">BUILDER</p>
                <p className="text-xs font-semibold text-text-secondary truncate flex items-center justify-end gap-1 mt-0.5">
                  <span className="truncate">{project.builderName}</span>
                </p>
                {totalLabel && !isVenture && (
                  <p className="text-[10px] text-text-tertiary truncate mt-0.5">{totalLabel}</p>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </Link>
  );
}
