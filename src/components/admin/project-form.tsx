"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useProjectsStore } from "@/stores/projects-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft, Building2, Home, Landmark,
  Check, X, Upload, Link as LinkIcon,
  Image as ImageIcon, FileText, MapPin, Save,
  CheckCircle2, Loader2, Map, Info, Video, CheckSquare, Square,
  Settings, AlertCircle, ChevronDown, Sparkles
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type {
  Project, ProjectType, ProjectConfig,
  ProjectPhase, ProjectImage, ConstructionStatus,
  ConstructionUpdate
} from "@/types/project";
import { uploadToS3 } from "@/lib/aws/storage-utils";
import { VideoMediaManager } from "@/components/admin/video-media-manager";

// ─── Lazy map import (SSR unsafe) ────────────────────────────────────────────
const CoordinatePickerMap = dynamic(
  () => import("@/components/admin/coordinate-picker-map"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[300px] flex items-center justify-center bg-bg-primary rounded-xl border border-border-default animate-pulse">
        <Map className="w-6 h-6 text-text-tertiary animate-pulse" />
      </div>
    ),
  }
);

// ─── Constants ────────────────────────────────────────────────────────────────
const FACILITIES_LIST = [
  "Swimming Pool", "Clubhouse", "Gymnasium", "24/7 Security", "CCTV Surveillance",
  "Power Backup", "Intercom", "Lift", "Landscaped Gardens", "Jogging Track",
  "Children's Play Area", "Badminton Court", "Basketball Court", "Indoor Games",
  "Library", "Party Hall", "Amphitheatre", "Yoga / Meditation Area",
  "Solar Panels", "Rainwater Harvesting", "EV Charging Points",
  "Visitor Parking", "Covered Parking", "Senior Citizen Area",
  "Concierge Services", "Café / Restaurant", "ATM", "Supermarket",
];

const STATUSES: { value: ConstructionStatus; label: string; desc: string }[] = [
  { value: "new-launch",         label: "New Launch",         desc: "Freshly announced" },
  { value: "under-construction", label: "Under Construction", desc: "Actively being built" },
  { value: "ready-to-move",      label: "Ready to Move",      desc: "Fully completed" },
];

const BHK_OPTIONS: Record<ProjectType, string[]> = {
  apartment: ["1 BHK", "2 BHK", "3 BHK", "4 BHK", "4+ BHK", "Penthouse", "Duplex", "Studio"],
  villa:     ["2 BHK Villa", "3 BHK Villa", "4 BHK Villa", "5 BHK Villa", "Duplex Villa", "Row House"],
  venture:   ["Residential Plot", "Commercial Plot", "Corner Plot", "Park-Facing Plot"],
};

function emptyPhase(): ProjectPhase {
  return { id: `ph-${Date.now()}`, name: "Phase 1", status: "under-construction" };
}

