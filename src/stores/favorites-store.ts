import { create } from 'zustand';
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

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  savedPropertyIds: [],
  isLoading: false,
  isInitialized: false,

  syncWithSupabase: async () => {
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
    // Check session first
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      toast.error('Sign in to save properties', {
        description: 'Create a free account to save and sync properties across devices.',
        action: { label: 'Sign In', onClick: () => window.location.href = '/login' },
      });
      return;
    }

    const { savedPropertyIds } = get();
    const isSaved = savedPropertyIds.includes(id);

    // Optimistic UI update
    if (isSaved) {
      set({ savedPropertyIds: savedPropertyIds.filter(pId => pId !== id) });
    } else {
      set({ savedPropertyIds: [...savedPropertyIds, id] });
    }

    try {
      if (isSaved) {
        const { error } = await supabase
          .from('saved_properties')
          .delete()
          .eq('user_id', session.user.id)
          .eq('property_id', id);
        if (error) throw error;
        toast.success('Removed from saved');
      } else {
        const { error } = await supabase
          .from('saved_properties')
          .insert([{ user_id: session.user.id, property_id: id }]);
        if (error) throw error;
        toast.success('Property saved!');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      // Revert optimistic update
      set({ savedPropertyIds });
      toast.error('Failed to save property. Please try again.');
    }
  },

  isFavorite: (id) => get().savedPropertyIds.includes(id),
}));
