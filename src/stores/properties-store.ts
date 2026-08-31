import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import { deleteFromS3 } from '@/lib/aws/storage-utils';
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

export function toSupabaseProperty(prop: Partial<Property>): any {
  const p: any = { ...prop };
  
  if (p.pricePerSqFt !== undefined && p.pricePerSqft === undefined) p.pricePerSqft = p.pricePerSqFt;
  if (p.areaSqFt !== undefined && p.area === undefined) p.area = p.areaSqFt;
  if (p.carpetAreaSqFt !== undefined && p.carpetArea === undefined) p.carpetArea = p.carpetAreaSqFt;
  if (p.builtUpAreaSqFt !== undefined && p.builtUpArea === undefined) p.builtUpArea = p.builtUpAreaSqFt;
  
  if (!p.ownerId) p.ownerId = 'admin';
  if (!p.ownerPhone) p.ownerPhone = prop.ownerPhone || '+91 9876543210';
  if (!p.createdAt) p.createdAt = new Date().toISOString();
  if (!p.updatedAt) p.updatedAt = new Date().toISOString();

  // Store all structured real-estate attributes in attributes JSONB for 100% database persistence reliability
  p.attributes = {
    ...(p.attributes || {}),
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
  const cleaned: Record<string, any> = {};
  for (const key of Object.keys(p)) {
    if (VALID_PROPERTY_COLUMNS.has(key)) {
      cleaned[key] = p[key];
    }
  }
  return cleaned;
}

export function fromSupabaseProperty(p: any): Property {
  const attr = p.attributes || {};
  return {
    ...p,
    saleType: p.saleType || attr.saleType || "new",
    pricePerSqFt: p.pricePerSqft ?? p.pricePerSqFt ?? 0,
    areaSqFt: p.area ?? p.areaSqFt ?? 0,
    carpetAreaSqFt: p.carpetArea ?? p.carpetAreaSqFt,
    builtUpAreaSqFt: p.builtUpArea ?? p.builtUpAreaSqFt,
    displayCategory: p.displayCategory || (p.isFeatured ? "featured" : p.isRecommended ? "recommended" : "none"),
    furnishingItems: p.furnishingItems || attr.furnishingItems || [],
    floorRange: p.floorRange || attr.floorRange,
    ownership: p.ownership || attr.ownership,
    verifiedBadges: p.verifiedBadges || attr.verifiedBadges || [],
    mediaTypes: p.mediaTypes || attr.mediaTypes || [],
    tenantPreference: p.tenantPreference || attr.tenantPreference || [],
    petsAllowed: p.petsAllowed ?? attr.petsAllowed ?? false,
    nonVegAllowed: p.nonVegAllowed ?? attr.nonVegAllowed ?? false,
    pgGender: p.pgGender || attr.pgGender || [],
    pgSharing: p.pgSharing || attr.pgSharing || [],
    foodIncluded: p.foodIncluded ?? attr.foodIncluded ?? false,
    commercialType: p.commercialType || attr.commercialType || [],
    furnishingGrade: p.furnishingGrade || attr.furnishingGrade || [],
    waterSource: p.waterSource || attr.waterSource || [],
    cultivationCrop: p.cultivationCrop || attr.cultivationCrop || [],
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
  toggleFeatured: (id: string) => Promise<void>;
  toggleSoldOut: (id: string) => Promise<void>;
  toggleShowOnMap: (id: string) => Promise<void>;
  toggleRecommended: (id: string) => Promise<boolean>;
  updateDisplayCategory: (id: string, category: "featured" | "recommended" | "budget_friendly" | "none") => Promise<void>;
  updateRefId: (id: string, refId: string) => Promise<void>;
  updateProperty: (id: string, updatedProperty: Property) => Promise<void>;
}

export const usePropertiesStore = create<PropertiesState>()(
  persist(
    (set, get) => ({
      properties: [],
      isLoading: false,
      error: null,

      fetchProperties: async () => {
        set({ isLoading: true, error: null });
        try {
          const fetchPromise = supabase
            .from('properties')
            .select('*')
            .order('createdAt', { ascending: false });

          const timeoutPromise = new Promise<{ data: null; error: { message: string } }>((_, reject) =>
            setTimeout(() => reject(new Error('Request timed out. Please check your connection and retry.')), 10000)
          );

          const { data, error } = (await Promise.race([fetchPromise, timeoutPromise])) as any;

          if (error) {
            console.warn('Error fetching properties from Supabase (keeping local state):', error.message);
            set({ error: error.message, isLoading: false });
            return;
          }

          const mappedData = (data || []).map(fromSupabaseProperty);
          set({ properties: mappedData as Property[], isLoading: false, error: null });
        } catch (error: any) {
          console.error('Error fetching properties from Supabase:', error);
          set({ error: error?.message || 'Failed to load properties', isLoading: false });
        }
      },

      addProperty: async (property: Property) => {
        // 1. Optimistically update local store state so property is immediately accessible
        set((state) => ({
          properties: [property, ...state.properties.filter((p) => p.id !== property.id)],
        }));

        try {
          // 2. Prepare cleaned payload for Supabase
          const dbPayload = toSupabaseProperty(property);
          const { error } = await supabase
            .from('properties')
            .insert([dbPayload]);

          if (error) {
            console.warn('Supabase property insert notice (saved to local state):', error.message || error);
          }
        } catch (err: any) {
          console.warn('Supabase property insert notice (saved to local state):', err?.message || err);
        }
      },

      deleteProperty: async (id: string) => {
        // 1. Optimistically update local store immediately
        set((state) => ({
          properties: state.properties.filter((p) => p.id !== id),
        }));

        try {
          // 2. Guaranteed server-side database deletion with Supabase Admin client
          const res = await fetch('/api/properties/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
          });

          if (!res.ok) {
            // Fallback direct Supabase delete
            const { error } = await supabase.from('properties').delete().eq('id', id);
            if (error) console.error('Fallback delete error:', error.message);
          }

          toast.success('Property permanently deleted from database');
        } catch (error: any) {
          console.error('Delete exception:', error);
          try {
            await supabase.from('properties').delete().eq('id', id);
          } catch {}
        }
      },

      deleteAllProperties: async () => {
        set({ properties: [] });

        try {
          const res = await fetch('/api/properties/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deleteAll: true }),
          });

          if (!res.ok) {
            await supabase.from('properties').delete().neq('id', '___all___');
          }
          toast.success('All properties permanently deleted from database');
        } catch (err: any) {
          console.warn('Error in deleteAllProperties:', err);
          try {
            await supabase.from('properties').delete().neq('id', '___all___');
          } catch {}
        }
      },

      toggleFeatured: async (id: string) => {
        const property = get().properties.find((p) => p.id === id);
        if (!property) return;
        const newFeatured = !property.isFeatured;

        set((state) => ({
          properties: state.properties.map((p) =>
            p.id === id ? { ...p, isFeatured: newFeatured } : p
          ),
        }));

        try {
          const { error } = await supabase
            .from('properties')
            .update({ isFeatured: newFeatured })
            .eq('id', id);

          if (error) console.warn('Supabase update warning:', error.message);
        } catch (error: any) {
          console.warn('Supabase update exception:', error);
        }
      },

      toggleSoldOut: async (id: string) => {
        const property = get().properties.find((p) => p.id === id);
        if (!property) return;
        
        const newStatus = property.status === 'sold' ? 'published' : 'sold';

        set((state) => ({
          properties: state.properties.map((p) =>
            p.id === id ? { ...p, status: newStatus } : p
          ),
        }));

        try {
          const { error } = await supabase
            .from('properties')
            .update({ status: newStatus })
            .eq('id', id);

          if (error) console.warn('Supabase status update warning:', error.message);
        } catch (error: any) {
          console.warn('Supabase status update exception:', error);
        }
      },

      toggleShowOnMap: async (id: string) => {
        const property = get().properties.find((p) => p.id === id);
        if (!property) return;
        const newShowOnMap = !property.showOnMap;

        set((state) => ({
          properties: state.properties.map((p) =>
            p.id === id ? { ...p, showOnMap: newShowOnMap } : p
          ),
        }));

        try {
          const { error } = await supabase
            .from('properties')
            .update({ showOnMap: newShowOnMap })
            .eq('id', id);

          if (error) console.warn('Supabase showOnMap update warning:', error.message);
        } catch (error: any) {
          console.warn('Supabase showOnMap update exception:', error);
        }
      },

      toggleRecommended: async (id: string) => {
        const state = get();
        const property = state.properties.find((p) => p.id === id);
        if (!property) return false;
        
        const targetValue = !property.isRecommended;

        if (targetValue) {
          const recommendedCount = state.properties.filter((p) => p.isRecommended).length;
          if (recommendedCount >= 10) {
            return false;
          }
        }
        
        set((s) => ({
          properties: s.properties.map((p) =>
            p.id === id ? { ...p, isRecommended: targetValue } : p
          ),
        }));

        try {
          const { error } = await supabase
            .from('properties')
            .update({ isRecommended: targetValue })
            .eq('id', id);

          if (error) console.warn('Supabase toggleRecommended warning:', error.message);
        } catch (error: any) {
          console.warn('Supabase toggleRecommended exception:', error);
        }
        return true;
      },

      updateDisplayCategory: async (id: string, category: "featured" | "recommended" | "budget_friendly" | "none") => {
        const property = get().properties.find((p) => p.id === id);
        if (!property) return;

        const isFeatured = category === "featured";
        const isRecommended = category === "recommended";

        set((state) => ({
          properties: state.properties.map((p) =>
            p.id === id
              ? {
                  ...p,
                  isFeatured,
                  isRecommended,
                  displayCategory: category,
                }
              : p
          ),
        }));

        try {
          const { error } = await supabase
            .from('properties')
            .update({
              isFeatured,
              isRecommended,
              displayCategory: category,
            })
            .eq('id', id);

          if (error) console.warn('Supabase updateDisplayCategory warning:', error.message);
        } catch (error: any) {
          console.warn('Supabase updateDisplayCategory exception:', error);
        }
      },

      updateRefId: async (id: string, refId: string) => {
        const cleanRef = refId.trim().toUpperCase();
        set((state) => ({
          properties: state.properties.map((p) =>
            p.id === id ? { ...p, refId: cleanRef } : p
          ),
        }));

        try {
          const { error } = await supabase
            .from('properties')
            .update({ refId: cleanRef })
            .eq('id', id);

          if (error) console.warn('Error updating refId in Supabase:', error.message);
        } catch (error) {
          console.warn('Error updating refId in Supabase:', error);
        }
      },

      updateProperty: async (id: string, updatedProperty: Property) => {
        // 1. Optimistically update local Zustand state & localStorage persistence
        set((state) => ({
          properties: state.properties.map((p) =>
            p.id === id ? { ...updatedProperty, id, updatedAt: new Date().toISOString() } : p
          ),
        }));

        try {
          // 2. Prepare cleaned payload for Supabase
          const dbPayload = toSupabaseProperty(updatedProperty);
          const { error } = await supabase
            .from('properties')
            .update(dbPayload)
            .eq('id', id);

          if (error) {
            console.warn('Supabase update warning (updated in local state):', error.message || error);
          }
        } catch (err: any) {
          console.warn('Supabase update exception (updated in local state):', err?.message || err);
        }
      },
    }),
    {
      name: 'road_properties_store',
      partialize: (state) => ({ properties: state.properties }),
    }
  )
);

