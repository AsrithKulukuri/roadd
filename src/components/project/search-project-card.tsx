"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Bell, Building2, CalendarDays, ChevronLeft, ChevronRight, Heart, Home, ImageIcon, Landmark, MapPin, Maximize2, Share2, ShieldCheck } from "lucide-react";
import type { Project, ProjectConfig } from "@/types/project";
import { formatPriceCompact, formatAvailableBhk } from "@/lib/utils";
import { isCrdaVerified } from "@/lib/listing-quality";
import { useFavoritesStore } from "@/stores/favorites-store";
import { shareOnWhatsApp } from "@/lib/whatsapp/whatsapp-share";
import { NotifyMeModal } from "@/components/shared/notify-me-modal";
import styles from "./search-project-card.module.css";

function configDetails(config: ProjectConfig, plots: boolean) {
  const area = plots ? config.plotSizeMin : config.superBuiltUpAreaMin || config.builtUpAreaMin || config.plinthAreaMin || config.plotSizeMin;
  const max = plots ? config.plotSizeMax : config.superBuiltUpAreaMin ? config.superBuiltUpAreaMax : config.builtUpAreaMin ? config.builtUpAreaMax : config.plinthAreaMin ? config.plinthAreaMax : config.plotSizeMax;
  const plotArea = plots || !(config.superBuiltUpAreaMin || config.builtUpAreaMin || config.plinthAreaMin);
  const unit = plotArea ? "sq.yd" : "sq.ft";
  const areaLabel = plotArea ? "Plot area" : config.superBuiltUpAreaMin ? "Super built-up area" : config.builtUpAreaMin ? "Built-up area" : "Plinth area";
  const areaText = area ? area.toLocaleString("en-IN") + (max && max !== area ? "–" + max.toLocaleString("en-IN") : "") + " " + unit : "Area on request";
  return { areaText, areaLabel, rate: config.pricePerUnit ? "₹" + config.pricePerUnit.toLocaleString("en-IN") + "/" + (plots ? "sq.yd" : "sq.ft") : null };
}

