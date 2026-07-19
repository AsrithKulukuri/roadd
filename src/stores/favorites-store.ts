import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { toast } from 'sonner';

interface FavoritesState {
  savedPropertyIds: string[];
  isLoading: boolean;
  isInitialized: boolean;
  toggleFavorite: (id: string) => Promise<void>;
  isFavorite: (id: string) => boolean;
  syncWithSupabase: () => Promise<void>;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      savedPropertyIds: [],
      isLoading: false,
      isInitialized: false,

      syncWithSupabase: async () => {
        if (!isSupabaseConfigured()) {
          set({ isInitialized: true });
          return;
        }

        set({ isLoading: true });
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.user) {
            set({ isLoading: false, isInitialized: true, savedPropertyIds: [] });
            return;
          }

          const { data, error } = await supabase
            .from('saved_properties')
            .select('property_id')
            .eq('user_id', session.user.id);

          if (error) throw error;

          const ids = data ? data.map(d => d.property_id) : [];
          set({ savedPropertyIds: ids, isLoading: false, isInitialized: true });
        } catch (error) {
          console.error('Error syncing favorites:', error);
          set({ isLoading: false, isInitialized: true });
        }
      },

      toggleFavorite: async (id) => {
        const { savedPropertyIds } = get();
        const isSaved = savedPropertyIds.includes(id);

        // Optimistic UI update
        if (isSaved) {
          set({ savedPropertyIds: savedPropertyIds.filter((pId) => pId !== id) });
        } else {
          set({ savedPropertyIds: [...savedPropertyIds, id] });
        }

        // Supabase sync
        if (isSupabaseConfigured()) {
          const { data: { session } } = await supabase.auth.getSession();
          
          if (!session?.user) {
            // User not logged in, show toast but keep optimistic local storage update
            toast.error('Sign in to save properties across devices');
            return;
          }

          try {
            if (isSaved) {
              const { error } = await supabase
                .from('saved_properties')
                .delete()
                .eq('user_id', session.user.id)
                .eq('property_id', id);
              if (error) throw error;
            } else {
              const { error } = await supabase
                .from('saved_properties')
                .insert([{ user_id: session.user.id, property_id: id }]);
              if (error) throw error;
            }
          } catch (error) {
            console.error('Error toggling favorite in Supabase:', error);
            // Revert optimistic update
            set({ savedPropertyIds });
            toast.error('Failed to save property. Please try again.');
          }
        }
      },
      
      isFavorite: (id) => get().savedPropertyIds.includes(id),
    }),
    {
      name: 'road-favorites-storage', // Keep local storage fallback
    }
  )
);
