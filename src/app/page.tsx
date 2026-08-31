import { Suspense } from "react";
import { HeroSection } from "@/components/home/hero-section";
import { HomeCategories } from "@/components/home/home-categories";
import { WhyChooseUs } from "@/components/home/why-choose-us";

import { CTASection } from "@/components/home/cta-section";
import { MatchmakerQuiz } from "@/components/home/matchmaker-quiz";

export default function HomePage() {
  return (
    <div className="flex flex-col w-full min-h-screen">
      <HeroSection />

      {/* Property Categories (Recommended, Featured, Budget) */}
      <Suspense fallback={
        <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="h-8 w-60 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {[...Array(4)].map((_, i) => (
              <div key={`skel-hp-${i}`} className="h-[280px] rounded-3xl bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 space-y-4 animate-pulse">
                <div className="w-full h-40 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-3/4" />
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-1/2" />
              </div>
            ))}
          </div>
        </div>
      }>
        <HomeCategories />
      </Suspense>

      {/* Interactive AI Quiz */}
      <MatchmakerQuiz />

      {/* Why Choose Us */}
      <WhyChooseUs />

      {/* CTA Section */}
      <CTASection />
    </div>
  );
}
