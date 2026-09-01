"use client";

import { usePropertiesStore } from "@/stores/properties-store";
import { Button } from "@/components/ui/button";
import { formatPriceCompact } from "@/lib/utils";
import { MoreHorizontal, Plus, Star, Trash2, PowerOff, MapPin, ThumbsUp, Edit3 } from "lucide-react";
import Link from "next/link";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { WhatsAppIcon } from "@/components/property/whatsapp-share-button";
import { AdminWhatsAppModal } from "@/components/admin/admin-whatsapp-modal";
import { toast } from "sonner";
import { useState } from "react";

export default function AdminPropertiesPage() {
  const { properties, toggleSoldOut, deleteProperty, deleteAllProperties, toggleShowOnMap, updateDisplayCategory } = usePropertiesStore();
  const [whatsAppModalItem, setWhatsAppModalItem] = useState<any | null>(null);
  const [filterType, setFilterType] = useState<"all" | "apartment" | "villa" | "plot" | "commercial">("all");

  const isPlotOrLand = (p: any) => {
    const pType = (p.propertyType || "").toLowerCase();
    const subtype = (p.subtype || "").toLowerCase();
    return subtype === "venture-plot" || subtype === "land" || pType === "residential-land" || pType === "agricultural-lands";
  };

  const getPropertyTypeLabel = (p: any) => {
    const pType = (p.propertyType || "").toLowerCase();
    const subtype = (p.subtype || "").toLowerCase();
    if (isPlotOrLand(p)) return "Plot / Land";
    if (subtype === "flat" || pType === "apartment") return "Apartment / Flat";
    if (subtype === "villa" || subtype === "house" || pType === "villa" || pType === "independent-house") return "Villa / House";
    if (pType.includes("commercial") || subtype.includes("shop") || subtype.includes("building")) return "Commercial";
    return p.propertyType?.replace("-", " ") || "Property";
  };

  const filteredProperties = properties.filter((p: any) => {
    if (filterType === "all") return true;
    if (filterType === "plot") return isPlotOrLand(p);
    const pType = (p.propertyType || "").toLowerCase();
    const subtype = (p.subtype || "").toLowerCase();
    if (filterType === "apartment") return !isPlotOrLand(p) && (subtype === "flat" || pType === "apartment");
    if (filterType === "villa") return !isPlotOrLand(p) && (subtype === "villa" || subtype === "house" || pType === "villa" || pType === "independent-house");
    if (filterType === "commercial") return pType.includes("commercial") || subtype.includes("shop") || subtype.includes("building");
    return true;
  });

  const handleDeleteAll = () => {
    if (confirm("Are you sure you want to delete ALL properties? This action cannot be undone.")) {
      deleteAllProperties();
    }
  };

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold font-heading text-text-primary">Properties ({properties.length})</h1>
          <p className="text-text-secondary mt-1">Manage all listings, feature them, or update their status.</p>
        </div>
        <div className="flex items-center gap-3">
          {properties.length > 0 && (
            <Button 
              variant="outline" 
              onClick={handleDeleteAll}
              className="border-red-500/30 text-red-500 hover:bg-red-500/10 hover:text-red-400 gap-2 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Delete All
            </Button>
          )}
          <Button variant="amber" asChild>
            <Link href="/admin/properties/new" className="gap-2">
              <Plus className="w-4 h-4" />
              Add New Property
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats & Category Filter Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
        {[
          { type: "all", label: "All Properties", count: properties.length },
          { type: "apartment", label: "Apartments", count: properties.filter((p: any) => !isPlotOrLand(p) && ((p.subtype || "").toLowerCase() === "flat" || (p.propertyType || "").toLowerCase() === "apartment")).length },
          { type: "villa", label: "Houses & Villas", count: properties.filter((p: any) => !isPlotOrLand(p) && (["villa", "house"].includes((p.subtype || "").toLowerCase()) || ["villa", "independent-house"].includes((p.propertyType || "").toLowerCase()))).length },
          { type: "plot", label: "Plots & Land", count: properties.filter((p: any) => isPlotOrLand(p)).length },
          { type: "commercial", label: "Commercial", count: properties.filter((p: any) => (p.propertyType || "").toLowerCase().includes("commercial") || (p.subtype || "").toLowerCase().includes("shop") || (p.subtype || "").toLowerCase().includes("building")).length },
        ].map((item) => {
          const active = filterType === item.type;
          return (
            <button
              key={item.type}
              onClick={() => setFilterType(item.type as any)}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                active
                  ? "border-amber-500/60 bg-amber-500/10"
                  : "border-border-default bg-bg-card hover:border-amber-500/30"
              }`}
            >
              <div className="text-2xl font-bold font-heading text-text-primary">{item.count}</div>
              <div className="text-xs text-text-secondary capitalize mt-0.5 font-medium">
                {item.label}
              </div>
            </button>
          );
        })}
      </div>

      {properties.length === 0 ? (
        <div className="text-center py-20 bg-bg-card border border-border-default rounded-3xl p-8 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto text-amber-500">
            <Plus className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-text-primary">No Properties Found</h3>
          <p className="text-sm text-text-secondary max-w-md mx-auto">
            All properties have been deleted. You can create brand new listings anytime using the button below.
          </p>
          <Button variant="amber" asChild className="mt-2">
            <Link href="/admin/properties/new" className="gap-2">
              <Plus className="w-4 h-4" /> Add New Property
            </Link>
          </Button>
        </div>
      ) : (
      <div className="bg-bg-card border border-border-default rounded-2xl overflow-hidden shadow-sm">
        
        {/* Mobile View: Property Cards */}
        <div className="block md:hidden divide-y divide-border-subtle">
          {filteredProperties.map((property) => (
            <div key={property.id} className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-border-default overflow-hidden shrink-0">
                  <img src={property.images[0]?.url} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-text-primary text-sm truncate">
                    {property.title}
                  </h4>
                  <div className="text-xs text-amber-primary font-black mt-0.5">
                    {formatPriceCompact(property.price)}
                  </div>
                  <div className="text-xs text-text-tertiary truncate">
                    📍 {property.location.locality}, {property.location.city} • <span className="text-amber-500 font-semibold">{getPropertyTypeLabel(property)}</span>
                  </div>
                </div>
              </div>

              {/* Action Badges Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border-subtle text-xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button 
                    onClick={() => toggleShowOnMap(property.id)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${
                      property.showOnMap 
                        ? 'border-amber-primary/50 text-amber-primary bg-amber-primary/10' 
                        : 'border-border-default text-text-tertiary hover:text-text-primary'
                    }`}
                  >
                    <MapPin className="w-3 h-3" />
                    {property.showOnMap ? 'On Map' : 'Hidden'}
                  </button>

                  <div className="relative">
                    <select
                      value={property.displayCategory || (property.isFeatured ? "featured" : property.isRecommended ? "recommended" : "none")}
                      onChange={async (e) => {
                        const wasSaved = await updateDisplayCategory(property.id, e.target.value as any);
                        if (wasSaved) toast.success("Property category updated!");
                      }}
                      className="bg-bg-primary border border-border-default text-text-primary text-xs rounded-full px-2.5 py-1 font-semibold focus:outline-none focus:ring-1 focus:ring-amber-primary cursor-pointer"
                    >
                      <option value="none">None</option>
                      <option value="featured">⭐ Featured</option>
                      <option value="recommended">👍 Recommended</option>
                      <option value="budget_friendly">💰 Budget Friendly</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setWhatsAppModalItem(property)}
                    className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 flex items-center gap-1 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                    title="Share on WhatsApp"
                  >
                    <WhatsAppIcon className="w-3 h-3 fill-emerald-500/20" />
                    <span>WhatsApp</span>
                  </button>

                  <Link
                    href={`/admin/properties/${property.id}/edit`}
                    className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30 flex items-center gap-1"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit</span>
                  </Link>

                  <button
                    onClick={() => toggleSoldOut(property.id)}
                    className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      property.status === 'sold' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'
                    }`}
                  >
                    {property.status === 'sold' ? 'Sold Out' : 'Active'}
                  </button>

                  <button
                    onClick={() => deleteProperty(property.id)}
                    className="p-1 text-red-500 hover:bg-red-500/10 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm text-text-secondary">
            <thead className="bg-bg-primary/50 text-text-primary border-b border-border-default uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-4">Property</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Map Visibility</th>
                <th className="px-6 py-4">Display Category</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filteredProperties.map((property) => (
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
                          {property.listingType} • <span className="text-amber-500 font-semibold">{getPropertyTypeLabel(property)}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      property.status === 'sold' 
                        ? 'bg-red-500/10 text-red-500' 
                        : 'bg-amber-500/10 text-amber-500'
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
                    <select
                      value={property.displayCategory || (property.isFeatured ? "featured" : property.isRecommended ? "recommended" : "none")}
                      onChange={async (e) => {
                        const wasSaved = await updateDisplayCategory(property.id, e.target.value as any);
                        if (wasSaved) toast.success("Property category updated!");
                      }}
                      className="bg-bg-primary border border-border-default text-text-primary text-xs rounded-full px-3 py-1.5 font-semibold focus:outline-none focus:ring-1 focus:ring-amber-primary transition-colors hover:bg-bg-card cursor-pointer"
                    >
                      <option value="none">None</option>
                      <option value="featured">⭐ Featured</option>
                      <option value="recommended">👍 Recommended</option>
                      <option value="budget_friendly">💰 Budget Friendly</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-text-primary">
                    {formatPriceCompact(property.price)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {property.location.locality}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setWhatsAppModalItem(property)}
                        className="gap-1.5 text-xs border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer h-8"
                        title="Share on WhatsApp"
                      >
                        <WhatsAppIcon className="w-3.5 h-3.5 fill-emerald-500/20" />
                        <span className="hidden lg:inline">WhatsApp</span>
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-text-secondary">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 bg-bg-card border-border-default">
                          <DropdownMenuItem 
                            className="cursor-pointer gap-2 text-emerald-500 focus:text-emerald-500 focus:bg-emerald-500/10"
                            onClick={() => setWhatsAppModalItem(property)}
                          >
                            <WhatsAppIcon className="w-4 h-4 fill-emerald-500/20" />
                            Share on WhatsApp
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild className="cursor-pointer gap-2 text-amber-500 focus:text-amber-500 focus:bg-amber-500/10">
                            <Link href={`/admin/properties/${property.id}/edit`}>
                              <Edit3 className="w-4 h-4" />
                              Edit Property
                            </Link>
                          </DropdownMenuItem>
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
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* WhatsApp Sharing & Business API Modal */}
      <AdminWhatsAppModal
        item={whatsAppModalItem}
        type="property"
        isOpen={Boolean(whatsAppModalItem)}
        onClose={() => setWhatsAppModalItem(null)}
      />
    </div>
  );
}
