"use client";
import { create } from "zustand";
import { toast } from "sonner";
import { requireActionSession } from "@/lib/action-auth";
interface FavoritesState {
  savedPropertyIds: string[]; isLoading: boolean; isInitialized: boolean;
  toggleFavorite: (id: string) => Promise<void>;
  setSavedPropertyIds: (ids: string[]) => void;
  isFavorite: (id: string) => boolean;
  syncWithSupabase: () => Promise<void>;
}
const pending = new Set<string>();
export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  savedPropertyIds: [], isLoading: false, isInitialized: false,
  setSavedPropertyIds: (ids) => set({ savedPropertyIds: ids }),
  isFavorite: (id) => get().savedPropertyIds.includes(id),
  syncWithSupabase: async () => {
    set({ isLoading: true });
    try {
      const response = await fetch("/api/favorites", { cache: "no-store" });
      if (response.status === 401) { set({ savedPropertyIds: [] }); return; }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      set({ savedPropertyIds: data.ids || [] });
    } catch { /* Preserve the current list on a transient failure. */ }
    finally { set({ isLoading: false, isInitialized: true }); }
  },
  toggleFavorite: async (id) => {
    if (pending.has(id)) return;
    pending.add(id);
    try {
      if (!await requireActionSession("save_listing")) return;
      await get().syncWithSupabase();
      const saved = !get().savedPropertyIds.includes(id);
      const response = await fetch("/api/favorites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, saved }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save listing.");
      set({ savedPropertyIds: data.ids });
      toast.success(saved ? "Listing saved privately" : "Listing removed from saved");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to save listing."); }
    finally { pending.delete(id); }
  },
}));
if (typeof window !== "undefined") window.addEventListener("road_auth_changed", () => {
  useFavoritesStore.setState({ savedPropertyIds: [] });
  void useFavoritesStore.getState().syncWithSupabase();
});
