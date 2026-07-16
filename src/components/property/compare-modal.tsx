"use client";

import Image from "next/image";
import { X, Bed, Bath, Maximize2, MapPin, Check } from "lucide-react";
import { Property } from "@/types/property";
import { formatPriceCompact, formatArea } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface CompareModalProps {
  properties: Property[];
  onClose: () => void;
}

export function CompareModal({ properties, onClose }: CompareModalProps) {
  if (properties.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-bg-card border border-border-default shadow-elevated rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-default">
          <h2 className="font-heading text-xl font-bold text-text-primary">
            Compare Properties ({properties.length})
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-x-auto overflow-y-auto p-6">
          <div className="min-w-[700px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="p-4 border-b border-border-default w-1/4"></th>
                  {properties.map((p) => (
                    <th key={p.id} className="p-4 border-b border-border-default w-1/4 align-top">
                      <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-3">
                        <Image 
                          src={p.images[0]?.url || ""} 
                          alt={p.title} 
                          fill 
                          className="object-cover"
                        />
                      </div>
                      <h3 className="font-heading font-bold text-text-primary line-clamp-2 leading-tight">
                        {p.title}
                      </h3>
                      <p className="text-amber-primary font-bold mt-1">
                        {formatPriceCompact(p.price)}
                      </p>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Location */}
                <tr>
                  <td className="p-4 border-b border-border-default font-medium text-text-secondary">Location</td>
                  {properties.map((p) => (
                    <td key={p.id} className="p-4 border-b border-border-default text-text-primary">
                      <div className="flex items-start gap-1.5">
                        <MapPin className="w-4 h-4 text-text-tertiary mt-0.5 shrink-0" />
                        <span className="text-sm">{p.location.locality}, {p.location.city}</span>
                      </div>
                    </td>
                  ))}
                </tr>
                
                {/* Type */}
                <tr>
                  <td className="p-4 border-b border-border-default font-medium text-text-secondary">Property Type</td>
                  {properties.map((p) => (
                    <td key={p.id} className="p-4 border-b border-border-default text-text-primary capitalize text-sm">
                      {p.propertyType.replace('-', ' ')}
                    </td>
                  ))}
                </tr>

                {/* Specs */}
                <tr>
                  <td className="p-4 border-b border-border-default font-medium text-text-secondary">Specifications</td>
                  {properties.map((p) => (
                    <td key={p.id} className="p-4 border-b border-border-default">
                      <div className="flex flex-wrap gap-3 text-sm text-text-primary">
                        {p.bedrooms > 0 && (
                          <div className="flex items-center gap-1">
                            <Bed className="w-4 h-4 text-text-tertiary" /> {p.bedrooms}
                          </div>
                        )}
                        {p.bathrooms > 0 && (
                          <div className="flex items-center gap-1">
                            <Bath className="w-4 h-4 text-text-tertiary" /> {p.bathrooms}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Maximize2 className="w-4 h-4 text-text-tertiary" /> {formatArea(p.area)}
                        </div>
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Status */}
                <tr>
                  <td className="p-4 border-b border-border-default font-medium text-text-secondary">Status</td>
                  {properties.map((p) => (
                    <td key={p.id} className="p-4 border-b border-border-default text-sm">
                      {p.isReadyToMove ? (
                        <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                          <Check className="w-4 h-4" /> Ready to Move
                        </span>
                      ) : (
                        <span className="text-amber-primary">Under Construction</span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Furnishing */}
                <tr>
                  <td className="p-4 font-medium text-text-secondary">Furnishing</td>
                  {properties.map((p) => (
                    <td key={p.id} className="p-4 text-sm text-text-primary capitalize">
                      {p.furnishing || "Unfurnished"}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
