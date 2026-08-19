"use client";

import { useState, useEffect } from "react";
import { useLocationsStore, LocationCity, SubLocation } from "@/stores/locations-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  MapPin,
  Building2,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Tag,
  RotateCcw,
  Eye,
  EyeOff,
  Flame,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminLocationsPage() {
  const {
    cities,
    isLoading,
    fetchLocations,
    addCity,
    updateCity,
    deleteCity,
    addSublocation,
    updateSublocation,
    deleteSublocation,
    toggleHeroPill,
    resetToDefaults,
  } = useLocationsStore();

  const [expandedCityId, setExpandedCityId] = useState<string | null>(null);

  // Add/Edit City Modal
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);
  const [editingCity, setEditingCity] = useState<LocationCity | null>(null);
  const [cityName, setCityName] = useState("");
  const [cityTagline, setCityTagline] = useState("");
  const [cityIcon, setCityIcon] = useState("MapPin");
  const [cityIsHeroPill, setCityIsHeroPill] = useState(true);

  // Add/Edit Sublocation Modal
  const [subModalCityId, setSubModalCityId] = useState<string | null>(null);
  const [editingSub, setEditingSub] = useState<SubLocation | null>(null);
  const [subName, setSubName] = useState("");
  const [subTagline, setSubTagline] = useState("");
  const [subCount, setSubCount] = useState("20+ Homes");

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  // Handle City Save
  const handleSaveCity = async () => {
    if (!cityName.trim()) {
      toast.error("Please enter a city / location name");
      return;
    }

    if (editingCity) {
      await updateCity(editingCity.id, {
        name: cityName.trim(),
        tagline: cityTagline.trim(),
        icon: cityIcon,
        isHeroPill: cityIsHeroPill,
      });
    } else {
      await addCity({
        name: cityName.trim(),
        tagline: cityTagline.trim(),
        icon: cityIcon,
        isHeroPill: cityIsHeroPill,
        sublocations: [],
      });
    }

    setIsCityModalOpen(false);
    setEditingCity(null);
    setCityName("");
    setCityTagline("");
  };

  // Open Edit City
  const openEditCity = (city: LocationCity) => {
    setEditingCity(city);
    setCityName(city.name);
    setCityTagline(city.tagline || "");
    setCityIcon(city.icon || "MapPin");
    setCityIsHeroPill(city.isHeroPill);
    setIsCityModalOpen(true);
  };

  // Handle Sublocation Save
  const handleSaveSublocation = async () => {
    if (!subModalCityId || !subName.trim()) {
      toast.error("Please enter a sublocation name");
      return;
    }

    if (editingSub) {
      await updateSublocation(subModalCityId, editingSub.id, {
        name: subName.trim(),
        tagline: subTagline.trim(),
        count: subCount.trim() || "15+ Homes",
      });
    } else {
      await addSublocation(subModalCityId, {
        name: subName.trim(),
        tagline: subTagline.trim(),
        count: subCount.trim() || "15+ Homes",
      });
    }

    setSubModalCityId(null);
    setEditingSub(null);
    setSubName("");
    setSubTagline("");
  };

  const openAddSub = (cityId: string) => {
    setSubModalCityId(cityId);
    setEditingSub(null);
    setSubName("");
    setSubTagline("");
    setSubCount("25+ Homes");
  };

  const openEditSub = (cityId: string, sub: SubLocation) => {
    setSubModalCityId(cityId);
    setEditingSub(sub);
    setSubName(sub.name);
    setSubTagline(sub.tagline || "");
    setSubCount(sub.count || "20+ Homes");
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-default pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-text-primary flex items-center gap-3 tracking-tight">
            <MapPin className="w-7 h-7 text-amber-primary" />
            Locations & Sublocations Manager
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Manage top cities, homepage hero buttons, search dropdowns, and sublocalities in real time.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={resetToDefaults}
            className="text-text-secondary hover:text-text-primary gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Defaults
          </Button>

          <Button
            onClick={() => {
              setEditingCity(null);
              setCityName("");
              setCityTagline("");
              setCityIcon("MapPin");
              setCityIsHeroPill(true);
              setIsCityModalOpen(true);
            }}
            className="bg-amber-primary hover:bg-amber-primary/90 text-slate-950 font-bold gap-2"
          >
            <Plus className="w-4 h-4" />
            Add New City
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex items-start gap-4">
        <Sparkles className="w-6 h-6 text-amber-primary shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm text-text-secondary leading-relaxed">
          <strong className="text-text-primary font-bold">Homepage & Filter Sync:</strong> Cities marked with{" "}
          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-primary font-bold text-xs">
            Hero Pill
          </span>{" "}
          will appear directly beneath the homepage search bar. Their sublocations will drop down instantly when clicked and appear across all filter menus.
        </div>
      </div>

      {/* City Cards Grid */}
      <div className="space-y-6">
        {cities.map((city) => {
          const isExpanded = expandedCityId === city.id || true; // Keep expanded by default for easy access
          return (
            <div
              key={city.id}
              className="bg-bg-card border border-border-default rounded-2xl overflow-hidden shadow-sm hover:border-amber-primary/30 transition-all"
            >
              {/* City Card Header */}
              <div className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-bg-primary/50 border-b border-border-default">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-amber-primary/10 text-amber-primary flex items-center justify-center font-bold shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-lg font-bold text-text-primary">{city.name}</h2>
                      {city.isHeroPill ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-primary/15 text-amber-primary text-xs font-bold border border-amber-primary/30 flex items-center gap-1">
                          <Eye className="w-3 h-3" /> Hero Button Active
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 text-xs font-medium flex items-center gap-1">
                          <EyeOff className="w-3 h-3" /> Hidden from Hero
                        </span>
                      )}
                      <span className="text-xs text-text-secondary font-medium">
                        ({city.sublocations.length} sublocalities)
                      </span>
                    </div>
                    {city.tagline && (
                      <p className="text-xs text-text-secondary mt-0.5">{city.tagline}</p>
                    )}
                  </div>
                </div>

                {/* City Action Buttons */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleHeroPill(city.id)}
                    className={cn(
                      "text-xs font-semibold gap-1.5 h-9",
                      city.isHeroPill
                        ? "text-amber-primary border-amber-primary/30 hover:bg-amber-primary/10"
                        : "text-text-secondary hover:text-text-primary"
                    )}
                  >
                    {city.isHeroPill ? "Hide from Hero" : "Show on Hero"}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditCity(city)}
                    className="text-text-secondary hover:text-text-primary h-9"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Are you sure you want to remove "${city.name}" and all its sublocations?`)) {
                        deleteCity(city.id);
                      }
                    }}
                    className="text-red-500 hover:text-red-600 hover:bg-red-500/10 border-red-500/20 h-9"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => openAddSub(city.id)}
                    className="bg-amber-primary/15 hover:bg-amber-primary/25 text-amber-primary border border-amber-primary/30 font-bold text-xs gap-1.5 h-9"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Sublocality
                  </Button>
                </div>
              </div>

              {/* Sublocations List */}
              <div className="p-4 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {city.sublocations.map((sub) => (
                    <div
                      key={sub.id}
                      className="p-3.5 rounded-xl bg-bg-primary border border-border-default hover:border-amber-primary/40 transition-all flex items-center justify-between gap-2 group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-text-primary truncate">
                            {sub.name}
                          </span>
                        </div>
                        {sub.tagline && (
                          <p className="text-xs text-text-secondary truncate mt-0.5">
                            {sub.tagline}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditSub(city.id, sub)}
                          className="p-1.5 text-text-secondary hover:text-text-primary rounded-lg hover:bg-bg-card transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Remove sublocation "${sub.name}"?`)) {
                              deleteSublocation(city.id, sub.id);
                            }
                          }}
                          className="p-1.5 text-red-500 hover:text-red-600 rounded-lg hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {city.sublocations.length === 0 && (
                    <div className="col-span-full py-6 text-center text-text-secondary text-xs border border-dashed border-border-default rounded-xl">
                      No sublocations added yet. Click &quot;Add Sublocality&quot; to add Benz Circle, Poranki, etc.
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── ADD/EDIT CITY MODAL ─────────────────────────────────────── */}
      {isCityModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-bg-card border border-border-default rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border-default pb-4">
              <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <MapPin className="w-5 h-5 text-amber-primary" />
                {editingCity ? "Edit Location" : "Add New Location / City"}
              </h3>
              <button
                onClick={() => setIsCityModalOpen(false)}
                className="text-text-secondary hover:text-text-primary p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-xs font-bold text-text-primary block mb-1.5">
                  City / Location Name *
                </label>
                <Input
                  value={cityName}
                  onChange={(e) => setCityName(e.target.value)}
                  placeholder="e.g. Visakhapatnam, Hyderabad, Vijayawada"
                  className="bg-bg-primary text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-text-primary block mb-1.5">
                  Tagline / Description
                </label>
                <Input
                  value={cityTagline}
                  onChange={(e) => setCityTagline(e.target.value)}
                  placeholder="e.g. Coastal Smart City & IT Hub"
                  className="bg-bg-primary text-sm"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-bg-primary border border-border-default">
                <div>
                  <span className="font-bold text-text-primary text-xs block">
                    Show as Hero Pill Button
                  </span>
                  <span className="text-[11px] text-text-secondary">
                    Appears directly below homepage search bar
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={cityIsHeroPill}
                  onChange={(e) => setCityIsHeroPill(e.target.checked)}
                  className="w-5 h-5 rounded text-amber-primary focus:ring-amber-primary accent-amber-500 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsCityModalOpen(false)}
                className="text-text-secondary"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveCity}
                className="bg-amber-primary hover:bg-amber-primary/90 text-slate-950 font-bold"
              >
                {editingCity ? "Save Changes" : "Create Location"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── ADD/EDIT SUBLOCATION MODAL ─────────────────────────────── */}
      {subModalCityId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-bg-card border border-border-default rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border-default pb-4">
              <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <Tag className="w-5 h-5 text-amber-primary" />
                {editingSub ? "Edit Sublocality" : "Add New Sublocality"}
              </h3>
              <button
                onClick={() => setSubModalCityId(null)}
                className="text-text-secondary hover:text-text-primary p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-xs font-bold text-text-primary block mb-1.5">
                  Sublocality / Locality Name *
                </label>
                <Input
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  placeholder="e.g. Benz Circle, Gachibowli, Rushikonda"
                  className="bg-bg-primary text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-text-primary block mb-1.5">
                  Tagline / Speciality
                </label>
                <Input
                  value={subTagline}
                  onChange={(e) => setSubTagline(e.target.value)}
                  placeholder="e.g. Prime Commercial Hub, Luxury Villas"
                  className="bg-bg-primary text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setSubModalCityId(null)}
                className="text-text-secondary"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveSublocation}
                className="bg-amber-primary hover:bg-amber-primary/90 text-slate-950 font-bold"
              >
                {editingSub ? "Save Changes" : "Add Sublocality"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
