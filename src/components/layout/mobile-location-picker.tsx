"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronRight, MapPin } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useLocationsStore } from "@/stores/locations-store";
import { useSiteFeatures } from "@/components/providers/site-features-provider";
import { cn } from "@/lib/utils";

export function MobileLocationPicker() {
  const { cities, defaultLocation, fetchLocations, fetchDefaultLocation } = useLocationsStore();
  const { propertiesEnabled } = useSiteFeatures();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchLocations?.();
    fetchDefaultLocation?.();
  }, [fetchLocations, fetchDefaultLocation]);

  const targetCity = cities.find(item => item.name.toLowerCase() === (defaultLocation?.city || "vijayawada").toLowerCase())
    || cities.find(item => item.name.toLowerCase() === "vijayawada")
    || cities[0];
  const cityName = targetCity?.name || "Vijayawada";
  const sublocations = targetCity?.sublocations || [];

  const selectedCity = params.get("city") || params.get("cities");
  const selectedLocality = params.get("locality") || params.get("localities");
  const fallbackLabel = defaultLocation?.label || defaultLocation?.city || "Vijayawada";
  const label = selectedLocality || selectedCity || fallbackLabel;

  function choose(cityToSelect?: string, locality?: string) {
    const next = new URLSearchParams(pathname === "/search" ? params.toString() : "");
    for (const key of ["city", "cities", "locality", "localities", "sublocation", "location", "q", "search", "nearMe", "page", "focus", "openFilters"]) next.delete(key);
    if (!propertiesEnabled) next.set("type", "projects");
    if (cityToSelect) next.set("city", cityToSelect);
    if (locality) next.set("locality", locality);
    setOpen(false);
    router.push(`/search?${next}`);
  }

  const row = "flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-border-default bg-bg-card px-4 py-3 text-left text-sm font-semibold transition-colors hover:border-amber-500 hover:bg-amber-500/5 focus-visible:outline-2 focus-visible:outline-amber-500";

  return (
    <div className="ml-auto shrink-0 sm:hidden">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button
            type="button"
            aria-label={`Choose location: ${label}`}
            className="flex min-h-11 max-w-[155px] cursor-pointer items-center gap-1.5 rounded-full border border-white/20 px-3 text-xs font-semibold text-white focus-visible:outline-2 focus-visible:outline-amber-400"
          >
            <MapPin size={15} className="shrink-0 text-amber-400" />
            <span className="truncate">{label}</span>
            <ChevronDown size={13} className="shrink-0" />
          </button>
        </DialogTrigger>
        <DialogContent className="flex max-h-[85dvh] w-[calc(100%-2rem)] flex-col gap-4 rounded-2xl p-5">
          <div className="pr-7">
            <DialogTitle>Areas in {cityName}</DialogTitle>
            <DialogDescription className="mt-1">
              Choose a sublocation or explore all of {cityName}.
            </DialogDescription>
          </div>

          <div className="min-h-0 space-y-2 overflow-y-auto overscroll-contain pr-0.5">
            <button
              type="button"
              className={cn(
                row,
                !selectedLocality
                  ? "border-amber-400 bg-amber-500/10 text-amber-950 font-bold"
                  : "border-border-default hover:border-amber-500 hover:bg-amber-500/5"
              )}
              onClick={() => choose(cityName)}
            >
              <span>All of {cityName}</span>
              <ChevronRight size={16} className={!selectedLocality ? "text-amber-600" : "text-slate-400"} />
            </button>

            {sublocations.map((item) => {
              const isSelected = selectedLocality?.toLowerCase() === item.name.toLowerCase();
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
                  onClick={() => choose(cityName, item.name)}
                >
                  <span className="truncate">{item.name}</span>
                  <ChevronRight size={16} className={isSelected ? "text-amber-600" : "text-slate-400"} />
                </button>
              );
            })}

            {sublocations.length === 0 && (
              <p className="py-5 text-center text-sm text-text-secondary">
                No sublocations added yet for {cityName}.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

