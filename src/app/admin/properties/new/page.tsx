"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { usePropertiesStore } from "@/stores/properties-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { Property } from "@/types/property";

// Dynamically import the map component with SSR disabled
const CoordinatePickerMap = dynamic(
  () => import("@/components/admin/coordinate-picker-map"),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[300px] flex items-center justify-center bg-bg-primary/50 border border-border-default/50 rounded-xl">
        <p className="text-text-tertiary animate-pulse">Loading map...</p>
      </div>
    )
  }
);

export default function AddPropertyPage() {
  const router = useRouter();
  const addProperty = usePropertiesStore((state) => state.addProperty);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    propertyType: "apartment",
    listingType: "sale",
    locality: "",
    city: "Hyderabad",
    lat: 17.385044,
    lng: 78.486671,
    imageUrl: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePositionChange = (lat: number, lng: number) => {
    setFormData((prev) => ({ ...prev, lat, lng }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Create a new mock property based on the form data
    const newProperty: Property = {
      id: `prop-${Date.now()}`,
      slug: `prop-${Date.now()}`,
      title: formData.title,
      description: formData.description,
      price: parseInt(formData.price) || 0,
      pricePerSqft: 0,
      propertyType: formData.propertyType as any,
      listingType: formData.listingType as any,
      status: "published",
      isFeatured: false,
      isReadyToMove: true,
      isOwnerVerified: true,
      bedrooms: 3,
      bathrooms: 2,
      balconies: 1,
      area: 1500,
      facing: "east",
      ageOfProperty: 0,
      furnishingStatus: "unfurnished",
      location: {
        address: "New Location",
        locality: formData.locality,
        city: formData.city,
        state: "Telangana",
        pincode: "500001",
        latitude: formData.lat,
        longitude: formData.lng,
      },
      amenities: [],
      images: [
        { id: "img-1", url: formData.imageUrl, alt: formData.title, isPrimary: true }
      ],
      owner: {
        id: "owner-1",
        name: "Admin User",
        phone: "+91 8977311418",
        email: "admin@road.com",
        userType: "builder",
        joinedDate: "2026-01-01"
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addProperty(newProperty);
    toast.success("Property added successfully!");
    router.push("/admin/properties");
  };

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/properties">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold font-heading text-text-primary">Add New Property</h1>
          <p className="text-text-secondary mt-1">Create a new listing in the inventory.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-bg-card border border-border-default rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-xl font-bold text-text-primary border-b border-border-default pb-2">Basic Details</h2>
            
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Property Title</label>
              <Input 
                required 
                name="title" 
                value={formData.title} 
                onChange={handleChange} 
                placeholder="e.g. Luxury 3BHK Apartment in Banjara Hills" 
                className="bg-bg-primary/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Description</label>
              <textarea 
                required
                name="description" 
                value={formData.description} 
                onChange={handleChange} 
                placeholder="Describe the property..." 
                className="w-full h-32 rounded-xl border border-border-input bg-bg-primary/50 px-3 py-2 text-sm text-text-primary outline-none focus-visible:ring-1 focus-visible:ring-amber-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Price (₹)</label>
                <Input 
                  required 
                  type="number" 
                  name="price" 
                  value={formData.price} 
                  onChange={handleChange} 
                  placeholder="e.g. 15000000" 
                  className="bg-bg-primary/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Image URL</label>
                <Input 
                  required 
                  name="imageUrl" 
                  value={formData.imageUrl} 
                  onChange={handleChange} 
                  className="bg-bg-primary/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Property Type</label>
                <select 
                  name="propertyType" 
                  value={formData.propertyType} 
                  onChange={handleChange}
                  className="w-full h-10 rounded-xl border border-border-input bg-bg-primary/50 px-3 py-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-amber-primary text-text-primary"
                >
                  <option value="apartment">Apartment</option>
                  <option value="villa">Villa</option>
                  <option value="independent-house">Independent House</option>
                  <option value="plot">Plot</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Listing Type</label>
                <select 
                  name="listingType" 
                  value={formData.listingType} 
                  onChange={handleChange}
                  className="w-full h-10 rounded-xl border border-border-input bg-bg-primary/50 px-3 py-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-amber-primary text-text-primary"
                >
                  <option value="sale">For Sale</option>
                  <option value="rent">For Rent</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Location & Map */}
        <div className="space-y-6">
          <div className="bg-bg-card border border-border-default rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-xl font-bold text-text-primary border-b border-border-default pb-2">Location</h2>
            
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Locality / Area</label>
              <Input 
                required 
                name="locality" 
                value={formData.locality} 
                onChange={handleChange} 
                placeholder="e.g. Jubilee Hills" 
                className="bg-bg-primary/50"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">City</label>
              <Input 
                required 
                name="city" 
                value={formData.city} 
                onChange={handleChange} 
                className="bg-bg-primary/50"
              />
            </div>

            <div className="pt-2">
              <label className="block text-sm font-medium text-text-secondary mb-2">Pin Location on Map</label>
              <div className="w-full h-[250px] rounded-xl overflow-hidden border border-border-default z-0">
                <CoordinatePickerMap 
                  initialPosition={[formData.lat, formData.lng]} 
                  onPositionChange={handlePositionChange} 
                />
              </div>
              <div className="flex gap-4 mt-2 text-xs text-text-tertiary">
                <span>Lat: {formData.lat.toFixed(6)}</span>
                <span>Lng: {formData.lng.toFixed(6)}</span>
              </div>
            </div>
          </div>

          <Button type="submit" variant="amber" className="w-full h-12 text-base gap-2 rounded-xl shadow-amber-glow">
            <Save className="w-5 h-5" />
            Publish Property
          </Button>
        </div>
      </form>
    </div>
  );
}
