import { create } from 'zustand';
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

export const usePropertiesStore = create<PropertiesState>((set, get) => ({
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
      
      set({ properties: (data as Property[]) || [], isLoading: false });
    } catch (error: any) {
      console.error('Error fetching properties:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  addProperty: async (property) => {
    try {
      const { error } = await supabase
        .from('properties')
        .insert([property]);

      if (error) throw error;

      set((state) => ({
        properties: [property, ...state.properties],
      }));
    } catch (error: any) {
      console.error('Error adding property:', error);
      throw error;
    }
  },

  deleteProperty: async (id) => {
    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        properties: state.properties.filter((p) => p.id !== id),
      }));
    } catch (error: any) {
      console.error('Error deleting property:', error);
      throw error;
    }
  },

  toggleFeatured: async (id) => {
    const property = get().properties.find(p => p.id === id);
    if (!property) return;

    try {
      const { error } = await supabase
        .from('properties')
        .update({ isFeatured: !property.isFeatured })
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        properties: state.properties.map((p) =>
          p.id === id ? { ...p, isFeatured: !p.isFeatured } : p
        ),
      }));
    } catch (error: any) {
      console.error('Error toggling featured:', error);
      throw error;
    }
  },

  toggleSoldOut: async (id) => {
    const property = get().properties.find(p => p.id === id);
    if (!property) return;
    
    const newStatus = property.status === 'sold' ? 'published' : 'sold';

    try {
      const { error } = await supabase
        .from('properties')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        properties: state.properties.map((p) =>
          p.id === id ? { ...p, status: newStatus } : p
        ),
      }));
    } catch (error: any) {
      console.error('Error toggling sold out:', error);
      throw error;
    }
  },

  toggleShowOnMap: async (id) => {
    const property = get().properties.find(p => p.id === id);
    if (!property) return;

    try {
      const { error } = await supabase
        .from('properties')
        .update({ showOnMap: !property.showOnMap })
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        properties: state.properties.map((p) =>
          p.id === id ? { ...p, showOnMap: !p.showOnMap } : p
        ),
      }));
    } catch (error: any) {
      console.error('Error toggling show on map:', error);
      throw error;
    }
  },

  toggleRecommended: async (id) => {
    const state = get();
    const property = state.properties.find(p => p.id === id);
    if (!property) return false;
    
    if (property.isRecommended) {
      try {
        const { error } = await supabase
          .from('properties')
          .update({ isRecommended: false })
          .eq('id', id);

        if (error) throw error;

        set({
          properties: state.properties.map(p => 
            p.id === id ? { ...p, isRecommended: false } : p
          )
        });
        return true;
      } catch (error) {
        console.error('Error removing recommendation:', error);
        return false;
      }
    }
    
    // Check limit
    const recommendedCount = state.properties.filter(p => p.isRecommended).length;
    if (recommendedCount >= 10) {
      return false; 
    }
    
    try {
      const { error } = await supabase
        .from('properties')
        .update({ isRecommended: true })
        .eq('id', id);

      if (error) throw error;

      set({
        properties: state.properties.map(p => 
          p.id === id ? { ...p, isRecommended: true } : p
        )
      });
      return true;
    } catch (error) {
      console.error('Error setting recommendation:', error);
      return false;
    }
  },

  updateRefId: async (id: string, refId: string) => {
    const cleanRef = refId.trim().toUpperCase();
    try {
      await supabase
        .from('properties')
        .update({ refId: cleanRef })
        .eq('id', id);
    } catch (error) {
      console.error('Error updating refId in Supabase:', error);
    }

    set((state) => ({
      properties: state.properties.map((p) =>
        p.id === id ? { ...p, refId: cleanRef } : p
      ),
    }));
  },
}));
