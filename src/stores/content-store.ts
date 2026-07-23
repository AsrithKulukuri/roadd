import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { mockTrendingLocations } from "@/lib/mock-data";

export interface TrendingLocation {
  id: string;
  city: string;
  locality: string;
  image: string;
  properties_count: number;
}

export interface HomeCategory {
  id: string;
  name: string;
  type: string; // e.g., 'apartment', 'villa', 'residential-land', 'shops', etc.
  icon: string;
  description: string;
  count: number;
  image?: string;
  isFeatured?: boolean;
}

export interface ApRegion {
  id: string;
  name: string;
  tagline: string;
  image: string;
  subRegions: string[];
  propertyCount: number;
}

const initialCategories: HomeCategory[] = [
  { id: "cat-1", name: "Gated Apartments", type: "apartment", icon: "Building2", description: "Modern multi-storey luxury flats", count: 42, isFeatured: true, image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&q=80" },
  { id: "cat-2", name: "Luxury Villas", type: "villa", icon: "Home", description: "Independent sea-view & city villas", count: 18, isFeatured: true, image: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=600&q=80" },
  { id: "cat-3", name: "Plots & Open Land", type: "residential-land", icon: "Trees", description: "CRDA & DTCP approved plots", count: 65, isFeatured: true, image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=80" },
  { id: "cat-4", name: "Commercial Space", type: "shops", icon: "Store", description: "Retail shops, offices & complexes", count: 14, isFeatured: false, image: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80" },
  { id: "cat-5", name: "Farmhouses & Estates", type: "farmhouse", icon: "Sun", description: "Green getaway agricultural land", count: 9, isFeatured: false, image: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&q=80" },
];

const initialApRegions: ApRegion[] = [
  { id: "ap-1", name: "Vijayawada Central", tagline: "Commercial & Residential Hub of AP", image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80", subRegions: ["Benz Circle", "Poranki", "Kanuru", "Tadepalli", "Gollapudi", "Patamata"], propertyCount: 128 },
  { id: "ap-2", name: "Guntur & Amaravati", tagline: "Capital Growth Corridor", image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=80", subRegions: ["Gorantla", "Amaravati Road", "Brodipet", "Kaza", "Pedakakani", "Namburu"], propertyCount: 84 },
  { id: "ap-3", name: "Visakhapatnam (Vizag)", tagline: "Coastal Smart City & IT Hub", image: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=600&q=80", subRegions: ["Rushikonda", "MVP Colony", "Madhurawada", "Gajuwaka", "Seethammadhara"], propertyCount: 96 },
  { id: "ap-4", name: "Tirupati & Chittoor", tagline: "Spiritual Hub & Industrial Corridor", image: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&q=80", subRegions: ["Renigunta", "Alipiri", "Tiruchanoor", "Sri City"], propertyCount: 45 },
];

interface ContentState {
  trendingLocations: TrendingLocation[];
  homeCategories: HomeCategory[];
  apRegions: ApRegion[];
  isLoading: boolean;
  
  // Trending Locations Actions
  fetchTrendingLocations: () => Promise<void>;
  addLocation: (location: Omit<TrendingLocation, "id">) => Promise<void>;
  updateLocation: (id: string, location: Partial<TrendingLocation>) => Promise<void>;
  deleteLocation: (id: string) => Promise<void>;

  // Home Categories Actions
  addCategory: (category: Omit<HomeCategory, "id">) => void;
  updateCategory: (id: string, category: Partial<HomeCategory>) => void;
  deleteCategory: (id: string) => void;

  // Explore AP & Sub-regions Actions
  addApRegion: (region: Omit<ApRegion, "id">) => void;
  updateApRegion: (id: string, region: Partial<ApRegion>) => void;
  deleteApRegion: (id: string) => void;
  addSubRegion: (regionId: string, subRegionName: string) => void;
  removeSubRegion: (regionId: string, subRegionName: string) => void;
}

export const useContentStore = create<ContentState>((set) => ({
  trendingLocations: mockTrendingLocations.map((loc, i) => ({
    id: `loc-${i + 1}`,
    city: loc.city,
    locality: loc.locality,
    image: loc.image,
    properties_count: loc.totalListings,
  })),
  homeCategories: initialCategories,
  apRegions: initialApRegions,
  isLoading: false,

  fetchTrendingLocations: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from("trending_locations")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) {
        set({ isLoading: false });
        return;
      }

      if (data && data.length > 0) {
        set({ trendingLocations: data as TrendingLocation[], isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (err) {
      set({ isLoading: false });
    }
  },

  addLocation: async (location) => {
    const newLoc: TrendingLocation = {
      id: `loc-${Date.now()}`,
      ...location,
    };
    try {
      const { data, error } = await supabase
        .from("trending_locations")
        .insert([newLoc])
        .select()
        .single();

      if (data) {
        set((state) => ({
          trendingLocations: [...state.trendingLocations, data],
        }));
      } else {
        set((state) => ({
          trendingLocations: [...state.trendingLocations, newLoc],
        }));
      }
      toast.success("Trending Location added successfully!");
    } catch (error) {
      set((state) => ({
        trendingLocations: [...state.trendingLocations, newLoc],
      }));
      toast.success("Trending Location added!");
    }
  },

  updateLocation: async (id, location) => {
    try {
      await supabase.from("trending_locations").update(location).eq("id", id);
    } catch (err) {
      // Ignore fallback
    }
    set((state) => ({
      trendingLocations: state.trendingLocations.map((loc) =>
        loc.id === id ? { ...loc, ...location } : loc
      ),
    }));
    toast.success("Location updated!");
  },

  deleteLocation: async (id) => {
    try {
      await supabase.from("trending_locations").delete().eq("id", id);
    } catch (err) {
      // Ignore fallback
    }
    set((state) => ({
      trendingLocations: state.trendingLocations.filter((loc) => loc.id !== id),
    }));
    toast.success("Location deleted!");
  },

  // Categories CRUD
  addCategory: (category) => {
    const newCat: HomeCategory = {
      id: `cat-${Date.now()}`,
      ...category,
    };
    set((state) => ({ homeCategories: [...state.homeCategories, newCat] }));
    toast.success("Home Category added!");
  },

  updateCategory: (id, category) => {
    set((state) => ({
      homeCategories: state.homeCategories.map((c) =>
        c.id === id ? { ...c, ...category } : c
      ),
    }));
    toast.success("Home Category updated!");
  },

  deleteCategory: (id) => {
    set((state) => ({
      homeCategories: state.homeCategories.filter((c) => c.id !== id),
    }));
    toast.success("Home Category deleted!");
  },

  // AP Regions CRUD
  addApRegion: (region) => {
    const newReg: ApRegion = {
      id: `ap-${Date.now()}`,
      ...region,
    };
    set((state) => ({ apRegions: [...state.apRegions, newReg] }));
    toast.success("AP Region added!");
  },

  updateApRegion: (id, region) => {
    set((state) => ({
      apRegions: state.apRegions.map((r) =>
        r.id === id ? { ...r, ...region } : r
      ),
    }));
    toast.success("AP Region updated!");
  },

  deleteApRegion: (id) => {
    set((state) => ({
      apRegions: state.apRegions.filter((r) => r.id !== id),
    }));
    toast.success("AP Region deleted!");
  },

  addSubRegion: (regionId, subRegionName) => {
    const clean = subRegionName.trim();
    if (!clean) return;
    set((state) => ({
      apRegions: state.apRegions.map((r) => {
        if (r.id === regionId && !r.subRegions.includes(clean)) {
          return { ...r, subRegions: [...r.subRegions, clean] };
        }
        return r;
      }),
    }));
    toast.success(`Sub-region "${clean}" added!`);
  },

  removeSubRegion: (regionId, subRegionName) => {
    set((state) => ({
      apRegions: state.apRegions.map((r) => {
        if (r.id === regionId) {
          return { ...r, subRegions: r.subRegions.filter((sr) => sr !== subRegionName) };
        }
        return r;
      }),
    }));
    toast.success(`Sub-region "${subRegionName}" removed!`);
  },
}));
