import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export interface SubLocation {
  id: string;
  name: string;
  tagline?: string;
  badge?: "Hot" | "Top" | "Fast Growing" | "High ROI" | "Popular" | string;
  count?: string;
}

export interface LocationCity {
  id: string;
  name: string;
  tagline?: string;
  icon?: string; // "MapPin" | "Building2" | "Landmark"
  isHeroPill: boolean;
  order: number;
  sublocations: SubLocation[];
}

export const INITIAL_CITIES: LocationCity[] = [
  {
    id: "city-vijayawada",
    name: "Vijayawada",
    tagline: "Commercial & Cultural Capital",
    icon: "MapPin",
    isHeroPill: true,
    order: 1,
    sublocations: [
      { id: "sub-vja-1", name: "Benz Circle", tagline: "Prime Commercial Hub", badge: "Hot", count: "45+ Homes" },
      { id: "sub-vja-2", name: "Poranki", tagline: "Fastest Growing Residential", badge: "Top", count: "32+ Homes" },
      { id: "sub-vja-3", name: "Kanuru", tagline: "Premium Villas & Apartments", badge: "High ROI", count: "28+ Homes" },
      { id: "sub-vja-4", name: "Patamata", tagline: "Central City Living", badge: "Hot", count: "38+ Homes" },
      { id: "sub-vja-5", name: "Tadepalli", tagline: "Near Capital Region", badge: "Fast Growing", count: "25+ Homes" },
      { id: "sub-vja-6", name: "Penamaluru", tagline: "Gated Communities", badge: "Top", count: "20+ Homes" },
      { id: "sub-vja-7", name: "Auto Nagar", tagline: "Commercial & Plots", badge: "High ROI", count: "18+ Homes" },
      { id: "sub-vja-8", name: "Gollapudi", tagline: "High Growth Hub", badge: "Popular", count: "15+ Homes" },
    ],
  },
  {
    id: "city-guntur",
    name: "Guntur",
    tagline: "Education & Commercial Epicenter",
    icon: "Building2",
    isHeroPill: true,
    order: 2,
    sublocations: [
      { id: "sub-gtr-1", name: "Gorantla", tagline: "Top Residential Location", badge: "Hot", count: "35+ Homes" },
      { id: "sub-gtr-2", name: "Amaravati Road", tagline: "Capital Highway Corridor", badge: "Fast Growing", count: "42+ Homes" },
      { id: "sub-gtr-3", name: "Brodipet", tagline: "Commercial & Premium Flats", badge: "Top", count: "30+ Homes" },
      { id: "sub-gtr-4", name: "Pattabhipuram", tagline: "Established Housing", badge: "Popular", count: "24+ Homes" },
      { id: "sub-gtr-5", name: "Kaza", tagline: "High-yield Plots & Villas", badge: "High ROI", count: "22+ Homes" },
      { id: "sub-gtr-6", name: "Mangalagiri", tagline: "Near AIIMS & Highway", badge: "Hot", count: "40+ Homes" },
      { id: "sub-gtr-7", name: "Pedakakani", tagline: "Connecting Corridor", badge: "Fast Growing", count: "16+ Homes" },
    ],
  },
  {
    id: "city-amaravati",
    name: "Amaravati",
    tagline: "AP Capital Mega Region",
    icon: "MapPin",
    isHeroPill: true,
    order: 3,
    sublocations: [
      { id: "sub-amr-1", name: "Secretariat Zone", tagline: "Core Government District", badge: "Hot", count: "30+ Projects" },
      { id: "sub-amr-2", name: "Rayapudi", tagline: "High Rise Township", badge: "Top", count: "22+ Projects" },
      { id: "sub-amr-3", name: "Tulluru", tagline: "Central Capital Corridor", badge: "Fast Growing", count: "28+ Projects" },
      { id: "sub-amr-4", name: "Velagapudi", tagline: "Administrative Hub", badge: "Hot", count: "18+ Projects" },
      { id: "sub-amr-5", name: "Mandadam", tagline: "Premium Riverside Lands", badge: "High ROI", count: "15+ Projects" },
      { id: "sub-amr-6", name: "Uddandarayunipalem", tagline: "Foundation Corridor", badge: "Popular", count: "12+ Projects" },
    ],
  },
  {
    id: "city-visakhapatnam",
    name: "Visakhapatnam",
    tagline: "Coastal Smart City & IT Hub",
    icon: "Building2",
    isHeroPill: false,
    order: 4,
    sublocations: [
      { id: "sub-vzg-1", name: "Rushikonda", tagline: "IT SEZ & Beachside Villas", badge: "Hot", count: "50+ Homes" },
      { id: "sub-vzg-2", name: "Madhurawada", tagline: "Fast Growing High-Rise Hub", badge: "Top", count: "65+ Homes" },
      { id: "sub-vzg-3", name: "MVP Colony", tagline: "Asia's Largest Layout", badge: "Hot", count: "45+ Homes" },
      { id: "sub-vzg-4", name: "Gajuwaka", tagline: "Industrial & Housing Hub", badge: "Popular", count: "38+ Homes" },
      { id: "sub-vzg-5", name: "Seethammadhara", tagline: "Prime Central Living", badge: "High ROI", count: "30+ Homes" },
      { id: "sub-vzg-6", name: "Yendada", tagline: "Coastal Scenic Corridor", badge: "Fast Growing", count: "25+ Homes" },
      { id: "sub-vzg-7", name: "Siripuram", tagline: "Commercial Heart", badge: "Top", count: "20+ Homes" },
    ],
  },
  {
    id: "city-hyderabad",
    name: "Hyderabad",
    tagline: "Global Tech Mega City",
    icon: "Building2",
    isHeroPill: false,
    order: 5,
    sublocations: [
      { id: "sub-hyd-1", name: "Gachibowli", tagline: "Financial District Hub", badge: "Hot", count: "120+ Homes" },
      { id: "sub-hyd-2", name: "Madhapur", tagline: "IT Corridor Heart", badge: "Hot", count: "95+ Homes" },
      { id: "sub-hyd-3", name: "Kondapur", tagline: "Premium Residential", badge: "Top", count: "80+ Homes" },
      { id: "sub-hyd-4", name: "Hitec City", tagline: "Tech Hub Living", badge: "Hot", count: "70+ Homes" },
      { id: "sub-hyd-5", name: "Tellapur", tagline: "Luxury Villa Township", badge: "High ROI", count: "55+ Homes" },
      { id: "sub-hyd-6", name: "Kukatpally", tagline: "Metro & Commercial Hub", badge: "Popular", count: "60+ Homes" },
    ],
  },
];