/** Search-only presentation: every configuration count uses the same reserved space. */
export function SearchProjectCard({ project }: { project: Project }) {
  const track = useRef<HTMLDivElement>(null);
  const [showNotifyMe, setShowNotifyMe] = useState(false);
  const { isFavorite, toggleFavorite } = useFavoritesStore();
  const saved = isFavorite(project.id);
  const plots = project.projectType === "venture";
  const villa = project.projectType === "villa";
  const kind = plots ? "Plot / Layout" : villa ? "Villa" : "Apartment";
  const TypeIcon = plots ? Landmark : villa ? Home : Building2;
  const configurations = project.configurations || [];
  const single = configurations.length === 1;
  const image = project.coverImage || project.images?.[0]?.url;
  const url = "/projects/" + (project.slug || project.id);
  const location = [project.location?.locality, project.location?.city].filter(Boolean).join(", ") || project.location?.address || "Location on request";
  const possession = project.possessionDate || configurations.find(c => c.possessionDate)?.possessionDate || "On request";
  const status = project.isSoldOut ? "Sold out" : project.constructionStatus === "ready-to-move" ? (plots ? "Ready to build" : "Ready to move") : project.constructionStatus === "new-launch" ? "New launch" : plots ? "Development in progress" : "Under construction";
  const approval = plots && isCrdaVerified(project) ? "CRDA Verified" : project.reraApproved ? "RERA Approved" : null;

  // 6-Cell Matrix Calculations (Client Specification — Diagram 1)
  const totalAreaVal = project.totalArea || (project.location as any)?.totalArea || "On request";
  const totalUnitsVal = project.totalUnits
    ? `${project.totalUnits.toLocaleString("en-IN")} ${plots ? "plots" : villa ? "villas" : "units"}`
    : plots ? "Plots" : "On request";
  const formattedBhk = formatAvailableBhk(configurations.map(c => c.label));
  const availableBhkVal = formattedBhk || (plots ? "Plots" : kind);

  const allAreas = configurations.flatMap(c => plots 
    ? [c.plotSizeMin, c.plotSizeMax] 
    : [c.superBuiltUpAreaMin, c.superBuiltUpAreaMax, c.builtUpAreaMin, c.builtUpAreaMax, c.plinthAreaMin, c.plinthAreaMax]
  ).filter(Boolean) as number[];
  const minArea = allAreas.length ? Math.min(...allAreas) : null;
  const maxArea = allAreas.length ? Math.max(...allAreas) : null;
  const areaUnit = plots ? "sq.yd" : "sq.ft";
  const areaRangeVal = (minArea !== null && maxArea !== null)
    ? (minArea === maxArea ? `${minArea.toLocaleString("en-IN")} ${areaUnit}` : `${minArea.toLocaleString("en-IN")}–${maxArea.toLocaleString("en-IN")} ${areaUnit}`)
    : "On request";

  const allPrices = configurations.flatMap(c => [c.priceMin, c.priceMax]).filter(Boolean);
  const minPrice = allPrices.length ? Math.min(...allPrices) : null;
  const maxPrice = allPrices.length ? Math.max(...allPrices) : null;
  const priceRangeVal = (minPrice !== null && maxPrice !== null)
    ? (minPrice === maxPrice ? formatPriceCompact(minPrice) : `${formatPriceCompact(minPrice)} – ${formatPriceCompact(maxPrice)}`)
    : "Price on request";

  return <article className={styles.card} data-testid="search-project-card" aria-label={project.name}>
    <div className={styles.media}>
      <Link href={url} className={styles.imageLink} aria-label={"View " + project.name}>
        {image ? <img src={image} alt={project.name} loading="lazy" className={styles.image} /> : <div className={styles.placeholder}><TypeIcon size={56} /><span>{kind} project</span></div>}
      </Link>
      <span className={styles.type}>{kind}</span>
      <div className={styles.actions}>
        <button type="button" aria-label={"Get launch or price drop alerts for " + project.name} title="Notify me on launch / price drops" onClick={() => setShowNotifyMe(true)}><Bell size={16} /></button>
        <button type="button" aria-label={"Share " + project.name} onClick={() => shareOnWhatsApp({ item: project, type: "project", source: "card" })}><Share2 size={16} /></button>
        <button type="button" aria-label={(saved ? "Unsave " : "Save ") + project.name} aria-pressed={saved} onClick={() => void toggleFavorite(project.id)}><Heart size={18} fill={saved ? "currentColor" : "none"} className={saved ? styles.saved : undefined} /></button>
      </div>
      <span className={styles.status}>{status}</span>
      {!!project.images?.length && <span className={styles.photoCount}><ImageIcon size={14} />{project.images.length}</span>}
    </div>
    <div className={styles.body}>
      <div className={styles.identity}>
        <div className={styles.titleRow}><h3><Link href={url}>{project.name}</Link></h3>{approval && <span className={styles.approval}><ShieldCheck size={14} />{approval}</span>}</div>
        <p className={styles.location}><MapPin size={16} /><span title={location}>{location}</span></p>
      </div>

      {/* 6-Cell Specification Matrix (Client Specification — Diagram 1) */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 overflow-hidden divide-y divide-slate-200 dark:divide-slate-800 text-center shadow-2xs">
        {/* Row 1: Total Project | Total Units | Available */}
        <div className="grid grid-cols-3 divide-x divide-slate-200 dark:divide-slate-800">
          {/* Cell 1: 12 Acres / Total project */}
          <div className="px-1.5 py-2 sm:px-2 sm:py-2.5 flex flex-col justify-center min-w-0">
            <span className="text-[12px] sm:text-[13px] font-black text-slate-900 dark:text-white leading-tight">
              {totalAreaVal}
            </span>
            <span className="text-[9.5px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
              Total Project
            </span>
          </div>

          {/* Cell 2: 70 units / Total Units */}
          <div className="px-1.5 py-2 sm:px-2 sm:py-2.5 flex flex-col justify-center min-w-0">
            <span className="text-[12px] sm:text-[13px] font-black text-slate-900 dark:text-white leading-tight">
              {totalUnitsVal}
            </span>
            <span className="text-[9.5px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
              Total Units
            </span>
          </div>

          {/* Cell 3: Available / 3 BHK */}
          <div className="px-1.5 py-2 sm:px-2 sm:py-2.5 flex flex-col justify-center min-w-0 bg-amber-500/5 dark:bg-amber-400/5">
            <span className="text-[9.5px] sm:text-[10px] font-bold text-amber-700 dark:text-amber-400 leading-tight">
              Available
            </span>
            <span className="text-[12px] sm:text-[13px] font-black text-slate-900 dark:text-white leading-tight mt-0.5 truncate" title={availableBhkVal}>
              {availableBhkVal}
            </span>
          </div>
        </div>

        {/* Row 2: Area Range | Price Range | Possession */}
        <div className="grid grid-cols-3 divide-x divide-slate-200 dark:divide-slate-800">
          {/* Cell 4: Area Range / 2000 Sqft */}
          <div className="px-1.5 py-2 sm:px-2 sm:py-2.5 flex flex-col justify-center min-w-0">
            <span className="text-[9.5px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-tight">
              Area Range
            </span>
            <span className="text-[11.5px] sm:text-[12.5px] font-black text-slate-900 dark:text-white leading-tight mt-0.5">
              {areaRangeVal}
            </span>
          </div>

          {/* Cell 5: Price Range / 1 cr to 2 cr */}
          <div className="px-1.5 py-2 sm:px-2 sm:py-2.5 flex flex-col justify-center min-w-0 bg-emerald-500/5 dark:bg-emerald-400/5">
            <span className="text-[9.5px] sm:text-[10px] font-bold text-emerald-700 dark:text-emerald-400 leading-tight">
              Price Range
            </span>
            <span className="text-[11.5px] sm:text-[12.5px] font-black text-emerald-700 dark:text-emerald-300 leading-tight mt-0.5">
              {priceRangeVal}
            </span>
          </div>

          {/* Cell 6: Possession / March */}
          <div className="px-1.5 py-2 sm:px-2 sm:py-2.5 flex flex-col justify-center min-w-0">
            <span className="text-[9.5px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-tight">
              Possession
            </span>
            <span className="text-[11.5px] sm:text-[12.5px] font-black text-slate-900 dark:text-white leading-tight mt-0.5">
              {possession}
            </span>
          </div>
        </div>
      </div>
      <NotifyMeModal
        isOpen={showNotifyMe}
        onClose={() => setShowNotifyMe(false)}
        projectName={project.name}
        projectId={project.id}
        location={location}
      />
    </div>
  </article>;
}
