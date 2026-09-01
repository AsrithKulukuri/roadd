import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { mockProperties } from "@/lib/mock-data";
import { PropertyGallery } from "@/components/property/property-gallery";
import { PropertySpecs } from "@/components/property/property-specs";
import { PropertyAmenities } from "@/components/property/property-amenities";
import { PropertyContact } from "@/components/property/property-contact";
import { PropertySimilar } from "@/components/property/property-similar";
import { PropertyActions } from "@/components/property/property-actions";
import { MapPin, Shield, ChevronLeft, Building2, Tag, Percent, ArrowDownRight, Sparkles, Play, Compass } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PropertyLocationWrapper } from "@/components/property/property-location-wrapper";
import { BackButton } from "@/components/ui/back-button";
import { MortgageCalculator } from "@/components/property/mortgage-calculator";
import { formatINR, formatPriceCompact, getYoutubeEmbedUrl, isYoutubeShort, cn } from "@/lib/utils";
import { resolveMediaUrl } from "@/lib/aws/storage-utils";
import { getRefId } from "@/lib/ref-id";
import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { WatermarkOverlay } from "@/components/shared/watermark-overlay";
import type { Property } from "@/types/property";
import type { Metadata } from "next";

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

async function getProperty(slug: string): Promise<Property | null> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .or(`slug.eq.${slug},id.eq.${slug}`)
      .single();

    if (!error && data) return data as Property;
  } catch {
  }

  return mockProperties.find((p) => p.slug === slug || p.id === slug) || null;
}

