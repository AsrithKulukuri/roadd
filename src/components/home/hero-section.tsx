"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin, Home, Building2, Tent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "buy", label: "Buy", icon: Home },
  { id: "rent", label: "Rent", icon: Building2 },
  { id: "pg", label: "PG / Co-living", icon: Tent },
  { id: "commercial", label: "Commercial", icon: Building2 },
];

export function HeroSection() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("buy");
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(
        `/properties?type=${activeTab}&location=${encodeURIComponent(
          searchQuery
        )}`
      );
    } else {
      router.push(`/properties?type=${activeTab}`);
    }
  };

  return (
    <section className="relative min-h-[85vh] md:min-h-[90vh] flex items-center justify-center pt-20 pb-10 md:pt-24 md:pb-16 overflow-hidden">
      {/* Background Image & Overlay */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-transform duration-10000 hover:scale-105"
        style={{
          backgroundImage:
            'url("https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920&q=80")',
        }}
      >
        <div className="absolute inset-0 bg-bg-primary/80 backdrop-blur-[2px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-bg-primary/50 to-transparent" />
      </div>

      <div className="container-road relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center">
        {/* Hero Text */}
        <div className="text-center mb-6 md:mb-10 space-y-3 md:space-y-4">
          <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white drop-shadow-lg leading-tight">
            Find Your <span className="text-amber-primary">Dream Property</span>{" "}
            in India
          </h1>
          <p className="text-base md:text-xl text-text-secondary max-w-2xl mx-auto drop-shadow-md font-medium px-2">
            Discover verified homes, luxury villas, and premium commercial spaces
            in Visakhapatnam, Hyderabad, Bengaluru, and beyond.
          </p>
        </div>

        {/* Search Widget */}
        <div className="w-full bg-bg-card/40 backdrop-blur-xl border border-border-default/50 rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-elevated amber-border-glow">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4 overflow-x-auto pb-1 scrollbar-none">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0",
                    activeTab === tab.id
                      ? "bg-amber-primary text-bg-primary shadow-amber-glow"
                      : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
                  )}
                >
                  <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Search Form */}
          <form
            onSubmit={handleSearch}
            className="flex flex-col sm:flex-row gap-3"
          >
            <div className="relative flex-1">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-tertiary" />
              <Input
                type="text"
                placeholder="Search by city, locality, or project name..."
                className="pl-12 h-12 sm:h-14 text-sm sm:text-base rounded-2xl bg-bg-primary/50 border-border-default/50 focus:bg-bg-primary focus:border-amber-primary/50 transition-all placeholder:text-text-tertiary"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                size="xl"
                className="flex-1 sm:flex-none px-4 sm:px-6 rounded-2xl h-12 sm:h-14 bg-bg-primary/50 hover:bg-bg-primary backdrop-blur-sm border-border-default/50 text-text-secondary hover:text-amber-primary transition-all text-xs sm:text-sm"
                onClick={() => router.push('/properties/map')}
              >
                <MapPin className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" />
                Map
              </Button>
              <Button
                type="submit"
                variant="amber"
                size="xl"
                className="flex-1 sm:flex-none px-6 sm:px-8 rounded-2xl h-12 sm:h-14 shadow-amber-glow text-xs sm:text-sm"
              >
                <Search className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" />
                Search
              </Button>
            </div>
          </form>

          {/* Quick Links */}
          <div className="mt-3 sm:mt-4 flex flex-wrap items-center gap-x-4 sm:gap-x-6 gap-y-1.5 text-xs sm:text-sm text-text-tertiary px-1 sm:px-2">
            <span className="font-medium text-text-secondary">Trending:</span>
            <div className="flex flex-wrap gap-x-3 sm:gap-x-4 gap-y-1.5">
              <button onClick={() => setSearchQuery("Rushikonda, Vizag")} className="hover:text-amber-primary transition-colors">Rushikonda</button>
              <button onClick={() => setSearchQuery("Gachibowli, Hyderabad")} className="hover:text-amber-primary transition-colors">Gachibowli</button>
              <button onClick={() => setSearchQuery("Whitefield, Bengaluru")} className="hover:text-amber-primary transition-colors">Whitefield</button>
              <button onClick={() => setSearchQuery("OMR, Chennai")} className="hover:text-amber-primary transition-colors">OMR</button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-12 mt-10 md:mt-16 text-center w-full max-w-4xl border-t border-border-default/30 pt-8 md:pt-10">
          {[
            { label: "Verified Listings", value: "25k+" },
            { label: "Happy Customers", value: "10k+" },
            { label: "Cities Covered", value: "15+" },
            { label: "Total Volume", value: "₹5k Cr+" },
          ].map((stat, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <span className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold text-white drop-shadow-sm">
                {stat.value}
              </span>
              <span className="text-xs sm:text-sm text-text-secondary font-medium tracking-wide">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
