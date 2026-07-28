"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useProjectsStore } from "@/stores/projects-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowRight, Building2, Home, Landmark,
  Plus, Trash2, Check, ChevronDown, ChevronUp, X,
  Image as ImageIcon, Video, FileText, Star, Eye,
  MapPin, Save, CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import type { Project, ProjectType, ProjectConfig, ProjectPhase, ProjectImage, ConstructionStatus } from "@/types/project";

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
  { value: "new-launch",         label: "New Launch",           desc: "Freshly announced project" },
  { value: "under-construction", label: "Under Construction",   desc: "Actively being built" },
  { value: "ready-to-move",      label: "Ready to Move",        desc: "Fully completed & handed over" },
];

// ─── Helper: empty config ────────────────────────────────────────────────────

function emptyConfig(projectType: ProjectType): ProjectConfig {
  return {
    id: `cfg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label: projectType === "venture" ? "Residential Plot" : "2 BHK",
    bedrooms: projectType === "venture" ? undefined : 2,
    builtUpAreaMin: projectType === "venture" ? undefined : 1000,
    builtUpAreaMax: projectType === "venture" ? undefined : 1500,
    plotSizeMin: projectType === "venture" ? 150 : undefined,
    plotSizeMax: projectType === "venture" ? 200 : undefined,
    priceMin: 0,
    priceMax: 0,
    pricePerUnit: 0,
    floorPlanUrl: "",
    constructionStatus: "under-construction",
    possessionDate: "",
  };
}

function emptyPhase(): ProjectPhase {
  return {
    id: `ph-${Date.now()}`,
    name: "Phase 1",
    status: "under-construction",
    possessionDate: "Dec 2028",
    totalUnits: undefined,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
            i < current
              ? "bg-amber-primary text-slate-950"
              : i === current
              ? "bg-amber-primary/20 border-2 border-amber-primary text-amber-primary"
              : "bg-bg-primary border border-border-default text-text-tertiary"
          }`}>
            {i < current ? <Check className="w-4 h-4" /> : i + 1}
          </div>
          <span className={`hidden sm:block text-sm font-medium ${i === current ? "text-text-primary" : "text-text-tertiary"}`}>
            {label}
          </span>
          {i < total - 1 && (
            <div className={`w-8 sm:w-12 h-0.5 rounded-full ${i < current ? "bg-amber-primary" : "bg-border-default"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-bg-card border border-border-default rounded-2xl p-6 space-y-5">
      <h3 className="font-bold text-text-primary text-base">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, required, children, hint }: { label: string; required?: boolean; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-text-primary">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-text-tertiary">{hint}</p>}
    </div>
  );
}

function inputCls(extra = "") {
  return `w-full px-4 py-2.5 rounded-xl border border-border-default bg-bg-primary text-text-primary text-sm placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-amber-primary/40 focus:border-amber-primary transition ${extra}`;
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface ProjectFormProps {
  initialData?: Project;
  mode: "new" | "edit";
}

export function ProjectForm({ initialData, mode }: ProjectFormProps) {
  const router = useRouter();
  const { addProject, updateProject } = useProjectsStore();

  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Step 1 state ──
  const [projectType, setProjectType] = useState<ProjectType>(initialData?.projectType ?? "apartment");
  const [name, setName] = useState(initialData?.name ?? "");
  const [tagline, setTagline] = useState(initialData?.tagline ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [builderName, setBuilderName] = useState(initialData?.builderName ?? "");
  const [builderLogoUrl, setBuilderLogoUrl] = useState(initialData?.builderLogoUrl ?? "");
  const [builderPhone, setBuilderPhone] = useState(initialData?.builderPhone ?? "");
  const [builderWhatsapp, setBuilderWhatsapp] = useState(initialData?.builderWhatsapp ?? "");
  const [reraId, setReraId] = useState(initialData?.reraId ?? "");
  const [reraApproved, setReraApproved] = useState(initialData?.reraApproved ?? false);
  const [noBrokerage, setNoBrokerage] = useState(initialData?.noBrokerage ?? false);
  const [constructionStatus, setConstructionStatus] = useState<ConstructionStatus>(initialData?.constructionStatus ?? "under-construction");
  const [totalUnits, setTotalUnits] = useState(initialData?.totalUnits?.toString() ?? "");
  const [totalArea, setTotalArea] = useState(initialData?.totalArea ?? "");
  // Location
  const [address, setAddress] = useState(initialData?.location.address ?? "");
  const [locality, setLocality] = useState(initialData?.location.locality ?? "");
  const [city, setCity] = useState(initialData?.location.city ?? "Vijayawada");
  const [state, setState] = useState(initialData?.location.state ?? "Andhra Pradesh");
  const [pincode, setPincode] = useState(initialData?.location.pincode ?? "");
  const [lat, setLat] = useState(initialData?.location.latitude?.toString() ?? "16.5062");
  const [lng, setLng] = useState(initialData?.location.longitude?.toString() ?? "80.6480");

  // ── Step 2 state ──
  const [configs, setConfigs] = useState<ProjectConfig[]>(
    initialData?.configurations?.length ? initialData.configurations : [emptyConfig(projectType)]
  );
  const [phases, setPhases] = useState<ProjectPhase[]>(
    initialData?.phases?.length ? initialData.phases : [emptyPhase()]
  );

  // ── Step 3 state ──
  const [images, setImages] = useState<ProjectImage[]>(initialData?.images ?? []);
  const [newImgUrl, setNewImgUrl] = useState("");
  const [newImgCat, setNewImgCat] = useState<ProjectImage["category"]>("exterior");
  const [coverImage, setCoverImage] = useState(initialData?.coverImage ?? "");
  const [videoUrl, setVideoUrl] = useState(initialData?.videoUrl ?? "");
  const [brochureUrl, setBrochureUrl] = useState(initialData?.brochureUrl ?? "");
  const [highlights, setHighlights] = useState<string[]>(initialData?.highlights?.length ? initialData.highlights : [""]);
  const [facilities, setFacilities] = useState<string[]>(initialData?.facilities ?? []);

  // ── Step 4 state ──
  const [isFeatured, setIsFeatured] = useState(initialData?.isFeatured ?? false);
  const [isPublished, setIsPublished] = useState(initialData?.isPublished ?? false);

  // ─── Config helpers ─────────────────────────────────────────────────────────

  const updateConfig = (id: string, field: keyof ProjectConfig, value: any) => {
    setConfigs((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };
  const addConfig = () => setConfigs((prev) => [...prev, emptyConfig(projectType)]);
  const removeConfig = (id: string) => setConfigs((prev) => prev.filter((c) => c.id !== id));

  const updatePhase = (id: string, field: keyof ProjectPhase, value: any) => {
    setPhases((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };
  const addPhase = () => setPhases((prev) => [...prev, emptyPhase()]);
  const removePhase = (id: string) => setPhases((prev) => prev.filter((p) => p.id !== id));

  const addImage = () => {
    if (!newImgUrl.trim()) return;
    const img: ProjectImage = {
      id: `img-${Date.now()}`,
      url: newImgUrl.trim(),
      alt: name || "Project image",
      category: newImgCat,
      isPrimary: images.length === 0,
    };
    setImages((prev) => [...prev, img]);
    if (!coverImage && img.isPrimary) setCoverImage(img.url);
    setNewImgUrl("");
  };
  const removeImage = (id: string) => setImages((prev) => prev.filter((i) => i.id !== id));

  const toggleFacility = (f: string) => {
    setFacilities((prev) => prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]);
  };

  // ─── Validation per step ────────────────────────────────────────────────────

  const validateStep = (s: number) => {
    if (s === 0) {
      if (!name.trim()) { toast.error("Project name is required."); return false; }
      if (!builderName.trim()) { toast.error("Builder name is required."); return false; }
      if (!locality.trim() || !city.trim()) { toast.error("Location (locality & city) is required."); return false; }
    }
    if (s === 1) {
      if (!configs.length) { toast.error("Add at least one configuration."); return false; }
    }
    return true;
  };

  const next = () => { if (validateStep(step)) setStep((s) => Math.min(s + 1, 3)); };
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  // ─── Build slug ─────────────────────────────────────────────────────────────

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  // ─── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async (publish: boolean) => {
    if (!validateStep(0)) { setStep(0); return; }
    setIsSubmitting(true);

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
      location: {
        address: address.trim(),
        locality: locality.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim() || undefined,
        latitude: parseFloat(lat) || 16.5062,
        longitude: parseFloat(lng) || 80.6480,
      },
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
        toast.success(publish ? "Project published!" : "Project saved as draft.");
      } else {
        await updateProject(project.id, project);
        toast.success("Project updated!");
      }
      setTimeout(() => router.push("/admin/projects"), 1200);
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  };

  // ─── Render helpers ─────────────────────────────────────────────────────────

  const bhkOptions = ["1 BHK", "2 BHK", "3 BHK", "4 BHK", "4+ BHK", "Penthouse", "Duplex"];
  const plotTypes = ["Residential Plot", "Commercial Plot", "Corner Plot", "Park-Facing Plot"];

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-bg-primary pb-32">
      <div className="max-w-4xl mx-auto px-4 md:px-6 pt-8">
        {/* Page Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/admin/projects" className="p-2 rounded-xl border border-border-default hover:bg-bg-card text-text-secondary hover:text-text-primary transition-all">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-heading text-text-primary">
              {mode === "new" ? "Add New Project" : `Edit: ${name || "Project"}`}
            </h1>
            <p className="text-sm text-text-secondary mt-0.5">
              {mode === "new" ? "Create a new builder project listing" : "Update project details"}
            </p>
          </div>
        </div>

        <StepIndicator current={step} total={4} />

        {/* ──────────────────────────── STEP 1: Type & Basics ──────────────────────────── */}
        {step === 0 && (
          <div className="space-y-6">
            {/* Project Type Selector */}
            <SectionCard title="Project Type">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {(["apartment", "villa", "venture"] as ProjectType[]).map((type) => {
                  const icons = { apartment: Building2, villa: Home, venture: Landmark };
                  const descs = {
                    apartment: "Multi-storey residential apartments with BHK configs",
                    villa:     "Independent villas / row houses on plots",
                    venture:   "Gated layout plots — residential or commercial",
                  };
                  const colors = {
                    apartment: "border-blue-500 bg-blue-500/5 text-blue-500",
                    villa:     "border-emerald-500 bg-emerald-500/5 text-emerald-500",
                    venture:   "border-amber-500 bg-amber-500/5 text-amber-500",
                  };
                  const Icon = icons[type];
                  const isActive = projectType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => { setProjectType(type); setConfigs([emptyConfig(type)]); }}
                      className={`p-5 rounded-2xl border-2 text-left transition-all relative ${
                        isActive ? colors[type] : "border-border-default bg-bg-card hover:border-border-default/60"
                      }`}
                    >
                      {isActive && <CheckCircle2 className="w-4 h-4 absolute top-3 right-3" />}
                      <Icon className={`w-7 h-7 mb-3 ${isActive ? "" : "text-text-tertiary"}`} />
                      <p className={`font-bold capitalize text-base ${isActive ? "" : "text-text-primary"}`}>{type}</p>
                      <p className="text-xs mt-1 text-text-secondary leading-relaxed">{descs[type]}</p>
                    </button>
                  );
                })}
              </div>
            </SectionCard>

            {/* Project Identity */}
            <SectionCard title="Project Identity">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Project Name" required>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Lansum Evana" className={inputCls()} />
                </Field>
                <Field label="Tagline">
                  <Input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="e.g. Life elevated, above the rest" className={inputCls()} />
                </Field>
              </div>
              <Field label="Project Description">
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
                  placeholder="Brief overview of the project..." className={inputCls("resize-none")} />
              </Field>
            </SectionCard>

            {/* Builder Info */}
            <SectionCard title="Builder / Developer">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Builder Name" required>
                  <Input value={builderName} onChange={(e) => setBuilderName(e.target.value)} placeholder="e.g. Lansum Properties LLP" className={inputCls()} />
                </Field>
                <Field label="Builder Logo URL" hint="Paste a direct image link">
                  <Input value={builderLogoUrl} onChange={(e) => setBuilderLogoUrl(e.target.value)} placeholder="https://..." className={inputCls()} />
                </Field>
                <Field label="Builder Phone">
                  <Input value={builderPhone} onChange={(e) => setBuilderPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" className={inputCls()} />
                </Field>
                <Field label="Builder WhatsApp">
                  <Input value={builderWhatsapp} onChange={(e) => setBuilderWhatsapp(e.target.value)} placeholder="+91 XXXXX XXXXX" className={inputCls()} />
                </Field>
              </div>
            </SectionCard>

            {/* Compliance & Status */}
            <SectionCard title="Compliance & Status">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="RERA ID">
                  <Input value={reraId} onChange={(e) => setReraId(e.target.value)} placeholder="AP-RERA-XXXX-XXXX" className={inputCls()} />
                </Field>
                <div className="flex flex-col gap-3 pt-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div onClick={() => setReraApproved((v) => !v)} className={`w-10 h-6 rounded-full relative transition-colors cursor-pointer ${reraApproved ? "bg-amber-primary" : "bg-border-default"}`}>
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${reraApproved ? "left-5" : "left-1"}`} />
                    </div>
                    <span className="text-sm text-text-primary">RERA Approved</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div onClick={() => setNoBrokerage((v) => !v)} className={`w-10 h-6 rounded-full relative transition-colors cursor-pointer ${noBrokerage ? "bg-amber-primary" : "bg-border-default"}`}>
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${noBrokerage ? "left-5" : "left-1"}`} />
                    </div>
                    <span className="text-sm text-text-primary">No Brokerage</span>
                  </label>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary mb-3">Construction Status</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {STATUSES.map((s) => (
                    <button key={s.value} type="button" onClick={() => setConstructionStatus(s.value)}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        constructionStatus === s.value
                          ? "border-amber-primary bg-amber-primary/10"
                          : "border-border-default bg-bg-card"
                      }`}
                    >
                      <p className="text-sm font-semibold text-text-primary">{s.label}</p>
                      <p className="text-xs text-text-tertiary mt-0.5">{s.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
              {(projectType === "villa" || projectType === "venture") && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Total Units" hint="e.g. 251 villas">
                    <Input value={totalUnits} onChange={(e) => setTotalUnits(e.target.value)} type="number" placeholder="251" className={inputCls()} />
                  </Field>
                  <Field label="Total Area" hint='e.g. "34 acres"'>
                    <Input value={totalArea} onChange={(e) => setTotalArea(e.target.value)} placeholder="34 acres" className={inputCls()} />
                  </Field>
                </div>
              )}
            </SectionCard>

            {/* Location */}
            <SectionCard title="Location">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Address">
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Full address" className={inputCls()} />
                </Field>
                <Field label="Locality / Area" required>
                  <Input value={locality} onChange={(e) => setLocality(e.target.value)} placeholder="e.g. Chevella" className={inputCls()} />
                </Field>
                <Field label="City" required>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Vijayawada" className={inputCls()} />
                </Field>
                <Field label="State">
                  <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="Andhra Pradesh" className={inputCls()} />
                </Field>
                <Field label="Pincode">
                  <Input value={pincode} onChange={(e) => setPincode(e.target.value)} placeholder="500xxx" className={inputCls()} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Latitude" hint="Google Maps decimal">
                  <Input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="16.5062" className={inputCls()} />
                </Field>
                <Field label="Longitude">
                  <Input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="80.6480" className={inputCls()} />
                </Field>
              </div>
            </SectionCard>
          </div>
        )}

        {/* ──────────────────────────── STEP 2: Configurations ─────────────────────── */}
        {step === 1 && (
          <div className="space-y-6">
            {/* Configurations */}
            <SectionCard title={
              projectType === "apartment" ? "BHK Configurations"
              : projectType === "villa"   ? "Villa Configurations"
              : "Plot Types"
            }>
              <p className="text-sm text-text-secondary -mt-3">
                {projectType === "apartment" && "Add each BHK variant with area range and price."}
                {projectType === "villa"     && "Add each villa type with area and pricing details."}
                {projectType === "venture"   && "Add plot types (Residential, Commercial, Corner, etc.) with sizes and prices."}
              </p>
              <div className="space-y-4">
                {configs.map((cfg, idx) => (
                  <div key={cfg.id} className="p-4 rounded-2xl border border-border-default bg-bg-primary space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-text-primary">
                        {projectType === "venture" ? "Plot Type" : "Config"} #{idx + 1}
                      </span>
                      {configs.length > 1 && (
                        <button onClick={() => removeConfig(cfg.id)} className="p-1 rounded-lg hover:bg-red-500/10 text-red-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Label */}
                      <Field label="Label">
                        {projectType === "venture" ? (
                          <select value={cfg.label} onChange={(e) => updateConfig(cfg.id, "label", e.target.value)} className={inputCls()}>
                            {plotTypes.map((pt) => <option key={pt}>{pt}</option>)}
                          </select>
                        ) : (
                          <select value={cfg.label} onChange={(e) => updateConfig(cfg.id, "label", e.target.value)} className={inputCls()}>
                            {bhkOptions.map((o) => <option key={o}>{o}</option>)}
                          </select>
                        )}
                      </Field>

                      {/* Area fields */}
                      {projectType !== "venture" ? (
                        <>
                          <Field label="Built-up Area Min (sq.ft)">
                            <Input type="number" value={cfg.builtUpAreaMin ?? ""} onChange={(e) => updateConfig(cfg.id, "builtUpAreaMin", parseInt(e.target.value) || 0)} placeholder="1000" className={inputCls()} />
                          </Field>
                          <Field label="Built-up Area Max (sq.ft)">
                            <Input type="number" value={cfg.builtUpAreaMax ?? ""} onChange={(e) => updateConfig(cfg.id, "builtUpAreaMax", parseInt(e.target.value) || 0)} placeholder="1500" className={inputCls()} />
                          </Field>
                        </>
                      ) : (
                        <>
                          <Field label="Plot Size Min (sq.yds)">
                            <Input type="number" value={cfg.plotSizeMin ?? ""} onChange={(e) => updateConfig(cfg.id, "plotSizeMin", parseInt(e.target.value) || 0)} placeholder="150" className={inputCls()} />
                          </Field>
                          <Field label="Plot Size Max (sq.yds)">
                            <Input type="number" value={cfg.plotSizeMax ?? ""} onChange={(e) => updateConfig(cfg.id, "plotSizeMax", parseInt(e.target.value) || 0)} placeholder="300" className={inputCls()} />
                          </Field>
                          <Field label="Price per sq.yd (₹)">
                            <Input type="number" value={cfg.pricePerUnit ?? ""} onChange={(e) => updateConfig(cfg.id, "pricePerUnit", parseInt(e.target.value) || 0)} placeholder="15000" className={inputCls()} />
                          </Field>
                        </>
                      )}

                      {/* Prices */}
                      <Field label="Price Min (₹)">
                        <Input type="number" value={cfg.priceMin || ""} onChange={(e) => updateConfig(cfg.id, "priceMin", parseInt(e.target.value) || 0)} placeholder="3500000" className={inputCls()} />
                      </Field>
                      <Field label="Price Max (₹)">
                        <Input type="number" value={cfg.priceMax || ""} onChange={(e) => updateConfig(cfg.id, "priceMax", parseInt(e.target.value) || 0)} placeholder="5500000" className={inputCls()} />
                      </Field>

                      {/* Floor plan / Layout URL */}
                      <Field label={projectType === "venture" ? "Layout Map URL" : "Floor Plan Image URL"} hint="Paste a direct image link">
                        <Input value={cfg.floorPlanUrl ?? ""} onChange={(e) => updateConfig(cfg.id, "floorPlanUrl", e.target.value)} placeholder="https://..." className={inputCls()} />
                      </Field>

                      {/* Possession date */}
                      <Field label="Possession Date" hint='e.g. "Dec 2028"'>
                        <Input value={cfg.possessionDate ?? ""} onChange={(e) => updateConfig(cfg.id, "possessionDate", e.target.value)} placeholder="Dec 2028" className={inputCls()} />
                      </Field>
                    </div>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" onClick={addConfig} className="gap-2 w-full rounded-xl">
                <Plus className="w-4 h-4" /> Add {projectType === "venture" ? "Plot Type" : "Configuration"}
              </Button>
            </SectionCard>

            {/* Construction Phases */}
            <SectionCard title="Construction Phases">
              <p className="text-sm text-text-secondary -mt-3">Break down the project into construction phases.</p>
              <div className="space-y-4">
                {phases.map((phase, idx) => (
                  <div key={phase.id} className="p-4 rounded-2xl border border-border-default bg-bg-primary space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-text-primary">Phase #{idx + 1}</span>
                      {phases.length > 1 && (
                        <button onClick={() => removePhase(phase.id)} className="p-1 rounded-lg hover:bg-red-500/10 text-red-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Field label="Phase Name">
                        <Input value={phase.name} onChange={(e) => updatePhase(phase.id, "name", e.target.value)} placeholder="Phase 1 / Tower A" className={inputCls()} />
                      </Field>
                      <Field label="Status">
                        <select value={phase.status} onChange={(e) => updatePhase(phase.id, "status", e.target.value)} className={inputCls()}>
                          {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      </Field>
                      <Field label="Possession Date">
                        <Input value={phase.possessionDate ?? ""} onChange={(e) => updatePhase(phase.id, "possessionDate", e.target.value)} placeholder="Dec 2028" className={inputCls()} />
                      </Field>
                      <Field label="Total Units in Phase">
                        <Input type="number" value={phase.totalUnits ?? ""} onChange={(e) => updatePhase(phase.id, "totalUnits", parseInt(e.target.value) || undefined)} placeholder="100" className={inputCls()} />
                      </Field>
                    </div>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" onClick={addPhase} className="gap-2 w-full rounded-xl">
                <Plus className="w-4 h-4" /> Add Phase
              </Button>
            </SectionCard>
          </div>
        )}

        {/* ──────────────────────────── STEP 3: Media & Highlights ─────────────────── */}
        {step === 2 && (
          <div className="space-y-6">
            {/* Gallery */}
            <SectionCard title="Project Gallery">
              <p className="text-sm text-text-secondary -mt-3">Add photos categorized by type — these power the gallery tabs on the public page.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Field label="Image URL">
                    <Input value={newImgUrl} onChange={(e) => setNewImgUrl(e.target.value)} placeholder="https://..." className={inputCls()} />
                  </Field>
                </div>
                <Field label="Category">
                  <select value={newImgCat} onChange={(e) => setNewImgCat(e.target.value as ProjectImage["category"])} className={inputCls()}>
                    <option value="aerial">Aerial</option>
                    <option value="exterior">Exterior</option>
                    <option value="interior">Interior</option>
                    <option value="amenity">Amenity</option>
                    <option value="outdoor">Outdoor</option>
                    <option value="floor-plan">Floor Plan</option>
                  </select>
                </Field>
              </div>
              <Button type="button" variant="outline" onClick={addImage} className="gap-2 rounded-xl">
                <Plus className="w-4 h-4" /> Add Image
              </Button>

              {images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
                  {images.map((img) => (
                    <div key={img.id} className="relative group rounded-xl overflow-hidden border border-border-default aspect-video bg-bg-primary">
                      <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button onClick={() => { setCoverImage(img.url); toast.success("Cover set!"); }}
                          className="p-1.5 rounded-full bg-amber-primary text-slate-950 hover:scale-110 transition" title="Set as cover">
                          <Star className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => removeImage(img.id)}
                          className="p-1.5 rounded-full bg-red-500 text-white hover:scale-110 transition" title="Remove">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded text-[10px] font-medium bg-black/70 text-white capitalize">{img.category}</span>
                      {img.url === coverImage && (
                        <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-primary text-slate-950">Cover</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* Video & Brochure */}
            <SectionCard title="Video & Brochure">
              <Field label="Video URL (YouTube)" hint="Paste a YouTube link — it will be embedded on the project page">
                <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." className={inputCls()} />
              </Field>
              <Field label="Brochure PDF URL" hint="Paste a direct link to the brochure PDF">
                <Input value={brochureUrl} onChange={(e) => setBrochureUrl(e.target.value)} placeholder="https://..." className={inputCls()} />
              </Field>
            </SectionCard>

            {/* Highlights */}
            <SectionCard title="Why Consider This Project?">
              <p className="text-sm text-text-secondary -mt-3">These appear as bullet points on the project page to convince buyers.</p>
              <div className="space-y-2">
                {highlights.map((h, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={h}
                      onChange={(e) => setHighlights((prev) => prev.map((x, j) => j === i ? e.target.value : x))}
                      placeholder={`Highlight ${i + 1}…`}
                      className={inputCls("flex-1")}
                    />
                    {highlights.length > 1 && (
                      <button onClick={() => setHighlights((prev) => prev.filter((_, j) => j !== i))}
                        className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 hover:text-red-500 transition-colors shrink-0">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" onClick={() => setHighlights((prev) => [...prev, ""])} className="gap-2 rounded-xl">
                <Plus className="w-4 h-4" /> Add Highlight
              </Button>
            </SectionCard>

            {/* Facilities */}
            <SectionCard title="Facilities & Amenities">
              <p className="text-sm text-text-secondary -mt-3">Select all amenities available in this project.</p>
              <div className="flex flex-wrap gap-2">
                {FACILITIES_LIST.map((f) => {
                  const active = facilities.includes(f);
                  return (
                    <button key={f} type="button" onClick={() => toggleFacility(f)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                        active
                          ? "bg-amber-primary/10 border-amber-primary/50 text-amber-primary"
                          : "bg-bg-primary border-border-default text-text-secondary hover:border-amber-primary/30"
                      }`}
                    >
                      {active && <Check className="w-3 h-3 inline mr-1" />}
                      {f}
                    </button>
                  );
                })}
              </div>
            </SectionCard>
          </div>
        )}

        {/* ──────────────────────────── STEP 4: Review & Publish ───────────────────── */}
        {step === 3 && (
          <div className="space-y-6">
            <SectionCard title="Review Summary">
              <div className="space-y-4">
                {/* Project card preview */}
                <div className="rounded-2xl border border-border-default overflow-hidden">
                  {(coverImage || images[0]?.url) && (
                    <img src={coverImage || images[0]?.url} alt={name} className="w-full h-48 object-cover" />
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h2 className="font-bold text-lg text-text-primary">{name || "Project Name"}</h2>
                      {builderLogoUrl && <img src={builderLogoUrl} alt={builderName} className="h-8 object-contain" />}
                    </div>
                    <p className="text-text-secondary text-sm mb-3">{tagline || description || "No description"}</p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {reraApproved && <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-600 font-semibold border border-green-500/20">✓ RERA</span>}
                      {noBrokerage && <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 font-semibold border border-blue-500/20">No Brokerage</span>}
                      <span className="px-2 py-0.5 rounded bg-bg-primary text-text-secondary border border-border-default capitalize">{projectType}</span>
                      <span className="px-2 py-0.5 rounded bg-amber-primary/10 text-amber-primary border border-amber-primary/20">
                        {constructionStatus.replace(/-/g, " ")}
                      </span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-border-default text-sm text-text-secondary">
                      <div className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {locality}, {city}</div>
                    </div>
                    <div className="mt-2 text-sm text-text-secondary">
                      {configs.length} configuration{configs.length !== 1 ? "s" : ""} • {phases.length} phase{phases.length !== 1 ? "s" : ""} • {images.length} image{images.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>

                {/* Publish settings */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <label className="flex items-center gap-3 cursor-pointer p-4 rounded-2xl border border-border-default bg-bg-card">
                    <div onClick={() => setIsFeatured((v) => !v)} className={`w-10 h-6 rounded-full relative transition-colors cursor-pointer ${isFeatured ? "bg-amber-primary" : "bg-border-default"}`}>
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${isFeatured ? "left-5" : "left-1"}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-text-primary text-sm">Feature this project</p>
                      <p className="text-xs text-text-secondary">Show on homepage Featured Projects</p>
                    </div>
                  </label>
                </div>
              </div>
            </SectionCard>

            {/* Action buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSubmit(false)}
                className="flex items-center justify-center gap-2 h-14 rounded-2xl border-2 border-border-default bg-bg-card text-text-primary font-semibold text-base hover:border-amber-primary/50 transition-all disabled:opacity-50"
              >
                <Save className="w-5 h-5" />
                Save as Draft
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSubmit(true)}
                className="flex items-center justify-center gap-2 h-14 rounded-2xl bg-amber-primary text-slate-950 font-bold text-base hover:bg-amber-500 transition-all disabled:opacity-50 shadow-lg"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
                Publish Project
              </button>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
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
