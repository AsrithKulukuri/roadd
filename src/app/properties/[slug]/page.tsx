import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { mockProperties } from "@/lib/mock-data";
import { PropertyGallery } from "@/components/property/property-gallery";
import { PropertySpecs } from "@/components/property/property-specs";
import { PropertyAmenities } from "@/components/property/property-amenities";
import { PropertyContact } from "@/components/property/property-contact";
import { PropertySimilar } from "@/components/property/property-similar";
import { PropertyActions } from "@/components/property/property-actions";
import { MapPin, Shield, ChevronLeft, Building2, Tag, Percent, ArrowDownRight, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PropertyLocationWrapper } from "@/components/property/property-location-wrapper";
import { ContactAgentBelowMap } from "@/components/property/contact-agent-below-map";
import { BackButton } from "@/components/ui/back-button";
import { MortgageCalculator } from "@/components/property/mortgage-calculator";
import { formatINR, formatPriceCompact } from "@/lib/utils";
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
      .eq("slug", slug)
      .single();

    if (!error && data) return data as Property;
  } catch {
  }

  return mockProperties.find((p) => p.slug === slug) || null;
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

  if (!property) return { title: "Property Not Found | ROAD FACING" };

  return {
    title: `${property.title} | ROAD FACING`,
    description: property.description,
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

  return (
    <div className="flex flex-col min-h-screen pt-16 pb-24 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
      
      {/* REALTOR.COM STYLE TOP NAVBAR (Left: Search Back, Center: ROAD FACING Logo, Right: Actions) */}
      <div className="sticky top-16 z-30 w-full bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 py-3 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          
          {/* Left: < Search Back Link */}
          <Link
            href="/properties"
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-amber-500 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-amber-500" />
            <span className="underline decoration-slate-300 dark:decoration-slate-700 underline-offset-4">Search Properties</span>
          </Link>

          {/* Center: Realtor.com Style CENTERED ROAD FACING BRANDING */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xs shadow-xs">
              R
            </div>
            <span className="font-heading font-black text-base sm:text-lg tracking-tight text-slate-900 dark:text-white">
              ROAD <span className="text-amber-500">FACING</span>
            </span>
          </div>

          {/* Right: Favorite & Share Buttons */}
          <PropertyActions propertyId={property.id} />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        
        {/* REALTOR.COM STYLE BUILDER & MARKETING BADGE CARD ABOVE GALLERY */}
        <div className="flex items-center gap-3 p-3 mb-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm w-fit">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-500 border border-amber-500/30 flex items-center justify-center shrink-0 font-bold">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="text-xs">
            <span className="text-slate-400 font-medium block">Marketed & Brokered by:</span>
            <span className="font-bold text-slate-900 dark:text-white underline underline-offset-2">
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
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold text-xs rounded-full border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  {property.listingType === "rent" ? "Home for Rent" : "House for Sale"}
                </span>

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

                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-xs bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                  <ArrowDownRight className="w-4 h-4" /> ₹{formatPriceCompact(Math.round(property.price * 0.04))} Price Reduced
                </span>
              </div>

              {/* Affordability Link */}
              <div>
                <a href="#mortgage-calculator" className="text-xs font-bold text-amber-500 hover:underline flex items-center gap-1">
                  How much home can you afford? Calculate monthly EMI ➔
                </a>
              </div>

              {/* REALTOR.COM SPECIAL PROMOTION BANNER BOX */}
              <div className="mt-4 p-4 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/30 rounded-2xl flex items-start gap-3">
                <div className="p-2 bg-amber-500 text-slate-950 rounded-xl font-bold shrink-0">
                  <Tag className="w-5 h-5" />
                </div>
                <div className="space-y-1 text-xs">
                  <strong className="font-extrabold text-slate-900 dark:text-white text-sm block">
                    Special Builder Promotion
                  </strong>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    Exclusive zero processing fee & complimentary modular kitchen upgrade for bookings done via ROAD FACING this month.
                  </p>
                </div>
              </div>
            </div>

            {/* Property Specs */}
            <PropertySpecs property={property} />

            {/* Description */}
            <div className="space-y-3">
              <h3 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
                About this property
              </h3>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line text-sm sm:text-base">
                {property.description}
              </p>
            </div>

            {/* Amenities */}
            <PropertyAmenities amenities={property.amenities} />

            {/* Mortgage Calculator */}
            <div id="mortgage-calculator">
              <MortgageCalculator propertyPrice={property.price} />
            </div>

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
