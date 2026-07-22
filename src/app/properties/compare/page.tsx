"use client";

import { useCompareStore } from "@/stores/compare-store";
import { usePropertiesStore } from "@/stores/properties-store";
import { formatINR, formatArea, formatPriceCompact } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { X, CheckCircle2, Minus, Scale } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ComparePage() {
  const router = useRouter();
  const { comparePropertyIds, toggleCompare, clearCompare } = useCompareStore();
  const allProperties = usePropertiesStore((state) => state.properties);

  const properties = comparePropertyIds.map(id => 
    allProperties.find(p => p.id === id)
  ).filter(Boolean) as typeof allProperties;

  if (properties.length === 0) {
    return (
      <div className="min-h-screen pt-32 pb-16 flex flex-col items-center justify-center container-road text-center">
        <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mb-4">
          <Scale className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-bold font-heading mb-3 text-slate-900 dark:text-white">Compare Properties</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md">You haven't selected any properties to compare. Tap "Compare" on any property card to compare specs side-by-side.</p>
        <Button onClick={() => router.push('/properties')} className="bg-amber-500 text-slate-950 font-extrabold hover:bg-amber-600">
          Browse Properties
        </Button>
      </div>
    );
  }

  const allAmenities = Array.from(
    new Set(properties.flatMap(p => (p.amenities || []).map((a: any) => typeof a === "string" ? a : a.name)))
  ).sort();

  return (
    <div className="min-h-screen pt-24 pb-16 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
      <div className="container-road max-w-7xl overflow-x-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="font-heading text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">
              Side-by-Side Property Comparison
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Comparing {properties.length} selected listings</p>
          </div>
          <Button variant="outline" onClick={clearCompare} className="border-red-500/30 text-red-500 hover:bg-red-500/10">
            Clear All
          </Button>
        </div>

        <div className="min-w-[800px]">
          {/* Header Row: Images & Basic Info */}
          <div className="grid grid-cols-4 gap-6 mb-8 border-b border-slate-200 dark:border-slate-800 pb-8">
            <div className="col-span-1 pt-24">
              <h3 className="font-bold text-slate-400 text-xs uppercase tracking-wider">Property Overview</h3>
            </div>
            
            {properties.map((p) => {
              const firstImg = p.images?.[0];
              const imgSrc = typeof firstImg === "string" ? firstImg : (firstImg as any)?.url || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=800';

              return (
                <div key={p.id} className="col-span-1 relative bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-md">
                  <button 
                    onClick={() => toggleCompare(p.id)}
                    className="absolute -top-3 -right-3 w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-md z-10"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  
                  <div className="relative h-40 w-full rounded-xl overflow-hidden mb-3">
                    <Image 
                      src={imgSrc} 
                      alt={p.title} 
                      fill 
                      className="object-cover"
                    />
                  </div>

                  <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1 mb-1">{p.title}</h4>
                  <div className="text-amber-500 font-black text-lg mb-2">{formatINR(p.price)}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-3">{p.location.locality}, {p.location.city}</div>

                  <Link href={`/properties/${p.id}`} className="block text-center py-2 px-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs rounded-xl shadow-xs transition-colors">
                    View Listing
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Key Details Rows */}
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-4 gap-6 py-3 border-b border-slate-200 dark:border-slate-800">
              <div className="font-bold text-slate-500">Property Type</div>
              {properties.map(p => (
                <div key={p.id} className="font-semibold text-slate-900 dark:text-white capitalize">{p.propertyType}</div>
              ))}
            </div>

            <div className="grid grid-cols-4 gap-6 py-3 border-b border-slate-200 dark:border-slate-800">
              <div className="font-bold text-slate-500">Bedrooms / BHK</div>
              {properties.map(p => (
                <div key={p.id} className="font-semibold text-slate-900 dark:text-white">{p.bedrooms ? `${p.bedrooms} BHK` : 'N/A'}</div>
              ))}
            </div>

            <div className="grid grid-cols-4 gap-6 py-3 border-b border-slate-200 dark:border-slate-800">
              <div className="font-bold text-slate-500">Super Built-up Area</div>
              {properties.map(p => (
                <div key={p.id} className="font-semibold text-slate-900 dark:text-white">{formatArea(p.area)}</div>
              ))}
            </div>

            <div className="grid grid-cols-4 gap-6 py-3 border-b border-slate-200 dark:border-slate-800">
              <div className="font-bold text-slate-500">Price per Sq.Ft</div>
              {properties.map(p => (
                <div key={p.id} className="font-bold text-amber-500">{formatINR(Math.round(p.price / p.area))}/sq.ft</div>
              ))}
            </div>

            <div className="grid grid-cols-4 gap-6 py-3 border-b border-slate-200 dark:border-slate-800">
              <div className="font-bold text-slate-500">Facing Direction</div>
              {properties.map(p => (
                <div key={p.id} className="font-semibold text-slate-900 dark:text-white">{p.facing || 'East'}</div>
              ))}
            </div>

            {/* Amenities Grid Comparison */}
            <div className="pt-6">
              <h3 className="font-bold text-slate-400 text-xs uppercase tracking-wider mb-4">Amenities Comparison</h3>
              {allAmenities.map(amenity => (
                <div key={amenity} className="grid grid-cols-4 gap-6 py-2.5 border-b border-slate-200 dark:border-slate-800/60">
                  <div className="text-slate-600 dark:text-slate-300 font-medium text-xs">{amenity}</div>
                  {properties.map(p => {
                    const hasAmenity = (p.amenities || []).some((a: any) => (typeof a === "string" ? a : a.name) === amenity);
                    return (
                      <div key={p.id} className="flex items-center">
                        {hasAmenity ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <Minus className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
