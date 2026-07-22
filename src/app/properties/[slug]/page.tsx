import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { mockProperties } from "@/lib/mock-data";
import { PropertyGallery } from "@/components/property/property-gallery";
import { PropertySpecs } from "@/components/property/property-specs";
import { PropertyAmenities } from "@/components/property/property-amenities";
import { PropertyContact } from "@/components/property/property-contact";
import { PropertySimilar } from "@/components/property/property-similar";
import { PropertyActions } from "@/components/property/property-actions";
import { MapPin, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PropertyLocationWrapper } from "@/components/property/property-location-wrapper";
import { ContactAgentBelowMap } from "@/components/property/contact-agent-below-map";
import { BackButton } from "@/components/ui/back-button";
import { MortgageCalculator } from "@/components/property/mortgage-calculator";
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
    <div className="flex flex-col min-h-screen pt-24 pb-24 bg-bg-primary">
      <div className="container-road">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge variant="default" className="uppercase tracking-wider text-[10px]">
                {property.propertyType.replace("-", " ")}
              </Badge>
              {property.isFeatured && (
                <Badge variant="premium" className="uppercase tracking-wider text-[10px]">
                  Featured
                </Badge>
              )}
              {property.reraId && (
                <Badge variant="rera" className="uppercase tracking-wider text-[10px]">
                  <Shield className="w-3 h-3 mr-1" /> RERA Approved
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="lg:hidden">
                <BackButton className="-ml-2" />
              </div>
              <h1 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-text-primary leading-tight">
                {property.title}
              </h1>
            </div>
            <div className="flex items-center gap-2 text-text-secondary mt-2">
              <MapPin className="w-4 h-4 text-amber-primary" />
              <span>
                {property.location.address}, {property.location.locality},{" "}
                {property.location.city}
              </span>
            </div>
          </div>

          <PropertyActions propertyId={property.id} />
        </div>

        <div className="mb-10">
          <PropertyGallery
            images={property.images}
            title={property.title}
            videoUrl={property.videoUrl}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-10">
            <PropertySpecs property={property} />

            <div className="space-y-4">
              <h3 className="font-heading text-2xl font-bold text-text-primary">
                About this property
              </h3>
              <p className="text-text-secondary leading-relaxed whitespace-pre-line">
                {property.description}
              </p>
            </div>

            <PropertyAmenities amenities={property.amenities} />

            <MortgageCalculator propertyPrice={property.price} />

            <div className="py-6 border-t border-border-default/50">
              <h3 className="font-heading text-2xl font-bold text-text-primary mb-4">
                Location
              </h3>
              <PropertyLocationWrapper
                latitude={property.location.latitude}
                longitude={property.location.longitude}
                title={property.title}
              />
              <ContactAgentBelowMap property={property} />
            </div>

            <PropertySimilar currentProperty={property} />
          </div>

          <div className="lg:col-span-1">
            <PropertyContact property={property} />
          </div>
        </div>
      </div>
    </div>
  );
}
