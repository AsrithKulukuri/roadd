"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Search, TrendingDown, Building2, Trees, Store, Shield, Sparkles, Building, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// Only keep Buy and Sell as requested
const tabs = [
  { id: "buy", label: "Buy" },
  { id: "sell", label: "Sell" },
];

const CAROUSEL_SUGGESTIONS = [
  "Benz Circle, 3BHK flat, Vijayawada",
  "Gorantla, 2BHK under ₹50L, Guntur",
  "Poranki, Luxury Villa, Vijayawada",
  "Amaravati Road, Residential Plot, Guntur",
  "Kanuru, Ready to move 3BHK, Vijayawada",
  "Tadepalli, Capital view flat",
];

export function HeroSection() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("buy");
  const [searchQuery, setSearchQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Rotating text carousel interval
  useEffect(() => {
    const interval = setInterval(() => {
      setSuggestionIndex((prev) => (prev + 1) % CAROUSEL_SUGGESTIONS.length);
    }, 3200);
    return () => clearInterval(interval);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === "sell") {
      router.push("/list-with-us");
      return;
    }
    if (searchQuery.trim()) {
      router.push(
        `/properties?type=${activeTab}&location=${encodeURIComponent(searchQuery)}`
      );
    } else {
      router.push(`/properties?type=${activeTab}`);
    }
  };

  const currentSuggestion = CAROUSEL_SUGGESTIONS[suggestionIndex];

  const browseCategories = [
    {
      id: "new-listings",
      title: "New listings",
      subtitle: "Explore newly added homes",
      badge: "12,450",
      image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80",
      href: "/properties?type=buy&saleType=new",
    },
    {
      id: "price-reduced",
      title: "Price reduced",
      subtitle: "Best value properties",
      badge: "Hot Deals",
      badgeClass: "bg-emerald-500 text-slate-950 font-extrabold",
      image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=80",
      href: "/properties?type=buy",
    },
    {
      id: "ready-to-move",
      title: "Ready to move",
      subtitle: "Move in immediately",
      badge: "Verified",
      image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=80",
      href: "/properties?type=buy&availability=ready",
    },
    {
      id: "villas-estates",
      title: "Villas & Estates",
      subtitle: "Independent luxury houses",
      image: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=600&q=80",
      href: "/properties?type=buy&propertyType=villa",
    },
    {
      id: "plots-lands",
      title: "Residential Plots",
      subtitle: "Capital region plots & land",
      image: "https://images.unsplash.com/photo-1628624747186-a941c476b7ef?w=600&q=80",
      href: "/properties?type=buy&propertyType=residential-land",
    },
    {
      id: "commercial-spaces",
      title: "Commercial Spaces",
      subtitle: "Shops, offices & complexes",
      image: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80",
      href: "/properties?type=buy&propertyType=commercial-spaces",
    },
    {
      id: "gated-communities",
      title: "Gated Communities",
      subtitle: "24/7 security townships",
      image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&q=80",
      href: "/properties?type=buy&propertyType=apartment",
    },
    {
      id: "luxury-penthouses",
      title: "Luxury Penthouses",
      subtitle: "Skyline views & amenities",
      image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=80",
      href: "/properties?type=buy",
    },
  ];

  return (
    <section className="relative w-full overflow-hidden bg-slate-900 text-white pt-24 sm:pt-28 pb-12 md:pb-16">
      {/* Background Image with Dark Vignette Gradient */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-transform duration-10000 scale-105"
        style={{
          backgroundImage:
            'url("https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920&q=80")',
        }}
      >
        <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-[1px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-black/30" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 flex flex-col items-center text-center">
        {/* Main Headline matching Realtor.com exact structure */}
        <div className="space-y-2 mb-6 sm:mb-8 max-w-3xl">
          <h1 className="font-heading text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white drop-shadow-md leading-tight">
            #1 real estate site <br className="hidden sm:inline" />
            <span className="text-amber-400 font-extrabold uppercase tracking-wide">
              ROAD FACING
            </span>{" "}
            agents recommend*
          </h1>
          <p className="text-sm sm:text-base text-slate-300 font-medium max-w-xl mx-auto drop-shadow-xs">
            Search verified homes, luxury villas, and plots across Vijayawada & Guntur
          </p>
        </div>

        {/* Tab Selector: Only Buy and Sell */}
        <div className="flex items-center gap-8 sm:gap-12 mb-5 justify-center">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative py-1.5 text-base sm:text-lg font-bold transition-all cursor-pointer",
                  isActive
                    ? "text-white"
                    : "text-slate-300 hover:text-white opacity-80 hover:opacity-100"
                )}
              >
                {tab.label}
                {isActive && (
                  <motion.div
                    layoutId="realtorTabLine"
                    className="absolute bottom-0 left-0 right-0 h-1 bg-white rounded-full shadow-xs"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Search Bar Pill: Clean White Container with NO Golden Border Outline whatsoever */}
        <form
          onSubmit={handleSearchSubmit}
          className="relative w-full max-w-2xl flex items-center bg-white rounded-full p-2 sm:p-2.5 shadow-2xl border-0 outline-none ring-0 focus-within:outline-none focus-within:ring-0 focus-within:border-0"
          style={{ border: "none", outline: "none", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)" }}
        >
          {/* Text Carousel Animated Placeholder */}
          {!searchQuery && !isFocused && (
            <div
              onClick={() => inputRef.current?.focus()}
              className="absolute left-6 right-16 inset-y-0 flex items-center pointer-events-none overflow-hidden"
            >
              <AnimatePresence mode="wait">
                <motion.span
                  key={suggestionIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="text-sm sm:text-base text-slate-400 font-medium truncate select-none block"
                >
                  {currentSuggestion}
                </motion.span>
              </AnimatePresence>
            </div>
          )}

          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isFocused && !searchQuery ? "Enter city, locality, BHK, or project..." : ""}
            className="w-full bg-transparent text-sm sm:text-base text-slate-900 placeholder-slate-400 pl-4 pr-12 font-medium border-0 outline-none ring-0 focus:outline-none focus:ring-0 focus:border-0 focus-visible:outline-none focus-visible:ring-0"
            style={{ border: "none", outline: "none", boxShadow: "none" }}
          />

          {/* Search Button styled in Brand Logo Amber Color */}
          <button
            type="submit"
            className="p-3 sm:p-3.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-full transition-all shadow-md hover:scale-105 cursor-pointer flex-shrink-0"
            aria-label="Search"
          >
            <Search className="w-5 h-5 stroke-[2.5]" />
          </button>
        </form>

        {/* Expanded "Browse homes" Category Cards Section */}
        <div className="w-full mt-12 text-left space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              Browse homes
            </h2>
            <Link
              href="/properties"
              className="text-xs sm:text-sm font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 hover:underline"
            >
              View all categories <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {browseCategories.map((cat) => (
              <Link
                key={cat.id}
                href={cat.href}
                className="group relative h-40 sm:h-52 rounded-2xl overflow-hidden shadow-lg border border-white/10 block bg-slate-800 transition-all hover:shadow-2xl hover:-translate-y-1"
              >
                <Image
                  src={cat.image}
                  alt={cat.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
                
                {cat.badge && (
                  <div
                    className={cn(
                      "absolute top-3 right-3 text-xs px-2.5 py-1 rounded-full shadow-xs backdrop-blur-sm",
                      cat.badgeClass
                        ? cat.badgeClass
                        : "bg-white/90 text-slate-900 font-bold"
                    )}
                  >
                    {cat.badge}
                  </div>
                )}

                <div className="absolute bottom-3 left-3 right-3">
                  <span className="font-heading font-bold text-base sm:text-lg text-white group-hover:text-amber-400 transition-colors block leading-snug">
                    {cat.title}
                  </span>
                  <span className="text-[11px] text-slate-300 block line-clamp-1">
                    {cat.subtitle}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
