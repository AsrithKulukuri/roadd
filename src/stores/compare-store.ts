import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CompareState {
  comparePropertyIds: string[];
  toggleCompare: (id: string) => void;
  isCompared: (id: string) => boolean;
  clearCompare: () => void;
}

export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      comparePropertyIds: [],
      toggleCompare: (id) => {
        set((state) => {
          const isCompared = state.comparePropertyIds.includes(id);
          if (isCompared) {
            return {
              comparePropertyIds: state.comparePropertyIds.filter((pId) => pId !== id),
            };
          } else {
            // max 3 properties to compare
            if (state.comparePropertyIds.length >= 3) {
              return state;
            }
            return {
              comparePropertyIds: [...state.comparePropertyIds, id],
            };
          }
        });
      },
      isCompared: (id) => get().comparePropertyIds.includes(id),
      clearCompare: () => set({ comparePropertyIds: [] }),
    }),
    {
      name: 'road-compare-storage',
    }
  )
);
