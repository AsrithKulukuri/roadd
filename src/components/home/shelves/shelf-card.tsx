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
  BedDouble,
  Maximize,
} from "lucide-react";
import { cn, formatPriceCompact, formatPropertyType } from "@/lib/utils";
import { useFavoritesStore } from "@/stores/favorites-store";
import type { MixedItem } from "@/components/home/mixed-carousel-row";
import {
  type HomeCardStyleId,
  type HomeCardSize,
  getValidCardSize,
} from "@/types/home-section";
import type {
  BorderConfig,
  TypographyConfig,
  ElementConfig,
  CardElementId,
  ImageArrangementConfig,
} from "@/types/shelf-builder";
import {
  borderConfigToStyles,
  typographyConfigToStyles,
  getSplitRatioPercentages,
} from "@/lib/shelf-builder-styles";

interface ShelfCardProps {
  item: MixedItem & {
    progressPercentage?: number;
    customBadge?: string;
    customHeadline?: string;
    customTagline?: string;
    customPrice?: string;
    customLocation?: string;
    customBhk?: string;
    customArea?: string;
    customDeveloper?: string;
    customStatus?: string;
    customCtaText?: string;
    cardBorder?: BorderConfig;
  };
  itemId?: string;
  selectedItemId?: string | null;
  cardStyle?: HomeCardStyleId;
  cardSizeDesktop?: HomeCardSize;
  cardSizeMobile?: HomeCardSize;
  className?: string;
  index?: number;
  cardBgColor?: string;
  cardTextColor?: string;
  cardAccentColor?: string;
  cardBorder?: BorderConfig;
  imageArrangement?: ImageArrangementConfig;
  elementOrder?: CardElementId[];
  elements?: Partial<Record<CardElementId, ElementConfig>>;
  selectedElementId?: CardElementId | null;
  onSelectElement?: (elementId: CardElementId, itemId?: string) => void;
  customBadge?: string;
  customHeadline?: string;
  customTagline?: string;
  customPrice?: string;
  customLocation?: string;
  customBhk?: string;
  customArea?: string;
  customDeveloper?: string;
  customStatus?: string;
  customCtaText?: string;
  progressPercentage?: number;
  isEditable?: boolean;
  onEditBadge?: () => void;
  onEditHeadline?: () => void;
  onEditTagline?: () => void;
  onEditPrice?: () => void;
  onEditLocation?: () => void;
  onEditBhk?: () => void;
  onEditArea?: () => void;
  onEditDeveloper?: () => void;
  onEditStatus?: () => void;
  onEditCtaText?: () => void;
  onEditBgColor?: () => void;
  onEditTextColor?: () => void;
  onEditAccentColor?: () => void;
  onClick?: (e: React.MouseEvent) => void;
}

