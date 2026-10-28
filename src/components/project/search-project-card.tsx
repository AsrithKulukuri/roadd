"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Building2, CalendarDays, ChevronLeft, ChevronRight, Heart, Home, ImageIcon, Key, Landmark, MapPin, Maximize2, Ruler, IndianRupee, Share2, ShieldCheck } from "lucide-react";
import type { Project, ProjectConfig } from "@/types/project";
import { cn, formatPriceCompact, formatAvailableBhk } from "@/lib/utils";
import { isCrdaVerified } from "@/lib/listing-quality";
import { useFavoritesStore } from "@/stores/favorites-store";
import { shareOnWhatsApp } from "@/lib/whatsapp/whatsapp-share";
import { NotifyMeModal } from "@/components/shared/notify-me-modal";
import { seedProjectCache, prewarmProjectMedia } from "@/lib/project-preload";
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

function getTitleAutoFitClass(name: string | null | undefined): string {
  if (!name) return "text-[16px] sm:text-[17.5px]";
  const len = name.length;
  if (len <= 10) return "text-[16px] sm:text-[17.5px]";
  if (len <= 14) return "text-[14.5px] sm:text-[15.5px]";
  if (len <= 18) return "text-[13px] sm:text-[14px]";
  if (len <= 24) return "text-[12px] sm:text-[12.5px]";
  return "text-[11px] sm:text-[11.5px]";
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

/** Search-only presentation: every configuration count uses the same reserved space. */
export function SearchProjectCard({ project }: { project: Project }) {
  const router = useRouter();
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

  // 6-Cell Matrix Calculations
  const rawTotalArea = project.totalArea || (project.location as any)?.totalArea || "On request";
  const totalAreaVal = typeof rawTotalArea === "string" ? rawTotalArea.replace(/[`'"]/g, "").trim() : rawTotalArea;
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
  const hasAreaRange = minArea !== null && maxArea !== null;
  const areaNumberStr = hasAreaRange
    ? (minArea === maxArea ? `${minArea.toLocaleString("en-IN")}` : `${minArea.toLocaleString("en-IN")}–${maxArea.toLocaleString("en-IN")}`)
    : "On request";

  const allPrices = configurations.flatMap(c => [c.priceMin, c.priceMax]).filter(Boolean);
  const minPrice = allPrices.length ? Math.min(...allPrices) : null;
  const maxPrice = allPrices.length ? Math.max(...allPrices) : null;
  const isPriceRange = minPrice !== null && maxPrice !== null && minPrice !== maxPrice;
  const minPriceStr = minPrice !== null ? formatPriceCompact(minPrice) : null;
  const maxPriceStr = maxPrice !== null ? formatPriceCompact(maxPrice) : null;
  const priceRangeVal = (minPrice !== null && maxPrice !== null)
    ? (minPrice === maxPrice ? minPriceStr : `${minPriceStr} – ${maxPriceStr}`)
    : "Price on request";

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button, a")) return;
    seedProjectCache(project);
    router.push(url);
  };

  return <article
    className={cn(styles.card, "cursor-pointer select-none")}
    onClick={handleCardClick}
    onMouseEnter={() => prewarmProjectMedia(project)}
    onPointerDown={() => seedProjectCache(project)}
    data-testid="search-project-card"
    aria-label={project.name}
  >
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
        <div className={styles.titleRow}>
          <h3 className={getTitleAutoFitClass(project.name)}>
            <Link href={url} title={project.name}>{project.name}</Link>
          </h3>
          {approval && (
            <span className={styles.approval}>
              <ShieldCheck size={12} className="text-[#faad13] shrink-0" />
              <span>{approval}</span>
            </span>
          )}
        </div>
        <p className={styles.location}>
          <MapPin size={15} className="text-[#faad13] shrink-0 mt-0.5" />
          <span title={location}>{location}</span>
        </p>
      </div>

      {/* 6-Cell Specification Matrix (All white boxes, black text & borders, logo colour icons) */}
      <div className="rounded-xl border-2 border-black bg-white overflow-hidden divide-y-2 divide-black text-center shadow-xs">
        {/* Row 1: Total Project | Total Units | Available */}
        <div className="grid grid-cols-3 divide-x-2 divide-black bg-white">
          {/* Cell 1: Total Project */}
          <div className="px-1.5 py-2 sm:px-2 sm:py-2.5 flex flex-col justify-center items-center min-w-0 bg-white">
            <span className="text-[9px] sm:text-[9.5px] font-bold text-black uppercase tracking-tight leading-tight text-center">
              Total Project
            </span>
            <span className={cn("font-black text-black leading-tight mt-0.5 truncate w-full text-center", getAutoFitClass(totalAreaVal))}>
              {totalAreaVal}
            </span>
          </div>

          {/* Cell 2: Total Units */}
          <div className="px-1.5 py-2 sm:px-2 sm:py-2.5 flex flex-col justify-center items-center min-w-0 bg-white">
            <span className="text-[9px] sm:text-[9.5px] font-bold text-black uppercase tracking-tight leading-tight text-center">
              Total Units
            </span>
            <span className={cn("font-black text-black leading-tight mt-0.5 truncate w-full text-center", getAutoFitClass(totalUnitsVal))}>
              {totalUnitsVal}
            </span>
          </div>

          {/* Cell 3: Available (Auto-fitting text, no abrupt truncation) */}
          <div className="px-1.5 py-2 sm:px-2 sm:py-2.5 flex flex-col justify-center items-center min-w-0 bg-white">
            <span className="text-[9px] sm:text-[9.5px] font-bold text-black uppercase tracking-tight leading-tight text-center">
              Available
            </span>
            <span className={cn("font-black text-black leading-tight mt-0.5 text-center break-words w-full", getAutoFitClass(availableBhkVal))} title={availableBhkVal}>
              {availableBhkVal}
            </span>
          </div>
        </div>

        {/* Row 2: Area Range | Price Range | Possession */}
        <div className="grid grid-cols-3 divide-x-2 divide-black bg-white">
          {/* Cell 4: Area Range strictly in 2 lines */}
          <div className="px-1.5 py-2 sm:px-2 sm:py-2.5 flex flex-col justify-center items-center min-w-0 bg-white">
            <span className="text-[9px] sm:text-[9.5px] font-bold text-black uppercase tracking-tight leading-tight text-center">
              Area Range
            </span>
            <div className="flex flex-col items-center justify-center leading-tight mt-0.5">
              <span className={cn("font-black text-black whitespace-nowrap", getAutoFitClass(areaNumberStr, "text-[11px] sm:text-[12px]"))}>
                {areaNumberStr}
              </span>
              {hasAreaRange && (
                <span className="text-[9px] sm:text-[9.5px] font-bold text-black leading-none">
                  {areaUnit}
                </span>
              )}
            </div>
          </div>

          {/* Cell 5: Price Range (Dynamic Auto-Fit Font Size, Never Cuts) */}
          <div className="px-1.5 py-2 sm:px-2 sm:py-2.5 flex flex-col justify-center items-center min-w-0 bg-white">
            <span className="text-[9px] sm:text-[9.5px] font-bold text-black uppercase tracking-tight leading-tight text-center">
              Price Range
            </span>
            <div className="flex flex-col items-center justify-center leading-tight mt-0.5 w-full">
              {isPriceRange && minPriceStr && maxPriceStr ? (
                <div className="flex flex-col items-center justify-center leading-tight">
                  <span className={cn("font-black text-black whitespace-nowrap", getAutoFitClass(minPriceStr, "text-[10.5px] sm:text-[11.5px]"))}>
                    {minPriceStr} –
                  </span>
                  <span className={cn("font-black text-black whitespace-nowrap", getAutoFitClass(maxPriceStr, "text-[10.5px] sm:text-[11.5px]"))}>
                    {maxPriceStr}
                  </span>
                </div>
              ) : (
                <span className={cn("font-black text-black leading-tight text-center whitespace-nowrap", getAutoFitClass(priceRangeVal, "text-[11px] sm:text-[12px]"))}>
                  {priceRangeVal}
                </span>
              )}
            </div>
          </div>

          {/* Cell 6: Possession (Dynamic Auto-Fit, Never Cuts) */}
          {(() => {
            const parts = possession.trim().split(" ");
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
                    <span className={cn("font-black text-black leading-tight text-center break-words w-full", getAutoFitClass(possession, "text-[10.5px] sm:text-[11.5px]"))}>
                      {possession}
                    </span>
                  )}
                </div>
              </div>
            );
          })()}
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
