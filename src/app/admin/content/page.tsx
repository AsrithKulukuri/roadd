"use client";

import { useEffect, useState } from "react";
import { useContentStore, TrendingLocation, HomeCategory } from "@/stores/content-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Edit2, Plus, Trash2, MapPin, LayoutGrid, UploadCloud, X, Sparkles, ExternalLink, Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { uploadToS3 } from "@/lib/aws/storage-utils";

type Tab = "categories" | "locations";

const PROPERTY_TYPES = [
  { value: "apartment", label: "Apartment / Flat" },
  { value: "villa", label: "Luxury Villa" },
  { value: "independent-house", label: "Independent House" },
  { value: "builder-floor", label: "Builder Floor" },
  { value: "resale", label: "Resale Home" },
  { value: "residential-plot", label: "Residential Plot / Open Land" },
  { value: "agricultural-land", label: "Farm Land / Agriculture" },
  { value: "commercial", label: "Commercial Space" },
];

export default function ContentAdminPage() {
  const {
    trendingLocations, isLoading, fetchTrendingLocations,
    addLocation, updateLocation, deleteLocation,
    homeCategories, addCategory, updateCategory, deleteCategory,
  } = useContentStore();

  const [activeTab, setActiveTab] = useState<Tab>("categories");

  // ─── Trending Locations state ───────────────────────────────────────────────
  const [editingLocId, setEditingLocId] = useState<string | null>(null);
  const [locForm, setLocForm] = useState<Partial<TrendingLocation>>({});
  const [isAddingLoc, setIsAddingLoc] = useState(false);
  const [locImageFile, setLocImageFile] = useState<File | null>(null);
  const [locImagePreview, setLocImagePreview] = useState<string | null>(null);

  // ─── Home Categories state ───────────────────────────────────────────────────
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catForm, setCatForm] = useState<Partial<HomeCategory>>({});
  const [isAddingCat, setIsAddingCat] = useState(false);
  const [catImageFile, setCatImageFile] = useState<File | null>(null);
  const [catImagePreview, setCatImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => { 
    fetchTrendingLocations(); 
  }, [fetchTrendingLocations]);

  // Helper to upload image to AWS S3 Storage or convert to DataURL
  const uploadImage = async (file: File, folder: "categories" | "properties"): Promise<string> => {
    try {
      const s3Res = await uploadToS3({
        file,
        folder: folder === "categories" ? "categories" : "properties",
      });

      if (s3Res.success && s3Res.fileUrl) {
        return s3Res.fileUrl;
      }
    } catch (e) {
      console.warn("[S3 Storage] upload fallback to DataURL:", e);
    }

    // Fallback to Data URL
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  };

  // ─── Location handlers ───────────────────────────────────────────────────────
  const handleSaveLoc = async () => {
    let imageUrl = locForm.image || "";
    if (locImageFile) {
      setIsUploading(true);
      imageUrl = await uploadImage(locImageFile, "categories");
      setIsUploading(false);
    }

    if (!locForm.city || !locForm.locality || !imageUrl) {
      toast.error("Please provide city, locality, and an image"); 
      return;
    }

    const payload = {
      ...locForm,
      image: imageUrl,
      city: locForm.city,
      locality: locForm.locality,
      properties_count: locForm.properties_count || 0,
    };

    if (isAddingLoc) { 
      await addLocation(payload as Omit<TrendingLocation, "id">); 
      setIsAddingLoc(false); 
    } else if (editingLocId) { 
      await updateLocation(editingLocId, payload); 
      setEditingLocId(null); 
    }
    setLocForm({});
    setLocImageFile(null);
    setLocImagePreview(null);
  };

  // ─── Category handlers ────────────────────────────────────────────────────────
  const handleSaveCat = async () => {
    if (!catForm.name) { 
      toast.error("Category name is required"); 
      return; 
    }

    let imageUrl = catForm.image || "";
    if (catImageFile) {
      setIsUploading(true);
      imageUrl = await uploadImage(catImageFile, "categories");
      setIsUploading(false);
    }

    if (!imageUrl) {
      toast.error("Please upload an image or provide an image URL");
      return;
    }

    const targetType = catForm.type || "apartment";
    const defaultHref = catForm.href || (
      targetType === "resale" ? "/search?type=buy&saleType=resale" :
      targetType === "new" ? "/search?type=buy&saleType=new" :
      `/search?type=buy&propertyType=${targetType}`
    );

    const payload: Partial<HomeCategory> = {
      ...catForm,
      name: catForm.name,
      subtitle: catForm.subtitle || catForm.description || "",
      description: catForm.description || catForm.subtitle || "",
      image: imageUrl,
      type: targetType,
      href: defaultHref,
      badge: catForm.badge || undefined,
      badgeClass: catForm.badgeClass || (catForm.badge ? "bg-amber-500 text-slate-950 font-extrabold" : undefined),
      count: catForm.count || 0,
      icon: catForm.icon || "Building2",
    };

    if (isAddingCat) {
      addCategory(payload as Omit<HomeCategory, "id">);
      setIsAddingCat(false);
    } else if (editingCatId) {
      updateCategory(editingCatId, payload);
      setEditingCatId(null);
    }

    setCatForm({});
    setCatImageFile(null);
    setCatImagePreview(null);
  };

  const handleOpenEditCategory = (cat: HomeCategory) => {
    setEditingCatId(cat.id);
    setCatForm(cat);
    setCatImagePreview(cat.image);
    setCatImageFile(null);
    setIsAddingCat(false);
  };

  const handleOpenAddCategory = () => {
    setIsAddingCat(true);
    setEditingCatId(null);
    setCatForm({
      name: "",
      subtitle: "",
      type: "apartment",
      badge: "",
      count: 0,
      image: "",
    });
    setCatImagePreview(null);
    setCatImageFile(null);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-default pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black font-heading text-text-primary flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
              <LayoutGrid className="w-6 h-6" />
            </div>
            Home Page Content Manager
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Easily update, add, or customize <strong>Browse Homes Categories</strong> and <strong>Hotspot Locations</strong>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === "categories" && !isAddingCat && !editingCatId && (
            <Button 
              onClick={handleOpenAddCategory} 
              className="bg-amber-primary hover:bg-amber-600 text-slate-950 font-black shadow-lg"
            >
              <Plus className="w-4 h-4 mr-2" /> Add New Category
            </Button>
          )}
          {activeTab === "locations" && !isAddingLoc && !editingLocId && (
            <Button 
              onClick={() => { setIsAddingLoc(true); setEditingLocId(null); setLocForm({ properties_count: 0 }); }} 
              className="bg-amber-primary hover:bg-amber-600 text-slate-950 font-black shadow-lg"
            >
              <Plus className="w-4 h-4 mr-2" /> Add Location
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 p-1.5 bg-bg-card border border-border-default rounded-2xl w-fit shadow-xs">
        {([
          { id: "categories", label: "Browse Home Categories", icon: LayoutGrid },
          { id: "locations", label: "Trending Locations", icon: MapPin },
        ] as { id: Tab; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => {
              setActiveTab(id);
              setIsAddingCat(false);
              setEditingCatId(null);
              setIsAddingLoc(false);
              setEditingLocId(null);
            }}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer",
              activeTab === id
                ? "bg-amber-500 text-slate-950 shadow-md"
                : "text-text-secondary hover:text-text-primary hover:bg-bg-secondary"
            )}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* ─── BROWSE CATEGORIES TAB ──────────────────────────────────────────── */}
      {activeTab === "categories" && (
        <div className="space-y-6">
          
          {/* CATEGORY ADD/EDIT MODAL / PANEL */}
          {(isAddingCat || editingCatId) && (
            <div className="bg-bg-card border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200 relative">
              <button
                type="button"
                onClick={() => { setIsAddingCat(false); setEditingCatId(null); setCatForm({}); }}
                className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-6">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h2 className="text-xl font-black text-text-primary">
                  {editingCatId ? `Edit Category: ${catForm.name || "Untitled"}` : "Create New Browse Category"}
                </h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Inputs Column */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Name */}
                    <div>
                      <label className="text-xs font-bold text-text-primary">Category Name *</label>
                      <Input
                        value={catForm.name || ""}
                        onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                        placeholder="e.g. Luxury Villas"
                        className="mt-1"
                      />
                    </div>

                    {/* Subtitle */}
                    <div>
                      <label className="text-xs font-bold text-text-primary">Subtitle / Description</label>
                      <Input
                        value={catForm.subtitle || ""}
                        onChange={(e) => setCatForm({ ...catForm, subtitle: e.target.value })}
                        placeholder="e.g. Standalone luxury villas"
                        className="mt-1"
                      />
                    </div>

                    {/* Property Type Selector */}
                    <div>
                      <label className="text-xs font-bold text-text-primary">Property Type Filter</label>
                      <select
                        value={catForm.type || "apartment"}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCatForm({
                            ...catForm,
                            type: val,
                            href: val === "resale" ? "/search?type=buy&saleType=resale" : `/search?type=buy&propertyType=${val}`,
                          });
                        }}
                        className="w-full h-10 px-3 mt-1 border border-border-default rounded-xl bg-bg-surface text-sm font-semibold text-text-primary outline-none cursor-pointer"
                      >
                        {PROPERTY_TYPES.map((pt) => (
                          <option key={pt.value} value={pt.value}>
                            {pt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Badge Text */}
                    <div>
                      <label className="text-xs font-bold text-text-primary">Badge Text (Optional)</label>
                      <Input
                        value={catForm.badge || ""}
                        onChange={(e) => setCatForm({ ...catForm, badge: e.target.value })}
                        placeholder="e.g. Premium, Hot, New, Top Pick"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {/* Destination Link */}
                  <div>
                    <label className="text-xs font-bold text-text-primary">Destination Link (Href)</label>
                    <Input
                      value={catForm.href || ""}
                      onChange={(e) => setCatForm({ ...catForm, href: e.target.value })}
                      placeholder="/search?type=buy&propertyType=villa"
                      className="mt-1 font-mono text-xs"
                    />
                  </div>

                  {/* Image Upload Dropzone */}
                  <div className="space-y-2 pt-2">
                    <label className="text-xs font-bold text-text-primary flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-amber-500" />
                      Category Cover Image *
                    </label>
                    <div className="relative border-2 border-dashed border-border-default hover:border-amber-500/60 rounded-2xl p-4 flex flex-col items-center justify-center bg-bg-surface transition-colors">
                      <UploadCloud className="w-8 h-8 text-slate-500 mb-2" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setCatImageFile(file);
                            setCatImagePreview(URL.createObjectURL(file));
                          }
                        }}
                        className="text-xs text-text-secondary file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-amber-500/10 file:text-amber-500 hover:file:bg-amber-500/20 cursor-pointer"
                      />
                      <span className="text-[10px] text-text-tertiary mt-1.5">Upload JPG, PNG, WebP or enter custom URL below</span>
                    </div>

                    <Input
                      value={catForm.image || ""}
                      onChange={(e) => {
                        setCatForm({ ...catForm, image: e.target.value });
                        setCatImagePreview(e.target.value);
                      }}
                      placeholder="Or paste Direct Image URL (https://...)"
                      className="text-xs"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4 border-t border-border-default">
                    <Button 
                      onClick={handleSaveCat} 
                      disabled={isUploading}
                      className="bg-amber-primary hover:bg-amber-600 text-slate-950 font-black px-6 shadow-md"
                    >
                      {isUploading ? "Uploading..." : editingCatId ? "Update Category" : "Add Category"}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => { setIsAddingCat(false); setEditingCatId(null); setCatForm({}); }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>

                {/* Live Preview Card */}
                <div className="space-y-2">
                  <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Live Preview</span>
                  <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-lg border border-slate-700 bg-slate-900 group">
                    {catImagePreview || catForm.image ? (
                      <Image
                        src={catImagePreview || catForm.image || ""}
                        alt={catForm.name || "Preview"}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">
                        No image selected
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />
                    
                    {/* Badge */}
                    {catForm.badge && (
                      <div className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black shadow-md">
                        {catForm.badge}
                      </div>
                    )}

                    {/* Text Overlay */}
                    <div className="absolute bottom-3 left-3 right-3 text-left">
                      <h4 className="font-extrabold text-white text-base leading-tight drop-shadow-md">
                        {catForm.name || "Category Title"}
                      </h4>
                      <p className="text-[11px] text-slate-300 font-medium line-clamp-1 mt-0.5">
                        {catForm.subtitle || "Category Subtitle / Description"}
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* CATEGORIES GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {homeCategories.map((cat) => (
              <div 
                key={cat.id} 
                className="bg-bg-card border border-border-default hover:border-amber-500/50 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group"
              >
                {/* Image */}
                <div className="relative w-full h-40 shrink-0 overflow-hidden bg-slate-900">
                  <Image 
                    src={cat.image} 
                    alt={cat.name} 
                    fill 
                    className="object-cover group-hover:scale-105 transition-transform duration-500" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  
                  {cat.badge && (
                    <span className={cn(
                      "absolute top-2.5 right-2.5 text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-md",
                      cat.badgeClass || "bg-amber-500 text-slate-950"
                    )}>
                      {cat.badge}
                    </span>
                  )}

                  <div className="absolute bottom-2 left-3 right-3">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                      {cat.type}
                    </span>
                  </div>
                </div>

                {/* Body */}
                <div className="flex-1 flex flex-col justify-between p-4 space-y-3">
                  <div>
                    <h3 className="font-black text-base text-text-primary leading-tight">
                      {cat.name}
                    </h3>
                    <p className="text-text-secondary text-xs mt-1 line-clamp-2">
                      {cat.subtitle || cat.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-border-default flex items-center justify-between gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1 h-8 text-xs font-bold"
                      onClick={() => handleOpenEditCategory(cat)}
                    >
                      <Edit2 className="w-3.5 h-3.5 mr-1.5 text-amber-500" /> Edit
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10" 
                      onClick={() => { 
                        if (confirm(`Are you sure you want to delete category "${cat.name}"?`)) {
                          deleteCategory(cat.id); 
                        }
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* ─── TRENDING LOCATIONS TAB ─────────────────────────────────────────── */}
      {activeTab === "locations" && (
        <div className="space-y-6">
          {isAddingLoc && (
            <div className="bg-bg-card border-2 border-amber-500/40 rounded-3xl p-6 shadow-xl space-y-4">
              <h3 className="font-black text-lg text-text-primary">Add New Trending Location</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-text-secondary">Locality Name</label>
                  <Input 
                    value={locForm.locality || ""} 
                    onChange={e => setLocForm({ ...locForm, locality: e.target.value })} 
                    placeholder="e.g. Benz Circle" 
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-text-secondary">City</label>
                  <Input 
                    value={locForm.city || ""} 
                    onChange={e => setLocForm({ ...locForm, city: e.target.value })} 
                    placeholder="e.g. Vijayawada" 
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-text-secondary">Image URL</label>
                <Input 
                  value={locForm.image || ""} 
                  onChange={e => setLocForm({ ...locForm, image: e.target.value })} 
                  placeholder="https://..." 
                  className="mt-1"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button onClick={handleSaveLoc} className="bg-amber-primary hover:bg-amber-600 text-slate-950 font-black">
                  Save Location
                </Button>
                <Button variant="outline" onClick={() => setIsAddingLoc(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {trendingLocations.map((location) => (
              <div key={location.id} className="bg-bg-card border border-border-default rounded-2xl overflow-hidden shadow-sm flex flex-col p-4 space-y-3">
                <div className="relative w-full h-36 rounded-xl overflow-hidden bg-slate-900">
                  <Image src={location.image} alt={location.locality} fill className="object-cover" />
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-base text-text-primary">{location.locality}</h3>
                    <p className="text-text-secondary text-xs">{location.city}</p>
                  </div>
                  <div className="flex gap-2 pt-3">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1 h-8 text-xs font-bold"
                      onClick={() => { setEditingLocId(location.id!); setLocForm(location); setIsAddingLoc(false); }}
                    >
                      <Edit2 className="w-3.5 h-3.5 mr-1 text-amber-500" /> Edit
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10" 
                      onClick={() => { if (confirm("Delete this location?")) deleteLocation(location.id!); }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
