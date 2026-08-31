import type { Property, PropertyImage } from "./property";
import type { Project } from "./project";

export interface MapProjectItem {
  id: string;
  slug: string;
  title: string;
  name?: string;
  description?: string;
  price: number;
  propertyType: string;
  listingType: string;
  status: string;
  location: {
    address?: string;
    locality?: string;
    city?: string;
    state?: string;
    latitude?: number;
    longitude?: number;
    pincode?: string;
    landmark?: string;
  };
  coverImage?: string;
  images: Array<PropertyImage | { url: string; [key: string]: unknown } | string>;
  showOnMap: boolean;
  builderName?: string;
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  refId?: string;
  _isProject: boolean;
  _originalProjectData?: Project;
}

export type SharedMapItem = Property | MapProjectItem;

export interface PropertyMapProps {
  filteredItems?: SharedMapItem[];
  userLocation?: { lat: number; lng: number } | null;
  onVisibleItemsChange?: (visibleIds: string[]) => void;
  containerHeight?: number;
}
