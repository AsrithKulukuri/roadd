"use client";

import { useEffect, useState } from "react";
import { useContentStore, TrendingLocation, HomeCategory } from "@/stores/content-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Edit2, Plus, Trash2, MapPin, LayoutGrid } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

type Tab = "locations" | "categories";

export default function ContentAdminPage() {
  const {
    trendingLocations, isLoading, fetchTrendingLocations,
    addLocation, updateLocation, deleteLocation,
    homeCategories, addCategory, updateCategory, deleteCategory,
  } = useContentStore();

  const [activeTab, setActiveTab] = useState<Tab>("locations");

  // ─── Trending Locations state ───────────────────────────────────────────────
  const [editingLocId, setEditingLocId] = useState<string | null>(null);
  const [locForm, setLocForm] = useState<Partial<TrendingLocation>>({});
  const [isAddingLoc, setIsAddingLoc] = useState(false);

  // ─── Home Categories state ───────────────────────────────────────────────────
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catForm, setCatForm] = useState<Partial<HomeCategory>>({});
  const [isAddingCat, setIsAddingCat] = useState(false);

  useEffect(() => { fetchTrendingLocations(); }, [fetchTrendingLocations]);

  // ─── Location handlers ───────────────────────────────────────────────────────
  const handleSaveLoc = async () => {
    if (!locForm.city || !locForm.locality || !locForm.image) {
      toast.error("Please fill in all required fields"); return;
    }
    if (isAddingLoc) { await addLocation(locForm as TrendingLocation); setIsAddingLoc(false); }
    else if (editingLocId) { await updateLocation(editingLocId, locForm); setEditingLocId(null); }
  };

  // ─── Category handlers ────────────────────────────────────────────────────────
  const handleSaveCat = () => {
    if (!catForm.name || !catForm.image) { toast.error("Name and image are required"); return; }
    if (isAddingCat) {
      addCategory({ ...catForm, type: catForm.type || "apartment", icon: catForm.icon || "Building2", description: catForm.description || catForm.subtitle || "", count: catForm.count || 0 } as Omit<HomeCategory, "id">);
      setIsAddingCat(false);
    } else if (editingCatId) {
      updateCategory(editingCatId, catForm);
      setEditingCatId(null);
    }
    setCatForm({});
  };

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading text-text-primary">Content Management</h1>
          <p className="text-text-secondary text-xs sm:text-sm mt-1">Manage what appears on the home page.</p>
        </div>

        {activeTab === "locations" && (
          <Button onClick={() => { setIsAddingLoc(true); setEditingLocId(null); setLocForm({ properties_count: 0 }); }} className="self-start sm:self-auto">
            <Plus className="w-4 h-4 mr-2" /> Add Location
          </Button>
        )}
        {activeTab === "categories" && (
          <Button onClick={() => { setIsAddingCat(true); setEditingCatId(null); setCatForm({ count: 0 }); }} className="self-start sm:self-auto">
            <Plus className="w-4 h-4 mr-2" /> Add Category
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-bg-card border border-border-default rounded-xl w-fit">
        {([
          { id: "locations", label: "Trending Locations", icon: MapPin },
          { id: "categories", label: "Browse Categories", icon: LayoutGrid },
        ] as { id: Tab; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer",
              activeTab === id
                ? "bg-amber-500 text-slate-950 shadow"
                : "text-text-secondary hover:text-text-primary hover:bg-bg-secondary"
            )}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* ─── TRENDING LOCATIONS TAB ─────────────────────────────────────────── */}
      {activeTab === "locations" && (
        isLoading ? (
          <div className="text-center py-12 text-text-secondary">Loading content...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {isAddingLoc && (
              <div className="bg-bg-card border border-amber-primary/30 rounded-xl p-5 shadow-sm">
                <h3 className="font-semibold mb-4 text-text-primary">Add New Location</h3>
                <div className="space-y-4">
                  {[
                    { label: "City", key: "city", placeholder: "e.g. Vijayawada" },
                    { label: "Locality", key: "locality", placeholder: "e.g. Benz Circle" },
                    { label: "Image URL", key: "image", placeholder: "https://..." },
                  ].map(({ label, key, placeholder }) => (
                    <div key={key}>
                      <label className="text-sm text-text-secondary">{label}</label>
                      <Input value={(locForm as Record<string, string>)[key] || ""} onChange={e => setLocForm({ ...locForm, [key]: e.target.value })} placeholder={placeholder} />
                    </div>
                  ))}
                  <div>
                    <label className="text-sm text-text-secondary">Properties Count</label>
                    <Input type="number" value={locForm.properties_count || 0} onChange={e => setLocForm({ ...locForm, properties_count: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button onClick={handleSaveLoc} className="flex-1">Save</Button>
                    <Button variant="outline" onClick={() => setIsAddingLoc(false)} className="flex-1">Cancel</Button>
                  </div>
                </div>
              </div>
            )}

            {trendingLocations.map(location => (
              <div key={location.id} className="bg-bg-card border border-border-default rounded-xl p-5 shadow-sm flex flex-col sm:flex-row gap-4">
                <div className="relative w-full sm:w-32 h-32 rounded-lg overflow-hidden shrink-0 border border-border-default">
                  <Image src={location.image} alt={location.locality} fill className="object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  {editingLocId === location.id ? (
                    <div className="space-y-3">
                      {["city", "locality", "image"].map(key => (
                        <Input key={key} value={(locForm as Record<string, string>)[key] || ""} onChange={e => setLocForm({ ...locForm, [key]: e.target.value })} placeholder={key.charAt(0).toUpperCase() + key.slice(1)} className="h-8" />
                      ))}
                      <Input type="number" value={locForm.properties_count || 0} onChange={e => setLocForm({ ...locForm, properties_count: parseInt(e.target.value) || 0 })} placeholder="Count" className="h-8" />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveLoc} className="flex-1 h-8">Save</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingLocId(null)} className="flex-1 h-8">Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col">
                      <h3 className="font-bold text-lg text-text-primary truncate">{location.locality}</h3>
                      <p className="text-text-secondary text-sm">{location.city}</p>
                      <p className="text-text-secondary text-xs mt-1">{location.properties_count} Properties</p>
                      <div className="mt-auto pt-4 flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1 h-8" onClick={() => { setEditingLocId(location.id!); setLocForm(location); setIsAddingLoc(false); }}>
                          <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Edit
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 text-red-500 hover:text-red-600 hover:bg-red-500/10" onClick={() => { if (confirm("Delete this location?")) deleteLocation(location.id!); }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ─── BROWSE CATEGORIES TAB ──────────────────────────────────────────── */}
      {activeTab === "categories" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {/* Add new card */}
          {isAddingCat && (
            <div className="bg-bg-card border border-amber-primary/30 rounded-xl p-4 shadow-sm col-span-full sm:col-span-2 lg:col-span-2">
              <h3 className="font-semibold mb-4 text-text-primary">Add New Category</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: "Name *", key: "name", placeholder: "e.g. Apartments" },
                  { label: "Subtitle", key: "subtitle", placeholder: "Short description" },
                  { label: "Badge text", key: "badge", placeholder: "e.g. Hot" },
                  { label: "Property type", key: "type", placeholder: "e.g. apartment" },
                  { label: "Image URL *", key: "image", placeholder: "https://..." },
                  { label: "Link (href)", key: "href", placeholder: "/properties?..." },
                ].map(({ label, key, placeholder }) => (
                  <div key={key}>
                    <label className="text-xs text-text-secondary">{label}</label>
                    <Input value={(catForm as Record<string, string>)[key] || ""} onChange={e => setCatForm({ ...catForm, [key]: e.target.value })} placeholder={placeholder} className="h-8 mt-0.5 text-sm" />
                  </div>
                ))}
                <div>
                  <label className="text-xs text-text-secondary">Count</label>
                  <Input type="number" value={catForm.count || 0} onChange={e => setCatForm({ ...catForm, count: parseInt(e.target.value) || 0 })} className="h-8 mt-0.5 text-sm" />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={handleSaveCat} className="flex-1">Save Category</Button>
                <Button variant="outline" onClick={() => { setIsAddingCat(false); setCatForm({}); }} className="flex-1">Cancel</Button>
              </div>
            </div>
          )}

          {homeCategories.map(cat => (
            <div key={cat.id} className="bg-bg-card border border-border-default rounded-xl overflow-hidden shadow-sm flex flex-col">
              {/* Image */}
              <div className="relative w-full h-36 shrink-0">
                <Image src={cat.image} alt={cat.name} fill className="object-cover" />
                {cat.badge && (
                  <span className={cn("absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full", cat.badgeClass || "bg-white/90 text-slate-900")}>
                    {cat.badge}
                  </span>
                )}
              </div>

              {/* Body */}
              <div className="flex-1 flex flex-col p-4">
                {editingCatId === cat.id ? (
                  <div className="space-y-2 flex-1">
                    {[
                      { label: "Name", key: "name", placeholder: "Category name" },
                      { label: "Subtitle", key: "subtitle", placeholder: "Short description" },
                      { label: "Badge", key: "badge", placeholder: "Badge text" },
                      { label: "Image URL", key: "image", placeholder: "https://..." },
                      { label: "Type", key: "type", placeholder: "e.g. apartment" },
                    ].map(({ label, key, placeholder }) => (
                      <div key={key}>
                        <label className="text-[10px] text-text-secondary uppercase tracking-wider">{label}</label>
                        <Input value={(catForm as Record<string, string>)[key] || ""} onChange={e => setCatForm({ ...catForm, [key]: e.target.value })} placeholder={placeholder} className="h-7 text-xs mt-0.5" />
                      </div>
                    ))}
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" onClick={handleSaveCat} className="flex-1 h-7 text-xs">Save</Button>
                      <Button size="sm" variant="outline" onClick={() => { setEditingCatId(null); setCatForm({}); }} className="flex-1 h-7 text-xs">Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className="font-bold text-base text-text-primary leading-tight">{cat.name}</h3>
                    <p className="text-text-secondary text-xs mt-0.5 flex-1">{cat.subtitle}</p>
                    <p className="text-text-secondary text-[10px] mt-1 uppercase tracking-wider">{cat.type} · {cat.count} props</p>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => { setEditingCatId(cat.id); setCatForm(cat); setIsAddingCat(false); }}>
                        <Edit2 className="w-3 h-3 mr-1" /> Edit
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10" onClick={() => { if (confirm(`Delete "${cat.name}"?`)) deleteCategory(cat.id); }}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