export async function generateStaticParams() {
  return mockProperties.map((property) => ({
    slug: property.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const property = await getProperty(slug);

  if (!property) return { title: "Property Not Found | ROAD" };

  const priceFormatted =
    property.price >= 10000000
      ? `₹${(property.price / 10000000).toFixed(2)} Cr`
      : `₹${(property.price / 100000).toFixed(2)} Lakh`;

  const locality = property.location?.locality || (property.location && "area" in property.location ? String(property.location.area) : "");
  const locationFormatted = `${locality}, ${property.location?.city || "Andhra Pradesh"}`;
  const propertyArea = property.area || property.builtUpArea || property.carpetArea;
  const specsFormatted = [
    property.bedrooms ? `${property.bedrooms} Beds` : null,
    property.bathrooms ? `${property.bathrooms} Baths` : null,
    propertyArea ? `${propertyArea.toLocaleString()} sq.ft` : null,
  ]
    .filter(Boolean)
    .join(" • ");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://roadd-three.vercel.app";
  const canonicalUrl = `${siteUrl}/properties/${property.slug}`;

  // Resolve direct publicly accessible primary photo
  const photoUrl = property.coverImage || property.images?.[0]?.url || "";
  let finalImageUrl = "";
  if (photoUrl && !photoUrl.startsWith("blob:") && !photoUrl.startsWith("data:")) {
    if (photoUrl.startsWith("http://") || photoUrl.startsWith("https://")) {
      finalImageUrl = photoUrl;
    } else if (photoUrl.startsWith("/")) {
      finalImageUrl = `${siteUrl}${photoUrl}`;
    } else {
      finalImageUrl = `${siteUrl}/api/media/${photoUrl}`;
    }
  } else {
    finalImageUrl = `${siteUrl}/images/property-placeholder.jpg`;
  }

  const pageTitle = `${property.title} — ${priceFormatted} | ROAD`;
  const pageDescription =
    property.description?.slice(0, 160) ||
    `${property.title} for sale in ${locationFormatted}. ${specsFormatted ? `${specsFormatted}. ` : ""}Explore photos and verified details on ROAD.`;

  return {
    title: pageTitle,
    description: pageDescription,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: "website",
      locale: "en_IN",
      url: canonicalUrl,
      title: pageTitle,
      description: pageDescription,
      siteName: "ROAD",
      images: [
        {
          url: finalImageUrl,
          width: 1200,
          height: 800,
          alt: property.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description: pageDescription,
      images: [finalImageUrl],
    },
  };
}

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const property = await getProperty(slug);

  if (!property) {
    notFound();
  }

  const propertyJsonLd = {
    "@context": "https://schema.org",
    "@type": "SingleFamilyResidence",
    name: property.title,
    description: property.description,
    image: property.coverImage || property.images?.map((img) => img.url),
    address: {
      "@type": "PostalAddress",
      streetAddress: property.location?.address || property.location?.locality,
      addressLocality: property.location?.locality || property.location?.city,
      addressRegion: "Andhra Pradesh",
      addressCountry: "IN",
    },
    geo: property.location?.latitude
      ? {
          "@type": "GeoCoordinates",
          latitude: property.location.latitude,
          longitude: property.location.longitude,
        }
      : undefined,
    numberOfRooms: property.bedrooms,
    numberOfBathroomsTotal: property.bathrooms,
    floorSize: (property.area || property.builtUpArea || property.carpetArea)
      ? {
          "@type": "QuantitativeValue",
          value: property.area || property.builtUpArea || property.carpetArea,
          unitCode: "FTK",
        }
      : undefined,
    offers: {
      "@type": "Offer",
      price: property.price,
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
      validFrom: property.createdAt,
      // TODO: For future production hardening, strip private owner contact fields (ownerPhone, ownerEmail) from unauthenticated public Supabase queries and API responses
      seller: {
        "@type": "RealEstateAgent",
        name: property.ownerName || "Road Facing Verified Partner",
      },
    },
  };

  return (
    <div className="flex flex-col min-h-screen pt-16 pb-24 bg-bg-primary text-text-primary">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(propertyJsonLd) }}
      />
      
      {/* TOP NAVBAR (Left: Search Back, Center: Official Logo, Right: Actions) */}
      <div className="sticky top-16 z-30 w-full bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-border-default py-2.5 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          
          {/* Left: Back Button & Search Properties Link */}
          <div className="flex items-center gap-2">
            <BackButton />
            <Link
              href="/properties"
              className="flex items-center gap-1.5 text-xs font-black text-slate-800 dark:text-slate-200 hover:text-amber-500 transition-colors"
            >
              <span className="underline decoration-slate-300 dark:decoration-slate-700 underline-offset-4 font-extrabold">Search Properties</span>
            </Link>
          </div>

          {/* Center: Official Transparent Logo */}
          <div className="hidden sm:flex items-center">
            <Logo size="sm" textColor="text-slate-900 dark:text-white" />
          </div>

          {/* Right: Favorite & Share Buttons */}
          <PropertyActions propertyId={property.id} property={property} />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        
        {/* BUILDER & MARKETING BADGE CARD ABOVE GALLERY */}
        <div className="flex items-center gap-3 p-3.5 mb-5 bg-bg-card border border-border-default rounded-2xl shadow-xs w-fit">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-500 border border-amber-500/30 flex items-center justify-center shrink-0 font-bold">
            <Building2 className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-xs">
            <span className="text-text-tertiary font-bold block">Marketed & Brokered by:</span>
            <span className="font-extrabold text-text-primary">
              {property.ownerName || "ROAD FACING Premier Realty AP"}
            </span>
          </div>
        </div>

        {/* Main Photo Gallery */}
        <div className="mb-8">
          <PropertyGallery
            images={property.images}
            title={property.title}
            videoUrl={property.videoUrl}
            videoThumbnail={property.videoThumbnail}
            isReadyToMove={property.isReadyToMove}
          />
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Left Content Column */}
          <div className="lg:col-span-2 space-y-6 sm:space-y-8">
            
            {/* BOX 1: Title, Status, Price & Highlights Box */}
            <div className="bg-bg-card border border-border-default rounded-3xl p-4 min-[480px]:p-5 sm:p-7 shadow-sm space-y-4">
              
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/15 text-amber-600 dark:text-amber-400 font-mono font-black text-xs rounded-full border border-amber-500/40 shadow-xs">
                  Ref ID: {getRefId(property)}
                </span>

                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-extrabold text-xs rounded-full border border-amber-500/30">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  {property.listingType === "rent" ? "Home for Rent" : property.saleType === "resale" ? "Resale Property" : "House for Sale"}
                </span>

                {(() => {
                  const rawFacing = property.facing || (property.attributes && typeof property.attributes === "object" && "facing" in property.attributes ? String((property.attributes as Record<string, unknown>).facing) : "");
                  if (!rawFacing) return null;
                  const formattedFacing = rawFacing.toLowerCase().includes("facing") ? rawFacing : `${rawFacing} Facing`;
                  return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-900 text-white font-bold text-xs rounded-full border border-white/15 shadow-xs">
                      <Compass className="w-3.5 h-3.5 text-amber-400" />
                      <span className="capitalize">{formattedFacing}</span>
                    </span>
                  );
                })()}

                {property.reraId && (
                  <Badge variant="rera" className="uppercase tracking-wider text-[10px]">
                    <Shield className="w-3 h-3 mr-1" /> RERA Approved ({property.reraId})
                  </Badge>
                )}
              </div>

              <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-extrabold text-text-primary leading-tight">
                {property.title}
              </h1>

              <div className="flex items-center gap-2 text-text-secondary text-sm">
                <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
                <span>
                  {property.location.address}, {property.location.locality},{" "}
                  {property.location.city}
                </span>
              </div>

              {/* Large Price Row */}
              <div className="pt-2 flex flex-wrap items-baseline justify-between gap-3 sm:gap-4 border-t border-border-default/60">
                <span className="font-black text-3xl sm:text-4xl text-text-primary tracking-tight">
                  {formatINR(property.price)}
                </span>

                <span className="text-xs text-text-tertiary font-semibold">
                  + Govt. Charges & Registration
                </span>
              </div>
            </div>

            {/* BOX 2: Property Specifications Box */}
            <div className="bg-bg-card border border-border-default rounded-3xl p-6 sm:p-7 shadow-sm space-y-4">
              <div>
                <h2 className="text-xl font-bold text-text-primary">
                  Property Specifications
                </h2>
                <p className="text-xs text-text-tertiary mt-0.5">
                  Detailed architectural, layout & dimension breakdown
                </p>
              </div>

              <PropertySpecs property={property} />
            </div>

            {/* BOX 3: "About this property" Description Box */}
            <div className="bg-bg-card border border-border-default rounded-3xl p-6 sm:p-7 shadow-sm space-y-4">
              <div>
                <h2 className="text-xl font-bold text-text-primary">
                  About this property
                </h2>
                <p className="text-xs text-text-tertiary mt-0.5 font-medium">
                  Verified property overview and on-ground details
                </p>
              </div>

              <div className="text-text-primary font-semibold leading-relaxed whitespace-pre-line text-sm sm:text-base pt-1">
                {property.description}
              </div>
            </div>

            {/* BOX 4: Embedded Property Video Tour */}
            {property.videoUrl && (
              <div className="bg-bg-card border border-border-default rounded-3xl p-6 sm:p-7 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                    <Play className="w-5 h-5 text-red-500 fill-red-500 shrink-0" />
                    {getYoutubeEmbedUrl(property.videoUrl) 
                      ? (isYoutubeShort(property.videoUrl) ? "Property Video Short" : "Property Video Tour")
                      : "Property Video Walkthrough"
                    }
                  </h2>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    HD Video
                  </span>
                </div>

                <div className={cn(
                  "relative rounded-2xl overflow-hidden shadow-lg border border-border-default bg-slate-950 mx-auto",
                  isYoutubeShort(property.videoUrl) ? "max-w-[340px] sm:max-w-[380px] aspect-[9/16] h-[600px] max-h-[70vh]" : "w-full aspect-video"
                )}>
                  {getYoutubeEmbedUrl(property.videoUrl) ? (
                    <iframe
                      src={getYoutubeEmbedUrl(property.videoUrl)!}
                      title={`${property.title} Video Tour`}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <div className="relative w-full h-full flex items-center justify-center">
                      <video
                        src={resolveMediaUrl(property.videoUrl)}
                        controls
                        poster={property.videoThumbnail ? resolveMediaUrl(property.videoThumbnail) : undefined}
                        className="w-full h-full object-contain"
                      />
                      <WatermarkOverlay position="left-middle" />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* BOX 5: Amenities & Features */}
            {property.amenities && property.amenities.length > 0 && (
              <div className="bg-bg-card border border-border-default rounded-3xl p-6 sm:p-7 shadow-sm space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-text-primary">
                    Amenities & Facilities
                  </h2>
                  <p className="text-xs text-text-tertiary mt-0.5">
                    Available amenities and community features
                  </p>
                </div>
                <PropertyAmenities amenities={property.amenities} />
              </div>
            )}

            {/* BOX 6: Location & Neighborhood Map */}
            <div className="bg-bg-card border border-border-default rounded-3xl p-6 sm:p-7 shadow-sm space-y-4">
              <div>
                <h2 className="text-xl font-bold text-text-primary">
                  Location & Neighborhood
                </h2>
                <p className="text-xs text-text-tertiary mt-0.5">
                  Precise geographic location in {property.location.locality}, {property.location.city}
                </p>
              </div>

              <PropertyLocationWrapper
                latitude={property.location.latitude}
                longitude={property.location.longitude}
                title={property.title}
              />
            </div>

            {/* BOX 7: Similar Properties */}
            <PropertySimilar currentProperty={property} />
          </div>

          {/* Right Column: Contact & Booking Form Box */}
          <div className="lg:col-span-1">
            <PropertyContact property={property} />
          </div>
        </div>
      </div>
    </div>
  );
}
