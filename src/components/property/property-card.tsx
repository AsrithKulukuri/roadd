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
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { toggleFavorite, isFavorite } = useFavoritesStore();
  const isSaved = isFavorite(property.id);

  const images = property.images;

  // Check login state
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
      setIsLoggedIn(false);
    };

    checkAuth();
  }, []);

  const nextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn) return;
    setCurrentImage((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn) return;
    setCurrentImage((prev) => (prev - 1 + images.length) % images.length);
  };

  const toggleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn) {
      toast.error("Sign in required", {
        description: "Please sign in to save properties to your favorites.",
      });
      router.push("/login");
      return;
    }
    toggleFavorite(property.id);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (selectable && onSelect) {
      e.preventDefault();
      onSelect(!selected);
    }
  };

  if (variant === "horizontal") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: index * 0.05 }}
      >
        <Link href={`/properties/${property.slug}`} onClick={handleCardClick}>
          <div
            className={cn(
              "group flex flex-col sm:flex-row rounded-2xl border border-border-default bg-bg-card overflow-hidden hover-lift amber-border-glow",
              className
            )}
          >
            {/* Image */}
            <div className="relative w-full sm:w-72 h-48 sm:h-auto flex-shrink-0 overflow-hidden">
              <Image
                src={images[currentImage]?.url || ""}
                alt={images[currentImage]?.alt || property.title}
                fill
                className={cn(
                  "object-cover transition-all duration-700",
                  isImageLoaded ? "scale-100 blur-0" : "scale-110 blur-sm"
                )}
                onLoad={() => setIsImageLoaded(true)}
                sizes="(max-width: 640px) 100vw, 288px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              <div className="absolute top-3 left-3 flex gap-1.5 z-10">
                {property.isFeatured && <Badge variant="default">Featured</Badge>}
                {property.reraId && <Badge variant="rera">RERA</Badge>}
              </div>

              {isLoggedIn && (
                <Button
                  type="button"
                  variant="glass"
                  size="icon-sm"
                  className="absolute top-3 right-3 z-10"
                  onClick={toggleSave}
                  aria-label={isSaved ? "Remove from saved" : "Save property"}
                >
                  <Heart
                    className={cn("h-4 w-4", isSaved && "fill-amber-primary text-amber-primary")}
                  />
                </Button>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    {distance !== undefined && isLoggedIn && (
                      <div className="text-[10px] text-amber-primary font-bold bg-amber-primary/10 border border-amber-primary/20 px-2.5 py-0.5 rounded-full w-fit mb-1.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {distance < 1 ? `${Math.round(distance * 1000)}m away` : `${distance.toFixed(1)} km away`}
                      </div>
                    )}
                    <h3 className="font-heading text-lg font-bold text-text-primary line-clamp-1 group-hover:text-amber-primary transition-colors">
                      {property.title}
                    </h3>
                  </div>
                  {isLoggedIn ? (
                    <p className="font-heading text-lg font-bold text-amber-primary whitespace-nowrap">
                      {property.listingType === "rent"
                        ? `${formatINR(property.price)}/mo`
                        : formatPriceCompact(property.price)}
                    </p>
                  ) : (
                    <span className="text-xs font-semibold px-2.5 py-1 bg-amber-primary/10 border border-amber-primary/20 text-amber-primary rounded-full flex items-center gap-1 h-fit">
                      <Lock className="w-3.5 h-3.5" /> Price Locked
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-1.5 text-text-secondary">
                  <MapPin className="h-3.5 w-3.5 text-amber-primary/70 flex-shrink-0" />
                  <span className="text-sm line-clamp-1">
                    {property.location.locality}, {property.location.city}
                  </span>
                </div>
                <p className="text-sm text-text-tertiary mt-2 line-clamp-2">
                  {property.description}
                </p>
              </div>
              
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border-default">
                {property.bedrooms > 0 && (
                  <div className="flex items-center gap-1.5 text-text-secondary text-sm">
                    <Bed className="h-4 w-4" />
                    <span>{property.bedrooms} Beds</span>
                  </div>
                )}
                {property.bathrooms > 0 && (
                  <div className="flex items-center gap-1.5 text-text-secondary text-sm">
                    <Bath className="h-4 w-4" />
                    <span>{property.bathrooms} Baths</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-text-secondary text-sm">
                  <Maximize2 className="h-4 w-4" />
                  <span>{formatArea(property.area)}</span>
                </div>
                {property.isOwnerVerified && (
                  <div className="flex items-center gap-1 text-amber-primary text-sm ml-auto">
                    <BadgeCheck className="h-4 w-4" />
                    <span className="text-xs font-medium">Verified</span>
                  </div>
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
      transition={{ duration: 0.4, delay: index * 0.08 }}
    >
      <Link href={`/properties/${property.slug}`} onClick={handleCardClick}>
        <div
          className={cn(
            "group rounded-2xl border bg-bg-card overflow-hidden hover-lift transition-all relative",
            variant === "compact" ? "max-w-[280px]" : "",
            selected ? "border-amber-primary ring-2 ring-amber-primary/50" : "border-border-default hover:border-amber-primary/50",
            className
          )}
        >
          {/* Image Carousel */}
          <div className="relative aspect-[4/3] overflow-hidden">
            {/* Selection Checkbox */}
            {selectable && isLoggedIn && (
              <div className="absolute top-3 left-3 z-20">
                <div className={cn(
                  "w-6 h-6 rounded-md flex items-center justify-center border-2 transition-colors",
                  selected ? "bg-amber-primary border-amber-primary text-bg-primary" : "bg-black/40 border-white/70 text-transparent"
                )}>
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
                isImageLoaded ? "blur-0" : "blur-sm"
              )}
              onLoad={() => setIsImageLoaded(true)}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

            {/* Image navigation */}
            {isLoggedIn && images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full glass flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-4 w-4 text-white" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full glass flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-4 w-4 text-white" />
                </button>
                {/* Dots */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                  {images.slice(0, 5).map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "w-1.5 h-1.5 rounded-full transition-all",
                        i === currentImage
                          ? "bg-amber-primary w-4"
                          : "bg-white/50"
                      )}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Badges */}
            <div className={cn("absolute left-3 flex gap-1.5 flex-wrap z-10", selectable ? "top-11" : "top-3")}>
              {property.isFeatured && (
                <Badge variant="premium" className="text-[0.65rem]">
                  ★ Featured
                </Badge>
              )}
              {property.reraId && (
                <Badge variant="rera" className="text-[0.65rem]">
                  <Shield className="h-3 w-3 mr-0.5" />
                  RERA
                </Badge>
              )}
            </div>

            {/* Save Button */}
            {isLoggedIn && !actionMenu && (
              <Button
                variant="glass"
                size="icon-sm"
                className="absolute top-3 right-3 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all z-10"
                onClick={toggleSave}
                aria-label={isSaved ? "Remove from saved" : "Save property"}
              >
                <Heart
                  className={cn(
                    "h-4 w-4 transition-all",
                    isSaved
                      ? "fill-amber-primary text-amber-primary scale-110"
                      : "text-white"
                  )}
                />
              </Button>
            )}

            {/* Price */}
            <div className="absolute bottom-3 left-3 z-10">
              {isLoggedIn ? (
                <p className="font-heading text-xl font-bold text-white drop-shadow-lg">
                  {property.listingType === "rent" || property.listingType === "pg"
                    ? `${formatINR(property.price)}/mo`
                    : formatPriceCompact(property.price)}
                </p>
              ) : (
                <div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm border border-white/20 text-amber-primary px-2.5 py-1 rounded-full text-xs font-bold shadow-sm">
                  <Lock className="w-3.5 h-3.5" /> Price Locked
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            {distance !== undefined && isLoggedIn && (
              <div className="text-[10px] text-amber-primary font-bold bg-amber-primary/10 border border-amber-primary/20 px-2.5 py-0.5 rounded-full w-fit mb-2 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {distance < 1 ? `${Math.round(distance * 1000)}m away` : `${distance.toFixed(1)} km away`}
              </div>
            )}
            <h3 className="font-heading text-base font-bold text-text-primary line-clamp-1 group-hover:text-amber-primary transition-colors">
              {property.title}
            </h3>

            <div className="flex items-center gap-1.5 mt-1.5">
              <MapPin className="h-3.5 w-3.5 text-amber-primary/70 flex-shrink-0" />
              <span className="text-sm text-text-secondary line-clamp-1">
                {property.location.locality}, {property.location.city}
              </span>
            </div>

            {/* Specs */}
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border-subtle">
              {property.bedrooms > 0 && (
                <div className="flex items-center gap-1 text-text-secondary">
                  <Bed className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">{property.bedrooms}</span>
                </div>
              )}
              {property.bathrooms > 0 && (
                <div className="flex items-center gap-1 text-text-secondary">
                  <Bath className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">{property.bathrooms}</span>
                </div>
              )}
              <div className="flex items-center gap-1 text-text-secondary">
                <Maximize2 className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">{formatArea(property.area)}</span>
              </div>
              {property.isOwnerVerified && (
                <div className="flex items-center gap-1 text-amber-primary ml-auto">
                  <BadgeCheck className="h-3.5 w-3.5" />
                </div>
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
    <div className="rounded-2xl border border-border-default bg-bg-card overflow-hidden">
      <div className="aspect-[4/3] skeleton" />
      <div className="p-4 space-y-3">
        <div className="h-5 w-3/4 skeleton" />
        <div className="h-4 w-1/2 skeleton" />
        <div className="flex gap-3 pt-3 border-t border-border-subtle">
          <div className="h-4 w-12 skeleton" />
          <div className="h-4 w-12 skeleton" />
          <div className="h-4 w-16 skeleton" />
        </div>
      </div>
    </div>
  );
}
