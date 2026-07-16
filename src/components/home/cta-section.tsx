"use client";

import Link from "next/link";
import { ArrowRight, Building } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CTASection() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-bg-card via-bg-primary to-amber-primary/10" />
      
      <div className="container-road relative z-10">
        <div className="bg-bg-card/50 backdrop-blur-xl border border-border-default/50 rounded-3xl p-8 md:p-12 lg:p-16 text-center max-w-5xl mx-auto flex flex-col items-center justify-center shadow-elevated amber-border-glow">
          <div className="w-16 h-16 rounded-2xl bg-amber-primary/10 flex items-center justify-center mb-6">
            <Building className="h-8 w-8 text-amber-primary" />
          </div>
          
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-text-primary mb-6 max-w-2xl">
            Ready to Find Your <span className="text-amber-primary">Dream Property?</span>
          </h2>
          
          <p className="text-lg text-text-secondary mb-10 max-w-xl">
            Join thousands of satisfied customers who found their perfect home, office space, or investment opportunity with ROAD FACING.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center max-w-md mx-auto">
            <Button variant="amber" size="xl" className="w-full sm:w-auto" asChild>
              <Link href="/properties">
                Explore Properties <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button variant="outline" size="xl" className="w-full sm:w-auto" asChild>
              <Link href="/dashboard/listings/new">
                Post Property Free
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
