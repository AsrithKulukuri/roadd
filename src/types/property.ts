export type PropertyType =
  | "apartment"
  | "villa"
  | "independent-house"
  | "plot"
  | "commercial"
  | "pg-coliving"
  | "farmhouse";

export type PropertyStatus =
  | "draft"
  | "pending-review"
  | "admin-review"
  | "approved"
  | "published"
  | "featured"
  | "sold"
  | "rented"
  | "archived";

export type ListingType = "sale" | "rent" | "pg";

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
}

export interface Property {
  id: string;
  slug: string;
  title: string;
  description: string;
  propertyType: PropertyType;
  listingType: ListingType;
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
  furnishing: FurnishingStatus;
  facing: PropertyFacing;
  ageOfProperty: number; // years
  possessionDate?: string;
  isReadyToMove: boolean;
  location: PropertyLocation;
  images: PropertyImage[];
  amenities: PropertyAmenity[];
  features: PropertyFeature[];
  reraId?: string;
  isVerified: boolean;
  isFeatured: boolean;
  isRecommended?: boolean;
  isPremium: boolean;
  showOnMap?: boolean;
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  ownerAvatar?: string;
  ownerType: "owner" | "agent" | "builder" | "developer";
  isOwnerVerified: boolean;
  viewCount: number;
  savedCount: number;
  enquiryCount: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  vastuCompliant?: boolean;
  petFriendly?: boolean;
  gatedSecurity?: boolean;
  powerBackup?: boolean;
  waterSupply?: "borewell" | "municipal" | "both";
  nearbySchools?: string[];
  nearbyHospitals?: string[];
  nearbyMetro?: string;
  nearbyAirport?: string;
}

export interface PropertyFilter {
  listingType: ListingType;
  propertyTypes: PropertyType[];
  city?: string;
  locality?: string;
  minPrice?: number;
  maxPrice?: number;
  minArea?: number;
  maxArea?: number;
  bedrooms?: number[];
  bathrooms?: number[];
  furnishing?: FurnishingStatus[];
  facing?: PropertyFacing[];
  amenities?: string[];
  isReraVerified?: boolean;
  isReadyToMove?: boolean;
  postedBy?: ("owner" | "agent" | "builder" | "developer")[];
  sortBy?: "price-asc" | "price-desc" | "newest" | "popular" | "area-asc" | "area-desc";
  page?: number;
  limit?: number;
}

export interface SavedProperty {
  id: string;
  propertyId: string;
  userId: string;
  savedAt: string;
  property: Property;
}

export interface RecentlyViewed {
  id: string;
  propertyId: string;
  userId: string;
  viewedAt: string;
  property: Property;
}

export interface PropertyComparison {
  properties: Property[];
  maxProperties: 3;
}

export interface SearchHistory {
  id: string;
  userId: string;
  query: string;
  filters: PropertyFilter;
  resultCount: number;
  searchedAt: string;
}

export interface SavedSearch {
  id: string;
  userId: string;
  name: string;
  filters: PropertyFilter;
  alertEnabled: boolean;
  alertFrequency: "instant" | "daily" | "weekly";
  createdAt: string;
  lastNotifiedAt?: string;
}
