"use client";

import { useState } from "react";
import { Search, SlidersHorizontal, ChevronDown, Check, X, Building2, Bed, DollarSign, Home, Trees, Store, Map as MapIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { formatINR, cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";

export interface FilterState {
  query: string;
  listingType: string[];
  propertyType: string[];
  bhk: string[];
  budget: [number, number];
  ageRange: string[];
  saleType: string[];
  availability: string[];
  postedBy: string[];
  furnished: string[];
}

interface SearchFiltersProps {
  filters: FilterState;
  setFilters: (filters: FilterState | ((prev: FilterState) => FilterState)) => void;
}

export function SearchFilters({ filters, setFilters }: SearchFiltersProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const toggleFilter = (category: keyof FilterState, value: string) => {
    setFilters((prev) => {
      const current = prev[category] as string[];
      const updated = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];
      return { ...prev, [category]: updated };
    });
  };

  const getFilterCount = (category: keyof FilterState) => {
    return (filters[category] as string[]).length;
  };

  const clearFilters = () => {
    setFilters({
      query: "",
      listingType: [],
      propertyType: [],
      bhk: [],
      budget: [0, 100000000],
      ageRange: [],
      saleType: [],
      availability: [],
      postedBy: [],
      furnished: [],
    });
  };

  const hasActiveFilters = 
    filters.listingType.length > 0 || 
    filters.propertyType.length > 0 || 
    filters.bhk.length > 0 || 
    filters.ageRange.length > 0 ||
    filters.saleType.length > 0 ||
    filters.availability.length > 0 ||
    filters.postedBy.length > 0 ||
    filters.furnished.length > 0 ||
    filters.budget[0] > 0 || 
    filters.budget[1] < 100000000 ||
    filters.query !== "";

  return (
    <div className="w-full space-y-4 mb-2">
      {/* Search Bar Row */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-text-tertiary" />
          <Input
            type="text"
            placeholder="Search by locality, city, or project name..."
            className="pl-13 h-14 bg-bg-card border-border-default/50 rounded-full shadow-sm text-base focus-visible:ring-1 focus-visible:ring-amber-primary"
            value={filters.query}
            onChange={(e) => setFilters({ ...filters, query: e.target.value })}
          />
        </div>
        <Link 
          href={(() => {
            const params = new URLSearchParams();
            if (filters.query) params.set("location", filters.query);
            if (filters.propertyType.length > 0) params.set("type", filters.propertyType[0]);
            else if (filters.listingType.length > 0) params.set("type", filters.listingType[0]);
            if (filters.bhk.length > 0) params.set("bhk", filters.bhk[0]);
            const str = params.toString();
            return `/properties/map${str ? `?${str}` : ''}`;
          })()}
          className="flex items-center justify-center gap-2 h-14 px-5 rounded-full bg-bg-card border border-border-default/50 hover:bg-bg-primary/50 shadow-sm text-text-primary font-medium transition-colors whitespace-nowrap flex-shrink-0"
        >
          <MapIcon className="h-5 w-5" />
          <span className="hidden sm:inline">Map</span>
        </Link>
      </div>
      
      {/* Multi-Select Dropdowns */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar relative">
        <style dangerouslySetInnerHTML={{__html: `
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}} />
        
        {/* Listing Type Filter */}
        <DropdownMenu onOpenChange={(open) => setActiveMenu(open ? "listing" : null)}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className={`h-10 rounded-full px-4 border-border-default/60 hover:bg-bg-primary/50 transition-all bg-bg-card flex-shrink-0 ${getFilterCount('listingType') > 0 ? 'bg-amber-primary/10 border-amber-primary/30 text-amber-primary shadow-sm' : ''}`}>
              Buy / Rent
              {getFilterCount('listingType') > 0 && (
                <Badge variant="amber" className="ml-1.5 h-4 w-4 p-0 flex items-center justify-center rounded-full text-[9px]">
                  {getFilterCount('listingType')}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 p-3 rounded-2xl bg-bg-card border-border-default" align="start">
              <DropdownMenuLabel>Listing Type</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border-subtle" />
              <div className="space-y-3 mt-2">
                {["sale", "rent", "pg"].map((type) => (
                  <label key={type} className="flex items-center space-x-3 cursor-pointer group">
                    <Checkbox 
                      checked={filters.listingType.includes(type)}
                      onCheckedChange={() => toggleFilter("listingType", type)}
                      className="border-text-tertiary data-[state=checked]:bg-amber-primary data-[state=checked]:border-amber-primary"
                    />
                    <span className="text-sm font-medium capitalize text-text-secondary group-hover:text-text-primary transition-colors">
                      {type === "sale" ? "Buy" : type}
                    </span>
                  </label>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

        {/* Property Type Filter */}
        <DropdownMenu onOpenChange={(open) => setActiveMenu(open ? "property" : null)}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className={`h-10 rounded-full px-4 border-border-default/60 hover:bg-bg-primary/50 transition-all bg-bg-card flex-shrink-0 ${getFilterCount('propertyType') > 0 ? 'bg-amber-primary/10 border-amber-primary/30 text-amber-primary shadow-sm' : ''}`}>
              Property Type
              {getFilterCount('propertyType') > 0 && (
                <Badge variant="amber" className="ml-1.5 h-4 w-4 p-0 flex items-center justify-center rounded-full text-[9px]">
                  {getFilterCount('propertyType')}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 p-3 rounded-2xl bg-bg-card border-border-default max-h-[50vh] md:max-h-[300px] overflow-y-auto" align="start" side="bottom" sideOffset={8} avoidCollisions={false}>
              <DropdownMenuLabel className="text-xs text-text-tertiary uppercase tracking-wider">Residential</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border-subtle" />
              <div className="space-y-3 mt-2 mb-4">
                {["apartment", "villa", "independent-house", "residential-land", "farmhouse", "pg-coliving"].map((type) => (
                  <label key={type} className="flex items-center space-x-3 cursor-pointer group">
                    <Checkbox 
                      checked={filters.propertyType.includes(type)}
                      onCheckedChange={() => toggleFilter("propertyType", type)}
                      className="border-text-tertiary data-[state=checked]:bg-amber-primary data-[state=checked]:border-amber-primary"
                    />
                    <span className="text-sm font-medium capitalize text-text-secondary group-hover:text-text-primary transition-colors">
                      {type.replace("-", " ")}
                    </span>
                  </label>
                ))}
              </div>
              <DropdownMenuLabel className="text-xs text-text-tertiary uppercase tracking-wider">Commercial</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border-subtle" />
              <div className="space-y-3 mt-2">
                {["shops", "buildings", "commercial-spaces", "commercial-lands", "industrial-lands", "agricultural-lands"].map((type) => (
                  <label key={type} className="flex items-center space-x-3 cursor-pointer group">
                    <Checkbox 
                      checked={filters.propertyType.includes(type)}
                      onCheckedChange={() => toggleFilter("propertyType", type)}
                      className="border-text-tertiary data-[state=checked]:bg-amber-primary data-[state=checked]:border-amber-primary"
                    />
                    <span className="text-sm font-medium capitalize text-text-secondary group-hover:text-text-primary transition-colors">
                      {type.replace("-", " ")}
                    </span>
                  </label>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

        {/* BHK Filter */}
        <DropdownMenu onOpenChange={(open) => setActiveMenu(open ? "bhk" : null)}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className={`h-10 rounded-full px-4 border-border-default/60 hover:bg-bg-primary/50 transition-all bg-bg-card flex-shrink-0 ${getFilterCount('bhk') > 0 ? 'bg-amber-primary/10 border-amber-primary/30 text-amber-primary shadow-sm' : ''}`}>
              BHK
              {getFilterCount('bhk') > 0 && (
                <Badge variant="amber" className="ml-1.5 h-4 w-4 p-0 flex items-center justify-center rounded-full text-[9px]">
                  {getFilterCount('bhk')}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 p-3 rounded-2xl bg-bg-card border-border-default" align="start">
              <DropdownMenuLabel>Bedrooms</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border-subtle" />
              <div className="space-y-3 mt-2">
                {["1BHK", "2BHK", "3BHK", "4BHK and more"].map((bhk) => (
                  <label key={bhk} className="flex items-center space-x-3 cursor-pointer group">
                    <Checkbox 
                      checked={filters.bhk.includes(bhk)}
                      onCheckedChange={() => toggleFilter("bhk", bhk)}
                      className="border-text-tertiary data-[state=checked]:bg-amber-primary data-[state=checked]:border-amber-primary"
                    />
                    <span className="text-sm font-medium capitalize text-text-secondary group-hover:text-text-primary transition-colors">
                      {bhk}
                    </span>
                  </label>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

        {/* Budget Filter */}
        <DropdownMenu onOpenChange={(open) => setActiveMenu(open ? "budget" : null)}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className={`h-10 rounded-full px-4 border-border-default/60 hover:bg-bg-primary/50 transition-all bg-bg-card flex-shrink-0 ${(filters.budget[0] > 0 || filters.budget[1] < 100000000) ? 'bg-amber-primary/10 border-amber-primary/30 text-amber-primary shadow-sm' : ''}`}>
              Price
            </Button>
          </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[300px] p-4 rounded-2xl bg-bg-card border-border-default shadow-elevated" align="start">
              <DropdownMenuLabel className="font-semibold text-text-primary mb-3">Price Range</DropdownMenuLabel>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Under ₹50L", min: 0, max: 5000000 },
                  { label: "₹50L - ₹1Cr", min: 5000000, max: 10000000 },
                  { label: "₹1Cr - ₹3Cr", min: 10000000, max: 30000000 },
                  { label: "₹3Cr+", min: 30000000, max: 1000000000 },
                ].map((range) => {
                  const isActive = filters.budget[0] === range.min && filters.budget[1] === range.max;
                  return (
                    <button
                      key={range.label}
                      onClick={() => setFilters(prev => ({ ...prev, budget: isActive ? [0, 100000000] : [range.min, range.max] }))}
                      className={cn(
                        "flex items-center justify-center px-3 py-2.5 rounded-xl text-xs font-medium transition-all border",
                        isActive
                          ? "bg-amber-primary/10 border-amber-primary text-amber-primary"
                          : "bg-bg-primary/50 border-border-default/50 text-text-secondary hover:border-amber-primary/40"
                      )}
                    >
                      {range.label}
                    </button>
                  );
                })}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
  );
}
