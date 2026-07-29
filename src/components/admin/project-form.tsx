"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useProjectsStore } from "@/stores/projects-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft, ArrowRight, Building2, Home, Landmark,
  Plus, Trash2, Check, X, Upload, Link as LinkIcon,
  Image as ImageIcon, FileText, Star, Eye, MapPin, Save,
  CheckCircle2, Loader2, Map,
} from "lucide-react";
import Link from "next/link";
import type {
  Project, ProjectType, ProjectConfig,
  ProjectPhase, ProjectImage, ConstructionStatus,
} from "@/types/project";

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

const STEPS = ["Type & Basics", "Configurations", "Media & Highlights", "Review & Publish"];

const STATUSES: { value: ConstructionStatus; label: string; desc: string }[] = [
  { value: "new-launch",         label: "New Launch",         desc: "Freshly announced" },
  { value: "under-construction", label: "Under Construction", desc: "Actively being built" },
  { value: "ready-to-move",      label: "Ready to Move",      desc: "Fully completed" },
];

// BHK options per type
const BHK_OPTIONS: Record<ProjectType, string[]> = {
  apartment: ["1 BHK", "2 BHK", "3 BHK", "4 BHK", "4+ BHK", "Penthouse", "Duplex", "Studio"],
  villa:     ["2 BHK Villa", "3 BHK Villa", "4 BHK Villa", "5 BHK Villa", "Duplex Villa", "Row House"],
  venture:   ["Residential Plot", "Commercial Plot", "Corner Plot", "Park-Facing Plot", "30×40 Plot", "40×60 Plot", "50×80 Plot"],
};

function emptyConfig(pt: ProjectType): ProjectConfig {
  return {
    id: `cfg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label: pt === "venture" ? "Residential Plot" : pt === "villa" ? "3 BHK Villa" : "2 BHK",
    priceMin: 0, priceMax: 0,
    ...(pt !== "venture" ? { builtUpAreaMin: 0, builtUpAreaMax: 0 } : {}),
    ...(pt === "venture"   ? { plotSizeMin: 150, plotSizeMax: 200, pricePerUnit: 0 } : {}),
    ...(pt === "villa"     ? { plotSizeMin: 120, plotSizeMax: 200 } : {}),
    constructionStatus: "under-construction",
    possessionDate: "",
    floorPlanUrl: "",
  };
}
function emptyPhase(): ProjectPhase {
  return { id: `ph-${Date.now()}`, name: "Phase 1", status: "under-construction", possessionDate: "", totalUnits: undefined };
}

// ─── Upload helper ─────────────────────────────────────────────────────────────
async function uploadFile(file: File, bucket: string, folder: string): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;
  try {
    const { data, error } = await supabase.storage.from(bucket).upload(path, file);
    if (!error && data?.path) {
      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(data.path);
      return pub.publicUrl;
    }
  } catch {}
  return URL.createObjectURL(file);
}

// ─── UI Helpers ───────────────────────────────────────────────────────────────
function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5 mb-8 overflow-x-auto pb-1">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center gap-1.5 shrink-0">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
            i < current ? "bg-amber-primary text-slate-950" :
            i === current ? "bg-amber-primary/20 border-2 border-amber-primary text-amber-primary" :
            "bg-bg-primary border border-border-default text-text-tertiary"
          }`}>
            {i < current ? <Check className="w-4 h-4" /> : i + 1}
          </div>
          <span className={`hidden sm:block text-xs font-semibold ${i === current ? "text-text-primary" : "text-text-tertiary"}`}>{label}</span>
          {i < total - 1 && <div className={`w-6 h-0.5 rounded-full ${i < current ? "bg-amber-primary" : "bg-border-default"}`} />}
        </div>
      ))}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-bg-card border border-border-default rounded-2xl p-5 space-y-4">
      <h3 className="font-bold text-text-primary text-sm uppercase tracking-wide">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-text-primary">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-text-tertiary">{hint}</p>}
    </div>
  );
}

const ic = (extra = "") =>
  `w-full px-3.5 py-2.5 rounded-xl border border-border-default bg-bg-primary text-text-primary text-sm placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-amber-primary/40 focus:border-amber-primary transition ${extra}`;

// ─── Upload Field ─────────────────────────────────────────────────────────────
type UploadMode = "link" | "upload";

