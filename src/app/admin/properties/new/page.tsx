"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { usePropertiesStore } from "@/stores/properties-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { 
  ArrowLeft, Save, Upload, X, MapPin, 
  Video, Info, Phone, Search, 
  CheckCircle2, Image as ImageIcon,
  Building2, Trees, Shield, Car, Waves, Zap, Sparkles
} from "lucide-react";
import Link from "next/link";
import { Property, PropertyLocation } from "@/types/property";
import { supabase } from "@/lib/supabase";
import { parseGoogleMapsUrl } from "@/lib/utils";
import { uploadToS3 } from "@/lib/aws/storage-utils";
import { VideoMediaManager } from "@/components/admin/video-media-manager";

const CoordinatePickerMap = dynamic(
  () => import("@/components/admin/coordinate-picker-map"),
  { ssr: false, loading: () => <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-bg-primary/50 animate-pulse rounded-xl" /> }
);

const AMENITIES_LIST = [
  { id: "swimming-pool", label: "Swimming Pool", icon: Waves, category: "lifestyle" },
  { id: "gym", label: "Gym", icon: Building2, category: "lifestyle" },
  { id: "security", label: "24/7 Security", icon: Shield, category: "safety" },
  { id: "lift", label: "Lift", icon: Building2, category: "basic" },
  { id: "garden", label: "Garden", icon: Trees, category: "lifestyle" },
  { id: "power-backup", label: "Power Backup", icon: Zap, category: "utility" },
  { id: "visitor-parking", label: "Visitor Parking", icon: Car, category: "parking" },
  { id: "cctv", label: "CCTV", icon: Shield, category: "safety" },
  { id: "pet-friendly", label: "Pet Friendly", icon: Info, category: "basic" },
];

import { 
  PROPERTY_CATEGORY_SCHEMA, 
  CATEGORY_SUBTYPES, 
  PropertyCategory, 
  PropertySubtype 
} from "@/lib/property-schema";

export default function AddPropertyPage() {
  const router = useRouter();
  const addProperty = usePropertiesStore((state) => state.addProperty);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");

  const [formData, setFormData] = useState({
    refId: `REF${Math.floor(100 + Math.random() * 900)}`,
    title: "", description: "", propertyType: "apartment", listingType: "sale", 
    saleType: "new" as "new" | "resale",
    price: "", negotiable: false,
    category: "residential" as PropertyCategory,
    subtype: "flat" as PropertySubtype,
    listingContext: "standalone" as "standalone" | "project" | "both",
    attributes: {} as Record<string, any>,
    bedrooms: "1", bathrooms: "1", balconies: "0", parking: "0", area: "", builtUpArea: "", carpetArea: "",
    furnishing: "unfurnished", facing: "east", yearBuilt: "",
    
    coverImage: "", galleryImages: [] as string[], videoUrl: "", videoThumbnail: "",
    layoutMapUrl: "", floorPlanUrl: "", brochureUrl: "",
    
    latitude: 16.5062, longitude: 80.6480, address: "", locality: "", city: "Vijayawada", state: "Andhra Pradesh", pincode: "", landmark: "",
    
    amenities: [] as string[],
    
    ownerName: "", ownerPhone: "+91", ownerEmail: "",
    
    slug: "", metaTitle: "", metaDescription: "", ogImage: "",
    
    displayCategory: "none" as "featured" | "recommended" | "budget_friendly" | "none", status: "draft"
  });

  // Derived video embed
  const getYoutubeEmbedUrl = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : null;
  };
  const videoEmbedUrl = getYoutubeEmbedUrl(formData.videoUrl);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => {
        const next = { ...prev, [name]: value };
        if (name === "listingType" && value === "resale") {
          next.saleType = "resale";
        }
        return next;
      });
      
      // Auto-generate slug from title
      if (name === "title") {
        setFormData(prev => ({ ...prev, slug: value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') }));
      }
    }
  };

  const toggleAmenity = (id: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(id) 
        ? prev.amenities.filter(a => a !== id) 
        : [...prev.amenities, id]
    }));
  };

  const handlePositionChange = (lat: number, lng: number, details?: any) => {
    setFormData(prev => ({ 
      ...prev, 
      latitude: lat, 
      longitude: lng,
      ...(details && {
        address: details.address || prev.address,
        city: details.city || prev.city,
        state: details.state || prev.state,
        pincode: details.pincode || prev.pincode
      })
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isCover: boolean = false) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    try {
      const uploadedUrls: string[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const s3Res = await uploadToS3({
          file,
          folder: 'properties',
          compress: true,
        });

        let imgUrl = s3Res.success && s3Res.fileUrl ? s3Res.fileUrl : "";

        // Fallback to local preview URL if offline
        if (!imgUrl) {
          console.warn("[S3 Storage] Falling back to object URL:", s3Res.error);
          imgUrl = URL.createObjectURL(file);
        }

        uploadedUrls.push(imgUrl);
      }
      
      if (isCover) {
        setFormData(prev => ({ ...prev, coverImage: uploadedUrls[0] }));
        toast.success("Cover image uploaded!");
      } else {
        setFormData(prev => ({ ...prev, galleryImages: [...prev.galleryImages, ...uploadedUrls] }));
        toast.success(`${uploadedUrls.length} image(s) added to gallery!`);
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent, forceStatus?: 'published' | 'draft') => {
    e.preventDefault();

    if (!formData.title || !formData.price || !formData.ownerPhone) {
      toast.error("Please fill all required fields (Title, Price, Phone).");
      return;
    }

    setIsSubmitting(true);

    const finalStatus = forceStatus || formData.status;
    const propertyId = `prop-${Date.now()}`;

    // Map amenities back to PropertyAmenity type
    const propertyAmenities = formData.amenities.map(id => {
      const am = AMENITIES_LIST.find(a => a.id === id);
      return { id, name: am?.label || id, icon: "Check", category: (am?.category || "basic") as any };
    });

    const newProperty: Property = {
      id: propertyId,
      refId: formData.refId || `REF${Math.floor(100 + Math.random() * 900)}`,
      slug: formData.slug || propertyId,
      title: formData.title,
      description: formData.description,
      category: formData.category,
      subtype: formData.subtype,
      listingContext: formData.listingContext,
      attributes: formData.attributes,
      price: parseInt(formData.price) || 0,
      pricePerSqft: parseInt(formData.price) / (parseInt(formData.area) || 1),
      propertyType: formData.propertyType as any,
      listingType: formData.listingType as any,
      saleType: formData.saleType,
      status: finalStatus as any,
      isFeatured: formData.displayCategory === "featured",
      isRecommended: formData.displayCategory === "recommended",
      displayCategory: formData.displayCategory,
      isReadyToMove: true,
      isOwnerVerified: true,
      bedrooms: parseInt(formData.bedrooms) || 0,
      bathrooms: parseInt(formData.bathrooms) || 0,
      balconies: parseInt(formData.balconies) || 0,
      area: parseInt(formData.area) || 0,
      carpetArea: parseInt(formData.carpetArea) || 0,
      builtUpArea: parseInt(formData.builtUpArea) || 0,
      parking: parseInt(formData.parking) || 0,
      facing: formData.facing as any,
      ageOfProperty: new Date().getFullYear() - (parseInt(formData.yearBuilt) || new Date().getFullYear()),
      furnishing: formData.furnishing as any,
      
      location: {
        address: formData.address,
        locality: formData.locality || formData.city,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        latitude: formData.latitude,
        longitude: formData.longitude,
        landmark: formData.landmark
      },
      
      // Merge cover and gallery into legacy `images` array for backward compatibility
      images: [
        ...(formData.coverImage ? [{ id: "cover", url: formData.coverImage, alt: formData.title, isPrimary: true, order: 0 }] : []),
        ...formData.galleryImages.map((url, i) => ({ id: `gal-${i}`, url, alt: `${formData.title} ${i}`, isPrimary: false, order: i + 1 }))
      ],
      coverImage: formData.coverImage,
      galleryImages: formData.galleryImages,
      videoUrl: formData.videoUrl,
      videoThumbnail: formData.videoThumbnail || undefined,
      layoutMapUrl: formData.layoutMapUrl || undefined,
      floorPlanUrl: formData.floorPlanUrl || undefined,
      brochureUrl: formData.brochureUrl || undefined,
      
      amenities: propertyAmenities,
      features: [],
      
      ownerId: "admin",
      ownerName: formData.ownerName || "Admin",
      ownerPhone: formData.ownerPhone,
      ownerEmail: formData.ownerEmail,
      ownerType: "owner",
      
      viewCount: 0, savedCount: 0, enquiryCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPremium: false,
      isVerified: true,
      ownership: (formData.attributes as any)?.ownership || "freehold",
      floorRange: (formData.attributes as any)?.floorRange,
      furnishingItems: (formData.attributes as any)?.furnishingItems || [],
      verifiedBadges: ["owner_verified", ...(formData.videoUrl ? ["video_verified"] : []), "rera"],
      tenantPreference: (formData.attributes as any)?.tenantPreference || [],
      petsAllowed: (formData.attributes as any)?.petsAllowed || false,
      nonVegAllowed: (formData.attributes as any)?.nonVegAllowed || false,
      waterSource: (formData.attributes as any)?.waterSource || [],
      cultivationCrop: (formData.attributes as any)?.cultivationCrop || [],
    };

    try {
      setIsSubmitting(true);
      await addProperty(newProperty);
      toast.success(`Property ${finalStatus === 'published' ? 'Published' : 'Saved as Draft'} successfully!`);
      
      setTimeout(() => {
        router.push("/admin");
      }, 1500);
    } catch (error) {
      console.error(error);
      toast.error("Failed to save property. Please try again.");
      setIsSubmitting(false);
    }
  };

  const generateAiDescription = async () => {
    try {
      setIsGeneratingAi(true);
      const res = await fetch("/api/ai-generate-desc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          type: formData.category,
          location: `${formData.locality || 'Prime Location'}, ${formData.city}`,
          price: formData.price,
          bhk: formData.bedrooms,
          size: formData.area || formData.builtUpArea,
          features: formData.amenities.slice(0, 6).join(", "),
        }),
      });
      const data = await res.json();
      if (data?.description) {
        setFormData(prev => ({ ...prev, description: data.description }));
        toast.success("AI property description generated!");
      }
    } catch (err) {
      toast.error("Failed to generate description");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary pt-20 sm:pt-24 pb-44 sm:pb-32">
      <div className="max-w-5xl mx-auto px-4 md:px-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4 pb-4 border-b border-border-default/60">
          <div>
            <Link href="/admin" className="inline-flex items-center text-text-tertiary hover:text-text-primary transition-colors mb-2 text-sm font-medium">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
            </Link>
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-text-primary">Create New Property</h1>
            <p className="text-text-secondary text-xs sm:text-sm mt-1">Add a new property listing to the platform.</p>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
            <Button variant="outline" size="sm" type="button" onClick={(e) => handleSubmit(e, "draft")} disabled={isSubmitting || isUploading} className="flex-1 sm:flex-none h-10 text-xs font-semibold">
              Save Draft
            </Button>
            <Button variant="amber" size="sm" type="button" onClick={(e) => handleSubmit(e, "published")} disabled={isSubmitting || isUploading} className="flex-1 sm:flex-none h-10 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              Publish
            </Button>
          </div>
        </div>

        <form className="space-y-8">
          
          {/* SECTION 1: Basic Information */}
          <div className="bg-bg-card border border-border-default rounded-3xl p-6 shadow-sm">
            <h2 className="text-xl font-heading font-semibold text-text-primary mb-6 flex items-center">
              <Info className="w-5 h-5 mr-2 text-amber-primary" /> Basic Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1">
                  Property Reference ID (e.g. REF345) *
                </label>
                <Input name="refId" required value={formData.refId} onChange={handleChange} placeholder="e.g. REF345" className="h-12 uppercase font-black tracking-wide" />
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium text-text-secondary">Property Title *</label>
                <Input name="title" required value={formData.title} onChange={handleChange} placeholder="e.g. Luxury 3 BHK Villa in Jubilee Hills" className="h-12" />
              </div>

              <div className="md:col-span-2 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-text-secondary">Property Description</label>
                  <button
                    type="button"
                    onClick={generateAiDescription}
                    disabled={isGeneratingAi}
                    className="text-xs font-bold text-amber-500 hover:text-amber-400 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isGeneratingAi ? "Generating..." : "Generate with AI"}</span>
                  </button>
                </div>
                <textarea 
                  name="description" 
                  value={formData.description} 
                  onChange={handleChange} 
                  rows={6} 
                  className="w-full min-h-[140px] rounded-2xl bg-bg-primary border border-border-default/80 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-primary text-text-primary text-sm leading-relaxed"
                  placeholder="Describe the property, key interior features, sunlight/ventilation, neighborhood benefits, nearby schools, hospitals, and transit hubs..."
                />
              </div>

              {/* Category & Subtype Cascading Selectors (Master Schema) */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-amber-400 uppercase tracking-wider">
                  Category *
                </label>
                <select 
                  name="category" 
                  value={formData.category} 
                  onChange={(e) => {
                    const cat = e.target.value as PropertyCategory;
                    const defaultSubtype = CATEGORY_SUBTYPES[cat]?.[0]?.id || "flat";
                    setFormData(prev => ({ 
                      ...prev, 
                      category: cat, 
                      subtype: defaultSubtype,
                      attributes: {} 
                    }));
                  }} 
                  className="w-full h-12 rounded-xl bg-slate-900 border border-amber-500/50 px-4 text-white font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                  <option value="industrial">Industrial</option>
                  <option value="agricultural">Agricultural</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-amber-400 uppercase tracking-wider">
                  Subtype *
                </label>
                <select 
                  name="subtype" 
                  value={formData.subtype} 
                  onChange={(e) => {
                    const sub = e.target.value as PropertySubtype;
                    setFormData(prev => ({ ...prev, subtype: sub, attributes: {} }));
                  }} 
                  className="w-full h-12 rounded-xl bg-slate-900 border border-amber-500/50 px-4 text-white font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {CATEGORY_SUBTYPES[formData.category]?.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dynamic Schema Fields Container */}
              <div className="md:col-span-2 p-5 rounded-2xl bg-slate-900/90 border-2 border-amber-500/30 space-y-4">
                <div className="flex items-center gap-2 text-amber-400 font-black text-xs uppercase tracking-wider border-b border-slate-800 pb-3">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>{formData.category.toUpperCase()} — {formData.subtype.replace("-", " ").toUpperCase()} Specific Fields</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(PROPERTY_CATEGORY_SCHEMA[formData.category]?.[formData.subtype] || []).map((field) => {
                    const val = formData.attributes[field.key] ?? "";

                    if (field.inputType === "dropdown") {
                      return (
                        <div key={field.key} className="space-y-1">
                          <label className="text-xs font-bold text-slate-300">
                            {field.label} {field.required && <span className="text-red-400">*</span>}
                          </label>
                          <select
                            value={val}
                            onChange={(e) => {
                              const v = e.target.value;
                              setFormData(prev => ({
                                ...prev,
                                attributes: { ...prev.attributes, [field.key]: v },
                                ...(field.key === "facing" ? { facing: v as any } : {}),
                                ...(field.key === "furnishing" ? { furnishing: v as any } : {}),
                                ...(field.key === "totalFloors" ? { totalFloors: parseInt(v) || 0 } : {}),
                                ...(field.key === "bathrooms" ? { bathrooms: v } : {}),
                                ...(field.key === "balconies" ? { balconies: v } : {}),
                                ...(field.key === "parking" ? { parking: v } : {})
                              }));
                            }}
                            className="w-full h-11 rounded-xl bg-slate-950 border border-slate-800 px-3 text-xs text-white focus:border-amber-500"
                          >
                            <option value="">-- Select {field.label} --</option>
                            {field.options?.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                          {field.helpText && <p className="text-[10px] text-slate-400">{field.helpText}</p>}
                        </div>
                      );
                    }

                    if (field.inputType === "yesno") {
                      return (
                        <div key={field.key} className="space-y-1">
                          <label className="text-xs font-bold text-slate-300 block">{field.label}</label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  attributes: { ...prev.attributes, [field.key]: "yes" }
                                }));
                              }}
                              className={`py-2 px-3 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                                val === "yes"
                                  ? "bg-amber-500 text-slate-950 border-amber-500"
                                  : "bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800"
                              }`}
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  attributes: { ...prev.attributes, [field.key]: "no" }
                                }));
                              }}
                              className={`py-2 px-3 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                                val === "no"
                                  ? "bg-slate-900 text-slate-300 border-slate-700"
                                  : "bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800"
                              }`}
                            >
                              No
                            </button>
                          </div>
                        </div>
                      );
                    }

                    if (field.inputType === "multiselect") {
                      const selectedList: string[] = Array.isArray(val) ? val : [];
                      return (
                        <div key={field.key} className="md:col-span-2 space-y-2">
                          <label className="text-xs font-bold text-slate-300 block">{field.label}</label>
                          <div className="flex flex-wrap gap-2">
                            {field.options?.map((crop) => {
                              const isSelected = selectedList.includes(crop);
                              return (
                                <button
                                  key={crop}
                                  type="button"
                                  onClick={() => {
                                    const next = isSelected
                                      ? selectedList.filter((c) => c !== crop)
                                      : [...selectedList, crop];
                                    setFormData(prev => ({
                                      ...prev,
                                      attributes: { ...prev.attributes, [field.key]: next }
                                    }));
                                  }}
                                  className={`py-1.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                    isSelected
                                      ? "bg-amber-500 text-slate-950 border-amber-500 font-black"
                                      : "bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800"
                                  }`}
                                >
                                  {isSelected ? "✓ " : "+ "} {crop}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={field.key} className="space-y-1">
                        <label className="text-xs font-bold text-slate-300">
                          {field.label} {field.required && <span className="text-red-400">*</span>}
                        </label>
                        <Input
                          type={field.inputType === "number" ? "number" : "text"}
                          value={val}
                          onChange={(e) => {
                            const v = e.target.value;
                            setFormData(prev => ({
                              ...prev,
                              attributes: { ...prev.attributes, [field.key]: v },
                              ...(field.key === "superBuiltUpArea" || field.key === "builtUpArea" || field.key === "carpetArea" || field.key === "totalAreaSqyd" ? { area: v } : {})
                            }));
                          }}
                          placeholder={field.helpText || `Enter ${field.label}...`}
                          className="h-11 text-xs bg-slate-950 border-slate-800 text-white"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">Facing Direction</label>
                <select 
                  name="facing" 
                  value={formData.facing} 
                  onChange={handleChange} 
                  className="w-full h-12 rounded-xl bg-bg-primary border border-border-default/50 px-4 text-text-primary focus:outline-none focus:ring-2 focus:ring-amber-primary"
                >
                  <option value="east">East Facing</option>
                  <option value="west">West Facing</option>
                  <option value="north">North Facing</option>
                  <option value="south">South Facing</option>
                  <option value="north-east">North-East Facing</option>
                  <option value="north-west">North-West Facing</option>
                  <option value="south-east">South-East Facing</option>
                  <option value="south-west">South-West Facing</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">Listing Type</label>
                <select name="listingType" value={formData.listingType} onChange={handleChange} className="w-full h-12 rounded-xl bg-bg-primary border border-border-default/50 px-4 text-text-primary focus:outline-none focus:ring-2 focus:ring-amber-primary">
                  <option value="sale">For Sale</option>
                  <option value="resale">Resale</option>
                  <option value="rent">For Rent</option>
                  <option value="pg">PG / Co-living</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1">
                  Property Condition (New / Old) *
                </label>
                <select 
                  name="saleType" 
                  value={formData.saleType} 
                  onChange={handleChange} 
                  className="w-full h-12 rounded-xl bg-slate-900 border border-amber-500/50 px-4 text-white font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="new">✨ New Property (Brand New / New Launch)</option>
                  <option value="resale">🏠 Old Property (Resale / Pre-owned)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">Price (₹) *</label>
                <Input name="price" type="number" required value={formData.price} onChange={handleChange} placeholder="e.g. 15000000" className="h-12" />
              </div>
            </div>
          </div>

          {/* SECTION 2: Media & Gallery */}
          <div className="bg-bg-card border border-border-default rounded-3xl p-6 shadow-sm">
            <h2 className="text-xl font-heading font-semibold text-text-primary mb-6 flex items-center">
              <ImageIcon className="w-5 h-5 mr-2 text-amber-primary" /> Media & Gallery
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Cover Image Upload */}
              <div className="space-y-4">
                <label className="text-sm font-medium text-text-secondary">Cover Image *</label>
                <div className="border-2 border-dashed border-border-default rounded-2xl p-6 flex flex-col items-center justify-center text-center hover:bg-bg-primary/50 transition-colors relative overflow-hidden min-h-[200px]">
                  {formData.coverImage ? (
                    <>
                      <img src={formData.coverImage} alt="Cover Preview" className="absolute inset-0 w-full h-full object-cover opacity-50" />
                      <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 bg-black/50 hover:bg-black/80 text-white rounded-full z-10" onClick={() => setFormData(prev => ({...prev, coverImage: ""}))}>
                        <X className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-text-tertiary mb-2" />
                      <p className="text-sm text-text-secondary">Drag & drop or click to upload cover image</p>
                    </>
                  )}
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, true)} className="absolute inset-0 opacity-0 cursor-pointer z-0" disabled={isUploading} />
                </div>
              </div>

              {/* Gallery Images Upload */}
              <div className="space-y-4">
                <label className="text-sm font-medium text-text-secondary">Gallery Images</label>
                <div className="border-2 border-dashed border-border-default rounded-2xl p-6 flex flex-col items-center justify-center text-center hover:bg-bg-primary/50 transition-colors relative min-h-[200px]">
                  <Upload className="w-8 h-8 text-text-tertiary mb-2" />
                  <p className="text-sm text-text-secondary">Upload multiple gallery images</p>
                  <input type="file" accept="image/*" multiple onChange={(e) => handleImageUpload(e, false)} className="absolute inset-0 opacity-0 cursor-pointer" disabled={isUploading} />
                </div>
                {formData.galleryImages.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto py-2">
                    {formData.galleryImages.map((url, i) => (
                      <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                        <img src={url} alt={`Gallery ${i}`} className="w-full h-full object-cover" />
                        <button type="button" onClick={() => setFormData(prev => ({ ...prev, galleryImages: prev.galleryImages.filter((_, idx) => idx !== i) }))} className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full">
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
                  videoUrl={formData.videoUrl}
                  videoThumbnail={formData.videoThumbnail}
                  onChange={({ videoUrl, videoThumbnail }) => {
                    setFormData((prev) => ({ ...prev, videoUrl, videoThumbnail }));
                  }}
                  suggestedThumbnails={[
                    ...(formData.coverImage ? [formData.coverImage] : []),
                    ...formData.galleryImages,
                  ]}
                  folder="properties"
                />
              </div>

              {/* Additional Document URLs */}
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-border-default/50">
                <div className="space-y-4">
                  <label className="text-sm font-medium text-text-secondary">Layout Map URL</label>
                  <Input name="layoutMapUrl" value={formData.layoutMapUrl} onChange={handleChange} placeholder="https://... (Image or PDF)" className="h-12" />
                </div>
                <div className="space-y-4">
                  <label className="text-sm font-medium text-text-secondary">Floor Plan URL</label>
                  <Input name="floorPlanUrl" value={formData.floorPlanUrl} onChange={handleChange} placeholder="https://... (Image or PDF)" className="h-12" />
                </div>
                <div className="space-y-4">
                  <label className="text-sm font-medium text-text-secondary">Brochure URL</label>
                  <Input name="brochureUrl" value={formData.brochureUrl} onChange={handleChange} placeholder="https://... (PDF)" className="h-12" />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: Location */}
          <div className="bg-bg-card border border-border-default rounded-3xl p-6 shadow-sm">
            <h2 className="text-xl font-heading font-semibold text-text-primary mb-4 flex items-center">
              <MapPin className="w-5 h-5 mr-2 text-amber-primary" /> Location
            </h2>

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

                    // Shortened link async resolution (maps.app.goo.gl)
                    try {
                      const res = await fetch(`/api/resolve-maps-url?url=${encodeURIComponent(trimmed)}`);
                      const data = await res.json();
                      if (data.success && data.latitude && data.longitude) {
                        setFormData((prev) => ({
                          ...prev,
                          latitude: data.latitude,
                          longitude: data.longitude,
                          ...(data.city && { city: data.city }),
                          ...(data.locality && { locality: data.locality }),
                          ...(data.state && { state: data.state }),
                          ...(data.pincode && { pincode: data.pincode }),
                          ...(data.address && { address: data.address }),
                        }));
                        toast.success(`📍 Fetched location for ${data.locality || data.city || 'Property'} (${data.latitude.toFixed(4)}, ${data.longitude.toFixed(4)})!`);
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
                        setFormData((prev) => ({
                          ...prev,
                          latitude: data.latitude,
                          longitude: data.longitude,
                          ...(data.city && { city: data.city }),
                          ...(data.locality && { locality: data.locality }),
                          ...(data.state && { state: data.state }),
                          ...(data.pincode && { pincode: data.pincode }),
                          ...(data.address && { address: data.address }),
                        }));
                        toast.success(`📍 Fetched location for ${data.locality || data.city || 'Property'} (${data.latitude.toFixed(4)}, ${data.longitude.toFixed(4)})!`, { id: "fetch-maps" });
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
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Button
                type="button"
                onClick={() => {
                  if ("geolocation" in navigator) {
                    toast.loading("Fetching your location...", { id: "geo" });
                    navigator.geolocation.getCurrentPosition(
                      (position) => {
                        const { latitude, longitude } = position.coords;
                        // Just update lat/long, the Map component will auto-sync and reverse geocode
                        setFormData(prev => ({
                          ...prev,
                          latitude,
                          longitude
                        }));
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
                className="h-11 px-6 bg-amber-500 hover:bg-amber-600 text-white font-black text-sm rounded-xl cursor-pointer shadow-md w-full sm:w-auto flex items-center justify-center gap-2 transition-colors"
              >
                <MapPin className="w-4 h-4" /> Use My Current Location
              </Button>
            </div>
            
            <div className="w-full">
              <div className="space-y-4">
                <div className="h-[400px] w-full rounded-2xl overflow-hidden relative border border-border-default/50 shadow-inner">
                  <CoordinatePickerMap initialPosition={[formData.latitude || 16.5062, formData.longitude || 80.6480]} onPositionChange={handlePositionChange} />
                </div>
                <p className="text-xs text-text-tertiary text-center">Drag the marker or click on the map to set exact location. The address is automatically saved behind the scenes.</p>
              </div>

            </div>
          </div>

          {/* SECTION 4: Amenities */}
          <div className="bg-bg-card border border-border-default rounded-3xl p-6 shadow-sm">
            <h2 className="text-xl font-heading font-semibold text-text-primary mb-6 flex items-center">
              <Shield className="w-5 h-5 mr-2 text-amber-primary" /> Amenities
            </h2>
            <div className="flex flex-wrap gap-3">
              {AMENITIES_LIST.map(amenity => (
                <button
                  key={amenity.id}
                  type="button"
                  onClick={() => toggleAmenity(amenity.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                    formData.amenities.includes(amenity.id) 
                      ? 'bg-amber-primary text-bg-primary border-amber-primary shadow-amber-glow' 
                      : 'bg-bg-primary border-border-default/60 text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <amenity.icon className="w-4 h-4" />
                  {amenity.label}
                </button>
              ))}
            </div>
          </div>

          {/* SECTION 5: Owner Details */}
          <div className="bg-bg-card border border-border-default rounded-3xl p-6 shadow-sm">
            <h2 className="text-xl font-heading font-semibold text-text-primary mb-6 flex items-center">
              <Phone className="w-5 h-5 mr-2 text-amber-primary" /> Owner Details
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">Owner Name</label>
                <Input name="ownerName" value={formData.ownerName} onChange={handleChange} placeholder="John Doe" className="h-12" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">WhatsApp Phone Number *</label>
                <Input name="ownerPhone" required value={formData.ownerPhone} onChange={handleChange} placeholder="+91 9876543210" className="h-12" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">Email Address</label>
                <Input name="ownerEmail" type="email" value={formData.ownerEmail} onChange={handleChange} placeholder="john@example.com" className="h-12" />
              </div>
            </div>
          </div>

        </form>
      </div>

      {/* SECTION 7: Sticky Publishing Panel */}
      <div className="fixed bottom-0 left-0 right-0 bg-bg-card/95 backdrop-blur-xl border-t border-border-default p-3 sm:py-4 sm:px-6 z-40 shadow-elevated">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          <div className="flex items-center justify-between sm:justify-start gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-medium text-text-secondary">Category:</span>
              <select name="displayCategory" value={formData.displayCategory} onChange={handleChange} className="h-8 sm:h-9 rounded-lg bg-bg-primary border border-border-default/50 px-2 sm:px-3 text-xs sm:text-sm text-text-primary font-medium">
                <option value="none">None</option>
                <option value="featured">Featured</option>
                <option value="recommended">Recommended</option>
                <option value="budget_friendly">Budget Friendly</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-medium text-text-secondary">Status:</span>
              <select name="status" value={formData.status} onChange={handleChange} className="h-8 sm:h-9 rounded-lg bg-bg-primary border border-border-default/50 px-2 sm:px-3 text-xs sm:text-sm text-text-primary font-medium">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="sold">Sold</option>
                <option value="hidden">Hidden</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <Button variant="outline" type="button" onClick={(e) => handleSubmit(e, "draft")} disabled={isSubmitting || isUploading} className="flex-1 sm:flex-none h-10 text-xs sm:text-sm">
              Save Draft
            </Button>
            <Button variant="amber" type="button" onClick={(e) => handleSubmit(e, "published")} disabled={isSubmitting || isUploading} className="flex-1 sm:flex-none h-10 text-xs sm:text-sm font-bold">
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              Publish Listing
            </Button>
          </div>
          
        </div>
      </div>

    </div>
  );
}
