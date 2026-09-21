"use client";

import { useRef } from "react";
import Link from "next/link";
import { Building2, CalendarDays, ChevronLeft, ChevronRight, Heart, Home, ImageIcon, Landmark, MapPin, Maximize2, Share2, ShieldCheck } from "lucide-react";
import type { Project, ProjectConfig } from "@/types/project";
import { formatPriceCompact } from "@/lib/utils";
import { isCrdaVerified } from "@/lib/listing-quality";
import { useFavoritesStore } from "@/stores/favorites-store";
import { shareOnWhatsApp } from "@/lib/whatsapp/whatsapp-share";
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

  return <article className={styles.card} data-testid="search-project-card" aria-label={project.name}>
    <div className={styles.media}>
      <Link href={url} className={styles.imageLink} aria-label={"View " + project.name}>
        {image ? <img src={image} alt={project.name} loading="lazy" className={styles.image} /> : <div className={styles.placeholder}><TypeIcon size={56} /><span>{kind} project</span></div>}
      </Link>
      <span className={styles.type}>{kind}</span>
      <div className={styles.actions}>
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
      <div className={styles.facts}>
        <div><Maximize2 /><span><strong title={project.totalArea}>{project.totalArea || "On request"}</strong><small>Total area</small></span></div>
        <div><TypeIcon /><span><strong>{project.totalUnits ? project.totalUnits.toLocaleString("en-IN") : "On request"}</strong><small>{plots ? "Total plots" : villa ? "Total villas" : "Total units"}</small></span></div>
        <div><CalendarDays /><span><strong title={possession}>{possession}</strong><small>{plots ? "Handover" : "Possession"}</small></span></div>
      </div>
      <div className={styles.configHeader}>
        <h4>{plots ? "Available plots" : single ? "Configuration" : "Configurations"}</h4>
        <div><span>{configurations.length} {single ? "option" : "options"}</span>{configurations.length > 1 && <><button type="button" aria-label={"Previous configurations for " + project.name} onClick={() => track.current?.scrollBy({ left: -230, behavior: "smooth" })}><ChevronLeft size={14} /></button><button type="button" aria-label={"Next configurations for " + project.name} onClick={() => track.current?.scrollBy({ left: 230, behavior: "smooth" })}><ChevronRight size={14} /></button></>}</div>
      </div>
      <div ref={track} className={styles.configs + (single ? " " + styles.single : "")} tabIndex={configurations.length > 1 ? 0 : undefined} aria-label="Available configurations">
        {configurations.map((config, index) => {
          const details = configDetails(config, plots);
          return <Link href={url + "#floor-plans"} className={styles.config} key={config.id || index}>
            <div className={styles.configName}><strong title={config.label}>{config.label || (plots ? "Plot" : "Home")}</strong>{single && <small>{kind}</small>}</div>
            <div className={styles.configArea}><strong title={details.areaText}>{details.areaText}</strong>{single && <small>{details.areaLabel}</small>}</div>
            <div className={styles.configPrice}><strong>{config.priceMin > 0 ? formatPriceCompact(config.priceMin) + (config.priceMax > config.priceMin ? "+" : "") : "Price on request"}</strong><small>{details.rate || "Starting price"}</small></div>
          </Link>;
        })}
        {!configurations.length && <Link href={url} className={styles.empty}>Configuration details on request <ChevronRight size={18} /></Link>}
      </div>
    </div>
  </article>;
}
