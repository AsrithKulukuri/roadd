"use client";

import { MapPin, Building2, Home, Landmark, CheckCircle2, Navigation, ArrowRight, Ruler, SquareDashed, Trees, Heart, Share2, Sparkles, Award, Tag, Shield, Image as ImageIcon, Maximize2, Building, Calendar, CalendarDays, Plus, Key, IndianRupee } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn, formatPriceCompact, formatAvailableBhk } from "@/lib/utils";
import type { Project, ProjectType } from "@/types/project";
import { useFavoritesStore } from "@/stores/favorites-store";
import { getRefId } from "@/lib/ref-id";
import { shareItem } from "@/lib/share-utils";
import { shareOnWhatsApp } from "@/lib/whatsapp/whatsapp-share";
import { WhatsAppIcon } from "@/components/property/whatsapp-share-button";
import { isCrdaVerified } from "@/lib/listing-quality";

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
    label: "CRDA Venture",
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

function getTitleAutoFitClass(name: string | null | undefined): string {
  if (!name) return "text-base sm:text-lg";
  const len = name.length;
  if (len <= 10) return "text-base sm:text-lg";
  if (len <= 14) return "text-[14.5px] sm:text-[16px]";
  if (len <= 18) return "text-[13px] sm:text-[14.5px]";
  if (len <= 24) return "text-[12px] sm:text-[13px]";
  return "text-[11px] sm:text-[12px]";
}

