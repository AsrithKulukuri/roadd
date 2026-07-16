import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FavoritesState {
  savedPropertyIds: string[];
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      savedPropertyIds: [],
      toggleFavorite: (id) => {
        set((state) => {
          const isSaved = state.savedPropertyIds.includes(id);
          if (isSaved) {
            return {
              savedPropertyIds: state.savedPropertyIds.filter((pId) => pId !== id),
            };
          } else {
            return {
              savedPropertyIds: [...state.savedPropertyIds, id],
            };
          }
        });
      },
      isFavorite: (id) => get().savedPropertyIds.includes(id),
    }),
    {
      name: 'road-favorites-storage', // unique name
    }
  )
);
