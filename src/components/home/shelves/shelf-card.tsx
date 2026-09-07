"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Heart,
  MapPin,
  BadgeCheck,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Building2,
  Trees,
  Shield,
  Camera,
  Layers,
  ChevronRight,
  Compass,
  CheckCircle2,
  Calendar,
  Waves,
  Zap,
} from "lucide-react";
import { cn, formatPriceCompact, formatPropertyType } from "@/lib/utils";
import { useFavoritesStore } from "@/stores/favorites-store";
import type { MixedItem } from "@/components/home/mixed-carousel-row";
import type { HomeCardStyleId } from "@/types/home-section";

interface ShelfCardProps {
  item: MixedItem & {
    progressPercentage?: number;
    customBadge?: string;
  };
  cardStyle?: HomeCardStyleId;
  className?: string;
  index?: number;
  cardBgColor?: string;
  cardTextColor?: string;
  cardAccentColor?: string;
  customBadge?: string;
  customHeadline?: string;
  customTagline?: string;
  progressPercentage?: number;
  isEditable?: boolean;
  onEditBadge?: () => void;
  onEditHeadline?: () => void;
  onEditTagline?: () => void;
  onEditBgColor?: () => void;
  onEditTextColor?: () => void;
  onEditAccentColor?: () => void;
  onClick?: (e: React.MouseEvent) => void;
}