const formatCurrency = (value: number) => {
  if (!value) return "₹0";
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`;
  return `₹${value.toLocaleString("en-IN")}`;
};

// ─── Upload helper ─────────────────────────────────────────────────────────────
async function uploadFile(file: File, bucket: string, folder: string): Promise<string> {
  const targetFolder = bucket === 'brochures' || folder === 'brochures' ? 'brochures' : 'projects';
  const s3Res = await uploadToS3({
    file,
    folder: targetFolder,
    compress: targetFolder !== 'brochures',
  });

  if (s3Res.success && s3Res.fileUrl) {
    return s3Res.fileUrl;
  }

  const err = s3Res.error || "Failed to upload file to cloud storage";
  console.error("[S3 Storage Error]:", err);
  toast.error(err);
  throw new Error(err);
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-text-secondary">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-text-tertiary">{hint}</p>}
    </div>
  );
}

const ic = (extra = "") =>
  `w-full h-12 px-4 rounded-xl border border-border-default/80 bg-bg-primary text-text-primary text-sm placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition ${extra}`;

// ─── Main Form ────────────────────────────────────────────────────────────────
interface ProjectFormProps {
  initialData?: Project;
  mode: "new" | "edit";
}

export function ProjectForm({ initialData, mode }: ProjectFormProps) {
  const router = useRouter();
  const { addProject, updateProject } = useProjectsStore();

  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [showMap, setShowMap] = useState(false);
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Field change handlers clearing errors
  const handleNameChange = (val: string) => {
    setName(val);
    if (errors.name) setErrors(prev => ({ ...prev, name: "" }));
  };
  const handleBuilderNameChange = (val: string) => {
    setBuilderName(val);
    if (errors.builderName) setErrors(prev => ({ ...prev, builderName: "" }));
  };
  const handleLocalityChange = (val: string) => {
    setLocality(val);
    if (errors.locality) setErrors(prev => ({ ...prev, locality: "" }));
  };

  // ── Step 1 ──
  const [projectType, setProjectType]         = useState<ProjectType>(initialData?.projectType ?? "apartment");
  const [name, setName]                       = useState(initialData?.name ?? "");
  const [tagline, setTagline]                 = useState(initialData?.tagline ?? "");
  const [description, setDescription]         = useState(initialData?.description ?? "");
  const [builderName, setBuilderName]         = useState(initialData?.builderName ?? "");
  const [builderLogoUrl, setBuilderLogoUrl]   = useState(initialData?.builderLogoUrl ?? "");
  const [builderPhone, setBuilderPhone]       = useState(initialData?.builderPhone ?? "");
  const [builderWhatsapp, setBuilderWhatsapp] = useState(initialData?.builderWhatsapp ?? "");
  const [reraId, setReraId]                   = useState(initialData?.reraId ?? "");
  const [reraApproved, setReraApproved]       = useState(initialData?.reraApproved ?? false);
  const [crdaApproved, setCrdaApproved]       = useState(initialData?.crdaApproved ?? false);
  const [noBrokerage, setNoBrokerage]         = useState(initialData?.noBrokerage ?? false);
  const [constructionStatus, setConstructionStatus] = useState<ConstructionStatus>(initialData?.constructionStatus ?? "under-construction");
  const [totalUnits, setTotalUnits]           = useState(initialData?.totalUnits?.toString() ?? "");
  const [totalTowers, setTotalTowers]         = useState(initialData?.totalTowers?.toString() ?? "");
  const [totalArea, setTotalArea]             = useState(initialData?.totalArea ?? "");
  
  // Location
  const [address, setAddress]   = useState(initialData?.location.address ?? "");
  const [locality, setLocality] = useState(initialData?.location.locality ?? "");
  const [city, setCity]         = useState(initialData?.location.city ?? "Vijayawada");
  const [locState, setLocState] = useState(initialData?.location.state ?? "Andhra Pradesh");
  const [pincode, setPincode]   = useState(initialData?.location.pincode ?? "");
  const [lat, setLat]           = useState(initialData?.location.latitude ?? 16.5062);
  const [lng, setLng]           = useState(initialData?.location.longitude ?? 80.6480);

  // ── Step 2 ──
  const [configs, setConfigs] = useState<ProjectConfig[]>(initialData?.configurations ?? []);
  
  // Derived options for Configurations
  const configOptions = Array.from(new Set([
    ...BHK_OPTIONS[projectType],
    ...configs.map(c => c.label)
  ]));

  // ── Step 3 ──
  const [images, setImages]         = useState<ProjectImage[]>(initialData?.images ?? []);
  const [coverImage, setCoverImage] = useState(initialData?.coverImage ?? "");
  const [videoUrl, setVideoUrl]     = useState(initialData?.videoUrl ?? "");
  const [videoThumbnail, setVideoThumbnail] = useState(initialData?.videoThumbnail ?? "");
  const [brochureUrl, setBrochureUrl] = useState(initialData?.brochureUrl ?? "");
  const [highlights, setHighlights] = useState<string[]>(initialData?.highlights?.length ? initialData.highlights : [""]);
  const [facilities, setFacilities] = useState<string[]>(initialData?.facilities ?? []);
  const [isFeatured, setIsFeatured] = useState<boolean>(initialData?.isFeatured ?? false);
  const [constructionUpdates, setConstructionUpdates] = useState<ConstructionUpdate[]>(initialData?.constructionUpdates ?? []);

  // ─── Upload handlers ─────────────────────────────────────────────────────────
  const setUpl = (key: string, val: boolean) =>
    setUploading((p) => ({ ...p, [key]: val }));

  const handleLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUpl("logo", true);
    const url = await uploadFile(file, "projects", "logos");
    setBuilderLogoUrl(url);
    setUpl("logo", false);
    toast.success("Logo uploaded!");
  };

  const handleBrochureFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUpl("brochure", true);
    const url = await uploadFile(file, "projects", "brochures");
    setBrochureUrl(url);
    setUpl("brochure", false);
    toast.success("Brochure uploaded!");
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUpl("cover", true);
    const url = await uploadFile(file, "projects", "cover");
    setCoverImage(url);
    if (images.length === 0) {
      setImages([{ id: `img-${Date.now()}`, url, alt: "Cover", category: "exterior", isPrimary: true }]);
    }
    setUpl("cover", false);
    toast.success("Cover image uploaded!");
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUpl("gallery", true);
    
    const newImages: ProjectImage[] = [];
    for (let i = 0; i < files.length; i++) {
      const url = await uploadFile(files[i], "projects", "gallery");
      newImages.push({ id: `img-${Date.now()}-${i}`, url, alt: `Gallery ${i}`, category: "exterior" });
    }
    
    setImages(prev => [...prev, ...newImages]);
    setUpl("gallery", false);
    toast.success(`${files.length} images added to gallery!`);
  };

  // ─── Map position change ──────────────────────────────────────────────────
  const handleMapPos = (newLat: number, newLng: number, details?: any) => {
    setLat(newLat);
    setLng(newLng);
    if (details) {
      if (details.city && !city)     setCity(details.city);
      if (details.state && !locState) setLocState(details.state);
      if (details.pincode && !pincode) setPincode(details.pincode);
      if (details.address && !address) setAddress(details.address);
    }
  };

  const toggleFacility = (f: string) =>
    setFacilities((p) => (p.includes(f) ? p.filter((x) => x !== f) : [...p, f]));

  // ─── Config helpers ────────────────────────────────────────────────────────
  const toggleConfig = (label: string) => {
    if (errors.configs) setErrors(prev => ({ ...prev, configs: "" }));
    setConfigs(prev => {
      if (prev.some(c => c.label === label)) {
        return prev.filter(c => c.label !== label);
      }
      return [...prev, {
        id: `cfg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        label, priceMin: 0, priceMax: 0,
      }];
    });
  };

  const addConfigVariant = (label: string) => {
    if (errors.configs) setErrors(prev => ({ ...prev, configs: "" }));
    setConfigs(prev => [...prev, {
      id: `cfg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      label, priceMin: 0, priceMax: 0,
    }]);
  };

  const removeConfigVariant = (id: string) => {
    setConfigs(prev => prev.filter(c => c.id !== id));
  };

  const updateConfigField = (id: string, field: keyof ProjectConfig, value: any) => {
    setConfigs(prev => prev.map(c => {
      if (c.id !== id) return c;
      return { ...c, [field]: value };
    }));
  };

  const handleConfigImageUpload = async (id: string, file: File) => {
    setUpl(`config-${id}`, true);
    const url = await uploadFile(file, "projects", "floor-plans");
    updateConfigField(id, "floorPlanUrl", url);
    setUpl(`config-${id}`, false);
    toast.success("Floor plan uploaded!");
  };

  const updateConfigCalculated = (id: string, field: "size" | "pricePerUnit", value: number) => {
    setConfigs(prev => prev.map(c => {
      if (c.id !== id) return c;
      const newConfig = { ...c };
      
      if (field === "pricePerUnit") newConfig.pricePerUnit = value;
      else if (projectType === "venture") {
        if (field === "size") {
          newConfig.plotSizeMin = value;
          newConfig.plotSizeMax = value;
        }
      } else if (projectType === "villa") {
        if (field === "size") {
          newConfig.builtUpAreaMin = value;
          newConfig.builtUpAreaMax = value;
        }
      } else {
        if (field === "size") {
          newConfig.superBuiltUpAreaMin = value;
          newConfig.superBuiltUpAreaMax = value;
        }
      }
      
      const ppu = newConfig.pricePerUnit || 0;
      let size = 0;
      if (projectType === "venture") {
        size = newConfig.plotSizeMin || 0;
      } else if (projectType === "villa") {
        size = newConfig.builtUpAreaMin || 0;
      } else {
        size = newConfig.superBuiltUpAreaMin || 0;
      }
      
      newConfig.priceMin = size * ppu;
      newConfig.priceMax = size * ppu;
      
      return newConfig;
    }));
  };

  // ─── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent, publish: boolean) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Project Name is required";
    if (!builderName.trim()) newErrors.builderName = "Builder Name is required";
    if (!locality.trim()) newErrors.locality = "Locality / Landmark is required";
    if (configs.length === 0) newErrors.configs = "At least one configuration type is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);

      const missingLabels: string[] = [];
      if (newErrors.name) missingLabels.push("Project Name");
      if (newErrors.builderName) missingLabels.push("Builder Name");
      if (newErrors.locality) missingLabels.push("Locality");
      if (newErrors.configs) missingLabels.push("Configuration Types");

      toast.error(`⚠️ Unfilled required fields: ${missingLabels.join(", ")}`);

      // Scroll to the first missing field element
      const firstErrorKey = Object.keys(newErrors)[0];
      const el = document.getElementById(`field-${firstErrorKey}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        const input = el.querySelector("input, select, button") as HTMLElement;
        if (input) input.focus();
      }
      return;
    }

    setErrors({});

    setSubmitting(true);
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const project: Project = {
      id: initialData?.id ?? `proj-${Date.now()}`,
      slug: initialData?.slug ?? slug,
      name: name.trim(),
      tagline: tagline.trim() || undefined,
      description: description.trim() || undefined,
      projectType,
      builderName: builderName.trim(),
      builderLogoUrl: builderLogoUrl.trim() || undefined,
      builderPhone: builderPhone.trim() || undefined,
      builderWhatsapp: builderWhatsapp.trim() || undefined,
      location: { address: address.trim(), locality: locality.trim(), city: city.trim(), state: locState.trim(), pincode: pincode.trim() || undefined, latitude: lat, longitude: lng },
      reraId: reraId.trim() || undefined,
      reraApproved, crdaApproved, noBrokerage,
      constructionStatus,
      totalUnits: totalUnits ? parseInt(totalUnits) : undefined,
      totalTowers: totalTowers ? parseInt(totalTowers) : undefined,
      totalArea: totalArea.trim() || undefined,
      phases: initialData?.phases?.length ? initialData.phases : [emptyPhase()],
      constructionUpdates,
      configurations: configs,
      images,
      coverImage: coverImage || images[0]?.url,
      videoUrl: videoUrl.trim() || undefined,
      videoThumbnail: videoThumbnail.trim() || undefined,
      brochureUrl: brochureUrl.trim() || undefined,
      highlights: highlights.filter(Boolean),
      facilities,
      isFeatured,
      isPublished: publish,
      viewCount: initialData?.viewCount ?? 0,
      createdAt: initialData?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      if (mode === "new") {
        await addProject(project);
        toast.success(publish ? "🎉 Project published!" : "Project saved as draft.");
      } else {
        await updateProject(project.id, project);
        toast.success("Project updated!");
      }
      setTimeout(() => router.push("/admin/projects"), 1000);
    } catch {
      toast.error("Something went wrong.");
      setSubmitting(false);
    }
  };

  // ─── Type badge helper ─────────────────────────────────────────────────────
  const typeInfo = {
    apartment: { icon: Building2, desc: "Multi-storey flats with BHK configs", color: "border-amber-500 bg-amber-500/5 text-amber-600" },
    villa:     { icon: Home,      desc: "Independent villas / row houses",       color: "border-amber-500 bg-amber-500/5 text-amber-600" },
    venture:   { icon: Landmark,  desc: "Gated layout plots – residential/commercial", color: "border-amber-500 bg-amber-500/5 text-amber-600" },
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-bg-primary pt-20 sm:pt-24 pb-44 sm:pb-32">
      <div className="max-w-5xl mx-auto px-4 md:px-6">
        
        {/* Header (Sticky Action Bar equivalent) */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4 pb-4 border-b border-border-default/60">
          <div>
            <Link href="/admin/projects" className="inline-flex items-center text-text-tertiary hover:text-text-primary transition-colors mb-2 text-sm font-medium">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Projects
            </Link>
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-text-primary">
              {mode === "new" ? "Add New Project" : `Edit: ${name || "Project"}`}
            </h1>
            <p className="text-text-secondary text-xs sm:text-sm mt-1">
              {mode === "new" ? "Create a new builder project" : "Update project details"}
            </p>
          </div>
        </div>

        <form className="space-y-8">
          
          {/* Top Error Alert Banner */}
          {Object.keys(errors).length > 0 && (
            <div className="p-4 rounded-2xl bg-red-500/10 border-2 border-red-500 text-red-600 dark:text-red-400 font-bold text-sm flex items-center justify-between shadow-md animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
                <span>Please fill in the required highlighted fields: <strong className="underline">{Object.values(errors).join(", ")}</strong></span>
              </div>
            </div>
          )}

          {/* SECTION 1: Basic Information */}
          <div className="bg-bg-card border border-border-default rounded-3xl p-6 shadow-sm">
            <h2 className="text-xl font-heading font-semibold text-text-primary mb-6 flex items-center">
              <Info className="w-5 h-5 mr-2 text-amber-primary" /> Basic Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Project Type Dropdown Menu */}
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-bold text-amber-500 uppercase tracking-wider block">
                  Project Type *
                </label>
                <div className="relative">
                  <select
                    value={projectType}
                    onChange={(e) => {
                      const newType = e.target.value as ProjectType;
                      setProjectType(newType);
                      setConfigs([]);
                    }}
                    className="w-full h-12 rounded-xl bg-bg-primary border border-border-default/80 px-4 pr-10 text-text-primary font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all cursor-pointer shadow-xs appearance-none"
                  >
                    <option value="apartment">Apartments (Multi-storey flats with BHK configs)</option>
                    <option value="villa">Villas (Independent luxury villas / row houses)</option>
                    <option value="venture">Plots / Venture (Gated layout plots & lands)</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-text-secondary absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Basic Fields */}
              <div id="field-name" className="space-y-2">
                <label className="text-sm font-medium text-text-secondary flex items-center justify-between">
                  <span>Project Name <span className="text-red-500 font-bold">*</span></span>
                  {errors.name && <span className="text-xs text-red-500 font-bold">Required</span>}
                </label>
                <Input
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Lansum Evana"
                  className={cn(
                    ic(),
                    errors.name && "border-2 border-red-500 ring-2 ring-red-500/30 bg-red-50 dark:bg-red-950/20"
                  )}
                />
                {errors.name && (
                  <p className="text-xs font-bold text-red-500 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {errors.name}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">Tagline</label>
                <Input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="e.g. Life elevated" className={ic()} />
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium text-text-secondary">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Brief overview of the project…" className={ic("resize-none")} />
              </div>

              {/* Builder Info - Styled 1:1 like Property Dynamic Specific Fields card */}
              <div className="md:col-span-2 p-5 rounded-2xl bg-slate-900/90 border-2 border-amber-500/30 space-y-4 mt-2">
                <div className="flex items-center gap-2 text-amber-400 font-black text-xs uppercase tracking-wider border-b border-slate-800 pb-3">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>BUILDER &amp; DEVELOPER DETAILS</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div id="field-builderName" className="space-y-1">
                    <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                      <span>Builder / Developer Name <span className="text-red-400">*</span></span>
                      {errors.builderName && <span className="text-[10px] text-red-400 font-bold">Required</span>}
                    </label>
                    <Input
                      value={builderName}
                      onChange={(e) => handleBuilderNameChange(e.target.value)}
                      placeholder="e.g. Lansum Properties LLP"
                      className={cn(
                        "w-full h-11 rounded-xl bg-slate-950 border border-slate-800 px-3 text-xs text-white placeholder:text-slate-500 focus:border-amber-500 focus:outline-none",
                        errors.builderName && "border-2 border-red-500 ring-2 ring-red-500/30 bg-red-950/20"
                      )}
                    />
                    {errors.builderName && (
                      <p className="text-xs font-bold text-red-400 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.builderName}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Builder Phone</label>
                    <Input
                      value={builderPhone}
                      onChange={(e) => setBuilderPhone(e.target.value)}
                      placeholder="+91 XXXXX XXXXX"
                      className="w-full h-11 rounded-xl bg-slate-950 border border-slate-800 px-3 text-xs text-white placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Builder WhatsApp</label>
                    <Input
                      value={builderWhatsapp}
                      onChange={(e) => setBuilderWhatsapp(e.target.value)}
                      placeholder="+91 XXXXX XXXXX"
                      className="w-full h-11 rounded-xl bg-slate-950 border border-slate-800 px-3 text-xs text-white placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Builder Logo</label>
                    <div className="flex items-center gap-3">
                      {builderLogoUrl && (
                        <img src={builderLogoUrl} alt="Logo" className="w-10 h-10 rounded-lg object-contain bg-slate-950 border border-slate-800 p-1" />
                      )}
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoFile}
                        className="h-11 bg-slate-950 border-slate-800 text-xs text-slate-300 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-slate-950 hover:file:bg-amber-400 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Project Stats & Status */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">Construction Status</label>
                <select value={constructionStatus} onChange={(e) => setConstructionStatus(e.target.value as ConstructionStatus)} className={ic()}>
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">RERA ID</label>
                <Input value={reraId} onChange={(e) => setReraId(e.target.value)} placeholder="AP-RERA-XXXX-XXXX" className={ic()} />
              </div>

              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                {projectType === "apartment" && (
                  <Field label="Total Towers">
                    <Input type="number" value={totalTowers} onChange={(e) => setTotalTowers(e.target.value)} placeholder="5" className={ic()} />
                  </Field>
                )}
                <Field label={projectType === "apartment" ? "Total Units" : projectType === "villa" ? "Total Villas" : "Total Plots"}>
                  <Input type="number" value={totalUnits} onChange={(e) => setTotalUnits(e.target.value)} placeholder="251" className={ic()} />
                </Field>
                {(projectType === "villa" || projectType === "venture") && (
                  <Field label="Total Area">
                    <Input value={totalArea} onChange={(e) => setTotalArea(e.target.value)} placeholder="34 acres" className={ic()} />
                  </Field>
                )}
              </div>

            </div>
          </div>

          {/* SECTION 1.5: Construction Updates */}
          <div className="bg-bg-card border border-border-default rounded-3xl p-6 shadow-sm">
            <h2 className="text-xl font-heading font-semibold text-text-primary mb-2 flex items-center">
              <Video className="w-5 h-5 mr-2 text-amber-primary" /> Construction Updates (Timeline)
            </h2>
            <p className="text-sm text-text-secondary mb-4">Add dated updates, progress text, and YouTube video links.</p>
            
            <div className="space-y-4">
              {constructionUpdates.map((update) => (
                <div key={update.id} className="relative p-4 rounded-2xl border border-border-default bg-bg-primary group">
                  <button
                    type="button"
                    onClick={() => setConstructionUpdates(prev => prev.filter(u => u.id !== update.id))}
                    className="absolute -right-2 -top-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-full p-1 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Date (e.g. Aug 2026)">
                      <Input value={update.date} onChange={e => {
                        const val = e.target.value;
                        setConstructionUpdates(prev => prev.map(u => u.id === update.id ? { ...u, date: val } : u));
                      }} placeholder="Aug 2026" className={ic()} />
                    </Field>
                    <Field label="Title">
                      <Input value={update.title} onChange={e => {
                        const val = e.target.value;
                        setConstructionUpdates(prev => prev.map(u => u.id === update.id ? { ...u, title: val } : u));
                      }} placeholder="Foundation completed" className={ic()} />
                    </Field>
                    <div className="md:col-span-2">
                      <Field label="Description (Optional)">
                        <textarea value={update.description || ""} onChange={e => {
                          const val = e.target.value;
                          setConstructionUpdates(prev => prev.map(u => u.id === update.id ? { ...u, description: val } : u));
                        }} placeholder="Details about this update..." rows={2} className={ic("resize-none")} />
                      </Field>
                    </div>
                    <div className="md:col-span-2">
                      <VideoMediaManager
                        videoUrl={update.videoUrl || ""}
                        videoThumbnail={update.imageUrl || ""}
                        onChange={({ videoUrl, videoThumbnail }) => {
                          setConstructionUpdates(prev => prev.map(u => u.id === update.id ? { ...u, videoUrl, imageUrl: videoThumbnail } : u));
                        }}
                        folder="projects"
                        entityId={initialData?.id}
                        label="Construction Update Video (Optional)"
                        description="Attach only ONE video: either a YouTube video link or an uploaded video file (up to 50MB)."
                      />
                    </div>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => setConstructionUpdates(prev => [...prev, { id: `upd-${Date.now()}`, date: "", title: "" }])}
                className="w-full border-dashed border-2 hover:bg-bg-card hover:text-amber-500 transition-colors py-2"
              >
                + Add Update
              </Button>
            </div>
          </div>

          {/* SECTION 2: Configurations */}
          <div id="field-configs" className={cn(
            "bg-bg-card border rounded-3xl p-6 shadow-sm transition-all",
            errors.configs ? "border-2 border-red-500 bg-red-500/5 ring-2 ring-red-500/20" : "border-border-default"
          )}>
            <h2 className="text-xl font-heading font-semibold text-text-primary mb-2 flex items-center justify-between">
              <span className="flex items-center">
                <Settings className="w-5 h-5 mr-2 text-amber-primary" /> Configurations <span className="text-red-500 ml-1">*</span>
              </span>
              {errors.configs && <span className="text-xs text-red-500 font-bold">Required</span>}
            </h2>
            <p className="text-sm text-text-secondary mb-4">Select the types available in this project and enter their size &amp; price ranges.</p>
            {errors.configs && (
              <p className="text-xs font-bold text-red-500 flex items-center gap-1 mb-4">
                <AlertCircle className="w-3.5 h-3.5" /> {errors.configs}
              </p>
            )}
            
            <div className="space-y-4">
              {configOptions.map((label) => {
                const configsForLabel = configs.filter(c => c.label === label);
                const isSelected = configsForLabel.length > 0;
                
                return (
                  <div key={label} className={`border rounded-2xl overflow-hidden transition-all ${isSelected ? 'border-amber-500/40 bg-bg-card' : 'border-border-default bg-bg-primary'}`}>
                    <div 
                      className="p-4 flex items-center justify-between cursor-pointer select-none"
                      onClick={() => toggleConfig(label)}
                    >
                      <div className="flex items-center gap-3">
                        {isSelected ? <CheckSquare className="w-5 h-5 text-amber-500" /> : <Square className="w-5 h-5 text-text-tertiary" />}
                        <span className={`font-bold ${isSelected ? 'text-text-primary' : 'text-text-secondary'}`}>{label}</span>
                      </div>
                      <span className="text-xs text-text-tertiary">{isSelected ? "Configured" : "Click to add"}</span>
                    </div>

                    {isSelected && (
                      <div className="p-4 pt-0 border-t border-border-default/50 flex flex-col gap-6 mt-4">
                        {configsForLabel.map((config, index) => (
                          <div key={config.id} className="relative group">
                            {configsForLabel.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeConfigVariant(config.id)}
                                className="absolute -right-2 -top-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-full p-1 transition-colors"
                                title="Remove Variant"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                            <div className="flex flex-col gap-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {projectType === "venture" ? (
                                  <>
                                    <Field label="Plot Size (sqyd)"><Input type="number" value={config.plotSizeMin || ""} onChange={e => updateConfigCalculated(config.id, "size", Number(e.target.value))} placeholder="150" className={ic()} /></Field>
                                    <Field label="Price per Sqyd (₹)"><Input type="number" value={config.pricePerUnit || ""} onChange={e => updateConfigCalculated(config.id, "pricePerUnit", Number(e.target.value))} placeholder="15000" className={ic()} /></Field>
                                    <div className="space-y-2">
                                      <label className="text-sm font-medium text-text-secondary">Calculated Price</label>
                                      <div className="h-12 px-4 flex items-center bg-bg-primary border border-border-default/80 text-amber-500 font-bold rounded-xl text-sm">
                                        {formatCurrency(config.priceMin || 0)}
                                      </div>
                                    </div>
                                  </>
                                ) : projectType === "villa" ? (
                                  <>
                                    <Field label="Built-up Area (sqft)"><Input type="number" value={config.builtUpAreaMin || ""} onChange={e => updateConfigCalculated(config.id, "size", Number(e.target.value))} placeholder="2000" className={ic()} /></Field>
                                    <Field label="Price per Sqft (₹)"><Input type="number" value={config.pricePerUnit || ""} onChange={e => updateConfigCalculated(config.id, "pricePerUnit", Number(e.target.value))} placeholder="6000" className={ic()} /></Field>
                                    <div className="space-y-2">
                                      <label className="text-sm font-medium text-text-secondary">Calculated Price</label>
                                      <div className="h-12 px-4 flex items-center bg-bg-primary border border-border-default/80 text-amber-500 font-bold rounded-xl text-sm">
                                        {formatCurrency(config.priceMin || 0)}
                                      </div>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <Field label="Built-up Area (sqft)"><Input type="number" value={config.superBuiltUpAreaMin || ""} onChange={e => updateConfigCalculated(config.id, "size", Number(e.target.value))} placeholder="1200" className={ic()} /></Field>
                                    <Field label="Price per Sqft (₹)"><Input type="number" value={config.pricePerUnit || ""} onChange={e => updateConfigCalculated(config.id, "pricePerUnit", Number(e.target.value))} placeholder="5000" className={ic()} /></Field>
                                    <div className="space-y-2">
                                      <label className="text-sm font-medium text-text-secondary">Calculated Price</label>
                                      <div className="h-12 px-4 flex items-center bg-bg-primary border border-border-default/80 text-amber-500 font-bold rounded-xl text-sm">
                                        {formatCurrency(config.priceMin || 0)}
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Field label="Undivided Share (UDS sq.yds)">
                                  <Input type="number" value={config.uds || ""} onChange={e => updateConfigField(config.id, "uds", Number(e.target.value))} placeholder="e.g. 40" className={ic()} />
                                </Field>
                                <Field label="Possession Date">
                                  <Input value={config.possessionDate || ""} onChange={e => updateConfigField(config.id, "possessionDate", e.target.value)} placeholder="e.g., Apr, 2026" className={ic()} />
                                </Field>
                                <Field label="YouTube Video URL">
                                  <Input value={config.videoUrl || ""} onChange={e => updateConfigField(config.id, "videoUrl", e.target.value)} placeholder="https://youtube.com/..." className={ic()} />
                                </Field>
                              </div>
                              <div className="space-y-1">
                                <label className="text-sm font-medium text-text-secondary">Floor Plan Image (3D/2D)</label>
                                <div className="flex items-center gap-3">
                                  {config.floorPlanUrl && <img src={config.floorPlanUrl} alt="Plan" className="w-10 h-10 rounded object-cover border border-border-default bg-white" />}
                                  <Input type="file" accept="image/*" onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleConfigImageUpload(config.id, file);
                                  }} className="file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-amber-primary/10 file:text-amber-700 dark:file:text-amber-400 hover:file:bg-amber-primary/20 text-xs w-full" disabled={uploading[`config-${config.id}`]} />
                                  {uploading[`config-${config.id}`] && <Loader2 className="w-4 h-4 animate-spin text-amber-500 shrink-0" />}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addConfigVariant(label)}
                          className="w-full border-dashed border-2 hover:bg-bg-card hover:text-amber-500 transition-colors py-2"
                        >
                          + Add another {label} variant
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 3: Location */}
          <div className="bg-bg-card border border-border-default rounded-3xl p-6 shadow-sm">
            <h2 className="text-xl font-heading font-semibold text-text-primary mb-4 flex items-center">
              <MapPin className="w-5 h-5 mr-2 text-amber-primary" /> Location Details
            </h2>

            {/* Explicit Location Inputs: Locality, Address, City, State, Pincode */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div id="field-locality" className="space-y-1">
                <label className="text-sm font-medium text-text-primary flex items-center justify-between">
                  <span>Locality / Area / Landmark <span className="text-red-500 font-bold">*</span></span>
                  {errors.locality && <span className="text-xs text-red-500 font-bold">Required</span>}
                </label>
                <Input
                  value={locality}
                  onChange={(e) => handleLocalityChange(e.target.value)}
                  placeholder="e.g. Benz Circle, Poranki, Kanuru, Tadepalli"
                  className={cn(
                    ic(),
                    errors.locality && "border-2 border-red-500 ring-2 ring-red-500/30 bg-red-50 dark:bg-red-950/20"
                  )}
                />
                {errors.locality && (
                  <p className="text-xs font-bold text-red-500 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {errors.locality}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-text-primary">Address / Door No.</label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Near Vijayawada Highway, Plot No. 45"
                  className={ic()}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-text-primary">City</label>
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Vijayawada, Guntur"
                  className={ic()}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-text-primary">State</label>
                  <Input
                    value={locState}
                    onChange={(e) => setLocState(e.target.value)}
                    placeholder="Andhra Pradesh"
                    className={ic()}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-text-primary">Pincode</label>
                  <Input
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="520007"
                    className={ic()}
                  />
                </div>
              </div>
            </div>

            {/* Google Maps Location Link Auto-Fetcher */}
            <div className="space-y-3 mb-6 p-5 rounded-2xl bg-slate-900/90 border-2 border-amber-500/30">
              <div className="flex items-center gap-2 text-amber-400 font-black text-xs uppercase tracking-wider border-b border-slate-800 pb-2.5">
                <MapPin className="w-4 h-4 text-amber-400" />
                <span>PASTE GOOGLE MAPS LINK (AUTO-FETCH COORDINATES &amp; ADDRESS)</span>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                <Input
                  type="text"
                  placeholder="Paste Google Maps URL e.g. https://maps.app.goo.gl/..."
                  value={googleMapsUrl}
                  onChange={async (e) => {
                    const val = e.target.value;
                    setGoogleMapsUrl(val);
                    const trimmed = val.trim();
                    if (!trimmed) return;

                    try {
                      const res = await fetch(`/api/resolve-maps-url?url=${encodeURIComponent(trimmed)}`);
                      const data = await res.json();
                      if (data.success && data.latitude && data.longitude) {
                        setLat(data.latitude);
                        setLng(data.longitude);
                        if (data.city) setCity(data.city);
                        if (data.locality) setLocality(data.locality);
                        if (data.state) setLocState(data.state);
                        if (data.pincode) setPincode(data.pincode);
                        if (data.address) setAddress(data.address);
                        toast.success(`📍 Fetched location!`);
                      }
                    } catch (err) {}
                  }}
                  className="h-11 flex-1 text-xs bg-slate-950 border-slate-800 text-white placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
                />
                <Button
                  type="button"
                  onClick={async () => {
                    const trimmed = googleMapsUrl.trim();
                    if (!trimmed) {
                      toast.error("Please paste a Google Maps link first");
                      return;
                    }
                    toast.loading("Resolving Google Maps location & details...", { id: "fetch-maps" });
                    try {
                      const res = await fetch(`/api/resolve-maps-url?url=${encodeURIComponent(trimmed)}`);
                      const data = await res.json();
                      if (data.success && data.latitude && data.longitude) {
                        setLat(data.latitude);
                        setLng(data.longitude);
                        if (data.city) setCity(data.city);
                        if (data.locality) setLocality(data.locality);
                        if (data.state) setLocState(data.state);
                        if (data.pincode) setPincode(data.pincode);
                        if (data.address) setAddress(data.address);
                        toast.success(`📍 Fetched location!`, { id: "fetch-maps" });
                      } else {
                        toast.error(data.error || "Could not extract location from link", { id: "fetch-maps" });
                      }
                    } catch (err) {
                      toast.error("Failed to resolve Google Maps link", { id: "fetch-maps" });
                    }
                  }}
                  className="h-11 px-5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shrink-0 rounded-xl cursor-pointer shadow-sm transition-all"
                >
                  Fetch Location
                </Button>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
              <Button
                type="button"
                onClick={() => {
                  if ("geolocation" in navigator) {
                    toast.loading("Fetching your location...", { id: "geo" });
                    navigator.geolocation.getCurrentPosition(
                      (position) => {
                        const { latitude, longitude } = position.coords;
                        setLat(latitude);
                        setLng(longitude);
                        toast.success("Location updated!", { id: "geo" });
                      },
                      (error) => {
                        toast.error("Failed to get location: " + error.message, { id: "geo" });
                      },
                      { enableHighAccuracy: true }
                    );
                  } else {
                    toast.error("Geolocation is not supported by your browser");
                  }
                }}
                className="h-12 px-6 bg-slate-950 hover:bg-slate-900 text-white font-bold text-sm rounded-xl cursor-pointer border border-white/15 shadow-sm w-full sm:w-auto flex items-center justify-center gap-2 transition-all"
              >
                <MapPin className="w-4 h-4 text-amber-500 fill-amber-500" /> Use My Current Location
              </Button>
            </div>

            <div className="w-full">
              <div className="space-y-4">
                <div className="h-[400px] w-full rounded-2xl overflow-hidden relative border border-border-default/50 shadow-inner">
                  <CoordinatePickerMap initialPosition={[lat, lng]} onPositionChange={handleMapPos} />
                </div>
                <p className="text-xs text-text-tertiary text-center">Drag the marker or click on the map to set exact location. The address is automatically saved behind the scenes.</p>
              </div>

            </div>
          </div>

          {/* SECTION 4: Media, Documents & Facilities */}
          <div className="bg-bg-card border border-border-default rounded-3xl p-6 shadow-sm">
            <h2 className="text-xl font-heading font-semibold text-text-primary mb-6 flex items-center">
              <ImageIcon className="w-5 h-5 mr-2 text-amber-primary" /> Media, Documents & Amenities
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Cover Image */}
              <div className="space-y-4">
                <label className="text-sm font-medium text-text-secondary">Cover Image *</label>
                <div className="border-2 border-dashed border-border-default rounded-2xl p-6 flex flex-col items-center justify-center text-center hover:bg-bg-primary/50 transition-colors relative overflow-hidden min-h-[200px]">
                  {coverImage ? (
                    <>
                      <img src={coverImage} alt="Cover Preview" className="absolute inset-0 w-full h-full object-cover opacity-50" />
                      <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 bg-black/50 hover:bg-black/80 text-white rounded-full z-10" onClick={() => setCoverImage("")}>
                        <X className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-text-tertiary mb-2" />
                      <p className="text-sm text-text-secondary">Click to upload cover image</p>
                    </>
                  )}
                  <input type="file" accept="image/*" onChange={handleCoverUpload} className="absolute inset-0 opacity-0 cursor-pointer z-0" disabled={uploading.cover} />
                </div>
              </div>

              {/* Gallery Images */}
              <div className="space-y-4">
                <label className="text-sm font-medium text-text-secondary">Gallery Images</label>
                <div className="border-2 border-dashed border-border-default rounded-2xl p-6 flex flex-col items-center justify-center text-center hover:bg-bg-primary/50 transition-colors relative min-h-[200px]">
                  <Upload className="w-8 h-8 text-text-tertiary mb-2" />
                  <p className="text-sm text-text-secondary">Upload multiple gallery images</p>
                  <input type="file" accept="image/*" multiple onChange={handleGalleryUpload} className="absolute inset-0 opacity-0 cursor-pointer" disabled={uploading.gallery} />
                </div>
                {images.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto py-2">
                    {images.filter(img => img.url !== coverImage).map((img, i) => (
                      <div key={img.id} className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                        <img src={img.url} alt={`Gallery ${i}`} className="w-full h-full object-cover" />
                        <button type="button" onClick={() => setImages(prev => prev.filter(x => x.id !== img.id))} className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Video Walkthrough (Dual-Mode: YouTube + 50MB S3 Upload + Custom Cover) */}
              <div className="md:col-span-2">
                <VideoMediaManager
                  videoUrl={videoUrl}
                  videoThumbnail={videoThumbnail}
                  onChange={({ videoUrl: vUrl, videoThumbnail: vThumb }) => {
                    setVideoUrl(vUrl);
                    setVideoThumbnail(vThumb);
                  }}
                  suggestedThumbnails={[
                    ...(coverImage ? [coverImage] : []),
                    ...images.map(img => typeof img === 'string' ? img : img.url)
                  ]}
                  folder="projects"
                  entityId={initialData?.id}
                />
              </div>

              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border-default/50">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-text-secondary block mb-2">Brochure (PDF/Image)</label>
                  <div className="flex items-center gap-3">
                    <Input type="file" onChange={handleBrochureFile} className="file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-700" />
                    {brochureUrl && <span className="text-xs text-amber-500 font-bold">Uploaded ✓</span>}
                  </div>
                </div>
              </div>

              {/* Amenities */}
              <div className="md:col-span-2 pt-4 border-t border-border-default/50">
                <label className="text-sm font-bold text-amber-500 uppercase tracking-wider block mb-4">Project Amenities</label>
                <div className="flex flex-wrap gap-2">
                  {FACILITIES_LIST.map(fac => {
                    const active = facilities.includes(fac);
                    return (
                      <button
                        key={fac}
                        type="button"
                        onClick={() => toggleFacility(fac)}
                        className={`py-1.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          active
                            ? "bg-amber-500 text-slate-950 border-amber-500 font-black"
                            : "bg-bg-primary text-text-secondary border-border-default hover:bg-bg-card"
                        }`}
                      >
                        {active ? "✓ " : "+ "} {fac}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>

        </form>
      </div>

      {/* SECTION 5: Sticky Publishing Panel */}
      <div className="fixed bottom-0 left-0 right-0 bg-bg-card/95 backdrop-blur-xl border-t border-border-default p-3 sm:py-4 sm:px-6 z-40 shadow-elevated">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          <div className="flex items-center justify-between sm:justify-start gap-4">
            <div className="flex items-center gap-2">
              <Checkbox 
                id="featured" name="featured"
                checked={isFeatured}
                onCheckedChange={(checked) => setIsFeatured(checked as boolean)} 
              />
              <label htmlFor="featured" className="text-xs sm:text-sm font-medium text-text-primary cursor-pointer select-none">Mark as Featured</label>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <Button variant="outline" type="button" onClick={(e) => handleSubmit(e, false)} disabled={submitting || Object.values(uploading).some(Boolean)} className="flex-1 sm:flex-none h-10 text-xs sm:text-sm">
              Save Draft
            </Button>
            <Button variant="amber" type="button" onClick={(e) => handleSubmit(e, true)} disabled={submitting || Object.values(uploading).some(Boolean)} className="flex-1 sm:flex-none h-10 text-xs sm:text-sm font-bold">
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              Publish Listing
            </Button>
          </div>
          
        </div>
      </div>
    </div>
  );
}
