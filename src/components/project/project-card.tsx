"use client";

import { MapPin, Building2, Home, Landmark, CheckCircle2, Navigation, ArrowRight, Ruler, SquareDashed, Trees, Heart, Share2, Sparkles, Award, Tag, Shield } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Project, ProjectType } from "@/types/project";
import { useFavoritesStore } from "@/stores/favorites-store";
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
function formatINRCrore(amount: number): string {
  if (!amount) return "";
  if (amount >= 10000000) {
    const val = amount / 10000000;
    const formatted = val % 1 === 0 ? val.toString() : val.toFixed(2).replace(/\.?0+$/, "");
    return `₹${formatted} Cr`;
  }
  if (amount >= 100000) {
    const val = amount / 100000;
    const formatted = val % 1 === 0 ? val.toString() : val.toFixed(2).replace(/\.?0+$/, "");
    return `₹${formatted} L`;
  }
  return `₹${amount.toLocaleString("en-IN")}`;
}

function getPriceLabel(project: Project): string {
  const allPrices = project.configurations.flatMap((c) => [c.priceMin, c.priceMax]).filter(Boolean);
  if (!allPrices.length) return "Price on request";
  const min = Math.min(...allPrices);
  const max = Math.max(...allPrices);
  return min === max ? formatINRCrore(min) : `${formatINRCrore(min)} – ${formatINRCrore(max)}`;
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

  const [isExpanded, setIsExpanded] = useState(false);

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
          e.preventDefault();
          setIsExpanded(true);
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
    <Link href={`/projects/${project.slug}`} className="group block h-full">
      <div className="relative h-full flex flex-col justify-between bg-white dark:bg-bg-card border border-border-default rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">

        {/* Image with 16/10 uniform aspect ratio */}
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-bg-primary shrink-0">
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

          {/* Subtle Shimmer Light Reflection on Hover */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />

          {/* Top Bar Header Overlay (Actions: Share & Heart Button Overlay) */}
          <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5 pointer-events-auto">
            <motion.button
              type="button"
              whileTap={{ scale: 0.8 }}
              whileHover={{ scale: 1.12 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="w-8 h-8 rounded-full bg-white text-slate-900 shadow-md flex items-center justify-center cursor-pointer border border-slate-200/80 backdrop-blur-md active:scale-90"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                shareOnWhatsApp({ item: project, type: "project", source: "card" });
              }}
              title="Share project"
              aria-label="Share project"
            >
              <Share2 className="h-3.5 w-3.5 text-slate-900" />
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.8 }}
              whileHover={{ scale: 1.12 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="w-8 h-8 rounded-full bg-white text-slate-900 shadow-md flex items-center justify-center cursor-pointer border border-slate-200/80 backdrop-blur-md active:scale-90"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleFavorite(project.id);
              }}
              title={isSaved ? "Remove from saved" : "Save project"}
              aria-label={isSaved ? "Remove from saved" : "Save project"}
            >
              <Heart className={cn("h-3.5 w-3.5", isSaved ? "fill-red-500 text-red-500" : "text-slate-900")} />
            </motion.button>
          </div>

          {/* Status */}
          <div className="absolute bottom-3 left-3 z-10">
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold backdrop-blur-md border border-white/10 bg-slate-950/85 text-amber-400 shadow-sm`}>
              {STATUS_LABELS[project.constructionStatus]}
            </span>
          </div>

          {/* Builder logo */}
          {project.builderLogoUrl && (
            <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm rounded-lg px-2 py-1 shadow-md border border-slate-200/50 z-10">
              <img src={project.builderLogoUrl} alt={project.builderName} className="h-4 object-contain max-w-[64px]" />
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-4 flex-1 flex flex-col justify-between space-y-3">

          {/* Top Block: Title, Location, Configuration Pills, Specs */}
          <div className="space-y-2.5">
            {/* Title & Locality */}
            <div>
              <h3 className="font-bold text-text-primary text-base sm:text-lg leading-tight group-hover:text-amber-primary transition-colors line-clamp-1">
                {project.name}
              </h3>
              <div className="flex items-center gap-1.5 text-text-secondary text-xs sm:text-sm mt-1 truncate">
                <MapPin className="w-3.5 h-3.5 shrink-0 text-amber-primary" />
                <span className="truncate">{project.location.locality}, {project.location.city}</span>
              </div>
            </div>

            {/* Clean 1-Row Config Pills (Guaranteed uniform height across all cards) */}
            <div className="h-[28px] flex items-center gap-1.5 overflow-hidden">
              {configLabels.length > 0 ? (
                <>
                  {configLabels.slice(0, 2).map((label) => (
                    <span key={label} className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-bg-primary border border-border-default text-text-secondary whitespace-nowrap truncate max-w-[130px]">
                      {label}
                    </span>
                  ))}
                  {configLabels.length > 2 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 whitespace-nowrap shrink-0">
                      +{configLabels.length - 2} more
                    </span>
                  )}
                </>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-bg-primary border border-border-default text-text-tertiary">
                  {TC.label} Project
                </span>
              )}
            </div>

            {/* Area Row */}
            <div className="h-[20px] flex items-center gap-1.5 text-xs text-text-secondary">
              {builtUpRange ? (
                <>
                  <Ruler className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="truncate">{builtUpRange}</span>
                </>
              ) : plotSizeRange ? (
                <>
                  <SquareDashed className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="truncate">{plotSizeRange}</span>
                </>
              ) : totalLabel ? (
                <>
                  <Trees className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="truncate">{totalLabel}</span>
                </>
              ) : (
                <span className="text-text-tertiary text-[11px]">Premium Specifications</span>
              )}
            </div>
          </div>

          {/* Locked Bottom Price & Developer Row */}
          <div className="mt-auto pt-3 border-t border-border-default">
            <div className="flex items-end justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[10px] text-text-tertiary uppercase tracking-wider font-bold">
                    {isVenture ? "Starting Price" : "Price Range"}
                  </p>
                  <span className="text-[9px] font-mono font-black px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    {getRefId(project)}
                  </span>
                </div>
                <p className="font-black text-slate-900 dark:text-white text-xs sm:text-sm leading-tight truncate">
                  {priceLabel}
                </p>
                {pricePerUnit && (
                  <p className="text-[10px] text-text-secondary font-medium truncate">{pricePerUnit}</p>
                )}
              </div>
              <div className="text-right shrink-0 max-w-[130px]">
                <p className="text-[10px] text-text-tertiary uppercase tracking-wider font-bold">By</p>
                <p className="text-xs sm:text-sm font-bold text-text-primary truncate">{project.builderName}</p>
                {totalLabel && !isVenture && (
                  <p className="text-[10px] text-text-tertiary truncate">{totalLabel}</p>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </Link>
  );
}
