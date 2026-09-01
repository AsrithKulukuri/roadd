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
}

export const MAX_HOME_SECTIONS = 8;
export const MAX_HOME_SECTION_ITEMS = 8;
