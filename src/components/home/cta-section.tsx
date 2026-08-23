"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CTASection() {
  return (
    <section className="py-20 sm:py-28 relative overflow-hidden bg-white dark:bg-bg-primary">
      {/* Background Subtle Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-500/5 to-transparent pointer-events-none" />
      
      <div className="container-road relative z-10">
        <div className="bg-slate-950 text-white border border-slate-800 rounded-3xl p-8 md:p-14 lg:p-16 text-center max-w-5xl mx-auto flex flex-col items-center justify-center shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 flex items-center justify-center mb-6 border border-amber-500/30">
            <Sparkles className="h-7 w-7 text-amber-400" />
          </div>
          
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-black text-white mb-5 max-w-2xl tracking-tight">
            Ready to Find Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-500">Dream Property?</span>
          </h2>
          
          <p className="text-base sm:text-lg md:text-xl text-slate-300 mb-9 max-w-2xl font-medium leading-relaxed">
            Explore real projects, verified listings, and on-ground updates — all in one place.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center max-w-md mx-auto">
            <Button variant="amber" size="xl" className="w-full sm:w-auto" asChild>
              <Link href="/search">
                Explore Properties <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button variant="outline" size="xl" className="w-full sm:w-auto text-white border-white/20 hover:bg-white/10" asChild>
              <Link href="/search?type=projects">
                New Launches
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
