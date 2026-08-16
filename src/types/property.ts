export type PropertyType =
  // Residential
  | "apartment"
  | "villa"
  | "independent-house"
  | "residential-land"
  | "farmhouse"
  | "pg-coliving"
  // Commercial
  | "shops"
  | "buildings"
  | "commercial-spaces"
  | "commercial-lands"
  | "industrial-lands"
export type PropertyCategory = "residential" | "commercial" | "industrial" | "agricultural";

export type PropertySubtype =
  | "flat" | "duplex-flat" | "house" | "villa" | "venture-plot" | "land" | "pent-house"
  | "floor" | "shop" | "building"
  | "godown" | "warehouse"
  | "farm-house";

export type PropertyStatus =
  | "draft"
  | "pending-review"
  | "admin-review"
  | "approved"
  | "published"
  | "featured"
  | "sold"
  | "rented"
  | "archived"
  | "hidden";

export type ListingType = "sale" | "rent" | "pg";

export type SaleType = "new" | "resale";

export type AgeRange = "0-10" | "10-30" | "30+";

export type FurnishingStatus = "furnished" | "semi-furnished" | "unfurnished";

export type PropertyFacing =
  | "north"
  | "south"
  | "east"
  | "west"
  | "north-east"
  | "north-west"
  | "south-east"
  | "south-west";

export interface PropertyImage {
  id: string;
  url: string;
  alt: string;
  isPrimary: boolean;
  order: number;
}

export interface PropertyAmenity {
  id: string;
  name: string;
  icon: string;
  category: "basic" | "safety" | "lifestyle" | "parking" | "utility" | "society";
}

export interface PropertyFeature {
  label: string;
  value: string;
}

export interface PropertyLocation {
  address: string;
  locality: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  landmark?: string;
}

export interface Property {
  id: string;
  slug: string;
  title: string;
  description: string;
  category?: PropertyCategory;
  subtype?: PropertySubtype;
  attributes?: Record<string, any>;
  listingContext?: "standalone" | "project" | "both";
  propertyType: PropertyType;
  listingType: ListingType;
  saleType?: SaleType;
  status: PropertyStatus;
  price: number;
  pricePerSqft: number;
  maintenanceCharge?: number;
  securityDeposit?: number;
  area: number; // in sq.ft
  carpetArea?: number;
  builtUpArea?: number;
  superBuiltUpArea?: number;
  plotArea?: number;
  bedrooms: number;
  bathrooms: number;
  balconies: number;
  floors?: number;
  totalFloors?: number;
  floorNumber?: number;
  parking: number;
  roadWidth?: number;
  undividedShare?: number;
  furnishing: FurnishingStatus;
  facing: PropertyFacing;
  ageOfProperty: number; // years
  possessionDate?: string;
  possessionStatus?: string;
  postedBy?: string;
  isReadyToMove: boolean;
  location: PropertyLocation;
  images: PropertyImage[];
  coverImage?: string;
  galleryImages?: string[];
  videoUrl?: string;
  videoThumbnail?: string;
  layoutMapUrl?: string;
  floorPlanUrl?: string;
  brochureUrl?: string;
  amenities: PropertyAmenity[];
  features: PropertyFeature[];
  reraId?: string;
  isVerified: boolean;
  isFeatured?: boolean;
  isRecommended?: boolean;
  displayCategory?: "featured" | "recommended" | "budget_friendly" | "none";
  isPremium?: boolean;
  vastuCompliant?: boolean;
  petFriendly?: boolean;
  gatedSecurity?: boolean;
  powerBackup?: boolean | string;
  waterSupply?: string;
  nearbySchools?: string[];
  nearbyHospitals?: string[];
  nearbyMetro?: string;
  nearbyAirport?: string;
  ownerName?: string;
  ownerPhone?: string;
  ownerEmail?: string;
  ownerAvatar?: string;
  ownerType?: string;
  isOwnerVerified?: boolean;
  showOnMap?: boolean;
  viewCount?: number;
  viewsCount?: number;
  savedCount?: number;
  enquiryCount?: number;
  refId?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  ownerId?: string;
  agentId?: string;
}
