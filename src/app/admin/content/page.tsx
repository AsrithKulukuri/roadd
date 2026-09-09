"use client";

import { useEffect, useState } from "react";
import { useContentStore, TrendingLocation, HomeCategory, DEFAULT_DESKTOP_SEARCH_PHRASES, DEFAULT_MOBILE_SEARCH_PHRASES } from "@/stores/content-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Edit2, Plus, Trash2, MapPin, LayoutGrid, UploadCloud, X, Sparkles, ExternalLink, Image as ImageIcon, Laptop, Smartphone, Check, RotateCcw, Search, Gauge, Zap, Clock, Palette } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { uploadToS3 } from "@/lib/aws/storage-utils";
import { IconPicker } from "@/components/admin/icon-picker";
import { getLucideIcon } from "@/lib/home-section-icons";

type Tab = "categories" | "locations" | "search-phrases";

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
    homeCategories, fetchCategories, addCategory, updateCategory, deleteCategory, resetCategories,
    searchTypewriterPhrasesDesktop, searchTypewriterPhrasesMobile, searchPhrasesConfigured,
    searchTypewriterSpeed, searchTypewriterPause, searchTypewriterTextColor,
    fetchSearchPhrases, setSearchTypewriterPhrases, setSearchTypewriterSpeed, setSearchTypewriterTextColor,
    addDesktopPhrase, removeDesktopPhrase,
    addMobilePhrase, removeMobilePhrase,
  } = useContentStore();

  const [activeTab, setActiveTab] = useState<Tab>("categories");

  // ─── Search Bar Typewriter State ──────────────────────────────────────────
  const [newDesktopPhrase, setNewDesktopPhrase] = useState("");
  const [newMobilePhrase, setNewMobilePhrase] = useState("");
  const [editingDesktopIdx, setEditingDesktopIdx] = useState<number | null>(null);
  const [editingDesktopText, setEditingDesktopText] = useState("");
  const [editingMobileIdx, setEditingMobileIdx] = useState<number | null>(null);
  const [editingMobileText, setEditingMobileText] = useState("");

  // Typing speed & sentence hold duration controls
  const [typingSpeedVal, setTypingSpeedVal] = useState<number>(searchTypewriterSpeed || 60);
  const [pauseDurationVal, setPauseDurationVal] = useState<number>(searchTypewriterPause || 2200);
  const [isSavingSpeed, setIsSavingSpeed] = useState(false);

  // Typing text appearance: Light Text vs Dark Text
  const [textColorVal, setTextColorVal] = useState<"dark" | "light">(searchTypewriterTextColor || "dark");
  const [isSavingTextColor, setIsSavingTextColor] = useState(false);

  useEffect(() => {
    if (typeof searchTypewriterSpeed === "number" && searchTypewriterSpeed > 0) {
      setTypingSpeedVal(searchTypewriterSpeed);
    }
  }, [searchTypewriterSpeed]);

  useEffect(() => {
    if (typeof searchTypewriterPause === "number" && searchTypewriterPause > 0) {
      setPauseDurationVal(searchTypewriterPause);
    }
  }, [searchTypewriterPause]);

  useEffect(() => {
    if (searchTypewriterTextColor) {
      setTextColorVal(searchTypewriterTextColor);
    }
  }, [searchTypewriterTextColor]);

  const handleApplySpeed = async (newSpeed: number, newPause: number) => {
    setTypingSpeedVal(newSpeed);
    setPauseDurationVal(newPause);
    setIsSavingSpeed(true);
    try {
      await setSearchTypewriterSpeed(newSpeed, newPause);
    } catch (err) {
      console.error("Failed to save typing speed:", err);
      toast.error("Failed to save speed settings");
    } finally {
      setIsSavingSpeed(false);
    }
  };

  const handleApplyTextColor = async (newColor: "dark" | "light") => {
    setTextColorVal(newColor);
    setIsSavingTextColor(true);
    try {
      await setSearchTypewriterTextColor(newColor);
    } catch (err) {
      console.error("Failed to save text color:", err);
      toast.error("Failed to save text color");
    } finally {
      setIsSavingTextColor(false);
    }
  };

  const desktopList = (searchPhrasesConfigured || Array.isArray(searchTypewriterPhrasesDesktop))
    ? (searchTypewriterPhrasesDesktop ?? [])
    : DEFAULT_DESKTOP_SEARCH_PHRASES;
  const mobileList = (searchPhrasesConfigured || Array.isArray(searchTypewriterPhrasesMobile))
    ? (searchTypewriterPhrasesMobile ?? [])
    : DEFAULT_MOBILE_SEARCH_PHRASES;

  // Live Typewriter Preview for Admin Laptop View (uses dynamic speed)
  const [previewDesktopText, setPreviewDesktopText] = useState("");
  const [previewDesktopDeleting, setPreviewDesktopDeleting] = useState(false);
  const [previewDesktopLoop, setPreviewDesktopLoop] = useState(0);

  useEffect(() => {
    if (!desktopList || desktopList.length === 0) {
      setPreviewDesktopText("");
      return;
    }
    const currentPhrase = desktopList[previewDesktopLoop % desktopList.length] || "";
    const forwardSpeed = Math.max(30, typingSpeedVal || 60);
    const pauseTime = Math.max(1000, pauseDurationVal || 2200);

    if (desktopList.length === 1 && previewDesktopText === currentPhrase && !previewDesktopDeleting) {
      return;
    }

    let timer: NodeJS.Timeout;

    if (!previewDesktopDeleting) {
      if (previewDesktopText.length < currentPhrase.length) {
        timer = setTimeout(() => {
          setPreviewDesktopText(currentPhrase.slice(0, previewDesktopText.length + 1));
        }, forwardSpeed);
      } else {
        timer = setTimeout(() => {
          if (desktopList.length > 1) {
            setPreviewDesktopDeleting(true);
          }
        }, pauseTime);
      }
    } else {
      if (previewDesktopText.length > 0) {
        const step = currentPhrase.length > 35 && previewDesktopText.length > 8 ? 2 : 1;
        const deleteDelay = Math.max(25, Math.round(forwardSpeed * 0.48));
        timer = setTimeout(() => {
          setPreviewDesktopText(currentPhrase.slice(0, Math.max(0, previewDesktopText.length - step)));
        }, deleteDelay);
      } else {
        timer = setTimeout(() => {
          setPreviewDesktopDeleting(false);
          setPreviewDesktopLoop((prev) => (prev + 1) % desktopList.length);
        }, 320);
      }
    }

    return () => clearTimeout(timer);
  }, [previewDesktopText, previewDesktopDeleting, previewDesktopLoop, desktopList, typingSpeedVal, pauseDurationVal]);

  // Live Typewriter Preview for Admin Mobile View (uses dynamic speed)
  const [previewMobileText, setPreviewMobileText] = useState("");
  const [previewMobileDeleting, setPreviewMobileDeleting] = useState(false);
  const [previewMobileLoop, setPreviewMobileLoop] = useState(0);

  useEffect(() => {
    if (!mobileList || mobileList.length === 0) {
      setPreviewMobileText("");
      return;
    }
    const currentPhrase = mobileList[previewMobileLoop % mobileList.length] || "";
    const forwardSpeed = Math.max(30, typingSpeedVal || 60);
    const pauseTime = Math.max(1000, pauseDurationVal || 2200);

    if (mobileList.length === 1 && previewMobileText === currentPhrase && !previewMobileDeleting) {
      return;
    }

    let timer: NodeJS.Timeout;

    if (!previewMobileDeleting) {
      if (previewMobileText.length < currentPhrase.length) {
        timer = setTimeout(() => {
          setPreviewMobileText(currentPhrase.slice(0, previewMobileText.length + 1));
        }, forwardSpeed);
      } else {
        timer = setTimeout(() => {
          if (mobileList.length > 1) {
            setPreviewMobileDeleting(true);
          }
        }, pauseTime);
      }
    } else {
      if (previewMobileText.length > 0) {
        const step = currentPhrase.length > 35 && previewMobileText.length > 8 ? 2 : 1;
        const deleteDelay = Math.max(25, Math.round(forwardSpeed * 0.48));
        timer = setTimeout(() => {
          setPreviewMobileText(currentPhrase.slice(0, Math.max(0, previewMobileText.length - step)));
        }, deleteDelay);
      } else {
        timer = setTimeout(() => {
          setPreviewMobileDeleting(false);
          setPreviewMobileLoop((prev) => (prev + 1) % mobileList.length);
        }, 320);
      }
    }

    return () => clearTimeout(timer);
  }, [previewMobileText, previewMobileDeleting, previewMobileLoop, mobileList, typingSpeedVal, pauseDurationVal]);

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
    fetchCategories();
    fetchSearchPhrases();
  }, [fetchTrendingLocations, fetchCategories, fetchSearchPhrases]);

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
      await addCategory(payload as Omit<HomeCategory, "id">);
      setIsAddingCat(false);
    } else if (editingCatId) {
      await updateCategory(editingCatId, payload);
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
      icon: "Building2",
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
            Easily update, add, or customize <strong>Browse Properties Categories</strong> and <strong>Hotspot Locations</strong>.
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
      <div className="flex flex-wrap gap-1.5 p-1.5 bg-bg-card border border-border-default rounded-2xl w-fit shadow-xs">
        {([
          { id: "categories", label: "Browse Home Categories", icon: LayoutGrid },
          { id: "locations", label: "Trending Locations", icon: MapPin },
          { id: "search-phrases", label: "Search Bar Typing Phrases", icon: Sparkles },
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

                  {/* Category Floating Icon Selector */}
                  <div className="pt-2 border-t border-border-default">
                    <IconPicker
                      value={catForm.icon || "Building2"}
                      onChange={(newIcon) => setCatForm({ ...catForm, icon: newIcon })}
                      label="Category Icon Badge (Homepage Card) *"
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

                    {/* Text Overlay with Floating Icon Badge matching Homepage */}
                    <div className="absolute bottom-3 left-3 right-3 text-left flex items-center gap-2.5">
                      {(() => {
                        const IconComponent = getLucideIcon(catForm.icon || "Building2");
                        return (
                          <div className="w-9 h-9 rounded-full bg-white shadow-md border border-slate-100 flex items-center justify-center text-[#78350f] shrink-0">
                            <IconComponent className="w-4 h-4 stroke-[2.2]" />
                          </div>
                        );
                      })()}
                      <div className="min-w-0 flex-1">
                        <h4 className="font-extrabold text-white text-sm leading-tight drop-shadow-md truncate">
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

                {/* Body with Floating Icon Badge */}
                <div className="flex-1 flex flex-col justify-between p-4 pt-2 space-y-3 relative">
                  {/* Floating Circular Icon Badge */}
                  <div className="-mt-7 w-9 h-9 rounded-full bg-white shadow-md border border-slate-100 flex items-center justify-center text-[#78350f] relative z-10 shrink-0">
                    {(() => {
                      const CatIconComp = getLucideIcon(cat.icon || "Building2");
                      return <CatIconComp className="w-4 h-4 stroke-[2.2]" />;
                    })()}
                  </div>

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
                      onClick={async () => { 
                        if (confirm(`Are you sure you want to delete category "${cat.name}"?`)) {
                          await deleteCategory(cat.id); 
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

      {/* ─── SEARCH BAR TYPING PHRASES TAB ──────────────────────────────────── */}
      {activeTab === "search-phrases" && (
        <div className="space-y-8 animate-in fade-in duration-200">
          
          {/* Header Card with Reset Action */}
          <div className="bg-bg-card border border-border-default rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-500 text-xs font-black">
                <Sparkles className="w-3.5 h-3.5" />
                Live Animated Typewriter Placeholder
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight">
                Search Bar Typing Sentences & Screen Length Controls
              </h2>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                Control the phrases that automatically type out character-by-character in the search bar. 
                Configure separate sentence lists for <strong>Laptop/Desktop</strong> screens (with length limit indicator) and <strong>Mobile</strong> screens for optimal responsive layout.
              </p>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <Button
                variant="outline"
                onClick={async () => {
                  if (confirm("Clear all search typing phrases? Search bars will display standard placeholder with no typewriter animation.")) {
                    await setSearchTypewriterPhrases([], []);
                    toast.success("Cleared all search typing phrases!");
                  }
                }}
                className="font-bold text-xs gap-1.5 text-rose-400 border-rose-500/30 hover:bg-rose-500/10 hover:border-rose-500 shrink-0 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear All
              </Button>

              <Button
                variant="outline"
                onClick={async () => {
                  if (confirm("Reset all search typing phrases to defaults?")) {
                    await setSearchTypewriterPhrases(DEFAULT_DESKTOP_SEARCH_PHRASES, DEFAULT_MOBILE_SEARCH_PHRASES);
                    toast.success("Reset to default search phrases!");
                  }
                }}
                className="font-bold text-xs gap-2 border-slate-700 hover:border-amber-500/50 hover:bg-amber-500/10 shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset to Defaults
              </Button>
            </div>
          </div>

          {/* ⚡ TYPING SPEED & SENTENCE PACING CONTROLS */}
          <div className="bg-bg-card border border-border-default rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-default pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    <Gauge className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-text-primary flex items-center gap-2">
                      Typing Speed & Sentence Length Pacing
                    </h3>
                    <p className="text-xs text-text-secondary">
                      Fine-tune typing velocity and how long sentences remain visible before erasing across all search bars.
                    </p>
                  </div>
                </div>
              </div>

              {/* Status Indicator Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono font-bold text-amber-400 flex items-center gap-1.5 shadow-sm">
                  <Zap className="w-3.5 h-3.5" />
                  {typingSpeedVal}ms / char
                  <span className="text-[10px] text-slate-400 font-normal">
                    (~{Math.round(1000 / (typingSpeedVal || 60))} cps)
                  </span>
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono font-bold text-sky-400 flex items-center gap-1.5 shadow-sm">
                  <Clock className="w-3.5 h-3.5" />
                  {(pauseDurationVal / 1000).toFixed(1)}s screen hold
                </span>
                <span className={cn(
                  "px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm",
                  textColorVal === "light"
                    ? "bg-slate-900 border-slate-700 text-slate-300"
                    : "bg-slate-900 border-amber-500/40 text-amber-400"
                )}>
                  <Palette className="w-3.5 h-3.5" />
                  {textColorVal === "light" ? "Light Text Mode" : "Dark Text Mode"}
                </span>
              </div>
            </div>

            {/* Controls Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* 1. Character Typing Speed */}
              <div className="bg-bg-secondary/40 border border-border-default rounded-2xl p-5 space-y-4 flex flex-col justify-between">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-text-primary flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      Character Typing Speed
                    </label>
                    <span className="font-mono text-xs font-black text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-md border border-amber-500/20">
                      {typingSpeedVal} ms
                    </span>
                  </div>
                  <p className="text-[11px] text-text-secondary leading-relaxed">
                    Delay between characters. Lower values type faster; higher values feel more human and deliberate.
                  </p>
                  
                  {/* Slider */}
                  <div className="pt-2">
                    <input
                      type="range"
                      min={20}
                      max={150}
                      step={5}
                      value={typingSpeedVal}
                      onChange={(e) => setTypingSpeedVal(Number(e.target.value))}
                      onMouseUp={() => handleApplySpeed(typingSpeedVal, pauseDurationVal)}
                      onTouchEnd={() => handleApplySpeed(typingSpeedVal, pauseDurationVal)}
                      className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono pt-1.5">
                      <span>20ms (Fast)</span>
                      <span>60ms (Standard)</span>
                      <span>150ms (Slow)</span>
                    </div>
                  </div>
                </div>

                {/* Presets */}
                <div className="space-y-1.5 pt-3 border-t border-border-default/60">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                    Speed Presets:
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { label: "Ultra Fast", speed: 30 },
                      { label: "Brisk", speed: 45 },
                      { label: "Standard (60ms)", speed: 60 },
                      { label: "Relaxed", speed: 85 },
                      { label: "Slow", speed: 120 },
                    ].map((preset) => {
                      const isActive = typingSpeedVal === preset.speed;
                      return (
                        <button
                          key={preset.speed}
                          type="button"
                          onClick={() => handleApplySpeed(preset.speed, pauseDurationVal)}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border",
                            isActive
                              ? "bg-amber-500 text-slate-950 border-amber-400 font-black shadow-sm"
                              : "bg-bg-card text-text-secondary hover:text-text-primary border-border-default hover:border-slate-700"
                          )}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 2. Sentence Screen Hold Duration */}
              <div className="bg-bg-secondary/40 border border-border-default rounded-2xl p-5 space-y-4 flex flex-col justify-between">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-text-primary flex items-center gap-2">
                      <Clock className="w-4 h-4 text-sky-400" />
                      Screen Hold Duration
                    </label>
                    <span className="font-mono text-xs font-black text-sky-400 bg-sky-500/10 px-2.5 py-0.5 rounded-md border border-sky-500/20">
                      {(pauseDurationVal / 1000).toFixed(1)}s ({pauseDurationVal} ms)
                    </span>
                  </div>
                  <p className="text-[11px] text-text-secondary leading-relaxed">
                    How long each completed sentence stays visible on screen before backspacing to the next phrase.
                  </p>

                  {/* Slider */}
                  <div className="pt-2">
                    <input
                      type="range"
                      min={800}
                      max={5000}
                      step={100}
                      value={pauseDurationVal}
                      onChange={(e) => setPauseDurationVal(Number(e.target.value))}
                      onMouseUp={() => handleApplySpeed(typingSpeedVal, pauseDurationVal)}
                      onTouchEnd={() => handleApplySpeed(typingSpeedVal, pauseDurationVal)}
                      className="w-full accent-sky-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono pt-1.5">
                      <span>0.8s (Brief)</span>
                      <span>2.2s (Standard)</span>
                      <span>5.0s (Long)</span>
                    </div>
                  </div>
                </div>

                {/* Presets */}
                <div className="space-y-1.5 pt-3 border-t border-border-default/60">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                    Hold Duration Presets:
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { label: "Quick (1.2s)", pause: 1200 },
                      { label: "Brisk (1.8s)", pause: 1800 },
                      { label: "Standard (2.2s)", pause: 2200 },
                      { label: "Extended (3.2s)", pause: 3200 },
                      { label: "Long (4.5s)", pause: 4500 },
                    ].map((preset) => {
                      const isActive = pauseDurationVal === preset.pause;
                      return (
                        <button
                          key={preset.pause}
                          type="button"
                          onClick={() => handleApplySpeed(typingSpeedVal, preset.pause)}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border",
                            isActive
                              ? "bg-sky-500 text-slate-950 border-sky-400 font-black shadow-sm"
                              : "bg-bg-card text-text-secondary hover:text-text-primary border-border-default hover:border-slate-700"
                          )}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 3. Typing Text Color Tone (Light Text vs Dark Text) */}
              <div className="bg-bg-secondary/40 border border-border-default rounded-2xl p-5 space-y-4 flex flex-col justify-between">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-text-primary flex items-center gap-2">
                      <Palette className="w-4 h-4 text-emerald-400" />
                      Typing Text Color Tone
                    </label>
                    <span className={cn(
                      "font-mono text-xs font-black px-2.5 py-0.5 rounded-md border uppercase",
                      textColorVal === "light"
                        ? "text-slate-300 bg-slate-800 border-slate-700"
                        : "text-amber-400 bg-amber-500/10 border-amber-500/20"
                    )}>
                      {textColorVal === "light" ? "Light Text" : "Dark Text"}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-secondary leading-relaxed">
                    Admin decision: Choose whether typed sentences appear in bold dark text or subtle light gray placeholder style.
                  </p>

                  {/* Light vs Dark Toggle Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      type="button"
                      disabled={isSavingTextColor}
                      onClick={() => handleApplyTextColor("dark")}
                      className={cn(
                        "p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer text-center select-none",
                        textColorVal === "dark"
                          ? "bg-slate-900 border-amber-500 text-white ring-2 ring-amber-500/25 shadow-sm"
                          : "bg-bg-card border-border-default text-text-secondary hover:border-slate-700 hover:text-text-primary"
                      )}
                    >
                      <div className="w-4 h-4 rounded-full bg-slate-950 border border-slate-700 flex items-center justify-center">
                        <div className={cn("w-2 h-2 rounded-full", textColorVal === "dark" ? "bg-amber-400" : "bg-transparent")} />
                      </div>
                      <span className="text-xs font-black text-white">Dark Text</span>
                      <span className="text-[10px] text-slate-400 leading-tight">Bold & high contrast</span>
                    </button>

                    <button
                      type="button"
                      disabled={isSavingTextColor}
                      onClick={() => handleApplyTextColor("light")}
                      className={cn(
                        "p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer text-center select-none",
                        textColorVal === "light"
                          ? "bg-slate-900 border-amber-500 text-white ring-2 ring-amber-500/25 shadow-sm"
                          : "bg-bg-card border-border-default text-text-secondary hover:border-slate-700 hover:text-text-primary"
                      )}
                    >
                      <div className="w-4 h-4 rounded-full bg-slate-300 border border-slate-400 flex items-center justify-center">
                        <div className={cn("w-2 h-2 rounded-full", textColorVal === "light" ? "bg-amber-500" : "bg-transparent")} />
                      </div>
                      <span className="text-xs font-black text-slate-300">Light Text</span>
                      <span className="text-[10px] text-slate-400 leading-tight">Soft light placeholder</span>
                    </button>
                  </div>
                </div>

                {/* Footer status */}
                <div className="space-y-1.5 pt-3 border-t border-border-default/60">
                  <div className="flex items-center justify-between text-[11px] text-text-secondary">
                    <span>Active Decision:</span>
                    <strong className="text-text-primary capitalize">
                      {textColorVal === "light" ? "Light Text (Muted)" : "Dark Text (High Contrast)"}
                    </strong>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Controls character color inside the search bar on live site.
                  </div>
                </div>
              </div>

            </div>

            {/* Footer actions & live feedback */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border-default text-xs">
              <div className="flex items-center gap-2 text-text-secondary text-[11px]">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>The live Laptop and Mobile preview boxes below type at this exact velocity in real-time.</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleApplySpeed(60, 2200)}
                  className="text-xs font-bold gap-1.5 border-slate-700 hover:border-slate-600 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" /> Reset Speed (60ms / 2.2s)
                </Button>
                <Button
                  size="sm"
                  disabled={isSavingSpeed}
                  onClick={() => handleApplySpeed(typingSpeedVal, pauseDurationVal)}
                  className="text-xs font-black gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  {isSavingSpeed ? "Saving..." : "Save Speed & Pacing"}
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* 💻 LAPTOP & DESKTOP PHRASES MANAGER */}
            <div className="bg-bg-card border border-border-default rounded-3xl p-6 shadow-sm space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                {/* Section Header */}
                <div className="flex items-center justify-between border-b border-border-default pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
                      <Laptop className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-text-primary flex items-center gap-2">
                        Laptop & Desktop Phrases
                      </h3>
                      <p className="text-[11px] text-text-secondary">
                        Recommended max length: <strong className="text-blue-400">50 chars</strong> (fits comfortably on 13&quot;+ laptops)
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-black px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-full text-text-primary">
                    {desktopList.length} Active
                  </span>
                </div>

                {/* Add New Desktop Phrase Form */}
                <div className="space-y-2 bg-bg-secondary/40 border border-border-default p-4 rounded-2xl">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-text-secondary">Add New Desktop Phrase:</span>
                    <span className={cn(
                      "font-mono font-bold text-[11px] px-2 py-0.5 rounded-md",
                      newDesktopPhrase.length <= 40 ? "text-emerald-400 bg-emerald-500/10" :
                      newDesktopPhrase.length <= 50 ? "text-amber-400 bg-amber-500/10" :
                      "text-rose-400 bg-rose-500/10"
                    )}>
                      {newDesktopPhrase.length} / 50 chars {newDesktopPhrase.length > 50 ? "• (Too Long)" : newDesktopPhrase.length > 40 ? "• (Approaching limit)" : "• (Optimal)"}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. 2 & 3 BHK Luxury Flats in Poranki, Vijayawada"
                      value={newDesktopPhrase}
                      onChange={(e) => setNewDesktopPhrase(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newDesktopPhrase.trim()) {
                          addDesktopPhrase(newDesktopPhrase);
                          setNewDesktopPhrase("");
                        }
                      }}
                      className="bg-bg-card border-border-default text-xs font-semibold"
                    />
                    <Button
                      disabled={!newDesktopPhrase.trim()}
                      onClick={() => {
                        addDesktopPhrase(newDesktopPhrase);
                        setNewDesktopPhrase("");
                      }}
                      className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add
                    </Button>
                  </div>
                </div>

                {/* Desktop Phrases List */}
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {desktopList.map((phrase, idx) => (
                    <div
                      key={idx}
                      className="group flex items-center justify-between p-3 rounded-xl bg-bg-secondary/60 hover:bg-bg-secondary border border-border-default transition-all text-xs"
                    >
                      {editingDesktopIdx === idx ? (
                        <div className="flex-1 flex items-center gap-2 mr-2">
                          <Input
                            value={editingDesktopText}
                            onChange={(e) => setEditingDesktopText(e.target.value)}
                            className="h-8 text-xs bg-bg-card font-semibold"
                          />
                          <button
                            onClick={() => {
                              if (editingDesktopText.trim()) {
                                const next = [...desktopList];
                                next[idx] = editingDesktopText.trim();
                                setSearchTypewriterPhrases(next, mobileList);
                                setEditingDesktopIdx(null);
                                toast.success("Phrase updated!");
                              }
                            }}
                            className="p-1.5 rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </button>
                          <button
                            onClick={() => setEditingDesktopIdx(null)}
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                          <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-semibold text-text-primary truncate">
                            &ldquo;{phrase}&rdquo;
                          </span>
                          <span className={cn(
                            "text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0",
                            phrase.length <= 50 ? "text-slate-400 bg-slate-800" : "text-rose-400 bg-rose-500/10 font-bold"
                          )}>
                            {phrase.length} chars
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-1 shrink-0">
                        {editingDesktopIdx !== idx && (
                          <button
                            onClick={() => {
                              setEditingDesktopIdx(idx);
                              setEditingDesktopText(phrase);
                            }}
                            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-amber-400 cursor-pointer transition-colors"
                            title="Edit Phrase"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => removeDesktopPhrase(idx)}
                          className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 cursor-pointer transition-colors"
                          title="Delete Phrase"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Simulated Laptop Search Bar Preview */}
              <div className="space-y-2 pt-4 border-t border-border-default">
                <div className="flex items-center justify-between text-xs font-bold text-text-secondary">
                  <span className="flex items-center gap-1.5">
                    <Laptop className="w-3.5 h-3.5 text-blue-400" />
                    Live Laptop Preview (Simulation):
                  </span>
                  <span className="text-[11px] text-emerald-400 font-mono">Animated</span>
                </div>
                
                <div className="h-12 w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-4 flex items-center shadow-inner gap-2 text-xs">
                  <Search className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-slate-500 dark:text-slate-400 font-medium truncate flex items-center">
                    {desktopList.length === 0 ? (
                      <span className="italic text-slate-400">Search properties, projects, locations... (Standard placeholder, no typing)</span>
                    ) : (
                      <span className="flex items-center min-w-0 truncate text-slate-400">
                        <span className={cn("shrink-0", textColorVal === "light" ? "text-slate-400" : "text-slate-500")}>Search&nbsp;&ldquo;</span>
                        <span className={cn("font-semibold truncate", textColorVal === "light" ? "text-slate-400 font-medium" : "text-slate-900 dark:text-slate-100 font-bold")}>{previewDesktopText}</span>
                        <span className="inline-block w-[2px] h-[14px] bg-amber-500 ml-0.5 animate-pulse shrink-0 rounded-full" />
                        <span className={cn("shrink-0", textColorVal === "light" ? "text-slate-400" : "text-slate-500")}>&rdquo;</span>
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* 📱 MOBILE SCREEN PHRASES MANAGER */}
            <div className="bg-bg-card border border-border-default rounded-3xl p-6 shadow-sm space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                {/* Section Header */}
                <div className="flex items-center justify-between border-b border-border-default pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-text-primary flex items-center gap-2">
                        Mobile Screen Phrases
                      </h3>
                      <p className="text-[11px] text-text-secondary">
                        Recommended max length: <strong className="text-amber-400">28 chars</strong> (fits without wrapping on phone screens)
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-black px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-full text-text-primary">
                    {mobileList.length} Active
                  </span>
                </div>

                {/* Add New Mobile Phrase Form */}
                <div className="space-y-2 bg-bg-secondary/40 border border-border-default p-4 rounded-2xl">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-text-secondary">Add New Mobile Phrase:</span>
                    <span className={cn(
                      "font-mono font-bold text-[11px] px-2 py-0.5 rounded-md",
                      newMobilePhrase.length <= 20 ? "text-emerald-400 bg-emerald-500/10" :
                      newMobilePhrase.length <= 28 ? "text-amber-400 bg-amber-500/10" :
                      "text-rose-400 bg-rose-500/10"
                    )}>
                      {newMobilePhrase.length} / 28 chars {newMobilePhrase.length > 28 ? "• (May Clip on Phone)" : newMobilePhrase.length > 20 ? "• (Approaching limit)" : "• (Mobile-Safe)"}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. Flats in Poranki"
                      value={newMobilePhrase}
                      onChange={(e) => setNewMobilePhrase(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newMobilePhrase.trim()) {
                          addMobilePhrase(newMobilePhrase);
                          setNewMobilePhrase("");
                        }
                      }}
                      className="bg-bg-card border-border-default text-xs font-semibold"
                    />
                    <Button
                      disabled={!newMobilePhrase.trim()}
                      onClick={() => {
                        addMobilePhrase(newMobilePhrase);
                        setNewMobilePhrase("");
                      }}
                      className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add
                    </Button>
                  </div>
                </div>

                {/* Mobile Phrases List */}
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {mobileList.map((phrase, idx) => (
                    <div
                      key={idx}
                      className="group flex items-center justify-between p-3 rounded-xl bg-bg-secondary/60 hover:bg-bg-secondary border border-border-default transition-all text-xs"
                    >
                      {editingMobileIdx === idx ? (
                        <div className="flex-1 flex items-center gap-2 mr-2">
                          <Input
                            value={editingMobileText}
                            onChange={(e) => setEditingMobileText(e.target.value)}
                            className="h-8 text-xs bg-bg-card font-semibold"
                          />
                          <button
                            onClick={() => {
                              if (editingMobileText.trim()) {
                                const next = [...mobileList];
                                next[idx] = editingMobileText.trim();
                                setSearchTypewriterPhrases(desktopList, next);
                                setEditingMobileIdx(null);
                                toast.success("Mobile phrase updated!");
                              }
                            }}
                            className="p-1.5 rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </button>
                          <button
                            onClick={() => setEditingMobileIdx(null)}
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                          <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-semibold text-text-primary truncate">
                            &ldquo;{phrase}&rdquo;
                          </span>
                          <span className={cn(
                            "text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0",
                            phrase.length <= 28 ? "text-slate-400 bg-slate-800" : "text-rose-400 bg-rose-500/10 font-bold"
                          )}>
                            {phrase.length} chars
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-1 shrink-0">
                        {editingMobileIdx !== idx && (
                          <button
                            onClick={() => {
                              setEditingMobileIdx(idx);
                              setEditingMobileText(phrase);
                            }}
                            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-amber-400 cursor-pointer transition-colors"
                            title="Edit Phrase"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => removeMobilePhrase(idx)}
                          className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 cursor-pointer transition-colors"
                          title="Delete Phrase"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Simulated Mobile Search Bar Preview */}
              <div className="space-y-2 pt-4 border-t border-border-default">
                <div className="flex items-center justify-between text-xs font-bold text-text-secondary">
                  <span className="flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                    Live Mobile Preview (Simulation):
                  </span>
                  <span className="text-[11px] text-emerald-400 font-mono">Animated</span>
                </div>
                
                <div className="max-w-[280px] mx-auto h-10 w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-full px-3 flex items-center shadow-inner gap-2 text-xs">
                  <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-slate-500 dark:text-slate-400 font-medium truncate flex items-center text-[11px]">
                    {mobileList.length === 0 ? (
                      <span className="italic text-slate-400">Search properties... (No typing)</span>
                    ) : (
                      <span className="flex items-center min-w-0 truncate text-slate-400">
                        <span className={cn("shrink-0", textColorVal === "light" ? "text-slate-400" : "text-slate-500")}>Search&nbsp;&ldquo;</span>
                        <span className={cn("font-semibold truncate", textColorVal === "light" ? "text-slate-400 font-medium" : "text-slate-900 dark:text-slate-100 font-bold")}>{previewMobileText}</span>
                        <span className="inline-block w-[1.5px] h-[12px] bg-amber-500 ml-0.5 animate-pulse shrink-0 rounded-full" />
                        <span className={cn("shrink-0", textColorVal === "light" ? "text-slate-400" : "text-slate-500")}>&rdquo;</span>
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
