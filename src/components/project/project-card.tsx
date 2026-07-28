"use client";

import Link from "next/link";
import { Building2, Home, Landmark, MapPin, CheckCircle2 } from "lucide-react";
import type { Project, ProjectType } from "@/types/project";

const TYPE_CONFIG: Record<ProjectType, { icon: React.ElementType; label: string; color: string }> = {
  apartment: { icon: Building2, label: "Apartment", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  villa:     { icon: Home,      label: "Villa",     color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  venture:   { icon: Landmark,  label: "Venture",   color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
};

const STATUS_COLORS = {
  "under-construction": "bg-orange-500/10 text-orange-600",
  "ready-to-move":      "bg-green-500/10 text-green-600",
  "new-launch":         "bg-blue-500/10 text-blue-600",
};

const STATUS_LABELS = {
  "under-construction": "Under Construction",
  "ready-to-move":      "Ready to Move",
  "new-launch":         "New Launch",
};

function formatINRCrore(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000)   return `₹${(amount / 100000).toFixed(2)} L`;
  return `₹${amount.toLocaleString("en-IN")}`;
}

interface ProjectCardProps {
  project: Project;
  index?: number;
}

export function ProjectCard({ project, index = 0 }: ProjectCardProps) {
  const TC = TYPE_CONFIG[project.projectType];
  const Icon = TC.icon;

  const allPrices = project.configurations.flatMap((c) => [c.priceMin, c.priceMax]).filter(Boolean);
  const minPrice = allPrices.length ? Math.min(...allPrices) : 0;
  const maxPrice = allPrices.length ? Math.max(...allPrices) : 0;
  const priceLabel = !allPrices.length
    ? "Price on request"
    : minPrice === maxPrice
    ? formatINRCrore(minPrice)
    : `${formatINRCrore(minPrice)} – ${formatINRCrore(maxPrice)}`;

  // Unique BHK labels
  const configLabels = [...new Set(project.configurations.map((c) => c.label))];

  return (
    <Link href={`/projects/${project.slug}`} className="group block">
      <div className="bg-white dark:bg-bg-card border border-border-default rounded-3xl overflow-hidden shadow-sm hover:shadow-elevated hover:-translate-y-1 transition-all duration-300">
        {/* Image */}
        <div className="relative aspect-[16/9] overflow-hidden bg-bg-primary">
          {project.coverImage ? (
            <img
              src={project.coverImage}
              alt={project.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-primary/10 to-amber-primary/5">
              <Icon className="w-12 h-12 text-amber-primary/40" />
            </div>
          )}

          {/* Top badges */}
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border backdrop-blur-sm ${TC.color}`}>
              <Icon className="w-3 h-3 inline mr-1" />
              {TC.label}
            </span>
            {project.reraApproved && (
              <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-500/90 text-white backdrop-blur-sm flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> RERA
              </span>
            )}
          </div>

          {/* Status pill */}
          <div className="absolute bottom-3 left-3">
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${STATUS_COLORS[project.constructionStatus]}`}>
              {STATUS_LABELS[project.constructionStatus]}
            </span>
          </div>

          {/* Builder logo */}
          {project.builderLogoUrl && (
            <div className="absolute bottom-3 right-3 bg-white rounded-lg px-2 py-1 shadow">
              <img src={project.builderLogoUrl} alt={project.builderName} className="h-5 object-contain max-w-[70px]" />
            </div>
          )}
        </div>

        {/* Card Body */}
        <div className="p-4 space-y-3">
          {/* Name + Location */}
          <div>
            <h3 className="font-bold text-text-primary text-lg leading-tight group-hover:text-amber-primary transition-colors">
              {project.name}
            </h3>
            <div className="flex items-center gap-1 text-text-secondary text-sm mt-0.5">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              {project.location.locality}, {project.location.city}
            </div>
          </div>

          {/* BHK config tags */}
          {configLabels.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {configLabels.slice(0, 4).map((label) => (
                <span key={label} className="px-2.5 py-1 rounded-full text-xs font-medium bg-bg-primary border border-border-default text-text-secondary">
                  {label}
                </span>
              ))}
              {configLabels.length > 4 && (
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-bg-primary border border-border-default text-text-secondary">
                  +{configLabels.length - 4} more
                </span>
              )}
            </div>
          )}

          {/* Price + Builder divider */}
          <div className="pt-2 border-t border-border-default flex items-end justify-between">
            <div>
              <p className="text-xs text-text-tertiary uppercase tracking-wide">Price Range</p>
              <p className="font-bold text-amber-primary text-base">{priceLabel}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-text-tertiary">By</p>
              <p className="text-sm font-semibold text-text-primary truncate max-w-[120px]">{project.builderName}</p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
