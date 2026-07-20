import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
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
        set({ isLoading: true });
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const { data, error } = await supabase
              .from('saved_properties')
              .select('property_id')
              .eq('user_id', session.user.id);

            if (!error && data) {
              const dbIds = data.map((d) => d.property_id);
              // Merge local saved IDs with database saved IDs
              const merged = Array.from(new Set([...get().savedPropertyIds, ...dbIds]));
              set({ savedPropertyIds: merged });
            }
          }
        } catch (error) {
          console.error('Error syncing favorites:', error);
        } finally {
          set({ isLoading: false, isInitialized: true });
        }
      },

      toggleFavorite: async (id) => {
        const { savedPropertyIds } = get();
        const isSaved = savedPropertyIds.includes(id);

        // 1. Instant local state update (Zero UI freeze)
        const updatedIds = isSaved
          ? savedPropertyIds.filter((pId) => pId !== id)
          : [...savedPropertyIds, id];

        set({ savedPropertyIds: updatedIds });

        if (isSaved) {
          toast.success('Removed from saved properties');
        } else {
          toast.success('Property saved!');
        }

        // 2. Background sync to Supabase if logged in
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            if (isSaved) {
              await supabase
                .from('saved_properties')
                .delete()
                .eq('user_id', session.user.id)
                .eq('property_id', id);
            } else {
              await supabase
                .from('saved_properties')
                .insert([{ user_id: session.user.id, property_id: id }]);
            }
          } else if (!isSaved) {
            // Friendly tip for guest users
            toast.info('Sign in to sync saved properties across your devices', {
              action: {
                label: 'Sign In',
                onClick: () => (window.location.href = '/login'),
              },
            });
          }
        } catch (error) {
          console.error('Background favorite sync error:', error);
        }
      },

      isFavorite: (id) => get().savedPropertyIds.includes(id),
    }),
    {
      name: 'road-favorites-storage', // Keep local storage backup so guests never lose saved items
    }
  )
);
