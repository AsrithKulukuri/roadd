"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Heart,
  MapPin,
  Bed,
  Bath,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Shield,
  BadgeCheck,
  Lock,
  ArrowDownRight,
  Mail,
  Phone,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatPriceCompact, formatArea, formatINR } from "@/lib/utils";
import type { Property } from "@/types/property";
import { useFavoritesStore } from "@/stores/favorites-store";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

interface PropertyCardProps {
  property: Property;
  variant?: "default" | "compact" | "horizontal";
  className?: string;
  index?: number;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (checked: boolean) => void;
  actionMenu?: React.ReactNode;
  distance?: number;
}

export function PropertyCard({
  property,
  variant = "default",
  className,
  index = 0,
  selectable,
  selected,
  onSelect,
  actionMenu,
  distance,
}: PropertyCardProps) {
  const router = useRouter();
  const [currentImage, setCurrentImage] = useState(0);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const { toggleFavorite, isFavorite } = useFavoritesStore();
  const isSaved = isFavorite(property.id);

  const images = property.images && property.images.length > 0 ? property.images : [
    { id: "fallback", url: property.coverImage || "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80", alt: property.title, isPrimary: true, order: 0 }
  ];

  useEffect(() => {
    const checkAuth = async () => {
      if (isSupabaseConfigured()) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            setIsLoggedIn(true);
            return;
          }
        } catch (e) {}
      }
      
      const stored = localStorage.getItem("road_user");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.isLoggedIn) {
            setIsLoggedIn(true);
            return;
          }
        } catch (e) {}
      }
      setIsLoggedIn(true);
    };

    checkAuth();
  }, []);

  const nextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImage((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImage((prev) => (prev - 1 + images.length) % images.length);
  };

  const toggleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(property.id);
    toast.success(isSaved ? "Removed from saved properties" : "Saved to your favorites!");
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (selectable && onSelect) {
      e.preventDefault();
      onSelect(!selected);
    }
  };

  // Determine Realtor.com-style Status dot and text
  const getStatusBadge = () => {
    if (property.listingType === "rent" || property.listingType === "pg") {
      return { dot: "bg-purple-500", text: "Property for Rent" };
    }
    if (property.isReadyToMove) {
      return { dot: "bg-emerald-500", text: property.propertyType === "villa" ? "Villa for Sale" : property.propertyType === "residential-land" ? "Plot for Sale" : "House for Sale" };
    }
    if (property.saleType === "resale") {
      return { dot: "bg-amber-500", text: "Resale Property" };
    }
    return { dot: "bg-blue-500", text: "New Construction" };
  };

  const status = getStatusBadge();
  const brokerName = property.ownerName || "Premier AP Properties";

  if (variant === "horizontal") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
      >
        <div className="text-[11px] text-slate-500 mb-1 font-medium px-1">
          Brokered by {brokerName}
        </div>
        <Link href={`/properties/${property.slug}`} onClick={handleCardClick}>
          <div
            className={cn(
              "group flex flex-col sm:flex-row rounded-2xl border border-slate-200 bg-white overflow-hidden hover:shadow-xl transition-all duration-300",
              className
            )}
          >
            {/* Image Container */}
            <div className="relative w-full sm:w-72 h-48 sm:h-auto flex-shrink-0 overflow-hidden bg-slate-100">
              <Image
                src={images[currentImage]?.url || ""}
                alt={images[currentImage]?.alt || property.title}
                fill
                className={cn(
                  "object-cover transition-all duration-700 group-hover:scale-105",
                  isImageLoaded ? "scale-100 blur-0" : "scale-110 blur-sm"
                )}
                onLoad={() => setIsImageLoaded(true)}
                sizes="(max-width: 640px) 100vw, 288px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              
              {/* Badges */}
              <div className="absolute top-3 left-3 flex gap-1.5 z-10">
                {property.isFeatured && <Badge variant="default" className="bg-amber-500 text-white font-semibold">Featured</Badge>}
                {property.reraId && <Badge variant="rera" className="bg-emerald-600 text-white font-semibold">RERA</Badge>}
              </div>

              {/* Heart Button Overlay */}
              <button
                type="button"
                className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-md flex items-center justify-center transition-all hover:scale-110 cursor-pointer"
                onClick={toggleSave}
                aria-label={isSaved ? "Remove from saved" : "Save property"}
              >
                <Heart
                  className={cn("h-4 w-4 transition-all", isSaved ? "fill-red-600 text-red-600 scale-110" : "text-slate-700")}
                />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={cn("w-2.5 h-2.5 rounded-full inline-block", status.dot)} />
                  <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">{status.text}</span>
                </div>

                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-heading text-xl font-bold text-slate-900 group-hover:text-red-600 transition-colors">
                    {property.listingType === "rent" || property.listingType === "pg"
                      ? `${formatINR(property.price)}/mo`
                      : formatPriceCompact(property.price)}
                  </h3>
                </div>

                {/* Specs */}
                <div className="flex items-center gap-3 mt-2 text-sm text-slate-700 font-medium">
                  {property.bedrooms > 0 && (
                    <span><strong className="text-slate-900 font-bold">{property.bedrooms}</strong> bed</span>
                  )}
                  {property.bathrooms > 0 && (
                    <span><strong className="text-slate-900 font-bold">{property.bathrooms}</strong> bath</span>
                  )}
                  <span><strong className="text-slate-900 font-bold">{formatArea(property.area)}</strong></span>
                </div>

                {/* Address */}
                <div className="mt-2 text-sm text-slate-600 line-clamp-1">
                  {property.location.locality}, {property.location.city}
                </div>
              </div>

              {/* Bottom Row */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                <span className="text-xs text-slate-500 font-medium">{property.isReadyToMove ? "Ready to Move" : "Under Construction"}</span>
                {property.isOwnerVerified && (
                  <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                    <BadgeCheck className="w-3.5 h-3.5" /> Verified Listing
                  </span>
                )}
              </div>
            </div>
          </div>
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
      className="flex flex-col"
    >
      {/* Top Broker Label */}
      <div className="text-[11px] text-slate-500 mb-1 font-medium px-1 line-clamp-1">
        Brokered by {brokerName}
      </div>

      <Link href={`/properties/${property.slug}`} onClick={handleCardClick} className="block group">
        <div
          className={cn(
            "rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 relative flex flex-col justify-between",
            variant === "compact" ? "max-w-[280px]" : "",
            selected ? "ring-2 ring-red-500 border-red-500" : "hover:border-slate-300",
            className
          )}
        >
          {/* Image Container with Realtor.com Rounded Corners */}
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
            {/* Selection Checkbox */}
            {selectable && (
              <div className="absolute top-3 left-3 z-20">
                <div
                  className={cn(
                    "w-6 h-6 rounded-md flex items-center justify-center border-2 transition-colors",
                    selected ? "bg-red-600 border-red-600 text-white" : "bg-black/40 border-white/70 text-transparent"
                  )}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
              </div>
            )}
            
            <Image
              src={images[currentImage]?.url || ""}
              alt={images[currentImage]?.alt || property.title}
              fill
              className={cn(
                "object-cover transition-all duration-700 group-hover:scale-105",
                isImageLoaded ? "blur-0 scale-100" : "blur-sm scale-110"
              )}
              onLoad={() => setIsImageLoaded(true)}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />

            {/* Image navigation arrows */}
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )}

            {/* Top Badges */}
            <div className={cn("absolute left-3 flex gap-1.5 flex-wrap z-10", selectable ? "top-11" : "top-3")}>
              {property.saleType === "new" && (
                <span className="bg-blue-600 text-white font-bold text-[10px] uppercase px-2 py-0.5 rounded-full shadow-xs">
                  New
                </span>
              )}
              {property.isFeatured && (
                <span className="bg-amber-500 text-white font-bold text-[10px] uppercase px-2 py-0.5 rounded-full shadow-xs">
                  Featured
                </span>
              )}
              {property.reraId && (
                <span className="bg-emerald-600 text-white font-bold text-[10px] uppercase px-2 py-0.5 rounded-full shadow-xs flex items-center gap-0.5">
                  <Shield className="w-2.5 h-2.5" /> RERA
                </span>
              )}
            </div>

            {/* White Circular Favorite Heart Button */}
            {!actionMenu && (
              <button
                type="button"
                className="absolute bottom-3 right-3 z-10 w-9 h-9 rounded-full bg-white/95 hover:bg-white text-slate-800 shadow-md flex items-center justify-center transition-all hover:scale-110 cursor-pointer"
                onClick={toggleSave}
                aria-label={isSaved ? "Remove from saved" : "Save property"}
              >
                <Heart
                  className={cn(
                    "h-4.5 w-4.5 transition-all",
                    isSaved ? "fill-red-600 text-red-600 scale-110" : "text-slate-700"
                  )}
                />
              </button>
            )}
          </div>

          {/* Details Section Below Image */}
          <div className="p-4 space-y-2">
            {/* Status Dot Row */}
            <div className="flex items-center gap-2">
              <span className={cn("w-2.5 h-2.5 rounded-full inline-block flex-shrink-0", status.dot)} />
              <span className="text-xs font-semibold text-slate-700">{status.text}</span>
            </div>

            {/* Price Display with optional Price Drop */}
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 tracking-tight">
                {property.listingType === "rent" || property.listingType === "pg"
                  ? `${formatINR(property.price)}/mo`
                  : formatPriceCompact(property.price)}
              </span>
              {property.isFeatured && (
                <span className="text-xs font-semibold text-emerald-600 flex items-center gap-0.5">
                  <ArrowDownRight className="w-3 h-3" /> ↓ ₹50k
                </span>
              )}
            </div>

            {/* Specs Line: bold numbers + normal labels */}
            <div className="flex items-center gap-3 text-sm text-slate-700 pt-1">
              {property.bedrooms > 0 && (
                <span>
                  <strong className="font-bold text-slate-900">{property.bedrooms}</strong> bed
                </span>
              )}
              {property.bathrooms > 0 && (
                <span>
                  <strong className="font-bold text-slate-900">{property.bathrooms}</strong> bath
                </span>
              )}
              <span>
                <strong className="font-bold text-slate-900">{formatArea(property.area)}</strong>
              </span>
            </div>

            {/* Address Lines */}
            <div className="text-sm text-slate-600 space-y-0.5 pt-1">
              <div className="font-medium text-slate-800 line-clamp-1">
                {property.title}
              </div>
              <div className="text-xs text-slate-500 line-clamp-1">
                {property.location.locality}, {property.location.city} {property.location.pincode ? property.location.pincode : ""}
              </div>
            </div>

            {/* Bottom Row */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-2 text-xs">
              <span className="text-slate-500 font-medium">
                {property.isReadyToMove ? "Ready to Move" : "Under Construction"}
              </span>
              {property.isOwnerVerified && (
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <BadgeCheck className="w-3.5 h-3.5" /> Verified
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export function PropertyCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <div className="aspect-[4/3] bg-slate-200 animate-pulse" />
      <div className="p-4 space-y-3">
        <div className="h-6 w-1/2 bg-slate-200 animate-pulse rounded" />
        <div className="h-4 w-3/4 bg-slate-200 animate-pulse rounded" />
        <div className="h-4 w-2/3 bg-slate-200 animate-pulse rounded" />
        <div className="flex justify-between pt-3 border-t border-slate-100">
          <div className="h-4 w-16 bg-slate-200 animate-pulse rounded" />
        </div>
      </div>
    </div>
  );
}
