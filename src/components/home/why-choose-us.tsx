"use client";

import { Shield, Search, Zap, CheckCircle2, Video, Calendar, Sparkles, Handshake, Eye } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Verified Listings",
    description: "We review listing information and clearly show what has been checked, so you know what you're looking at.",
    badge: "100% Verified",
  },
  {
    icon: Video,
    title: "Real Video Updates",
    description: "See actual properties and projects through on-ground videos before you make the trip, instead of relying only on advertisements.",
    badge: "On-Ground Visuals",
  },
  {
    icon: Calendar,
    title: "Regular Updates",
    description: "Projects are reviewed and updated month by month, tracking actual construction progress and development milestones.",
    badge: "Month-by-Month",
  },
  {
    icon: Zap,
    title: "Zero Brokerage Options",
    description: "Explore properties available directly from owners or through zero-brokerage arrangements, wherever available.",
    badge: "Direct Contact",
  },
  {
    icon: Eye,
    title: "RERA Information & Transparency",
    description: "Find relevant RERA registration details and regulatory information where applicable, with verification encouraged through official authorities.",
    badge: "Transparent",
  },
  {
    icon: Handshake,
    title: "End-to-End Assistance",
    description: "From discovering a property to connecting with the right owner, agent or developer, we're here to make the journey simpler.",
    badge: "Trust First",
  },
];

export function WhyChooseUs() {
  return (
    <section className="py-20 sm:py-28 relative overflow-hidden bg-white dark:bg-slate-950 border-t border-slate-200/80 dark:border-slate-800/80">
      {/* Subtle Glows */}
      <div className="absolute top-0 right-1/4 -mt-32 w-96 h-96 bg-amber-500/5 dark:bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 -mb-32 w-96 h-96 bg-amber-500/5 dark:bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="container-road relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-black uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" /> What We Do
          </div>
          
          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-black text-slate-950 dark:text-white tracking-tight">
            Real Projects. Real Progress. <br />
            <span className="text-amber-500 dark:text-amber-400">
              Real Information.
            </span>
          </h2>
          
          <p className="text-slate-700 dark:text-slate-300 text-base sm:text-lg leading-relaxed pt-2 font-medium">
            At <strong className="text-slate-950 dark:text-white font-extrabold">RoadFacing</strong>, we bring projects closer to you through real, on-ground videos and regular updates. We showcase projects as they actually are — their progress, location, development, and current status.
          </p>
          
          <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base leading-relaxed italic font-medium">
            &ldquo;No exaggerated promises. No unnecessary hype. Just real projects, real visuals, and regular updates.&rdquo;
          </p>
        </div>

        {/* 6 Feature Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-14">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="group p-7 sm:p-8 rounded-3xl bg-slate-50/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 hover:border-amber-500/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 relative flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-13 h-13 rounded-2xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Icon className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <span className="text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-white dark:bg-slate-800 text-slate-800 dark:text-amber-300 border border-slate-200 dark:border-amber-500/20 shadow-2xs">
                      {feature.badge}
                    </span>
                  </div>
                  <h3 className="font-heading text-lg sm:text-xl font-extrabold text-slate-950 dark:text-white mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed font-normal">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Banner Box */}
        <div className="max-w-4xl mx-auto rounded-2xl bg-slate-950 text-white border border-slate-800 p-6 sm:p-8 text-center shadow-xl">
          <p className="text-base sm:text-lg font-bold text-slate-100 leading-relaxed">
            &ldquo;RoadFacing brings you real, on-ground videos and regular project updates, helping you understand projects through what you can actually see — not just what you are told.&rdquo;
          </p>
          <div className="mt-3 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-amber-400">
            <CheckCircle2 className="w-4 h-4" /> We Show. We Don&apos;t Exaggerate.
          </div>
        </div>
      </div>
    </section>
  );
}
