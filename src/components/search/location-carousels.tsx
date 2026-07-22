"use client";

import { useState } from "react";
import { MapPin, Sparkles, Home, Building2, Layers, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

interface LocationCarouselsProps {
  onSelectLocation: (location: string) => void;
  onSelectFilter: (type: string, value: any) => void;
  activeLocation?: string;
}

export function LocationCarousels({
  onSelectLocation,
  onSelectFilter,
  activeLocation = "",
}: LocationCarouselsProps) {
  const [activeTab, setActiveTab] = useState<"vijayawada" | "guntur" | "popular">("vijayawada");

  const vijayawadaHotspots = [
    { name: "Benz Circle", tag: "Prime Commercial & Hub", count: "45+ Homes" },
    { name: "Poranki", tag: "Fastest Growing Residential", count: "32+ Homes" },
    { name: "Kanuru", tag: "Premium Villas & Apartments", count: "28+ Homes" },
    { name: "Patamata", tag: "Central City Living", count: "38+ Homes" },
    { name: "Tadepalli", tag: "Near Capital Region", count: "25+ Homes" },
    { name: "Penamaluru", tag: "Gated Communities", count: "20+ Homes" },
    { name: "Auto Nagar", tag: "Commercial & Plots", count: "18+ Homes" },
  ];

  const gunturHotspots = [
    { name: "Gorantla", tag: "Top Residential Location", count: "35+ Homes" },
    { name: "Amaravati Road", tag: "Capital Corridor", count: "42+ Homes" },
    { name: "Brodipet", tag: "Commercial & Premium Flats", count: "30+ Homes" },
    { name: "Pattabhipuram", tag: "Established Housing", count: "24+ Homes" },
    { name: "Kaza", tag: "High-yield Plots & Villas", count: "22+ Homes" },
    { name: "Mangalagiri", tag: "Near AIIMS & Highway", count: "40+ Homes" },
  ];

  const popularQuickFilters = [
    { label: "2 BHK under ₹50L", type: "budget_bhk", budget: [0, 5000000], bhk: ["2"] },
    { label: "3 BHK Luxury Flats", type: "bhk", bhk: ["3"] },
    { label: "Gated Community Villas", type: "propertyType", propertyType: ["villa"] },
    { label: "Ready to Move", type: "availability", availability: ["ready"] },
    { label: "Residential Plots", type: "propertyType", propertyType: ["residential-land"] },
    { label: "RERA Approved", type: "rera", rera: true },
    { label: "Owner Listings", type: "postedBy", postedBy: ["owner"] },
  ];

  return (
    <div className="w-full bg-slate-50/80 border-y border-slate-200/80 py-3 px-4 sm:px-6 my-2">
      <div className="max-w-7xl mx-auto space-y-2.5">
        {/* City Tab Buttons */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 no-scrollbar">
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1 mr-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Explore AP:
            </span>
            <button
              onClick={() => setActiveTab("vijayawada")}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-1 flex-shrink-0 cursor-pointer",
                activeTab === "vijayawada"
                  ? "bg-amber-500 text-slate-950 font-bold shadow-xs shadow-amber-500/30"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
              )}
            >
              <MapPin className="w-3 h-3" /> Vijayawada Hubs
            </button>
            <button
              onClick={() => setActiveTab("guntur")}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-1 flex-shrink-0 cursor-pointer",
                activeTab === "guntur"
                  ? "bg-amber-500 text-slate-950 font-bold shadow-xs shadow-amber-500/30"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
              )}
            >
              <Building2 className="w-3 h-3" /> Guntur Hotspots
            </button>
            <button
              onClick={() => setActiveTab("popular")}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-1 flex-shrink-0 cursor-pointer",
                activeTab === "popular"
                  ? "bg-amber-500 text-slate-950 font-bold shadow-xs shadow-amber-500/30"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
              )}
            >
              <Tag className="w-3 h-3" /> Top Searches
            </button>
          </div>
        </div>

        {/* Horizontal Chips Carousel */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
          {activeTab === "vijayawada" &&
            vijayawadaHotspots.map((spot) => {
              const isSelected = activeLocation.toLowerCase().includes(spot.name.toLowerCase());
              return (
                <button
                  key={spot.name}
                  onClick={() => onSelectLocation(spot.name)}
                  className={cn(
                    "flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs transition-all duration-200 cursor-pointer",
                    isSelected
                      ? "bg-amber-50 border-amber-500 text-amber-900 font-semibold shadow-xs"
                      : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  )}
                >
                  <MapPin className={cn("w-3.5 h-3.5", isSelected ? "text-amber-600" : "text-slate-400")} />
                  <div className="text-left">
                    <span className="font-semibold block leading-tight">{spot.name}</span>
                    <span className="text-[10px] text-slate-500 block leading-tight">{spot.tag}</span>
                  </div>
                </button>
              );
            })}

          {activeTab === "guntur" &&
            gunturHotspots.map((spot) => {
              const isSelected = activeLocation.toLowerCase().includes(spot.name.toLowerCase());
              return (
                <button
                  key={spot.name}
                  onClick={() => onSelectLocation(spot.name)}
                  className={cn(
                    "flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs transition-all duration-200 cursor-pointer",
                    isSelected
                      ? "bg-amber-50 border-amber-500 text-amber-900 font-semibold shadow-xs"
                      : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  )}
                >
                  <Building2 className={cn("w-3.5 h-3.5", isSelected ? "text-amber-600" : "text-slate-400")} />
                  <div className="text-left">
                    <span className="font-semibold block leading-tight">{spot.name}</span>
                    <span className="text-[10px] text-slate-500 block leading-tight">{spot.tag}</span>
                  </div>
                </button>
              );
            })}

          {activeTab === "popular" &&
            popularQuickFilters.map((filter) => (
              <button
                key={filter.label}
                onClick={() => {
                  if (filter.budget && filter.bhk) {
                    onSelectFilter("budget", filter.budget);
                    onSelectFilter("bhk", filter.bhk);
                  } else if (filter.bhk) {
                    onSelectFilter("bhk", filter.bhk);
                  } else if (filter.propertyType) {
                    onSelectFilter("propertyType", filter.propertyType);
                  } else if (filter.postedBy) {
                    onSelectFilter("postedBy", filter.postedBy);
                  } else if (filter.rera) {
                    onSelectFilter("rera", true);
                  } else if (filter.availability) {
                    onSelectFilter("availability", filter.availability);
                  }
                }}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 text-xs font-medium transition-all duration-200 cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-amber-500" />
                <span>{filter.label}</span>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
