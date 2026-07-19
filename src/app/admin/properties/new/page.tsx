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
  Building2, Trees, Shield, Car, Waves, Zap
} from "lucide-react";
import Link from "next/link";
import { Property, PropertyLocation } from "@/types/property";
import { supabase } from "@/lib/supabase";

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

export default function AddPropertyPage() {
  const router = useRouter();
  const addProperty = usePropertiesStore((state) => state.addProperty);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [formData, setFormData] = useState({
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
      setFormData(prev => ({ ...prev, [name]: value }));
      
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
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = isCover ? `cover/${fileName}` : `gallery/${fileName}`;

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
          .from('properties')
          .upload(filePath, file);

        if (error) throw error;

        // Get public URL
        const { data: publicUrlData } = supabase.storage
          .from('properties')
          .getPublicUrl(data.path);
          
        uploadedUrls.push(publicUrlData.publicUrl);
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
      toast.error("Failed to upload image(s). Ensure 'properties' bucket exists and is public.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent, forceStatus?: 'published') => {
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
      slug: formData.slug || propertyId,
      title: formData.title,
      description: formData.description,
      price: parseInt(formData.price) || 0,
      pricePerSqft: parseInt(formData.price) / (parseInt(formData.area) || 1),
      propertyType: formData.propertyType as any,
      listingType: formData.listingType as any,
      status: finalStatus as any,
      isFeatured: formData.featured,
      isRecommended: true,
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
      isVerified: true
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

  return (
    <div className="min-h-screen bg-bg-primary pt-24 pb-32">
      <div className="max-w-5xl mx-auto px-4 md:px-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div>
            <Link href="/admin" className="inline-flex items-center text-text-tertiary hover:text-text-primary transition-colors mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
            </Link>
            <h1 className="text-3xl font-heading font-bold text-text-primary">Create New Property</h1>
            <p className="text-text-secondary mt-1">Add a new property listing to the platform.</p>
          </div>
        </div>

        <form className="space-y-8">
          
          {/* SECTION 1: Basic Information */}
          <div className="bg-bg-card border border-border-default rounded-3xl p-6 shadow-sm">
            <h2 className="text-xl font-heading font-semibold text-text-primary mb-6 flex items-center">
              <Info className="w-5 h-5 mr-2 text-amber-primary" /> Basic Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  <option value="residential-land">Residential Land / Plot</option>
                  <option value="commercial-spaces">Commercial Space</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">Listing Type</label>
                <select name="listingType" value={formData.listingType} onChange={handleChange} className="w-full h-12 rounded-xl bg-bg-primary border border-border-default/50 px-4 text-text-primary focus:outline-none focus:ring-2 focus:ring-amber-primary">
                  <option value="sale">For Sale</option>
                  <option value="rent">For Rent</option>
                  <option value="pg">PG / Co-living</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">Price (₹) *</label>
                <Input name="price" type="number" required value={formData.price} onChange={handleChange} placeholder="e.g. 15000000" className="h-12" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">Area (Sq.ft) *</label>
                <Input name="area" type="number" value={formData.area} onChange={handleChange} placeholder="e.g. 1500" className="h-12" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">Bedrooms</label>
                <select name="bedrooms" value={formData.bedrooms} onChange={handleChange} className="w-full h-12 rounded-xl bg-bg-primary border border-border-default/50 px-4 text-text-primary">
                  {[0,1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">Bathrooms</label>
                <select name="bathrooms" value={formData.bathrooms} onChange={handleChange} className="w-full h-12 rounded-xl bg-bg-primary border border-border-default/50 px-4 text-text-primary">
                  {[0,1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
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

              {/* Video URL */}
              <div className="md:col-span-2 space-y-4">
                <label className="text-sm font-medium text-text-secondary">YouTube Walkthrough Video URL</label>
                <Input name="videoUrl" value={formData.videoUrl} onChange={handleChange} placeholder="https://youtube.com/watch?v=..." className="h-12" />
                
                {videoEmbedUrl && (
                  <div className="w-full max-w-lg aspect-video rounded-xl overflow-hidden border border-border-default/50">
                    <iframe width="100%" height="100%" src={videoEmbedUrl} title="YouTube preview" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 3: Location */}
          <div className="bg-bg-card border border-border-default rounded-3xl p-6 shadow-sm">
            <h2 className="text-xl font-heading font-semibold text-text-primary mb-6 flex items-center">
              <MapPin className="w-5 h-5 mr-2 text-amber-primary" /> Location
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="h-[400px] w-full rounded-2xl overflow-hidden relative border border-border-default/50">
                  <CoordinatePickerMap onPositionChange={handlePositionChange} />
                </div>
                <p className="text-xs text-text-tertiary text-center">Drag the marker or click on the map to set exact location. Address fields will auto-fill.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">Full Address</label>
                  <textarea name="address" value={formData.address} onChange={handleChange} rows={3} className="w-full rounded-xl bg-bg-primary border border-border-default/50 px-4 py-3 text-text-primary" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">City</label>
                    <Input name="city" value={formData.city} onChange={handleChange} className="h-12" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">State</label>
                    <Input name="state" value={formData.state} onChange={handleChange} className="h-12" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">Pincode</label>
                    <Input name="pincode" value={formData.pincode} onChange={handleChange} className="h-12" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">Locality (e.g. Benz Circle)</label>
                    <Input name="locality" value={formData.locality} onChange={handleChange} className="h-12" />
                  </div>
                </div>
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
      <div className="fixed bottom-0 left-0 right-0 bg-bg-card/90 backdrop-blur-xl border-t border-border-default py-4 px-6 z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Checkbox 
                id="featured" name="featured"
                checked={formData.featured}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, featured: checked as boolean }))} 
              />
              <label htmlFor="featured" className="text-sm font-medium text-text-primary cursor-pointer">Mark as Featured</label>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-text-secondary">Status:</span>
              <select name="status" value={formData.status} onChange={handleChange} className="h-9 rounded-lg bg-bg-primary border border-border-default/50 px-3 text-sm text-text-primary">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="sold">Sold</option>
                <option value="hidden">Hidden</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" type="button" onClick={(e) => handleSubmit(e, "draft")} disabled={isSubmitting || isUploading}>
              Save Draft
            </Button>
            <Button variant="amber" type="button" onClick={(e) => handleSubmit(e, "published")} disabled={isSubmitting || isUploading}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Publish Listing
            </Button>
          </div>
          
        </div>
      </div>

    </div>
  );
}
