"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin, Home, Building2, Tent, Bed, DollarSign, SlidersHorizontal, Settings2, Building, Trees, Store, Layers, Briefcase, Sofa } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnimatedSearchBar } from "@/components/search/animated-search-bar";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, ChevronDown } from "lucide-react";

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
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedBhk, setSelectedBhk] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<string[]>([]);
  const [selectedBudget, setSelectedBudget] = useState<string[]>([]);
  const [selectedAge, setSelectedAge] = useState<string[]>([]);
  const [selectedSaleType, setSelectedSaleType] = useState<string[]>([]);
  const [selectedPostedBy, setSelectedPostedBy] = useState<string[]>([]);
  const [selectedFurnished, setSelectedFurnished] = useState<string[]>([]);
  
  const triggerSearch = (queryOverride?: string) => {
    const queryParams = new URLSearchParams();
    queryParams.append("type", activeTab);
    const finalQuery = queryOverride !== undefined ? queryOverride : searchQuery;
    if (finalQuery) queryParams.append("location", finalQuery);
    
    if (selectedBhk.length > 0) queryParams.append("bhk", selectedBhk.join(","));
    if (selectedType.length > 0) queryParams.append("propertyType", selectedType.join(","));
    if (selectedBudget.length > 0) queryParams.append("budget", selectedBudget.join(","));
    if (selectedAge.length > 0) queryParams.append("ageRange", selectedAge.join(","));
    if (selectedSaleType.length > 0) queryParams.append("saleType", selectedSaleType.join(","));
    if (selectedPostedBy.length > 0) queryParams.append("postedBy", selectedPostedBy.join(","));
    if (selectedFurnished.length > 0) queryParams.append("furnished", selectedFurnished.join(","));
    
    router.push(`/properties?${queryParams.toString()}`);
  };

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
        <div className="absolute inset-0 bg-black/65 backdrop-blur-[1px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-bg-primary/20 to-black/20" />
      </div>

      <div className="container-road relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center">
        {/* Hero Text */}
        <div className="text-center mb-6 md:mb-10 space-y-3 md:space-y-4">
          <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white drop-shadow-lg leading-tight">
            Find Your <span className="text-amber-primary">Dream Property</span>{" "}
            in Vijayawada & Guntur
          </h1>
          <p className="text-base md:text-xl text-zinc-300 max-w-2xl mx-auto drop-shadow-md font-medium px-2">
            Discover verified homes, luxury villas, and premium commercial spaces
            in Vijayawada, Guntur, Amaravati, and beyond.
          </p>
        </div>

        {/* Backdrop overlay when expanded */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsExpanded(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm cursor-pointer"
            />
          )}
        </AnimatePresence>

        {/* Search Widget Container */}
        <div className={cn(
          "w-full transition-all duration-500",
          isExpanded ? "relative z-50 mt-4" : "relative z-10 mt-8"
        )}>
          <motion.div 
            layout
            className={cn(
              "w-full backdrop-blur-xl border rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-elevated transition-colors duration-300",
              isExpanded 
                ? "bg-bg-card border-border-default/80" 
                : "bg-bg-card/40 border-border-default/50 amber-border-glow"
            )}
          >
          {/* Tabs */}
          <div className="flex items-center gap-1.5 sm:gap-2 mb-4 sm:mb-6 overflow-x-auto pb-1 scrollbar-none justify-start md:justify-center">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 whitespace-nowrap flex-shrink-0 border",
                    activeTab === tab.id
                      ? "bg-amber-primary text-bg-primary shadow-amber-glow border-amber-primary"
                      : "text-white hover:text-amber-primary bg-black/40 hover:bg-black/60 border-white/20 hover:border-amber-primary/50 backdrop-blur-sm"
                  )}
                >
                  <Icon className="h-4 w-4 sm:h-4 sm:w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Animated Search Bar */}
          <AnimatedSearchBar
            isExpanded={isExpanded}
            onExpand={() => setIsExpanded(true)}
            onSearch={(query) => {
              if (!isExpanded) {
                setIsExpanded(true);
                return;
              }
              triggerSearch(query);
            }}
          />

          {/* Expanded Filter Panel */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="pt-6 mt-4 border-t border-border-default/30">
                  
                  {/* --- CORE FILTERS --- */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 px-2">
                    {/* Property Type */}
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center">
                        <Building2 className="w-4 h-4 mr-2 text-amber-primary" /> 
                        Property Type
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { label: "Apartment", icon: Building }, 
                          { label: "Villa", icon: Home }, 
                          { label: "Plot", icon: Trees }, 
                          { label: "Commercial", icon: Store }
                        ].map((type) => (
                          <button
                            key={type.label}
                            type="button"
                            onClick={() => {
                              setSelectedType(prev => 
                                prev.includes(type.label) ? prev.filter(t => t !== type.label) : [...prev, type.label]
                              );
                            }}
                            className={cn(
                              "px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all border flex items-center",
                              selectedType.includes(type.label)
                                ? "bg-amber-primary/10 border-amber-primary text-amber-primary shadow-sm"
                                : "bg-bg-primary/50 border-border-default/60 text-text-secondary hover:border-amber-primary/40 hover:bg-bg-primary"
                            )}
                          >
                            <type.icon className={cn("w-3.5 h-3.5 mr-2", selectedType.includes(type.label) ? "text-amber-primary" : "text-text-tertiary")} />
                            {type.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* BHK Configuration */}
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center">
                        <Bed className="w-4 h-4 mr-2 text-amber-primary" /> 
                        Bedrooms
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {["1 BHK", "2 BHK", "3 BHK", "4+ BHK"].map((bhkVal) => (
                          <button
                            key={bhkVal}
                            type="button"
                            onClick={() => {
                              setSelectedBhk(prev => 
                                prev.includes(bhkVal) ? prev.filter(b => b !== bhkVal) : [...prev, bhkVal]
                              );
                            }}
                            className={cn(
                              "px-5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all border",
                              selectedBhk.includes(bhkVal)
                                ? "bg-amber-primary/10 border-amber-primary text-amber-primary shadow-sm"
                                : "bg-bg-primary/50 border-border-default/60 text-text-secondary hover:border-amber-primary/40 hover:bg-bg-primary"
                            )}
                          >
                            {bhkVal}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Budget */}
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center">
                        <DollarSign className="w-4 h-4 mr-2 text-amber-primary" /> 
                        Budget
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {["Under ₹50L", "₹50L - ₹1Cr", "₹1Cr - ₹3Cr", "₹3Cr+"].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => {
                              setSelectedBudget(prev => 
                                prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]
                              );
                            }}
                            className={cn(
                              "px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all border",
                              selectedBudget.includes(val)
                                ? "bg-amber-primary/10 border-amber-primary text-amber-primary shadow-sm"
                                : "bg-bg-primary/50 border-border-default/60 text-text-secondary hover:border-amber-primary/40 hover:bg-bg-primary"
                            )}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Divider */}
                  <div className="w-full h-px bg-border-default/30 mb-8"></div>

                  {/* --- ADVANCED FILTERS --- */}
                  <div className="px-2 mb-8">
                    <h3 className="text-sm font-semibold text-text-primary mb-5 flex items-center">
                      <SlidersHorizontal className="w-4 h-4 mr-2 text-amber-primary" /> 
                      Advanced Options
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      
                      {/* Age of Property */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-medium text-text-tertiary uppercase tracking-wider">Age of Property</h4>
                        <div className="flex flex-col gap-2">
                          {["0-10 years", "10-30 years", "30+ years"].map((val) => (
                            <label key={val} className="flex items-center space-x-3 cursor-pointer group">
                              <div className={cn(
                                "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                                selectedAge.includes(val) ? "bg-amber-primary border-amber-primary text-bg-primary" : "border-text-tertiary group-hover:border-amber-primary/50"
                              )}>
                                {selectedAge.includes(val) && <Check className="w-3 h-3" />}
                              </div>
                              <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors" onClick={() => {
                                setSelectedAge(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val])
                              }}>
                                {val}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Sale Type */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-medium text-text-tertiary uppercase tracking-wider flex items-center"><Layers className="w-3 h-3 mr-1.5" /> Sale Type</h4>
                        <div className="flex flex-col gap-2">
                          {["New property", "Resale"].map((val) => (
                            <label key={val} className="flex items-center space-x-3 cursor-pointer group">
                              <div className={cn(
                                "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                                selectedSaleType.includes(val) ? "bg-amber-primary border-amber-primary text-bg-primary" : "border-text-tertiary group-hover:border-amber-primary/50"
                              )}>
                                {selectedSaleType.includes(val) && <Check className="w-3 h-3" />}
                              </div>
                              <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors" onClick={() => {
                                setSelectedSaleType(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val])
                              }}>
                                {val}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Posted By */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-medium text-text-tertiary uppercase tracking-wider flex items-center"><Briefcase className="w-3 h-3 mr-1.5" /> Posted By</h4>
                        <div className="flex flex-col gap-2">
                          {["Owner", "Agent", "Developer"].map((val) => (
                            <label key={val} className="flex items-center space-x-3 cursor-pointer group">
                              <div className={cn(
                                "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                                selectedPostedBy.includes(val) ? "bg-amber-primary border-amber-primary text-bg-primary" : "border-text-tertiary group-hover:border-amber-primary/50"
                              )}>
                                {selectedPostedBy.includes(val) && <Check className="w-3 h-3" />}
                              </div>
                              <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors" onClick={() => {
                                setSelectedPostedBy(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val])
                              }}>
                                {val}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Furnished */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-medium text-text-tertiary uppercase tracking-wider flex items-center"><Sofa className="w-3 h-3 mr-1.5" /> Furnished Status</h4>
                        <div className="flex flex-col gap-2">
                          {["Furnished", "Semi furnished", "Unfurnished"].map((val) => (
                            <label key={val} className="flex items-center space-x-3 cursor-pointer group">
                              <div className={cn(
                                "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                                selectedFurnished.includes(val) ? "bg-amber-primary border-amber-primary text-bg-primary" : "border-text-tertiary group-hover:border-amber-primary/50"
                              )}>
                                {selectedFurnished.includes(val) && <Check className="w-3 h-3" />}
                              </div>
                              <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors" onClick={() => {
                                setSelectedFurnished(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val])
                              }}>
                                {val}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>

                    </div>
                  </div>
                  
                  {/* ACTION FOOTER */}
                  <div className="flex flex-col-reverse sm:flex-row justify-between items-center pt-5 border-t border-border-default/30 px-2 gap-4">
                    <button 
                      onClick={() => {
                        setSelectedBhk([]);
                        setSelectedType([]);
                        setSelectedBudget([]);
                        setSelectedAge([]);
                        setSelectedSaleType([]);
                        setSelectedPostedBy([]);
                        setSelectedFurnished([]);
                      }}
                      className="text-sm font-medium text-text-tertiary hover:text-text-primary transition-colors py-2 px-4 rounded-lg hover:bg-bg-primary"
                    >
                      Clear all filters
                    </button>
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                      <button 
                        onClick={() => setIsExpanded(false)}
                        className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors py-2 px-4 rounded-lg hover:bg-bg-primary hidden sm:block"
                      >
                        Cancel
                      </button>
                      <Button 
                        onClick={() => triggerSearch()}
                        className="w-full sm:w-auto bg-amber-primary text-bg-primary hover:bg-amber-primary/90 font-semibold px-8 h-11 rounded-xl shadow-amber-glow"
                      >
                        Search Properties
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick Links (hide when expanded) */}
          <AnimatePresence>
            {!isExpanded && (
              <motion.div 
                initial={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 sm:mt-6 flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-6 gap-y-2 text-xs sm:text-sm px-1 sm:px-2 overflow-hidden"
              >
                <span className="font-medium text-white/80">Trending:</span>
                <div className="flex flex-wrap gap-x-3 sm:gap-x-4 gap-y-2">
                  <button 
                    type="button"
                    onClick={() => setSearchQuery("Benz Circle, Vijayawada")} 
                    className="text-white hover:text-amber-primary transition-colors font-medium hover:underline underline-offset-4"
                  >
                    Benz Circle
                  </button>
                  <button 
                    type="button"
                    onClick={() => setSearchQuery("Brodipet, Guntur")} 
                    className="text-white hover:text-amber-primary transition-colors font-medium hover:underline underline-offset-4"
                  >
                    Brodipet
                  </button>
                  <button 
                    type="button"
                    onClick={() => setSearchQuery("Mangalagiri")} 
                    className="text-white hover:text-amber-primary transition-colors font-medium hover:underline underline-offset-4"
                  >
                    Mangalagiri
                  </button>
                  <button 
                    type="button"
                    onClick={() => setSearchQuery("Amaravati")} 
                    className="text-white hover:text-amber-primary transition-colors font-medium hover:underline underline-offset-4"
                  >
                    Amaravati
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          </motion.div>
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
              <span className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold text-text-primary drop-shadow-sm">
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
