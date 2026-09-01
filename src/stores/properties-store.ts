import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import type { Property } from '@/types/property';
import { toast } from 'sonner';

// Valid columns in Supabase properties table
const VALID_PROPERTY_COLUMNS = new Set([
  'id', 'slug', 'title', 'description', 'price', 'pricePerSqft',
  'propertyType', 'listingType', 'saleType', 'status', 'bedrooms', 'bathrooms', 'balconies',
  'floors', 'totalFloors', 'floorNumber', 'parking', 'roadWidth', 'undividedShare',
  'area', 'carpetArea', 'builtUpArea', 'furnishing', 'facing', 'ageOfProperty',
  'possessionDate', 'isReadyToMove', 'location', 'images', 'coverImage', 'galleryImages',
  'videoUrl', 'amenities', 'features', 'reraId', 'isVerified', 'isFeatured',
  'isRecommended', 'isPremium', 'showOnMap', 'ownerId', 'ownerName', 'ownerPhone',
  'ownerEmail', 'ownerAvatar', 'ownerType', 'isOwnerVerified', 'viewCount', 'savedCount',
  'enquiryCount', 'createdAt', 'updatedAt', 'publishedAt', 'vastuCompliant', 'petFriendly',
  'gatedSecurity', 'refId', 'category', 'subtype', 'listingContext', 'attributes',
  'layoutMapUrl', 'floorPlanUrl', 'brochureUrl', 'displayCategory'
]);

export function toSupabaseProperty(prop: Partial<Property>): Record<string, unknown> {
  const p: Record<string, unknown> = { ...prop };
  
  if (p.pricePerSqFt !== undefined && p.pricePerSqft === undefined) p.pricePerSqft = p.pricePerSqFt;
  if (p.areaSqFt !== undefined && p.area === undefined) p.area = p.areaSqFt;
  if (p.carpetAreaSqFt !== undefined && p.carpetArea === undefined) p.carpetArea = p.carpetAreaSqFt;
  if (p.builtUpAreaSqFt !== undefined && p.builtUpArea === undefined) p.builtUpArea = p.builtUpAreaSqFt;
  
  if (!p.ownerId) p.ownerId = 'admin';
  if (!p.ownerPhone) p.ownerPhone = prop.ownerPhone || '+91 9876543210';
  if (!p.createdAt) p.createdAt = new Date().toISOString();
  if (!p.updatedAt) p.updatedAt = new Date().toISOString();

  // Store all structured real-estate attributes in attributes JSONB for 100% database persistence reliability
  const existingAttributes = (p.attributes as Record<string, unknown>) || {};
  p.attributes = {
    ...existingAttributes,
    saleType: p.saleType,
    furnishingItems: p.furnishingItems,
    floorRange: p.floorRange,
    ownership: p.ownership,
    verifiedBadges: p.verifiedBadges,
    mediaTypes: p.mediaTypes,
    tenantPreference: p.tenantPreference,
    petsAllowed: p.petsAllowed,
    nonVegAllowed: p.nonVegAllowed,
    pgGender: p.pgGender,
    pgSharing: p.pgSharing,
    foodIncluded: p.foodIncluded,
    commercialType: p.commercialType,
    furnishingGrade: p.furnishingGrade,
    waterSource: p.waterSource,
    cultivationCrop: p.cultivationCrop,
  };

  // Strip keys that are not valid columns in Supabase
  const cleaned: Record<string, unknown> = {};
  for (const key of Object.keys(p)) {
    if (VALID_PROPERTY_COLUMNS.has(key)) {
      cleaned[key] = p[key];
    }
  }
  return cleaned;
}

