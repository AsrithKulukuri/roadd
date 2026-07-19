"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { useContentStore } from "@/stores/content-store";
import { useEffect } from "react";

export function TrendingLocations() {
  const { trendingLocations, fetchTrendingLocations } = useContentStore();

  useEffect(() => {
    fetchTrendingLocations();
  }, [fetchTrendingLocations]);

  if (!trendingLocations || trendingLocations.length === 0) return null;

  return (
    <section className="py-20 bg-bg-card/50 border-y border-border-default/50">
      <div className="container-road">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="max-w-2xl space-y-4">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-text-primary">
              Trending Locations
            </h2>
            <p className="text-text-secondary text-lg">
              Discover the most sought-after neighborhoods across India with high ROI
              and premium lifestyle amenities.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {trendingLocations.map((location, index) => (
            <motion.div
              key={`${location.city}-${location.locality}`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Link
                href={`/properties?location=${encodeURIComponent(
                  location.locality + ", " + location.city
                )}`}
                className="group block relative overflow-hidden rounded-2xl aspect-[4/3] border border-border-default"
              >
                <Image
                  src={location.image}
                  alt={`${location.locality}, ${location.city}`}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity duration-300" />
                
                {/* Content */}
                <div className="absolute inset-0 p-6 flex flex-col justify-between">
                  <div className="flex justify-end">
                    <div className="w-10 h-10 rounded-full glass flex items-center justify-center opacity-0 -translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                      <ArrowUpRight className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-heading text-2xl font-bold text-white mb-1 drop-shadow-md">
                      {location.locality}
                    </h3>
                    <p className="text-white/90 text-sm font-medium drop-shadow-sm">
                      {location.city} • {location.properties_count} Properties
                    </p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
