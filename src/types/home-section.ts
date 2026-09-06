export const HOME_SECTION_ICON_NAMES = [
  "ThumbsUp",
  "Star",
  "IndianRupee",
  "Sparkles",
  "TrendingUp",
  "BadgeCheck",
  "Building2",
  "Home",
  "Landmark",
  "MapPin",
  "KeyRound",
  "Flame",
] as const;

export type HomeSectionIconName = (typeof HOME_SECTION_ICON_NAMES)[number];

export const HOME_CARD_STYLES = [
  {
    id: "compact-marketplace",
    label: "Compact Marketplace",
    description: "Horizontal listing with 40% photo split, Verified badge, price, BHK, and Ready to Move pill.",
    aspectRatio: "16:9 horizontal split",
    recommendedUse: "Recommended, Ready to Move, High Density Listings",
    minWidth: 360,
    maxWidth: 430,
  },
  {
    id: "tall-portrait",
    label: "Tall Luxury Portrait",
    description: "High-impact tall vertical image, overlay price, project name, and bottom RERA approval specs.",
    aspectRatio: "3:4 portrait",
    recommendedUse: "Featured, New Launch, High-Rise Towers",
    minWidth: 280,
    maxWidth: 340,
  },
  {
    id: "luxury-banner",
    label: "Extra-Wide Luxury Banner",
    description: "Cinematic panoramic campaign banner with headline typography and circular developer strip.",
    aspectRatio: "21:9 wide panoramic",
    recommendedUse: "Signature Collections, Gated Communities, Developer Showcase",
    minWidth: 720,
    maxWidth: 960,
  },
  {
    id: "split-feature",
    label: "Premium Stacked Feature",
    description: "Asymmetric layout with dual stacked photography and floating white specs panel.",
    aspectRatio: "16:10 stacked split",
    recommendedUse: "Ultra Luxury, Penthouses, Premium Residences",
    minWidth: 640,
    maxWidth: 820,
  },
  {
    id: "bottom-floating",
    label: "Bottom Floating Panel",
    description: "Full-bleed architectural photo with overlapping white panel and circular developer badge.",
    aspectRatio: "4:3 with floating overlay",
    recommendedUse: "Trending Landmarks, Iconic Projects, Budget Friendly",
    minWidth: 480,
    maxWidth: 640,
  },
  {
    id: "modern-villa",
    label: "Modern Villa Showcase",
    description: "Premium villa card with 3D Tour badge, private garden/security icons, and Know More CTA.",
    aspectRatio: "16:10 wide villa",
    recommendedUse: "Luxury Villas, Independent Homes, Gated Townships",
    minWidth: 460,
    maxWidth: 620,
  },
  {
    id: "construction-progress",
    label: "Construction Progress Tracker",
    description: "Elevation photo with Under Construction badge and live completion percentage progress bar.",
    aspectRatio: "3:4 progress card",
    recommendedUse: "Under Construction, Upcoming Launches, High Rental Yield",
    minWidth: 300,
    maxWidth: 360,
  },
  {
    id: "dark-editorial",
    label: "Dark Luxury Editorial",
    description: "Sophisticated dark navy editorial card with lakefront photo and luxury advertising feel.",
    aspectRatio: "16:9 dark split",
    recommendedUse: "Waterfront Living, Lakefront Highlights, Signature Estates",
    minWidth: 520,
    maxWidth: 680,
  },
] as const;

export type HomeCardStyleId = (typeof HOME_CARD_STYLES)[number]["id"];

export const DEFAULT_CARD_STYLE: HomeCardStyleId = "compact-marketplace";

export interface HomeSectionItem {
  id: string;
  type: "property" | "project";
}

export interface HomeSection {
  id: string;
  title: string;
  icon: HomeSectionIconName;
  isActive: boolean;
  items: HomeSectionItem[];
  cardStyle?: HomeCardStyleId;
}

export const MAX_HOME_SECTIONS = 8;
export const MAX_HOME_SECTION_ITEMS = 8;
