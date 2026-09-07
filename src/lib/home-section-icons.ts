import {
  ThumbsUp,
  Star,
  IndianRupee,
  Sparkles,
  TrendingUp,
  BadgeCheck,
  Building2,
  Home,
  Landmark,
  MapPin,
  KeyRound,
  Flame,
  Building,
  Castle,
  Warehouse,
  Trees,
  Store,
  Hotel,
  Layers,
  Repeat,
  Key,
  Award,
  CheckCircle2,
  Clock,
  Zap,
  ShieldCheck,
  Heart,
  Coins,
  Tag,
  Percent,
  Briefcase,
  Compass,
  Sun,
  Waves,
  Plane,
  Car,
  type LucideIcon,
} from "lucide-react";
import type { HomeSectionIconName } from "@/types/home-section";

export const HOME_SECTION_ICONS: Record<HomeSectionIconName, LucideIcon> = {
  ThumbsUp,
  Star,
  IndianRupee,
  Sparkles,
  TrendingUp,
  BadgeCheck,
  Building2,
  Home,
  Landmark,
  MapPin,
  KeyRound,
  Flame,
  Building,
  Castle,
  Warehouse,
  Trees,
  Store,
  Hotel,
  Layers,
  Repeat,
  Key,
  Award,
  CheckCircle2,
  Clock,
  Zap,
  ShieldCheck,
  Heart,
  Coins,
  Tag,
  Percent,
  Briefcase,
  Compass,
  Sun,
  Waves,
  Plane,
  Car,
};

export interface IconOptionMeta {
  name: HomeSectionIconName;
  label: string;
  category: "Properties" | "Badges" | "Finance" | "Lifestyle";
}

export const ICON_OPTIONS_META: IconOptionMeta[] = [
  // Properties
  { name: "Building2", label: "Apartments", category: "Properties" },
  { name: "Building", label: "New Projects", category: "Properties" },
  { name: "Home", label: "Villas & Houses", category: "Properties" },
  { name: "Castle", label: "Luxury Estates", category: "Properties" },
  { name: "Warehouse", label: "Warehouses", category: "Properties" },
  { name: "Trees", label: "Plots & Farmland", category: "Properties" },
  { name: "Layers", label: "Builder Floors", category: "Properties" },
  { name: "Store", label: "Retail / Shops", category: "Properties" },
  { name: "Hotel", label: "Serviced Living", category: "Properties" },
  { name: "Repeat", label: "Resale Homes", category: "Properties" },

  // Badges & Status
  { name: "Sparkles", label: "Featured / New", category: "Badges" },
  { name: "Star", label: "Top Rated", category: "Badges" },
  { name: "BadgeCheck", label: "Verified RERA", category: "Badges" },
  { name: "ShieldCheck", label: "Secure & Trusted", category: "Badges" },
  { name: "Flame", label: "Hot & Trending", category: "Badges" },
  { name: "Award", label: "Signature Picks", category: "Badges" },
  { name: "CheckCircle2", label: "Ready to Move", category: "Badges" },
  { name: "KeyRound", label: "Possession Ready", category: "Badges" },
  { name: "Key", label: "Exclusive Keys", category: "Badges" },
  { name: "Clock", label: "Upcoming Launches", category: "Badges" },
  { name: "Zap", label: "Fast Selling", category: "Badges" },
  { name: "ThumbsUp", label: "Recommended", category: "Badges" },
  { name: "TrendingUp", label: "High Appreciation", category: "Badges" },

  // Finance & Value
  { name: "IndianRupee", label: "Budget Friendly", category: "Finance" },
  { name: "Coins", label: "Investment Yield", category: "Finance" },
  { name: "Tag", label: "Best Value / Deals", category: "Finance" },
  { name: "Percent", label: "Discounts & Offers", category: "Finance" },
  { name: "Briefcase", label: "Commercial Yield", category: "Finance" },

  // Lifestyle & Atmosphere
  { name: "Heart", label: "Buyer Favorites", category: "Lifestyle" },
  { name: "Landmark", label: "City Landmarks", category: "Lifestyle" },
  { name: "MapPin", label: "Prime Locality", category: "Lifestyle" },
  { name: "Compass", label: "Vastu & Directions", category: "Lifestyle" },
  { name: "Sun", label: "Sunny & Open Plots", category: "Lifestyle" },
  { name: "Waves", label: "Waterfront & Scenic", category: "Lifestyle" },
  { name: "Plane", label: "Near Airport / Highway", category: "Lifestyle" },
  { name: "Car", label: "With Parking / Transit", category: "Lifestyle" },
];

export function getLucideIcon(iconName?: string | null, fallback: LucideIcon = Home): LucideIcon {
  if (!iconName) return fallback;
  return (HOME_SECTION_ICONS as Record<string, LucideIcon>)[iconName as HomeSectionIconName] || fallback;
}
