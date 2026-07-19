import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { mockProperties as initialMockData } from '@/lib/mock-data';
import type { Property } from '@/types/property';

interface PropertiesState {
  properties: Property[];
  addProperty: (property: Property) => void;
  deleteProperty: (id: string) => void;
  toggleFeatured: (id: string) => void;
  toggleSoldOut: (id: string) => void;
  toggleShowOnMap: (id: string) => void;
  toggleRecommended: (id: string) => boolean;
}

export const usePropertiesStore = create<PropertiesState>()(
  persist(
    (set, get) => ({
  properties: initialMockData.map((p, i) => ({ ...p, showOnMap: true, isRecommended: i < 4 })),
  addProperty: (property) => {
    set((state) => ({
      properties: [property, ...state.properties],
    }));
  },
  deleteProperty: (id) => {
    set((state) => ({
      properties: state.properties.filter((p) => p.id !== id),
    }));
  },
  toggleFeatured: (id) => {
    set((state) => ({
      properties: state.properties.map((p) =>
        p.id === id ? { ...p, isFeatured: !p.isFeatured } : p
      ),
    }));
  },
  toggleSoldOut: (id) => {
    set((state) => ({
      properties: state.properties.map((p) =>
        p.id === id
          ? { 
              ...p, 
              status: p.status === 'sold' ? 'published' : 'sold'
            }
          : p
      ),
    }));
  },
  toggleShowOnMap: (id) => {
    set((state) => ({
      properties: state.properties.map((p) =>
        p.id === id ? { ...p, showOnMap: !p.showOnMap } : p
      ),
    }));
  },
  toggleRecommended: (id) => {
    const state = get();
    const property = state.properties.find(p => p.id === id);
    if (!property) return false;
    
    // If it's already recommended, we can always un-recommend it
    if (property.isRecommended) {
      set({
        properties: state.properties.map(p => 
          p.id === id ? { ...p, isRecommended: false } : p
        )
      });
      return true;
    }
    
    // If we're trying to recommend it, check limit
    const recommendedCount = state.properties.filter(p => p.isRecommended).length;
    if (recommendedCount >= 10) {
      return false; // Limit reached
    }
    
    set({
      properties: state.properties.map(p => 
        p.id === id ? { ...p, isRecommended: true } : p
      )
    });
    return true;
  },
    }),
    {
      name: 'road-properties-storage',
    }
  )
);