export function ShelfCard({
  item,
  cardStyle = "compact-marketplace",
  className,
  index = 0,
  cardBgColor,
  cardTextColor,
  cardAccentColor = "#faad13",
  customBadge,
  customHeadline,
  customTagline,
  progressPercentage: propProgressPercentage,
  isEditable = false,
  onEditBadge,
  onEditHeadline,
  onEditTagline,
  onEditBgColor,
  onEditTextColor,
  onEditAccentColor,
  onClick,
}: ShelfCardProps) {
  const { toggleFavorite, isFavorite } = useFavoritesStore();
  const isSaved = isFavorite(item.id);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isEditable) return;
    toggleFavorite(item.id);
  };

  const activeBadge = item.customBadge || customBadge;
  const activeHeadline = item.customHeadline || customHeadline;
  const activeTagline = item.customTagline || customTagline;
  const activeProgress =
    typeof item.progressPercentage === "number"
      ? item.progressPercentage
      : typeof propProgressPercentage === "number"
      ? propProgressPercentage
      : null;

  // Dynamic styling tokens (item-level override first, then shelf-level, then default white box, black text, gold logo)
  const effectiveBg = item.cardBgColor || cardBgColor || "#ffffff";
  const effectiveText = item.cardTextColor || cardTextColor || "#0f172a";
  const effectiveAccent = item.cardAccentColor || cardAccentColor || "#faad13";

  const containerStyle: React.CSSProperties = {
    backgroundColor: effectiveBg,
    color: effectiveText,
  };
  const textStyle: React.CSSProperties = { color: effectiveText };
  const accentTextStyle: React.CSSProperties = { color: effectiveAccent };
  const accentBgStyle: React.CSSProperties = {
    backgroundColor: effectiveAccent,
    color: "#0f172a",
  };

  const data = useMemo(() => {
    const isProject = item.itemType === "project";
    const defaultTitle = isProject ? item.name : item.title;
    const title = activeHeadline || defaultTitle;
    const href = isProject
      ? `/projects/${item.slug || item.id}`
      : `/properties/${item.slug || item.id}`;

    const locality = item.location?.locality || "";
    const city = item.location?.city || "";
    const locationStr = [locality, city].filter(Boolean).join(", ") || "Andhra Pradesh";

    // Primary & secondary images
    let primaryImage = item.coverImage;
    if (!primaryImage && item.images && item.images.length > 0) {
      primaryImage =
        typeof item.images[0] === "string" ? item.images[0] : item.images[0].url;
    }
    if (!primaryImage) {
      primaryImage = isProject
        ? "/images/categories/new_apartments_img_1786320061003.png"
        : "/images/categories/new_listings_img_1786320051269.png";
    }

    let secondaryImage = "";
    if (item.images && item.images.length > 1) {
      secondaryImage =
        typeof item.images[1] === "string" ? item.images[1] : item.images[1].url;
    }
    if (!secondaryImage) {
      secondaryImage = "/images/categories/new_villas_img_1786320073700.png";
    }

    const imageCount = item.images?.length || 1;

    // Price formatting
    let priceStr = "";
    if (isProject) {
      const cfgs = item.configurations || [];
      const prices = cfgs
        .flatMap((c) => [c.priceMin, c.priceMax])
        .filter((p): p is number => typeof p === "number" && p > 0);
      if (prices.length > 0) {
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        priceStr =
          min === max
            ? formatPriceCompact(min)
            : `${formatPriceCompact(min)} - ${formatPriceCompact(max)}`;
      } else {
        priceStr = "Price on request";
      }
    } else {
      priceStr = item.price ? formatPriceCompact(item.price) : "Price on request";
    }

    // BHK formatting
    let bhkStr = "";
    if (isProject) {
      const bedrooms = Array.from(
        new Set(item.configurations?.map((c) => c.bedrooms).filter(Boolean))
      ).sort((a, b) => Number(a) - Number(b));
      if (bedrooms.length > 0) {
        bhkStr = `${bedrooms.join(", ")} BHK`;
      } else {
        bhkStr =
          item.projectType === "villa"
            ? "Luxury Villas"
            : item.projectType === "venture"
            ? "Plots"
            : "Apartments";
      }
    } else {
      bhkStr = item.bedrooms ? `${item.bedrooms} BHK` : formatPropertyType(item.propertyType);
    }

    // Area formatting
    let areaStr = "";
    if (isProject) {
      const areas =
        item.configurations
          ?.flatMap((c) => [c.builtUpAreaMin, c.builtUpAreaMax])
          .filter((a): a is number => typeof a === "number" && a > 0) || [];
      if (areas.length > 0) {
        const minArea = Math.min(...areas);
        const maxArea = Math.max(...areas);
        areaStr =
          minArea === maxArea ? `${minArea} sq.ft.` : `${minArea} - ${maxArea} sq.ft.`;
      }
    } else if (item.area) {
      areaStr = `${item.area} sq.ft.`;
    }

    const tagline = activeTagline || (isProject
      ? item.tagline || "Modern Homes. Greater Possibilities."
      : "Verified Luxury Residence");

    const developer = isProject
      ? item.builderName || "Premium Developer"
      : item.postedBy === "owner"
      ? "Owner Listed"
      : "Verified Partner";

    const developerLogo = isProject ? item.builderLogoUrl : null;

    // Badges & statuses
    const isVerified = !isProject && Boolean(item.isVerified || item.status === "approved" || item.status === "published");
    const isRera = isProject ? Boolean(item.reraApproved || item.reraId) : Boolean(item.reraId);
    const isNewLaunch = isProject
      ? item.constructionStatus === "new-launch"
      : Boolean(item.displayCategory === "featured" || item.isFeatured);
    const isReadyToMove = isProject
      ? item.constructionStatus === "ready-to-move"
      : Boolean(item.isReadyToMove || item.possessionStatus === "ready" || item.possessionStatus === "ready-to-move");
    const isUnderConstruction = isProject
      ? item.constructionStatus === "under-construction"
      : false;

    // Construction progress percentage if available
    let progressPercentage: number | null = activeProgress;
    if (progressPercentage === null) {
      if (isUnderConstruction || cardStyle === "construction-progress") {
        progressPercentage = 70; // Sensible default for active projects
      }
    }

    return {
      isProject,
      title,
      href,
      locality,
      city,
      locationStr,
      primaryImage,
      secondaryImage,
      imageCount,
      priceStr,
      bhkStr,
      areaStr,
      tagline,
      developer,
      developerLogo,
      isVerified,
      isRera,
      isNewLaunch,
      isReadyToMove,
      isUnderConstruction,
      progressPercentage,
    };
  }, [item, activeProgress, cardStyle, activeHeadline, activeTagline]);

  // In editable / preview mode in admin dashboard:
  // Render purely as a <div> with NO Link, NO <a> tag, and NO href.
  // This physically forbids any click navigation or redirect to /properties/... or /projects/...
  const CardRoot = (isEditable ? "div" : Link) as React.ElementType;
  const cardRootProps: Record<string, any> = isEditable
    ? {
        role: "region",
        "aria-label": `Card preview: ${data.title}`,
        onClick: (e: React.MouseEvent) => {
          e.preventDefault();
          if (onClick) {
            onClick(e);
          }
        },
      }
    : {
        href: data.href,
      };

  // ──────────────────────────────────────────────────────────────────────────
  // 1. COMPACT MARKETPLACE (Style 01: 360–430px wide, ~190–220px high)
  // ──────────────────────────────────────────────────────────────────────────
  if (cardStyle === "compact-marketplace") {
    return (
      <CardRoot
        {...cardRootProps}
        style={containerStyle}
        className={cn(
          "group relative flex flex-col sm:flex-row h-full min-h-[190px] rounded-2xl overflow-hidden bg-white border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-amber-400/60 transition-all duration-300",
          isEditable && "select-none",
          className
        )}
      >
        {/* Left Photo */}
        <div className="relative w-full sm:w-[42%] aspect-[4/3] sm:aspect-auto shrink-0 overflow-hidden bg-slate-100">
          <Image
            src={data.primaryImage}
            alt={data.title}
            fill
            sizes="(max-width: 640px) 100vw, 380px"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-108"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

          {/* Image Count Badge */}
          {data.imageCount > 1 && (
            <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-bold text-white flex items-center gap-1">
              <Camera className="w-3 h-3" />
              <span>{data.imageCount}</span>
            </div>
          )}

          {/* Favorite button */}
          <button
            type="button"
            onClick={handleFavoriteClick}
            aria-label={isSaved ? "Remove from saved" : "Save property"}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-slate-700 hover:text-red-500 hover:bg-white transition-all shadow-sm"
          >
            <Heart className={cn("w-3.5 h-3.5", isSaved && "fill-red-500 text-red-500")} />
          </button>
        </div>

        {/* Right Info Section */}
        <div
          className={cn(
            "p-3.5 sm:p-4 flex flex-col justify-between flex-1 min-w-0 transition-all",
            isEditable && "hover:outline-dashed hover:outline-1 hover:outline-amber-400/30 cursor-pointer"
          )}
          style={containerStyle}
          onClick={isEditable ? (e) => {
            if (e.target === e.currentTarget) {
              e.preventDefault();
              onEditBgColor?.();
            }
          } : undefined}
          title={isEditable ? "Click to choose card background color" : undefined}
        >
          <div className="space-y-1">
            {/* Badges Row */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {activeBadge ? (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black shadow-xs transition-all",
                    isEditable && "cursor-pointer hover:ring-2 hover:ring-amber-400 hover:scale-105 active:scale-95"
                  )}
                  style={accentBgStyle}
                  title={isEditable ? "Click to edit badge text & color" : undefined}
                  onClick={isEditable ? (e) => { e.preventDefault(); e.stopPropagation(); onEditBadge?.(); } : undefined}
                >
                  {isEditable && <span className="mr-0.5 text-[9px]">✏️</span>}
                  <Sparkles className="w-3 h-3" /> {activeBadge}
                </span>
              ) : data.isVerified ? (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-[10px] font-bold text-emerald-700 transition-all",
                    isEditable && "cursor-pointer hover:ring-2 hover:ring-amber-400"
                  )}
                  title={isEditable ? "Click to edit badge text & color" : undefined}
                  onClick={isEditable ? (e) => { e.preventDefault(); e.stopPropagation(); onEditBadge?.(); } : undefined}
                >
                  <BadgeCheck className="w-3 h-3" /> Verified
                </span>
              ) : data.isRera ? (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200/80 text-[10px] font-bold text-blue-700 transition-all",
                    isEditable && "cursor-pointer hover:ring-2 hover:ring-amber-400"
                  )}
                  title={isEditable ? "Click to edit badge text & color" : undefined}
                  onClick={isEditable ? (e) => { e.preventDefault(); e.stopPropagation(); onEditBadge?.(); } : undefined}
                >
                  <ShieldCheck className="w-3 h-3" /> RERA
                </span>
              ) : (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black shadow-xs transition-all",
                    isEditable && "cursor-pointer hover:ring-2 hover:ring-amber-400 hover:scale-105"
                  )}
                  style={accentBgStyle}
                  title={isEditable ? "Click to edit badge text & color" : undefined}
                  onClick={isEditable ? (e) => { e.preventDefault(); e.stopPropagation(); onEditBadge?.(); } : undefined}
                >
                  <Sparkles className="w-3 h-3" /> Featured
                </span>
              )}
            </div>

            {/* Title */}
            <h3
              style={textStyle}
              className={cn(
                "font-extrabold text-sm sm:text-base text-slate-900 line-clamp-1 group-hover:text-amber-600 transition-colors",
                isEditable && "cursor-pointer hover:outline-dashed hover:outline-2 hover:outline-amber-400 hover:bg-amber-400/10 rounded px-1"
              )}
              title={isEditable ? "Click to edit headline & text color" : undefined}
              onClick={isEditable ? (e) => { e.preventDefault(); e.stopPropagation(); onEditHeadline?.(); } : undefined}
            >
              {isEditable && <span className="mr-1 text-[10px] opacity-75">✏️</span>}
              {data.title}
            </h3>

            {/* Location */}
            <p
              className={cn(
                "text-[11px] text-slate-500 flex items-center gap-1 line-clamp-1 font-medium",
                isEditable && "cursor-pointer hover:underline"
              )}
              onClick={isEditable ? (e) => { e.preventDefault(); e.stopPropagation(); onEditTextColor?.(); } : undefined}
              title={isEditable ? "Click to choose text color" : undefined}
            >
              <MapPin className="w-3 h-3 shrink-0" style={accentTextStyle} />
              <span>{data.locationStr}</span>
            </p>
          </div>

          {/* Price & Specs */}
          <div className="pt-2 border-t border-slate-100 space-y-1">
            <div
              style={textStyle}
              className={cn(
                "text-base sm:text-lg font-black tracking-tight text-slate-950",
                isEditable && "cursor-pointer hover:underline"
              )}
              onClick={isEditable ? (e) => { e.preventDefault(); e.stopPropagation(); onEditTextColor?.(); } : undefined}
              title={isEditable ? "Click to choose text color" : undefined}
            >
              {data.priceStr}
            </div>

            <div className="flex items-center justify-between gap-2 text-[11px] text-slate-600 font-semibold">
              <div
                className={cn("flex items-center gap-2 truncate", isEditable && "cursor-pointer hover:underline")}
                onClick={isEditable ? (e) => { e.preventDefault(); e.stopPropagation(); onEditTextColor?.(); } : undefined}
                title={isEditable ? "Click to choose text color" : undefined}
              >
                {data.bhkStr && <span style={textStyle}>{data.bhkStr}</span>}
                {data.bhkStr && data.areaStr && <span>•</span>}
                {data.areaStr && <span>{data.areaStr}</span>}
              </div>

              {/* Ready pill / arrow */}
              <div className="flex items-center gap-1.5 shrink-0">
                {data.isReadyToMove && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-extrabold border border-emerald-200/60">
                    Ready
                  </span>
                )}
                <div
                  className={cn(
                    "w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center transition-all",
                    isEditable && "cursor-pointer hover:ring-2 hover:ring-amber-400 hover:scale-105"
                  )}
                  style={{ backgroundColor: `${effectiveAccent}25`, color: effectiveAccent }}
                  title={isEditable ? "Click to choose accent color" : undefined}
                  onClick={isEditable ? (e) => { e.preventDefault(); e.stopPropagation(); onEditAccentColor?.(); } : undefined}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardRoot>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. TALL LUXURY PORTRAIT (Style 02: 280–340px wide, 460–540px high)
  // ──────────────────────────────────────────────────────────────────────────
  if (cardStyle === "tall-portrait") {
    return (
      <CardRoot
        {...cardRootProps}
        style={containerStyle}
        className={cn(
          "group relative flex flex-col h-full rounded-3xl overflow-hidden bg-white border border-slate-200/90 shadow-md hover:shadow-2xl hover:border-amber-400/60 transition-all duration-500",
          isEditable && "select-none",
          className
        )}
      >
        {/* Top Architectural Photo */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
          <Image
            src={data.primaryImage}
            alt={data.title}
            fill
            sizes="(max-width: 640px) 100vw, 340px"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-108"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />

          {/* Top Overlays */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
            <span
              className={cn(
                "px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider shadow-md flex items-center gap-1 transition-all",
                isEditable && "cursor-pointer hover:ring-2 hover:ring-amber-400 hover:scale-105 active:scale-95"
              )}
              style={accentBgStyle}
              title={isEditable ? "Click to edit badge text & color" : undefined}
              onClick={isEditable ? (e) => { e.preventDefault(); e.stopPropagation(); onEditBadge?.(); } : undefined}
            >
              {isEditable && <span className="mr-0.5 text-[9px]">✏️</span>}
              <Sparkles className="w-3 h-3" /> {activeBadge || (data.isNewLaunch ? "New Launch" : "Premium")}
            </span>

            <button
              type="button"
              onClick={handleFavoriteClick}
              aria-label="Save to favorites"
              className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-md border border-slate-200 text-slate-700 hover:text-red-500 transition-all flex items-center justify-center shadow-sm"
            >
              <Heart className={cn("w-4 h-4", isSaved && "fill-red-500 text-red-500")} />
            </button>
          </div>

          {/* Camera Count */}
          {data.imageCount > 1 && (
            <div className="absolute bottom-2 left-2.5 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-bold text-white flex items-center gap-1">
              <Camera className="w-3 h-3" />
              <span>{data.imageCount}</span>
            </div>
          )}
        </div>

        {/* Lower White Specifications Card */}
        <div
          style={containerStyle}
          className={cn(
            "p-4 sm:p-5 bg-white flex flex-col justify-between flex-1 space-y-3 transition-all",
            isEditable && "hover:outline-dashed hover:outline-1 hover:outline-amber-400/40 cursor-pointer"
          )}
          onClick={isEditable ? (e) => {
            if (e.target === e.currentTarget) {
              e.preventDefault();
              onEditBgColor?.();
            }
          } : undefined}
          title={isEditable ? "Click to choose card background color" : undefined}
        >
          <div className="space-y-1">
            <div
              style={textStyle}
              className={cn("text-2xl font-black tracking-tight text-slate-950", isEditable && "cursor-pointer hover:underline")}
              onClick={isEditable ? (e) => { e.preventDefault(); e.stopPropagation(); onEditTextColor?.(); } : undefined}
              title={isEditable ? "Click to choose text color" : undefined}
            >
              {data.priceStr}
            </div>
            <h3
              style={textStyle}
              className={cn(
                "font-heading font-extrabold text-base sm:text-lg line-clamp-1 text-slate-900 group-hover:text-amber-600 transition-colors",
                isEditable && "cursor-pointer hover:outline-dashed hover:outline-2 hover:outline-amber-400 hover:bg-amber-400/10 rounded px-1"
              )}
              title={isEditable ? "Click to edit headline & text color" : undefined}
              onClick={isEditable ? (e) => { e.preventDefault(); e.stopPropagation(); onEditHeadline?.(); } : undefined}
            >
              {isEditable && <span className="mr-1 text-[10px] opacity-75">✏️</span>}
              {data.title}
            </h3>
            <p
              className={cn("text-xs text-slate-500 font-medium flex items-center gap-1", isEditable && "cursor-pointer hover:underline")}
              onClick={isEditable ? (e) => { e.preventDefault(); e.stopPropagation(); onEditTextColor?.(); } : undefined}
              title={isEditable ? "Click to choose text color" : undefined}
            >
              <MapPin className="w-3.5 h-3.5 shrink-0" style={accentTextStyle} />
              <span className="line-clamp-1">{data.locationStr}</span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Config</span>
              <span style={textStyle} className="font-extrabold text-slate-900 truncate block text-sm">
                {data.bhkStr || "Available"}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Area</span>
              <span style={textStyle} className="font-extrabold text-slate-900 truncate block text-sm">
                {data.areaStr || "Spacious"}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-700 font-semibold flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" style={accentTextStyle} />
              {data.isReadyToMove ? "Ready to Move" : "Possession Soon"}
            </span>

            {data.isRera ? (
              <span className="text-[11px] text-emerald-600 font-extrabold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> RERA Approved
              </span>
            ) : (
              <span className="text-[11px] font-extrabold flex items-center gap-1" style={accentTextStyle}>
                <Sparkles className="w-3.5 h-3.5" /> Premium
              </span>
            )}
          </div>
        </div>
      </CardRoot>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 3. EXTRA-WIDE LUXURY BANNER (Style 03: 720–960px wide, 280–340px high)
  // ──────────────────────────────────────────────────────────────────────────
  if (cardStyle === "luxury-banner") {
    return (
      <CardRoot
        {...cardRootProps}
        style={containerStyle}
        className={cn(
          "group relative flex flex-col md:flex-row h-full rounded-3xl overflow-hidden bg-white border border-slate-200/90 shadow-xl hover:shadow-2xl hover:border-amber-400/60 transition-all duration-500",
          isEditable && "select-none",
          className
        )}
      >
        {/* Cinematic Panoramic Photo Area */}
        <div className="relative md:w-[60%] aspect-[16/9] md:aspect-auto min-h-[220px] overflow-hidden bg-slate-950">
          <Image
            src={data.primaryImage}
            alt={data.title}
            fill
            sizes="(max-width: 768px) 100vw, 600px"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-slate-950/20" />

          {/* Editorial Banner Headline Overlay */}
          <div className="absolute inset-0 p-5 sm:p-6 flex flex-col justify-between text-white">
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "px-3.5 py-1 rounded-full font-black text-[11px] tracking-wide shadow-md transition-all",
                  isEditable && "cursor-pointer hover:ring-2 hover:ring-amber-400 hover:scale-105 active:scale-95"
                )}
                style={accentBgStyle}
                title={isEditable ? "Click to edit badge text & color" : undefined}
                onClick={isEditable ? (e) => { e.preventDefault(); e.stopPropagation(); onEditBadge?.(); } : undefined}
              >
                {isEditable && <span className="mr-1 text-[10px]">✏️</span>}
                {activeBadge || "Featured Campaign"}
              </span>
              <button
                type="button"
                onClick={handleFavoriteClick}
                aria-label="Save project"
                className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white hover:text-red-500 transition-all flex items-center justify-center shadow-md"
              >
                <Heart className={cn("w-4 h-4", isSaved && "fill-red-500 text-red-500")} />
              </button>
            </div>

            <div className="space-y-1">
              <p
                style={item.cardTextColor ? { color: effectiveText } : undefined}
                className={cn(
                  "font-serif text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight transition-all",
                  isEditable && "cursor-pointer hover:outline-dashed hover:outline-2 hover:outline-amber-400 hover:bg-black/30 rounded-lg p-1"
                )}
                title={isEditable ? "Click to edit headline & text color" : undefined}
                onClick={isEditable ? (e) => { e.preventDefault(); e.stopPropagation(); onEditHeadline?.(); } : undefined}
              >
                {isEditable && <span className="inline-block mr-1 text-xs opacity-75">✏️</span>}
                {customHeadline || "A Higher Standard of Living"}
              </p>
              <p
                style={item.cardTextColor ? { color: effectiveText } : undefined}
                className={cn(
                  "text-xs sm:text-sm text-slate-200 font-medium max-w-md line-clamp-1 transition-all",
                  isEditable && "cursor-pointer hover:outline-dashed hover:outline-2 hover:outline-amber-400 hover:bg-black/30 rounded-lg p-1"
                )}
                title={isEditable ? "Click to edit tagline & text color" : undefined}
                onClick={isEditable ? (e) => { e.preventDefault(); e.stopPropagation(); onEditTagline?.(); } : undefined}
              >
                {isEditable && <span className="inline-block mr-1 text-[10px] opacity-75">✏️</span>}
                {customTagline || data.tagline}
              </p>
            </div>
          </div>
        </div>

        {/* Right / Bottom Luxury Information Strip */}
        <div
          style={containerStyle}
          className={cn(
            "md:w-[40%] p-5 sm:p-6 bg-white flex flex-col justify-between space-y-4 min-w-[260px] transition-all",
            isEditable && "hover:outline-dashed hover:outline-1 hover:outline-amber-400/40 cursor-pointer"
          )}
          onClick={isEditable ? (e) => {
            if (e.target === e.currentTarget) {
              e.preventDefault();
              onEditBgColor?.();
            }
          } : undefined}
          title={isEditable ? "Click to choose card background color" : undefined}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cn(
                "w-12 h-12 rounded-2xl bg-white font-heading font-black text-lg flex items-center justify-center border shadow-sm shrink-0 transition-all p-1.5 overflow-hidden",
                isEditable && "cursor-pointer hover:ring-2 hover:ring-amber-400 hover:scale-105 active:scale-95"
              )}
              style={{ borderColor: `${effectiveAccent}60`, color: effectiveAccent }}
              title={isEditable ? "Click to choose accent color" : undefined}
              onClick={isEditable ? (e) => { e.preventDefault(); e.stopPropagation(); onEditAccentColor?.(); } : undefined}
            >
              {data.developerLogo ? (
                <img
                  src={data.developerLogo}
                  alt={data.developer}
                  className="w-full h-full object-contain object-center rounded-xl"
                />
              ) : (
                <Building2 className="w-6 h-6" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3
                style={textStyle}
                className={cn(
                  "font-black text-lg text-slate-900 line-clamp-1 group-hover:text-amber-500 transition-colors",
                  isEditable && "cursor-pointer hover:outline-dashed hover:outline-1 hover:outline-amber-400 rounded px-1"
                )}
                title={isEditable ? "Click to edit title override & text color" : undefined}
                onClick={isEditable ? (e) => { e.preventDefault(); e.stopPropagation(); onEditHeadline?.(); } : undefined}
              >
                {data.title}
              </h3>
              <p
                className={cn(
                  "text-xs text-slate-500 font-medium truncate",
                  isEditable && "cursor-pointer hover:underline"
                )}
                onClick={isEditable ? (e) => { e.preventDefault(); e.stopPropagation(); onEditTextColor?.(); } : undefined}
                title={isEditable ? "Click to choose text color" : undefined}
              >
                By {data.developer}
              </p>
            </div>
          </div>

          <div
            className={cn(
              "space-y-1.5 min-w-0",
              isEditable && "cursor-pointer hover:outline-dashed hover:outline-1 hover:outline-amber-400/30 rounded p-1"
            )}
            onClick={isEditable ? (e) => { e.preventDefault(); e.stopPropagation(); onEditTextColor?.(); } : undefined}
            title={isEditable ? "Click to choose text color" : undefined}
          >
            <div style={textStyle} className="text-2xl font-black tracking-tight text-slate-950">
              {data.priceStr}
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1 font-medium truncate">
              <MapPin className="w-3.5 h-3.5 shrink-0" style={accentTextStyle} />
              <span className="truncate">{data.locationStr}</span>
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs min-w-0">
            <div
              className={cn(
                "space-y-0.5 min-w-0 flex-1",
                isEditable && "cursor-pointer hover:underline"
              )}
              onClick={isEditable ? (e) => { e.preventDefault(); e.stopPropagation(); onEditTextColor?.(); } : undefined}
              title={isEditable ? "Click to choose text color" : undefined}
            >
              <span style={textStyle} className="font-extrabold text-slate-800 block truncate">
                {data.bhkStr || "Multi-size"}
              </span>
              <span className="text-[11px] text-slate-500 block truncate">
                {data.areaStr}
              </span>
            </div>

            <div
              className={cn(
                "px-3 py-1.5 rounded-xl font-extrabold text-[11px] flex items-center gap-1 transition-colors shadow-xs shrink-0",
                isEditable && "cursor-pointer hover:ring-2 hover:ring-amber-400 hover:scale-105 active:scale-95"
              )}
              style={accentBgStyle}
              title={isEditable ? "Click to choose button & accent color" : undefined}
              onClick={isEditable ? (e) => { e.preventDefault(); e.stopPropagation(); onEditAccentColor?.(); } : undefined}
            >
              <span>Explore</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        </div>
      </CardRoot>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 4. PREMIUM STACKED FEATURE (Style 04: 640–820px wide, 300–380px high)
  // ──────────────────────────────────────────────────────────────────────────
  if (cardStyle === "split-feature") {
    return (
      <CardRoot
        {...cardRootProps}
        style={containerStyle}
        className={cn(
          "group relative flex flex-col md:flex-row h-full rounded-3xl overflow-hidden bg-white border border-slate-200/90 shadow-xl hover:shadow-2xl hover:border-amber-400/60 transition-all duration-500",
          isEditable && "select-none",
          className
        )}
      >
        {/* Left: Dual Stacked Images */}
        <div className="md:w-[50%] flex flex-col min-h-[220px] shrink-0">
          <div className="relative h-1/2 w-full overflow-hidden bg-slate-100 border-b border-white/20">
            <Image
              src={data.primaryImage}
              alt={data.title}
              fill
              sizes="(max-width: 768px) 100vw, 400px"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-108"
            />
            <div
              className={cn(
                "absolute top-3 left-3 px-3 py-1 rounded-full font-black text-[11px] shadow-md flex items-center gap-1 transition-all",
                isEditable && "cursor-pointer hover:ring-2 hover:ring-amber-400 hover:scale-105 active:scale-95"
              )}
              style={accentBgStyle}
              title={isEditable ? "Click to edit badge text & color" : undefined}
              onClick={isEditable ? (e) => { e.preventDefault(); e.stopPropagation(); onEditBadge?.(); } : undefined}
            >
              {isEditable && <span className="mr-0.5 text-[9px]">✏️</span>}
              <Sparkles className="w-3 h-3" /> {activeBadge || "Premium"}
            </div>
          </div>
          <div className="relative h-1/2 w-full overflow-hidden bg-slate-200">
            <Image
              src={data.secondaryImage}
              alt={`${data.title} interior`}
              fill
              sizes="(max-width: 768px) 100vw, 400px"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-108"
            />
          </div>
        </div>

        {/* Right: Spec Panel */}
        <div
          style={containerStyle}
          className={cn(
            "md:w-[50%] p-5 sm:p-6 bg-white flex flex-col justify-between space-y-4 transition-all",
            isEditable && "hover:outline-dashed hover:outline-1 hover:outline-amber-400/40 cursor-pointer"
          )}
          onClick={isEditable ? (e) => {
            if (e.target === e.currentTarget) {
              e.preventDefault();
              onEditBgColor?.();
            }
          } : undefined}
          title={isEditable ? "Click to choose card background color" : undefined}
        >
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "text-[11px] font-bold uppercase tracking-wider",
                  isEditable && "cursor-pointer hover:outline-dashed hover:outline-1 hover:outline-amber-400 rounded px-1"
                )}
                style={accentTextStyle}
                title={isEditable ? "Click to edit tagline & text color" : undefined}
                onClick={isEditable ? (e) => { e.preventDefault(); e.stopPropagation(); onEditTagline?.(); } : undefined}
              >
                {isEditable && <span className="mr-1 text-[9px]">✏️</span>}
                {customTagline || "Live Above Ordinary"}
              </span>
              <button
                type="button"
                onClick={handleFavoriteClick}
                aria-label="Save listing"
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 hover:text-red-500 transition-all flex items-center justify-center"
              >
                <Heart className={cn("w-3.5 h-3.5", isSaved && "fill-red-500 text-red-500")} />
              </button>
            </div>

            <h3
              style={textStyle}
              className={cn(
                "font-heading font-black text-xl text-slate-900 line-clamp-1 group-hover:text-amber-600 transition-colors",
                isEditable && "cursor-pointer hover:outline-dashed hover:outline-2 hover:outline-amber-400 hover:bg-amber-400/10 rounded px-1"
              )}
              title={isEditable ? "Click to edit headline & text color" : undefined}
              onClick={isEditable ? (e) => { e.preventDefault(); e.stopPropagation(); onEditHeadline?.(); } : undefined}
            >
              {isEditable && <span className="mr-1 text-[10px] opacity-75">✏️</span>}
              {data.title}
            </h3>
            <p
              className={cn("text-xs text-slate-500 flex items-center gap-1", isEditable && "cursor-pointer hover:underline")}
              onClick={isEditable ? (e) => { e.preventDefault(); e.stopPropagation(); onEditTextColor?.(); } : undefined}
              title={isEditable ? "Click to choose text color" : undefined}
            >
              <MapPin className="w-3 h-3 shrink-0" style={accentTextStyle} />
              <span>{data.locationStr}</span>
            </p>
          </div>

          <div className="space-y-1">
            <div
              style={textStyle}
              className={cn("text-2xl font-black tracking-tight text-slate-950", isEditable && "cursor-pointer hover:underline")}
              onClick={isEditable ? (e) => { e.preventDefault(); e.stopPropagation(); onEditTextColor?.(); } : undefined}
              title={isEditable ? "Click to choose text color" : undefined}
            >
              {data.priceStr}
            </div>
            <div
              className={cn("flex items-center gap-2 text-xs font-semibold text-slate-600", isEditable && "cursor-pointer hover:underline")}
              onClick={isEditable ? (e) => { e.preventDefault(); e.stopPropagation(); onEditTextColor?.(); } : undefined}
              title={isEditable ? "Click to choose text color" : undefined}
            >
              {data.bhkStr && <span style={textStyle}>{data.bhkStr}</span>}
              {data.bhkStr && data.areaStr && <span>•</span>}
              {data.areaStr && <span>{data.areaStr}</span>}
            </div>
          </div>

          {/* Bottom Amenities Bar */}
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between gap-1 text-[10px] font-extrabold text-slate-600 mb-2">
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3" style={accentTextStyle} /> Clubhouse
              </span>
              <span className="flex items-center gap-1">
                <Waves className="w-3 h-3" style={accentTextStyle} /> Swimming Pool
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-semibold">{data.developer}</span>
              <span
                className={cn(
                  "px-3 py-1.5 rounded-xl font-extrabold text-xs flex items-center gap-1 shadow-xs transition-all",
                  isEditable && "cursor-pointer hover:ring-2 hover:ring-amber-400 hover:scale-105 active:scale-95"
                )}
                style={accentBgStyle}
                title={isEditable ? "Click to choose button & accent color" : undefined}
                onClick={isEditable ? (e) => { e.preventDefault(); e.stopPropagation(); onEditAccentColor?.(); } : undefined}
              >
                <span>View Details</span>
                <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>
      </CardRoot>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 5. BOTTOM FLOATING CARD (Style 05: 420–520px wide, ~400–480px high)
  // ──────────────────────────────────────────────────────────────────────────
  if (cardStyle === "bottom-floating") {
    return (
      <CardRoot
        {...cardRootProps}
        style={containerStyle}
        className={cn(
          "group relative flex flex-col h-full rounded-3xl overflow-hidden bg-white border border-slate-200/90 shadow-xl hover:shadow-2xl hover:border-amber-400/60 transition-all duration-500",
          isEditable && "select-none",
          className
        )}
      >
        {/* Full-bleed Photo */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
          <Image
            src={data.primaryImage}
            alt={data.title}
            fill
            sizes="(max-width: 640px) 100vw, 500px"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-108"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

          {/* Top Overlays */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
            <span
              className={cn(
                "px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wide shadow-md transition-all",
                isEditable && "cursor-pointer hover:ring-2 hover:ring-amber-400 hover:scale-105 active:scale-95"
              )}
              style={accentBgStyle}
              title={isEditable ? "Click to edit badge text & color" : undefined}
              onClick={isEditable ? (e) => { e.preventDefault(); e.stopPropagation(); onEditBadge?.(); } : undefined}
            >
              {isEditable && <span className="mr-0.5 text-[9px]">✏️</span>}
              {activeBadge || "Featured"}
            </span>
            <button
              type="button"
              onClick={handleFavoriteClick}
              aria-label="Save project"
              className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-md text-slate-700 hover:text-red-500 transition-all flex items-center justify-center shadow-sm"
            >
              <Heart className={cn("w-4 h-4", isSaved && "fill-red-500 text-red-500")} />
            </button>
          </div>
        </div>

        {/* Floating White Overlay Panel overlapping the photo */}
        <div
          style={containerStyle}
          className={cn(
            "relative -mt-10 sm:-mt-12 mx-3 sm:mx-4 mb-3 p-4 sm:p-5 rounded-2xl bg-white shadow-xl border border-slate-200 z-10 space-y-3 transition-all",
            isEditable && "hover:outline-dashed hover:outline-1 hover:outline-amber-400/40 cursor-pointer"
          )}
          onClick={isEditable ? (e) => {
            if (e.target === e.currentTarget) {
              e.preventDefault();
              onEditBgColor?.();
            }
          } : undefined}
          title={isEditable ? "Click to choose card background color" : undefined}
        >
          {/* Overlapping Circular Project Logo */}
          <div
            className={cn(
              "absolute -top-8 left-4 sm:left-5 w-16 h-16 sm:w-18 sm:h-18 rounded-full border-2 shadow-xl bg-white p-2 flex items-center justify-center overflow-hidden transition-all z-20",
              isEditable && "cursor-pointer hover:ring-2 hover:ring-amber-400 hover:scale-105 active:scale-95"
            )}
            style={{ borderColor: effectiveAccent, color: effectiveAccent }}
            title={isEditable ? "Click to choose accent color" : undefined}
            onClick={isEditable ? (e) => { e.preventDefault(); e.stopPropagation(); onEditAccentColor?.(); } : undefined}
          >
            {data.developerLogo ? (
              <img
                src={data.developerLogo}
                alt={data.developer}
                className="w-full h-full object-contain object-center"
              />
            ) : (
              <span className="text-[11px] font-black text-center leading-tight px-1 uppercase" style={accentTextStyle}>
                {data.title.substring(0, 8)}
              </span>
            )}
          </div>

          <div className="pt-6 sm:pt-7 space-y-1">
            <h3
              style={textStyle}
              className={cn(
                "font-heading font-black text-lg sm:text-xl text-slate-900 line-clamp-1 group-hover:text-amber-600 transition-colors",
                isEditable && "cursor-pointer hover:outline-dashed hover:outline-2 hover:outline-amber-400 hover:bg-amber-400/10 rounded px-1"
              )}
              title={isEditable ? "Click to edit headline & text color" : undefined}
              onClick={isEditable ? (e) => { e.preventDefault(); e.stopPropagation(); onEditHeadline?.(); } : undefined}
            >
              {isEditable && <span className="mr-1 text-[10px] opacity-75">✏️</span>}
              {data.title}
            </h3>
            <p
              className={cn("text-xs text-slate-500 font-medium", isEditable && "cursor-pointer hover:underline")}
              onClick={isEditable ? (e) => { e.preventDefault(); e.stopPropagation(); onEditTextColor?.(); } : undefined}
              title={isEditable ? "Click to choose text color" : undefined}
            >
              {data.bhkStr ? `${data.bhkStr}, ` : ""}
              {data.locationStr}
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <div
              style={textStyle}
              className={cn("text-lg sm:text-xl font-black tracking-tight text-slate-950", isEditable && "cursor-pointer hover:underline")}
              onClick={isEditable ? (e) => { e.preventDefault(); e.stopPropagation(); onEditTextColor?.(); } : undefined}
              title={isEditable ? "Click to choose text color" : undefined}
            >
              {data.priceStr}
            </div>
            <div
              className={cn(
                "w-7 h-7 rounded-full bg-slate-100 text-slate-900 transition-all flex items-center justify-center",
                isEditable && "cursor-pointer hover:ring-2 hover:ring-amber-400 hover:scale-105"
              )}
              style={{ backgroundColor: `${effectiveAccent}25`, color: effectiveAccent }}
              title={isEditable ? "Click to choose accent color" : undefined}
              onClick={isEditable ? (e) => { e.preventDefault(); e.stopPropagation(); onEditAccentColor?.(); } : undefined}
            >
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </CardRoot>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 6. MODERN VILLA SHOWCASE (Style 06: 460–620px wide, 300–380px high)
  // ──────────────────────────────────────────────────────────────────────────
  if (cardStyle === "modern-villa") {
    return (
      <CardRoot
        {...cardRootProps}
        style={containerStyle}
        className={cn(
          "group relative flex flex-col h-full rounded-3xl overflow-hidden bg-white border border-slate-200/90 shadow-md hover:shadow-2xl hover:border-amber-400/60 transition-all duration-500",
          isEditable && "select-none",
          className
        )}
      >
        {/* Villa Photo */}
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
          <Image
            src={data.primaryImage}
            alt={data.title}
            fill
            sizes="(max-width: 640px) 100vw, 480px"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-108"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />

          {/* Badges */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5">
            <span
              className={cn(
                "px-2.5 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1 shadow-md transition-all",
                isEditable && "cursor-pointer hover:ring-2 hover:ring-amber-400 hover:scale-105 active:scale-95"
              )}
              style={accentBgStyle}
              title={isEditable ? "Click to edit badge text & color" : undefined}
              onClick={isEditable ? (e) => { e.preventDefault(); e.stopPropagation(); onEditBadge?.(); } : undefined}
            >
              {isEditable && <span className="mr-0.5 text-[9px]">✏️</span>}
              <Compass className="w-3 h-3" /> {activeBadge || "3D Tour"}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-bold shadow-sm">
              Gated Villa
            </span>
          </div>

          <button
            type="button"
            onClick={handleFavoriteClick}
            aria-label="Save villa"
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-md text-slate-700 hover:text-red-500 transition-all flex items-center justify-center shadow-sm"
          >
            <Heart className={cn("w-4 h-4", isSaved && "fill-red-500 text-red-500")} />
          </button>
        </div>

        {/* Villa Details & Amenities */}
        <div
          style={containerStyle}
          className={cn(
            "p-4 sm:p-5 flex flex-col justify-between flex-1 space-y-3 bg-white transition-all",
            isEditable && "hover:outline-dashed hover:outline-1 hover:outline-amber-400/40 cursor-pointer"
          )}
          onClick={isEditable ? (e) => {
            if (e.target === e.currentTarget) {
              e.preventDefault();
              onEditBgColor?.();
            }
          } : undefined}
          title={isEditable ? "Click to choose card background color" : undefined}
        >
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <h3
                style={textStyle}
                className={cn(
                  "font-heading font-black text-base sm:text-lg text-slate-900 line-clamp-1 group-hover:text-amber-600 transition-colors",
                  isEditable && "cursor-pointer hover:outline-dashed hover:outline-2 hover:outline-amber-400 hover:bg-amber-400/10 rounded px-1"
                )}
                title={isEditable ? "Click to edit headline & text color" : undefined}
                onClick={isEditable ? (e) => { e.preventDefault(); e.stopPropagation(); onEditHeadline?.(); } : undefined}
              >
                {isEditable && <span className="mr-1 text-[10px] opacity-75">✏️</span>}
                {data.title}
              </h3>
              <span
                style={textStyle}
                className={cn("text-base sm:text-lg font-black shrink-0 ml-2 text-slate-950", isEditable && "cursor-pointer hover:underline")}
                onClick={isEditable ? (e) => { e.preventDefault(); e.stopPropagation(); onEditTextColor?.(); } : undefined}
                title={isEditable ? "Click to choose text color" : undefined}
              >
                {data.priceStr}
              </span>
            </div>
            <p
              className={cn("text-xs text-slate-500 flex items-center gap-1", isEditable && "cursor-pointer hover:underline")}
              onClick={isEditable ? (e) => { e.preventDefault(); e.stopPropagation(); onEditTextColor?.(); } : undefined}
              title={isEditable ? "Click to choose text color" : undefined}
            >
              <MapPin className="w-3 h-3 shrink-0" style={accentTextStyle} />
              <span>{data.locationStr}</span>
            </p>
          </div>

          {/* Amenities Grid */}
          <div className="grid grid-cols-3 gap-1.5 py-2 border-y border-slate-100 text-[10px] font-bold text-slate-700">
            <div className="flex items-center gap-1 justify-center p-1.5 rounded-lg bg-slate-50">
              <Trees className="w-3 h-3" style={accentTextStyle} /> Private Garden
            </div>
            <div className="flex items-center gap-1 justify-center p-1.5 rounded-lg bg-slate-50">
              <Building2 className="w-3 h-3" style={accentTextStyle} /> Clubhouse
            </div>
            <div className="flex items-center gap-1 justify-center p-1.5 rounded-lg bg-slate-50">
              <Shield className="w-3 h-3" style={accentTextStyle} /> 24/7 Security
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <span
              style={textStyle}
              className={cn("text-slate-600 font-semibold", isEditable && "cursor-pointer hover:underline")}
              onClick={isEditable ? (e) => { e.preventDefault(); e.stopPropagation(); onEditTextColor?.(); } : undefined}
              title={isEditable ? "Click to choose text color" : undefined}
            >
              {data.bhkStr || "4 BHK"} • {data.areaStr || "3200 sq.ft."}
            </span>

            <span
              style={accentTextStyle}
              className={cn("font-black flex items-center gap-1 group-hover:translate-x-0.5 transition-transform", isEditable && "cursor-pointer hover:ring-2 hover:ring-amber-400 p-1 rounded-lg")}
              title={isEditable ? "Click to choose accent color" : undefined}
              onClick={isEditable ? (e) => { e.preventDefault(); e.stopPropagation(); onEditAccentColor?.(); } : undefined}
            >
              Know More <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </CardRoot>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 7. CONSTRUCTION PROGRESS TRACKER (Style 07: 300–360px wide, 420–500px high)
  // ──────────────────────────────────────────────────────────────────────────
  if (cardStyle === "construction-progress") {
    return (
      <CardRoot
        {...cardRootProps}
        style={containerStyle}
        className={cn(
          "group relative flex flex-col h-full rounded-3xl overflow-hidden bg-white border border-slate-200/90 shadow-md hover:shadow-xl hover:border-amber-400/60 transition-all duration-500",
          isEditable && "select-none",
          className
        )}
      >
        {/* Elevation Photo */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
          <Image
            src={data.primaryImage}
            alt={data.title}
            fill
            sizes="(max-width: 640px) 100vw, 340px"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-108"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />

          <div className="absolute top-3 left-3 flex items-center gap-1.5">
            <span
              className={cn(
                "px-2.5 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1 shadow-md transition-all",
                isEditable && "cursor-pointer hover:ring-2 hover:ring-amber-400 hover:scale-105 active:scale-95"
              )}
              style={accentBgStyle}
              title={isEditable ? "Click to edit badge text & color" : undefined}
              onClick={isEditable ? (e) => { e.preventDefault(); e.stopPropagation(); onEditBadge?.(); } : undefined}
            >
              {isEditable && <span className="mr-0.5 text-[9px]">✏️</span>}
              <Zap className="w-3 h-3" /> {activeBadge || "UNDER CONSTRUCTION"}
            </span>
          </div>

          <button
            type="button"
            onClick={handleFavoriteClick}
            aria-label="Save project"
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-md text-slate-700 hover:text-red-500 transition-all flex items-center justify-center shadow-sm"
          >
            <Heart className={cn("w-4 h-4", isSaved && "fill-red-500 text-red-500")} />
          </button>

          {data.imageCount > 1 && (
            <div className="absolute bottom-2 left-3 px-2 py-0.5 rounded bg-black/60 backdrop-blur-md text-[10px] font-bold text-white flex items-center gap-1">
              <Camera className="w-3 h-3" /> {data.imageCount}
            </div>
          )}
        </div>

        {/* Content & Progress Bar */}
        <div
          style={containerStyle}
          className={cn(
            "p-4 sm:p-5 flex flex-col justify-between flex-1 space-y-4 bg-white transition-all",
            isEditable && "hover:outline-dashed hover:outline-1 hover:outline-amber-400/40 cursor-pointer"
          )}
          onClick={isEditable ? (e) => {
            if (e.target === e.currentTarget) {
              e.preventDefault();
              onEditBgColor?.();
            }
          } : undefined}
          title={isEditable ? "Click to choose card background color" : undefined}
        >
          <div className="space-y-1">
            <h3
              style={textStyle}
              className={cn(
                "font-heading font-black text-base sm:text-lg text-slate-900 line-clamp-1 group-hover:text-amber-600 transition-colors",
                isEditable && "cursor-pointer hover:outline-dashed hover:outline-2 hover:outline-amber-400 hover:bg-amber-400/10 rounded px-1"
              )}
              title={isEditable ? "Click to edit headline & text color" : undefined}
              onClick={isEditable ? (e) => { e.preventDefault(); e.stopPropagation(); onEditHeadline?.(); } : undefined}
            >
              {isEditable && <span className="mr-1 text-[10px] opacity-75">✏️</span>}
              {data.title}
            </h3>
            <p
              className={cn("text-xs text-slate-500 flex items-center gap-1 font-medium", isEditable && "cursor-pointer hover:underline")}
              onClick={isEditable ? (e) => { e.preventDefault(); e.stopPropagation(); onEditTextColor?.(); } : undefined}
              title={isEditable ? "Click to choose text color" : undefined}
            >
              <MapPin className="w-3 h-3 shrink-0" style={accentTextStyle} />
              <span>{data.locationStr}</span>
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div
              style={textStyle}
              className={cn("text-xl font-black text-slate-950", isEditable && "cursor-pointer hover:underline")}
              onClick={isEditable ? (e) => { e.preventDefault(); e.stopPropagation(); onEditTextColor?.(); } : undefined}
              title={isEditable ? "Click to choose text color" : undefined}
            >
              {data.priceStr}
            </div>
            <div
              style={textStyle}
              className={cn("text-xs font-bold text-slate-700", isEditable && "cursor-pointer hover:underline")}
              onClick={isEditable ? (e) => { e.preventDefault(); e.stopPropagation(); onEditTextColor?.(); } : undefined}
              title={isEditable ? "Click to choose text color" : undefined}
            >
              {data.bhkStr}
            </div>
          </div>

          {/* Construction Progress Bar (Admin Configurable per Project) */}
          <div className="pt-3 border-t border-slate-100 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-extrabold">
              <span style={textStyle} className="text-slate-700">Construction Progress</span>
              <span className="font-black" style={{ color: "#10b981" }}>
                {data.progressPercentage ?? 70}%
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden border border-slate-200/80">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-emerald-400 transition-all duration-1000 shadow-sm"
                style={{ width: `${Math.min(100, Math.max(0, data.progressPercentage ?? 70))}%` }}
              />
            </div>
          </div>
        </div>
      </CardRoot>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 8. LUXURY EDITORIAL (Style 08: 520–680px wide, 300–400px high)
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <CardRoot
      {...cardRootProps}
      style={containerStyle}
      className={cn(
        "group relative flex flex-col md:flex-row h-full rounded-3xl overflow-hidden bg-white border border-slate-200/90 shadow-xl hover:border-amber-500/60 transition-all duration-500",
        isEditable && "select-none",
        className
      )}
    >
      {/* Left Editorial Information Panel */}
      <div
        style={containerStyle}
        className={cn(
          "md:w-[45%] p-5 sm:p-6 flex flex-col justify-between space-y-4 bg-white transition-all",
          isEditable && "hover:outline-dashed hover:outline-1 hover:outline-amber-400/40 cursor-pointer"
        )}
        onClick={isEditable ? (e) => {
          if (e.target === e.currentTarget) {
            e.preventDefault();
            onEditBgColor?.();
          }
        } : undefined}
        title={isEditable ? "Click to choose card background color" : undefined}
      >
        <div className="space-y-2">
          <span
            className={cn(
              "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider inline-block shadow-xs transition-all",
              isEditable && "cursor-pointer hover:ring-2 hover:ring-amber-400 hover:scale-105 active:scale-95"
            )}
            style={accentBgStyle}
            title={isEditable ? "Click to edit badge text & color" : undefined}
            onClick={isEditable ? (e) => { e.preventDefault(); e.stopPropagation(); onEditBadge?.(); } : undefined}
          >
            {isEditable && <span className="mr-0.5 text-[9px]">✏️</span>}
            {activeBadge || "Signature Collection"}
          </span>
          <h3
            style={textStyle}
            className={cn(
              "font-serif text-xl sm:text-2xl font-black text-slate-900 leading-tight transition-all",
              isEditable && "cursor-pointer hover:outline-dashed hover:outline-2 hover:outline-amber-400 hover:bg-amber-400/10 rounded p-1"
            )}
            title={isEditable ? "Click to edit headline & text color" : undefined}
            onClick={isEditable ? (e) => { e.preventDefault(); e.stopPropagation(); onEditHeadline?.(); } : undefined}
          >
            {isEditable && <span className="mr-1 text-xs opacity-75">✏️</span>}
            {customHeadline || "Premium Living by the Lake"}
          </h3>
          <p
            className={cn("text-xs text-slate-600 font-medium transition-all", isEditable && "cursor-pointer hover:outline-dashed hover:outline-1 hover:outline-amber-400 rounded px-1")}
            title={isEditable ? "Click to edit tagline & text color" : undefined}
            onClick={isEditable ? (e) => { e.preventDefault(); e.stopPropagation(); onEditTagline?.(); } : undefined}
          >
            {isEditable && <span className="mr-0.5 text-[9px]">✏️</span>}
            {customTagline || (data.bhkStr ? `${data.bhkStr} • ${data.areaStr || "2200–3800 sq.ft."}` : "Exclusive waterfront residences...")}
          </p>
        </div>

        <div className="space-y-1">
          <p
            className={cn("text-xs text-slate-500 flex items-center gap-1 font-medium", isEditable && "cursor-pointer hover:underline")}
            onClick={isEditable ? (e) => { e.preventDefault(); e.stopPropagation(); onEditTextColor?.(); } : undefined}
            title={isEditable ? "Click to choose text color" : undefined}
          >
            <MapPin className="w-3.5 h-3.5 shrink-0" style={accentTextStyle} />
            <span>{data.locationStr}</span>
          </p>
          <div
            style={textStyle}
            className={cn("text-2xl font-black tracking-tight text-slate-950", isEditable && "cursor-pointer hover:underline")}
            onClick={isEditable ? (e) => { e.preventDefault(); e.stopPropagation(); onEditTextColor?.(); } : undefined}
            title={isEditable ? "Click to choose text color" : undefined}
          >
            {data.priceStr}
          </div>
        </div>

        <div className="pt-2">
          <span
            className={cn(
              "w-full sm:w-auto px-4 py-2 rounded-xl font-black text-xs inline-flex items-center justify-center gap-1.5 transition-colors shadow-xs",
              isEditable && "cursor-pointer hover:ring-2 hover:ring-amber-400 hover:scale-105 active:scale-95"
            )}
            style={accentBgStyle}
            title={isEditable ? "Click to choose button & accent color" : undefined}
            onClick={isEditable ? (e) => { e.preventDefault(); e.stopPropagation(); onEditAccentColor?.(); } : undefined}
          >
            <span>Discover</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>

      {/* Right Lakefront / Luxury Terrace Photo */}
      <div className="relative md:w-[55%] aspect-[16/10] md:aspect-auto min-h-[200px] overflow-hidden bg-slate-100">
        <Image
          src={data.primaryImage}
          alt={data.title}
          fill
          sizes="(max-width: 768px) 100vw, 400px"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-108"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-transparent hidden md:block" />

        <button
          type="button"
          onClick={handleFavoriteClick}
          aria-label="Save to favorites"
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-md text-slate-700 hover:text-red-500 transition-all flex items-center justify-center shadow-sm"
        >
          <Heart className={cn("w-4 h-4", isSaved && "fill-red-500 text-red-500")} />
        </button>
      </div>
    </CardRoot>
  );
}

