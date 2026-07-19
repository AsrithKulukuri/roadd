import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { mockTrendingLocations } from "@/lib/mock-data";

export interface TrendingLocation {
  id?: string;
  city: string;
  locality: string;
  image: string;
  properties_count: number;
}

interface ContentState {
  trendingLocations: TrendingLocation[];
  isLoading: boolean;
  fetchTrendingLocations: () => Promise<void>;
  addLocation: (location: TrendingLocation) => Promise<void>;
  updateLocation: (id: string, location: Partial<TrendingLocation>) => Promise<void>;
  deleteLocation: (id: string) => Promise<void>;
}

export const useContentStore = create<ContentState>((set) => ({
  trendingLocations: mockTrendingLocations.map((loc, i) => ({
    id: `mock-${i}`,
    city: loc.city,
    locality: loc.locality,
    image: loc.image,
    properties_count: loc.totalListings,
  })),
  isLoading: false,

  fetchTrendingLocations: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from("trending_locations")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) {
        if (error.code !== "42P01") {
          console.error("Error fetching locations:", error);
        }
        set({ isLoading: false });
        return;
      }

      if (data && data.length > 0) {
        set({ trendingLocations: data, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (err) {
      console.error("Fetch error:", err);
      set({ isLoading: false });
    }
  },

  addLocation: async (location) => {
    try {
      const { data, error } = await supabase
        .from("trending_locations")
        .insert([location])
        .select()
        .single();

      if (error) {
        toast.error("Failed to add location: " + error.message);
        throw error;
      }

      if (data) {
        set((state) => ({
          trendingLocations: [...state.trendingLocations, data],
        }));
        toast.success("Location added successfully");
      }
    } catch (error) {
      console.error("Add location error:", error);
    }
  },

  updateLocation: async (id, location) => {
    try {
      const { data, error } = await supabase
        .from("trending_locations")
        .update(location)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        toast.error("Failed to update location: " + error.message);
        throw error;
      }

      if (data) {
        set((state) => ({
          trendingLocations: state.trendingLocations.map((loc) =>
            loc.id === id ? data : loc
          ),
        }));
        toast.success("Location updated successfully");
      }
    } catch (error) {
      console.error("Update location error:", error);
    }
  },

  deleteLocation: async (id) => {
    try {
      const { error } = await supabase
        .from("trending_locations")
        .delete()
        .eq("id", id);

      if (error) {
        toast.error("Failed to delete location: " + error.message);
        throw error;
      }

      set((state) => ({
        trendingLocations: state.trendingLocations.filter((loc) => loc.id !== id),
      }));
      toast.success("Location deleted successfully");
    } catch (error) {
      console.error("Delete location error:", error);
    }
  },
}));
