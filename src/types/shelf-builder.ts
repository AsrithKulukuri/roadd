import type { HomeCardStyleId, HomeCardSize, HomeSectionIconName } from "./home-section";

// ─────────────────────────────────────────────────────────────────────────────
// Complete Border & Outline Configuration
// ─────────────────────────────────────────────────────────────────────────────
export type BorderStyle = "solid" | "dashed" | "dotted" | "double" | "none";

export interface BorderConfig {
  enabled: boolean;
  style: BorderStyle;
  color: string;
  width: number; // in pixels
  opacity?: number; // 0-100
  radius: number; // uniform radius in pixels
  linkCorners?: boolean; // if false, use individual radii
  radiusTopLeft?: number;
  radiusTopRight?: number;
  radiusBottomLeft?: number;
  radiusBottomRight?: number;
  outlineEnabled?: boolean;
  outlineColor?: string;
  outlineWidth?: number;
  outlineOffset?: number;
  shadow?: "none" | "sm" | "md" | "lg" | "xl" | "2xl" | "amber-glow" | "inner";
  hoverColor?: string;
  hoverWidth?: number;
  hoverShadow?: "none" | "sm" | "md" | "lg" | "xl" | "2xl" | "amber-glow";
}

export interface BorderPreset {
  id: string;
  name: string;
  config: BorderConfig;
}

// ─────────────────────────────────────────────────────────────────────────────
// Complete Typography & Text Configuration
// ─────────────────────────────────────────────────────────────────────────────
export type FontWeightNumeric = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
export type TextTransform = "none" | "uppercase" | "lowercase" | "capitalize";
export type TextDecoration = "none" | "underline" | "line-through";
export type TextAlign = "left" | "center" | "right";

export interface TypographyConfig {
  fontFamily?: string;
  fontSize?: number; // numeric value
  fontSizeUnit?: "px" | "rem" | "em";
  fontWeight?: FontWeightNumeric;
  fontStyle?: "normal" | "italic";
  textColor?: string;
  textOpacity?: number; // 0-100
  textTransform?: TextTransform;
  textDecoration?: TextDecoration;
  textAlign?: TextAlign;
  lineHeight?: number | string; // e.g. 1.2 or 1.5
  letterSpacing?: number | string; // e.g. -0.02 or 0.5
  lineClamp?: number; // e.g. 1, 2, 3
  textShadow?: "none" | "subtle" | "prominent" | "glow";
  hoverColor?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Individual Element Configuration
// ─────────────────────────────────────────────────────────────────────────────
export type CardElementId =
  | "container"
  | "image"
  | "image_secondary"
  | "badge"
  | "price"
  | "title"
  | "subtitle"
  | "location"
  | "specs"
  | "developer"
  | "progress"
  | "cta"
  | "divider";

export interface ElementConfig {
  id: CardElementId;
  label: string;
  visible: boolean;
  labelOverride?: string;
  typography?: TypographyConfig;
  border?: BorderConfig;
  backgroundColor?: string;
  padding?: string; // e.g. "p-2" or "8px"
  margin?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Advanced Image Arrangement
// ─────────────────────────────────────────────────────────────────────────────
export type ImageArrangementPreset =
  | "single"
  | "split-horizontal"
  | "split-vertical"
  | "three-grid"
  | "four-grid"
  | "thumbnail-strip"
  | "carousel"
  | "main-peek";

export type ImageSplitRatio = "50/50" | "60/40" | "40/60" | "70/30" | "30/70";

export interface ImageArrangementConfig {
  preset: ImageArrangementPreset;
  splitRatio: ImageSplitRatio;
  aspectRatio: "16/10" | "16/9" | "4/3" | "1/1" | "3/4" | "21/9";
  cropMode: "cover" | "contain";
  border?: BorderConfig;
  dividerBorder?: BorderConfig;
  overlayGradient?: "none" | "dark-bottom" | "dark-all" | "amber-subtle";
  overlayOpacity?: number; // 0-100
  enableLightbox?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Content Sourcing & Automatic Filters
// ─────────────────────────────────────────────────────────────────────────────
export type ContentSourceType = "manual" | "automatic" | "hybrid";
export type PinningMode = "manual" | "pinned-first" | "pinned-slots";

export interface AutoFilterConfig {
  listingType?: "all" | "sale" | "rent";
  itemType?: "all" | "property" | "project";
  propertyType?: string[]; // e.g. ["apartment", "villa", "plot"]
  city?: string;
  locality?: string;
  minPrice?: number;
  maxPrice?: number;
  bhk?: string[]; // e.g. ["2 BHK", "3 BHK"]
  readyToMove?: boolean;
  underConstruction?: boolean;
  verifiedOnly?: boolean;
  reraApproved?: boolean;
  featuredOnly?: boolean;
  sortBy?: "newest" | "price-asc" | "price-desc" | "popular";
}

// ─────────────────────────────────────────────────────────────────────────────
// Complete Shelf Definition
// ─────────────────────────────────────────────────────────────────────────────
export type ShelfType = "projects" | "properties" | "rentals" | "commercial" | "custom";
export type ShelfStatus = "published" | "draft" | "hidden";
export type ShelfLayoutType = "carousel" | "grid" | "featured-split";

export interface ShelfListingItem {
  id: string;
  type: "property" | "project";
  isPinned?: boolean;
  pinPosition?: number;
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
  cardBgColor?: string;
  cardTextColor?: string;
  cardAccentColor?: string;
  cardBorder?: BorderConfig;
}

export interface ShelfDefinition {
  id: string;
  name: string; // internal admin name
  title: string; // public heading
  subtitle?: string;
  description?: string;
  eyebrow?: string;
  icon: HomeSectionIconName;
  shelfType: ShelfType;
  isActive: boolean;
  status: ShelfStatus;
  isCustom?: boolean;

  // Header & Section Design
  sectionBgColor?: string;
  sectionBgImage?: string;
  sectionBgOverlay?: string;
  headingAlignment?: "left" | "center" | "right";
  headingSize?: "text-xl" | "text-2xl" | "text-3xl" | "text-4xl";
  headingColor?: string;
  subtitleColor?: string;
  sectionPaddingTop?: number;
  sectionPaddingBottom?: number;
  sectionWidth?: "contained" | "full" | "narrow";
  shelfBorder?: BorderConfig;

  // Content source & listings
  contentSource: ContentSourceType;
  autoFilters?: AutoFilterConfig;
  pinnedIds?: string[];
  pinningMode?: PinningMode;
  maxItems: number;
  items: ShelfListingItem[];

  // Card composition & layout
  cardStyle: HomeCardStyleId;
  layoutType: ShelfLayoutType;
  gridColumnsDesktop: number; // 2, 3, 4
  gridColumnsTablet: number; // 2, 3
  gridColumnsMobile: number; // 1, 2
  cardSizeDesktop?: HomeCardSize;
  cardSizeMobile?: HomeCardSize;
  enableCarousel?: boolean;
  carouselInterval?: number;

  // Styling & Borders
  cardBgColor?: string;
  cardTextColor?: string;
  cardAccentColor?: string;
  cardBorder?: BorderConfig;

  // Image & Elements
  imageArrangement?: ImageArrangementConfig;
  elementOrder?: CardElementId[];
  elements?: Partial<Record<CardElementId, ElementConfig>>;

  // Audit
  updatedAt?: string;
  updatedBy?: string;
}

export interface HomepageLayoutDraftPayload {
  sections: ShelfDefinition[];
  updatedAt?: string;
  updatedBy?: string;
}