interface LocationsState {
  cities: LocationCity[];
  isLoading: boolean;
  
  // Actions
  fetchLocations: () => Promise<void>;
  addCity: (city: Omit<LocationCity, "id" | "order" | "sublocations"> & { sublocations?: SubLocation[] }) => Promise<void>;
  updateCity: (id: string, city: Partial<LocationCity>) => Promise<void>;
  deleteCity: (id: string) => Promise<void>;
  
  addSublocation: (cityId: string, sublocation: Omit<SubLocation, "id">) => Promise<void>;
  updateSublocation: (cityId: string, subId: string, sublocation: Partial<SubLocation>) => Promise<void>;
  deleteSublocation: (cityId: string, subId: string) => Promise<void>;
  
  toggleHeroPill: (cityId: string) => void;
  resetToDefaults: () => void;
}

export const useLocationsStore = create<LocationsState>()(
  persist(
    (set, get) => ({
      cities: INITIAL_CITIES,
      isLoading: false,

      fetchLocations: async () => {
        set({ isLoading: true });
        try {
          const { data, error } = await supabase
            .from("app_settings")
            .select("value")
            .eq("key", "master_locations")
            .single();

          if (!error && data?.value && Array.isArray(data.value)) {
            set({ cities: data.value, isLoading: false });
          } else {
            set({ isLoading: false });
          }
        } catch {
          set({ isLoading: false });
        }
      },

      addCity: async (cityData) => {
        const newCity: LocationCity = {
          id: `city-${Date.now()}`,
          name: cityData.name,
          tagline: cityData.tagline || "",
          icon: cityData.icon || "MapPin",
          isHeroPill: cityData.isHeroPill ?? true,
          order: get().cities.length + 1,
          sublocations: cityData.sublocations || [],
        };

        const updatedCities = [...get().cities, newCity];
        set({ cities: updatedCities });

        try {
          await supabase.from("app_settings").upsert({
            key: "master_locations",
            value: updatedCities,
            updated_at: new Date().toISOString(),
          });
        } catch {}

        toast.success(`Location "${cityData.name}" added successfully!`);
      },

      updateCity: async (id, cityData) => {
        const updatedCities = get().cities.map((c) =>
          c.id === id ? { ...c, ...cityData } : c
        );
        set({ cities: updatedCities });

        try {
          await supabase.from("app_settings").upsert({
            key: "master_locations",
            value: updatedCities,
            updated_at: new Date().toISOString(),
          });
        } catch {}

        toast.success("Location updated successfully!");
      },

      deleteCity: async (id) => {
        const targetCity = get().cities.find((c) => c.id === id);
        const updatedCities = get().cities.filter((c) => c.id !== id);
        set({ cities: updatedCities });

        try {
          await supabase.from("app_settings").upsert({
            key: "master_locations",
            value: updatedCities,
            updated_at: new Date().toISOString(),
          });
        } catch {}

        toast.success(`Location "${targetCity?.name || ""}" removed!`);
      },

      addSublocation: async (cityId, subData) => {
        const newSub: SubLocation = {
          id: `sub-${Date.now()}`,
          name: subData.name,
          tagline: subData.tagline || "",
          badge: subData.badge || "Hot",
          count: subData.count || "10+ Homes",
        };

        const updatedCities = get().cities.map((c) => {
          if (c.id === cityId) {
            return {
              ...c,
              sublocations: [...c.sublocations, newSub],
            };
          }
          return c;
        });

        set({ cities: updatedCities });

        try {
          await supabase.from("app_settings").upsert({
            key: "master_locations",
            value: updatedCities,
            updated_at: new Date().toISOString(),
          });
        } catch {}

        toast.success(`Sublocation "${subData.name}" added!`);
      },

      updateSublocation: async (cityId, subId, subData) => {
        const updatedCities = get().cities.map((c) => {
          if (c.id === cityId) {
            return {
              ...c,
              sublocations: c.sublocations.map((s) =>
                s.id === subId ? { ...s, ...subData } : s
              ),
            };
          }
          return c;
        });

        set({ cities: updatedCities });

        try {
          await supabase.from("app_settings").upsert({
            key: "master_locations",
            value: updatedCities,
            updated_at: new Date().toISOString(),
          });
        } catch {}

        toast.success("Sublocation updated!");
      },

      deleteSublocation: async (cityId, subId) => {
        const updatedCities = get().cities.map((c) => {
          if (c.id === cityId) {
            return {
              ...c,
              sublocations: c.sublocations.filter((s) => s.id !== subId),
            };
          }
          return c;
        });

        set({ cities: updatedCities });

        try {
          await supabase.from("app_settings").upsert({
            key: "master_locations",
            value: updatedCities,
            updated_at: new Date().toISOString(),
          });
        } catch {}

        toast.success("Sublocation removed!");
      },

      toggleHeroPill: (cityId) => {
        const updatedCities = get().cities.map((c) =>
          c.id === cityId ? { ...c, isHeroPill: !c.isHeroPill } : c
        );
        set({ cities: updatedCities });

        try {
          supabase.from("app_settings").upsert({
            key: "master_locations",
            value: updatedCities,
            updated_at: new Date().toISOString(),
          });
        } catch {}
      },

      resetToDefaults: () => {
        set({ cities: INITIAL_CITIES });
        try {
          supabase.from("app_settings").upsert({
            key: "master_locations",
            value: INITIAL_CITIES,
            updated_at: new Date().toISOString(),
          });
        } catch {}
        toast.info("Reset to default AP locations");
      },
    }),
    {
      name: "road_master_locations_store",
    }
  )
);
