"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePropertiesStore } from "@/stores/properties-store";
import { useContentStore, TrendingLocation, HomeCategory, ApRegion } from "@/stores/content-store";
import { getPropertyRefId, findPropertyByRefId } from "@/lib/ref-id";
import { formatPriceCompact, formatINR } from "@/lib/utils";
import { toast } from "sonner";
import {
  Building2,
  Eye,
  Heart,
  Users,
  Search,
  Plus,
  Edit3,
  Trash2,
  Check,
  X,
  MapPin,
  Star,
  ThumbsUp,
  PowerOff,
  Flame,
  LayoutGrid,
  Globe2,
  Hash,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Layers,
  Compass,
  Zap,
} from "lucide-react";
import { AnalyticsCharts } from "@/components/admin/analytics-charts";
import { AiWriter } from "@/components/admin/ai-writer";

export default function AdminDashboardPage() {
  const router = useRouter();

  // Stores
  const {
    properties,
    toggleFeatured,
    toggleSoldOut,
    deleteProperty,
    toggleShowOnMap,
    toggleRecommended,
    updateRefId,
  } = usePropertiesStore();

  const {
    trendingLocations,
    homeCategories,
    apRegions,
    addLocation,
    updateLocation,
    deleteLocation,
    addCategory,
    updateCategory,
    deleteCategory,
    addApRegion,
    updateApRegion,
    deleteApRegion,
    addSubRegion,
    removeSubRegion,
  } = useContentStore();

  // Navigation Tab State
  const [activeTab, setActiveTab] = useState<"overview" | "properties" | "locations" | "categories" | "regions">("overview");

  // Reference ID Search Test State
  const [refSearchQuery, setRefSearchQuery] = useState("");

  // Edit Reference ID Modal / Inline State
  const [editingRefPropId, setEditingRefPropId] = useState<string | null>(null);
  const [tempRefId, setTempRefId] = useState("");

  // --- FORM STATES FOR MANAGERS ---

  // 1. Trending Location Form State
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [editLocId, setEditLocId] = useState<string | null>(null);
  const [locCity, setLocCity] = useState("Vijayawada");
  const [locLocality, setLocLocality] = useState("");
  const [locImage, setLocImage] = useState("");
  const [locCount, setLocCount] = useState(15);

  // 2. Home Category Form State
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editCatId, setEditCatId] = useState<string | null>(null);
  const [catName, setCatName] = useState("");
  const [catType, setCatType] = useState("apartment");
  const [catDesc, setCatDesc] = useState("");
  const [catIcon, setCatIcon] = useState("Building2");
  const [catImage, setCatImage] = useState("");
  const [catCount, setCatCount] = useState(25);

  // 3. AP Region Form State
  const [showRegionForm, setShowRegionForm] = useState(false);
  const [editRegId, setEditRegId] = useState<string | null>(null);
  const [regName, setRegName] = useState("");
  const [regTagline, setRegTagline] = useState("");
  const [regImage, setRegImage] = useState("");
  const [regCount, setRegCount] = useState(50);
  const [newSubRegionInput, setNewSubRegionInput] = useState<{ [regId: string]: string }>({});

  // Quick Stats
  const totalProperties = properties.length;
  const activeProperties = properties.filter((p) => p.status !== "sold").length;
  const soldProperties = properties.filter((p) => p.status === "sold").length;
  const featuredProperties = properties.filter((p) => p.isFeatured).length;
  const totalValue = properties
    .filter((p) => p.listingType === "sale" && p.status !== "sold")
    .reduce((acc, curr) => acc + curr.price, 0);

  // Live Reference ID Search Tester
  const liveRefMatch = useMemo(() => {
    if (!refSearchQuery.trim()) return null;
    return findPropertyByRefId(refSearchQuery, properties);
  }, [refSearchQuery, properties]);

  const handleExecuteRefSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (liveRefMatch) {
      toast.success(`🎯 Direct match for ${getPropertyRefId(liveRefMatch)}! Redirecting...`);
      router.push(`/properties/${liveRefMatch.id}`);
    } else {
      toast.error(`No property found matching Reference ID "${refSearchQuery}"`);
    }
  };

  const handleSaveRefId = async (propId: string) => {
    if (!tempRefId.trim()) return;
    await updateRefId(propId, tempRefId.trim().toUpperCase());
    toast.success(`Updated Reference ID to "${tempRefId.trim().toUpperCase()}"`);
    setEditingRefPropId(null);
    setTempRefId("");
  };

  // --- LOCATION FORM SUBMIT ---
  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locLocality.trim() || !locCity.trim()) {
      toast.error("City and Locality are required!");
      return;
    }
    const fallbackImg = locImage.trim() || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80";

    if (editLocId) {
      await updateLocation(editLocId, {
        city: locCity,
        locality: locLocality,
        image: fallbackImg,
        properties_count: Number(locCount),
      });
      setEditLocId(null);
    } else {
      await addLocation({
        city: locCity,
        locality: locLocality,
        image: fallbackImg,
        properties_count: Number(locCount),
      });
    }
    setShowLocationForm(false);
    setLocLocality("");
    setLocImage("");
  };

  // --- CATEGORY FORM SUBMIT ---
  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      toast.error("Category name is required!");
      return;
    }
    if (editCatId) {
      updateCategory(editCatId, {
        name: catName,
        type: catType,
        description: catDesc,
        icon: catIcon,
        image: catImage || "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&q=80",
        count: Number(catCount),
      });
      setEditCatId(null);
    } else {
      addCategory({
        name: catName,
        type: catType,
        description: catDesc,
        icon: catIcon,
        image: catImage || "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&q=80",
        count: Number(catCount),
        isFeatured: true,
      });
    }
    setShowCategoryForm(false);
    setCatName("");
    setCatDesc("");
    setCatImage("");
  };

  // --- REGION FORM SUBMIT ---
  const handleSaveRegion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim()) {
      toast.error("Region name is required!");
      return;
    }
    if (editRegId) {
      updateApRegion(editRegId, {
        name: regName,
        tagline: regTagline,
        image: regImage || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80",
        propertyCount: Number(regCount),
      });
      setEditRegId(null);
    } else {
      addApRegion({
        name: regName,
        tagline: regTagline,
        image: regImage || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80",
        subRegions: ["Benz Circle", "Poranki", "Kanuru"],
        propertyCount: Number(regCount),
      });
    }
    setShowRegionForm(false);
    setRegName("");
    setRegTagline("");
    setRegImage("");
  };

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto space-y-6">
      
      {/* MOBILE-FIRST HEADER & REFERENCE ID TEST DOCK */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 text-white rounded-3xl p-5 sm:p-6 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-amber-400" />
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-heading">
              Admin Control Center
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Full admin power to manage Properties, Reference IDs, Trending Locations, Categories & AP Sub-regions.
          </p>
        </div>

        {/* INSTANT REFERENCE ID QUICK LOOKUP BAR */}
        <form
          onSubmit={handleExecuteRefSearch}
          className="relative flex items-center bg-slate-950 border border-slate-700/80 rounded-2xl p-1.5 w-full md:w-80 shadow-md"
        >
          <Hash className="w-4 h-4 text-amber-400 ml-2 shrink-0" />
          <input
            type="text"
            value={refSearchQuery}
            onChange={(e) => setRefSearchQuery(e.target.value)}
            placeholder="Test Ref ID e.g. ref345, REF101..."
            className="w-full pl-2 pr-2 py-1.5 bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none"
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1 transition-all cursor-pointer shrink-0"
          >
            <span>Jump</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {/* Instant Match Dropdown */}
          {liveRefMatch && (
            <div
              onClick={() => {
                toast.success(`🎯 Direct match for ${getPropertyRefId(liveRefMatch)}! Redirecting...`);
                router.push(`/properties/${liveRefMatch.id}`);
              }}
              className="absolute left-0 right-0 top-full mt-2 z-[100] bg-amber-500 text-slate-950 p-3 rounded-2xl shadow-2xl flex items-center justify-between font-bold text-xs cursor-pointer border-2 border-slate-950 animate-in fade-in"
            >
              <div className="truncate pr-2">
                <span className="bg-slate-950 text-amber-400 px-1.5 py-0.5 rounded text-[10px] uppercase mr-1">
                  {getPropertyRefId(liveRefMatch)}
                </span>
                <span className="truncate">{liveRefMatch.title}</span>
              </div>
              <ChevronRight className="w-4 h-4 shrink-0" />
            </div>
          )}
        </form>
      </div>

      {/* QUICK STATS CARDS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Total Listings</span>
            <Building2 className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-heading">
            {totalProperties}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Active Homes</span>
            <Eye className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-heading">
            {activeProperties}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Featured Homes</span>
            <Star className="w-5 h-5 text-amber-500 fill-amber-500/20" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-heading">
            {featuredProperties}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Portfolio Value</span>
            <Sparkles className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-500 font-heading truncate">
            {formatPriceCompact(totalValue)}
          </div>
        </div>
      </div>

      {/* MOBILE-FRIENDLY ADMIN POWER TABS CAPSULE NAVIGATION */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 bg-slate-900/90 p-2 rounded-2xl border border-slate-800 shadow-md">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "overview"
              ? "bg-amber-500 text-slate-950 shadow-md"
              : "text-slate-300 hover:text-white hover:bg-slate-800"
          }`}
        >
          <Sparkles className="w-4 h-4" /> Overview & Charts
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("properties")}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "properties"
              ? "bg-amber-500 text-slate-950 shadow-md"
              : "text-slate-300 hover:text-white hover:bg-slate-800"
          }`}
        >
          <Building2 className="w-4 h-4" /> Properties & Ref IDs ({properties.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("locations")}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "locations"
              ? "bg-amber-500 text-slate-950 shadow-md"
              : "text-slate-300 hover:text-white hover:bg-slate-800"
          }`}
        >
          <Flame className="w-4 h-4" /> Trending Locations ({trendingLocations.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("categories")}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "categories"
              ? "bg-amber-500 text-slate-950 shadow-md"
              : "text-slate-300 hover:text-white hover:bg-slate-800"
          }`}
        >
          <LayoutGrid className="w-4 h-4" /> Home Categories ({homeCategories.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("regions")}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "regions"
              ? "bg-amber-500 text-slate-950 shadow-md"
              : "text-slate-300 hover:text-white hover:bg-slate-800"
          }`}
        >
          <Globe2 className="w-4 h-4" /> Explore AP & Sub-regions ({apRegions.length})
        </button>
      </div>

      {/* TAB CONTENT SECTIONS */}

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-8 animate-in fade-in duration-200">
          <AnalyticsCharts />
          <AiWriter />
        </div>
      )}

      {/* TAB 2: PROPERTIES & REFERENCE IDs MANAGER */}
      {activeTab === "properties" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div>
              <h2 className="text-xl font-bold font-heading text-slate-900 dark:text-white">
                Properties & Reference IDs
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Admin can edit Reference IDs (e.g., ref345, REF101) for instant search redirection and manage status.
              </p>
            </div>

            <Link
              href="/admin/properties/new"
              className="py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4 stroke-[3]" /> Add New Property
            </Link>
          </div>

          {/* Properties Mobile Cards & Desktop Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            
            {/* Mobile View: Cards */}
            <div className="block md:hidden divide-y divide-slate-200 dark:divide-slate-800">
              {properties.map((p) => {
                const refId = getPropertyRefId(p);
                const isEditingRef = editingRefPropId === p.id;

                return (
                  <div key={p.id} className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-xl bg-slate-800 overflow-hidden shrink-0">
                        <img src={p.images[0]?.url} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                            {p.title}
                          </h4>
                        </div>
                        <div className="text-xs text-amber-500 font-black mt-0.5">
                          {formatPriceCompact(p.price)}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          📍 {p.location.locality}, {p.location.city}
                        </div>
                      </div>
                    </div>

                    {/* Reference ID Manager Row */}
                    <div className="bg-slate-100 dark:bg-slate-800/80 p-2.5 rounded-xl flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <Hash className="w-3.5 h-3.5 text-amber-500" />
                        <span className="font-bold text-slate-600 dark:text-slate-300">Ref ID:</span>
                      </div>

                      {isEditingRef ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={tempRefId}
                            onChange={(e) => setTempRefId(e.target.value)}
                            placeholder="e.g. REF345"
                            className="w-24 px-2 py-1 bg-white dark:bg-slate-900 border border-amber-500 rounded text-xs font-black text-amber-500 uppercase"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveRefId(p.id)}
                            className="p-1 bg-amber-500 text-slate-950 rounded"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRefPropId(p.id);
                            setTempRefId(refId);
                          }}
                          className="px-2.5 py-1 bg-amber-500/15 border border-amber-500/40 text-amber-500 font-black rounded-lg text-xs flex items-center gap-1 hover:bg-amber-500 hover:text-slate-950 transition-all cursor-pointer"
                        >
                          <span>{refId}</span>
                          <Edit3 className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Admin Action Badges Bar */}
                    <div className="flex items-center justify-between pt-1 text-xs">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleFeatured(p.id)}
                          className={`p-1.5 rounded-lg border text-xs font-bold flex items-center gap-1 ${
                            p.isFeatured ? "bg-amber-500 text-slate-950 border-amber-500" : "bg-slate-800 text-slate-400 border-slate-700"
                          }`}
                        >
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <span>Featured</span>
                        </button>

                        <button
                          onClick={() => toggleShowOnMap(p.id)}
                          className={`p-1.5 rounded-lg border text-xs font-bold flex items-center gap-1 ${
                            p.showOnMap ? "bg-blue-600 text-white border-blue-600" : "bg-slate-800 text-slate-400 border-slate-700"
                          }`}
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          <span>On Map</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => toggleSoldOut(p.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold ${
                            p.status === "sold" ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"
                          }`}
                        >
                          {p.status === "sold" ? "Mark Active" : "Mark Sold"}
                        </button>
                        <button
                          onClick={() => deleteProperty(p.id)}
                          className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white uppercase text-[11px] font-black tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Property</th>
                    <th className="px-6 py-4">Ref ID</th>
                    <th className="px-6 py-4">Price</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Map</th>
                    <th className="px-6 py-4 text-center">Featured</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {properties.map((p) => {
                    const refId = getPropertyRefId(p);
                    const isEditingRef = editingRefPropId === p.id;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-slate-800 overflow-hidden shrink-0">
                              <img src={p.images[0]?.url} alt="" className="w-full h-full object-cover" />
                            </div>
                            <div className="truncate max-w-[220px]">
                              <div className="font-extrabold text-slate-900 dark:text-white truncate">
                                {p.title}
                              </div>
                              <div className="text-xs text-slate-400 truncate">
                                📍 {p.location.locality}, {p.location.city}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          {isEditingRef ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={tempRefId}
                                onChange={(e) => setTempRefId(e.target.value)}
                                placeholder="REF345"
                                className="w-24 px-2 py-1 bg-slate-900 border border-amber-500 text-amber-400 font-black text-xs rounded uppercase"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveRefId(p.id)}
                                className="p-1 bg-amber-500 text-slate-950 rounded cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingRefPropId(p.id);
                                setTempRefId(refId);
                              }}
                              className="px-2.5 py-1 bg-amber-500/15 border border-amber-500/40 text-amber-500 font-black rounded-lg text-xs inline-flex items-center gap-1.5 hover:bg-amber-500 hover:text-slate-950 transition-all cursor-pointer"
                            >
                              <span>{refId}</span>
                              <Edit3 className="w-3 h-3" />
                            </button>
                          )}
                        </td>

                        <td className="px-6 py-4 font-black text-slate-900 dark:text-white whitespace-nowrap">
                          {formatPriceCompact(p.price)}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => toggleSoldOut(p.id)}
                            className={`px-3 py-1 rounded-full text-xs font-extrabold transition-colors cursor-pointer ${
                              p.status === "sold" ? "bg-red-500/15 text-red-500" : "bg-emerald-500/15 text-emerald-500"
                            }`}
                          >
                            {p.status === "sold" ? "Sold Out" : "Active"}
                          </button>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => toggleShowOnMap(p.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1 border transition-colors cursor-pointer ${
                              p.showOnMap ? "bg-blue-600 text-white border-blue-600" : "bg-slate-800 text-slate-400 border-slate-700"
                            }`}
                          >
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{p.showOnMap ? "On Map" : "Hidden"}</span>
                          </button>
                        </td>

                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          <button
                            onClick={() => toggleFeatured(p.id)}
                            className={`p-2 rounded-xl transition-colors cursor-pointer ${
                              p.isFeatured ? "bg-amber-500 text-slate-950 shadow-md" : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            <Star className={`w-4 h-4 ${p.isFeatured ? "fill-slate-950" : ""}`} />
                          </button>
                        </td>

                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => deleteProperty(p.id)}
                            className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}

      {/* TAB 3: TRENDING LOCATIONS MANAGER */}
      {activeTab === "locations" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div>
              <h2 className="text-xl font-bold font-heading text-slate-900 dark:text-white">
                Trending Locations Manager
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Add, edit or update trending real estate hotspots shown on homepage.
              </p>
            </div>

            <button
              onClick={() => {
                setShowLocationForm(!showLocationForm);
                setEditLocId(null);
                setLocCity("Vijayawada");
                setLocLocality("");
                setLocImage("");
              }}
              className="py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" /> Add Location
            </button>
          </div>

          {/* Location Form Modal/Drawer */}
          {showLocationForm && (
            <form onSubmit={handleSaveLocation} className="bg-slate-900 text-white p-5 rounded-3xl border border-slate-800 space-y-4 shadow-xl">
              <h3 className="font-extrabold text-sm text-amber-400 uppercase tracking-wider">
                {editLocId ? "Edit Trending Location" : "Create Trending Location"}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">City:</label>
                  <input
                    type="text"
                    value={locCity}
                    onChange={(e) => setLocCity(e.target.value)}
                    placeholder="e.g. Vijayawada, Guntur, Vizag"
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Locality Name:</label>
                  <input
                    type="text"
                    value={locLocality}
                    onChange={(e) => setLocLocality(e.target.value)}
                    placeholder="e.g. Benz Circle, Poranki, Brodipet"
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Image URL:</label>
                  <input
                    type="text"
                    value={locImage}
                    onChange={(e) => setLocImage(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Total Properties Count:</label>
                  <input
                    type="number"
                    value={locCount}
                    onChange={(e) => setLocCount(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  className="py-2.5 px-5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md cursor-pointer"
                >
                  Save Location
                </button>
                <button
                  type="button"
                  onClick={() => setShowLocationForm(false)}
                  className="py-2.5 px-4 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Locations Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {trendingLocations.map((loc) => (
              <div key={loc.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between">
                <div className="relative h-36 w-full bg-slate-800">
                  <img src={loc.image} alt={loc.locality} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent flex items-end p-3">
                    <div>
                      <h4 className="text-white font-extrabold text-base">{loc.locality}</h4>
                      <p className="text-slate-300 text-xs">{loc.city}</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-xs font-extrabold text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                    {loc.properties_count} Properties
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditLocId(loc.id!);
                        setLocCity(loc.city);
                        setLocLocality(loc.locality);
                        setLocImage(loc.image);
                        setLocCount(loc.properties_count);
                        setShowLocationForm(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteLocation(loc.id!)}
                      className="p-1.5 text-red-400 hover:text-red-300 bg-slate-800 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: BROWSE HOME CATEGORIES MANAGER */}
      {activeTab === "categories" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div>
              <h2 className="text-xl font-bold font-heading text-slate-900 dark:text-white">
                Home Categories Manager
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Add, edit, or remove home categories (Apartments, Villas, Plots, Commercial, Farmhouses).
              </p>
            </div>

            <button
              onClick={() => {
                setShowCategoryForm(!showCategoryForm);
                setEditCatId(null);
                setCatName("");
                setCatDesc("");
              }}
              className="py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" /> Add Category
            </button>
          </div>

          {/* Category Form */}
          {showCategoryForm && (
            <form onSubmit={handleSaveCategory} className="bg-slate-900 text-white p-5 rounded-3xl border border-slate-800 space-y-4 shadow-xl">
              <h3 className="font-extrabold text-sm text-amber-400 uppercase tracking-wider">
                {editCatId ? "Edit Category" : "Create New Home Category"}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Category Title:</label>
                  <input
                    type="text"
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    placeholder="e.g. Gated Apartments, Open Plots"
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Property Type Slug:</label>
                  <select
                    value={catType}
                    onChange={(e) => setCatType(e.target.value)}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="apartment">apartment</option>
                    <option value="villa">villa</option>
                    <option value="residential-land">residential-land</option>
                    <option value="shops">shops</option>
                    <option value="farmhouse">farmhouse</option>
                    <option value="commercial-spaces">commercial-spaces</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-bold mb-1">Short Description:</label>
                  <input
                    type="text"
                    value={catDesc}
                    onChange={(e) => setCatDesc(e.target.value)}
                    placeholder="e.g. Luxury multi-storey flats with amenities"
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Image URL:</label>
                  <input
                    type="text"
                    value={catImage}
                    onChange={(e) => setCatImage(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Initial Property Count:</label>
                  <input
                    type="number"
                    value={catCount}
                    onChange={(e) => setCatCount(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  className="py-2.5 px-5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md cursor-pointer"
                >
                  Save Category
                </button>
                <button
                  type="button"
                  onClick={() => setShowCategoryForm(false)}
                  className="py-2.5 px-4 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Categories Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {homeCategories.map((cat) => (
              <div key={cat.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 font-bold">
                      <LayoutGrid className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 dark:text-white text-base">
                        {cat.name}
                      </h4>
                      <span className="text-[11px] font-extrabold uppercase text-amber-500 tracking-wider">
                        {cat.type}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditCatId(cat.id);
                        setCatName(cat.name);
                        setCatType(cat.type);
                        setCatDesc(cat.description);
                        setCatImage(cat.image || "");
                        setCatCount(cat.count);
                        setShowCategoryForm(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteCategory(cat.id)}
                      className="p-1.5 text-red-400 hover:text-red-300 bg-slate-800 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {cat.description}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-extrabold">
                  <span className="text-slate-400">Total Active Homes:</span>
                  <span className="bg-slate-900 text-amber-400 px-2.5 py-0.5 rounded-full">
                    {cat.count} listings
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: EXPLORE AP & SUB-REGIONS MANAGER */}
      {activeTab === "regions" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div>
              <h2 className="text-xl font-bold font-heading text-slate-900 dark:text-white">
                Explore AP Regions & Sub-localities Manager
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Full power to edit AP Regions and add/remove sub-localities (e.g. Benz Circle, Poranki, Kanuru, Brodipet, MVP Colony).
              </p>
            </div>

            <button
              onClick={() => {
                setShowRegionForm(!showRegionForm);
                setEditRegId(null);
                setRegName("");
                setRegTagline("");
              }}
              className="py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" /> Add AP Region
            </button>
          </div>

          {/* Region Form */}
          {showRegionForm && (
            <form onSubmit={handleSaveRegion} className="bg-slate-900 text-white p-5 rounded-3xl border border-slate-800 space-y-4 shadow-xl">
              <h3 className="font-extrabold text-sm text-amber-400 uppercase tracking-wider">
                {editRegId ? "Edit AP Region" : "Create New AP Region"}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Region Name:</label>
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. Vijayawada Central, Visakhapatnam"
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Tagline:</label>
                  <input
                    type="text"
                    value={regTagline}
                    onChange={(e) => setRegTagline(e.target.value)}
                    placeholder="e.g. Commercial & Growth Hub of AP"
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Cover Image URL:</label>
                  <input
                    type="text"
                    value={regImage}
                    onChange={(e) => setRegImage(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Property Count:</label>
                  <input
                    type="number"
                    value={regCount}
                    onChange={(e) => setRegCount(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  className="py-2.5 px-5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md cursor-pointer"
                >
                  Save AP Region
                </button>
                <button
                  type="button"
                  onClick={() => setShowRegionForm(false)}
                  className="py-2.5 px-4 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* AP Regions List */}
          <div className="space-y-4">
            {apRegions.map((reg) => (
              <div key={reg.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-800 overflow-hidden shrink-0">
                      <img src={reg.image} alt={reg.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h4 className="font-black text-lg text-slate-900 dark:text-white">
                        📍 {reg.name}
                      </h4>
                      <p className="text-xs text-amber-500 font-bold">{reg.tagline}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold bg-slate-800 text-slate-200 px-3 py-1 rounded-full">
                      {reg.propertyCount} Properties
                    </span>

                    <button
                      onClick={() => {
                        setEditRegId(reg.id);
                        setRegName(reg.name);
                        setRegTagline(reg.tagline);
                        setRegImage(reg.image);
                        setRegCount(reg.propertyCount);
                        setShowRegionForm(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteApRegion(reg.id)}
                      className="p-1.5 text-red-400 hover:text-red-300 bg-slate-800 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Sub-Regions Chips & Manager */}
                <div className="space-y-2">
                  <label className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-amber-500" /> Sub-localities in {reg.name}:
                  </label>

                  <div className="flex flex-wrap items-center gap-2">
                    {reg.subRegions.map((sr) => (
                      <span
                        key={sr}
                        className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-extrabold text-xs flex items-center gap-1.5 border border-slate-200 dark:border-slate-700"
                      >
                        <span>📍 {sr}</span>
                        <button
                          type="button"
                          onClick={() => removeSubRegion(reg.id, sr)}
                          className="hover:text-red-400 text-slate-400 p-0.5 rounded-full"
                          title="Remove sub-locality"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* Add Sub-Region Input Box */}
                  <div className="flex items-center gap-2 pt-2 max-w-md">
                    <input
                      type="text"
                      value={newSubRegionInput[reg.id] || ""}
                      onChange={(e) => setNewSubRegionInput({ ...newSubRegionInput, [reg.id]: e.target.value })}
                      placeholder="Add sub-locality e.g. Kanuru..."
                      className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = newSubRegionInput[reg.id];
                        if (val) {
                          addSubRegion(reg.id, val);
                          setNewSubRegionInput({ ...newSubRegionInput, [reg.id]: "" });
                        }
                      }}
                      className="py-2 px-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" /> Add Sub
                    </button>
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
