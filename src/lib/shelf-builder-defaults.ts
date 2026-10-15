import type {
  ShelfDefinition,
  BorderPreset,
  BorderConfig,
  TypographyConfig,
  ElementConfig,
  CardElementId,
  ImageArrangementConfig,
} from "@/types/shelf-builder";
import type { Property } from "@/types/property";
import type { Project } from "@/types/project";
import type { MixedItem } from "@/components/home/mixed-carousel-row";

// ─────────────────────────────────────────────────────────────────────────────
// Design Presets: Borders & Outlines
// ─────────────────────────────────────────────────────────────────────────────
export const DEFAULT_BORDER_PRESETS: BorderPreset[] = [
  {
    id: "preset-road-white",
    name: "ROAD Premium White",
    config: {
      enabled: true,
      style: "solid",
      color: "#e2e8f0",
      width: 1,
      opacity: 100,
      radius: 16,
      linkCorners: true,
      shadow: "sm",
      hoverColor: "#f5a623",
      hoverWidth: 1.5,
    },
  },
  {
    id: "preset-road-amber",
    name: "ROAD Amber Accent",
    config: {
      enabled: true,
      style: "solid",
      color: "#f5a623",
      width: 2,
      opacity: 100,
      radius: 16,
      linkCorners: true,
      shadow: "amber-glow",
      outlineEnabled: true,
      outlineColor: "rgba(245, 166, 35, 0.2)",
      outlineWidth: 3,
      outlineOffset: 2,
    },
  },
  {
    id: "preset-minimal-charcoal",
    name: "Minimal Charcoal",
    config: {
      enabled: true,
      style: "solid",
      color: "#2a2a31",
      width: 1,
      opacity: 100,
      radius: 12,
      linkCorners: true,
      shadow: "none",
      hoverColor: "#f5a623",
    },
  },
  {
    id: "preset-soft-luxury",
    name: "Soft Luxury",
    config: {
      enabled: true,
      style: "solid",
      color: "rgba(245, 166, 35, 0.3)",
      width: 1,
      opacity: 80,
      radius: 20,
      linkCorners: true,
      shadow: "lg",
      hoverColor: "#f5a623",
      hoverShadow: "xl",
    },
  },
  {
    id: "preset-rounded-marketplace",
    name: "Rounded Marketplace",
    config: {
      enabled: true,
      style: "solid",
      color: "#cbd5e1",
      width: 1,
      opacity: 100,
      radius: 24,
      linkCorners: true,
      shadow: "md",
    },
  },
  {
    id: "preset-none",
    name: "No Border",
    config: {
      enabled: false,
      style: "none",
      color: "transparent",
      width: 0,
      radius: 16,
      linkCorners: true,
      shadow: "none",
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Design Presets: Approved Font Families & Weights
// ─────────────────────────────────────────────────────────────────────────────
export const APPROVED_FONTS = [
  { id: "Inter", name: "Inter (Brand Modern Sans)", sample: "Real Projects. Real People." },
  { id: "system-ui", name: "System Sans", sample: "Ultra Clean & Native" },
  { id: "Playfair Display", name: "Playfair Display (Luxury Editorial)", sample: "Signature Residences" },
  { id: "Outfit", name: "Outfit (Geometric Contemporary)", sample: "Premium Townships" },
  { id: "Georgia", name: "Georgia (Classic Editorial)", sample: "Verified Approvals" },
  { id: "Fira Code", name: "Fira Code (Technical Mono)", sample: "RERA: P02400003182" },
];

export const APPROVED_WEIGHTS: { value: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900; label: string; desc: string }[] = [
  { value: 100, label: "100 Thin", desc: "Ultra-thin hairline" },
  { value: 200, label: "200 Extra Light", desc: "Delicate aesthetic" },
  { value: 300, label: "300 Light", desc: "Refined subtitle" },
  { value: 400, label: "400 Regular", desc: "Standard body text" },
  { value: 500, label: "500 Medium", desc: "Subtle emphasis" },
  { value: 600, label: "600 Semi Bold", desc: "Strong clarity" },
  { value: 700, label: "700 Bold", desc: "Prominent headlines" },
  { value: 800, label: "800 Extra Bold", desc: "High-impact price" },
  { value: 900, label: "900 Black", desc: "Maximum weight" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Default Card Element Configurations
// ─────────────────────────────────────────────────────────────────────────────
export const DEFAULT_ELEMENT_ORDER: CardElementId[] = [
  "image",
  "badge",
  "price",
  "title",
  "specs",
  "location",
  "developer",
  "progress",
  "cta",
];

export const DEFAULT_ELEMENTS_CONFIG: Record<CardElementId, ElementConfig> = {
  container: {
    id: "container",
    label: "Main Card Container",
    visible: true,
    border: {
      enabled: true,
      style: "solid",
      color: "#e2e8f0",
      width: 1,
      radius: 16,
      linkCorners: true,
      shadow: "sm",
      hoverColor: "#f5a623",
      hoverWidth: 1.5,
    },
    backgroundColor: "#ffffff",
  },
  image: {
    id: "image",
    label: "Primary Image",
    visible: true,
    border: {
      enabled: false,
      style: "none",
      color: "transparent",
      width: 0,
      radius: 12,
      linkCorners: true,
    },
  },
  image_secondary: {
    id: "image_secondary",
    label: "Secondary / Gallery Image",
    visible: true,
    border: {
      enabled: false,
      style: "none",
      color: "transparent",
      width: 0,
      radius: 8,
      linkCorners: true,
    },
  },
  badge: {
    id: "badge",
    label: "Status & Verified Badge",
    visible: true,
    typography: {
      fontFamily: "Inter",
      fontSize: 11,
      fontSizeUnit: "px",
      fontWeight: 700,
      textColor: "#ffffff",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    border: {
      enabled: true,
      style: "solid",
      color: "rgba(255, 255, 255, 0.3)",
      width: 1,
      radius: 9999,
      linkCorners: true,
    },
    backgroundColor: "rgba(15, 23, 42, 0.8)",
  },
  price: {
    id: "price",
    label: "Price Display",
    visible: true,
    typography: {
      fontFamily: "Inter",
      fontSize: 18,
      fontSizeUnit: "px",
      fontWeight: 800,
      textColor: "#0f172a",
      letterSpacing: -0.2,
    },
  },
  title: {
    id: "title",
    label: "Listing Title",
    visible: true,
    typography: {
      fontFamily: "Inter",
      fontSize: 15,
      fontSizeUnit: "px",
      fontWeight: 700,
      textColor: "#0f172a",
      lineClamp: 1,
    },
  },
  subtitle: {
    id: "subtitle",
    label: "Tagline / Subtitle",
    visible: true,
    typography: {
      fontFamily: "Inter",
      fontSize: 12,
      fontSizeUnit: "px",
      fontWeight: 400,
      textColor: "#64748b",
      lineClamp: 2,
    },
  },
  location: {
    id: "location",
    label: "Location Row",
    visible: true,
    typography: {
      fontFamily: "Inter",
      fontSize: 12,
      fontSizeUnit: "px",
      fontWeight: 500,
      textColor: "#64748b",
    },
  },
  specs: {
    id: "specs",
    label: "BHK & Area Specs",
    visible: true,
    typography: {
      fontFamily: "Inter",
      fontSize: 12,
      fontSizeUnit: "px",
      fontWeight: 600,
      textColor: "#475569",
    },
  },
  developer: {
    id: "developer",
    label: "Developer Information",
    visible: true,
    typography: {
      fontFamily: "Inter",
      fontSize: 11,
      fontSizeUnit: "px",
      fontWeight: 600,
      textColor: "#94a3b8",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
  },
  progress: {
    id: "progress",
    label: "Construction Progress Bar",
    visible: true,
    typography: {
      fontFamily: "Inter",
      fontSize: 11,
      fontSizeUnit: "px",
      fontWeight: 700,
      textColor: "#f5a623",
    },
  },
  cta: {
    id: "cta",
    label: "CTA Button",
    visible: true,
    typography: {
      fontFamily: "Inter",
      fontSize: 12,
      fontSizeUnit: "px",
      fontWeight: 700,
      textColor: "#020617",
    },
    border: {
      enabled: false,
      style: "none",
      color: "transparent",
      width: 0,
      radius: 12,
      linkCorners: true,
    },
    backgroundColor: "#f5a623",
  },
  divider: {
    id: "divider",
    label: "Section Divider",
    visible: false,
    border: {
      enabled: true,
      style: "solid",
      color: "#e2e8f0",
      width: 1,
      radius: 0,
    },
  },
};

export const DEFAULT_IMAGE_ARRANGEMENT: ImageArrangementConfig = {
  preset: "single",
  splitRatio: "50/50",
  aspectRatio: "16/10",
  cropMode: "cover",
  border: {
    enabled: false,
    style: "none",
    color: "transparent",
    width: 0,
    radius: 12,
    linkCorners: true,
  },
  dividerBorder: {
    enabled: true,
    style: "solid",
    color: "#ffffff",
    width: 2,
    radius: 0,
  },
  overlayGradient: "dark-bottom",
  overlayOpacity: 70,
};

// ─────────────────────────────────────────────────────────────────────────────
// 8 CANONICAL HOMEPAGE SHELVES (Default Seed)
// ─────────────────────────────────────────────────────────────────────────────
export const CANONICAL_EIGHT_SHELVES: ShelfDefinition[] = [
  {
    id: "recommended",
    name: "Recommended Properties",
    title: "Recommended for You",
    subtitle: "Handpicked verified properties and homes matching high-demand criteria in AP",
    eyebrow: "Personalized Picks",
    icon: "ThumbsUp",
    shelfType: "properties",
    isActive: true,
    status: "published",
    contentSource: "hybrid",
    autoFilters: {
      itemType: "property",
      listingType: "sale",
      verifiedOnly: true,
      sortBy: "popular",
    },
    pinnedIds: [],
    pinningMode: "pinned-first",
    maxItems: 8,
    cardStyle: "compact-marketplace",
    layoutType: "carousel",
    gridColumnsDesktop: 3,
    gridColumnsTablet: 2,
    gridColumnsMobile: 1,
    cardSizeDesktop: "medium",
    cardSizeMobile: "medium",
    enableCarousel: true,
    carouselInterval: 4,
    cardBgColor: "#ffffff",
    cardTextColor: "#0f172a",
    cardAccentColor: "#f5a623",
    cardBorder: { ...DEFAULT_BORDER_PRESETS[0].config },
    imageArrangement: { ...DEFAULT_IMAGE_ARRANGEMENT, preset: "single", aspectRatio: "16/9" },
    elementOrder: [...DEFAULT_ELEMENT_ORDER],
    elements: { ...DEFAULT_ELEMENTS_CONFIG },
    items: [],
  },
  {
    id: "featured",
    name: "Featured High-Rises & Towers",
    title: "Featured Projects",
    subtitle: "RERA approved gated high-rise developments with signature amenities",
    eyebrow: "Top Rated Developments",
    icon: "Star",
    shelfType: "projects",
    isActive: true,
    status: "published",
    contentSource: "hybrid",
    autoFilters: {
      itemType: "project",
      featuredOnly: true,
      reraApproved: true,
      sortBy: "newest",
    },
    pinnedIds: [],
    pinningMode: "pinned-first",
    maxItems: 8,
    cardStyle: "tall-portrait",
    layoutType: "carousel",
    gridColumnsDesktop: 4,
    gridColumnsTablet: 2,
    gridColumnsMobile: 1,
    cardSizeDesktop: "medium",
    cardSizeMobile: "medium",
    enableCarousel: true,
    carouselInterval: 4,
    cardBgColor: "#ffffff",
    cardTextColor: "#0f172a",
    cardAccentColor: "#f5a623",
    cardBorder: { ...DEFAULT_BORDER_PRESETS[3].config },
    imageArrangement: { ...DEFAULT_IMAGE_ARRANGEMENT, preset: "single", aspectRatio: "3/4" },
    elementOrder: [...DEFAULT_ELEMENT_ORDER],
    elements: { ...DEFAULT_ELEMENTS_CONFIG },
    items: [],
  },
  {
    id: "budget-friendly",
    name: "Budget Friendly Listings",
    title: "Budget Friendly Homes",
    subtitle: "Affordable 2 & 3 BHK flats and plots under ₹60 Lakhs in prime growth corridors",
    eyebrow: "Value Real Estate",
    icon: "IndianRupee",
    shelfType: "properties",
    isActive: true,
    status: "published",
    contentSource: "automatic",
    autoFilters: {
      itemType: "property",
      maxPrice: 6000000,
      sortBy: "price-asc",
    },
    pinnedIds: [],
    pinningMode: "pinned-first",
    maxItems: 8,
    cardStyle: "bottom-floating",
    layoutType: "carousel",
    gridColumnsDesktop: 3,
    gridColumnsTablet: 2,
    gridColumnsMobile: 1,
    cardSizeDesktop: "medium",
    cardSizeMobile: "medium",
    enableCarousel: true,
    carouselInterval: 5,
    cardBgColor: "#ffffff",
    cardTextColor: "#0f172a",
    cardAccentColor: "#f5a623",
    cardBorder: { ...DEFAULT_BORDER_PRESETS[0].config },
    imageArrangement: { ...DEFAULT_IMAGE_ARRANGEMENT, preset: "single", aspectRatio: "4/3" },
    elementOrder: [...DEFAULT_ELEMENT_ORDER],
    elements: { ...DEFAULT_ELEMENTS_CONFIG },
    items: [],
  },
  {
    id: "shelf-luxury-high-rises",
    name: "Verified Luxury High-Rises",
    title: "Luxury High-Rises",
    subtitle: "Tower residences with sky lounges, swimming pools, and clubhouse amenities",
    eyebrow: "Skyline Living",
    icon: "Building2",
    shelfType: "projects",
    isActive: true,
    status: "published",
    contentSource: "hybrid",
    autoFilters: {
      itemType: "project",
      propertyType: ["apartment", "penthouse"],
      minPrice: 8000000,
      sortBy: "popular",
    },
    pinnedIds: [],
    pinningMode: "pinned-first",
    maxItems: 8,
    cardStyle: "classic-default",
    layoutType: "carousel",
    gridColumnsDesktop: 4,
    gridColumnsTablet: 2,
    gridColumnsMobile: 1,
    cardSizeDesktop: "medium",
    cardSizeMobile: "medium",
    enableCarousel: true,
    carouselInterval: 4,
    cardBgColor: "#ffffff",
    cardTextColor: "#0f172a",
    cardAccentColor: "#f5a623",
    cardBorder: { ...DEFAULT_BORDER_PRESETS[0].config },
    imageArrangement: { ...DEFAULT_IMAGE_ARRANGEMENT, preset: "single", aspectRatio: "16/10" },
    elementOrder: [...DEFAULT_ELEMENT_ORDER],
    elements: { ...DEFAULT_ELEMENTS_CONFIG },
    items: [],
  },
  {
    id: "shelf-luxury-villas",
    name: "Signature Gated Villas",
    title: "Signature Gated Villas",
    subtitle: "Independent luxury villas, duplexes, and triplex homes in serene gated communities",
    eyebrow: "Bespoke Estates",
    icon: "Castle",
    shelfType: "properties",
    isActive: true,
    status: "published",
    contentSource: "hybrid",
    autoFilters: {
      itemType: "property",
      propertyType: ["villa", "independent-house"],
      sortBy: "price-desc",
    },
    pinnedIds: [],
    pinningMode: "pinned-first",
    maxItems: 8,
    cardStyle: "modern-villa",
    layoutType: "carousel",
    gridColumnsDesktop: 3,
    gridColumnsTablet: 2,
    gridColumnsMobile: 1,
    cardSizeDesktop: "medium",
    cardSizeMobile: "medium",
    enableCarousel: true,
    carouselInterval: 5,
    cardBgColor: "#ffffff",
    cardTextColor: "#0f172a",
    cardAccentColor: "#f5a623",
    cardBorder: { ...DEFAULT_BORDER_PRESETS[1].config },
    imageArrangement: { ...DEFAULT_IMAGE_ARRANGEMENT, preset: "single", aspectRatio: "16/10" },
    elementOrder: [...DEFAULT_ELEMENT_ORDER],
    elements: { ...DEFAULT_ELEMENTS_CONFIG },
    items: [],
  },
  {
    id: "shelf-road-exclusive",
    name: "ROAD Exclusive Launches",
    title: "ROAD Exclusive Launches",
    subtitle: "Direct-from-developer projects with verified on-ground ground progress videos",
    eyebrow: "Direct Access",
    icon: "Sparkles",
    shelfType: "projects",
    isActive: true,
    status: "published",
    contentSource: "hybrid",
    autoFilters: {
      itemType: "project",
      verifiedOnly: true,
      sortBy: "newest",
    },
    pinnedIds: [],
    pinningMode: "pinned-first",
    maxItems: 6,
    cardStyle: "luxury-banner",
    layoutType: "carousel",
    gridColumnsDesktop: 2,
    gridColumnsTablet: 1,
    gridColumnsMobile: 1,
    cardSizeDesktop: "medium",
    cardSizeMobile: "medium",
    enableCarousel: true,
    carouselInterval: 6,
    cardBgColor: "#ffffff",
    cardTextColor: "#0f172a",
    cardAccentColor: "#f5a623",
    cardBorder: { ...DEFAULT_BORDER_PRESETS[1].config },
    imageArrangement: { ...DEFAULT_IMAGE_ARRANGEMENT, preset: "single", aspectRatio: "21/9" },
    elementOrder: [...DEFAULT_ELEMENT_ORDER],
    elements: { ...DEFAULT_ELEMENTS_CONFIG },
    items: [],
  },
  {
    id: "shelf-amaravati-focus",
    name: "Amaravati Capital Region Spotlight",
    title: "Amaravati Capital Region Spotlight",
    subtitle: "High-yield commercial spaces, ventures, and plots near Seed Access Road & Capital Corridor",
    eyebrow: "Capital Growth",
    icon: "Landmark",
    shelfType: "projects",
    isActive: true,
    status: "published",
    contentSource: "hybrid",
    autoFilters: {
      itemType: "project",
      city: "Amaravati",
      sortBy: "popular",
    },
    pinnedIds: [],
    pinningMode: "pinned-first",
    maxItems: 6,
    cardStyle: "split-feature",
    layoutType: "carousel",
    gridColumnsDesktop: 2,
    gridColumnsTablet: 1,
    gridColumnsMobile: 1,
    cardSizeDesktop: "medium",
    cardSizeMobile: "medium",
    enableCarousel: true,
    carouselInterval: 5,
    cardBgColor: "#ffffff",
    cardTextColor: "#0f172a",
    cardAccentColor: "#f5a623",
    cardBorder: { ...DEFAULT_BORDER_PRESETS[3].config },
    imageArrangement: { ...DEFAULT_IMAGE_ARRANGEMENT, preset: "split-horizontal", splitRatio: "60/40", aspectRatio: "16/10" },
    elementOrder: [...DEFAULT_ELEMENT_ORDER],
    elements: { ...DEFAULT_ELEMENTS_CONFIG },
    items: [],
  },
  {
    id: "shelf-construction-updates",
    name: "Under Construction & Progress Updates",
    title: "Under Construction Updates",
    subtitle: "Live monthly on-ground progress, tower slab casting, and possession milestones",
    eyebrow: "Verified Milestones",
    icon: "Clock",
    shelfType: "projects",
    isActive: true,
    status: "published",
    contentSource: "hybrid",
    autoFilters: {
      itemType: "project",
      underConstruction: true,
      sortBy: "newest",
    },
    pinnedIds: [],
    pinningMode: "pinned-first",
    maxItems: 8,
    cardStyle: "construction-progress",
    layoutType: "carousel",
    gridColumnsDesktop: 4,
    gridColumnsTablet: 2,
    gridColumnsMobile: 1,
    cardSizeDesktop: "medium",
    cardSizeMobile: "medium",
    enableCarousel: true,
    carouselInterval: 4,
    cardBgColor: "#ffffff",
    cardTextColor: "#0f172a",
    cardAccentColor: "#f5a623",
    cardBorder: { ...DEFAULT_BORDER_PRESETS[0].config },
    imageArrangement: { ...DEFAULT_IMAGE_ARRANGEMENT, preset: "single", aspectRatio: "3/4" },
    elementOrder: [...DEFAULT_ELEMENT_ORDER],
    elements: { ...DEFAULT_ELEMENTS_CONFIG },
    items: [],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Dynamic Listing Matching Engine (for automatic & hybrid shelves)
// ─────────────────────────────────────────────────────────────────────────────
export function evaluateShelfFilters(
  shelf: Partial<ShelfDefinition> | { contentSource?: string; autoFilters?: any; maxItems?: number; items?: any[] },
  properties: Property[],
  projects: Project[]
): MixedItem[] {
  const activeProperties = properties.filter((p) => p.status !== "sold" && p.status !== "hidden");
  const activeProjects = projects.filter((p) => p.isPublished);

  // If source is strictly manual, only return items configured in shelf.items
  if (shelf.contentSource === "manual") {
    const propMap = new Map(activeProperties.map((p) => [p.id, p]));
    const projMap = new Map(activeProjects.map((p) => [p.id, p]));
    return (shelf.items || []).flatMap((item: any): MixedItem[] => {
      if (item.type === "property") {
        const prop = propMap.get(item.id);
        return prop ? [{ ...prop, itemType: "property" as const, ...item }] : [];
      }
      const proj = projMap.get(item.id);
      return proj ? [{ ...proj, itemType: "project" as const, ...item }] : [];
    });
  }

  const filters = shelf.autoFilters || {};
  let matchedProps: Property[] = [];
  let matchedProjs: Project[] = [];

  // Filter properties
  if (filters.itemType !== "project") {
    matchedProps = activeProperties.filter((p) => {
      if (filters.listingType && filters.listingType !== "all" && p.listingType !== filters.listingType) return false;
      if (filters.propertyType && filters.propertyType.length > 0 && !filters.propertyType.includes(p.propertyType)) return false;
      if (filters.city && p.location?.city && !p.location.city.toLowerCase().includes(filters.city.toLowerCase())) return false;
      if (filters.locality && p.location?.locality && !p.location.locality.toLowerCase().includes(filters.locality.toLowerCase())) return false;
      if (typeof filters.minPrice === "number" && p.price < filters.minPrice) return false;
      if (typeof filters.maxPrice === "number" && p.price > filters.maxPrice) return false;
      if (filters.verifiedOnly && !p.isVerified) return false;
      if (filters.featuredOnly && !p.isFeatured) return false;
      return true;
    });
  }

  // Filter projects
  if (filters.itemType !== "property") {
    matchedProjs = activeProjects.filter((p) => {
      if (filters.city && p.location?.city && !p.location.city.toLowerCase().includes(filters.city.toLowerCase())) return false;
      if (filters.locality && p.location?.locality && !p.location.locality.toLowerCase().includes(filters.locality.toLowerCase())) return false;
      if (filters.reraApproved && !(p.reraApproved || p.reraId)) return false;
      if (filters.featuredOnly && !p.isFeatured) return false;
      if (filters.underConstruction && p.constructionStatus !== "under-construction") return false;
      if (typeof filters.minPrice === "number" || typeof filters.maxPrice === "number") {
        const prices = p.configurations?.flatMap((c) => [c.priceMin, c.priceMax]).filter(Boolean) || [];
        const minP = prices.length ? Math.min(...prices) : 0;
        if (typeof filters.minPrice === "number" && minP < filters.minPrice) return false;
        if (typeof filters.maxPrice === "number" && minP > filters.maxPrice) return false;
      }
      return true;
    });
  }

  // Sort
  if (filters.sortBy === "price-asc") {
    matchedProps.sort((a, b) => a.price - b.price);
  } else if (filters.sortBy === "price-desc") {
    matchedProps.sort((a, b) => b.price - a.price);
  } else {
    matchedProps.sort((a, b) => (new Date(b.createdAt || 0).getTime()) - (new Date(a.createdAt || 0).getTime()));
  }

  const mixedAuto: MixedItem[] = [
    ...matchedProps.map((p) => ({ ...p, itemType: "property" as const })),
    ...matchedProjs.map((p) => ({ ...p, itemType: "project" as const })),
  ];

  // Hybrid handling: pinned items appear first
  if (shelf.contentSource === "hybrid" && shelf.items && shelf.items.length > 0) {
    const propMap = new Map(activeProperties.map((p) => [p.id, p]));
    const projMap = new Map(activeProjects.map((p) => [p.id, p]));
    const pinned: MixedItem[] = (shelf.items as any[]).flatMap((item: any): MixedItem[] => {
      if (item.type === "property") {
        const prop = propMap.get(item.id);
        return prop ? [{ ...prop, itemType: "property" as const, ...item, isPinned: true }] : [];
      }
      const proj = projMap.get(item.id);
      return proj ? [{ ...proj, itemType: "project" as const, ...item, isPinned: true }] : [];
    });

    const pinnedKeys = new Set(pinned.map((item) => `${item.itemType}:${item.id}`));
    const unpinnedAuto = mixedAuto.filter((item) => !pinnedKeys.has(`${item.itemType}:${item.id}`));
    return [...pinned, ...unpinnedAuto].slice(0, shelf.maxItems || 8);
  }

  return mixedAuto.slice(0, shelf.maxItems || 8);
}

export const CANONICAL_DEFAULT_SHELVES = CANONICAL_EIGHT_SHELVES;

