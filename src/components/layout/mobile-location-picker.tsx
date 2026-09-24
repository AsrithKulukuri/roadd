"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronDown, ChevronRight, MapPin, Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useLocationsStore } from "@/stores/locations-store";
import { useSiteFeatures } from "@/components/providers/site-features-provider";

export function MobileLocationPicker() {
  const { cities, defaultLocation, fetchDefaultLocation } = useLocationsStore();
  const { propertiesEnabled } = useSiteFeatures();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const [cityId, setCityId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetchDefaultLocation?.();
  }, [fetchDefaultLocation]);

  const city = cities.find(item => item.id === cityId);
  const selectedCity = params.get("city") || params.get("cities");
  const selectedLocality = params.get("locality") || params.get("localities");
  const fallbackLabel = defaultLocation?.label || defaultLocation?.city || "Location";
  const label = selectedLocality || selectedCity || fallbackLabel;
  const matches = (name: string) => name.toLowerCase().includes(query.trim().toLowerCase());

  function choose(cityName?: string, locality?: string) {
    const next = new URLSearchParams(pathname === "/search" ? params.toString() : "");
    for (const key of ["city", "cities", "locality", "localities", "sublocation", "location", "q", "search", "nearMe", "page", "focus", "openFilters"]) next.delete(key);
    if (!propertiesEnabled) next.set("type", "projects");
    if (cityName) next.set("city", cityName);
    if (locality) next.set("locality", locality);
    setOpen(false);
    router.push(`/search?${next}`);
  }

  const row = "flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-border-default bg-bg-card px-4 py-3 text-left text-sm font-semibold transition-colors hover:border-amber-500 hover:bg-amber-500/5 focus-visible:outline-2 focus-visible:outline-amber-500";
  return <div className="ml-auto shrink-0 sm:hidden">
    <Dialog open={open} onOpenChange={value => { setOpen(value); if (value) { setCityId(null); setQuery(""); } }}>
      <DialogTrigger asChild>
        <button type="button" aria-label={`Choose location: ${label}`} className="flex min-h-11 max-w-[155px] cursor-pointer items-center gap-1.5 rounded-full border border-white/20 px-3 text-xs font-semibold text-white focus-visible:outline-2 focus-visible:outline-amber-400">
          <MapPin size={15} className="shrink-0 text-amber-400" /><span className="truncate">{label}</span><ChevronDown size={13} className="shrink-0" />
        </button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[85dvh] w-[calc(100%-2rem)] flex-col gap-4 rounded-2xl p-5">
        <div className="pr-7">
          {city && <button type="button" className="mb-3 flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-amber-700" onClick={() => { setCityId(null); setQuery(""); }}><ArrowLeft size={16} />All cities</button>}
          <DialogTitle>{city ? `Areas in ${city.name}` : "Choose your city"}</DialogTitle>
          <DialogDescription className="mt-1">{city ? "Choose a sublocation or explore the whole city." : "Select a city, then choose a sublocation."}</DialogDescription>
        </div>
        <label className="flex min-h-11 items-center gap-2 rounded-xl border border-border-default px-3">
          <Search size={17} className="shrink-0 text-text-secondary" />
          <input aria-label={city ? "Search sublocations" : "Search cities"} className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none" placeholder={city ? "Search areas…" : "Search cities…"} value={query} onChange={event => setQuery(event.target.value)} />
        </label>
        <div className="min-h-0 space-y-2 overflow-y-auto overscroll-contain">
          <button type="button" className={`${row} border-amber-400 bg-amber-500/10`} onClick={() => choose(city?.name)}>{city ? `All of ${city.name}` : "All locations"}<ChevronRight size={16} /></button>
          {city ? (city.sublocations || []).filter(item => matches(item.name)).map(item => <button type="button" key={item.id} className={row} onClick={() => choose(city.name, item.name)}>{item.name}<ChevronRight size={16} /></button>) : cities.filter(item => matches(item.name)).map(item => <button type="button" key={item.id} className={row} onClick={() => { setCityId(item.id); setQuery(""); }}>{item.name}<ChevronRight size={16} /></button>)}
          {(city ? city.sublocations || [] : cities).filter(item => matches(item.name)).length === 0 && <p className="py-5 text-center text-sm text-text-secondary">{query ? "No matches. Try another name." : city ? "No sublocations yet. You can explore the whole city." : "No cities available yet."}</p>}
        </div>
      </DialogContent>
    </Dialog>
  </div>;
}
