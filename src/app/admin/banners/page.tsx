"use client";

import { useState, useEffect } from "react";
import { Plus, Image as ImageIcon, Trash2, CheckCircle, XCircle, Link as LinkIcon } from "lucide-react";
import { useBannersStore, Banner } from "@/stores/banners-store";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Image from "next/image";

export default function AdminBannersPage() {
  const { banners, isLoading, fetchBanners, addBanner, updateBanner, deleteBanner } = useBannersStore();
  const [isAdding, setIsAdding] = useState(false);
  
  const [newTitle, setNewTitle] = useState("");
  const [newLink, setNewLink] = useState("");
  const [newFile, setNewFile] = useState<File | null>(null);

  useEffect(() => {
    fetchBanners(true); // fetch all banners including inactive
  }, [fetchBanners]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFile) {
      toast.error("Please select an image");
      return;
    }
    
    const success = await addBanner({
      title: newTitle || null,
      link_url: newLink || null,
      is_active: true,
      order_index: banners.length,
      image_url: "" // placeholder, handled by store
    }, newFile);

    if (success) {
      toast.success("Banner added successfully");
      setIsAdding(false);
      setNewTitle("");
      setNewLink("");
      setNewFile(null);
    } else {
      toast.error("Failed to add banner");
    }
  };

  const handleToggleActive = async (banner: Banner) => {
    const success = await updateBanner(banner.id, { is_active: !banner.is_active });
    if (success) {
      toast.success(`Banner ${!banner.is_active ? 'activated' : 'deactivated'}`);
    } else {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (banner: Banner) => {
    if (confirm("Are you sure you want to delete this banner?")) {
      const success = await deleteBanner(banner.id, banner.image_url);
      if (success) {
        toast.success("Banner deleted");
      } else {
        toast.error("Failed to delete banner");
      }
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <ImageIcon className="w-6 h-6 text-amber-primary" />
            Home Page Banners
          </h1>
          <p className="text-text-secondary mt-1">Manage the dynamic carousel banners on the home page hero section.</p>
        </div>
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)} className="bg-amber-primary hover:bg-amber-secondary text-white">
            <Plus className="w-4 h-4 mr-2" /> Add Banner
          </Button>
        )}
      </div>

      {isAdding && (
        <div className="bg-bg-card border border-border-default rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Add New Banner</h2>
          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Banner Image * (Recommended: 1920x1080)</label>
              <input 
                type="file" 
                accept="image/*" 
                required
                onChange={(e) => setNewFile(e.target.files?.[0] || null)}
                className="w-full bg-bg-surface border border-border-default rounded-lg p-2 text-text-primary focus:border-amber-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Title (Optional - for alt text and admin view)</label>
              <input 
                type="text" 
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Luxury Villas in Poranki"
                className="w-full bg-bg-surface border border-border-default rounded-lg p-3 text-text-primary focus:border-amber-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Link URL (Optional - destination for Explore button)</label>
              <input 
                type="text" 
                value={newLink}
                onChange={(e) => setNewLink(e.target.value)}
                placeholder="e.g. /search?propertyType=villa"
                className="w-full bg-bg-surface border border-border-default rounded-lg p-3 text-text-primary focus:border-amber-primary outline-none"
              />
            </div>
            
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAdding(false)} disabled={isLoading}>Cancel</Button>
              <Button type="submit" className="bg-amber-primary hover:bg-amber-secondary text-white" disabled={isLoading || !newFile}>
                {isLoading ? "Uploading..." : "Save Banner"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {isLoading && !isAdding && (
        <div className="text-center py-12 text-text-secondary">Loading banners...</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {banners.map((banner) => (
          <div key={banner.id} className="bg-bg-card border border-border-default rounded-xl overflow-hidden group">
            <div className="relative aspect-video w-full bg-bg-surface">
              <Image 
                src={banner.image_url} 
                alt={banner.title || "Banner"} 
                fill 
                className={`object-cover ${!banner.is_active ? 'opacity-50 grayscale' : ''}`}
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={() => handleToggleActive(banner)}
                >
                  {banner.is_active ? <XCircle className="w-4 h-4 mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  {banner.is_active ? 'Deactivate' : 'Activate'}
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => handleDelete(banner)}
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                </Button>
              </div>
            </div>
            
            <div className="p-4 flex flex-col gap-2">
              <div className="flex justify-between items-start">
                <h3 className="font-semibold text-text-primary truncate" title={banner.title || "Untitled"}>
                  {banner.title || "Untitled Banner"}
                </h3>
                {banner.is_active ? (
                  <span className="text-xs font-medium px-2 py-1 bg-green-500/10 text-green-500 rounded-full">Active</span>
                ) : (
                  <span className="text-xs font-medium px-2 py-1 bg-red-500/10 text-red-500 rounded-full">Inactive</span>
                )}
              </div>
              
              {banner.link_url && (
                <div className="flex items-center text-sm text-text-tertiary">
                  <LinkIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="truncate">{banner.link_url}</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {!isLoading && banners.length === 0 && !isAdding && (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-text-secondary border border-dashed border-border-default rounded-xl">
            <ImageIcon className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg">No banners found</p>
            <p className="text-sm mt-1">Click "Add Banner" to create your first home page banner.</p>
          </div>
        )}
      </div>
    </div>
  );
}
