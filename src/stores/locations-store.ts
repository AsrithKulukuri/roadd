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
      { id: "sub-vja-10", name: "Edupugallu", tagline: "Edupugallu, Vijayawada", count: "1 Home" },
    ],
  },
];

export interface DefaultLocationConfig {
  city: string;
  locality?: string;
  label: string;
}

interface LocationsState {
  cities: LocationCity[];
  defaultLocation: DefaultLocationConfig;
  isLoading: boolean;
  
  // Global User Selected Location
  userSelectedCity: string;
  userSelectedLocalities: string[];
  setUserSelectedLocation: (city: string, localities?: string[]) => void;
  setUserSelectedCity: (city: string) => void;
  setUserSelectedLocalities: (localities: string[]) => void;
  clearUserSelectedLocalities: () => void;
  autoRegisterLocation: (city: string, locality?: string) => void;

  // Actions
  fetchLocations: () => Promise<void>;
  fetchDefaultLocation: () => Promise<void>;
  setDefaultLocation: (config: DefaultLocationConfig) => Promise<void>;
  addCity: (city: Omit<LocationCity, "id" | "order" | "sublocations"> & { sublocations?: SubLocation[] }) => Promise<void>;
  updateCity: (id: string, city: Partial<LocationCity>) => Promise<void>;
  deleteCity: (id: string) => Promise<void>;
  
  addSublocation: (cityId: string, sublocation: Omit<SubLocation, "id">) => Promise<void>;
  updateSublocation: (cityId: string, subId: string, sublocation: Partial<SubLocation>) => Promise<void>;
  deleteSublocation: (cityId: string, subId: string) => Promise<void>;
  
  toggleHeroPill: (cityId: string) => void;
  resetToDefaults: () => void;
}

const saveCitiesToServer = async (cities: LocationCity[]) => {
  try {
    await fetch("/api/content/locations", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cities }),
    });
  } catch (err) {
    console.warn("[LocationsStore] saveCitiesToServer error:", err);
  }
};

