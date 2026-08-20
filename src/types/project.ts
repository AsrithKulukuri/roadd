// ─── Project Types ────────────────────────────────────────────────────────────

export type ProjectType = "apartment" | "villa" | "venture";

export type ConstructionStatus =
  | "under-construction"
  | "ready-to-move"
  | "new-launch";

// A single BHK/plot configuration within a project
export interface ProjectConfig {
  id: string;
  /** e.g. "3 BHK", "2 BHK", "Corner Plot" */
  label: string;
  /** Apartment/Villa: bedrooms count. Venture: ignored */
  bedrooms?: number;
  /** sq.ft – min built-up area (Apartment/Villa) */
  builtUpAreaMin?: number;
  /** sq.ft – max built-up area (Apartment/Villa) */
  builtUpAreaMax?: number;
  /** sq.ft - min super built-up area */
  superBuiltUpAreaMin?: number;
  /** sq.ft - max super built-up area */
  superBuiltUpAreaMax?: number;
  /** sq.ft - min plinth area */
  plinthAreaMin?: number;
  /** sq.ft - max plinth area */
  plinthAreaMax?: number;
  /** Undivided share (e.g. sq.yds) */
  uds?: number;
  /** sq.yds – min plot size (Venture) */
  plotSizeMin?: number;
  /** sq.yds – max plot size (Venture) */
  plotSizeMax?: number;
  /** Facing options available for this config (e.g. ["East", "West"]) */
  facing?: string[];
  /** Rupees – minimum price for this config */
  priceMin: number;
  /** Rupees – maximum price for this config */
  priceMax: number;
  /** Price per sq.yd (Venture) or price per sq.ft (Apartment) */
  pricePerUnit?: number;
  /** URL to a floor plan / layout image for this config */
  floorPlanUrl?: string;
  /** Gallery images for this specific config */
  images?: string[];
  /** Video walkthrough URL for this config */
  videoUrl?: string;
  /** Construction status for this specific config */
  constructionStatus?: ConstructionStatus;
  /** Possession date string e.g. "Dec 2028" */
  possessionDate?: string;
}

// A construction phase within a project
export interface ProjectPhase {
  id: string;
  /** e.g. "Phase 1", "Tower A" */
  name: string;
  status: ConstructionStatus;
  /** e.g. "Dec 2028" */
  possessionDate?: string;
  totalUnits?: number;
}

export interface ConstructionUpdate {
  id: string;
  date: string;
  title: string;
  description?: string;
  videoUrl?: string;
  imageUrl?: string;
}

export interface ProjectImage {
  id: string;
  url: string;
  alt: string;
  /** Category for filtering gallery tabs */
  category: "aerial" | "exterior" | "interior" | "amenity" | "floor-plan" | "outdoor";
  isPrimary?: boolean;
}

// The main Project entity
export interface Project {
  id: string;
  slug: string;
  refId?: string;
  name: string;
  tagline?: string;
  description?: string;

  projectType: ProjectType;

  // Builder info
  builderName: string;
  builderLogoUrl?: string;
  builderPhone?: string;
  builderWhatsapp?: string;

  // Location
  location: {
    address: string;
    locality: string;
    city: string;
    state: string;
    pincode?: string;
    latitude: number;
    longitude: number;
  };

  // Compliance
  reraId?: string;
  reraApproved: boolean;
  crdaApproved?: boolean;
  noBrokerage?: boolean;

  // Status
  constructionStatus: ConstructionStatus;
  totalUnits?: number;
  totalTowers?: number;
  /** e.g. "34 acres" */
  totalArea?: string;

  // Phases
  phases: ProjectPhase[];
  constructionUpdates?: ConstructionUpdate[];

  // Configurations (BHK variants / plot types)
  configurations: ProjectConfig[];

  // Media
  images: ProjectImage[];
  coverImage?: string;
  videoUrl?: string;
  videoThumbnail?: string;
  brochureUrl?: string;
  masterPlanUrl?: string;

  // Content
  /** Bullet points for "Why consider?" sidebar */
  highlights: string[];
  /** Facility/amenity tags e.g. "Swimming Pool", "Clubhouse" */
  facilities: string[];

  // Admin flags
  isFeatured: boolean;
  displayCategory?: "featured" | "recommended" | "budget_friendly" | "none";
  isPublished: boolean;
  viewCount?: number;

  createdAt: string;
  updatedAt: string;
}
