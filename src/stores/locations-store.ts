import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export interface SubLocation {
  id: string;
  name: string;
  tagline?: string;
  badge?: string;
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
      { id: "sub-vja-1", name: "Benz Circle", tagline: "Prime Commercial Hub", count: "45+ Homes" },
      { id: "sub-vja-2", name: "Poranki", tagline: "Fastest Growing Residential", count: "32+ Homes" },
      { id: "sub-vja-3", name: "Kanuru", tagline: "Premium Villas & Apartments", count: "28+ Homes" },
      { id: "sub-vja-4", name: "Patamata", tagline: "Central City Living", count: "38+ Homes" },
      { id: "sub-vja-5", name: "Tadepalli", tagline: "Near Capital Region", count: "25+ Homes" },
      { id: "sub-vja-6", name: "Penamaluru", tagline: "Gated Communities", count: "20+ Homes" },
      { id: "sub-vja-7", name: "Auto Nagar", tagline: "Commercial & Plots", count: "18+ Homes" },
      { id: "sub-vja-8", name: "Gollapudi", tagline: "High Growth Hub", count: "15+ Homes" },
      { id: "sub-vja-9", name: "Enikepadu", tagline: "NH-16 Corridor", count: "22+ Homes" },
      { id: "sub-vja-10", name: "Edupugallu", tagline: "Residential Township", count: "18+ Homes" },
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
      { id: "sub-gtr-1", name: "Gorantla", tagline: "Top Residential Location", count: "35+ Homes" },
      { id: "sub-gtr-2", name: "Amaravati Road", tagline: "Capital Highway Corridor", count: "42+ Homes" },
      { id: "sub-gtr-3", name: "Brodipet", tagline: "Commercial & Premium Flats", count: "30+ Homes" },
      { id: "sub-gtr-4", name: "Pattabhipuram", tagline: "Established Housing", count: "24+ Homes" },
      { id: "sub-gtr-5", name: "Kaza", tagline: "High-yield Plots & Villas", count: "22+ Homes" },
      { id: "sub-gtr-6", name: "Mangalagiri", tagline: "Near AIIMS & Highway", count: "40+ Homes" },
      { id: "sub-gtr-7", name: "Pedakakani", tagline: "Connecting Corridor", count: "16+ Homes" },
      { id: "sub-gtr-8", name: "Vidya Nagar", tagline: "Educational Hub", count: "14+ Homes" },
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
      { id: "sub-amr-1", name: "Secretariat Zone", tagline: "Core Government District", count: "30+ Projects" },
      { id: "sub-amr-2", name: "Rayapudi", tagline: "High Rise Township", count: "22+ Projects" },
      { id: "sub-amr-3", name: "Tulluru", tagline: "Central Capital Corridor", count: "28+ Projects" },
      { id: "sub-amr-4", name: "Velagapudi", tagline: "Administrative Hub", count: "18+ Projects" },
      { id: "sub-amr-5", name: "Mandadam", tagline: "Premium Riverside Lands", count: "15+ Projects" },
      { id: "sub-amr-6", name: "Uddandarayunipalem", tagline: "Foundation Corridor", count: "12+ Projects" },
      { id: "sub-amr-7", name: "Nelapadu", tagline: "Judicial Complex Corridor", count: "16+ Projects" },
      { id: "sub-amr-8", name: "Inavolu", tagline: "Institutional Zone", count: "14+ Projects" },
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
      { id: "sub-vzg-1", name: "Rushikonda", tagline: "IT SEZ & Beachside Villas", count: "50+ Homes" },
      { id: "sub-vzg-2", name: "Madhurawada", tagline: "Fast Growing High-Rise Hub", count: "65+ Homes" },
      { id: "sub-vzg-3", name: "MVP Colony", tagline: "Asia's Largest Layout", count: "45+ Homes" },
      { id: "sub-vzg-4", name: "Gajuwaka", tagline: "Industrial & Housing Hub", count: "38+ Homes" },
      { id: "sub-vzg-5", name: "Seethammadhara", tagline: "Prime Central Living", count: "30+ Homes" },
      { id: "sub-vzg-6", name: "Yendada", tagline: "Coastal Scenic Corridor", count: "25+ Homes" },
      { id: "sub-vzg-7", name: "Siripuram", tagline: "Commercial Heart", count: "20+ Homes" },
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
      { id: "sub-hyd-1", name: "Gachibowli", tagline: "Financial District Hub", count: "120+ Homes" },
      { id: "sub-hyd-2", name: "Madhapur", tagline: "IT Corridor Heart", count: "95+ Homes" },
      { id: "sub-hyd-3", name: "Kondapur", tagline: "Premium Residential", count: "80+ Homes" },
      { id: "sub-hyd-4", name: "Hitec City", tagline: "Tech Hub Living", count: "70+ Homes" },
      { id: "sub-hyd-5", name: "Tellapur", tagline: "Luxury Villa Township", count: "55+ Homes" },
      { id: "sub-hyd-6", name: "Kukatpally", tagline: "Metro & Commercial Hub", count: "60+ Homes" },
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
          // Fetch master list from Supabase trending_locations
          const { data, error } = await supabase
            .from("trending_locations")
            .select("*")
            .order("created_at", { ascending: true });

          if (!error && data && data.length > 0) {
            // Group by city
            const cityMap: Record<string, SubLocation[]> = {};
            for (const row of data) {
              const cityName = row.city;
              if (!cityName) continue;
              if (!cityMap[cityName]) cityMap[cityName] = [];
              cityMap[cityName].push({
                id: row.id,
                name: row.locality || cityName,
                tagline: row.locality ? `${row.locality}, ${cityName}` : undefined,
                count: row.properties_count ? `${row.properties_count}+ Homes` : "20+ Homes",
              });
            }

            // Map existing base cities and append dynamic cities
            const currentCities = get().cities.length > 0 ? get().cities : INITIAL_CITIES;
            const updatedCities: LocationCity[] = currentCities.map((c) => {
              const matchingSubs = cityMap[c.name] || cityMap[c.name.toLowerCase()];
              return {
                ...c,
                sublocations: matchingSubs && matchingSubs.length > 0 ? matchingSubs : c.sublocations,
              };
            });

            // Check if any cities in cityMap aren't in updatedCities yet
            Object.keys(cityMap).forEach((cityName) => {
              const exists = updatedCities.some((c) => c.name.toLowerCase() === cityName.toLowerCase());
              if (!exists) {
                updatedCities.push({
                  id: `city-${Date.now()}-${cityName.toLowerCase()}`,
                  name: cityName,
                  tagline: `${cityName} Region`,
                  icon: "MapPin",
                  isHeroPill: false,
                  order: updatedCities.length + 1,
                  sublocations: cityMap[cityName],
                });
              }
            });

            set({ cities: updatedCities, isLoading: false });
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

        // Also insert default entry into Supabase
        try {
          await supabase.from("trending_locations").insert({
            city: cityData.name,
            locality: cityData.name,
            image: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&q=80",
            properties_count: 25,
          });
        } catch {}

        toast.success(`Location "${cityData.name}" added successfully!`);
      },

      updateCity: async (id, cityData) => {
        const updatedCities = get().cities.map((c) =>
          c.id === id ? { ...c, ...cityData } : c
        );
        set({ cities: updatedCities });
        toast.success("Location updated successfully!");
      },

      deleteCity: async (id) => {
        const targetCity = get().cities.find((c) => c.id === id);
        const updatedCities = get().cities.filter((c) => c.id !== id);
        set({ cities: updatedCities });

        if (targetCity) {
          try {
            await fetch("/api/locations/delete", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: "city",
                cityId: id,
                cityName: targetCity.name,
              }),
            });
          } catch (err) {
            console.error("Failed to delete city on server:", err);
          }
        }

        toast.success(`Location "${targetCity?.name || ""}" removed!`);
      },

      addSublocation: async (cityId, subData) => {
        const targetCity = get().cities.find((c) => c.id === cityId);
        const newSubId = `sub-${Date.now()}`;

        const newSub: SubLocation = {
          id: newSubId,
          name: subData.name,
          tagline: subData.tagline || "",
          count: subData.count || "20+ Homes",
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

        // Save directly to Supabase trending_locations via server API
        if (targetCity) {
          try {
            const res = await fetch("/api/locations/sync", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "add_sublocation",
                city: targetCity.name,
                locality: subData.name,
                properties_count: 25,
              }),
            });

            if (res.ok) {
              const resData = await res.json();
              if (resData.data?.id) {
                // Update local state with real Supabase uuid
                set({
                  cities: get().cities.map((c) => {
                    if (c.id === cityId) {
                      return {
                        ...c,
                        sublocations: c.sublocations.map((s) => s.id === newSubId ? { ...s, id: resData.data.id } : s),
                      };
                    }
                    return c;
                  }),
                });
              }
            }
          } catch (err) {
            console.error("Failed to sync sublocation:", err);
          }
        }

        toast.success(`Sublocation "${subData.name}" added!`);
      },

      updateSublocation: async (cityId, subId, subData) => {
        const targetCity = get().cities.find((c) => c.id === cityId);

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

        // Update in Supabase via server API
        if (targetCity && subData.name) {
          try {
            await fetch("/api/locations/sync", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "update_sublocation",
                id: subId,
                city: targetCity.name,
                locality: subData.name,
              }),
            });
          } catch (err) {
            console.error("Failed to update sublocation on server:", err);
          }
        }

        toast.success("Sublocation updated!");
      },

      deleteSublocation: async (cityId, subId) => {
        const targetCity = get().cities.find((c) => c.id === cityId);
        const targetSub = targetCity?.sublocations.find((s) => s.id === subId);

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

        // Delete from Supabase via server API
        if (targetCity) {
          try {
            await fetch("/api/locations/delete", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: "sublocation",
                cityId,
                cityName: targetCity.name,
                subId,
                subName: targetSub?.name,
              }),
            });
          } catch (err) {
            console.error("Failed to delete sublocation on server:", err);
          }
        }

        toast.success("Sublocation removed!");
      },

      toggleHeroPill: (cityId) => {
        const updatedCities = get().cities.map((c) =>
          c.id === cityId ? { ...c, isHeroPill: !c.isHeroPill } : c
        );
        set({ cities: updatedCities });
      },

      resetToDefaults: () => {
        set({ cities: INITIAL_CITIES });
        toast.info("Reset to default AP locations");
      },
    }),
    {
      name: "road_master_locations_store",
    }
  )
);

