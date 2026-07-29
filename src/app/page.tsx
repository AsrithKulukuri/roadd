import { Suspense } from "react";
import { HeroSection } from "@/components/home/hero-section";
import { FeaturedProperties } from "@/components/home/featured-properties";
import { FeaturedProjects } from "@/components/home/featured-projects";
import { RecommendedCarousel } from "@/components/home/recommended-carousel";
import { TrendingLocations } from "@/components/home/trending-locations";
import { WhyChooseUs } from "@/components/home/why-choose-us";
import { Testimonials } from "@/components/home/testimonials";
import { CTASection } from "@/components/home/cta-section";
import { MatchmakerQuiz } from "@/components/home/matchmaker-quiz";

export default function HomePage() {
  return (
    <div className="flex flex-col w-full min-h-screen">
      <HeroSection />
      
      {/* Interactive AI Quiz */}
      <MatchmakerQuiz />
      
      {/* Recommended Properties (Carousel) */}
      <Suspense fallback={<div className="h-[400px] flex items-center justify-center">Loading recommendations...</div>}>
        <RecommendedCarousel />
      </Suspense>

      {/* Featured Builder Projects */}
      <Suspense fallback={<div className="h-[400px] flex items-center justify-center">Loading projects...</div>}>
        <FeaturedProjects />
      </Suspense>
      
      {/* Featured Properties */}
      <Suspense fallback={<div className="h-[600px] flex items-center justify-center">Loading properties...</div>}>
        <FeaturedProperties />
      </Suspense>

      {/* Trending Locations */}
      <TrendingLocations />

      {/* Why Choose Us */}
      <WhyChooseUs />

      {/* Testimonials */}
      <Testimonials />

      {/* CTA Section */}
      <CTASection />
    </div>
  );
}
