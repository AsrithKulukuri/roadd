import { notFound } from "next/navigation";
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

export function generateStaticParams() {
  return mockProperties.map((property) => ({
    slug: property.slug,
  }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const property = mockProperties.find((p) => p.slug === params.slug);
  
  if (!property) return { title: "Property Not Found" };
  
  return {
    title: `${property.title} | ROAD FACING`,
    description: property.description,
  };
}

export default async function PropertyDetailsPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const property = mockProperties.find((p) => p.slug === resolvedParams.slug);

  if (!property) {
    notFound();
  }

  return (
    <div className="flex flex-col min-h-screen pt-24 pb-24 bg-bg-primary">
      <div className="container-road">
        {/* Header Section */}
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
                {property.location.address}, {property.location.locality}, {property.location.city}
              </span>
            </div>
          </div>
          
          <PropertyActions propertyId={property.id} />
        </div>

        {/* Gallery */}
        <div className="mb-10">
          <PropertyGallery images={property.images} title={property.title} />
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Main Content (Left, 2 columns wide on LG) */}
          <div className="lg:col-span-2 space-y-10">
            {/* Specs */}
            <PropertySpecs property={property} />

            {/* Description */}
            <div className="space-y-4">
              <h3 className="font-heading text-2xl font-bold text-text-primary">
                About this property
              </h3>
              <p className="text-text-secondary leading-relaxed whitespace-pre-line">
                {property.description}
              </p>
            </div>

            {/* Amenities */}
            <PropertyAmenities amenities={property.amenities} />

            {/* Location Map */}
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
            
            {/* Similar Properties */}
            <PropertySimilar currentProperty={property} />
          </div>

          {/* Sidebar (Right, 1 column wide on LG) */}
          <div className="lg:col-span-1">
            <PropertyContact property={property} />
          </div>
        </div>
      </div>
    </div>
  );
}
