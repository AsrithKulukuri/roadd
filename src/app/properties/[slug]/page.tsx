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
import { ContactAgentBelowMap } from "@/components/property/contact-agent-below-map";
import { BackButton } from "@/components/ui/back-button";
import { MortgageCalculator } from "@/components/property/mortgage-calculator";
import { formatINR, formatPriceCompact, getYoutubeEmbedUrl, isYoutubeShort, cn } from "@/lib/utils";
import { resolveMediaUrl } from "@/lib/aws/storage-utils";
import { getRefId } from "@/lib/ref-id";
import Link from "next/link";
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

  if (!property) return { title: "Property Not Found | Road Facing" };

  const priceFormatted =
    property.price >= 10000000
      ? `₹${(property.price / 10000000).toFixed(2)} Cr`
      : `₹${(property.price / 100000).toFixed(2)} Lakh`;

  const locationFormatted = `${property.location?.locality || (property.location as any)?.area || ""}, ${property.location?.city || "Andhra Pradesh"}`;
  const specsFormatted = [
    property.bedrooms ? `${property.bedrooms} Beds` : null,
    property.bathrooms ? `${property.bathrooms} Baths` : null,
    (property as any).areaSqFt || (property as any).area || (property as any).builtUpArea ? `${((property as any).areaSqFt || (property as any).area || (property as any).builtUpArea).toLocaleString()} sq.ft` : null,
  ]
    .filter(Boolean)
    .join(" • ");

  const coverUrl = property.coverImage || property.images?.[0]?.url || "";

  const ogParams = new URLSearchParams({
    title: property.title,
    price: priceFormatted,
    location: locationFormatted,
    type: (property.propertyType || "Property").replace("-", " ").toUpperCase(),
    badge: property.reraId ? `RERA: ${property.reraId}` : "Verified Property",
  });
  if (specsFormatted) ogParams.set("specs", specsFormatted);
  if (coverUrl) ogParams.set("image", coverUrl);

  const ogImageUrl = `https://www.roadfacing.com/api/og?${ogParams.toString()}`;
  const canonicalUrl = `https://www.roadfacing.com/properties/${property.slug}`;

  return {
    title: `${property.title} in ${locationFormatted} — ${priceFormatted}`,
    description: `${property.title} for sale in ${locationFormatted}. ${specsFormatted ? `${specsFormatted}. ` : ""}Explore photos, verified details, and price updates on Road Facing.`,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: "article",
      locale: "en_IN",
      url: canonicalUrl,
      title: `${property.title} — ${priceFormatted}`,
      description: property.description || `Verified listing in ${locationFormatted}. View details on Road Facing.`,
      siteName: "Road Facing",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: property.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${property.title} — ${priceFormatted}`,
      description: property.description || `Verified listing in ${locationFormatted}`,
      images: [ogImageUrl],
      creator: "@roadfacing",
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
      seller: {
        "@type": "RealEstateAgent",
        name: property.ownerName || "Road Facing Verified Partner",
        telephone: property.ownerPhone || "+91 98765 43210",
      },
    },
  };

  return (
    <div className="flex flex-col min-h-screen pt-16 pb-24 bg-bg-primary text-text-primary">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(propertyJsonLd) }}
      />
      
      {/* REALTOR.COM STYLE TOP NAVBAR (Left: Search Back, Center: ROAD FACING Logo, Right: Actions) */}
      <div className="sticky top-16 z-30 w-full bg-white backdrop-blur-md border-b border-slate-200 py-3 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          
          {/* Left: Back Button & Search Properties Link */}
          <div className="flex items-center gap-2">
            <BackButton />
            <Link
              href="/properties"
              className="flex items-center gap-1.5 text-xs font-black text-slate-900 hover:text-amber-500 transition-colors"
            >
              <span className="underline decoration-slate-400 underline-offset-4 font-extrabold">Search Properties</span>
            </Link>
          </div>

          {/* Center: Realtor.com Style CENTERED ROAD FACING BRANDING */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xs shadow-xs">
              R
            </div>
            <span className="font-heading font-black text-base sm:text-lg tracking-tight text-slate-900">
              ROAD <span className="text-amber-500">FACING</span>
            </span>
          </div>

          {/* Right: Favorite & Share Buttons */}
          <PropertyActions propertyId={property.id} property={property} />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        
        {/* REALTOR.COM STYLE BUILDER & MARKETING BADGE CARD ABOVE GALLERY */}
        <div className="flex items-center gap-3 p-3 mb-4 bg-white border border-slate-200 rounded-2xl shadow-xs w-fit">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-500 border border-amber-500/30 flex items-center justify-center shrink-0 font-bold">
            <Building2 className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-xs">
            <span className="text-slate-600 font-bold block">Marketed & Brokered by:</span>
            <span className="font-extrabold text-slate-900 underline underline-offset-2">
              {property.ownerName || "ROAD FACING Premier Realty AP"}
            </span>
          </div>
        </div>

        {/* Realtor.com Style Main Photo Gallery */}
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          
          {/* Main Left Content Column */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Title, Status, Price & Promotion Header (Realtor.com Style) */}
            <div className="space-y-3 pb-6 border-b border-slate-200 dark:border-slate-800">
              
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/15 text-amber-600 dark:text-amber-400 font-mono font-black text-xs rounded-full border border-amber-500/40 shadow-xs">
                  Ref ID: {getRefId(property)}
                </span>

                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-extrabold text-xs rounded-full border border-amber-500/30">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  {property.listingType === "rent" ? "Home for Rent" : "House for Sale"}
                </span>

                {(property.facing || (property.attributes as any)?.facing) && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-900 text-white font-bold text-xs rounded-full border border-white/15 shadow-xs">
                    <Compass className="w-3.5 h-3.5 text-amber-400" />
                    <span className="capitalize">
                      {String(property.facing || (property.attributes as any)?.facing).toLowerCase().includes("facing")
                        ? String(property.facing || (property.attributes as any)?.facing)
                        : `${String(property.facing || (property.attributes as any)?.facing)} Facing`}
                    </span>
                  </span>
                )}

                {property.reraId && (
                  <Badge variant="rera" className="uppercase tracking-wider text-[10px]">
                    <Shield className="w-3 h-3 mr-1" /> RERA Approved ({property.reraId})
                  </Badge>
                )}
              </div>

              <h1 className="font-heading text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white leading-tight">
                {property.title}
              </h1>

              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
                <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
                <span>
                  {property.location.address}, {property.location.locality},{" "}
                  {property.location.city}
                </span>
              </div>

              {/* Realtor.com Large Price & Price Drop Badge Row */}
              <div className="pt-2 flex flex-wrap items-baseline gap-4">
                <span className="font-black text-3xl sm:text-4xl text-slate-900 dark:text-white tracking-tight">
                  {formatINR(property.price)}
                </span>

                <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold text-xs bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/30">
                  <ArrowDownRight className="w-4 h-4" /> ₹{formatPriceCompact(Math.round(property.price * 0.04))} Price Reduced
                </span>
              </div>
            </div>

            {/* Property Specs */}
            <PropertySpecs property={property} />

            {/* Description */}
            <div className="space-y-3">
              <h3 className="font-heading text-2xl font-black text-black">
                About this property
              </h3>
              <p className="text-black font-bold leading-relaxed whitespace-pre-line text-base sm:text-lg">
                {property.description}
              </p>
            </div>

            {/* Embedded Property Video Tour (Dual-Mode: YouTube or Uploaded HTML5 Video) */}
            {property.videoUrl && (
              <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                <h3 className="font-heading text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Play className="w-6 h-6 text-red-500 fill-red-500" />
                  {getYoutubeEmbedUrl(property.videoUrl) 
                    ? (isYoutubeShort(property.videoUrl) ? "Property Short Tour" : "Property Video Tour")
                    : "Property Video Walkthrough"
                  }
                </h3>
                <div className={cn(
                  "relative rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 bg-slate-950 mx-auto",
                  isYoutubeShort(property.videoUrl) ? "max-w-[340px] sm:max-w-[380px] aspect-[9/16] h-[650px] max-h-[75vh]" : "w-full aspect-video"
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
                    <video
                      src={resolveMediaUrl(property.videoUrl)}
                      controls
                      poster={property.videoThumbnail ? resolveMediaUrl(property.videoThumbnail) : undefined}
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>
              </div>
            )}

            {/* Amenities */}
            <PropertyAmenities amenities={property.amenities} />

            {/* Location Map */}
            <div className="py-6 border-t border-slate-200 dark:border-slate-800">
              <h3 className="font-heading text-2xl font-bold text-slate-900 dark:text-white mb-4">
                Location & Neighborhood
              </h3>
              <PropertyLocationWrapper
                latitude={property.location.latitude}
                longitude={property.location.longitude}
                title={property.title}
              />
              <ContactAgentBelowMap property={property} />
            </div>

            {/* Similar Properties */}
            <PropertySimilar currentProperty={property} />
          </div>

          {/* Right Column: Realtor.com Style Action Card Form */}
          <div className="lg:col-span-1">
            <PropertyContact property={property} />
          </div>
        </div>
      </div>
    </div>
  );
}
