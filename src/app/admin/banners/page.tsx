"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Image as ImageIcon,
  Trash2,
  CheckCircle,
  XCircle,
  Link as LinkIcon,
  Edit,
  Smartphone,
  Monitor,
  Sparkles,
  Info,
  ExternalLink,
  ChevronRight,
  Eye,
  X,
  UploadCloud,
} from "lucide-react";
import { useBannersStore, Banner } from "@/stores/banners-store";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Image from "next/image";
import { resolveMediaUrl } from "@/lib/aws/storage-utils";

export default function AdminBannersPage() {
  const { banners, isLoading, fetchBanners, addBanner, updateBanner, deleteBanner } = useBannersStore();
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [buttonText, setButtonText] = useState("Explore Now");
  const [linkUrl, setLinkUrl] = useState("");
  const [desktopFile, setDesktopFile] = useState<File | null>(null);
  const [mobileFile, setMobileFile] = useState<File | null>(null);
  const [desktopPreview, setDesktopPreview] = useState<string | null>(null);
  const [mobilePreview, setMobilePreview] = useState<string | null>(null);

  useEffect(() => {
    fetchBanners(true); // fetch all banners including inactive
  }, [fetchBanners]);

  const resetForm = () => {
    setTitle("");
    setSubtitle("");
    setButtonText("Explore Now");
    setLinkUrl("");
    setDesktopFile(null);
    setMobileFile(null);
    setDesktopPreview(null);
    setMobilePreview(null);
    setIsAdding(false);
    setEditingBanner(null);
  };

  const handleOpenEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setTitle(banner.title || "");
    setSubtitle(banner.subtitle || "");
    setButtonText(banner.button_text || "Explore Now");
    setLinkUrl(banner.link_url || "");
    setDesktopPreview(banner.image_url);
    setMobilePreview(banner.mobile_image_url || null);
    setDesktopFile(null);
    setMobileFile(null);
    setIsAdding(false);
  };

  const handleDesktopFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setDesktopFile(file);
    if (file) {
      setDesktopPreview(URL.createObjectURL(file));
    }
  };

  const handleMobileFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setMobileFile(file);
    if (file) {
      setMobilePreview(URL.createObjectURL(file));
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!desktopFile && !mobileFile) {
      toast.error("Please upload a banner image (desktop or mobile)");
      return;
    }

    const success = await addBanner(
      {
        title: title.trim() || null,
        subtitle: subtitle.trim() || null,
        button_text: buttonText.trim() || "Explore Now",
        link_url: linkUrl.trim() || null,
        is_active: true,
        order_index: banners.length,
        image_url: "", // handled by store
      },
      desktopFile || mobileFile!,
      mobileFile
    );

    if (success) {
      toast.success("Banner published successfully!");
      resetForm();
    } else {
      toast.error("Failed to upload banner. Please try again.");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBanner) return;

    const success = await updateBanner(
      editingBanner.id,
      {
        title: title.trim() || null,
        subtitle: subtitle.trim() || null,
        button_text: buttonText.trim() || "Explore Now",
        link_url: linkUrl.trim() || null,
      },
      desktopFile,
      mobileFile
    );

    if (success) {
      toast.success("Banner updated successfully!");
      resetForm();
    } else {
      toast.error("Failed to update banner.");
    }
  };

  const handleToggleActive = async (banner: Banner) => {
    const success = await updateBanner(banner.id, { is_active: !banner.is_active });
    if (success) {
      toast.success(`Banner ${!banner.is_active ? "activated" : "deactivated"}`);
    } else {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (banner: Banner) => {
    if (confirm(`Are you sure you want to delete banner "${banner.title || "Untitled"}"?`)) {
      const success = await deleteBanner(banner.id, banner.image_url, banner.mobile_image_url);
      if (success) {
        toast.success("Banner deleted successfully");
      } else {
        toast.error("Failed to delete banner");
      }
    }
  };

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-default pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-text-primary flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
              <ImageIcon className="w-6 h-6" />
            </div>
            Home Page Hero Banners
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Upload custom high-res banners for Desktop & Mobile, update headlines, descriptions, and CTA links.
          </p>
        </div>
        {!isAdding && !editingBanner && (
          <Button
            onClick={() => {
              resetForm();
              setIsAdding(true);
            }}
            className="bg-amber-primary hover:bg-amber-600 text-slate-950 font-black shadow-lg hover:shadow-xl transition-all"
          >
            <Plus className="w-4 h-4 mr-2" /> Add New Banner
          </Button>
        )}
      </div>

      {/* Suggested Sizes Info Box */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-md">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl shrink-0 mt-0.5">
            <Monitor className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-white">Desktop Banner Size</span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-blue-500/20 text-blue-400 border border-blue-500/30">
                1920 × 550 px
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Recommended Aspect Ratio <strong className="text-slate-200">16:5</strong>. Use landscape photography with focal points centered or right-aligned so text on the left stays legible.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3.5 border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-4">
          <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl shrink-0 mt-0.5">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-white">Mobile Banner Size</span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30">
                800 × 400 px (or 1080 × 540 px)
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Recommended Aspect Ratio <strong className="text-slate-200">2:1 Landscape</strong>. Perfect for modern mobile viewports without crowding search controls.
            </p>
          </div>
        </div>
      </div>

      {/* CREATE OR EDIT FORM MODAL / PANEL */}
      {(isAdding || editingBanner) && (
        <div className="bg-bg-card border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200 relative">
          <button
            type="button"
            onClick={resetForm}
            className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h2 className="text-xl font-black text-text-primary">
              {editingBanner ? "Edit Hero Banner" : "Create New Hero Banner"}
            </h2>
          </div>

          <form onSubmit={editingBanner ? handleEditSubmit : handleAddSubmit} className="space-y-6">
            {/* Image Upload Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Desktop Image */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-text-primary flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-blue-400" />
                    Desktop Banner Image {isAdding && <span className="text-red-500">*</span>}
                  </label>
                  <span className="text-[11px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                    1920 × 550 px
                  </span>
                </div>
                <div className="relative border-2 border-dashed border-border-default hover:border-blue-500/60 rounded-2xl p-4 flex flex-col items-center justify-center bg-bg-surface transition-colors">
                  {desktopPreview ? (
                    <div className="relative w-full h-36 rounded-xl overflow-hidden mb-3 border border-border-default">
                      <Image src={desktopPreview} alt="Desktop Preview" fill className="object-cover" />
                    </div>
                  ) : (
                    <UploadCloud className="w-10 h-10 text-slate-500 mb-2" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleDesktopFileChange}
                    className="text-xs text-text-secondary file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-500/10 file:text-blue-400 hover:file:bg-blue-500/20 cursor-pointer"
                  />
                  <span className="text-[10px] text-text-tertiary mt-1.5">JPG, PNG, WebP up to 5MB</span>
                </div>
              </div>

              {/* Mobile Image */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-text-primary flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-amber-400" />
                    Mobile Banner Image (Optional)
                  </label>
                  <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                    800 × 400 px
                  </span>
                </div>
                <div className="relative border-2 border-dashed border-border-default hover:border-amber-500/60 rounded-2xl p-4 flex flex-col items-center justify-center bg-bg-surface transition-colors">
                  {mobilePreview ? (
                    <div className="relative w-36 h-20 rounded-xl overflow-hidden mb-3 border border-border-default">
                      <Image src={mobilePreview} alt="Mobile Preview" fill className="object-cover" />
                    </div>
                  ) : (
                    <UploadCloud className="w-10 h-10 text-slate-500 mb-2" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleMobileFileChange}
                    className="text-xs text-text-secondary file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-amber-500/10 file:text-amber-400 hover:file:bg-amber-500/20 cursor-pointer"
                  />
                  <span className="text-[10px] text-text-tertiary mt-1.5">
                    Falls back to desktop image if not uploaded
                  </span>
                </div>
              </div>

            </div>

            {/* Text Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                  Headline / Title Text
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Luxury Villas in Poranki"
                  className="w-full bg-bg-surface border border-border-default rounded-xl p-3 text-text-primary font-bold focus:border-amber-primary focus:ring-1 focus:ring-amber-primary outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                  Subtitle / Description Text
                </label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="e.g. Starting from ₹1.2 Cr in Vijayawada | Gated Community"
                  className="w-full bg-bg-surface border border-border-default rounded-xl p-3 text-text-primary focus:border-amber-primary focus:ring-1 focus:ring-amber-primary outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                  Button Text (CTA)
                </label>
                <input
                  type="text"
                  value={buttonText}
                  onChange={(e) => setButtonText(e.target.value)}
                  placeholder="e.g. Explore Now"
                  className="w-full bg-bg-surface border border-border-default rounded-xl p-3 text-text-primary focus:border-amber-primary focus:ring-1 focus:ring-amber-primary outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                  Destination Link URL
                </label>
                <input
                  type="text"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="e.g. /search?type=buy&location=Poranki or /properties"
                  className="w-full bg-bg-surface border border-border-default rounded-xl p-3 text-text-primary focus:border-amber-primary focus:ring-1 focus:ring-amber-primary outline-none"
                />
              </div>
            </div>

            {/* Quick Link Helper Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs text-text-tertiary font-semibold">Quick Link Presets:</span>
              {[
                { label: "Poranki Villas", url: "/search?type=buy&location=Poranki" },
                { label: "Benz Circle", url: "/search?type=buy&location=Benz+Circle" },
                { label: "All Properties", url: "/properties" },
                { label: "New Projects", url: "/search?type=buy&saleType=new" },
                { label: "Commercial", url: "/search?category=commercial" },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setLinkUrl(preset.url)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-default">
              <Button type="button" variant="outline" onClick={resetForm} disabled={isLoading}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-amber-primary hover:bg-amber-600 text-slate-950 font-black shadow-lg"
                disabled={isLoading || (isAdding && !desktopFile)}
              >
                {isLoading ? "Saving..." : editingBanner ? "Update Banner" : "Publish Banner"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Loading state */}
      {isLoading && !isAdding && !editingBanner && (
        <div className="text-center py-16 text-text-secondary flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span>Loading hero banners...</span>
        </div>
      )}

      {/* Banners Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {banners.map((banner, index) => (
          <div
            key={banner.id}
            className="bg-bg-card border border-border-default rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col"
          >
            {/* Banner Thumbnail Preview */}
            <div className="relative aspect-[16/6] w-full bg-slate-950 overflow-hidden">
              <Image
                src={resolveMediaUrl(banner.image_url)}
                alt={banner.title || "Banner"}
                fill
                unoptimized
                className={`object-cover ${!banner.is_active ? "opacity-40 grayscale" : ""}`}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />

              {/* Text Preview Overlay */}
              <div className="absolute inset-0 p-5 flex flex-col justify-center items-start text-left">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950 mb-1.5 shadow-xs">
                  Slide #{index + 1}
                </span>
                <h3 className="text-lg sm:text-xl font-black text-white line-clamp-1 drop-shadow-md">
                  {banner.title || "Untitled Banner"}
                </h3>
                {banner.subtitle && (
                  <p className="text-xs text-slate-200 line-clamp-1 mt-0.5 drop-shadow-sm max-w-[80%]">
                    {banner.subtitle}
                  </p>
                )}
                {banner.link_url && (
                  <span className="inline-flex items-center gap-1 mt-2.5 px-3 py-1 bg-slate-900/90 text-white font-bold text-[10px] rounded-lg border border-white/20">
                    {banner.button_text || "Explore Now"} <ChevronRight className="w-3 h-3 text-amber-400" />
                  </span>
                )}
              </div>

              {/* Active / Inactive Badge */}
              <div className="absolute top-3 right-3 flex items-center gap-2">
                {banner.mobile_image_url && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-500/80 text-white backdrop-blur-xs flex items-center gap-1">
                    <Smartphone className="w-3 h-3" /> Mobile Image
                  </span>
                )}
                {banner.is_active ? (
                  <span className="text-[10px] font-black px-2.5 py-1 bg-green-500 text-white rounded-full shadow-md">
                    Active
                  </span>
                ) : (
                  <span className="text-[10px] font-black px-2.5 py-1 bg-red-500 text-white rounded-full shadow-md">
                    Inactive
                  </span>
                )}
              </div>
            </div>

            {/* Banner Card Meta & Actions */}
            <div className="p-5 flex-1 flex flex-col justify-between gap-4 bg-bg-card">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-text-primary truncate">
                    {banner.title || "Untitled Banner"}
                  </span>
                  <span className="text-[11px] text-text-tertiary font-mono">
                    {new Date(banner.created_at).toLocaleDateString()}
                  </span>
                </div>

                {banner.link_url && (
                  <div className="flex items-center text-xs text-amber-500 font-medium truncate gap-1">
                    <LinkIcon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{banner.link_url}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-border-default gap-2">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleActive(banner)}
                    className="text-xs font-bold"
                  >
                    {banner.is_active ? (
                      <>
                        <XCircle className="w-3.5 h-3.5 mr-1.5 text-amber-500" /> Deactivate
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-3.5 h-3.5 mr-1.5 text-green-500" /> Activate
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEdit(banner)}
                    className="text-xs font-bold hover:border-amber-500 hover:text-amber-500"
                  >
                    <Edit className="w-3.5 h-3.5 mr-1.5" /> Edit
                  </Button>
                </div>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(banner)}
                  className="text-xs font-bold"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
                </Button>
              </div>
            </div>
          </div>
        ))}

        {!isLoading && banners.length === 0 && !isAdding && (
          <div className="col-span-full py-16 flex flex-col items-center justify-center text-text-secondary border-2 border-dashed border-border-default rounded-3xl bg-bg-card/50">
            <div className="p-4 bg-amber-500/10 text-amber-500 rounded-2xl mb-4">
              <ImageIcon className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-text-primary mb-1">No hero banners created yet</h3>
            <p className="text-sm max-w-sm text-center mb-6">
              Add your first desktop and mobile banner to highlight properties, locations, and offers on the homepage.
            </p>
            <Button
              onClick={() => {
                resetForm();
                setIsAdding(true);
              }}
              className="bg-amber-primary hover:bg-amber-600 text-slate-950 font-black"
            >
              <Plus className="w-4 h-4 mr-2" /> Add Your First Banner
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