export function fromSupabaseProperty(p: Record<string, unknown>): Property {
  const attr = (p.attributes as Record<string, unknown>) || {};
  return {
    ...(p as unknown as Property),
    saleType: (p.saleType as "new" | "resale" | undefined) || (attr.saleType as "new" | "resale" | undefined) || "new",
    pricePerSqft: (p.pricePerSqft as number | undefined) ?? (p.pricePerSqFt as number | undefined) ?? 0,
    area: (p.area as number | undefined) ?? (p.areaSqFt as number | undefined) ?? 0,
    carpetArea: (p.carpetArea as number | undefined) ?? (p.carpetAreaSqFt as number | undefined),
    builtUpArea: (p.builtUpArea as number | undefined) ?? (p.builtUpAreaSqFt as number | undefined),
    displayCategory: (p.displayCategory as "featured" | "recommended" | "budget_friendly" | "none" | undefined) || (p.isFeatured ? "featured" : p.isRecommended ? "recommended" : "none"),
    furnishingItems: (p.furnishingItems as string[] | undefined) || (attr.furnishingItems as string[] | undefined) || [],
    floorRange: (p.floorRange as string | undefined) || (attr.floorRange as string | undefined),
    ownership: (p.ownership as string | undefined) || (attr.ownership as string | undefined),
    verifiedBadges: (p.verifiedBadges as string[] | undefined) || (attr.verifiedBadges as string[] | undefined) || [],
    mediaTypes: (p.mediaTypes as string[] | undefined) || (attr.mediaTypes as string[] | undefined) || [],
    tenantPreference: (p.tenantPreference as string[] | undefined) || (attr.tenantPreference as string[] | undefined) || [],
    petsAllowed: (p.petsAllowed as boolean | undefined) ?? (attr.petsAllowed as boolean | undefined) ?? false,
    nonVegAllowed: (p.nonVegAllowed as boolean | undefined) ?? (attr.nonVegAllowed as boolean | undefined) ?? false,
    pgGender: (p.pgGender as string[] | undefined) || (attr.pgGender as string[] | undefined) || [],
    pgSharing: (p.pgSharing as string[] | undefined) || (attr.pgSharing as string[] | undefined) || [],
    foodIncluded: (p.foodIncluded as boolean | undefined) ?? (attr.foodIncluded as boolean | undefined) ?? false,
    commercialType: (p.commercialType as string[] | undefined) || (attr.commercialType as string[] | undefined) || [],
    furnishingGrade: (p.furnishingGrade as string[] | undefined) || (attr.furnishingGrade as string[] | undefined) || [],
    waterSource: (p.waterSource as string[] | undefined) || (attr.waterSource as string[] | undefined) || [],
    cultivationCrop: (p.cultivationCrop as string[] | undefined) || (attr.cultivationCrop as string[] | undefined) || [],
  };
}

interface PropertiesState {
  properties: Property[];
  isLoading: boolean;
  error: string | null;
  fetchProperties: () => Promise<void>;
  addProperty: (property: Property) => Promise<void>;
  deleteProperty: (id: string) => Promise<void>;
  deleteAllProperties: () => Promise<void>;
  toggleFeatured: (id: string) => Promise<boolean>;
  toggleSoldOut: (id: string) => Promise<boolean>;
  toggleShowOnMap: (id: string) => Promise<boolean>;
  toggleRecommended: (id: string) => Promise<boolean>;
  updateDisplayCategory: (id: string, category: "featured" | "recommended" | "budget_friendly" | "none") => Promise<boolean>;
  updateRefId: (id: string, refId: string) => Promise<boolean>;
  updateProperty: (id: string, updatedProperty: Property) => Promise<void>;
}

let activePropertiesRequestId = 0;
let inFlightPropertiesPromise: Promise<void> | null = null;
let propertiesAbortController: AbortController | null = null;

async function savePropertyToServer(
  mode: "create" | "update",
  payload: Record<string, unknown>,
  id?: string
): Promise<void> {
  const response = await fetch("/api/properties/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode, id, payload }),
  });
  const result = await response.json().catch(() => ({ error: "The server returned an invalid response." }));
  if (!response.ok || !result.success) {
    throw new Error(result.error || "Property could not be saved.");
  }
}

