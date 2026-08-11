"use client";

import { MapPin, Building2, Home, Landmark, CheckCircle2, Navigation, ArrowRight, Ruler, SquareDashed, Trees } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import type { Project, ProjectType } from "@/types/project";

// ─── Constants ──────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<ProjectType, { icon: React.ElementType; label: string; cardAccent: string; badgeClass: string }> = {
  apartment: {
    icon: Building2,
    label: "Apartment",
    cardAccent: "from-amber-500/5 to-transparent",
    badgeClass: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  },
  villa: {
    icon: Home,
    label: "Villa",
    cardAccent: "from-amber-500/5 to-transparent",
    badgeClass: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  },
  venture: {
    icon: Landmark,
    label: "Venture",
    cardAccent: "from-amber-500/5 to-transparent",
    badgeClass: "bg-amber-500/10 text-amber-600 border-amber-500/20",
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
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000)   return `₹${(amount / 100000).toFixed(1)} L`;
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
        className="w-[220px] h-[220px] rounded-2xl relative overflow-hidden group cursor-pointer border border-border-default shadow-sm shrink-0"
      >
        {project.coverImage ? (
          <img src={project.coverImage} alt={project.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
        ) : (
          <div className={`w-full h-full flex flex-col items-center justify-center bg-gradient-to-br ${TC.cardAccent} bg-bg-primary gap-3`}>
            <Icon className="w-14 h-14 text-text-tertiary/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute top-3 right-3 z-10">
          <span className="bg-slate-900/80 backdrop-blur-md border border-white/20 text-white font-bold text-xs px-2.5 py-1 rounded-full shadow-sm">
            {priceLabel}
          </span>
        </div>
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <h3 className="font-bold text-lg leading-tight line-clamp-1 group-hover:text-amber-primary transition-colors">{project.name}</h3>
          <p className="text-xs text-white/80 flex items-center gap-1 mt-1 truncate">
            <MapPin className="w-3 h-3 shrink-0" /> {project.location.locality}
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <Link href={`/projects/${project.slug}`} className="group block">
      <div className="relative bg-white dark:bg-bg-card border border-border-default rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300">

        {/* Image */}
        <div className="relative aspect-[16/9] overflow-hidden bg-bg-primary">
          {project.coverImage ? (
            <img
              src={project.coverImage}
              alt={project.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className={`w-full h-full flex flex-col items-center justify-center bg-gradient-to-br ${TC.cardAccent} bg-bg-primary gap-3`}>
              <Icon className="w-14 h-14 text-text-tertiary/30" />
              <span className="text-xs text-text-tertiary font-medium">{TC.label} Project</span>
            </div>
          )}

          {/* Type + RERA badges */}
          <div className="absolute top-3 left-3 flex items-center gap-2 flex-wrap">
            <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border backdrop-blur-sm ${TC.badgeClass}`}>
              <Icon className="w-3 h-3" />
              {TC.label}
            </span>
            {project.reraApproved && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/90 text-white backdrop-blur-sm">
                <CheckCircle2 className="w-3 h-3" /> RERA
              </span>
            )}
            {project.noBrokerage && (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-900/80 text-white backdrop-blur-sm">
                0% Brokerage
              </span>
            )}
          </div>

          {/* Status */}
          <div className="absolute bottom-3 left-3">
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${STATUS_COLORS[project.constructionStatus]}`}>
              {STATUS_LABELS[project.constructionStatus]}
            </span>
          </div>

          {/* Builder logo */}
          {project.builderLogoUrl && (
            <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm rounded-lg px-2 py-1 shadow">
              <img src={project.builderLogoUrl} alt={project.builderName} className="h-5 object-contain max-w-[72px]" />
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">

          {/* Name + Location */}
          <div>
            <h3 className="font-bold text-text-primary text-lg leading-tight group-hover:text-amber-primary transition-colors line-clamp-1">
              {project.name}
            </h3>
            <div className="flex items-center gap-1 text-text-secondary text-sm mt-0.5">
              <MapPin className="w-3.5 h-3.5 shrink-0 text-amber-primary" />
              <span className="truncate">{project.location.locality}, {project.location.city}</span>
            </div>
          </div>

          {/* TYPE-ADAPTIVE config pills */}
          {isVenture ? (
            /* Venture: show plot types */
            <div className="space-y-1.5">
              {plotSizeRange && (
                <div className="flex items-center gap-2 text-xs text-text-secondary">
                  <SquareDashed className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>Plot sizes: <span className="font-semibold text-text-primary">{plotSizeRange}</span></span>
                </div>
              )}
              {totalLabel && (
                <div className="flex items-center gap-2 text-xs text-text-secondary">
                  <Trees className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>{totalLabel}</span>
                </div>
              )}
              {configLabels.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {configLabels.slice(0, 3).map((label) => (
                    <span key={label} className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/5 border border-amber-500/20 text-amber-700 dark:text-amber-400">
                      {label}
                    </span>
                  ))}
                  {configLabels.length > 3 && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-bg-primary border border-border-default text-text-tertiary">
                      +{configLabels.length - 3} more
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Apartment / Villa: show BHK tags + area */
            <div className="space-y-2">
              {configLabels.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {configLabels.slice(0, 4).map((label) => (
                    <span key={label} className="px-2.5 py-1 rounded-full text-xs font-medium bg-bg-primary border border-border-default text-text-secondary">
                      {label}
                    </span>
                  ))}
                  {configLabels.length > 4 && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-bg-primary border border-border-default text-text-tertiary">
                      +{configLabels.length - 4} more
                    </span>
                  )}
                </div>
              )}
              {builtUpRange && (
                <div className="flex items-center gap-2 text-xs text-text-secondary">
                  <Ruler className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{builtUpRange}</span>
                </div>
              )}
            </div>
          )}

          {/* Price row */}
          <div className="pt-2 border-t border-border-default">
            <div className="flex items-end justify-between gap-2">
              <div>
                <p className="text-[10px] text-text-tertiary uppercase tracking-wide font-medium">
                  {isVenture ? "Starting Price" : "Price Range"}
                </p>
                <p className="font-bold text-amber-primary text-base leading-tight">{priceLabel}</p>
                {pricePerUnit && (
                  <p className="text-[11px] text-text-secondary font-medium mt-0.5">{pricePerUnit}</p>
                )}
              </div>
              <div className="text-right shrink-0 max-w-[120px]">
                <p className="text-[10px] text-text-tertiary uppercase tracking-wide">By</p>
                <p className="text-sm font-semibold text-text-primary truncate">{project.builderName}</p>
                {totalLabel && !isVenture && (
                  <p className="text-[10px] text-text-tertiary">{totalLabel}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
