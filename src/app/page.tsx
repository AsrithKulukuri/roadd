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
      <Suspense fallback={<div className="h-[400px] flex items-center justify-center">Loading properties...</div>}>
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