export const useLocationsStore = create<LocationsState>()(
  persist(
    (set, get) => ({
      cities: INITIAL_CITIES,
      defaultLocation: {
        city: "Vijayawada",
        locality: "",
        label: "Vijayawada",
      },
      userSelectedCity: "Vijayawada",
      userSelectedLocalities: [],
      isLoading: false,

      setUserSelectedLocation: (city: string, localities?: string[]) => {
        set({
          userSelectedCity: city,
          userSelectedLocalities: localities || [],
        });
      },

      setUserSelectedCity: (city: string) => {
        set({ userSelectedCity: city, userSelectedLocalities: [] });
      },

      setUserSelectedLocalities: (localities: string[]) => {
        set({ userSelectedLocalities: localities });
      },

      clearUserSelectedLocalities: () => {
        set({ userSelectedLocalities: [] });
      },

      autoRegisterLocation: (city: string, locality?: string) => {
        const cleanCity = (city || "").trim();
        const cleanLoc = (locality || cleanCity).trim();
        if (!cleanCity && !cleanLoc) return;

        const currentCities = get().cities;
        if (currentCities.length === 0) return;

        // 1. Check if cleanCity matches an existing city
        let existingCityIndex = currentCities.findIndex(c => c.name.toLowerCase() === cleanCity.toLowerCase());

        // 2. If not found, check if cleanCity is an existing sublocation under one of the cities
        if (existingCityIndex < 0) {
          const parentCityIndex = currentCities.findIndex(c =>
            c.sublocations.some(s => s.name.toLowerCase() === cleanCity.toLowerCase())
          );
          if (parentCityIndex >= 0) {
            existingCityIndex = parentCityIndex;
          }
        }

        // 3. If still not found, attach as sublocation under the default city (never resurrect/spawn deleted cities)
        if (existingCityIndex < 0) {
          const defaultCityIndex = currentCities.findIndex(c =>
            c.name.toLowerCase() === (get().defaultLocation?.city || "vijayawada").toLowerCase()
          );
          existingCityIndex = defaultCityIndex >= 0 ? defaultCityIndex : 0;
        }

        const target = currentCities[existingCityIndex];
        const subNameToAdd = (cleanLoc && cleanLoc.toLowerCase() !== target.name.toLowerCase())
          ? cleanLoc
          : cleanCity;

        const existingSubIndex = target.sublocations.findIndex(s => s.name.toLowerCase() === subNameToAdd.toLowerCase());
        const newSubs = [...target.sublocations];
        if (existingSubIndex >= 0) {
          newSubs[existingSubIndex] = {
            ...newSubs[existingSubIndex],
            count: "1+ Listings",
          };
        } else {
          newSubs.unshift({
            id: `sub-auto-${Date.now()}-${subNameToAdd.toLowerCase().replace(/\s+/g, '-')}`,
            name: subNameToAdd,
            count: "1 Home",
            tagline: `${subNameToAdd}, ${target.name}`,
          });
        }
        const updatedCities = [...currentCities];
        updatedCities[existingCityIndex] = { ...target, sublocations: newSubs };

        set({ cities: updatedCities });
        void saveCitiesToServer(updatedCities);
      },

      fetchDefaultLocation: async () => {
        try {
          const res = await fetch("/api/content/default-location", { cache: "no-store" });
          if (res.ok) {
            const data = await res.json();
            if (data?.city) {
              set((state) => ({
                defaultLocation: {
                  city: data.city,
                  locality: data.locality || "",
                  label: data.label || data.city,
                },
                userSelectedCity: state.userSelectedCity || data.city,
              }));
            }
          }
        } catch (err) {
          console.warn("[LocationsStore] fetchDefaultLocation error:", err);
        }
      },

      setDefaultLocation: async (config) => {
        set({ defaultLocation: config });
        try {
          const res = await fetch("/api/content/default-location", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(config),
          });
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.error || "Failed to update default location");
          }
          toast.success(`Default top location set to "${config.label || config.city}"!`);
        } catch (err: any) {
          console.error("Failed to save default location to server:", err);
          toast.error(err.message || "Failed to save default location to server");
        }
      },

      fetchLocations: async () => {
        set({ isLoading: true });
        void get().fetchDefaultLocation();
        let baseCities: LocationCity[] = [];
        try {
          // 1. Fetch admin saved master locations from /api/content/locations
          try {
            const locRes = await fetch("/api/content/locations", { cache: "no-store" });
            if (locRes.ok) {
              const locData = await locRes.json();
              if (locData.configured && Array.isArray(locData.cities)) {
                baseCities = locData.cities;
              }
            }
          } catch (e) {
            console.warn("[LocationsStore] fetch /api/content/locations error:", e);
          }

          // If no admin configured cities found in DB, use current store cities or INITIAL_CITIES
          if (baseCities.length === 0) {
            const current = get().cities;
            baseCities = current.length > 0 ? current : INITIAL_CITIES;
          }

          // 2. Fetch properties & projects to get live listing counts & dynamic sublocations
          const [propsRes, projsRes] = await Promise.all([
            supabase.from("properties").select("location"),
            supabase.from("projects").select("location"),
          ]);

          const cityLocalitiesCounts: Record<string, Record<string, { propCount: number; projCount: number }>> = {};
          const recordCount = (cName: string, lName: string, type: "prop" | "proj") => {
            const c = (cName || "").trim();
            const l = (lName || c).trim();
            if (!c || !l) return;
            const cKey = c.toLowerCase();
            const lKey = l.toLowerCase();
            if (!cityLocalitiesCounts[cKey]) cityLocalitiesCounts[cKey] = {};
            if (!cityLocalitiesCounts[cKey][lKey]) {
              cityLocalitiesCounts[cKey][lKey] = { propCount: 0, projCount: 0 };
            }
            if (type === "prop") cityLocalitiesCounts[cKey][lKey].propCount += 1;
            else cityLocalitiesCounts[cKey][lKey].projCount += 1;
          };

          if (propsRes.data) {
            for (const item of propsRes.data) {
              const loc = (item.location || {}) as { city?: string; locality?: string };
              if (loc.city) recordCount(loc.city, loc.locality || loc.city, "prop");
            }
          }
          if (projsRes.data) {
            for (const item of projsRes.data) {
              const loc = (item.location || {}) as { city?: string; locality?: string };
              if (loc.city) recordCount(loc.city, loc.locality || loc.city, "proj");
            }
          }

          // 3. For each city in baseCities, update its sublocations with live counts
          const updatedCities: LocationCity[] = baseCities.map((city) => {
            const cityKey = city.name.toLowerCase();
            const cityCounts = cityLocalitiesCounts[cityKey] || {};
            const existingSubs = city.sublocations || [];

            // Update counts on existing sublocations
            const updatedSubs = existingSubs.map((sub) => {
              const subKey = sub.name.toLowerCase();
              // Check direct city counts, or if the listing's city was entered as the sublocation name (e.g. Edupugallu)
              const counts = cityCounts[subKey]
                || (cityLocalitiesCounts[subKey] && (cityLocalitiesCounts[subKey][subKey] || Object.values(cityLocalitiesCounts[subKey])[0]));
              let countStr = sub.count || "Available";
              if (counts && (counts.propCount > 0 || counts.projCount > 0)) {
                const parts: string[] = [];
                if (counts.propCount > 0) parts.push(`${counts.propCount} Home${counts.propCount > 1 ? "s" : ""}`);
                if (counts.projCount > 0) parts.push(`${counts.projCount} Project${counts.projCount > 1 ? "s" : ""}`);
                countStr = parts.join(" • ");
              }
              return { ...sub, count: countStr };
            });

            // If a property or project was added in this city with a new locality, auto-append it
            Object.entries(cityCounts).forEach(([subLower, counts]) => {
              const exists = updatedSubs.some((s) => s.name.toLowerCase() === subLower);
              if (!exists && (counts.propCount > 0 || counts.projCount > 0)) {
                const parts: string[] = [];
                if (counts.propCount > 0) parts.push(`${counts.propCount} Home${counts.propCount > 1 ? "s" : ""}`);
                if (counts.projCount > 0) parts.push(`${counts.projCount} Project${counts.projCount > 1 ? "s" : ""}`);
                const formattedName = subLower.charAt(0).toUpperCase() + subLower.slice(1);
                updatedSubs.push({
                  id: `sub-auto-${Date.now()}-${subLower.replace(/\s+/g, "-")}`,
                  name: formattedName,
                  tagline: `${formattedName}, ${city.name}`,
                  count: parts.join(" • "),
                });
              }
            });

            return {
              ...city,
              sublocations: updatedSubs,
            };
          });

          // 4. Attach any outlying localities to the default/primary city as sublocations
          const primaryCityIndex = updatedCities.findIndex(
            (c) => c.name.toLowerCase() === (get().defaultLocation?.city || "vijayawada").toLowerCase()
          );
          const targetIndex = primaryCityIndex >= 0 ? primaryCityIndex : 0;

          if (updatedCities[targetIndex]) {
            const targetCity = updatedCities[targetIndex];
            const currentSubs = [...targetCity.sublocations];

            Object.entries(cityLocalitiesCounts).forEach(([cityNameLower, localities]) => {
              const isKnownCity = updatedCities.some((c) => c.name.toLowerCase() === cityNameLower);
              if (!isKnownCity) {
                // This listing had city entered as a locality or surrounding town (e.g., Gudavalli, Edupugallu)
                Object.entries(localities).forEach(([locLower, counts]) => {
                  const exists = currentSubs.some((s) => s.name.toLowerCase() === locLower || s.name.toLowerCase() === cityNameLower);
                  if (!exists && (counts.propCount > 0 || counts.projCount > 0)) {
                    const parts: string[] = [];
                    if (counts.propCount > 0) parts.push(`${counts.propCount} Home${counts.propCount > 1 ? "s" : ""}`);
                    if (counts.projCount > 0) parts.push(`${counts.projCount} Project${counts.projCount > 1 ? "s" : ""}`);
                    const displayName = locLower.charAt(0).toUpperCase() + locLower.slice(1);
                    currentSubs.push({
                      id: `sub-auto-${Date.now()}-${locLower.replace(/\s+/g, "-")}`,
                      name: displayName,
                      tagline: `${displayName}, ${targetCity.name}`,
                      count: parts.join(" • "),
                    });
                  }
                });
              }
            });

            updatedCities[targetIndex] = {
              ...targetCity,
              sublocations: currentSubs,
            };
          }

          set({ cities: updatedCities, isLoading: false });
        } catch (err) {
          console.warn("[LocationsStore] fetchLocations error:", err);
          set({ cities: baseCities.length > 0 ? baseCities : get().cities, isLoading: false });
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
        void saveCitiesToServer(updatedCities);

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
        void saveCitiesToServer(updatedCities);
        toast.success("Location updated successfully!");
      },

      deleteCity: async (id) => {
        const targetCity = get().cities.find((c) => c.id === id);
        const updatedCities = get().cities.filter((c) => c.id !== id);
        set({ cities: updatedCities });
        void saveCitiesToServer(updatedCities);

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
        void saveCitiesToServer(updatedCities);

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
                const finalCities = get().cities.map((c) => {
                  if (c.id === cityId) {
                    return {
                      ...c,
                      sublocations: c.sublocations.map((s) => s.id === newSubId ? { ...s, id: resData.data.id } : s),
                    };
                  }
                  return c;
                });
                set({ cities: finalCities });
                void saveCitiesToServer(finalCities);
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
        void saveCitiesToServer(updatedCities);

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
        void saveCitiesToServer(updatedCities);

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
        void saveCitiesToServer(updatedCities);
      },

      resetToDefaults: () => {
        set({ cities: INITIAL_CITIES });
        void saveCitiesToServer(INITIAL_CITIES);
        toast.info("Reset to default AP locations");
      },
    }),
    {
      name: "road_master_locations_store",
      partialize: (state) => ({
        userSelectedCity: state.userSelectedCity,
        userSelectedLocalities: state.userSelectedLocalities,
      }),
    }
  )
);

