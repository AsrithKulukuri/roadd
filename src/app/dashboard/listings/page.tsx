"use client";

import { useState } from "react";
import { PropertyCard } from "@/components/property/property-card";
import { mockProperties } from "@/lib/mock-data";
import { Input } from "@/components/ui/input";
import { Search, Filter, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function MyListingsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  
  // In a real app, this would filter by the logged-in user's ID
  const myProperties = mockProperties.slice(0, 6);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-text-primary">My Properties</h1>
          <p className="text-text-secondary mt-1">Manage your property listings, update prices, or add new ones.</p>
        </div>
        <Button variant="amber" asChild>
          <Link href="/dashboard/listings/new">
            <Plus className="mr-2 h-4 w-4" />
            Add New Property
          </Link>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-bg-card p-4 rounded-2xl border border-border-default">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
          <Input 
            placeholder="Search your listings..." 
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" className="w-full sm:w-auto">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <select className="h-10 rounded-xl border border-border-default bg-bg-card px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-amber-primary/40 focus:border-amber-primary">
            <option>All Status</option>
            <option>Active</option>
            <option>Pending</option>
            <option>Sold/Rented</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {myProperties.map((property, i) => (
          <div key={property.id} className="relative">
            <PropertyCard property={property} index={i} />
            <div className="absolute top-3 right-3 flex flex-col gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="secondary" size="sm" className="shadow-sm">Edit</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
