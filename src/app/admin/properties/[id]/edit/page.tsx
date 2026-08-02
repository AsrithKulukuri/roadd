"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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
  Building2, Trees, Shield, Car, Waves, Zap, Trash2
} from "lucide-react";
import Link from "next/link";
import { Property } from "@/types/property";
import { supabase } from "@/lib/supabase";
import { getPropertyRefId } from "@/lib/ref-id";
import { parseGoogleMapsUrl } from "@/lib/utils";
import imageCompression from 'browser-image-compression';

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

export default function EditPropertyPage() {
  const router = useRouter();
  const params = useParams();
  const propertyIdParam = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const { properties, updateProperty } = usePropertiesStore();
  const targetProperty = properties.find((p) => p.id === propertyIdParam || p.slug === propertyIdParam);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");

  const [formData, setFormData] = useState({
    refId: "",
    title: "", description: "", propertyType: "apartment", listingType: "sale", price: "", negotiable: false,
    bedrooms: "1", bathrooms: "1", balconies: "0", parking: "0", area: "", builtUpArea: "", carpetArea: "",
    furnishing: "unfurnished", facing: "east", yearBuilt: "",
    
    coverImage: "", galleryImages: [] as string[], videoUrl: "",
    
    latitude: 16.5062, longitude: 80.6480, address: "", locality: "", city: "Vijayawada", state: "Andhra Pradesh", pincode: "", landmark: "",
    
    amenities: [] as string[],
    
    ownerName: "", ownerPhone: "+91", ownerEmail: "",
    
    slug: "", metaTitle: "", metaDescription: "", ogImage: "",
    
    featured: true, status: "draft"
  });

  // Pre-fill form when targetProperty is available
  useEffect(() => {
    if (targetProperty) {
      const gImages = targetProperty.galleryImages && targetProperty.galleryImages.length > 0
        ? targetProperty.galleryImages
        : (targetProperty.images || []).slice(1).map(i => typeof i === "string" ? i : i.url);

      const coverImg = targetProperty.coverImage || (targetProperty.images?.[0] ? (typeof targetProperty.images[0] === "string" ? targetProperty.images[0] : targetProperty.images[0].url) : "");

      setFormData({
        refId: getPropertyRefId(targetProperty),
        title: targetProperty.title || "",
        description: targetProperty.description || "",
        propertyType: targetProperty.propertyType || "apartment",
        listingType: targetProperty.listingType || "sale",
        price: String(targetProperty.price || ""),
        negotiable: false,
        bedrooms: String(targetProperty.bedrooms || "1"),
        bathrooms: String(targetProperty.bathrooms || "1"),
        balconies: String(targetProperty.balconies || "0"),
        parking: String(targetProperty.parking || "0"),
        area: String(targetProperty.area || ""),
        builtUpArea: String(targetProperty.builtUpArea || ""),
        carpetArea: String(targetProperty.carpetArea || ""),
        furnishing: targetProperty.furnishing || "unfurnished",
        facing: targetProperty.facing || "east",
        yearBuilt: targetProperty.ageOfProperty ? String(new Date().getFullYear() - targetProperty.ageOfProperty) : "",
        
        coverImage: coverImg,
        galleryImages: gImages,
        videoUrl: targetProperty.videoUrl || "",
        
        latitude: targetProperty.location?.latitude || 16.5062,
        longitude: targetProperty.location?.longitude || 80.6480,
        address: targetProperty.location?.address || "",
        locality: targetProperty.location?.locality || "",
        city: targetProperty.location?.city || "Vijayawada",
        state: targetProperty.location?.state || "Andhra Pradesh",
        pincode: targetProperty.location?.pincode || "",
        landmark: targetProperty.location?.landmark || "",
        
        amenities: targetProperty.amenities?.map(a => a.id) || [],
        
        ownerName: targetProperty.ownerName || "",
        ownerPhone: targetProperty.ownerPhone || "+91",
        ownerEmail: targetProperty.ownerEmail || "",
        
        slug: targetProperty.slug || targetProperty.id,
        metaTitle: "", metaDescription: "", ogImage: "",
        
        featured: Boolean(targetProperty.isFeatured),
        status: targetProperty.status || "draft"
      });
    }
  }, [targetProperty]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
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
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = isCover ? `cover/${fileName}` : `gallery/${fileName}`;

        let imgUrl = "";
        try {
          let fileToUpload = file;
          if (file.type.startsWith('image/')) {
            try {
              fileToUpload = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true });
            } catch (cErr) {
              console.warn("Compression failed, using original:", cErr);
            }
          }

          const { data, error } = await supabase.storage
            .from('properties')
            .upload(filePath, fileToUpload);

          if (!error && data?.path) {
            const { data: publicUrlData } = supabase.storage
              .from('properties')
              .getPublicUrl(data.path);
            imgUrl = publicUrlData.publicUrl;
          }
        } catch (storageErr) {
          console.warn("Storage upload warning, fallback to object URL:", storageErr);
        }

        if (!imgUrl) {
          imgUrl = URL.createObjectURL(file);
        }
        uploadedUrls.push(imgUrl);
      }
      
      if (isCover) {
        setFormData(prev => ({ ...prev, coverImage: uploadedUrls[0] }));
        toast.success("Cover image updated!");
      } else {
        setFormData(prev => ({ ...prev, galleryImages: [...prev.galleryImages, ...uploadedUrls] }));
        toast.success(`${uploadedUrls.length} image(s) added to gallery!`);
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Notice: Could not upload to cloud storage, using local preview image.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent, forceStatus?: 'published' | 'draft' | 'sold' | 'hidden') => {
    e.preventDefault();

    if (!formData.title || !formData.price || !formData.ownerPhone) {
      toast.error("Please fill all required fields (Title, Price, Phone).");
      return;
    }

    if (!targetProperty) {
      toast.error("Property not found to update.");
      return;
    }

    setIsSubmitting(true);

    const finalStatus = forceStatus || formData.status;
    const propertyAmenities = formData.amenities.map(id => {
      const am = AMENITIES_LIST.find(a => a.id === id);
      return { id, name: am?.label || id, icon: "Check", category: (am?.category || "basic") as any };
    });

    const updatedProperty: Property = {
      ...targetProperty,
      refId: formData.refId || targetProperty.refId,
      title: formData.title,
      description: formData.description,
      price: parseInt(formData.price) || 0,
      pricePerSqft: parseInt(formData.price) / (parseInt(formData.area) || 1),
      propertyType: formData.propertyType as any,
      listingType: formData.listingType as any,
      status: finalStatus as any,
      isFeatured: formData.featured,
      bedrooms: parseInt(formData.bedrooms) || 0,
      bathrooms: parseInt(formData.bathrooms) || 0,
      balconies: parseInt(formData.balconies) || 0,
      area: parseInt(formData.area) || 0,
      carpetArea: parseInt(formData.carpetArea) || 0,
      builtUpArea: parseInt(formData.builtUpArea) || 0,
      parking: parseInt(formData.parking) || 0,
      facing: formData.facing as any,
      ageOfProperty: formData.yearBuilt ? (new Date().getFullYear() - (parseInt(formData.yearBuilt) || new Date().getFullYear())) : targetProperty.ageOfProperty,
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
      
      images: [
        ...(formData.coverImage ? [{ id: "cover", url: formData.coverImage, alt: formData.title, isPrimary: true, order: 0 }] : []),
        ...formData.galleryImages.map((url, i) => ({ id: `gal-${i}`, url, alt: `${formData.title} ${i}`, isPrimary: false, order: i + 1 }))
      ],
      coverImage: formData.coverImage,
      galleryImages: formData.galleryImages,
      videoUrl: formData.videoUrl,
      
      amenities: propertyAmenities,
      
      ownerName: formData.ownerName || targetProperty.ownerName,
      ownerPhone: formData.ownerPhone || targetProperty.ownerPhone,
      ownerEmail: formData.ownerEmail || targetProperty.ownerEmail,
      
      updatedAt: new Date().toISOString(),
    };

    try {
      await updateProperty(targetProperty.id, updatedProperty);
      toast.success("Property updated successfully!");
      
      setTimeout(() => {
        router.push("/admin");
      }, 1200);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Failed to update property. Please try again.");
      setIsSubmitting(false);
    }
  };

  if (!targetProperty) {
    return (
      <div className="min-h-screen bg-bg-primary pt-32 pb-20 px-4 text-center">
        <div className="max-w-md mx-auto bg-bg-card p-8 rounded-3xl border border-border-default shadow-sm space-y-4">
          <h2 className="text-xl font-bold text-text-primary">Property Not Found</h2>
          <p className="text-sm text-text-secondary">The property you are trying to edit could not be found.</p>
          <Button variant="amber" asChild className="w-full">
            <Link href="/admin">Return to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary pt-20 sm:pt-24 pb-44 sm:pb-32">
      <div className="max-w-5xl mx-auto px-4 md:px-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4 pb-4 border-b border-border-default/60">
          <div>
            <Link href="/admin" className="inline-flex items-center text-text-tertiary hover:text-text-primary transition-colors mb-2 text-sm font-medium">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
            </Link>
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-text-primary">
              Edit Property
            </h1>
            <p className="text-text-secondary text-xs sm:text-sm mt-1">
              Updating listing: <span className="font-bold text-amber-primary">{formData.refId}</span> ({formData.title})
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
            <Button variant="outline" size="sm" type="button" onClick={(e) => handleSubmit(e, "draft")} disabled={isSubmitting || isUploading} className="flex-1 sm:flex-none h-10 text-xs font-semibold">
              Save Draft
            </Button>
            <Button variant="amber" size="sm" type="button" onClick={(e) => handleSubmit(e, "published")} disabled={isSubmitting || isUploading} className="flex-1 sm:flex-none h-10 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              Save Changes
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
                <label className="text-sm font-medium text-text-secondary">Description</label>
                <textarea 
                  name="description" value={formData.description} onChange={handleChange} 
                  rows={4} className="w-full rounded-xl bg-bg-primary border border-border-default/50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-primary text-text-primary"
                  placeholder="Describe the property..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">Property Type</label>
                <select name="propertyType" value={formData.propertyType} onChange={handleChange} className="w-full h-12 rounded-xl bg-bg-primary border border-border-default/50 px-4 text-text-primary focus:outline-none focus:ring-2 focus:ring-amber-primary">
                  <option value="apartment">Apartment</option>
                  <option value="villa">Villa</option>
                  <option value="independent-house">Independent House</option>
                  <option value="plot">Plot / Land</option>
                  <option value="commercial">Commercial</option>
                  <option value="agricultural-land">Agricultural Land</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">Listing Type</label>
                <select name="listingType" value={formData.listingType} onChange={handleChange} className="w-full h-12 rounded-xl bg-bg-primary border border-border-default/50 px-4 text-text-primary focus:outline-none focus:ring-2 focus:ring-amber-primary">
                  <option value="sale">For Sale</option>
                  <option value="rent">For Rent</option>
                  <option value="lease">Lease</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">Price (₹) *</label>
                <Input name="price" type="number" required value={formData.price} onChange={handleChange} placeholder="e.g. 15000000" className="h-12" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">Furnishing Status</label>
                <select name="furnishing" value={formData.furnishing} onChange={handleChange} className="w-full h-12 rounded-xl bg-bg-primary border border-border-default/50 px-4 text-text-primary focus:outline-none focus:ring-2 focus:ring-amber-primary">
                  <option value="unfurnished">Unfurnished</option>
                  <option value="semi-furnished">Semi-Furnished</option>
                  <option value="fully-furnished">Fully Furnished</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">Facing Direction</label>
                <select name="facing" value={formData.facing} onChange={handleChange} className="w-full h-12 rounded-xl bg-bg-primary border border-border-default/50 px-4 text-text-primary focus:outline-none focus:ring-2 focus:ring-amber-primary">
                  <option value="east">East</option>
                  <option value="west">West</option>
                  <option value="north">North</option>
                  <option value="south">South</option>
                  <option value="north-east">North-East</option>
                  <option value="south-east">South-East</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 2: Media & Gallery */}
          <div className="bg-bg-card border border-border-default rounded-3xl p-6 shadow-sm">
            <h2 className="text-xl font-heading font-semibold text-text-primary mb-6 flex items-center">
              <ImageIcon className="w-5 h-5 mr-2 text-amber-primary" /> Media & Gallery
            </h2>
            
            <div className="space-y-6">
              {/* Cover Image Upload */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">Cover Image</label>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 rounded-2xl bg-bg-primary border border-border-default overflow-hidden flex items-center justify-center relative shrink-0">
                    {formData.coverImage ? (
                      <img src={formData.coverImage} alt="Cover Preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-text-tertiary" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <Input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => handleImageUpload(e, true)} 
                      disabled={isUploading}
                      className="cursor-pointer"
                    />
                    <Input 
                      name="coverImage" 
                      value={formData.coverImage} 
                      onChange={handleChange} 
                      placeholder="Or paste cover image URL..." 
                      className="h-10 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Gallery Images */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">Gallery Images</label>
                <Input 
                  type="file" 
                  accept="image/*" 
                  multiple 
                  onChange={(e) => handleImageUpload(e, false)} 
                  disabled={isUploading}
                  className="cursor-pointer mb-3"
                />
                
                {formData.galleryImages.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 pt-2">
                    {formData.galleryImages.map((url, idx) => (
                      <div key={idx} className="relative group w-full aspect-square rounded-xl overflow-hidden bg-bg-primary border border-border-default">
                        <img src={url} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, galleryImages: prev.galleryImages.filter((_, i) => i !== idx) }))}
                          className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-90 hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Video URL */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">YouTube Video URL</label>
                <Input 
                  name="videoUrl" 
                  value={formData.videoUrl} 
                  onChange={handleChange} 
                  placeholder="https://www.youtube.com/watch?v=..." 
                  className="h-12"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: Location */}
          <div className="bg-bg-card border border-border-default rounded-3xl p-6 shadow-sm space-y-6">
            <h2 className="text-xl font-heading font-semibold text-text-primary flex items-center">
              <MapPin className="w-5 h-5 mr-2 text-amber-primary" /> Location Details
            </h2>

            {/* Google Maps Location Link Auto-Fetcher */}
            <div className="space-y-2 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
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
                    toast.loading("Resolving Google Maps location & details...", { id: "fetch-maps-edit" });
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
                        toast.success(`📍 Fetched location for ${data.locality || data.city || 'Property'} (${data.latitude.toFixed(4)}, ${data.longitude.toFixed(4)})!`, { id: "fetch-maps-edit" });
                      } else {
                        toast.error(data.error || "Could not extract location from link", { id: "fetch-maps-edit" });
                      }
                    } catch (err) {
                      toast.error("Failed to resolve Google Maps link", { id: "fetch-maps-edit" });
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
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
              <Button
                type="button"
                onClick={() => {
                  if ("geolocation" in navigator) {
                    toast.loading("Fetching your location...", { id: "geo" });
                    navigator.geolocation.getCurrentPosition(
                      (position) => {
                        const { latitude, longitude } = position.coords;
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
                className="h-11 px-6 bg-blue-500 hover:bg-blue-600 text-white font-black text-sm rounded-xl cursor-pointer shadow-md w-full sm:w-auto flex items-center justify-center gap-2 transition-colors"
              >
                <MapPin className="w-4 h-4" /> Use My Current Location
              </Button>
            </div>

            {/* Interactive Coordinate Picker */}
            <div className="space-y-2 pt-2">
              <label className="text-sm font-medium text-text-secondary flex items-center justify-between">
                <span>Select Location on Map (Drag Marker)</span>
                <span className="text-xs text-amber-primary font-bold">{formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)}</span>
              </label>
              <div className="w-full h-80 rounded-2xl overflow-hidden border border-border-default/60 shadow-inner">
                <CoordinatePickerMap
                  initialPosition={[formData.latitude, formData.longitude]}
                  onPositionChange={handlePositionChange}
                />
              </div>
              <p className="text-xs text-text-tertiary text-center">The address is automatically saved behind the scenes.</p>
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

      {/* SECTION 6: Sticky Publishing Panel */}
      <div className="fixed bottom-0 left-0 right-0 bg-bg-card/95 backdrop-blur-xl border-t border-border-default p-3 sm:py-4 sm:px-6 z-40 shadow-elevated">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          <div className="flex items-center justify-between sm:justify-start gap-4">
            <div className="flex items-center gap-2">
              <Checkbox 
                id="featured" name="featured"
                checked={formData.featured}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, featured: checked as boolean }))} 
              />
              <label htmlFor="featured" className="text-xs sm:text-sm font-medium text-text-primary cursor-pointer select-none">Mark as Featured</label>
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
              Save Changes
            </Button>
          </div>
          
        </div>
      </div>

    </div>
  );
}