export function ShelfCard({
  item,
  itemId,
  selectedItemId,
  cardStyle = "classic-default",
  cardSizeDesktop,
  cardSizeMobile,
  className,
  index = 0,
  cardBgColor,
  cardTextColor,
  cardAccentColor = "#faad13",
  cardBorder,
  imageArrangement,
  elementOrder,
  elements,
  selectedElementId,
  onSelectElement,
  customBadge,
  customHeadline,
  customTagline,
  customPrice,
  customLocation,
  customBhk,
  customArea,
  customDeveloper,
  customStatus,
  customCtaText,
  progressPercentage: propProgressPercentage,
  isEditable = false,
  onEditBadge,
  onEditHeadline,
  onEditTagline,
  onEditPrice,
  onEditLocation,
  onEditBhk,
  onEditArea,
  onEditDeveloper,
  onEditStatus,
  onEditCtaText,
  onEditBgColor,
  onEditTextColor,
  onEditAccentColor,
  onClick,
}: ShelfCardProps) {
  const effectiveItemId = itemId || item.id;
  const isCardActive = isEditable && Boolean(selectedItemId && effectiveItemId === selectedItemId);

  const dSize = getValidCardSize(cardStyle, "desktop", cardSizeDesktop);
  const mSize = getValidCardSize(cardStyle, "mobile", cardSizeMobile);
  const isCompactMobile = mSize === "very-small" || mSize === "small";
  const isCompactDesktop = dSize === "very-small" || dSize === "small";
  const isLargeDesktop = dSize === "big" || dSize === "very-big";

  const { toggleFavorite, isFavorite } = useFavoritesStore();
  const isSaved = isFavorite(item.id);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isEditable) return;
    toggleFavorite(item.id);
  };

  const activeBadge = item.customBadge || customBadge || ((item as any).isRoadExclusive ? "⭐ ROAD Exclusive" : undefined);
  const activeHeadline = item.customHeadline || customHeadline;
  const activeTagline = item.customTagline || customTagline;
  const activePrice = item.customPrice || customPrice;
  const activeLocation = item.customLocation || customLocation;
  const activeBhk = item.customBhk || customBhk;
  const activeArea = item.customArea || customArea;
  const activeDeveloper = item.customDeveloper || customDeveloper;
  const activeStatus = item.customStatus || customStatus;
  const activeCtaText = item.customCtaText || customCtaText || "Explore";
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

  const effectiveCardBorder = item.cardBorder || cardBorder;
  const cardBorderStyles = borderConfigToStyles(effectiveCardBorder);

  const containerStyle: React.CSSProperties = {
    backgroundColor: effectiveBg,
    color: effectiveText,
    ...cardBorderStyles,
  };
  const innerContentStyle: React.CSSProperties = {
    backgroundColor: effectiveBg,
    color: effectiveText,
  };
  const textStyle: React.CSSProperties = { color: effectiveText };
  const accentTextStyle: React.CSSProperties = { color: effectiveAccent };
  const accentBgStyle: React.CSSProperties = {
    backgroundColor: effectiveAccent,
    color: "#0f172a",
  };

  // Visual builder element typography & border helper hooks
  const elTypo = (id: CardElementId): React.CSSProperties => {
    return typographyConfigToStyles(elements?.[id]?.typography);
  };
  const elBorder = (id: CardElementId): React.CSSProperties => {
    return borderConfigToStyles(elements?.[id]?.border);
  };
  const isElVisible = (id: CardElementId): boolean => {
    return elements?.[id]?.visible !== false;
  };
  const getElStyle = (id: CardElementId, baseStyle?: React.CSSProperties): React.CSSProperties => {
    const borderStyle = elBorder(id);
    const typoStyle = elTypo(id);
    const bgStyle: React.CSSProperties = elements?.[id]?.backgroundColor
      ? { backgroundColor: elements[id]?.backgroundColor }
      : {};
    return {
      ...baseStyle,
      ...bgStyle,
      ...borderStyle,
      ...typoStyle,
    };
  };
  const isSelected = (id: CardElementId): boolean => {
    if (!isEditable) return false;
    if (selectedElementId !== id) return false;
    if (selectedItemId && effectiveItemId && selectedItemId !== effectiveItemId) return false;
    return true;
  };

  const handleSelect = (id: CardElementId, fallback?: () => void) => (e: React.MouseEvent) => {
    if (!isEditable) return;
    e.preventDefault();
    e.stopPropagation();
    if (onSelectElement) {
      onSelectElement(id, effectiveItemId);
    }
    if (fallback) {
      fallback();
    }
  };

  const editableElClass = (id: CardElementId, baseClass?: string) => {
    if (!isEditable) return baseClass;
    const selected = isSelected(id);
    return cn(
      baseClass,
      "cursor-pointer transition-all duration-200 relative group/el",
      selected
        ? "ring-2 ring-amber-500 shadow-md shadow-amber-500/25 scale-[1.01] z-10"
        : "hover:ring-1 hover:ring-amber-400/60"
    );
  };

  const renderEditIndicator = (id: CardElementId) => {
    if (!isEditable) return null;
    const selected = isSelected(id);
    if (selected) {
      return (
        <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-amber-500 text-slate-950 text-[9px] font-black uppercase tracking-wider ml-1 shadow-xs animate-pulse">
          ✏️ EDITING
        </span>
      );
    }
    return <span className="opacity-0 group-hover/el:opacity-80 transition-opacity text-[10px] ml-1">✏️</span>;
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
    const computedLocationStr = [locality, city].filter(Boolean).join(", ") || "Andhra Pradesh";
    const locationStr = activeLocation || computedLocationStr;

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
    let computedPriceStr = "";
    if (isProject) {
      const cfgs = item.configurations || [];
      const prices = cfgs
        .flatMap((c) => [c.priceMin, c.priceMax])
        .filter((p): p is number => typeof p === "number" && p > 0);
      if (prices.length > 0) {
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        computedPriceStr =
          min === max
            ? formatPriceCompact(min)
            : `${formatPriceCompact(min)} - ${formatPriceCompact(max)}`;
      } else {
        computedPriceStr = "Price on request";
      }
    } else {
      computedPriceStr = item.price ? formatPriceCompact(item.price) : "Price on request";
    }
    const priceStr = activePrice || computedPriceStr;

    // BHK formatting
    let computedBhkStr = "";
    if (isProject) {
      const bedrooms = Array.from(
        new Set(item.configurations?.map((c) => c.bedrooms).filter(Boolean))
      ).sort((a, b) => Number(a) - Number(b));
      if (bedrooms.length > 0) {
        computedBhkStr = `${bedrooms.join(", ")} BHK`;
      } else {
        computedBhkStr =
          item.projectType === "villa"
            ? "Luxury Villas"
            : item.projectType === "venture"
            ? "Plots"
            : "Apartments";
      }
    } else {
      computedBhkStr = item.bedrooms ? `${item.bedrooms} BHK` : formatPropertyType(item.propertyType);
    }
    const bhkStr = activeBhk || computedBhkStr;

    // Area formatting
    let computedAreaStr = "";
    if (isProject) {
      const areas =
        item.configurations
          ?.flatMap((c) => [c.builtUpAreaMin, c.builtUpAreaMax])
          .filter((a): a is number => typeof a === "number" && a > 0) || [];
      if (areas.length > 0) {
        const minArea = Math.min(...areas);
        const maxArea = Math.max(...areas);
        computedAreaStr =
          minArea === maxArea ? `${minArea} sq.ft.` : `${minArea} - ${maxArea} sq.ft.`;
      }
    } else if (item.area) {
      computedAreaStr = `${item.area} sq.ft.`;
    }
    const areaStr = activeArea || computedAreaStr;

    const tagline = activeTagline || (isProject
      ? item.tagline || "Modern Homes. Greater Possibilities."
      : "Verified Luxury Residence");

    const computedDeveloper = isProject
      ? item.builderName || "Premium Developer"
      : item.postedBy === "owner"
      ? "Owner Listed"
      : "Verified Partner";
    const developer = activeDeveloper || computedDeveloper;

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

    const statusText = activeStatus || (
      isReadyToMove
        ? "Ready to Move"
        : isUnderConstruction
        ? "Under Construction"
        : isNewLaunch
        ? "New Launch"
        : "Verified Listing"
    );

    const ctaText = activeCtaText;

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
      statusText,
      ctaText,
      progressPercentage,
    };
  }, [
    item,
    activeProgress,
    cardStyle,
    activeHeadline,
    activeTagline,
    activePrice,
    activeLocation,
    activeBhk,
    activeArea,
    activeDeveloper,
    activeStatus,
    activeCtaText,
  ]);

  // In editable / preview mode in admin dashboard:
  // Render purely as a <div> with NO Link, NO <a> tag, and NO href.
  // This physically forbids any click navigation or redirect to /properties/... or /projects/...
  const CardRoot = (isEditable ? "div" : Link) as React.ElementType;
  const isContainerSelected = isSelected("container");
  const cardRootProps: Record<string, any> = isEditable
    ? {
        role: "region",
        "aria-label": `Card preview: ${data.title}`,
        onClick: (e: React.MouseEvent) => {
          e.preventDefault();
          if (onSelectElement) {
            onSelectElement("container", effectiveItemId);
          } else if (onClick) {
            onClick(e);
          }
        },
      }
    : {
        href: data.href,
      };

  // ──────────────────────────────────────────────────────────────────────────
  // 0. CLASSIC DEFAULT (Original Card Style before shelf revamp)
  // ──────────────────────────────────────────────────────────────────────────
  if (cardStyle === "classic-default" || cardStyle === ("default" as any)) {
    return (
      <CardRoot
        {...cardRootProps}
        style={containerStyle}
        className={cn(
          "group relative flex flex-col h-full rounded-2xl overflow-hidden bg-white border border-slate-200/90 shadow-xs hover:shadow-xl hover:border-amber-400/60 transition-all duration-300",
          isCardActive && "ring-2 ring-amber-500 ring-offset-4 ring-offset-slate-950 shadow-2xl shadow-amber-500/20",
          isEditable && "select-none",
          className
        )}
      >
        {/* Top Image: Aspect 16:10 / 4:3 */}
        <div 
          onClick={handleSelect("image")}
          className={cn(
            "relative w-full aspect-[16/10] sm:aspect-[4/3] overflow-hidden bg-slate-100 shrink-0",
            isEditable && "cursor-pointer"
          )}
        >
          <Image
            src={data.primaryImage}
            alt={data.title}
            fill
            sizes="(max-width: 640px) 260px, 320px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

          {/* Top-Left Badge */}
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10">
            <span
              className={editableElClass(
                "badge",
                "px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold shadow-md tracking-wide border border-white/20 backdrop-blur-md"
              )}
              style={getElStyle("badge", accentBgStyle)}
              title={isEditable ? "Click to edit badge text" : undefined}
              onClick={handleSelect("badge", onEditBadge)}
            >
              {isEditable && <span className="mr-0.5 text-[9px]">✏️</span>}
              {activeBadge || (data.isProject ? "New Project" : "Featured")}
              {renderEditIndicator("badge")}
            </span>
          </div>

          {/* Top-Right Favorite Button */}
          <button
            type="button"
            onClick={handleFavoriteClick}
            aria-label="Save to favorites"
            className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 backdrop-blur-md text-slate-700 hover:text-red-500 transition-all flex items-center justify-center shadow-md z-10"
          >
            <Heart className={cn("w-4 h-4", isSaved && "fill-red-500 text-red-500")} />
          </button>

          {/* Price Tag Overlay on Image bottom-left */}
          <div className="absolute bottom-2 left-2.5 z-10">
            <span
              style={getElStyle("price")}
              className={editableElClass(
                "price",
                "text-white font-extrabold text-base sm:text-lg drop-shadow-md tracking-tight block px-1 rounded"
              )}
              title={isEditable ? "Click to edit price text" : undefined}
              onClick={handleSelect("price", onEditPrice)}
            >
              {isEditable && <span className="mr-1 text-xs opacity-80">✏️</span>}
              {data.priceStr}
              {renderEditIndicator("price")}
            </span>
          </div>

          {/* Photo Count badge on bottom-right */}
          {data.imageCount > 1 && (
            <div className="absolute bottom-2 right-2.5 z-10">
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-black/60 backdrop-blur-md text-white border border-white/10 flex items-center gap-1">
                <Camera className="w-3 h-3" />
                {data.imageCount}
              </span>
            </div>
          )}
        </div>

        {/* Card Body below image */}
        <div
          className={cn(
            "flex flex-col justify-between flex-1 transition-all",
            isCompactMobile ? "p-2.5 gap-1.5" : "p-3 gap-2",
            isCompactDesktop ? "sm:p-3 sm:gap-2" : isLargeDesktop ? "sm:p-4.5 sm:gap-3" : "sm:p-4 sm:gap-2.5",
            isEditable && "hover:outline-dashed hover:outline-1 hover:outline-amber-400/30 cursor-pointer"
          )}
          style={innerContentStyle}
          onClick={isEditable ? (e) => {
            if (e.target === e.currentTarget) {
              e.preventDefault();
              handleSelect("container", onEditBgColor)(e);
            }
          } : undefined}
          title={isEditable ? "Click to choose card background color" : undefined}
        >
          <div>
            {/* Title / Headline */}
            <h4
              style={getElStyle("title", textStyle)}
              className={editableElClass(
                "title",
                cn(
                  "font-extrabold text-slate-900 line-clamp-1 transition-colors group-hover:text-amber-600 rounded px-1",
                  isCompactMobile ? "text-xs" : "text-sm",
                  isCompactDesktop ? "sm:text-sm" : isLargeDesktop ? "sm:text-base font-black" : "sm:text-base"
                )
              )}
              title={isEditable ? "Click to edit title / headline" : undefined}
              onClick={handleSelect("title", onEditHeadline)}
            >
              {isEditable && <span className="mr-1 text-xs opacity-70">✏️</span>}
              {data.title}
              {renderEditIndicator("title")}
            </h4>

            {/* Tagline / Subtitle */}
            {(activeTagline || data.tagline) && (
              <p
                style={getElStyle("subtitle")}
                className={editableElClass(
                  "subtitle",
                  cn(
                    "text-slate-500 line-clamp-1 rounded px-1",
                    isCompactMobile ? "text-[10px] mt-0.5" : "text-[11px] mt-0.5"
                  )
                )}
                title={isEditable ? "Click to edit tagline / subtitle" : undefined}
                onClick={handleSelect("subtitle", onEditTagline)}
              >
                {isEditable && <span className="mr-0.5 text-[9px]">✏️</span>}
                {data.tagline}
                {renderEditIndicator("subtitle")}
              </p>
            )}

            {/* Location */}
            <p
              style={getElStyle("location")}
              className={editableElClass(
                "location",
                cn(
                  "text-slate-500 truncate flex items-center gap-1 font-medium rounded px-1",
                  isCompactMobile ? "text-[10px] mt-1" : "text-xs mt-1.5"
                )
              )}
              title={isEditable ? "Click to edit location text" : undefined}
              onClick={handleSelect("location", onEditLocation)}
            >
              <MapPin className={cn("text-amber-500 shrink-0", isCompactMobile ? "w-3 h-3" : "w-3.5 h-3.5")} />
              {isEditable && <span className="mr-0.5 text-[9px]">✏️</span>}
              <span className="truncate">{data.locationStr}</span>
              {renderEditIndicator("location")}
            </p>

            {/* Specs row: BHK & Area */}
            <div className={cn(
              "flex items-center gap-1.5 border-t border-slate-100 font-semibold text-slate-700",
              isCompactMobile ? "mt-1 pt-1.5 text-[10px]" : "mt-2 pt-2 text-xs",
              isCompactDesktop ? "sm:text-xs" : isLargeDesktop ? "sm:text-sm" : "sm:text-xs"
            )}>
              <span
                style={getElStyle("specs")}
                className={editableElClass(
                  "specs",
                  cn(
                    "px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-bold",
                    isCompactMobile ? "text-[10px]" : "text-[11px]"
                  )
                )}
                title={isEditable ? "Click to edit BHK / configuration" : undefined}
                onClick={handleSelect("specs", onEditBhk)}
              >
                {isEditable && <span className="mr-0.5 text-[9px]">✏️</span>}
                {data.bhkStr || "Residential"}
                {renderEditIndicator("specs")}
              </span>

              {data.areaStr && (
                <>
                  <span className="text-slate-300">•</span>
                  <span
                    style={getElStyle("specs")}
                    className={editableElClass(
                      "specs",
                      cn(
                        "text-slate-600 rounded px-1",
                        isCompactMobile ? "text-[10px]" : "text-[11px]"
                      )
                    )}
                    title={isEditable ? "Click to edit area / size" : undefined}
                    onClick={handleSelect("specs", onEditArea)}
                  >
                    {isEditable && <span className="mr-0.5 text-[9px]">✏️</span>}
                    {data.areaStr}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Footer: Developer / Status + CTA */}
          <div className={cn(
            "flex items-center justify-between border-t border-slate-100 mt-1",
            isCompactMobile ? "pt-1.5 text-[10px]" : "pt-2 text-xs"
          )}>
            <span
              style={getElStyle("developer")}
              className={editableElClass(
                "developer",
                cn(
                  "text-slate-500 font-medium truncate flex items-center gap-1 rounded px-1",
                  isCompactMobile ? "max-w-[95px] text-[10px]" : "max-w-[140px] text-[11px]"
                )
              )}
              title={isEditable ? "Click to edit developer / partner text" : undefined}
              onClick={handleSelect("developer", onEditDeveloper)}
            >
              <ShieldCheck className={cn("text-emerald-500 shrink-0", isCompactMobile ? "w-2.5 h-2.5" : "w-3 h-3")} />
              {isEditable && <span className="mr-0.5 text-[9px]">✏️</span>}
              <span className="truncate">{data.developer}</span>
              {renderEditIndicator("developer")}
            </span>

            <span
              className={editableElClass(
                "cta",
                cn(
                  "rounded-lg font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 border border-amber-500/40 transition-colors flex items-center gap-1 shrink-0",
                  isCompactMobile ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
                  isCompactDesktop ? "sm:px-2.5 sm:py-1 sm:text-xs" : isLargeDesktop ? "sm:px-3.5 sm:py-1.5 sm:text-xs" : "sm:px-2.5 sm:py-1 sm:text-xs"
                )
              )}
              style={getElStyle("cta", accentBgStyle)}
              title={isEditable ? "Click to edit CTA button text" : undefined}
              onClick={handleSelect("cta", onEditCtaText)}
            >
              {isEditable && <span className="mr-0.5 text-[9px]">✏️</span>}
              <span>{data.ctaText}</span>
              <ArrowRight className="w-3 h-3" />
              {renderEditIndicator("cta")}
            </span>
          </div>
        </div>
      </CardRoot>
    );
  }

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
          isCardActive && "ring-2 ring-amber-500 ring-offset-4 ring-offset-slate-950 shadow-2xl shadow-amber-500/20",
          isEditable && "select-none",
          className
        )}
      >
        {/* Left Photo */}
        <div 
          onClick={handleSelect("image")}
          className={cn(
            "relative w-full sm:w-[42%] aspect-[4/3] sm:aspect-auto shrink-0 overflow-hidden bg-slate-100",
            isEditable && "cursor-pointer"
          )}
        >
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
            "flex flex-col justify-between flex-1 min-w-0 transition-all",
            isCompactMobile ? "p-2.5" : "p-3",
            isCompactDesktop ? "sm:p-3" : isLargeDesktop ? "sm:p-4.5" : "sm:p-3.5",
            isEditable && "hover:outline-dashed hover:outline-1 hover:outline-amber-400/30 cursor-pointer"
          )}
          style={innerContentStyle}
          onClick={isEditable ? (e) => {
            if (e.target === e.currentTarget) {
              e.preventDefault();
              handleSelect("container", onEditBgColor)(e);
            }
          } : undefined}
          title={isEditable ? "Click to choose card background color" : undefined}
        >
          <div className="space-y-1">
            {/* Badges Row */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {activeBadge ? (
                <span
                  className={editableElClass(
                    "badge",
                    "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black shadow-xs transition-all"
                  )}
                  style={accentBgStyle}
                  title={isEditable ? "Click to edit badge text & color" : undefined}
                  onClick={handleSelect("badge", onEditBadge)}
                >
                  {isEditable && <span className="mr-0.5 text-[9px]">✏️</span>}
                  <Sparkles className="w-3 h-3" /> {activeBadge}
                  {renderEditIndicator("badge")}
                </span>
              ) : data.isVerified ? (
                <span
                  className={editableElClass(
                    "badge",
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-[10px] font-bold text-emerald-700 transition-all"
                  )}
                  title={isEditable ? "Click to edit badge text & color" : undefined}
                  onClick={handleSelect("badge", onEditBadge)}
                >
                  <BadgeCheck className="w-3 h-3" /> Verified
                  {renderEditIndicator("badge")}
                </span>
              ) : data.isRera ? (
                <span
                  className={editableElClass(
                    "badge",
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200/80 text-[10px] font-bold text-blue-700 transition-all"
                  )}
                  title={isEditable ? "Click to edit badge text & color" : undefined}
                  onClick={handleSelect("badge", onEditBadge)}
                >
                  <ShieldCheck className="w-3 h-3" /> RERA
                  {renderEditIndicator("badge")}
                </span>
              ) : (
                <span
                  className={editableElClass(
                    "badge",
                    "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black shadow-xs transition-all"
                  )}
                  style={accentBgStyle}
                  title={isEditable ? "Click to edit badge text & color" : undefined}
                  onClick={handleSelect("badge", onEditBadge)}
                >
                  <Sparkles className="w-3 h-3" /> Featured
                  {renderEditIndicator("badge")}
                </span>
              )}
            </div>

            {/* Title */}
            <h3
              style={getElStyle("title", textStyle)}
              className={editableElClass(
                "title",
                cn(
                  "font-extrabold text-slate-900 line-clamp-1 group-hover:text-amber-600 transition-colors rounded px-1",
                  isCompactMobile ? "text-xs" : "text-sm",
                  isCompactDesktop ? "sm:text-sm" : isLargeDesktop ? "sm:text-base font-black" : "sm:text-sm"
                )
              )}
              title={isEditable ? "Click to edit headline & text color" : undefined}
              onClick={handleSelect("title", onEditHeadline)}
            >
              {isEditable && <span className="mr-1 text-[10px] opacity-75">✏️</span>}
              {data.title}
              {renderEditIndicator("title")}
            </h3>

            {/* Location */}
            <p
              style={getElStyle("location")}
              className={editableElClass(
                "location",
                cn(
                  "text-slate-500 flex items-center gap-1 line-clamp-1 font-medium rounded px-1",
                  isCompactMobile ? "text-[10px]" : "text-[11px]"
                )
              )}
              onClick={handleSelect("location", onEditLocation)}
              title={isEditable ? "Click to edit location" : undefined}
            >
              <MapPin className="w-3 h-3 shrink-0" style={accentTextStyle} />
              <span>{data.locationStr}</span>
              {renderEditIndicator("location")}
            </p>
          </div>

          {/* Price & Specs */}
          <div className="pt-2 border-t border-slate-100 space-y-1">
            <div
              style={getElStyle("price", textStyle)}
              className={editableElClass(
                "price",
                cn(
                  "font-black tracking-tight text-slate-950 rounded px-1",
                  isCompactMobile ? "text-sm" : "text-base",
                  isCompactDesktop ? "sm:text-base" : isLargeDesktop ? "sm:text-xl" : "sm:text-lg"
                )
              )}
              onClick={handleSelect("price", onEditPrice)}
              title={isEditable ? "Click to edit price" : undefined}
            >
              {data.priceStr}
              {renderEditIndicator("price")}
            </div>

            <div className={cn(
              "flex items-center justify-between gap-2 text-slate-600 font-semibold",
              isCompactMobile ? "text-[10px]" : "text-[11px]"
            )}>
              <div
                style={getElStyle("specs")}
                className={editableElClass("specs", "flex items-center gap-1.5 truncate rounded px-1")}
                onClick={handleSelect("specs", onEditBhk)}
                title={isEditable ? "Click to edit BHK & area" : undefined}
              >
                {data.bhkStr && <span style={textStyle}>{data.bhkStr}</span>}
                {data.bhkStr && data.areaStr && <span>•</span>}
                {data.areaStr && <span>{data.areaStr}</span>}
                {renderEditIndicator("specs")}
              </div>

              {/* Ready pill / arrow */}
              <div className="flex items-center gap-1.5 shrink-0">
                {data.isReadyToMove && (
                  <span
                    className={editableElClass(
                      "specs",
                      "px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-extrabold border border-emerald-200/60"
                    )}
                    onClick={handleSelect("specs", onEditStatus)}
                    title={isEditable ? "Click to edit status" : undefined}
                  >
                    Ready
                  </span>
                )}
                <div
                  className={editableElClass(
                    "cta",
                    "w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center transition-all"
                  )}
                  style={getElStyle("cta", { backgroundColor: `${effectiveAccent}25`, color: effectiveAccent })}
                  title={isEditable ? "Click to choose accent color / button" : undefined}
                  onClick={handleSelect("cta", onEditCtaText)}
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
          isCardActive && "ring-2 ring-amber-500 ring-offset-4 ring-offset-slate-950 shadow-2xl shadow-amber-500/20",
          isEditable && "select-none",
          className
        )}
      >
        {/* Top Architectural Photo */}
        <div 
          onClick={handleSelect("image")}
          className={cn(
            "relative aspect-[4/3] w-full overflow-hidden bg-slate-100",
            isEditable && "cursor-pointer"
          )}
        >
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
              className={editableElClass(
                "badge",
                "px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider shadow-md flex items-center gap-1 transition-all"
              )}
              style={getElStyle("badge", accentBgStyle)}
              title={isEditable ? "Click to edit badge text & color" : undefined}
              onClick={handleSelect("badge", onEditBadge)}
            >
              {isEditable && <span className="mr-0.5 text-[9px]">✏️</span>}
              <Sparkles className="w-3 h-3" /> {activeBadge || (data.isNewLaunch ? "New Launch" : "Premium")}
              {renderEditIndicator("badge")}
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
          style={innerContentStyle}
          className={cn(
            "bg-white flex flex-col justify-between flex-1 transition-all",
            isCompactMobile ? "p-3 space-y-2" : "p-3.5 space-y-2.5",
            isCompactDesktop ? "sm:p-3.5 sm:space-y-2.5" : isLargeDesktop ? "sm:p-5 sm:space-y-3.5" : "sm:p-4 sm:space-y-3",
            isEditable && "hover:outline-dashed hover:outline-1 hover:outline-amber-400/40 cursor-pointer"
          )}
          onClick={isEditable ? (e) => {
            if (e.target === e.currentTarget) {
              e.preventDefault();
              handleSelect("container", onEditBgColor)(e);
            }
          } : undefined}
          title={isEditable ? "Click to choose card background color" : undefined}
        >
          <div className="space-y-1">
            <div
              style={getElStyle("price", textStyle)}
              className={editableElClass(
                "price",
                cn(
                  "font-black tracking-tight text-slate-950 rounded px-1",
                  isCompactMobile ? "text-lg" : "text-xl",
                  isCompactDesktop ? "sm:text-xl" : isLargeDesktop ? "sm:text-3xl" : "sm:text-2xl"
                )
              )}
              onClick={handleSelect("price", onEditPrice)}
              title={isEditable ? "Click to edit price" : undefined}
            >
              {data.priceStr}
              {renderEditIndicator("price")}
            </div>
            <h3
              style={getElStyle("title", textStyle)}
              className={editableElClass(
                "title",
                cn(
                  "font-heading font-extrabold line-clamp-1 text-slate-900 group-hover:text-amber-600 transition-colors rounded px-1",
                  isCompactMobile ? "text-xs" : "text-sm",
                  isCompactDesktop ? "sm:text-sm" : isLargeDesktop ? "sm:text-lg" : "sm:text-base"
                )
              )}
              title={isEditable ? "Click to edit headline & text color" : undefined}
              onClick={handleSelect("title", onEditHeadline)}
            >
              {isEditable && <span className="mr-1 text-[10px] opacity-75">✏️</span>}
              {data.title}
              {renderEditIndicator("title")}
            </h3>
            <p
              style={getElStyle("location")}
              className={editableElClass(
                "location",
                cn(
                  "text-slate-500 font-medium flex items-center gap-1 rounded px-1",
                  isCompactMobile ? "text-[10px]" : "text-xs"
                )
              )}
              onClick={handleSelect("location", onEditLocation)}
              title={isEditable ? "Click to edit location" : undefined}
            >
              <MapPin className="w-3.5 h-3.5 shrink-0" style={accentTextStyle} />
              <span className="line-clamp-1">{data.locationStr}</span>
              {renderEditIndicator("location")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-1.5 sm:gap-2 text-xs">
            <div 
              onClick={handleSelect("specs", onEditBhk)}
              style={getElStyle("specs")}
              className={editableElClass(
                "specs",
                cn("rounded-xl bg-slate-50 border border-slate-200/80 cursor-pointer transition-all", isCompactMobile ? "p-1.5" : "p-2 sm:p-2.5")
              )}
            >
              <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-500 block">Config</span>
              <span style={textStyle} className={cn("font-extrabold text-slate-900 truncate block", isCompactMobile ? "text-xs" : "text-xs sm:text-sm")}>
                {data.bhkStr || "Available"}
                {renderEditIndicator("specs")}
              </span>
            </div>
            <div 
              onClick={handleSelect("specs", onEditArea)}
              style={getElStyle("specs")}
              className={editableElClass(
                "specs",
                cn("rounded-xl bg-slate-50 border border-slate-200/80 cursor-pointer transition-all", isCompactMobile ? "p-1.5" : "p-2 sm:p-2.5")
              )}
            >
              <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-500 block">Area</span>
              <span style={textStyle} className={cn("font-extrabold text-slate-900 truncate block", isCompactMobile ? "text-xs" : "text-xs sm:text-sm")}>
                {data.areaStr || "Spacious"}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span 
              onClick={handleSelect("badge", onEditStatus)}
              style={getElStyle("badge")}
              className={editableElClass("badge", "text-[11px] text-slate-700 font-semibold flex items-center gap-1 rounded px-1")}
            >
              <Calendar className="w-3.5 h-3.5" style={accentTextStyle} />
              {data.isReadyToMove ? "Ready to Move" : "Possession Soon"}
            </span>

            {data.isRera ? (
              <span 
                onClick={handleSelect("badge", onEditBadge)}
                style={getElStyle("badge")}
                className={editableElClass("badge", "text-[11px] text-emerald-600 font-extrabold flex items-center gap-1 rounded px-1")}
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> RERA Approved
              </span>
            ) : (
              <span 
                onClick={handleSelect("badge", onEditBadge)}
                style={getElStyle("badge", accentTextStyle)}
                className={editableElClass("badge", "text-[11px] font-extrabold flex items-center gap-1 rounded px-1")}
              >
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
          isCardActive && "ring-2 ring-amber-500 ring-offset-4 ring-offset-slate-950 shadow-2xl shadow-amber-500/20",
          isEditable && "select-none",
          className
        )}
      >
        {/* Cinematic Panoramic Photo Area */}
        <div 
          onClick={handleSelect("image")}
          className={cn(
            "relative md:w-[60%] aspect-[16/9] md:aspect-auto min-h-[220px] overflow-hidden bg-slate-950",
            isEditable && "cursor-pointer"
          )}
        >
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
                className={editableElClass(
                  "badge",
                  "px-3.5 py-1 rounded-full font-black text-[11px] tracking-wide shadow-md transition-all"
                )}
                style={accentBgStyle}
                title={isEditable ? "Click to edit badge text & color" : undefined}
                onClick={handleSelect("badge", onEditBadge)}
              >
                {isEditable && <span className="mr-1 text-[10px]">✏️</span>}
                {activeBadge || "Featured Campaign"}
                {renderEditIndicator("badge")}
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
                className={editableElClass(
                  "title",
                  "font-serif text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight transition-all rounded-lg p-1"
                )}
                title={isEditable ? "Click to edit headline & text color" : undefined}
                onClick={handleSelect("title", onEditHeadline)}
              >
                {isEditable && <span className="inline-block mr-1 text-xs opacity-75">✏️</span>}
                {customHeadline || "A Higher Standard of Living"}
                {renderEditIndicator("title")}
              </p>
              <p
                style={item.cardTextColor ? { color: effectiveText } : undefined}
                className={editableElClass(
                  "subtitle",
                  "text-xs sm:text-sm text-slate-200 font-medium max-w-md line-clamp-1 transition-all rounded-lg p-1"
                )}
                title={isEditable ? "Click to edit tagline & text color" : undefined}
                onClick={handleSelect("subtitle", onEditTagline)}
              >
                {isEditable && <span className="inline-block mr-1 text-[10px] opacity-75">✏️</span>}
                {customTagline || data.tagline}
                {renderEditIndicator("subtitle")}
              </p>

              {/* Feature Pill Boxes Overlay */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap pt-2">
                <span className="px-2.5 py-1 rounded-xl bg-slate-950/70 backdrop-blur-md border border-white/20 text-[10px] sm:text-[11px] font-bold text-white flex items-center gap-1.5 shadow-sm">
                  <Building2 className="w-3 h-3 text-amber-400" />
                  <span>Luxury Residence</span>
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-slate-950/70 backdrop-blur-md border border-white/20 text-[10px] sm:text-[11px] font-bold text-white flex items-center gap-1.5 shadow-sm">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>Verified Partner</span>
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-slate-950/70 backdrop-blur-md border border-white/20 text-[10px] sm:text-[11px] font-bold text-white flex items-center gap-1.5 shadow-sm">
                  <ShieldCheck className="w-3 h-3 text-sky-400" />
                  <span>RoadFacing Verified</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right / Bottom Luxury Information Strip */}
        <div
          style={innerContentStyle}
          className={cn(
            "md:w-[40%] p-5 sm:p-6 bg-white flex flex-col justify-between space-y-4 min-w-[260px] transition-all",
            isEditable && "hover:outline-dashed hover:outline-1 hover:outline-amber-400/40 cursor-pointer"
          )}
          onClick={isEditable ? (e) => {
            if (e.target === e.currentTarget) {
              e.preventDefault();
              handleSelect("container", onEditBgColor)(e);
            }
          } : undefined}
          title={isEditable ? "Click to choose card background color" : undefined}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={editableElClass(
                "developer",
                "w-12 h-12 rounded-2xl bg-white font-heading font-black text-lg flex items-center justify-center border shadow-sm shrink-0 transition-all p-1.5 overflow-hidden"
              )}
              style={getElStyle("developer", { borderColor: `${effectiveAccent}60`, color: effectiveAccent })}
              title={isEditable ? "Click to edit developer & logo" : undefined}
              onClick={handleSelect("developer", onEditDeveloper)}
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
                style={getElStyle("title", textStyle)}
                className={editableElClass(
                  "title",
                  "font-black text-lg text-slate-900 line-clamp-1 group-hover:text-amber-500 transition-colors rounded px-1"
                )}
                title={isEditable ? "Click to edit title override & text color" : undefined}
                onClick={handleSelect("title", onEditHeadline)}
              >
                {data.title}
                {renderEditIndicator("title")}
              </h3>
              <p
                className={editableElClass(
                  "developer",
                  "text-xs text-slate-500 font-medium truncate rounded px-1"
                )}
                onClick={handleSelect("developer", onEditDeveloper)}
                title={isEditable ? "Click to edit developer" : undefined}
              >
                By {data.developer || "Verified Partner"}
                {renderEditIndicator("developer")}
              </p>
            </div>
          </div>

          <div
            className={editableElClass("price", "space-y-1.5 min-w-0 rounded p-1")}
            onClick={handleSelect("price", onEditPrice)}
            title={isEditable ? "Click to edit price" : undefined}
          >
            <div style={getElStyle("price", textStyle)} className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950">
              {data.priceStr}
              {renderEditIndicator("price")}
            </div>
            <p 
              style={getElStyle("location")}
              onClick={handleSelect("location", onEditLocation)}
              className={editableElClass("location", "text-xs text-slate-500 flex items-center gap-1 font-medium truncate rounded px-1")}
            >
              <MapPin className="w-3.5 h-3.5 shrink-0" style={accentTextStyle} />
              <span className="truncate">{data.locationStr}</span>
              {renderEditIndicator("location")}
            </p>
          </div>

          {/* 📦 Key Specifications / Feature Boxes */}
          <div className="grid grid-cols-3 gap-2 py-1">
            {/* Box 1: Configuration / BHK */}
            <div
              style={getElStyle("specs")}
              className={editableElClass(
                "specs",
                "flex flex-col items-start justify-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 transition-all shadow-xs min-w-0 cursor-pointer"
              )}
              title={isEditable ? "Click to edit configuration" : undefined}
              onClick={handleSelect("specs", onEditBhk)}
            >
              <div className="flex items-center gap-1 text-slate-400 mb-0.5">
                <BedDouble className="w-3 h-3 text-amber-500 shrink-0" />
                <span className="text-[9px] uppercase font-black tracking-wider">Type</span>
              </div>
              <span style={textStyle} className="text-[11px] sm:text-xs font-black text-slate-900 dark:text-white truncate w-full">
                {data.bhkStr || "1 BHK"}
                {renderEditIndicator("specs")}
              </span>
            </div>

            {/* Box 2: Super Area */}
            <div
              style={getElStyle("specs")}
              className={editableElClass(
                "specs",
                "flex flex-col items-start justify-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 transition-all shadow-xs min-w-0 cursor-pointer"
              )}
              title={isEditable ? "Click to edit area" : undefined}
              onClick={handleSelect("specs", onEditArea)}
            >
              <div className="flex items-center gap-1 text-slate-400 mb-0.5">
                <Maximize className="w-3 h-3 text-blue-500 shrink-0" />
                <span className="text-[9px] uppercase font-black tracking-wider">Area</span>
              </div>
              <span style={textStyle} className="text-[11px] sm:text-xs font-black text-slate-900 dark:text-white truncate w-full">
                {data.areaStr || "750 sq.ft."}
              </span>
            </div>

            {/* Box 3: Status / Possession */}
            <div
              style={getElStyle("specs")}
              className={editableElClass(
                "specs",
                "flex flex-col items-start justify-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 transition-all shadow-xs min-w-0 cursor-pointer"
              )}
              title={isEditable ? "Click to edit status" : undefined}
              onClick={handleSelect("specs", onEditStatus)}
            >
              <div className="flex items-center gap-1 text-slate-400 mb-0.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                <span className="text-[9px] uppercase font-black tracking-wider">Status</span>
              </div>
              <span className="text-[11px] sm:text-xs font-black text-emerald-600 dark:text-emerald-400 truncate w-full">
                {activeStatus || (data.isReadyToMove ? "Ready" : data.isRera ? "RERA" : "Verified")}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs min-w-0">
            <span className="text-[11px] text-slate-400 font-semibold truncate flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
              <span>Verified Listing</span>
            </span>

            <div
              className={editableElClass(
                "cta",
                "px-4 py-2 rounded-xl font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-xs shrink-0 hover:brightness-105 active:scale-95"
              )}
              style={getElStyle("cta", accentBgStyle)}
              title={isEditable ? "Click to edit CTA button text & color" : undefined}
              onClick={handleSelect("cta", onEditCtaText)}
            >
              <span>{activeCtaText || "Explore"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
              {renderEditIndicator("cta")}
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
          isCardActive && "ring-2 ring-amber-500 ring-offset-4 ring-offset-slate-950 shadow-2xl shadow-amber-500/20",
          isEditable && "select-none",
          className
        )}
      >
        {/* Left: Dual Stacked Images */}
        <div 
          onClick={handleSelect("image")}
          className={cn("md:w-[50%] flex flex-col min-h-[220px] shrink-0", isEditable && "cursor-pointer")}
        >
          <div className="relative h-1/2 w-full overflow-hidden bg-slate-100 border-b border-white/20">
            <Image
              src={data.primaryImage}
              alt={data.title}
              fill
              sizes="(max-width: 768px) 100vw, 400px"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-108"
            />
            <div
              className={editableElClass(
                "badge",
                "absolute top-3 left-3 px-3 py-1 rounded-full font-black text-[11px] shadow-md flex items-center gap-1 transition-all"
              )}
              style={accentBgStyle}
              title={isEditable ? "Click to edit badge text & color" : undefined}
              onClick={handleSelect("badge", onEditBadge)}
            >
              {isEditable && <span className="mr-0.5 text-[9px]">✏️</span>}
              <Sparkles className="w-3 h-3" /> {activeBadge || "Premium"}
              {renderEditIndicator("badge")}
            </div>
          </div>
          <div 
            onClick={handleSelect("image_secondary")}
            className="relative h-1/2 w-full overflow-hidden bg-slate-200"
          >
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
          style={innerContentStyle}
          className={cn(
            "md:w-[50%] p-5 sm:p-6 bg-white flex flex-col justify-between space-y-4 transition-all",
            isEditable && "hover:outline-dashed hover:outline-1 hover:outline-amber-400/40 cursor-pointer"
          )}
          onClick={isEditable ? (e) => {
            if (e.target === e.currentTarget) {
              e.preventDefault();
              handleSelect("container", onEditBgColor)(e);
            }
          } : undefined}
          title={isEditable ? "Click to choose card background color" : undefined}
        >
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span
                className={editableElClass(
                  "subtitle",
                  "text-[11px] font-bold uppercase tracking-wider rounded px-1"
                )}
                style={getElStyle("subtitle", accentTextStyle)}
                title={isEditable ? "Click to edit tagline & text color" : undefined}
                onClick={handleSelect("subtitle", onEditTagline)}
              >
                {isEditable && <span className="mr-1 text-[9px]">✏️</span>}
                {customTagline || "Live Above Ordinary"}
                {renderEditIndicator("subtitle")}
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
              style={getElStyle("title", textStyle)}
              className={editableElClass(
                "title",
                "font-heading font-black text-xl text-slate-900 line-clamp-1 group-hover:text-amber-600 transition-colors rounded px-1"
              )}
              title={isEditable ? "Click to edit headline & text color" : undefined}
              onClick={handleSelect("title", onEditHeadline)}
            >
              {isEditable && <span className="mr-1 text-[10px] opacity-75">✏️</span>}
              {data.title}
              {renderEditIndicator("title")}
            </h3>
            <p
              style={getElStyle("location")}
              className={editableElClass("location", "text-xs text-slate-500 flex items-center gap-1 rounded px-1")}
              onClick={handleSelect("location", onEditLocation)}
              title={isEditable ? "Click to edit location" : undefined}
            >
              <MapPin className="w-3 h-3 shrink-0" style={accentTextStyle} />
              <span>{data.locationStr}</span>
              {renderEditIndicator("location")}
            </p>
          </div>

          <div className="space-y-1">
            <div
              style={getElStyle("price", textStyle)}
              className={editableElClass("price", "text-2xl font-black tracking-tight text-slate-950 rounded px-1")}
              onClick={handleSelect("price", onEditPrice)}
              title={isEditable ? "Click to edit price" : undefined}
            >
              {data.priceStr}
              {renderEditIndicator("price")}
            </div>
            <div
              style={getElStyle("specs")}
              className={editableElClass("specs", "flex items-center gap-2 text-xs font-semibold text-slate-600 rounded px-1")}
              onClick={handleSelect("specs", onEditBhk)}
              title={isEditable ? "Click to edit specs & BHK" : undefined}
            >
              {data.bhkStr && <span style={textStyle}>{data.bhkStr}</span>}
              {data.bhkStr && data.areaStr && <span>•</span>}
              {data.areaStr && <span>{data.areaStr}</span>}
              {renderEditIndicator("specs")}
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
              <span 
                style={getElStyle("developer")}
                onClick={handleSelect("developer", onEditDeveloper)}
                className={editableElClass("developer", "text-[11px] text-slate-500 font-semibold rounded px-1")}
              >
                {data.developer}
                {renderEditIndicator("developer")}
              </span>
              <span
                className={editableElClass(
                  "cta",
                  "px-3 py-1.5 rounded-xl font-extrabold text-xs flex items-center gap-1 shadow-xs transition-all"
                )}
                style={accentBgStyle}
                title={isEditable ? "Click to edit CTA button text" : undefined}
                onClick={handleSelect("cta", onEditCtaText)}
              >
                <span>View Details</span>
                <ArrowRight className="w-3 h-3" />
                {renderEditIndicator("cta")}
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
          isCardActive && "ring-2 ring-amber-500 ring-offset-4 ring-offset-slate-950 shadow-2xl shadow-amber-500/20",
          isEditable && "select-none",
          className
        )}
      >
        {/* Full-bleed Photo */}
        <div 
          onClick={handleSelect("image")}
          className={cn("relative aspect-[4/3] w-full overflow-hidden bg-slate-100", isEditable && "cursor-pointer")}
        >
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
              className={editableElClass(
                "badge",
                "px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wide shadow-md transition-all"
              )}
              style={getElStyle("badge", accentBgStyle)}
              title={isEditable ? "Click to edit badge text & color" : undefined}
              onClick={handleSelect("badge", onEditBadge)}
            >
              {isEditable && <span className="mr-0.5 text-[9px]">✏️</span>}
              {activeBadge || "Featured"}
              {renderEditIndicator("badge")}
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
          style={innerContentStyle}
          className={cn(
            "relative -mt-10 sm:-mt-12 mx-3 sm:mx-4 mb-3 p-4 sm:p-5 rounded-2xl bg-white shadow-xl border border-slate-200 z-10 space-y-3 transition-all",
            isEditable && "hover:outline-dashed hover:outline-1 hover:outline-amber-400/40 cursor-pointer"
          )}
          onClick={isEditable ? (e) => {
            if (e.target === e.currentTarget) {
              e.preventDefault();
              handleSelect("container", onEditBgColor)(e);
            }
          } : undefined}
          title={isEditable ? "Click to choose card background color" : undefined}
        >
          {/* Overlapping Circular Project Logo */}
          <div
            className={editableElClass(
              "developer",
              "absolute -top-8 left-4 sm:left-5 w-16 h-16 sm:w-18 sm:h-18 rounded-full border-2 shadow-xl bg-white p-2 flex items-center justify-center overflow-hidden transition-all z-20"
            )}
            style={getElStyle("developer", { borderColor: effectiveAccent, color: effectiveAccent })}
            title={isEditable ? "Click to edit developer & logo" : undefined}
            onClick={handleSelect("developer", onEditDeveloper)}
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
              style={getElStyle("title", textStyle)}
              className={editableElClass(
                "title",
                "font-heading font-black text-lg sm:text-xl text-slate-900 line-clamp-1 group-hover:text-amber-600 transition-colors rounded px-1"
              )}
              title={isEditable ? "Click to edit headline & text color" : undefined}
              onClick={handleSelect("title", onEditHeadline)}
            >
              {isEditable && <span className="mr-1 text-[10px] opacity-75">✏️</span>}
              {data.title}
              {renderEditIndicator("title")}
            </h3>
            <p
              style={getElStyle("location")}
              className={editableElClass("location", "text-xs text-slate-500 font-medium rounded px-1")}
              onClick={handleSelect("location", onEditLocation)}
              title={isEditable ? "Click to edit location" : undefined}
            >
              {data.bhkStr ? `${data.bhkStr}, ` : ""}
              {data.locationStr}
              {renderEditIndicator("location")}
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <div
              style={getElStyle("price", textStyle)}
              className={editableElClass("price", "text-lg sm:text-xl font-black tracking-tight text-slate-950 rounded px-1")}
              onClick={handleSelect("price", onEditPrice)}
              title={isEditable ? "Click to edit price" : undefined}
            >
              {data.priceStr}
              {renderEditIndicator("price")}
            </div>
            <div
              className={editableElClass(
                "cta",
                "w-7 h-7 rounded-full bg-slate-100 text-slate-900 transition-all flex items-center justify-center"
              )}
              style={getElStyle("cta", { backgroundColor: `${effectiveAccent}25`, color: effectiveAccent })}
              title={isEditable ? "Click to edit CTA button & color" : undefined}
              onClick={handleSelect("cta", onEditCtaText)}
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
          isCardActive && "ring-2 ring-amber-500 ring-offset-4 ring-offset-slate-950 shadow-2xl shadow-amber-500/20",
          isEditable && "select-none",
          className
        )}
      >
        {/* Villa Photo */}
        <div 
          onClick={handleSelect("image")}
          className={cn("relative aspect-[16/10] w-full overflow-hidden bg-slate-100", isEditable && "cursor-pointer")}
        >
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
              className={editableElClass(
                "badge",
                "px-2.5 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1 shadow-md transition-all"
              )}
              style={getElStyle("badge", accentBgStyle)}
              title={isEditable ? "Click to edit badge text & color" : undefined}
              onClick={handleSelect("badge", onEditBadge)}
            >
              {isEditable && <span className="mr-0.5 text-[9px]">✏️</span>}
              <Compass className="w-3 h-3" /> {activeBadge || "3D Tour"}
              {renderEditIndicator("badge")}
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
          style={innerContentStyle}
          className={cn(
            "p-4 sm:p-5 flex flex-col justify-between flex-1 space-y-3 bg-white transition-all",
            isEditable && "hover:outline-dashed hover:outline-1 hover:outline-amber-400/40 cursor-pointer"
          )}
          onClick={isEditable ? (e) => {
            if (e.target === e.currentTarget) {
              e.preventDefault();
              handleSelect("container", onEditBgColor)(e);
            }
          } : undefined}
          title={isEditable ? "Click to choose card background color" : undefined}
        >
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <h3
                style={getElStyle("title", textStyle)}
                className={editableElClass(
                  "title",
                  "font-heading font-black text-base sm:text-lg text-slate-900 line-clamp-1 group-hover:text-amber-600 transition-colors rounded px-1"
                )}
                title={isEditable ? "Click to edit headline & text color" : undefined}
                onClick={handleSelect("title", onEditHeadline)}
              >
                {isEditable && <span className="mr-1 text-[10px] opacity-75">✏️</span>}
                {data.title}
                {renderEditIndicator("title")}
              </h3>
              <span
                style={getElStyle("price", textStyle)}
                className={editableElClass("price", "text-base sm:text-lg font-black shrink-0 ml-2 text-slate-950 rounded px-1")}
                onClick={handleSelect("price", onEditPrice)}
                title={isEditable ? "Click to edit price" : undefined}
              >
                {data.priceStr}
                {renderEditIndicator("price")}
              </span>
            </div>
            <p
              style={getElStyle("location")}
              className={editableElClass("location", "text-xs text-slate-500 flex items-center gap-1 rounded px-1")}
              onClick={handleSelect("location", onEditLocation)}
              title={isEditable ? "Click to edit location" : undefined}
            >
              <MapPin className="w-3.5 h-3.5 shrink-0" style={accentTextStyle} />
              <span>{data.locationStr}</span>
              {renderEditIndicator("location")}
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
              style={getElStyle("specs", textStyle)}
              className={editableElClass("specs", "text-slate-600 font-semibold rounded px-1")}
              onClick={handleSelect("specs", onEditBhk)}
              title={isEditable ? "Click to edit specs" : undefined}
            >
              {data.bhkStr || "4 BHK"} • {data.areaStr || "3200 sq.ft."}
              {renderEditIndicator("specs")}
            </span>

            <span
              style={getElStyle("cta", accentTextStyle)}
              className={editableElClass("cta", "font-black flex items-center gap-1 group-hover:translate-x-0.5 transition-transform p-1 rounded-lg")}
              title={isEditable ? "Click to edit CTA button & color" : undefined}
              onClick={handleSelect("cta", onEditCtaText)}
            >
              Know More <ArrowRight className="w-3.5 h-3.5" />
              {renderEditIndicator("cta")}
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
          isCardActive && "ring-2 ring-amber-500 ring-offset-4 ring-offset-slate-950 shadow-2xl shadow-amber-500/20",
          isEditable && "select-none",
          className
        )}
      >
        {/* Elevation Photo */}
        <div 
          onClick={handleSelect("image")}
          className={cn(
            "relative aspect-[4/3] w-full overflow-hidden bg-slate-100",
            isEditable && "cursor-pointer"
          )}
        >
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
              className={editableElClass(
                "badge",
                "px-2.5 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1 shadow-md transition-all"
              )}
              style={getElStyle("badge", accentBgStyle)}
              title={isEditable ? "Click to edit badge text & color" : undefined}
              onClick={handleSelect("badge", onEditBadge)}
            >
              {isEditable && <span className="mr-0.5 text-[9px]">✏️</span>}
              <Zap className="w-3 h-3" /> {activeBadge || "UNDER CONSTRUCTION"}
              {renderEditIndicator("badge")}
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
          style={innerContentStyle}
          className={cn(
            "flex flex-col justify-between flex-1 bg-white transition-all",
            isCompactMobile ? "p-3 space-y-2.5" : "p-3.5 space-y-3",
            isCompactDesktop ? "sm:p-3.5 sm:space-y-3" : isLargeDesktop ? "sm:p-5 sm:space-y-4" : "sm:p-4 sm:space-y-3.5",
            isEditable && "hover:outline-dashed hover:outline-1 hover:outline-amber-400/40 cursor-pointer"
          )}
          onClick={isEditable ? (e) => {
            if (e.target === e.currentTarget) {
              e.preventDefault();
              handleSelect("container", onEditBgColor)(e);
            }
          } : undefined}
          title={isEditable ? "Click to choose card background color" : undefined}
        >
          <div className="space-y-1">
            <h3
              style={getElStyle("title", textStyle)}
              className={editableElClass(
                "title",
                cn(
                  "font-heading font-black text-slate-900 line-clamp-1 group-hover:text-amber-600 transition-colors rounded px-1",
                  isCompactMobile ? "text-xs" : "text-sm",
                  isCompactDesktop ? "sm:text-sm" : isLargeDesktop ? "sm:text-lg" : "sm:text-base"
                )
              )}
              title={isEditable ? "Click to edit headline & text color" : undefined}
              onClick={handleSelect("title", onEditHeadline)}
            >
              {isEditable && <span className="mr-1 text-[10px] opacity-75">✏️</span>}
              {data.title}
              {renderEditIndicator("title")}
            </h3>
            <p
              style={getElStyle("location")}
              className={editableElClass(
                "location",
                cn(
                  "text-slate-500 flex items-center gap-1 font-medium rounded px-1",
                  isCompactMobile ? "text-[10px]" : "text-xs"
                )
              )}
              onClick={handleSelect("location", onEditLocation)}
              title={isEditable ? "Click to edit location" : undefined}
            >
              <MapPin className="w-3.5 h-3.5 shrink-0" style={accentTextStyle} />
              <span>{data.locationStr}</span>
              {renderEditIndicator("location")}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div
              style={getElStyle("price", textStyle)}
              className={editableElClass(
                "price",
                cn(
                  "font-black text-slate-950 rounded px-1",
                  isCompactMobile ? "text-base" : "text-lg",
                  isCompactDesktop ? "sm:text-lg" : isLargeDesktop ? "sm:text-2xl" : "sm:text-xl"
                )
              )}
              onClick={handleSelect("price", onEditPrice)}
              title={isEditable ? "Click to edit price" : undefined}
            >
              {data.priceStr}
              {renderEditIndicator("price")}
            </div>
            <div
              style={getElStyle("specs", textStyle)}
              className={editableElClass(
                "specs",
                cn(
                  "font-bold text-slate-700 rounded px-1",
                  isCompactMobile ? "text-[10px]" : "text-xs"
                )
              )}
              onClick={handleSelect("specs", onEditBhk)}
              title={isEditable ? "Click to edit BHK / specs" : undefined}
            >
              {data.bhkStr}
              {renderEditIndicator("specs")}
            </div>
          </div>

          {/* Construction Progress Bar (Admin Configurable per Project) */}
          <div 
            onClick={handleSelect("progress")}
            style={getElStyle("progress")}
            className={editableElClass(
              "progress",
              "pt-2 sm:pt-3 border-t border-slate-100 space-y-1.5 p-1.5 rounded-xl cursor-pointer"
            )}
            title={isEditable ? "Click to edit construction progress %" : undefined}
          >
            <div className="flex items-center justify-between text-xs font-extrabold">
              <span style={textStyle} className={cn("text-slate-700", isCompactMobile ? "text-[10px]" : "text-xs")}>
                Construction Progress {renderEditIndicator("progress")}
              </span>
              <span className="font-black" style={{ color: "#10b981", fontSize: isCompactMobile ? "11px" : "12px" }}>
                {data.progressPercentage ?? 70}%
              </span>
            </div>
            <div className={cn("w-full rounded-full bg-slate-100 overflow-hidden border border-slate-200/80", isCompactMobile ? "h-2" : "h-2.5")}>
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

  // 8. LUXURY EDITORIAL (Style 08: 520–680px wide, 300–400px high)
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <CardRoot
      {...cardRootProps}
      style={containerStyle}
      onClick={handleSelect("container", onEditBgColor)}
      className={cn(
        "group relative flex flex-col md:flex-row h-full rounded-3xl overflow-hidden bg-white border border-slate-200/90 shadow-xl hover:border-amber-500/60 transition-all duration-500",
        isCardActive && "ring-2 ring-amber-500 ring-offset-2 ring-offset-slate-900 shadow-2xl",
        isEditable && "select-none cursor-pointer",
        className
      )}
    >
      {/* Left Editorial Information Panel */}
      <div
        style={innerContentStyle}
        className={cn(
          "md:w-[45%] p-5 sm:p-6 flex flex-col justify-between space-y-4 bg-white transition-all",
          editableElClass("container", "")
        )}
      >
        <div className="space-y-2">
          <span
            className={editableElClass(
              "badge",
              "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider inline-block shadow-xs transition-all"
            )}
            style={getElStyle("badge", accentBgStyle)}
            title={isEditable ? "Click to edit badge text & color" : undefined}
            onClick={handleSelect("badge", onEditBadge)}
          >
            {activeBadge || "Signature Collection"}
            {renderEditIndicator("badge")}
          </span>
          <h3
            style={getElStyle("title", textStyle)}
            className={editableElClass(
              "title",
              "font-serif text-xl sm:text-2xl font-black text-slate-900 leading-tight transition-all rounded p-1"
            )}
            title={isEditable ? "Click to edit headline" : undefined}
            onClick={handleSelect("title", onEditHeadline)}
          >
            {customHeadline || "Premium Living by the Lake"}
            {renderEditIndicator("title")}
          </h3>
          <p
            style={getElStyle("subtitle")}
            className={editableElClass(
              "subtitle",
              "text-xs text-slate-600 font-medium transition-all rounded px-1"
            )}
            title={isEditable ? "Click to edit tagline" : undefined}
            onClick={handleSelect("subtitle", onEditTagline)}
          >
            {customTagline || (data.bhkStr ? `${data.bhkStr} • ${data.areaStr || "2200–3800 sq.ft."}` : "Exclusive waterfront residences...")}
            {renderEditIndicator("subtitle")}
          </p>
        </div>

        <div className="space-y-1">
          <p
            style={getElStyle("location")}
            className={editableElClass(
              "location",
              "text-xs text-slate-500 flex items-center gap-1 font-medium rounded px-1"
            )}
            onClick={handleSelect("location", onEditTextColor)}
            title={isEditable ? "Click to edit location" : undefined}
          >
            <MapPin className="w-3.5 h-3.5 shrink-0" style={accentTextStyle} />
            <span>{data.locationStr}</span>
            {renderEditIndicator("location")}
          </p>
          <div
            style={getElStyle("price", textStyle)}
            className={editableElClass(
              "price",
              "text-2xl font-black tracking-tight text-slate-950 rounded px-1"
            )}
            onClick={handleSelect("price", onEditPrice)}
            title={isEditable ? "Click to edit price" : undefined}
          >
            {data.priceStr}
            {renderEditIndicator("price")}
          </div>
        </div>

        <div className="pt-2">
          <span
            className={editableElClass(
              "cta",
              "w-full sm:w-auto px-4 py-2 rounded-xl font-black text-xs inline-flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            )}
            style={getElStyle("cta", accentBgStyle)}
            title={isEditable ? "Click to edit button & accent color" : undefined}
            onClick={handleSelect("cta", onEditAccentColor)}
          >
            <span>{data.ctaText || "Discover"}</span>
            <ArrowRight className="w-3.5 h-3.5" />
            {renderEditIndicator("cta")}
          </span>
        </div>
      </div>

      {/* Right Lakefront / Luxury Terrace Photo */}
      <div 
        className={editableElClass(
          "image",
          "relative md:w-[55%] aspect-[16/10] md:aspect-auto min-h-[200px] overflow-hidden bg-slate-100"
        )}
        onClick={handleSelect("image")}
        title={isEditable ? "Click to edit image" : undefined}
      >
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
        {renderEditIndicator("image")}
      </div>
    </CardRoot>
  );
}