export const usePropertiesStore = create<PropertiesState>()(
  persist(
    (set, get) => ({
      properties: [],
      isLoading: false,
      error: null,

      fetchProperties: async () => {
        if (inFlightPropertiesPromise) {
          return inFlightPropertiesPromise;
        }

        if (propertiesAbortController) {
          propertiesAbortController.abort();
        }
        propertiesAbortController = new AbortController();
        const currentSignal = propertiesAbortController.signal;
        const currentRequestId = ++activePropertiesRequestId;

        set({ isLoading: true, error: null });

        inFlightPropertiesPromise = (async () => {
          let timeoutId: NodeJS.Timeout | null = null;
          try {
            const timeoutPromise = new Promise<never>((_, reject) => {
              timeoutId = setTimeout(() => {
                propertiesAbortController?.abort();
                reject(new Error("Request timed out. Please check your connection and retry."));
              }, 9000);
            });

            const queryPromise = supabase
              .from('properties')
              .select('*')
              .order('createdAt', { ascending: false })
              .abortSignal(currentSignal);

            const result = await Promise.race([queryPromise, timeoutPromise]);

            if (currentSignal.aborted || currentRequestId !== activePropertiesRequestId) return;

            const { data, error } = result as { data: Record<string, unknown>[] | null; error: { message: string } | null };

            if (error) {
              console.warn('Error fetching properties from Supabase (keeping local state):', error.message);
              set({ error: error.message });
              return;
            }

            const mappedData = (data || []).map(fromSupabaseProperty);
            set({ properties: mappedData, error: null });
          } catch (error: unknown) {
            const isAbort = currentSignal.aborted || (error instanceof Error && (error.name === 'AbortError' || error.message.toLowerCase().includes('abort')));
            if (isAbort || currentRequestId !== activePropertiesRequestId) {
              return;
            }
            const message = error instanceof Error ? error.message : 'Failed to load properties';
            console.error('Error fetching properties from Supabase:', message);
            set({ error: message });
          } finally {
            if (timeoutId) clearTimeout(timeoutId);
            if (currentRequestId === activePropertiesRequestId) {
              inFlightPropertiesPromise = null;
              set({ isLoading: false });
            }
          }
        })();

        return inFlightPropertiesPromise;
      },

      addProperty: async (property: Property) => {
        try {
          const dbPayload = toSupabaseProperty(property);
          await savePropertyToServer("create", dbPayload);
          set((state) => ({
            properties: [property, ...state.properties.filter((p) => p.id !== property.id)],
          }));
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          toast.error(`Property was not saved: ${message}`);
          throw err;
        }
      },

      deleteProperty: async (id: string) => {
        const previousProperties = get().properties;
        set((state) => ({
          properties: state.properties.filter((property) => property.id !== id),
        }));

        try {
          const response = await fetch("/api/properties/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
          });
          const result = await response.json().catch(() => null) as { success?: boolean; error?: string } | null;
          if (!response.ok || !result?.success) {
            throw new Error(result?.error || "Property could not be deleted.");
          }
          toast.success("Property permanently deleted from database");
        } catch (error: unknown) {
          set({ properties: previousProperties });
          const message = error instanceof Error ? error.message : "Property deletion failed.";
          toast.error(message);
        }
      },

      deleteAllProperties: async () => {
        const previousProperties = get().properties;
        set({ properties: [] });

        try {
          const response = await fetch("/api/properties/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ deleteAll: true }),
          });
          const result = await response.json().catch(() => null) as { success?: boolean; error?: string } | null;
          if (!response.ok || !result?.success) {
            throw new Error(result?.error || "Properties could not be deleted.");
          }
          toast.success("All properties permanently deleted from database");
        } catch (error: unknown) {
          set({ properties: previousProperties });
          const message = error instanceof Error ? error.message : "Property deletion failed.";
          toast.error(message);
        }
      },

      toggleFeatured: async (id: string) => {
        const property = get().properties.find((item) => item.id === id);
        if (!property) return false;
        const nextValue = !property.isFeatured;

        set((state) => ({
          properties: state.properties.map((item) =>
            item.id === id ? { ...item, isFeatured: nextValue } : item
          ),
        }));

        try {
          await savePropertyToServer("update", { isFeatured: nextValue }, id);
          return true;
        } catch (error: unknown) {
          set((state) => ({
            properties: state.properties.map((item) =>
              item.id === id ? { ...item, isFeatured: property.isFeatured } : item
            ),
          }));
          toast.error(error instanceof Error ? error.message : "Featured status was not saved.");
          return false;
        }
      },

      toggleSoldOut: async (id: string) => {
        const property = get().properties.find((item) => item.id === id);
        if (!property) return false;
        const nextStatus = property.status === "sold" ? "published" : "sold";

        set((state) => ({
          properties: state.properties.map((item) =>
            item.id === id ? { ...item, status: nextStatus } : item
          ),
        }));

        try {
          await savePropertyToServer("update", { status: nextStatus }, id);
          return true;
        } catch (error: unknown) {
          set((state) => ({
            properties: state.properties.map((item) =>
              item.id === id ? { ...item, status: property.status } : item
            ),
          }));
          toast.error(error instanceof Error ? error.message : "Property status was not saved.");
          return false;
        }
      },

      toggleShowOnMap: async (id: string) => {
        const property = get().properties.find((item) => item.id === id);
        if (!property) return false;
        const nextValue = !property.showOnMap;

        set((state) => ({
          properties: state.properties.map((item) =>
            item.id === id ? { ...item, showOnMap: nextValue } : item
          ),
        }));

        try {
          await savePropertyToServer("update", { showOnMap: nextValue }, id);
          return true;
        } catch (error: unknown) {
          set((state) => ({
            properties: state.properties.map((item) =>
              item.id === id ? { ...item, showOnMap: property.showOnMap } : item
            ),
          }));
          toast.error(error instanceof Error ? error.message : "Map visibility was not saved.");
          return false;
        }
      },

      toggleRecommended: async (id: string) => {
        const property = get().properties.find((item) => item.id === id);
        if (!property) return false;
        const nextValue = !property.isRecommended;

        if (nextValue && get().properties.filter((item) => item.isRecommended).length >= 10) {
          toast.error("A maximum of 10 properties can be recommended.");
          return false;
        }

        set((state) => ({
          properties: state.properties.map((item) =>
            item.id === id ? { ...item, isRecommended: nextValue } : item
          ),
        }));

        try {
          await savePropertyToServer("update", { isRecommended: nextValue }, id);
          return true;
        } catch (error: unknown) {
          set((state) => ({
            properties: state.properties.map((item) =>
              item.id === id ? { ...item, isRecommended: property.isRecommended } : item
            ),
          }));
          toast.error(error instanceof Error ? error.message : "Recommended status was not saved.");
          return false;
        }
      },

      updateDisplayCategory: async (id: string, category: "featured" | "recommended" | "budget_friendly" | "none") => {
        const property = get().properties.find((item) => item.id === id);
        if (!property) return false;
        const isFeatured = category === "featured";
        const isRecommended = category === "recommended";

        set((state) => ({
          properties: state.properties.map((item) =>
            item.id === id
              ? { ...item, isFeatured, isRecommended, displayCategory: category }
              : item
          ),
        }));

        try {
          await savePropertyToServer("update", { isFeatured, isRecommended, displayCategory: category }, id);
          return true;
        } catch (error: unknown) {
          set((state) => ({
            properties: state.properties.map((item) => item.id === id ? property : item),
          }));
          toast.error(error instanceof Error ? error.message : "Display category was not saved.");
          return false;
        }
      },

      updateRefId: async (id: string, refId: string) => {
        const property = get().properties.find((item) => item.id === id);
        if (!property) return false;
        const cleanRef = refId.trim().toUpperCase();

        set((state) => ({
          properties: state.properties.map((item) =>
            item.id === id ? { ...item, refId: cleanRef } : item
          ),
        }));

        try {
          await savePropertyToServer("update", { refId: cleanRef }, id);
          return true;
        } catch (error: unknown) {
          set((state) => ({
            properties: state.properties.map((item) =>
              item.id === id ? { ...item, refId: property.refId } : item
            ),
          }));
          toast.error(error instanceof Error ? error.message : "Reference ID was not saved.");
          return false;
        }
      },

      updateProperty: async (id: string, updatedProperty: Property) => {
        try {
          const dbPayload = toSupabaseProperty(updatedProperty);
          await savePropertyToServer("update", dbPayload, id);
          set((state) => ({
            properties: state.properties.map((p) =>
              p.id === id ? { ...updatedProperty, id, updatedAt: new Date().toISOString() } : p
            ),
          }));
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          toast.error(`Property changes were not saved: ${message}`);
          throw err;
        }
      },
    }),
    {
      name: 'road_properties_store',
      partialize: (state) => ({ properties: state.properties }),
    }
  )
);
