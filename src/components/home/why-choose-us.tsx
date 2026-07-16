"use client";

import { Shield, Home, Search, Zap, Clock, ThumbsUp } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Verified Listings Only",
    description: "Every property goes through a rigorous 14-point physical and legal verification process before going live.",
  },
  {
    icon: Search,
    title: "AI-Powered Search",
    description: "Our intelligent matching engine understands your needs and recommends properties that perfectly fit your lifestyle.",
  },
  {
    icon: Zap,
    title: "Zero Brokerage Options",
    description: "Connect directly with verified owners to save on brokerage fees, or choose our premium agent service for hassle-free buying.",
  },
  {
    icon: Home,
    title: "RERA Compliant",
    description: "We strictly enforce RERA registration for all under-construction projects to ensure your investment is secure.",
  },
  {
    icon: Clock,
    title: "Virtual Tours",
    description: "Save time with high-quality 3D virtual tours and video walkthroughs before visiting the property in person.",
  },
  {
    icon: ThumbsUp,
    title: "End-to-End Assistance",
    description: "From property search to home loans and legal registration, our dedicated relationship managers assist you at every step.",
  },
];

export function WhyChooseUs() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 -mr-40 -mt-40 w-[600px] h-[600px] bg-amber-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-40 -mb-40 w-[600px] h-[600px] bg-amber-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="container-road relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-text-primary">
            Why Choose ROAD FACING?
          </h2>
          <p className="text-text-secondary text-lg">
            We are redefining the real estate experience in India with transparency,
            technology, and premium service.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="group p-8 rounded-3xl bg-bg-card border border-border-default hover:border-amber-primary/50 transition-all duration-300 hover:shadow-amber-subtle hover:-translate-y-1"
              >
                <div className="w-14 h-14 rounded-2xl bg-amber-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Icon className="h-7 w-7 text-amber-primary" />
                </div>
                <h3 className="font-heading text-xl font-bold text-text-primary mb-3">
                  {feature.title}
                </h3>
                <p className="text-text-secondary leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