function UploadField({
  label, required, hint, accept, value, onChange, onFile, uploading,
}: {
  label: string; required?: boolean; hint?: string;
  accept: string;
  value: string;
  onChange: (v: string) => void;
  onFile: (f: File) => Promise<void>;
  uploading?: boolean;
}) {
  const [mode, setMode] = useState<UploadMode>("link");
  const ref = useRef<HTMLInputElement>(null);

  return (
    <Field label={label} required={required} hint={hint}>
      {/* mode toggle */}
      <div className="flex items-center gap-1 mb-2">
        <button type="button" onClick={() => setMode("link")}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${mode === "link" ? "bg-amber-primary text-slate-950" : "bg-bg-primary border border-border-default text-text-secondary hover:border-amber-primary/40"}`}>
          <LinkIcon className="w-3 h-3" /> Paste Link
        </button>
        <button type="button" onClick={() => { setMode("upload"); setTimeout(() => ref.current?.click(), 50); }}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${mode === "upload" ? "bg-amber-primary text-slate-950" : "bg-bg-primary border border-border-default text-text-secondary hover:border-amber-primary/40"}`}>
          {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />} Upload
        </button>
      </div>

      {mode === "link" ? (
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://..." className={ic()} />
      ) : (
        <div
          onClick={() => ref.current?.click()}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed border-border-default bg-bg-primary cursor-pointer hover:border-amber-primary/50 transition-colors ${uploading ? "opacity-60 pointer-events-none" : ""}`}
        >
          {uploading ? <Loader2 className="w-5 h-5 text-amber-primary animate-spin" /> : <Upload className="w-5 h-5 text-text-tertiary" />}
          <div>
            <p className="text-sm font-medium text-text-primary">{uploading ? "Uploading…" : "Click to upload"}</p>
            {value && <p className="text-xs text-green-500 truncate max-w-[260px] mt-0.5">✓ Uploaded</p>}
          </div>
        </div>
      )}

      {/* preview */}
      {value && accept.startsWith("image") && (
        <div className="relative w-24 h-16 rounded-xl overflow-hidden border border-border-default mt-2">
          <img src={value} alt="preview" className="w-full h-full object-cover" />
          <button type="button" onClick={() => onChange("")} className="absolute top-1 right-1 p-0.5 bg-red-500 rounded-full text-white">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
      {value && accept === "application/pdf" && (
        <div className="flex items-center gap-2 mt-2 p-2 rounded-xl border border-border-default bg-bg-primary text-xs text-green-600 font-semibold">
          <FileText className="w-4 h-4" /> PDF linked ✓
        </div>
      )}

      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) { await onFile(f); setMode("upload"); }
          e.target.value = "";
        }}
      />
    </Field>
  );
}

// ─── Main Form ────────────────────────────────────────────────────────────────
interface ProjectFormProps {
  initialData?: Project;
  mode: "new" | "edit";
}

export function ProjectForm({ initialData, mode }: ProjectFormProps) {
  const router = useRouter();
  const { addProject, updateProject } = useProjectsStore();

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [showMap, setShowMap] = useState(false);
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");

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
  const [noBrokerage, setNoBrokerage]         = useState(initialData?.noBrokerage ?? false);
  const [constructionStatus, setConstructionStatus] = useState<ConstructionStatus>(initialData?.constructionStatus ?? "under-construction");
  const [totalUnits, setTotalUnits]           = useState(initialData?.totalUnits?.toString() ?? "");
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
  const [configs, setConfigs] = useState<ProjectConfig[]>(
    initialData?.configurations?.length ? initialData.configurations : [emptyConfig(projectType)]
  );
  const [phases, setPhases] = useState<ProjectPhase[]>(
    initialData?.phases?.length ? initialData.phases : [emptyPhase()]
  );

  // ── Step 3 ──
  const [images, setImages]         = useState<ProjectImage[]>(initialData?.images ?? []);
  const [newImgUrl, setNewImgUrl]   = useState("");
  const [newImgCat, setNewImgCat]   = useState<ProjectImage["category"]>("exterior");
  const [coverImage, setCoverImage] = useState(initialData?.coverImage ?? "");
  const [videoUrl, setVideoUrl]     = useState(initialData?.videoUrl ?? "");
  const [brochureUrl, setBrochureUrl] = useState(initialData?.brochureUrl ?? "");
  const [highlights, setHighlights] = useState<string[]>(initialData?.highlights?.length ? initialData.highlights : [""]);
  const [facilities, setFacilities] = useState<string[]>(initialData?.facilities ?? []);

  // ── Step 4 ──
  const [isFeatured, setIsFeatured]   = useState(initialData?.isFeatured ?? false);
  const [isPublished, setIsPublished] = useState(initialData?.isPublished ?? false);

  // ─── Upload handlers ─────────────────────────────────────────────────────────
  const setUpl = (key: string, val: boolean) =>
    setUploading((p) => ({ ...p, [key]: val }));

  const handleLogoFile = async (file: File) => {
    setUpl("logo", true);
    const url = await uploadFile(file, "projects", "logos");
    setBuilderLogoUrl(url);
    setUpl("logo", false);
    toast.success("Logo uploaded!");
  };

  const handleBrochureFile = async (file: File) => {
    setUpl("brochure", true);
    const url = await uploadFile(file, "projects", "brochures");
    setBrochureUrl(url);
    setUpl("brochure", false);
    toast.success("Brochure uploaded!");
  };

  const handleImageFile = async (file: File) => {
    setUpl("gallery", true);
    const url = await uploadFile(file, "projects", "gallery");
    const img: ProjectImage = {
      id: `img-${Date.now()}`,
      url,
      alt: name || "Project image",
      category: newImgCat,
      isPrimary: images.length === 0,
    };
    setImages((p) => [...p, img]);
    if (!coverImage) setCoverImage(url);
    setUpl("gallery", false);
    toast.success("Image added!");
  };

  const handleFloorPlanFile = async (file: File, cfgId: string) => {
    setUpl(`fp-${cfgId}`, true);
    const url = await uploadFile(file, "projects", "floorplans");
    updateConfig(cfgId, "floorPlanUrl", url);
    setUpl(`fp-${cfgId}`, false);
    toast.success("Floor plan uploaded!");
  };

  // ─── Config helpers ────────────────────────────────────────────────────────
  const updateConfig = (id: string, field: keyof ProjectConfig, value: any) =>
    setConfigs((p) => p.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  const addConfig = () => setConfigs((p) => [...p, emptyConfig(projectType)]);
  const removeConfig = (id: string) => setConfigs((p) => p.filter((c) => c.id !== id));

  const updatePhase = (id: string, field: keyof ProjectPhase, value: any) =>
    setPhases((p) => p.map((ph) => (ph.id === id ? { ...ph, [field]: value } : ph)));
  const addPhase = () => setPhases((p) => [...p, emptyPhase()]);
  const removePhase = (id: string) => setPhases((p) => p.filter((ph) => ph.id !== id));

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

  // ─── Gallery image URL add ────────────────────────────────────────────────
  const addImageUrl = () => {
    if (!newImgUrl.trim()) return;
    const img: ProjectImage = {
      id: `img-${Date.now()}`,
      url: newImgUrl.trim(),
      alt: name || "Project image",
      category: newImgCat,
      isPrimary: images.length === 0,
    };
    setImages((p) => [...p, img]);
    if (!coverImage) setCoverImage(img.url);
    setNewImgUrl("");
  };

  const removeImage = (id: string) => {
    const img = images.find((i) => i.id === id);
    if (img?.url === coverImage) setCoverImage(images.find((i) => i.id !== id)?.url ?? "");
    setImages((p) => p.filter((i) => i.id !== id));
  };

  const toggleFacility = (f: string) =>
    setFacilities((p) => (p.includes(f) ? p.filter((x) => x !== f) : [...p, f]));

  // ─── Validation ────────────────────────────────────────────────────────────
  const validate = (s: number) => {
    if (s === 0) {
      if (!name.trim())       { toast.error("Project name required."); return false; }
      if (!builderName.trim()) { toast.error("Builder name required."); return false; }
      if (!locality.trim())   { toast.error("Locality required."); return false; }
    }
    if (s === 1 && !configs.length) { toast.error("Add at least one configuration."); return false; }
    return true;
  };

  const next = () => { if (validate(step)) setStep((s) => Math.min(s + 1, 3)); };
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  // ─── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (publish: boolean) => {
    if (!validate(0)) { setStep(0); return; }
    setSubmitting(true);

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
      reraApproved,
      noBrokerage,
      constructionStatus,
      totalUnits: totalUnits ? parseInt(totalUnits) : undefined,
      totalArea: totalArea.trim() || undefined,
      phases,
      configurations: configs,
      images,
      coverImage: coverImage || images[0]?.url,
      videoUrl: videoUrl.trim() || undefined,
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
    apartment: { icon: Building2, desc: "Multi-storey flats with BHK configs", color: "border-blue-500 bg-blue-500/5 text-blue-600" },
    villa:     { icon: Home,      desc: "Independent villas / row houses",       color: "border-emerald-500 bg-emerald-500/5 text-emerald-600" },
    venture:   { icon: Landmark,  desc: "Gated layout plots – residential/commercial", color: "border-amber-500 bg-amber-500/5 text-amber-600" },
  };

  // ─── Toggle ────────────────────────────────────────────────────────────────
  function Toggle({ on, onToggle, label, sub }: { on: boolean; onToggle: () => void; label: string; sub?: string }) {
    return (
      <label className="flex items-center gap-3 cursor-pointer select-none">
        <div onClick={onToggle} className={`w-10 h-6 rounded-full relative transition-colors cursor-pointer shrink-0 ${on ? "bg-amber-primary" : "bg-border-default"}`}>
          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${on ? "left-5" : "left-1"}`} />
        </div>
        <div>
          <p className="text-sm font-semibold text-text-primary">{label}</p>
          {sub && <p className="text-xs text-text-secondary">{sub}</p>}
        </div>
      </label>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-bg-primary pb-32">
      <div className="max-w-4xl mx-auto px-4 md:px-6 pt-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin/projects" className="p-2 rounded-xl border border-border-default hover:bg-bg-card text-text-secondary transition-all">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-heading text-text-primary">
              {mode === "new" ? "Add New Project" : `Edit: ${name || "Project"}`}
            </h1>
            <p className="text-sm text-text-secondary mt-0.5">
              {mode === "new" ? "Create a new builder project" : "Update project details"}
            </p>
          </div>
        </div>

        <StepIndicator current={step} total={4} />

        {/* ═══════════════ STEP 1 — TYPE & BASICS ═══════════════ */}
        {step === 0 && (
          <div className="space-y-5">
            {/* Project Type */}
            <Card title="Project Type">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(["apartment", "villa", "venture"] as ProjectType[]).map((type) => {
                  const { icon: Icon, desc, color } = typeInfo[type];
                  const active = projectType === type;
                  return (
                    <button key={type} type="button"
                      onClick={() => { setProjectType(type); setConfigs([emptyConfig(type)]); }}
                      className={`p-4 rounded-2xl border-2 text-left transition-all relative ${active ? color : "border-border-default bg-bg-primary hover:border-border-default/60"}`}
                    >
                      {active && <CheckCircle2 className="w-4 h-4 absolute top-3 right-3" />}
                      <Icon className={`w-6 h-6 mb-2 ${active ? "" : "text-text-tertiary"}`} />
                      <p className={`font-bold capitalize ${active ? "" : "text-text-primary"}`}>{type}</p>
                      <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">{desc}</p>
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* Identity */}
            <Card title="Project Identity">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Project Name" required>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Lansum Evana" className={ic()} />
                </Field>
                <Field label="Tagline">
                  <Input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="e.g. Life elevated, above the rest" className={ic()} />
                </Field>
              </div>
              <Field label="Description">
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
                  placeholder="Brief overview of the project…" className={ic("resize-none")} />
              </Field>
            </Card>

            {/* Builder */}
            <Card title="Builder / Developer">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Builder Name" required>
                  <Input value={builderName} onChange={(e) => setBuilderName(e.target.value)} placeholder="e.g. Lansum Properties LLP" className={ic()} />
                </Field>
                <UploadField
                  label="Builder Logo" accept="image/*"
                  value={builderLogoUrl} onChange={setBuilderLogoUrl}
                  onFile={handleLogoFile} uploading={uploading.logo}
                  hint="PNG/SVG logo of the builder"
                />
                <Field label="Builder Phone">
                  <Input value={builderPhone} onChange={(e) => setBuilderPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" className={ic()} />
                </Field>
                <Field label="Builder WhatsApp">
                  <Input value={builderWhatsapp} onChange={(e) => setBuilderWhatsapp(e.target.value)} placeholder="+91 XXXXX XXXXX" className={ic()} />
                </Field>
              </div>
            </Card>

            {/* Compliance & Status */}
            <Card title="Compliance & Status">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="RERA ID">
                  <Input value={reraId} onChange={(e) => setReraId(e.target.value)} placeholder="AP-RERA-XXXX-XXXX" className={ic()} />
                </Field>
                <div className="flex flex-col gap-3 pt-1">
                  <Toggle on={reraApproved} onToggle={() => setReraApproved((v) => !v)} label="RERA Approved" />
                  <Toggle on={noBrokerage} onToggle={() => setNoBrokerage((v) => !v)} label="No Brokerage" />
                </div>
              </div>

              {/* Construction Status */}
              <div>
                <p className="text-sm font-medium text-text-primary mb-2">Construction Status</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {STATUSES.map((s) => (
                    <button key={s.value} type="button" onClick={() => setConstructionStatus(s.value)}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${constructionStatus === s.value ? "border-amber-primary bg-amber-primary/10" : "border-border-default bg-bg-card"}`}
                    >
                      <p className="text-sm font-semibold text-text-primary">{s.label}</p>
                      <p className="text-xs text-text-tertiary mt-0.5">{s.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Type-adaptive extra fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label={projectType === "apartment" ? "Total Units / Flats" : projectType === "villa" ? "Total Villas" : "Total Plots"}
                  hint="e.g. 251">
                  <Input type="number" value={totalUnits} onChange={(e) => setTotalUnits(e.target.value)} placeholder="251" className={ic()} />
                </Field>
                {(projectType === "villa" || projectType === "venture") && (
                  <Field label="Total Area" hint='e.g. "34 acres"'>
                    <Input value={totalArea} onChange={(e) => setTotalArea(e.target.value)} placeholder="34 acres" className={ic()} />
                  </Field>
                )}
              </div>
            </Card>

            {/* Location */}
            <Card title="Location">
              {/* Google Maps Location Link Auto-Fetcher */}
              <div className="space-y-2 mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                <label className="text-xs font-black uppercase text-amber-500 tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-amber-500" />
                  Paste Google Maps Location Link (Auto-Fetches Map Coordinates)
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    placeholder="Paste Google Maps URL e.g. https://maps.app.goo.gl/J7Xw7ioj2hbu2XWf9..."
                    value={googleMapsUrl}
                    onChange={async (e) => {
                      const val = e.target.value;
                      setGoogleMapsUrl(val);
                      const trimmed = val.trim();
                      if (!trimmed) return;

                      // Shortened link resolution
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
                          toast.success(`📍 Fetched location for ${data.locality || data.city || 'Project'} (${data.latitude.toFixed(4)}, ${data.longitude.toFixed(4)})!`);
                        }
                      } catch (err) {}
                    }}
                    className="h-11 text-xs bg-bg-primary font-bold border-amber-500/50"
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
                          toast.success(`📍 Fetched location for ${data.locality || data.city || 'Project'} (${data.latitude.toFixed(4)}, ${data.longitude.toFixed(4)})!`, { id: "fetch-maps" });
                        } else {
                          toast.error(data.error || "Could not extract location from link", { id: "fetch-maps" });
                        }
                      } catch (err) {
                        toast.error("Failed to resolve Google Maps link", { id: "fetch-maps" });
                      }
                    }}
                    className="h-11 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shrink-0 rounded-xl cursor-pointer shadow-md"
                  >
                    Fetch Location
                  </Button>
                </div>
                <p className="text-[11px] text-text-tertiary">
                  Paste any Google Maps link (e.g. https://maps.app.goo.gl/J7Xw7ioj2hbu2XWf9). The map pin automatically updates!
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Address">
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Full address" className={ic()} />
                </Field>
                <Field label="Locality / Area" required>
                  <Input value={locality} onChange={(e) => setLocality(e.target.value)} placeholder="e.g. Chevella, Narsingi" className={ic()} />
                </Field>
                <Field label="City" required>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Vijayawada" className={ic()} />
                </Field>
                <Field label="State">
                  <Input value={locState} onChange={(e) => setLocState(e.target.value)} placeholder="Andhra Pradesh" className={ic()} />
                </Field>
                <Field label="Pincode">
                  <Input value={pincode} onChange={(e) => setPincode(e.target.value)} placeholder="500xxx" className={ic()} />
                </Field>
              </div>

              {/* Coordinate inputs */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Latitude" hint="Decimal format">
                  <Input value={lat.toString()} onChange={(e) => setLat(parseFloat(e.target.value) || 16.5062)} placeholder="16.5062" className={ic()} />
                </Field>
                <Field label="Longitude">
                  <Input value={lng.toString()} onChange={(e) => setLng(parseFloat(e.target.value) || 80.6480)} placeholder="80.6480" className={ic()} />
                </Field>
              </div>

              {/* Map toggle */}
              <button type="button" onClick={() => setShowMap((v) => !v)}
                className="flex items-center gap-2 text-sm font-semibold text-amber-primary hover:text-amber-600 transition-colors">
                <Map className="w-4 h-4" />
                {showMap ? "Hide Map Picker" : "📍 Pick Location on Map"}
              </button>

              {showMap && (
                <div className="rounded-2xl overflow-hidden" style={{ height: "300px" }}>
                  <CoordinatePickerMap
                    initialPosition={[lat, lng]}
                    onPositionChange={handleMapPos}
                  />
                </div>
              )}
              <p className="text-xs text-text-tertiary">
                💡 Click anywhere on the map to set the exact pin location. Drag the marker to fine-tune.
              </p>
            </Card>
          </div>
        )}

        {/* ═══════════════ STEP 2 — CONFIGURATIONS ═══════════════ */}
        {step === 1 && (
          <div className="space-y-5">
            <Card title={
              projectType === "apartment" ? "BHK Configurations"
              : projectType === "villa"   ? "Villa Configurations"
              : "Plot Types / Sizes"
            }>
              <p className="text-xs text-text-secondary -mt-2">
                {projectType === "apartment" && "Add each BHK variant with area range and pricing."}
                {projectType === "villa"     && "Add each villa size with plot + built-up area and pricing."}
                {projectType === "venture"   && "Add plot types with sq.yd sizes and pricing. No BHK needed."}
              </p>

              <div className="space-y-4">
                {configs.map((cfg, idx) => (
                  <div key={cfg.id} className="p-4 rounded-2xl border border-border-default bg-bg-primary space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-text-primary">
                        {projectType === "venture" ? "Plot Type" : "Config"} #{idx + 1}
                      </span>
                      {configs.length > 1 && (
                        <button onClick={() => removeConfig(cfg.id)} className="p-1 rounded-lg hover:bg-red-500/10 text-red-400">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Label */}
                      <Field label={projectType === "venture" ? "Plot Type" : "Configuration"}>
                        <select value={cfg.label} onChange={(e) => updateConfig(cfg.id, "label", e.target.value)} className={ic()}>
                          {BHK_OPTIONS[projectType].map((o) => <option key={o}>{o}</option>)}
                        </select>
                      </Field>

                      {/* Prices */}
                      <Field label="Price Min (₹)">
                        <Input type="number" value={cfg.priceMin || ""} onChange={(e) => updateConfig(cfg.id, "priceMin", parseInt(e.target.value) || 0)} placeholder="3500000" className={ic()} />
                      </Field>
                      <Field label="Price Max (₹)">
                        <Input type="number" value={cfg.priceMax || ""} onChange={(e) => updateConfig(cfg.id, "priceMax", parseInt(e.target.value) || 0)} placeholder="5500000" className={ic()} />
                      </Field>

                      {/* TYPE-ADAPTIVE area fields */}
                      {projectType === "venture" ? (
                        <>
                          <Field label="Plot Size Min (sq.yds)">
                            <Input type="number" value={cfg.plotSizeMin ?? ""} onChange={(e) => updateConfig(cfg.id, "plotSizeMin", parseInt(e.target.value) || 0)} placeholder="150" className={ic()} />
                          </Field>
                          <Field label="Plot Size Max (sq.yds)">
                            <Input type="number" value={cfg.plotSizeMax ?? ""} onChange={(e) => updateConfig(cfg.id, "plotSizeMax", parseInt(e.target.value) || 0)} placeholder="300" className={ic()} />
                          </Field>
                          <Field label="Price per sq.yd (₹)">
                            <Input type="number" value={cfg.pricePerUnit ?? ""} onChange={(e) => updateConfig(cfg.id, "pricePerUnit", parseInt(e.target.value) || 0)} placeholder="15000" className={ic()} />
                          </Field>
                        </>
                      ) : projectType === "villa" ? (
                        <>
                          <Field label="Built-up Area Min (sq.ft)">
                            <Input type="number" value={cfg.builtUpAreaMin ?? ""} onChange={(e) => updateConfig(cfg.id, "builtUpAreaMin", parseInt(e.target.value) || 0)} placeholder="2000" className={ic()} />
                          </Field>
                          <Field label="Built-up Area Max (sq.ft)">
                            <Input type="number" value={cfg.builtUpAreaMax ?? ""} onChange={(e) => updateConfig(cfg.id, "builtUpAreaMax", parseInt(e.target.value) || 0)} placeholder="3500" className={ic()} />
                          </Field>
                          <Field label="Plot Size (sq.yds)" hint="Plot area of the villa">
                            <Input type="number" value={cfg.plotSizeMin ?? ""} onChange={(e) => updateConfig(cfg.id, "plotSizeMin", parseInt(e.target.value) || 0)} placeholder="150" className={ic()} />
                          </Field>
                        </>
                      ) : (
                        <>
                          <Field label="Built-up Area Min (sq.ft)">
                            <Input type="number" value={cfg.builtUpAreaMin ?? ""} onChange={(e) => updateConfig(cfg.id, "builtUpAreaMin", parseInt(e.target.value) || 0)} placeholder="1000" className={ic()} />
                          </Field>
                          <Field label="Built-up Area Max (sq.ft)">
                            <Input type="number" value={cfg.builtUpAreaMax ?? ""} onChange={(e) => updateConfig(cfg.id, "builtUpAreaMax", parseInt(e.target.value) || 0)} placeholder="1500" className={ic()} />
                          </Field>
                          <Field label="Price per sq.ft (₹)">
                            <Input type="number" value={cfg.pricePerUnit ?? ""} onChange={(e) => updateConfig(cfg.id, "pricePerUnit", parseInt(e.target.value) || 0)} placeholder="5500" className={ic()} />
                          </Field>
                        </>
                      )}

                      {/* Floor plan / Layout upload */}
                      <div className="sm:col-span-2">
                        <UploadField
                          label={projectType === "venture" ? "Layout Map / Plot Plan" : "Floor Plan Image"}
                          accept="image/*"
                          value={cfg.floorPlanUrl ?? ""}
                          onChange={(v) => updateConfig(cfg.id, "floorPlanUrl", v)}
                          onFile={(f) => handleFloorPlanFile(f, cfg.id)}
                          uploading={uploading[`fp-${cfg.id}`]}
                          hint="Shows on the detail page for this configuration"
                        />
                      </div>

                      {/* Possession date */}
                      <Field label="Possession Date" hint='e.g. "Dec 2028"'>
                        <Input value={cfg.possessionDate ?? ""} onChange={(e) => updateConfig(cfg.id, "possessionDate", e.target.value)} placeholder="Dec 2028" className={ic()} />
                      </Field>
                    </div>
                  </div>
                ))}
              </div>

              <Button type="button" variant="outline" onClick={addConfig} className="gap-2 w-full rounded-xl">
                <Plus className="w-4 h-4" />
                Add {projectType === "venture" ? "Plot Type" : "Configuration"}
              </Button>
            </Card>

            {/* Phases */}
            <Card title="Construction Phases">
              <div className="space-y-3">
                {phases.map((ph, idx) => (
                  <div key={ph.id} className="p-4 rounded-2xl border border-border-default bg-bg-primary space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-text-primary">Phase #{idx + 1}</span>
                      {phases.length > 1 && (
                        <button onClick={() => removePhase(ph.id)} className="p-1 rounded-lg hover:bg-red-500/10 text-red-400">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Phase Name">
                        <Input value={ph.name} onChange={(e) => updatePhase(ph.id, "name", e.target.value)} placeholder="Phase 1 / Tower A" className={ic()} />
                      </Field>
                      <Field label="Status">
                        <select value={ph.status} onChange={(e) => updatePhase(ph.id, "status", e.target.value)} className={ic()}>
                          {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      </Field>
                      <Field label="Possession Date">
                        <Input value={ph.possessionDate ?? ""} onChange={(e) => updatePhase(ph.id, "possessionDate", e.target.value)} placeholder="Dec 2028" className={ic()} />
                      </Field>
                      <Field label={projectType === "venture" ? "Total Plots in Phase" : "Total Units"}>
                        <Input type="number" value={ph.totalUnits ?? ""} onChange={(e) => updatePhase(ph.id, "totalUnits", parseInt(e.target.value) || undefined)} placeholder="100" className={ic()} />
                      </Field>
                    </div>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" onClick={addPhase} className="gap-2 w-full rounded-xl">
                <Plus className="w-4 h-4" /> Add Phase
              </Button>
            </Card>
          </div>
        )}

        {/* ═══════════════ STEP 3 — MEDIA & HIGHLIGHTS ═══════════════ */}
        {step === 2 && (
          <div className="space-y-5">
            {/* Gallery */}
            <Card title="Project Gallery">
              <p className="text-xs text-text-secondary -mt-2">
                Add photos — paste a URL or upload from your device. These power the gallery tabs on the detail page.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <Field label="Image URL or upload">
                    <div className="flex gap-2">
                      <Input value={newImgUrl} onChange={(e) => setNewImgUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addImageUrl()} placeholder="https://…" className={ic("flex-1")} />
                      <Button type="button" variant="amber" onClick={addImageUrl} className="shrink-0 rounded-xl px-4">Add</Button>
                    </div>
                  </Field>
                </div>
                <Field label="Category">
                  <select value={newImgCat} onChange={(e) => setNewImgCat(e.target.value as ProjectImage["category"])} className={ic()}>
                    <option value="aerial">Aerial</option>
                    <option value="exterior">Exterior</option>
                    <option value="interior">Interior</option>
                    <option value="amenity">Amenity</option>
                    <option value="outdoor">Outdoor</option>
                    <option value="floor-plan">Floor Plan</option>
                  </select>
                </Field>
              </div>

              {/* Upload button */}
              <label className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${uploading.gallery ? "border-amber-primary/40 bg-amber-primary/5 pointer-events-none" : "border-border-default hover:border-amber-primary/50"}`}>
                {uploading.gallery ? <Loader2 className="w-5 h-5 text-amber-primary animate-spin" /> : <Upload className="w-5 h-5 text-text-tertiary" />}
                <div>
                  <p className="text-sm font-medium text-text-primary">{uploading.gallery ? "Uploading…" : "Upload image from device"}</p>
                  <p className="text-xs text-text-tertiary">JPG, PNG, WebP</p>
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageFile(f); e.target.value = ""; }} />
              </label>

              {/* Image grid */}
              {images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {images.map((img) => (
                    <div key={img.id} className="relative group rounded-xl overflow-hidden border border-border-default aspect-video bg-bg-primary">
                      <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                        <button onClick={() => { setCoverImage(img.url); toast.success("Cover set!"); }}
                          className="p-1.5 rounded-full bg-amber-primary text-slate-950 hover:scale-110 transition" title="Set as cover">
                          <Star className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => removeImage(img.id)}
                          className="p-1.5 rounded-full bg-red-500 text-white hover:scale-110 transition">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[10px] bg-black/70 text-white capitalize">{img.category}</span>
                      {img.url === coverImage && <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-primary text-slate-950">Cover</span>}
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Video & Brochure */}
            <Card title="Video & Brochure">
              <Field label="YouTube Video URL">
                <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://youtube.com/watch?v=…" className={ic()} />
              </Field>
              <UploadField
                label="Brochure / PDF"
                accept="application/pdf"
                value={brochureUrl}
                onChange={setBrochureUrl}
                onFile={handleBrochureFile}
                uploading={uploading.brochure}
                hint="Upload a PDF or paste a direct link to the brochure"
              />
            </Card>

            {/* Highlights */}
            <Card title="Why Consider This Project?">
              <p className="text-xs text-text-secondary -mt-2">Bullet points shown on the detail page to convince buyers.</p>
              <div className="space-y-2">
                {highlights.map((h, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input value={h}
                      onChange={(e) => setHighlights((p) => p.map((x, j) => j === i ? e.target.value : x))}
                      placeholder={`Highlight ${i + 1}…`} className={ic("flex-1")} />
                    {highlights.length > 1 && (
                      <button onClick={() => setHighlights((p) => p.filter((_, j) => j !== i))}
                        className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 shrink-0">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" onClick={() => setHighlights((p) => [...p, ""])} className="gap-2 rounded-xl">
                <Plus className="w-4 h-4" /> Add Highlight
              </Button>
            </Card>

            {/* Facilities */}
            <Card title="Facilities & Amenities">
              <div className="flex flex-wrap gap-2">
                {FACILITIES_LIST.map((f) => {
                  const active = facilities.includes(f);
                  return (
                    <button key={f} type="button" onClick={() => toggleFacility(f)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${active ? "bg-amber-primary/10 border-amber-primary/50 text-amber-primary" : "border-border-default text-text-secondary hover:border-amber-primary/30"}`}
                    >
                      {active && <Check className="w-3 h-3 inline mr-1" />}{f}
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>
        )}

        {/* ═══════════════ STEP 4 — REVIEW & PUBLISH ═══════════════ */}
        {step === 3 && (
          <div className="space-y-5">
            <Card title="Live Preview">
              <div className="rounded-2xl border border-border-default overflow-hidden">
                {(coverImage || images[0]?.url) && (
                  <img src={coverImage || images[0]?.url} alt={name} className="w-full h-48 object-cover" />
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-bold text-lg text-text-primary">{name || "Project Name"}</h2>
                    {builderLogoUrl && <img src={builderLogoUrl} alt={builderName} className="h-8 object-contain max-w-[80px]" />}
                  </div>
                  <p className="text-text-secondary text-sm mt-1">{tagline || description || "No description"}</p>
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-text-secondary">
                    <MapPin className="w-3.5 h-3.5" /> {locality}, {city}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3 text-xs">
                    {reraApproved && <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 border border-green-500/20 font-semibold">✓ RERA</span>}
                    {noBrokerage && <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20 font-semibold">No Brokerage</span>}
                    <span className="px-2 py-0.5 rounded-full bg-bg-primary border border-border-default text-text-secondary capitalize">{projectType}</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-primary/10 text-amber-primary border border-amber-primary/20">{constructionStatus.replace(/-/g, " ")}</span>
                  </div>
                  <p className="text-xs text-text-tertiary mt-3">
                    {configs.length} config{configs.length !== 1 ? "s" : ""} • {phases.length} phase{phases.length !== 1 ? "s" : ""} • {images.length} image{images.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </Card>

            <Card title="Publish Settings">
              <Toggle on={isFeatured} onToggle={() => setIsFeatured((v) => !v)}
                label="Feature this project"
                sub="Show in the Featured Projects section on the homepage" />
            </Card>

            {/* Action buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button type="button" disabled={submitting} onClick={() => handleSubmit(false)}
                className="flex items-center justify-center gap-2 h-14 rounded-2xl border-2 border-border-default bg-bg-card text-text-primary font-semibold hover:border-amber-primary/50 transition-all disabled:opacity-50">
                <Save className="w-5 h-5" /> Save as Draft
              </button>
              <button type="button" disabled={submitting} onClick={() => handleSubmit(true)}
                className="flex items-center justify-center gap-2 h-14 rounded-2xl bg-amber-primary text-slate-950 font-bold hover:bg-amber-500 transition-all disabled:opacity-50 shadow-lg">
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Eye className="w-5 h-5" />}
                Publish Project
              </button>
            </div>
          </div>
        )}

        {/* ── Navigation ── */}
        <div className={`mt-8 flex items-center ${step === 0 ? "justify-end" : "justify-between"}`}>
          {step > 0 && (
            <Button variant="outline" onClick={prev} className="gap-2 rounded-xl">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          )}
          {step < 3 && (
            <Button variant="amber" onClick={next} className="gap-2 rounded-xl">
              Next <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
