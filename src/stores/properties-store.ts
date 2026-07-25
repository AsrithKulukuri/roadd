import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import type { Property } from '@/types/property';

interface PropertiesState {
  properties: Property[];
  isLoading: boolean;
  error: string | null;
  fetchProperties: () => Promise<void>;
  addProperty: (property: Property) => Promise<void>;
  deleteProperty: (id: string) => Promise<void>;
  toggleFeatured: (id: string) => Promise<void>;
  toggleSoldOut: (id: string) => Promise<void>;
  toggleShowOnMap: (id: string) => Promise<void>;
  toggleRecommended: (id: string) => Promise<boolean>;
  updateRefId: (id: string, refId: string) => Promise<void>;
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
          
          if (data && data.length > 0) {
            const dbProperties = data as Property[];
            set((state) => {
              const dbIds = new Set(dbProperties.map((p) => p.id));
              const localOnlyProperties = state.properties.filter((p) => !dbIds.has(p.id));
              return {
                properties: [...localOnlyProperties, ...dbProperties],
                isLoading: false,
              };
            });
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
        set((state) => ({
          properties: state.properties.filter((p) => p.id !== id),
        }));

        try {
          const { error } = await supabase
            .from('properties')
            .delete()
            .eq('id', id);

          if (error) console.warn('Supabase delete warning:', error.message);
        } catch (error: any) {
          console.warn('Supabase delete exception:', error);
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

          if (error) console.warn('Supabase recommendation update warning:', error.message);
        } catch (error) {
          console.warn('Supabase recommendation update exception:', error);
        }
        return true;
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
    }),
    {
      name: 'road_properties_store',
      partialize: (state) => ({ properties: state.properties }),
    }
  )
);

