"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Heart,
  Share2,
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
  Sparkles,
  Award,
  CheckCircle2,
  Tag,
  Compass,
  Layers,
  Home,
  Building2,
  IndianRupee,
  SquareDashed,
  Route,
  ShieldCheck,
  Image as ImageIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatPriceCompact, formatArea, formatINR, formatPropertyType } from "@/lib/utils";
import { getYoutubeEmbedUrl } from "@/lib/utils";
import { getRefId } from "@/lib/ref-id";
import { shareItem } from "@/lib/share-utils";
import { shareOnWhatsApp } from "@/lib/whatsapp/whatsapp-share";
import { WhatsAppIcon } from "@/components/property/whatsapp-share-button";
import { useFavoritesStore } from "@/stores/favorites-store";
import type { Property } from "@/types/property";

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

function getOrdinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

interface TableColumn {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  label: string;
}

interface SpecChip {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
}

export function resolvePropertyCardDetails(property: Property) {
  const pType = (property.propertyType || "").toLowerCase();
  const subType = (property.subtype || "").toLowerCase();
  const title = (property.title || "").toLowerCase();
  const desc = (property.description || "").toLowerCase();

  const isLand =
    pType.includes("land") ||
    pType.includes("plot") ||
    subType.includes("plot") ||
    subType.includes("land") ||
    subType.includes("venture") ||
    title.includes("plot") ||
    title.includes("land") ||
    title.includes("sqyard");

  const isVilla =
    pType === "villa" ||
    pType === "independent-house" ||
    subType === "villa" ||
    subType === "house" ||
    title.includes("villa") ||
    title.includes("independent house") ||
    title.includes("duplex") ||
    title.includes("triplex");

  const isCommercial =
    property.category === "commercial" ||
    pType.startsWith("commercial") ||
    pType === "shops" ||
    pType === "buildings" ||
    subType.includes("shop") ||
    subType.includes("office");

  const isRent = property.listingType === "rent" || property.listingType === "pg";

  // 1. Sq.Yards calculation for plots & villas
  let plotSqYards = 0;
  if (property.plotArea && property.plotArea > 0) {
    plotSqYards = property.plotArea;
  } else if (property.attributes && typeof property.attributes === "object") {
    const attr = property.attributes as Record<string, unknown>;
    if (attr.plotArea) plotSqYards = Number(attr.plotArea) || 0;
    else if (attr.sqYards) plotSqYards = Number(attr.sqYards) || 0;
    else if (attr.plotSize) plotSqYards = Number(attr.plotSize) || 0;
  }

  // Regex fallback (e.g. "418 Sqyards Land for Sale")
  if (!plotSqYards) {
    const match = property.title.match(/(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:sq\.?\s*yards?|sqyds?|sqyd)/i);
    if (match && match[1]) {
      plotSqYards = parseFloat(match[1].replace(/,/g, ""));
    }
  }

  // If still not found and isLand, check property.area
  if (!plotSqYards && isLand && property.area) {
    plotSqYards = property.area > 600 ? Math.round(property.area / 9) : Math.round(property.area);
  }

  // Built-up Area in Sq.Ft
  let builtUpSqFt = property.builtUpArea || property.superBuiltUpArea || property.carpetArea || 0;
  if (!builtUpSqFt) {
    if (isLand && plotSqYards) {
      builtUpSqFt = property.area && property.area > plotSqYards ? property.area : Math.round(plotSqYards * 9);
    } else {
      builtUpSqFt = property.area || 0;
    }
  }

  const sqFtForLand = isLand
    ? property.area && property.area > (plotSqYards || 0)
      ? property.area
      : Math.round((plotSqYards || 0) * 9)
    : builtUpSqFt;

  const centsValue = plotSqYards > 0 ? (plotSqYards / 48.4).toFixed(1) : null;

  // Rate calculations
  let ratePerSqYd = 0;
  let ratePerSqFt = property.pricePerSqft ? Math.round(property.pricePerSqft) : 0;
  if (property.price > 0) {
    if (plotSqYards > 0) {
      ratePerSqYd = Math.round(property.price / plotSqYards);
      if (!ratePerSqFt) ratePerSqFt = Math.round(property.price / (plotSqYards * 9));
    } else if (builtUpSqFt > 0) {
      if (!ratePerSqFt) ratePerSqFt = Math.round(property.price / builtUpSqFt);
      ratePerSqYd = Math.round(ratePerSqFt * 9);
    }
  }

  // Facing formatting
  const rawFacing = property.facing || (property.attributes as Record<string, unknown> | undefined)?.facing as string | undefined;
  let facingShort = "On request";
  let facingFormatted = "Facing on request";
  if (rawFacing) {
    const clean = String(rawFacing).toLowerCase().trim();
    if (clean.includes("north-east") || clean.includes("northeast")) {
      facingShort = "North-East";
    } else if (clean.includes("north-west") || clean.includes("northwest")) {
      facingShort = "North-West";
    } else if (clean.includes("south-east") || clean.includes("southeast")) {
      facingShort = "South-East";
    } else if (clean.includes("south-west") || clean.includes("southwest")) {
      facingShort = "South-West";
    } else if (clean.includes("east")) {
      facingShort = "East";
    } else if (clean.includes("west")) {
      facingShort = "West";
    } else if (clean.includes("north")) {
      facingShort = "North";
    } else if (clean.includes("south")) {
      facingShort = "South";
    } else {
      facingShort = clean.charAt(0).toUpperCase() + clean.slice(1);
    }
    facingFormatted = `${facingShort} Facing`;
  } else if (title.includes("east") || desc.includes("east facing")) {
    facingShort = "East";
    facingFormatted = "East Facing";
  } else if (title.includes("north") || desc.includes("north facing")) {
    facingShort = "North";
    facingFormatted = "North Facing";
  } else if (title.includes("west") || desc.includes("west facing")) {
    facingShort = "West";
    facingFormatted = "West Facing";
  } else if (title.includes("south") || desc.includes("south facing")) {
    facingShort = "South";
    facingFormatted = "South Facing";
  } else if (property.vastuCompliant) {
    facingShort = "Vastu";
    facingFormatted = "100% Vastu";
  }

  // Floor level
  const floorNum = property.floorNumber || (property.attributes as Record<string, unknown> | undefined)?.floorNumber as number | undefined;
  const totalFl = property.totalFloors || property.floors || (property.attributes as Record<string, unknown> | undefined)?.totalFloors as number | undefined;
  const floorLabel = floorNum && totalFl
    ? `Floor ${floorNum} of ${totalFl}`
    : floorNum
    ? `${floorNum}${getOrdinal(floorNum)} Floor`
    : totalFl && totalFl > 1
    ? `${totalFl} Floors`
    : "On request";

  // Furnishing
  const furnishing = property.furnishing;
  const furnishingLabel =
    furnishing === "furnished" ? "Furnished" : furnishing === "semi-furnished" ? "Semi-Furnished" : furnishing === "unfurnished" ? "Unfurnished" : "Furnishing on request";

  // Road width
  const roadWidth = property.roadWidth || (property.attributes as Record<string, unknown> | undefined)?.roadWidth as number | undefined;

  // 1. Three-column Table Box (Height 50px, white box with black text)
  let tableColumns: TableColumn[] = [];

  if (isLand) {
    tableColumns = [
      {
        icon: Maximize2,
        value: plotSqYards > 0 ? `${plotSqYards} Sq.Yd` : `${sqFtForLand} sft`,
        label: "Plot Area",
      },
      {
        icon: Compass,
        value: facingShort,
        label: "Facing",
      },
      {
        icon: IndianRupee,
        value: ratePerSqYd > 0 ? `₹${ratePerSqYd.toLocaleString("en-IN")}` : "On request",
        label: "Rate / sq.yd",
      },
    ];
  } else if (isVilla) {
    tableColumns = [
      {
        icon: Home,
        value: property.bedrooms > 0 ? `${property.bedrooms} BHK` : "Villa",
        label: property.floors === 3 ? "Triplex" : property.floors === 2 ? "Duplex" : "Villa",
      },
      {
        icon: Maximize2,
        value: builtUpSqFt > 0 ? `${builtUpSqFt.toLocaleString("en-IN")} sft` : "On request",
        label: "Built-up",
      },
      {
        icon: SquareDashed,
        value: plotSqYards > 0 ? `${plotSqYards} Sq.Yd` : facingShort,
        label: plotSqYards > 0 ? "Plot Size" : "Facing",
      },
    ];
  } else if (isCommercial) {
    tableColumns = [
      {
        icon: Building2,
        value: builtUpSqFt > 0 ? `${builtUpSqFt.toLocaleString("en-IN")} sft` : "On request",
        label: "Super Area",
      },
      {
        icon: Layers,
        value: floorLabel,
        label: "Floor",
      },
      {
        icon: IndianRupee,
        value: ratePerSqFt > 0 ? `₹${ratePerSqFt.toLocaleString("en-IN")}` : "On request",
        label: "Rate / sft",
      },
    ];
  } else {
    // Flats / Apartments
    tableColumns = [
      {
        icon: Bed,
        value: property.bedrooms > 0 ? `${property.bedrooms} BHK` : "Apartment",
        label: "Config",
      },
      {
        icon: Maximize2,
        value: builtUpSqFt > 0 ? `${builtUpSqFt.toLocaleString("en-IN")} sft` : "On request",
        label: "Built-up",
      },
      {
        icon: Compass,
        value: facingShort,
        label: "Facing",
      },
    ];
  }

  // 2. Middle Row: Specialized Highlights (Utilizing Empty Space with 2 Spacious Columns)
  let specHeader = { title: "Property Highlights", badge: "Verified" };
  let specChips: SpecChip[] = [];

  if (isLand) {
    specHeader = {
      title: "Plot Highlights",
      badge: centsValue ? `${centsValue} Cents` : "Clear Title",
    };
    specChips = [
      {
        icon: Maximize2,
        title: `${sqFtForLand.toLocaleString("en-IN")} sq.ft`,
        subtitle: "Total Land Area",
      },
      {
        icon: Route,
        title: roadWidth ? `${roadWidth} ft road` : "Road width on request",
        subtitle: "Approach road",
      },
    ];
  } else if (isVilla) {
    specHeader = {
      title: "Villa Layout & Specs",
      badge: property.bathrooms > 0 ? `${property.bathrooms} Baths` : "Private",
    };
    specChips = [
      {
        icon: Home,
        title: property.bathrooms ? `${property.bathrooms} bathrooms` : "Bathrooms on request",
        subtitle: property.floors ? `${property.floors} floors` : "",
      },
      {
        icon: Compass,
        title: property.parking ? `${property.parking} parking spaces` : "Parking on request",
        subtitle: property.vastuCompliant ? "Vastu compliant" : "",
      },
    ];
  } else if (isCommercial) {
    specHeader = {
      title: "Commercial Highlights",
      badge: "Prime Location",
    };
    const carpetSq = property.carpetArea;
    specChips = [
      {
        icon: Maximize2,
        title: carpetSq ? `${carpetSq.toLocaleString("en-IN")} sq.ft carpet` : "Carpet area on request",
        subtitle: floorLabel,
      },
      {
        icon: ShieldCheck,
        title: furnishingLabel,
        subtitle: property.parking ? `${property.parking} parking spaces` : "",
      },
    ];
  } else {
    // Flats / Apartments
    specHeader = {
      title: "Apartment Highlights",
      badge: property.bathrooms > 0 ? `${property.bathrooms} Baths` : "Verified",
    };
    specChips = [
      {
        icon: Bath,
        title: property.bathrooms ? `${property.bathrooms} bathrooms` : "Bathrooms on request",
        subtitle: floorLabel,
      },
      {
        icon: Home,
        title: furnishingLabel,
        subtitle: property.parking ? `${property.parking} parking spaces` : "",
      },
    ];
  }

  // 3. Rate Subtitle in Price Section
  const rateSubtitle = isRent
    ? property.securityDeposit
      ? `· Dep. ₹${formatPriceCompact(property.securityDeposit)}`
      : ""
    : isLand
    ? ratePerSqYd > 0
      ? `· ₹${ratePerSqYd.toLocaleString("en-IN")}/yd`
      : ""
    : ratePerSqFt > 0
    ? `· ₹${ratePerSqFt.toLocaleString("en-IN")}/sft`
    : "";

  return {
    isLand,
    isVilla,
    isCommercial,
    isRent,
    plotSqYards,
    builtUpSqFt,
    tableColumns,
    specHeader,
    specChips,
    rateSubtitle,
  };
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
  const areaUnit = property.attributes && typeof property.attributes === "object" && "areaUnit" in property.attributes
    ? String((property.attributes as Record<string, unknown>).areaUnit || "")
    : undefined;

  if (variant === "compact") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25, delay: index * 0.03 }}
        className="h-full"
      >
        <Link
          href={`/properties/${property.slug || property.id}`}
          onClick={handleCardClick}
          className="block h-full group"
        >
          <div
            className={cn(
              "flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs hover:shadow-lg transition-all duration-200",
              className
            )}
          >
            {/* Image Thumbnail */}
            <div className="relative h-[112px] w-full overflow-hidden bg-slate-100 sm:h-[142px] md:h-[168px]">
              <Image
                src={images[0]?.url || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80"}
                alt={property.title}
                fill
                loading={index < 4 ? "eager" : "lazy"}
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 640px) 180px, 280px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              
              {/* Badge */}
              <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
                {property.isRoadExclusive && (
                  <span className="px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-black bg-amber-500 text-slate-950 shadow-sm border border-amber-400">
                    ⭐ Exclusive
                  </span>
                )}
                <span className="px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-black bg-slate-900/80 backdrop-blur-xs text-white border border-white/10">
                  {property.bedrooms ? `${property.bedrooms} BHK` : property.propertyType}
                </span>
              </div>

              {/* Price Tag Overlay on Image bottom-left */}
              <div className="absolute bottom-1 left-1.5">
                <span className="text-white font-black text-xs sm:text-sm drop-shadow-md">
                  {formatPriceCompact(property.price)}
                </span>
              </div>
            </div>

            {/* Compact Details below Image */}
            <div className="flex min-h-[60px] flex-col justify-center p-2.5 sm:p-3">
              <h4 className="truncate text-[13px] font-extrabold text-slate-900 transition-colors group-hover:text-amber-500 dark:text-white sm:text-sm">
                {property.title}
              </h4>
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 flex items-center gap-0.5">
                <MapPin className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                <span>{property.location.locality}, {property.location.city}</span>
              </p>
            </div>
          </div>
        </Link>
      </motion.div>
    );
  }

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
        className="w-[160px] h-[160px] sm:w-[220px] sm:h-[220px] rounded-2xl relative overflow-hidden group cursor-pointer border border-border-default shadow-sm shrink-0"
      >
        <img src={images[0].url} alt={property.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10">
          <span className="bg-slate-900/80 backdrop-blur-md border border-white/20 text-white font-bold text-[10px] sm:text-xs px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full shadow-sm">
            {property.listingType === "rent" || property.listingType === "pg"
              ? `${formatINR(property.price)}/mo`
              : formatPriceCompact(property.price)}
          </span>
        </div>
        <div className="absolute bottom-2 left-2 right-2 sm:bottom-4 sm:left-4 sm:right-4 text-white">
          <h3 className="font-bold text-sm sm:text-lg leading-tight line-clamp-1 group-hover:text-amber-primary transition-colors">{property.title}</h3>
          <p className="text-[10px] sm:text-xs text-white/80 flex items-center gap-1 mt-0.5 sm:mt-1 truncate">
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
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

              {/* Subtle Shimmer Light Reflection on Hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />

              {/* Glowing Badges */}
              <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10 pointer-events-none">
                {property.isRoadExclusive && (
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500 text-slate-950 shadow-xs border border-amber-300/60 backdrop-blur-md"
                  >
                    <Sparkles className="w-3 h-3 fill-slate-950 text-slate-950" /> ROAD Exclusive
                  </span>
                )}
                {(property.displayCategory === "featured" || property.isFeatured) && (
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-slate-950 shadow-xs border border-amber-300/60 backdrop-blur-md"
                  >
                    <Sparkles className="w-3 h-3 text-slate-950" /> Featured
                  </span>
                )}
                {property.displayCategory === "recommended" && !property.isFeatured && (
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white shadow-xs border border-blue-400/40 backdrop-blur-md"
                  >
                    <CheckCircle2 className="w-3 h-3 text-white" /> Recommended
                  </span>
                )}
                {property.displayCategory === "budget_friendly" && (
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-600 text-white shadow-xs border border-teal-400/40 backdrop-blur-md"
                  >
                    <Tag className="w-3 h-3 text-white" /> Budget Friendly
                  </span>
                )}
                {property.reraId && (
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-950/85 text-amber-400 border border-amber-400/30 backdrop-blur-md shadow-xs"
                  >
                    <Shield className="w-3 h-3 text-amber-400" /> RERA
                  </span>
                )}
              </div>

              {/* Actions: Share & Heart */}
              <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.8 }}
                  whileHover={{ scale: 1.12 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  className="w-9 h-9 rounded-full bg-white/95 dark:bg-slate-900/90 hover:bg-white text-slate-800 dark:text-white shadow-lg flex items-center justify-center cursor-pointer border border-white/20 backdrop-blur-sm active:scale-90"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    shareOnWhatsApp({ item: property, type: "property", source: "card" });
                  }}
                  title="Share property"
                  aria-label="Share property"
                >
                  <Share2 className="h-4 w-4 text-slate-700 dark:text-slate-200" />
                </motion.button>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.8 }}
                  whileHover={{ scale: 1.12 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  className="w-9 h-9 rounded-full bg-white/95 dark:bg-slate-900/90 hover:bg-white text-slate-800 dark:text-white shadow-lg flex items-center justify-center cursor-pointer border border-white/20 backdrop-blur-sm active:scale-90"
                  onClick={toggleSave}
                  aria-label={isSaved ? "Remove from saved" : "Save property"}
                >
                  <Heart
                    className={cn(
                      "h-4 w-4 transition-transform duration-300",
                      isSaved
                        ? "fill-red-600 text-red-600 scale-110 drop-shadow-[0_0_6px_rgba(239,68,68,0.5)]"
                        : "text-slate-700 dark:text-slate-200",
                    )}
                  />
                </motion.button>
              </div>
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
              loading={index < 2 ? "eager" : "lazy"}
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
            "relative bg-white dark:bg-bg-card border border-border-default rounded-[18px] overflow-hidden shadow-xs hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-700 transition-[box-shadow,border-color] duration-200 h-full flex flex-col",
            selected
              ? "ring-2 ring-red-500 border-red-500"
              : "",
            className,
          )}
        >
          {/* Image Container with 4/3 Aspect Ratio matching Project Card */}
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-bg-primary shrink-0">
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
              loading={index < 4 ? "eager" : "lazy"}
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

            {/* Top Image Badges */}
            {(() => {
              const badges: React.ReactNode[] = [];
              if (property.isRoadExclusive) {
                badges.push(
                  <span key="exclusive" className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-500 text-slate-950 shadow-sm border border-amber-300/60 backdrop-blur-md tracking-tight">
                    <Sparkles className="w-3 h-3 fill-slate-950 text-slate-950" /> Exclusive
                  </span>
                );
              }
              badges.push(
                <span key="type" className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-white/95 text-slate-900 shadow-sm border border-slate-200/80 backdrop-blur-md tracking-tight truncate max-w-[120px]">
                  {formatPropertyType(property.propertyType)}
                </span>
              );
              const visibleBadges = badges.slice(0, 2);

              return (
                <div className="absolute top-2.5 left-2.5 max-w-[calc(100%-74px)] flex items-center gap-1 overflow-hidden z-10">
                  {visibleBadges}
                </div>
              );
            })()}

            {/* Top Right Action Buttons (Share & Save) */}
            {!actionMenu && !selectable && (
              <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1 pointer-events-auto">
                <button
                  type="button"
                  className="w-9 h-9 rounded-full bg-white/95 hover:bg-white text-slate-800 shadow-md flex items-center justify-center transition-colors cursor-pointer border border-slate-200/60 backdrop-blur-md"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    shareOnWhatsApp({ item: property, type: "property", source: "card" });
                  }}
                  title="Share property"
                  aria-label="Share property"
                >
                  <Share2 className="h-4 w-4 text-slate-800" />
                </button>
                <button
                  type="button"
                  className="w-9 h-9 rounded-full bg-white/95 hover:bg-white text-slate-800 shadow-md flex items-center justify-center transition-colors cursor-pointer border border-slate-200/60 backdrop-blur-md"
                  onClick={toggleSave}
                  aria-label={isSaved ? "Remove from saved" : "Save property"}
                  title={isSaved ? "Remove from saved" : "Save property"}
                >
                  <Heart
                    className={cn(
                      "h-4 w-4 transition-colors",
                      isSaved
                        ? "fill-red-600 text-red-600 scale-110"
                        : "text-slate-800",
                    )}
                  />
                </button>
              </div>
            )}

            {/* Subtle Bottom Gradient */}
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

            {/* Status Bottom Left */}
            <div className="absolute bottom-2.5 left-2.5 z-10">
              <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold backdrop-blur-md border border-[#faad13] bg-slate-950 text-white shadow-sm">
                {property.listingType === "rent" || property.listingType === "pg"
                  ? "For Rent"
                  : property.saleType === "resale"
                  ? "Resale"
                  : property.isReadyToMove
                  ? "Ready to Move"
                  : "Under Construction"}
              </span>
            </div>

            {/* Photo count indicator */}
            {images.length > 1 && (
              <div className="absolute bottom-2.5 right-2.5 z-10">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-950/80 text-white backdrop-blur-md border border-white/10 flex items-center gap-1 shadow-sm">
                  <ImageIcon className="w-3 h-3 text-amber-400" /> {images.length}
                </span>
              </div>
            )}
          </div>

          {/* A fixed body keeps property cards aligned with the search grid. */}
          {(() => {
            const { isLand, tableColumns, specChips, rateSubtitle, isRent } = resolvePropertyCardDetails(property);
            const refId = getRefId(property);
            const location = [...new Set([property.location?.locality, property.location?.city].filter(Boolean))].join(", ");
            return (
              <div className="h-[300px] p-4 flex flex-col gap-3 min-w-0">
                <div className="h-[62px] shrink-0 min-w-0">
                  <h3 className="text-[16px] font-bold leading-5 text-slate-900 dark:text-white line-clamp-2" title={property.title}>{property.title}</h3>
                  <p className="flex items-center gap-1 mt-1 text-xs text-slate-500 dark:text-slate-400">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate" title={location}>{location || "Location on request"}</span>
                  </p>
                </div>
                <div className="grid grid-cols-3 divide-x divide-slate-200 dark:divide-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 py-2.5 shrink-0">
                  {tableColumns.map((col, idx) => (
                    <div key={idx} className="min-w-0 px-1.5 text-center">
                      <strong className="block text-[12px] leading-4 tracking-tight font-bold text-slate-900 dark:text-white break-words">{col.value}</strong>
                      <span className="block mt-1 text-[10px] leading-3 text-slate-500 dark:text-slate-400">{col.label}</span>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3 min-w-0">
                  {specChips.slice(0, 2).map((chip, idx) => {
                    const Icon = chip.icon;
                    return <div key={idx} className="flex items-start gap-1.5 min-w-0">
                      <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-600" />
                      <div className="min-w-0">
                        <p className="text-[11px] leading-4 font-semibold text-slate-800 dark:text-slate-200">{chip.title}</p>
                        <p className="text-[10px] leading-4 text-slate-500 dark:text-slate-400">{chip.subtitle}</p>
                      </div>
                    </div>;
                  })}
                </div>
                <div className="mt-auto border-t border-slate-200 dark:border-slate-800 pt-2 min-w-0">
                  <div className="flex items-center justify-between gap-2 text-[9px] uppercase tracking-wide text-slate-500 mb-1">
                    <span>{isRent ? "Monthly rent" : isLand ? "Total price" : "Asking price"}</span>
                    <span>{property.isOwnerVerified ? <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 normal-case"><BadgeCheck className="w-3 h-3" />Owner verified</span> : refId}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <strong className="whitespace-nowrap text-[22px] leading-6 tracking-tight text-slate-900 dark:text-white">{property.price > 0 ? isRent ? formatINR(property.price) : formatPriceCompact(property.price) : "On request"}</strong>
                    <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 dark:bg-amber-950/30 px-2.5 py-2 text-[11px] font-bold text-amber-800 dark:text-amber-300 group-hover:bg-amber-100 transition-colors">Details<ChevronRight className="w-3.5 h-3.5" /></span>
                  </div>
                  <p className="min-h-4 text-[10px] leading-4 text-slate-500 dark:text-slate-400">{isLand ? "" : rateSubtitle.replace(/^·\s*/, "")}</p>
                </div>
              </div>
            );
          })()}

        </div>
      </Link>
    </motion.div>
  );
}

export function PropertyCardSkeleton() {
  return <div className="rounded-[18px] border border-slate-200 overflow-hidden animate-pulse"><div className="aspect-[4/3] bg-slate-200" /><div className="h-[300px] bg-slate-50 p-4"><div className="h-5 w-3/4 rounded bg-slate-200" /><div className="h-14 mt-12 rounded-xl bg-slate-200" /></div></div>;
}