function getAutoFitClass(text: string | null | undefined, base: string = "text-[11px] sm:text-[12px]"): string {
  if (!text) return base;
  const len = text.length;
  if (len <= 7) return "text-[11.5px] sm:text-[12.5px]";
  if (len <= 10) return "text-[10.5px] sm:text-[11.5px]";
  if (len <= 14) return "text-[9.5px] sm:text-[10.5px]";
  if (len <= 18) return "text-[8.5px] sm:text-[9.5px] tracking-tight";
  return "text-[8px] sm:text-[8.5px] tracking-tighter";
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

  // Little glass boxes specifications
  const specItems: { label: string; icon?: React.ElementType; isMore?: boolean }[] = [];

  // Configs: show each added configuration as its own glass box (e.g. 2 BHK, 3 BHK, 4 BHK)
  const configIcon = isVilla ? Home : isVenture ? Landmark : Building2;
  if (configLabels.length > 0) {
    const maxVisibleConfigs = 3;
    const visibleConfigs = configLabels.slice(0, maxVisibleConfigs);
    for (const label of visibleConfigs) {
      specItems.push({
        label,
        icon: configIcon,
      });
    }
    if (configLabels.length > maxVisibleConfigs) {
      specItems.push({
        label: `+${configLabels.length - maxVisibleConfigs} more`,
        icon: Plus,
        isMore: true,
      });
    }
  } else {
    specItems.push({
      label: isVenture ? "Plots" : `${TC.label}`,
      icon: configIcon,
    });
  }

  // Notice: Total Units (e.g. "70 Units") is completely removed per user request:
  // "no need to that units use that whole just for showing configs like 2bhk 3bhk 4bkh like that added ones if configs more configs are there show + 1 more like that"

  // Area (Total Project Area e.g. "5.5 Acres", or built-up range, or plot size range)
  const projectArea = project.totalArea || (project.location as Record<string, unknown> | undefined)?.totalArea as string | undefined;
  if (projectArea && projectArea.trim()) {
    specItems.push({
      label: projectArea.trim(),
      icon: Maximize2,
    });
  } else if (builtUpRange) {
    specItems.push({
      label: builtUpRange,
      icon: Maximize2,
    });
  } else if (plotSizeRange) {
    specItems.push({
      label: plotSizeRange,
      icon: SquareDashed,
    });
  }

  // 5. Possession Date
  const rawPossession = project.possessionDate ||
    (project.location as Record<string, unknown> | undefined)?.possessionDate as string | undefined ||
    project.configurations?.find(c => c.possessionDate)?.possessionDate;
  if (rawPossession && rawPossession.trim()) {
    specItems.push({
      label: rawPossession.trim(),
      icon: Calendar,
    });
  }

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
            <div className="relative h-[112px] w-full overflow-hidden bg-slate-100 sm:h-[142px] md:h-[168px]">
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

              {/* Monochromatic White Badge & Sold Out */}
              <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
                {project.isRoadExclusive && (
                  <span className="px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-black bg-amber-500 text-slate-950 shadow-sm border border-amber-400">
                    ⭐ Exclusive
                  </span>
                )}
                {project.isSoldOut && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-600 text-white shadow-sm border border-rose-700 uppercase tracking-wider">
                    Sold Out
                  </span>
                )}
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
            <div className="flex min-h-[60px] flex-col justify-center p-2.5 sm:p-3">
              <h4 className="truncate text-[13px] font-extrabold text-slate-900 transition-colors dark:text-white sm:text-sm">
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
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10 flex items-center gap-1">
          {project.isSoldOut && (
            <span className="bg-rose-600 text-white shadow-md font-extrabold text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider border border-rose-700">
              Sold Out
            </span>
          )}
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
      <div className="relative h-full flex flex-col justify-between bg-white dark:bg-bg-card border border-border-default rounded-xl overflow-hidden shadow-sm hover:shadow-lg hover:border-amber-500/40 transition-[box-shadow,border-color] duration-200">

        {/* Image with 16/10 uniform aspect ratio */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
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
            if (project.isRoadExclusive) {
              badges.push(
                <span key="exclusive" className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-500 text-slate-950 shadow-sm border border-amber-300/60 backdrop-blur-md tracking-tight">
                  <Sparkles className="w-3 h-3 fill-slate-950 text-slate-950" /> Exclusive
                </span>
              );
            }
            if (isVenture && isCrdaVerified(project)) {
              badges.push(
                <span key="crda-verified" className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-600 text-white shadow-sm border border-emerald-300/60">
                  <Shield className="w-3 h-3" /> CRDA Verified
                </span>
              );
            } else if (isVenture) {
              badges.push(
                <span key="crda-pending" className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-slate-700 text-white shadow-sm border border-slate-500/60">
                  Verification in Progress
                </span>
              );
            }
            if (project.isSoldOut) {
              badges.push(
                <span key="soldout" className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-600 text-white shadow-md border border-rose-700 tracking-wide uppercase">
                  Sold Out
                </span>
              );
            }
            badges.push(
              <span key="type" className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-white/95 text-slate-900 shadow-sm border border-slate-200/80 backdrop-blur-md tracking-tight truncate max-w-[120px]">
                {TC.label}
              </span>
            );
            const visibleBadges = badges.slice(0, 2);

            return (
              <div className="absolute top-2.5 left-2.5 max-w-[calc(100%-74px)] flex items-center gap-1 overflow-hidden z-10">
                {visibleBadges}
              </div>
            );
          })()}

          {/* Top Right Action Buttons (Share & Save) */}
          <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1 pointer-events-auto">
            <button
              type="button"
              className="w-9 h-9 rounded-full bg-white/95 hover:bg-white text-slate-800 shadow-md flex items-center justify-center transition-colors cursor-pointer border border-slate-200/60 backdrop-blur-md"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                shareOnWhatsApp({ item: project, type: "project", source: "card" });
              }}
              title="Share project"
              aria-label="Share project"
            >
              <Share2 className="h-4 w-4 text-slate-800" />
            </button>
            <button
              type="button"
              className="w-9 h-9 rounded-full bg-white/95 hover:bg-white text-slate-800 shadow-md flex items-center justify-center transition-colors cursor-pointer border border-slate-200/60 backdrop-blur-md"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void toggleFavorite(project.id);
              }}
              title={isSaved ? "Remove from saved" : "Save project"}
              aria-label={isSaved ? "Remove from saved" : "Save project"}
            >
              <Heart className={cn("h-4 w-4 transition-colors", isSaved ? "fill-red-500 text-red-500" : "text-slate-800")} />
            </button>
          </div>

          {/* Subtle Bottom Gradient for Status/Media readability (no dark overlay on top/middle) */}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

          {/* Bottom Left Status */}
          <div className="absolute bottom-2.5 left-2.5 z-10">
            <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold backdrop-blur-md border border-[#faad13] bg-slate-950 text-white shadow-sm">
              {STATUS_LABELS[project.constructionStatus] || "Under Construction"}
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
        <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between gap-3">

          <div className="space-y-2.5">
            {/* Title & Locality */}
            <div>
              <h3 className={cn("font-bold text-text-primary leading-snug group-hover:text-amber-primary transition-colors line-clamp-2", getTitleAutoFitClass(project.name))}>
                {project.name}
              </h3>
              <div className="flex items-start gap-1.5 text-text-secondary text-xs mt-1">
                <MapPin className="w-3.5 h-3.5 shrink-0 text-amber-primary mt-0.5" />
                <span className="line-clamp-1 leading-relaxed font-medium">
                  {project.location?.locality
                    ? `${project.location.locality}, ${project.location.city}`
                    : (project.location?.address || project.location?.city || "")}
                </span>
              </div>
            </div>

            {/* 6-Cell Specification Matrix (All white boxes, black text & borders, logo colour icons) */}
            <div className="rounded-xl border-2 border-black bg-white overflow-hidden divide-y-2 divide-black text-center shadow-xs">
              {/* Row 1: Total Project | Total Units | Available */}
              <div className="grid grid-cols-3 divide-x-2 divide-black bg-white">
                {/* Cell 1: Total Project */}
                <div className="px-1.5 py-2 sm:px-2 sm:py-2.5 flex flex-col justify-center items-center min-w-0 bg-white">
                  <span className="text-[12px] sm:text-[13px] font-black text-black leading-tight truncate w-full text-center">
                    {projectArea || "On Request"}
                  </span>
                  <span className="text-[9px] sm:text-[9.5px] font-bold text-black uppercase tracking-tight leading-tight mt-0.5 text-center">
                    Total Project
                  </span>
                </div>

                {/* Cell 2: Total Units */}
                <div className="px-1.5 py-2 sm:px-2 sm:py-2.5 flex flex-col justify-center items-center min-w-0 bg-white">
                  <span className="text-[12px] sm:text-[13px] font-black text-black leading-tight truncate w-full text-center">
                    {project.totalUnits
                      ? `${project.totalUnits} ${isVilla ? "Villas" : isVenture ? "Plots" : "Units"}`
                      : isVenture ? "Plots" : "On Request"}
                  </span>
                  <span className="text-[9px] sm:text-[9.5px] font-bold text-black uppercase tracking-tight leading-tight mt-0.5 text-center">
                    Total Units
                  </span>
                </div>

                {/* Cell 3: Available */}
                <div className="px-1.5 py-2 sm:px-2 sm:py-2.5 flex flex-col justify-center items-center min-w-0 bg-white">
                  <span className="text-[9px] sm:text-[9.5px] font-bold text-black uppercase tracking-tight leading-tight text-center">
                    Available
                  </span>
                  <span className="text-[11px] sm:text-[12px] font-black text-black leading-tight mt-0.5 text-center break-words w-full" title={configLabels.length > 0 ? (formatAvailableBhk(configLabels) || (isVenture ? "Plots" : TC.label)) : isVenture ? "Plots" : TC.label}>
                    {configLabels.length > 0 ? (formatAvailableBhk(configLabels) || (isVenture ? "Plots" : TC.label)) : isVenture ? "Plots" : TC.label}
                  </span>
                </div>
              </div>

              {/* Row 2: Area Range | Price Range | Possession */}
              <div className="grid grid-cols-3 divide-x-2 divide-black bg-white">
                {/* Cell 4: Area Range strictly in 2 lines */}
                {(() => {
                  const rawArea = (isApartment || isVilla) ? (builtUpRange || "On Request") : (plotSizeRange || "On Request");
                  const parts = rawArea.trim().split(" ");
                  const numStr = parts.length > 1 ? parts.slice(0, -1).join(" ") : parts[0];
                  const unitStr = parts.length > 1 ? parts[parts.length - 1] : "";
                  return (
                    <div className="px-1.5 py-2 sm:px-2 sm:py-2.5 flex flex-col justify-center items-center min-w-0 bg-white">
                      <span className="text-[9px] sm:text-[9.5px] font-bold text-black uppercase tracking-tight leading-tight text-center">
                        Area Range
                      </span>
                      <div className="flex flex-col items-center justify-center leading-tight mt-0.5">
                        <span className="text-[11px] sm:text-[12px] font-black text-black whitespace-nowrap">
                          {numStr}
                        </span>
                        {unitStr && (
                          <span className="text-[9px] sm:text-[9.5px] font-bold text-black leading-none">
                            {unitStr}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Cell 5: Price Range (Dynamic Auto-Fit, Never Cuts) */}
                {(() => {
                  const priceParts = priceLabel ? priceLabel.split(" – ") : [];
                  const isRange = priceParts.length === 2 && priceParts[0] && priceParts[1];
                  return (
                    <div className="px-1.5 py-2 sm:px-2 sm:py-2.5 flex flex-col justify-center items-center min-w-0 bg-white">
                      <span className="text-[9px] sm:text-[9.5px] font-bold text-black uppercase tracking-tight leading-tight text-center">
                        Price Range
                      </span>
                      <div className="flex flex-col items-center justify-center leading-tight mt-0.5 w-full">
                        {isRange ? (
                          <div className="flex flex-col items-center justify-center leading-tight">
                            <span className={cn("font-black text-black whitespace-nowrap", getAutoFitClass(priceParts[0], "text-[10.5px] sm:text-[11.5px]"))}>
                              {priceParts[0]} –
                            </span>
                            <span className={cn("font-black text-black whitespace-nowrap", getAutoFitClass(priceParts[1], "text-[10.5px] sm:text-[11.5px]"))}>
                              {priceParts[1]}
                            </span>
                          </div>
                        ) : (
                          <span className={cn("font-black text-black leading-tight text-center whitespace-nowrap", getAutoFitClass(priceLabel, "text-[11px] sm:text-[12px]"))}>
                            {priceLabel}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Cell 6: Possession (Dynamic Auto-Fit, Never Cuts) */}
                {(() => {
                  const possVal = rawPossession?.trim() || (project.constructionStatus === "ready-to-move" ? "Ready" : "On Request");
                  const parts = possVal.split(" ");
                  const isTwoPart = parts.length === 2 && parts[0] && parts[1];
                  return (
                    <div className="px-1.5 py-2 sm:px-2 sm:py-2.5 flex flex-col justify-center items-center min-w-0 bg-white">
                      <span className="text-[9px] sm:text-[9.5px] font-bold text-black uppercase tracking-tight leading-tight text-center">
                        Possession
                      </span>
                      <div className="flex flex-col items-center justify-center leading-tight mt-0.5 w-full">
                        {isTwoPart ? (
                          <div className="flex flex-col items-center justify-center leading-tight">
                            <span className={cn("font-black text-black whitespace-nowrap", getAutoFitClass(parts[0], "text-[10.5px] sm:text-[11.5px]"))}>
                              {parts[0]}
                            </span>
                            <span className={cn("font-black text-black whitespace-nowrap", getAutoFitClass(parts[1], "text-[10px] sm:text-[11px]"))}>
                              {parts[1]}
                            </span>
                          </div>
                        ) : (
                          <span className={cn("font-black text-black leading-tight text-center break-words w-full", getAutoFitClass(possVal, "text-[10.5px] sm:text-[11.5px]"))}>
                            {possVal}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

        </div>
      </div>
    </Link>
  );
}
