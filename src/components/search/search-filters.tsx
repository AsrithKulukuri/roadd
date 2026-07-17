"use client";

import { useState } from "react";
import { Search, SlidersHorizontal, ChevronDown, Check, X } from "lucide-react";
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
import { formatINR } from "@/lib/utils";
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
    <div className="w-full bg-bg-card border border-border-default rounded-3xl p-4 shadow-sm mb-8 space-y-4">
      {/* Search Bar Row */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-tertiary" />
          <Input
            type="text"
            placeholder="Search by locality, city, or project name..."
            className="pl-12 h-14 bg-bg-primary/50 border-border-default/50 rounded-2xl"
            value={filters.query}
            onChange={(e) => setFilters({ ...filters, query: e.target.value })}
          />
        </div>
        
        {/* Multi-Select Dropdowns */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Listing Type Filter */}
          <DropdownMenu onOpenChange={(open) => setActiveMenu(open ? "listing" : null)}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className={`h-14 rounded-2xl px-5 border-border-default/50 ${getFilterCount('listingType') > 0 ? 'bg-amber-primary/10 border-amber-primary/30 text-amber-primary' : ''}`}>
                Buy / Rent
                {getFilterCount('listingType') > 0 && (
                  <Badge variant="amber" className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]">
                    {getFilterCount('listingType')}
                  </Badge>
                )}
                <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
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
              <Button variant="outline" className={`h-14 rounded-2xl px-5 border-border-default/50 ${getFilterCount('propertyType') > 0 ? 'bg-amber-primary/10 border-amber-primary/30 text-amber-primary' : ''}`}>
                Property Type
                {getFilterCount('propertyType') > 0 && (
                  <Badge variant="amber" className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]">
                    {getFilterCount('propertyType')}
                  </Badge>
                )}
                <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
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
              <Button variant="outline" className={`h-14 rounded-2xl px-5 border-border-default/50 ${getFilterCount('bhk') > 0 ? 'bg-amber-primary/10 border-amber-primary/30 text-amber-primary' : ''}`}>
                BHK
                {getFilterCount('bhk') > 0 && (
                  <Badge variant="amber" className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]">
                    {getFilterCount('bhk')}
                  </Badge>
                )}
                <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
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

          {/* More Filters (Advanced) */}
          <DropdownMenu onOpenChange={(open) => setActiveMenu(open ? "more" : null)}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-14 rounded-2xl px-5 border-border-default/50 hover:bg-bg-primary/50">
                <SlidersHorizontal className="h-4 w-4 mr-2 opacity-50" />
                More Filters
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-72 p-4 rounded-2xl bg-bg-card border-border-default max-h-[50vh] md:max-h-[400px] overflow-y-auto" align="end" side="bottom" sideOffset={8} avoidCollisions={false}>
              
              <DropdownMenuLabel className="px-0">Availability</DropdownMenuLabel>
              <div className="space-y-2 mt-1 mb-4">
                {["Under construction", "Ready to move"].map((av) => (
                  <label key={av} className="flex items-center space-x-3 cursor-pointer group">
                    <Checkbox 
                      checked={filters.availability.includes(av)}
                      onCheckedChange={() => toggleFilter("availability", av)}
                      className="border-text-tertiary data-[state=checked]:bg-amber-primary"
                    />
                    <span className="text-sm text-text-secondary group-hover:text-text-primary">{av}</span>
                  </label>
                ))}
              </div>

              <DropdownMenuLabel className="px-0">Age of property</DropdownMenuLabel>
              <div className="space-y-2 mt-1 mb-4">
                {["0-10 years old", "10-30 years old", "30+ years old"].map((age) => (
                  <label key={age} className="flex items-center space-x-3 cursor-pointer group">
                    <Checkbox 
                      checked={filters.ageRange.includes(age)}
                      onCheckedChange={() => toggleFilter("ageRange", age)}
                      className="border-text-tertiary data-[state=checked]:bg-amber-primary"
                    />
                    <span className="text-sm text-text-secondary group-hover:text-text-primary">{age}</span>
                  </label>
                ))}
              </div>

              <DropdownMenuLabel className="px-0">Sale type</DropdownMenuLabel>
              <div className="space-y-2 mt-1 mb-4">
                {["New property", "Resale"].map((st) => (
                  <label key={st} className="flex items-center space-x-3 cursor-pointer group">
                    <Checkbox 
                      checked={filters.saleType.includes(st)}
                      onCheckedChange={() => toggleFilter("saleType", st)}
                      className="border-text-tertiary data-[state=checked]:bg-amber-primary"
                    />
                    <span className="text-sm text-text-secondary group-hover:text-text-primary">{st}</span>
                  </label>
                ))}
              </div>

              <DropdownMenuLabel className="px-0">Posted by</DropdownMenuLabel>
              <div className="space-y-2 mt-1 mb-4">
                {["Owner", "Agent", "Developer"].map((pb) => (
                  <label key={pb} className="flex items-center space-x-3 cursor-pointer group">
                    <Checkbox 
                      checked={filters.postedBy.includes(pb)}
                      onCheckedChange={() => toggleFilter("postedBy", pb)}
                      className="border-text-tertiary data-[state=checked]:bg-amber-primary"
                    />
                    <span className="text-sm text-text-secondary group-hover:text-text-primary">{pb}</span>
                  </label>
                ))}
              </div>

              <DropdownMenuLabel className="px-0">Furnished</DropdownMenuLabel>
              <div className="space-y-2 mt-1">
                {["Furnished", "Semi furnished", "Unfurnished"].map((fur) => (
                  <label key={fur} className="flex items-center space-x-3 cursor-pointer group">
                    <Checkbox 
                      checked={filters.furnished.includes(fur)}
                      onCheckedChange={() => toggleFilter("furnished", fur)}
                      className="border-text-tertiary data-[state=checked]:bg-amber-primary"
                    />
                    <span className="text-sm text-text-secondary group-hover:text-text-primary">{fur}</span>
                  </label>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {hasActiveFilters && (
            <Button 
              variant="ghost" 
              onClick={clearFilters}
              className="h-14 text-text-tertiary hover:text-text-primary"
            >
              <X className="h-4 w-4 mr-2" />
              Clear
            </Button>
          )}
        </div>
      </div>
      
      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border-default/30">
          <span className="text-xs font-medium text-text-tertiary mr-2">Active Filters:</span>
          
          {filters.listingType.map(f => (
            <Badge key={`lt-${f}`} variant="outline" className="text-xs bg-bg-primary">
              {f === 'sale' ? 'Buy' : f.toUpperCase()}
              <X className="h-3 w-3 ml-1 cursor-pointer hover:text-amber-primary" onClick={() => toggleFilter('listingType', f)} />
            </Badge>
          ))}
          
          {filters.propertyType.map(f => (
            <Badge key={`pt-${f}`} variant="outline" className="text-xs bg-bg-primary capitalize">
              {f.replace('-', ' ')}
              <X className="h-3 w-3 ml-1 cursor-pointer hover:text-amber-primary" onClick={() => toggleFilter('propertyType', f)} />
            </Badge>
          ))}
          
          {filters.bhk.map(f => (
            <Badge key={`bhk-${f}`} variant="outline" className="text-xs bg-bg-primary">
              {f} BHK
              <X className="h-3 w-3 ml-1 cursor-pointer hover:text-amber-primary" onClick={() => toggleFilter('bhk', f)} />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
