import { create } from "zustand";
import { persist } from "zustand/middleware";
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
  subtitle?: string;
  badge?: string;
  badgeClass?: string;
  href?: string;
  type: string; // e.g., 'apartment', 'villa', 'residential-land', 'shops', etc.
  icon: string;
  description: string;
  count: number;
  image: string;
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
  {
    id: "new-listings",
    name: "New Listings",
    subtitle: "Freshly added properties",
    badge: "Last 30 days",
    badgeClass: "bg-white text-slate-900 font-bold shadow-md border border-slate-200/80 backdrop-blur-md",
    href: "/search?type=buy&saleType=new",
    type: "apartment",
    icon: "Sparkles",
    description: "Freshly added properties",
    count: 12450,
    image: "/images/categories/new_listings_img_1786320051269.png",
    isFeatured: true,
  },
  {
    id: "new-apartments",
    name: "New Apartments",
    subtitle: "Modern flats & high-rises",
    href: "/search?type=buy&propertyType=apartment",
    type: "apartment",
    icon: "Building2",
    description: "Modern flats & high-rises",
    count: 340,
    image: "/images/categories/new_apartments_img_1786320061003.png",
    isFeatured: true,
  },
  {
    id: "new-villas",
    name: "New Villas",
    subtitle: "Luxury standalone villas",
    badge: "Premium",
    badgeClass: "bg-white text-slate-900 font-bold shadow-md border border-slate-200/80 backdrop-blur-md",
    href: "/search?type=buy&propertyType=villa",
    type: "villa",
    icon: "Home",
    description: "Luxury standalone villas",
    count: 18,
    image: "/images/categories/new_villas_img_1786320073700.png",
    isFeatured: true,
  },
  {
    id: "individual",
    name: "Individual Homes",
    subtitle: "Independent homes & bungalows",
    href: "/search?type=buy&propertyType=independent-house",
    type: "independent-house",
    icon: "House",
    description: "Independent homes & bungalows",
    count: 95,
    image: "/images/categories/individual_houses_img_1786320084215.png",
    isFeatured: true,
  },
  {
    id: "build-floors",
    name: "Builder Floors",
    subtitle: "Multi-story independent floors",
    href: "/search?type=buy&propertyType=builder-floor",
    type: "builder-floor",
    icon: "Building2",
    description: "Multi-story independent floors",
    count: 65,
    image: "/images/categories/builder_floors_img_1786320103218.png",
    isFeatured: true,
  },
  {
    id: "resale",
    name: "Resale Homes",
    subtitle: "Pre-owned verified homes",
    href: "/search?type=buy&saleType=resale",
    type: "resale",
    icon: "Repeat",
    description: "Pre-owned verified homes",
    count: 38,
    image: "/images/categories/resale_img_1786320112412.png",
    isFeatured: true,
  },
  {
    id: "plots",
    name: "Plots & Lands",
    subtitle: "Ready for development",
    href: "/search?type=buy&propertyType=residential-plot",
    type: "residential-plot",
    icon: "Trees",
    description: "Ready for development",
    count: 14,
    image: "/images/categories/plots_img_1786320122995.png",
    isFeatured: true,
  },
  {
    id: "farm-lands",
    name: "Farm Lands",
    subtitle: "Agricultural & farm properties",
    badge: "Top Pick",
    badgeClass: "bg-white text-slate-900 font-bold shadow-md border border-slate-200/80 backdrop-blur-md",
    href: "/search?type=buy&propertyType=agricultural-land",
    type: "agricultural-land",
    icon: "Wheat",
    description: "Agricultural & farm properties",
    count: 42,
    image: "/images/categories/farm_lands_img_1786320133632.png",
    isFeatured: true,
  },
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

export const useContentStore = create<ContentState>()(
  persist(
    (set, get) => ({
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
          const { data } = await supabase
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
          await fetch("/api/locations/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "sublocation",
              subId: id,
            }),
          });
        } catch (err) {
          console.error("Failed to delete location on server:", err);
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
          subtitle: category.description || category.subtitle,
          href: category.href || "/search?type=buy",
          ...category,
        };
        set((state) => ({ homeCategories: [...state.homeCategories, newCat] }));
        toast.success("Home Category added!");
      },

      updateCategory: (id, category) => {
        set((state) => ({
          homeCategories: state.homeCategories.map((c) =>
            c.id === id ? { ...c, ...category, subtitle: category.subtitle || category.description || c.subtitle } : c
          ),
        }));
        toast.success("Home Category card updated!");
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
    }),
    {
      name: "roadfacing-content-store-v2",
    }
  )
);
