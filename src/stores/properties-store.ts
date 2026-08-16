import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import { deleteFromS3 } from '@/lib/aws/storage-utils';
import type { Property } from '@/types/property';

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
          const { data, error } = await supabase
            .from('properties')
            .select('*')
            .order('createdAt', { ascending: false });

          if (error) throw error;
          if (data) {
            const mappedData = data.map((p: any) => {
              if (!p.displayCategory) {
                if (p.isFeatured) p.displayCategory = "featured";
                else if (p.isRecommended) p.displayCategory = "recommended";
                else p.displayCategory = "none";
              }
              return p;
            });
            set({ properties: mappedData as Property[], isLoading: false });
          } else {
            set({ isLoading: false });
          }
        } catch (error: any) {
          console.error('Error fetching properties from Supabase:', error);
          set({ error: error.message, isLoading: false });
        }
      },

      addProperty: async (property: Property) => {
        // 1. Optimistically update local store state so property is immediately created
        set((state) => ({
          properties: [property, ...state.properties.filter((p) => p.id !== property.id)],
        }));

        try {
          // 2. Try inserting full object into Supabase
          let { error } = await supabase
            .from('properties')
            .insert([property]);

          // 3. If failure due to missing column (e.g. refId), strip refId and retry
          if (error && (error.message?.includes('refId') || error.code === 'PGRST204')) {
            const { refId, ...dbPayload } = property as any;
            const retryRes = await supabase
              .from('properties')
              .insert([dbPayload]);
            error = retryRes.error;
          }

          if (error) {
            console.warn('Supabase property insert notice (saved to local state):', error.message || error);
          }
        } catch (err: any) {
          console.warn('Supabase property insert notice (saved to local state):', err?.message || err);
        }
      },

      deleteProperty: async (id: string) => {
        const property = get().properties.find((p) => p.id === id);

        set((state) => ({
          properties: state.properties.filter((p) => p.id !== id),
        }));

        try {
          const { error } = await supabase
            .from('properties')
            .delete()
            .eq('id', id);

          if (error) {
            console.warn('Supabase delete warning:', error.message);
          } else if (property) {
            // Delete associated storage files from AWS S3
            const urlsToDelete: string[] = [];
            if (property.coverImage) urlsToDelete.push(property.coverImage);
            if (property.videoUrl) urlsToDelete.push(property.videoUrl);
            if (property.layoutMapUrl) urlsToDelete.push(property.layoutMapUrl);
            if (property.floorPlanUrl) urlsToDelete.push(property.floorPlanUrl);
            if (property.brochureUrl) urlsToDelete.push(property.brochureUrl);
            property.images?.forEach((img) => { if (img.url) urlsToDelete.push(img.url); });
            property.galleryImages?.forEach((url) => { if (url) urlsToDelete.push(url); });

            if (urlsToDelete.length > 0) {
              await deleteFromS3(urlsToDelete);
            }
          }
        } catch (error: any) {
          console.warn('Supabase delete exception:', error);
        }
      },

      deleteAllProperties: async () => {
        const allProperties = get().properties;
        set({ properties: [] });

        try {
          // 1. Delete all records from Supabase
          const { error } = await supabase
            .from('properties')
            .delete()
            .neq('id', '___all___');

          if (error) {
            console.warn('Supabase delete all notice:', error.message);
          }

          // 2. Delete all S3 assets
          const urlsToDelete: string[] = [];
          allProperties.forEach((property) => {
            if (property.coverImage) urlsToDelete.push(property.coverImage);
            if (property.videoUrl) urlsToDelete.push(property.videoUrl);
            if (property.layoutMapUrl) urlsToDelete.push(property.layoutMapUrl);
            if (property.floorPlanUrl) urlsToDelete.push(property.floorPlanUrl);
            if (property.brochureUrl) urlsToDelete.push(property.brochureUrl);
            property.images?.forEach((img) => { if (img.url) urlsToDelete.push(img.url); });
            property.galleryImages?.forEach((url) => { if (url) urlsToDelete.push(url); });
          });

          if (urlsToDelete.length > 0) {
            await deleteFromS3(urlsToDelete);
          }
        } catch (err: any) {
          console.warn('Error in deleteAllProperties:', err);
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
        const isBudgetFriendly = category === "budget_friendly";

        set((state) => ({
          properties: state.properties.map((p) =>
            p.id === id
              ? {
                  ...p,
                  isFeatured,
                  isRecommended,
                  displayCategory: category,
                  // Optionally you could map isBudgetFriendly to a boolean on Property if needed
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
          // 2. Try updating full object in Supabase DB
          let { error } = await supabase
            .from('properties')
            .update(updatedProperty)
            .eq('id', id);

          // 3. If failure due to missing column (e.g. refId), strip refId and retry
          if (error && (error.message?.includes('refId') || error.code === 'PGRST204')) {
            const { refId, ...dbPayload } = updatedProperty as any;
            const retryRes = await supabase
              .from('properties')
              .update(dbPayload)
              .eq('id', id);
            error = retryRes.error;
          }

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

