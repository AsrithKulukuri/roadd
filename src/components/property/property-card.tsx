"use client";

import { useState, useMemo } from "react";
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

interface PropertyCardProps {
  property: Property;
  variant?: "default" | "compact" | "horizontal" | "category-style";
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
  const { toggleFavorite, isFavorite } = useFavoritesStore();
  const isSaved = isFavorite(property.id);
  const [isExpanded, setIsExpanded] = useState(false);

  const images = useMemo(
    () =>
      property.images && property.images.length > 0
        ? property.images
        : [
            {
              id: "fallback",
              url:
                property.coverImage ||
                "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80",
              alt: property.title,
              isPrimary: true,
              order: 0,
            },
          ],
    [property.images, property.coverImage, property.title],
  );

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
    toast.success(
      isSaved ? "Removed from saved properties" : "Saved to your favorites!",
    );
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
      return { dot: "bg-amber-500", text: "Property for Rent" };
    }
    if (property.isReadyToMove) {
      return {
        dot: "bg-amber-500",
        text:
          property.propertyType === "villa"
            ? "Villa for Sale"
            : property.propertyType === "residential-land"
              ? "Plot for Sale"
              : "House for Sale",
      };
    }
    if (property.saleType === "resale") {
      return { dot: "bg-amber-500", text: "Resale Property" };
    }
    return { dot: "bg-amber-500", text: "New Construction" };
  };

  const status = getStatusBadge();
  const brokerName = property.ownerName || "Premier AP Properties";

  if (variant === "category-style" && !isExpanded) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
        onClick={(e) => {
          e.preventDefault();
          setIsExpanded(true);
        }}
        className="w-[220px] h-[220px] rounded-2xl relative overflow-hidden group cursor-pointer border border-border-default shadow-sm shrink-0"
      >
        <img src={images[0].url} alt={property.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute top-3 right-3 z-10">
          <span className="bg-slate-900/80 backdrop-blur-md border border-white/20 text-white font-bold text-xs px-2.5 py-1 rounded-full shadow-sm">
            {property.listingType === "rent" || property.listingType === "pg"
              ? `${formatINR(property.price)}/mo`
              : formatPriceCompact(property.price)}
          </span>
        </div>
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <h3 className="font-bold text-lg leading-tight line-clamp-1 group-hover:text-amber-primary transition-colors">{property.title}</h3>
          <p className="text-xs text-white/80 flex items-center gap-1 mt-1 truncate">
            <MapPin className="w-3 h-3 shrink-0" /> {property.location.locality}
          </p>
        </div>
      </motion.div>
    );
  }

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
        <Link
          href={`/properties/${property.slug || property.id}`}
          onClick={handleCardClick}
        >
          <div
            className={cn(
              "group flex flex-col sm:flex-row rounded-2xl border border-slate-200 bg-white overflow-hidden hover:shadow-xl transition-all duration-300",
              className,
            )}
          >
            {/* Image Container */}
            <div className="relative w-full sm:w-72 h-48 sm:h-auto flex-shrink-0 overflow-hidden bg-slate-100">
              <Image
                src={images[currentImage]?.url || ""}
                alt={images[currentImage]?.alt || property.title}
                fill
                loading={index < 3 ? "eager" : "lazy"}
                className={cn(
                  "object-cover transition-all duration-700 group-hover:scale-105",
                  isImageLoaded ? "scale-100 blur-0" : "scale-110 blur-sm",
                )}
                onLoad={() => setIsImageLoaded(true)}
                sizes="(max-width: 640px) 100vw, 288px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

              {/* Badges */}
              <div className="absolute top-3 left-3 flex gap-1.5 z-10">
                {property.isFeatured && (
                  <Badge
                    variant="default"
                    className="bg-amber-500 text-white font-semibold"
                  >
                    Featured
                  </Badge>
                )}
                {property.reraId && (
                  <Badge
                    variant="rera"
                    className="bg-amber-600 text-white font-semibold"
                  >
                    RERA
                  </Badge>
                )}
              </div>

              {/* Heart Button Overlay */}
              <button
                type="button"
                className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-md flex items-center justify-center transition-all hover:scale-110 cursor-pointer"
                onClick={toggleSave}
                aria-label={isSaved ? "Remove from saved" : "Save property"}
              >
                <Heart
                  className={cn(
                    "h-4 w-4 transition-all",
                    isSaved
                      ? "fill-red-600 text-red-600 scale-110"
                      : "text-slate-700",
                  )}
                />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className={cn(
                      "w-2.5 h-2.5 rounded-full inline-block",
                      status.dot,
                    )}
                  />
                  <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                    {status.text}
                  </span>
                </div>

                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-heading text-xl font-bold text-slate-900 group-hover:text-red-600 transition-colors">
                    {property.listingType === "rent" ||
                    property.listingType === "pg"
                      ? `${formatINR(property.price)}/mo`
                      : formatPriceCompact(property.price)}
                  </h3>
                </div>

                {/* Specs */}
                <div className="flex items-center gap-3 mt-2 text-sm text-slate-700 font-medium">
                  {property.bedrooms > 0 && (
                    <span>
                      <strong className="text-slate-900 font-bold">
                        {property.bedrooms}
                      </strong>{" "}
                      bed
                    </span>
                  )}
                  {property.bathrooms > 0 && (
                    <span>
                      <strong className="text-slate-900 font-bold">
                        {property.bathrooms}
                      </strong>{" "}
                      bath
                    </span>
                  )}
                  <span>
                    <strong className="text-slate-900 font-bold">
                      {formatArea(property.area)}
                    </strong>
                  </span>
                </div>

                {/* Address */}
                <div className="mt-2 text-sm text-slate-600 line-clamp-1">
                  {property.location.locality}, {property.location.city}
                </div>
              </div>

              {/* Bottom Row */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                <span className="text-xs text-slate-500 font-medium">
                  {property.isReadyToMove
                    ? "Ready to Move"
                    : "Under Construction"}
                </span>
                {property.isOwnerVerified && (
                  <span className="text-xs text-amber-600 font-semibold flex items-center gap-1">
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

  if (variant === "category-style") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
        className="h-full"
      >
        <Link
          href={`/properties/${property.slug || property.id}`}
          onClick={handleCardClick}
          className="block h-full"
        >
          <div
            className={cn(
              "group relative w-[220px] h-[220px] sm:w-[260px] sm:h-[260px] rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer",
              className,
            )}
          >
            <Image
              src={images[0]?.url || ""}
              alt={property.title}
              fill
              className={cn(
                "object-cover transition-transform duration-700 group-hover:scale-110",
                isImageLoaded ? "blur-0 scale-100" : "blur-sm scale-110",
              )}
              onLoad={() => setIsImageLoaded(true)}
              sizes="(max-width: 640px) 220px, 260px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/30 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />

            <div className="absolute top-3 right-3 z-10">
              <span className="bg-slate-900/80 backdrop-blur-md border border-white/20 text-white font-bold text-xs px-2.5 py-1 rounded-full shadow-lg">
                {property.listingType === "rent" ||
                property.listingType === "pg"
                  ? `${formatINR(property.price)}/mo`
                  : formatPriceCompact(property.price)}
              </span>
            </div>

            <div className="absolute bottom-0 left-0 w-full p-4 z-10">
              <h3 className="font-heading font-bold text-white text-lg sm:text-xl leading-tight line-clamp-2 mb-1 group-hover:text-amber-300 transition-colors">
                {property.title}
              </h3>
              <p className="text-white/80 text-xs font-medium truncate flex items-center gap-1">
                <MapPin className="w-3 h-3 shrink-0" />
                {property.location.locality}, {property.location.city}
              </p>
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
      className="flex flex-col h-full"
    >
      <Link
        href={`/properties/${property.slug || property.id}`}
        onClick={handleCardClick}
        className="group block h-full"
      >
        <div
          className={cn(
            "relative bg-white dark:bg-bg-card border border-border-default rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 h-full flex flex-col",
            variant === "compact" ? "max-w-[280px]" : "",
            selected
              ? "ring-2 ring-red-500 border-red-500"
              : "hover:border-slate-300",
            className,
          )}
        >
          {/* Image Container */}
          <div className="relative aspect-[16/9] w-full overflow-hidden bg-bg-primary shrink-0">
            {/* Selection Checkbox */}
            {selectable && (
              <div className="absolute top-3 right-3 z-30">
                <div
                  className={cn(
                    "w-6 h-6 rounded-md flex items-center justify-center border-2 transition-colors",
                    selected
                      ? "bg-red-600 border-red-600 text-white"
                      : "bg-black/40 border-white/70 text-transparent",
                  )}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-4 h-4"
                  >
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
              </div>
            )}

            <Image
              src={images[currentImage]?.url || ""}
              alt={images[currentImage]?.alt || property.title}
              fill
              className={cn(
                "object-cover transition-transform duration-500 group-hover:scale-105",
                isImageLoaded ? "blur-0 scale-100" : "blur-sm scale-110",
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
            <div
              className={cn("absolute top-3 left-3 flex gap-2 flex-wrap z-10")}
            >
              {property.saleType === "new" && (
                <span className="bg-amber-500/10 text-amber-600 border border-amber-500/20 backdrop-blur-sm font-semibold text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> New
                </span>
              )}
              {property.isFeatured && (
                <span className="bg-amber-500/90 text-white backdrop-blur-sm font-bold text-xs px-2.5 py-1 rounded-full">
                  Featured
                </span>
              )}
              {property.reraId && (
                <span className="bg-slate-900/80 text-white backdrop-blur-sm font-bold text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Shield className="w-3 h-3" /> RERA
                </span>
              )}
            </div>

            {/* Status Bottom Left */}
            <div className="absolute bottom-3 left-3 z-10">
              <span
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-sm",
                  property.isReadyToMove
                    ? "bg-amber-500/10 text-amber-600"
                    : "bg-orange-500/10 text-orange-600",
                )}
              >
                {property.isReadyToMove
                  ? "Ready to Move"
                  : "Under Construction"}
              </span>
            </div>

            {/* Favorite Heart Button Bottom Right */}
            {!actionMenu && !selectable && (
              <div className="absolute bottom-3 right-3 z-20">
                <button
                  type="button"
                  className="w-8 h-8 rounded-full bg-white/95 hover:bg-white text-slate-800 shadow-md flex items-center justify-center transition-all hover:scale-110 cursor-pointer"
                  onClick={toggleSave}
                  aria-label={isSaved ? "Remove from saved" : "Save property"}
                >
                  <Heart
                    className={cn(
                      "h-4 w-4 transition-all",
                      isSaved
                        ? "fill-red-600 text-red-600 scale-110"
                        : "text-slate-700",
                    )}
                  />
                </button>
              </div>
            )}
          </div>

          {/* Details Section */}
          <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
            <div>
              {/* Title & Location */}
              <h3 className="font-bold text-text-primary text-lg leading-tight group-hover:text-amber-primary transition-colors line-clamp-1">
                {property.title}
              </h3>
              <div className="flex items-center gap-1 text-text-secondary text-sm mt-0.5">
                <MapPin className="w-3.5 h-3.5 shrink-0 text-amber-primary" />
                <span className="truncate">
                  {property.location.locality}, {property.location.city}{" "}
                  {property.location.pincode ? property.location.pincode : ""}
                </span>
              </div>
            </div>

            {/* Specs Pills */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {property.bedrooms > 0 && (
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-bg-primary border border-border-default text-text-secondary flex items-center gap-1">
                  <Bed className="w-3 h-3 text-amber-500" />
                  {property.bedrooms} Bed
                </span>
              )}
              {property.bathrooms > 0 && (
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-bg-primary border border-border-default text-text-secondary flex items-center gap-1">
                  <Bath className="w-3 h-3 text-amber-500" />
                  {property.bathrooms} Bath
                </span>
              )}
              {property.area > 0 && (
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-bg-primary border border-border-default text-text-secondary flex items-center gap-1">
                  <Maximize2 className="w-3 h-3 text-amber-500" />
                  {formatArea(property.area)}
                </span>
              )}
            </div>

            {/* Bottom Row / Footer */}
            <div className="pt-3 mt-1 border-t border-border-default">
              <div className="flex items-end justify-between gap-2">
                <div>
                  <p className="text-[10px] text-text-tertiary uppercase tracking-wide font-medium mb-0.5">
                    {property.listingType === "rent" ||
                    property.listingType === "pg"
                      ? "Monthly Rent"
                      : "Price"}
                  </p>
                  <p className="font-bold text-amber-primary text-base leading-tight">
                    {property.listingType === "rent" ||
                    property.listingType === "pg"
                      ? `${formatINR(property.price)}/mo`
                      : formatPriceCompact(property.price)}
                  </p>
                </div>
                <div className="text-right shrink-0 max-w-[120px]">
                  <p className="text-[10px] text-text-tertiary uppercase tracking-wide mb-0.5">
                    Brokered By
                  </p>
                  <p className="text-sm font-semibold text-text-primary truncate flex items-center justify-end gap-1">
                    {brokerName}
                    {property.isOwnerVerified && (
                      <BadgeCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    )}
                  </p>
                </div>
              </div>
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
