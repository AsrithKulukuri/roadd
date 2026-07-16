"use client";

import { useCompareStore } from "@/stores/compare-store";
import { mockProperties } from "@/lib/mock-data";
import { formatINR, formatArea, formatPriceCompact } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { X, CheckCircle2, Minus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ComparePage() {
  const router = useRouter();
  const { comparePropertyIds, toggleCompare, clearCompare } = useCompareStore();

  const properties = comparePropertyIds.map(id => 
    mockProperties.find(p => p.id === id)
  ).filter(Boolean) as typeof mockProperties;

  if (properties.length === 0) {
    return (
      <div className="min-h-screen pt-32 pb-16 flex flex-col items-center justify-center container-road">
        <h1 className="text-3xl font-bold font-heading mb-4">Compare Properties</h1>
        <p className="text-text-secondary mb-8">You haven't selected any properties to compare.</p>
        <Button onClick={() => router.push('/properties')} variant="amber">
          Browse Properties
        </Button>
      </div>
    );
  }

  // Pre-define all unique amenities across all selected properties
  const allAmenities = Array.from(
    new Set(properties.flatMap(p => p.amenities.map(a => a.name)))
  ).sort();

  return (
    <div className="min-h-screen pt-24 pb-16 bg-bg-primary">
      <div className="container-road max-w-7xl overflow-x-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-text-primary">
            Compare Properties
          </h1>
          <Button variant="outline" onClick={clearCompare}>
            Clear All
          </Button>
        </div>

        <div className="min-w-[800px]">
          {/* Header Row: Images & Basic Info */}
          <div className="grid grid-cols-4 gap-6 mb-8 border-b border-border-default pb-8">
            <div className="col-span-1 pt-24">
              <h3 className="font-bold text-text-secondary text-lg uppercase tracking-wider">Property Specs</h3>
            </div>
            
            {properties.map((p) => (
              <div key={p.id} className="col-span-1 relative bg-bg-card rounded-2xl p-4 border border-border-default/50">
                <button 
                  onClick={() => toggleCompare(p.id)}
                  className="absolute -top-3 -right-3 w-8 h-8 bg-bg-primary border border-border-default rounded-full flex items-center justify-center text-text-tertiary hover:text-red-500 z-10 hover:border-red-500/30 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="relative w-full aspect-video rounded-xl overflow-hidden mb-4">
                  <Image src={p.images[0].url} alt={p.title} fill className="object-cover" />
                </div>
                <h4 className="font-bold text-text-primary line-clamp-2 min-h-[48px] mb-2">
                  <Link href={`/properties/${p.slug}`} className="hover:text-amber-primary transition-colors">
                    {p.title}
                  </Link>
                </h4>
                <p className="font-heading text-xl font-bold text-amber-primary mb-1">
                  {p.listingType === 'rent' ? `${formatINR(p.price)}/mo` : formatPriceCompact(p.price)}
                </p>
                <p className="text-sm text-text-secondary">
                  {p.location.locality}, {p.location.city}
                </p>
              </div>
            ))}
            
            {/* Empty Slots */}
            {Array.from({ length: 3 - properties.length }).map((_, i) => (
              <div key={`empty-${i}`} className="col-span-1 flex flex-col items-center justify-center border-2 border-dashed border-border-default rounded-2xl p-6 h-full min-h-[250px]">
                <p className="text-text-tertiary font-medium mb-4">Add property</p>
                <Button variant="outline" size="sm" onClick={() => router.push('/properties')}>
                  Browse
                </Button>
              </div>
            ))}
          </div>

          {/* Specs Rows */}
          <div className="space-y-0">
            {/* Basic Specs */}
            <ComparisonRow label="Property Type" properties={properties} getValue={p => <span className="capitalize">{p.propertyType.replace('-', ' ')}</span>} />
            <ComparisonRow label="Bedrooms" properties={properties} getValue={p => p.bedrooms > 0 ? p.bedrooms : "-"} />
            <ComparisonRow label="Bathrooms" properties={properties} getValue={p => p.bathrooms > 0 ? p.bathrooms : "-"} />
            <ComparisonRow label="Total Area" properties={properties} getValue={p => formatArea(p.area)} />
            <ComparisonRow label="Facing" properties={properties} getValue={p => <span className="capitalize">{p.facing || "-"}</span>} />
            <ComparisonRow label="Status" properties={properties} getValue={p => p.isReadyToMove ? "Ready to Move" : "Under Construction"} />
            <ComparisonRow label="Age" properties={properties} getValue={p => p.ageOfProperty === 0 ? "New" : `${p.ageOfProperty} Years`} />
            <ComparisonRow label="RERA Approved" properties={properties} getValue={p => p.reraId ? <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" /> : <Minus className="w-5 h-5 text-text-tertiary mx-auto" />} />
            
            {/* Amenities Header */}
            <div className="grid grid-cols-4 gap-6 py-6 border-b border-border-default mt-8">
              <div className="col-span-4">
                <h3 className="font-bold text-text-secondary text-lg uppercase tracking-wider">Amenities</h3>
              </div>
            </div>
            
            {/* Dynamic Amenities Rows */}
            {allAmenities.map(amenity => (
              <ComparisonRow 
                key={amenity} 
                label={amenity} 
                properties={properties} 
                getValue={p => p.amenities.some(a => a.name === amenity) 
                  ? <CheckCircle2 className="w-5 h-5 text-amber-primary mx-auto" /> 
                  : <Minus className="w-5 h-5 text-text-tertiary/30 mx-auto" />
                } 
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ComparisonRow({ 
  label, 
  properties, 
  getValue 
}: { 
  label: string, 
  properties: any[], 
  getValue: (p: any) => React.ReactNode 
}) {
  return (
    <div className="grid grid-cols-4 gap-6 py-4 border-b border-border-default/50 hover:bg-bg-card/30 transition-colors">
      <div className="col-span-1 flex items-center">
        <span className="font-medium text-text-secondary">{label}</span>
      </div>
      {properties.map(p => (
        <div key={`${label}-${p.id}`} className="col-span-1 flex items-center justify-center text-center text-text-primary font-medium">
          {getValue(p)}
        </div>
      ))}
      {Array.from({ length: 3 - properties.length }).map((_, i) => (
        <div key={`empty-val-${i}`} className="col-span-1" />
      ))}
    </div>
  );
}
