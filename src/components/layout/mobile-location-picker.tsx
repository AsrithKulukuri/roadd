"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronDown, MapPin } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useLocationsStore } from "@/stores/locations-store";
import { useSiteFeatures } from "@/components/providers/site-features-provider";
import { cn } from "@/lib/utils";

export function MobileLocationPicker() {
  const {
    cities,
    defaultLocation,
    fetchLocations,
    fetchDefaultLocation,
    userSelectedCity,
    userSelectedLocalities,
    setUserSelectedLocation,
  } = useLocationsStore();
  const { propertiesEnabled } = useSiteFeatures();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const [activeCityId, setActiveCityId] = useState<string>("");
  const [selectedLocalities, setSelectedLocalities] = useState<string[]>([]);

  useEffect(() => {
    fetchLocations?.();
    fetchDefaultLocation?.();
  }, [fetchLocations, fetchDefaultLocation]);

  const activeCityName = userSelectedCity || defaultLocation?.city || "Vijayawada";

  // Find target city object
  const targetCity = (activeCityId ? cities.find(c => c.id === activeCityId) : null)
    || cities.find(item => item.name.toLowerCase() === activeCityName.toLowerCase())
    || cities.find(item => item.name.toLowerCase() === (defaultLocation?.city || "vijayawada").toLowerCase())
    || cities[0];

  const cityName = targetCity?.name || activeCityName;
  // Available sublocations for target city
  const sublocations = targetCity?.sublocations || [];

  // When opening, initialize selected localities from URL or global store
  useEffect(() => {
    if (open) {
      if (targetCity) setActiveCityId(targetCity.id);
      const localityParam = params.get("locality") || params.get("localities") || "";
      if (localityParam) {
        setSelectedLocalities(localityParam.split(",").map(l => l.trim()).filter(Boolean));
      } else if (userSelectedLocalities && userSelectedLocalities.length > 0) {
        setSelectedLocalities(userSelectedLocalities);
      } else {
        setSelectedLocalities([]);
      }
    }
  }, [open, params, userSelectedLocalities, targetCity]);

  // Always show ONLY default location or selected city name in the top navbar, not sublocation
  const label = userSelectedCity || defaultLocation?.label || defaultLocation?.city || "Vijayawada";

  const toggleSublocation = (name: string) => {
    setSelectedLocalities((prev) => {
      const exists = prev.some((l) => l.toLowerCase() === name.toLowerCase());
      if (exists) {
        return prev.filter((l) => l.toLowerCase() !== name.toLowerCase());
      } else {
        return [...prev, name];
      }
    });
  };

  const selectAll = () => {
    setSelectedLocalities([]);
  };

  const applySelection = () => {
    // 1. Flow globally into store so the entire website immediately inherits it
    setUserSelectedLocation(cityName, selectedLocalities);

    // 2. Direct to search / update URL
    const next = new URLSearchParams(pathname === "/search" ? params.toString() : "");
    for (const key of ["city", "cities", "locality", "localities", "sublocation", "location", "q", "search", "nearMe", "page", "focus", "openFilters"]) {
      next.delete(key);
    }
    if (!propertiesEnabled) next.set("type", "projects");
    next.set("city", cityName);
    if (selectedLocalities.length > 0) {
      next.set("locality", selectedLocalities.join(","));
    }
    setOpen(false);
    router.push(`/search?${next}`);
  };

  const row = "flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-border-default bg-bg-card px-3.5 py-3 text-left text-sm font-semibold transition-colors hover:border-amber-500 hover:bg-amber-500/5 focus-visible:outline-2 focus-visible:outline-amber-500";

  // Only show cities that have available sublocations or match the current city
  const availableCities = cities.filter(c => (c.sublocations && c.sublocations.length > 0) || c.name.toLowerCase() === cityName.toLowerCase());

  return (
    <div className="ml-auto shrink-0 sm:hidden">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button
            type="button"
            aria-label={`Choose location: ${label}`}
            className="flex min-h-11 max-w-[155px] cursor-pointer items-center gap-1.5 px-1 text-xs font-semibold text-white hover:text-amber-300 transition-colors focus-visible:outline-2 focus-visible:outline-amber-400"
          >
            <MapPin size={15} className="shrink-0 text-amber-400" />
            <span className="truncate">{label}</span>
            <ChevronDown size={13} className="shrink-0 opacity-80" />
          </button>
        </DialogTrigger>
        <DialogContent className="flex max-h-[85dvh] w-[calc(100%-2rem)] flex-col gap-3.5 rounded-2xl p-5">
          <div className="pr-7">
            <DialogTitle>Areas in {cityName}</DialogTitle>
            <DialogDescription className="mt-1">
              Select one or multiple sublocations to explore.
            </DialogDescription>
          </div>

          {/* Quick city switcher tabs if multiple cities exist */}
          {availableCities.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {availableCities.map((c) => {
                const isActive = (targetCity?.id === c.id) || (cityName.toLowerCase() === c.name.toLowerCase());
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setActiveCityId(c.id);
                      setSelectedLocalities([]);
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap shrink-0 border cursor-pointer",
                      isActive
                        ? "bg-amber-500 text-slate-950 border-amber-500 shadow-2xs"
                        : "bg-bg-primary text-text-secondary border-border-default hover:text-text-primary hover:border-slate-300"
                    )}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          )}

          <div className="min-h-0 space-y-2 overflow-y-auto overscroll-contain pr-0.5">
            {/* Option to select All of City */}
            <button
              type="button"
              className={cn(
                row,
                selectedLocalities.length === 0
                  ? "border-amber-400 bg-amber-500/10 text-amber-950 font-bold"
                  : "border-border-default hover:border-amber-500 hover:bg-amber-500/5"
              )}
              onClick={selectAll}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={cn(
                    "w-5 h-5 rounded-md flex items-center justify-center border transition-all shrink-0",
                    selectedLocalities.length === 0
                      ? "bg-amber-500 border-amber-500 text-slate-950 shadow-2xs"
                      : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                  )}
                >
                  {selectedLocalities.length === 0 && <Check size={13} strokeWidth={3} />}
                </div>
                <span>All of {cityName}</span>
              </div>
              <span className="text-[11px] font-bold text-amber-700 shrink-0">Whole City</span>
            </button>

            {/* List of Sublocations with multi-select toggles */}
            {sublocations.map((item) => {
              const isSelected = selectedLocalities.some(
                (l) => l.toLowerCase() === item.name.toLowerCase()
              );
              return (
                <button
                  type="button"
                  key={item.id}
                  className={cn(
                    row,
                    isSelected
                      ? "border-amber-400 bg-amber-500/10 text-amber-950 font-bold"
                      : "border-border-default hover:border-amber-500 hover:bg-amber-500/5"
                  )}
                  onClick={() => toggleSublocation(item.name)}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={cn(
                        "w-5 h-5 rounded-md flex items-center justify-center border transition-all shrink-0",
                        isSelected
                          ? "bg-amber-500 border-amber-500 text-slate-950 shadow-2xs"
                          : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                      )}
                    >
                      {isSelected && <Check size={13} strokeWidth={3} />}
                    </div>
                    <span className="truncate">{item.name}</span>
                  </div>
                  {item.count && (
                    <span className="text-[11px] font-normal text-slate-500 shrink-0">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}

            {sublocations.length === 0 && (
              <p className="py-5 text-center text-sm text-text-secondary">
                No sublocations added yet for {cityName}.
              </p>
            )}
          </div>

          {/* Bottom Action Footer */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 shrink-0">
            {selectedLocalities.length > 0 && (
              <button
                type="button"
                onClick={selectAll}
                className="h-11 px-3 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shrink-0"
              >
                Clear ({selectedLocalities.length})
              </button>
            )}
            <button
              type="button"
              onClick={applySelection}
              className="flex-1 min-h-11 bg-slate-950 hover:bg-slate-900 active:scale-[0.99] text-white font-extrabold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <span>Apply</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] sm:text-[11px] font-black shadow-2xs">
                {selectedLocalities.length > 0 ? `${selectedLocalities.length} Selected` : "All Areas"}
              </span>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

