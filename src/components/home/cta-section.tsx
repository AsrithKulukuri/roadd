"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CTASection() {
  return (
    <section className="py-20 sm:py-28 relative overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-bg-card via-bg-primary to-amber-primary/10" />
      
      <div className="container-road relative z-10">
        <div className="bg-bg-card/70 backdrop-blur-xl border border-border-default/70 rounded-3xl p-8 md:p-14 lg:p-16 text-center max-w-5xl mx-auto flex flex-col items-center justify-center shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-amber-primary/10 flex items-center justify-center mb-6 border border-amber-500/20">
            <Sparkles className="h-7 w-7 text-amber-primary" />
          </div>
          
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-black text-text-primary mb-5 max-w-2xl tracking-tight">
            Ready to Find Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-500">Dream Property?</span>
          </h2>
          
          <p className="text-base sm:text-lg md:text-xl text-text-secondary mb-9 max-w-2xl font-medium leading-relaxed">
            Explore real projects, verified listings, and on-ground updates — all in one place.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center max-w-md mx-auto">
            <Button variant="amber" size="xl" className="w-full sm:w-auto" asChild>
              <Link href="/search">
                Explore Properties <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button variant="outline" size="xl" className="w-full sm:w-auto" asChild>
              <Link href="/projects?status=new-launch">
                New Launches
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
