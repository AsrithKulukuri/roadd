"use client";

import { usePropertiesStore } from "@/stores/properties-store";
import { Button } from "@/components/ui/button";
import { formatPriceCompact } from "@/lib/utils";
import { MoreHorizontal, Plus, Star, Trash2, PowerOff, MapPin, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

export default function AdminPropertiesPage() {
  const { properties, toggleFeatured, toggleSoldOut, deleteProperty, toggleShowOnMap, toggleRecommended } = usePropertiesStore();

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold font-heading text-text-primary">Properties</h1>
          <p className="text-text-secondary mt-1">Manage all listings, feature them, or update their status.</p>
        </div>
        <Button variant="amber" asChild>
          <Link href="/admin/properties/new" className="gap-2">
            <Plus className="w-4 h-4" />
            Add New Property
          </Link>
        </Button>
      </div>

      <div className="bg-bg-card border border-border-default rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-text-secondary">
            <thead className="bg-bg-primary/50 text-text-primary border-b border-border-default uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-4">Property</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Map Visibility</th>
                <th className="px-6 py-4">Featured</th>
                <th className="px-6 py-4 text-center">Recommended</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {properties.map((property) => (
                <tr key={property.id} className="hover:bg-bg-primary/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-md bg-border-default overflow-hidden shrink-0">
                        <img src={property.images[0]?.url} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <div className="font-bold text-text-primary truncate max-w-[200px]">
                          {property.title}
                        </div>
                        <div className="text-xs text-text-tertiary capitalize">
                          {property.listingType} • {property.propertyType.replace('-', ' ')}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      property.status === 'sold' 
                        ? 'bg-red-500/10 text-red-500' 
                        : 'bg-green-500/10 text-green-500'
                    }`}>
                      {property.status === 'sold' ? 'Sold Out' : 'Active'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button 
                      onClick={() => toggleShowOnMap(property.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors text-xs font-medium border ${
                        property.showOnMap 
                          ? 'border-amber-primary/50 text-amber-primary bg-amber-primary/10' 
                          : 'border-border-default text-text-tertiary hover:text-text-primary hover:bg-bg-primary'
                      }`}
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      {property.showOnMap ? 'On Map' : 'Hidden'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button 
                      onClick={() => toggleFeatured(property.id)}
                      className={`p-1.5 rounded-full transition-colors ${
                        property.isFeatured 
                          ? 'text-amber-primary bg-amber-primary/10' 
                          : 'text-text-tertiary hover:text-text-primary hover:bg-bg-primary'
                      }`}
                    >
                      <Star className={`w-4 h-4 ${property.isFeatured ? 'fill-amber-primary' : ''}`} />
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <button 
                      onClick={() => {
                        const success = toggleRecommended(property.id);
                        if (!success && !property.isRecommended) {
                          alert("You can only have up to 10 recommended properties at a time.");
                        }
                      }}
                      title="Recommend Property (Max 10)"
                      className={`p-1.5 rounded-full transition-colors ${
                        property.isRecommended 
                          ? 'text-blue-500 bg-blue-500/10' 
                          : 'text-text-tertiary hover:text-text-primary hover:bg-bg-primary'
                      }`}
                    >
                      <ThumbsUp className={`w-4 h-4 ${property.isRecommended ? 'fill-blue-500' : ''}`} />
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-text-primary">
                    {formatPriceCompact(property.price)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {property.location.locality}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-text-secondary">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 bg-bg-card border-border-default">
                        <DropdownMenuItem 
                          className="cursor-pointer gap-2"
                          onClick={() => toggleSoldOut(property.id)}
                        >
                          <PowerOff className="w-4 h-4" />
                          {property.status === 'sold' ? 'Mark Active' : 'Mark Sold Out'}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="cursor-pointer gap-2 text-red-500 focus:text-red-500 focus:bg-red-500/10"
                          onClick={() => deleteProperty(property.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete Property
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
