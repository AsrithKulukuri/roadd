import { Shield, Eye, Video, Calendar, Handshake, CheckCircle2, AlertCircle, Sparkles, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen pt-24 pb-16 bg-white dark:bg-bg-primary">
      {/* Hero Section */}
      <section className="py-16 md:py-24 relative overflow-hidden bg-white dark:bg-bg-primary">
        <div className="container-road">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-black uppercase tracking-widest">
              <Sparkles className="w-4 h-4" /> About RoadFacing
            </div>
            
            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-black text-slate-950 dark:text-white tracking-tight">
              Real Projects. <br />
              <span className="text-amber-500 dark:text-amber-400">
                Real People. Real Updates.
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-slate-700 dark:text-slate-300 font-medium leading-relaxed max-w-3xl mx-auto">
              RoadFacing brings you closer to projects through real, on-ground videos and regular updates. We show projects as they are today, so you can see the location, surroundings, development, and progress for yourself.
            </p>

            <div className="pt-2 text-base font-bold text-amber-600 dark:text-amber-300">
              Our purpose is simple — to provide clear information and let buyers make their own decisions.
            </div>
          </div>
        </div>
      </section>

      {/* Our Approach & What We Do */}
      <section className="py-16 bg-slate-50 dark:bg-slate-900/40 border-y border-slate-200 dark:border-border-default/40">
        <div className="container-road">
          <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-bold uppercase tracking-wider">
                What We Do
              </div>
              <h2 className="font-heading text-3xl md:text-4xl font-black text-slate-950 dark:text-white">
                Real Projects. Real Progress. Real Information.
              </h2>
              <p className="text-slate-700 dark:text-slate-300 text-base leading-relaxed font-medium">
                At <strong className="text-slate-950 dark:text-white font-extrabold">RoadFacing</strong>, we bring projects closer to you through real, on-ground videos and regular updates. We showcase projects as they actually are — their progress, location, development, and current status.
              </p>
              <p className="text-slate-700 dark:text-slate-300 text-base leading-relaxed font-medium">
                Our goal is simple: to provide clear, honest, and reliable project information so that visitors can understand what is happening on the ground and make informed decisions.
              </p>
              <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-slate-900 dark:text-amber-300 font-semibold text-sm leading-relaxed">
                &ldquo;No exaggerated promises. No unnecessary hype. Just real projects, real visuals, and regular updates.&rdquo;
              </div>
            </div>

            <div className="space-y-6 bg-white dark:bg-bg-card p-8 md:p-10 rounded-3xl border border-slate-200 dark:border-border-default shadow-xl">
              <h3 className="font-heading text-2xl font-black text-slate-950 dark:text-white">Our Approach</h3>
              <p className="text-lg font-bold text-amber-600 dark:text-amber-400 leading-snug">
                &ldquo;We don&apos;t just talk about projects. We show them.&rdquo;
              </p>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                What you see is what we show. Real places. Real projects. Real updates. We believe that seeing is understanding, which is why our cameras go to the actual ground so you never have to rely solely on brochures.
              </p>
              <div className="pt-2 border-t border-slate-200 dark:border-border-default flex items-center gap-3 text-sm font-bold text-slate-950 dark:text-white">
                <CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0" />
                <span>&ldquo;We show you what is actually happening on the ground.&rdquo;</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why RoadFacing? 5 Pillars */}
      <section className="py-24 bg-white dark:bg-bg-primary">
        <div className="container-road">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="font-heading text-3xl md:text-4xl font-black text-slate-950 dark:text-white mb-4">
              Why RoadFacing?
            </h2>
            <p className="text-slate-700 dark:text-slate-300 text-base md:text-lg font-medium">
              RoadFacing brings you real, on-ground videos and regular project updates, helping you understand projects through what you can actually see — not just what you are told.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {[
              {
                icon: MapPin,
                title: "On-Ground Information",
                desc: "We visit and showcase projects in real locations with physical ground coverage.",
              },
              {
                icon: Video,
                title: "Real Video Updates",
                desc: "See the actual project instead of relying only on marketing advertisements.",
              },
              {
                icon: Calendar,
                title: "Regular Updates",
                desc: "Projects are reviewed and updated month by month to track real progress.",
              },
              {
                icon: Eye,
                title: "Transparency",
                desc: "We aim to present information clearly, accurately, and responsibly.",
              },
              {
                icon: Handshake,
                title: "Trust First",
                desc: "Our focus is on providing useful information, not making unrealistic promises.",
              },
            ].map((value, i) => {
              const Icon = value.icon;
              return (
                <div key={i} className="p-7 rounded-3xl bg-slate-50/80 dark:bg-bg-card border border-slate-200 dark:border-border-default/70 hover:border-amber-500/40 transition-all text-center group flex flex-col items-center justify-between">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                    <Icon className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h4 className="font-heading text-lg font-bold text-slate-950 dark:text-white mb-2.5">{value.title}</h4>
                    <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm leading-relaxed">{value.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Our Promise Section */}
      <section className="py-16 bg-slate-950 text-white border-y border-slate-800">
        <div className="container-road">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
              Our Promise
            </div>
            
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-white">
              We show. We don&apos;t exaggerate.
            </h2>
            
            <p className="text-slate-300 text-base md:text-lg leading-relaxed">
              We aim to present projects through actual site visits, real visuals, and straightforward information. Where information comes from an owner, agent, developer, or public record, we make that clear.
            </p>
            
            <p className="text-amber-400 font-bold text-lg pt-2">
              We believe buyers should have the opportunity to see, compare, verify, and decide.
            </p>
          </div>
        </div>
      </section>

      {/* Official Disclaimer Section */}
      <section className="py-16 bg-white dark:bg-bg-primary">
        <div className="container-road">
          <div className="bg-slate-50 dark:bg-bg-card border border-amber-500/30 rounded-3xl p-8 md:p-12 shadow-xl max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-4 text-amber-600 dark:text-amber-400 font-bold text-base uppercase tracking-wider">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>Important Information & Disclaimer</span>
            </div>
            <p className="text-slate-700 dark:text-text-secondary text-sm md:text-base leading-relaxed">
              RoadFacing is an information and project-discovery platform. The information and visuals presented on our website and channels are intended to help users understand projects and their current on-ground status. Buyers should independently verify title, approvals, RERA details, specifications, pricing, legal matters, and other relevant information with the concerned authorities, owner, developer, or qualified professionals before making any decision or financial commitment.
            </p>
          </div>
        </div>
      </section>

      {/* Join Us CTA */}
      <section className="py-12 bg-white dark:bg-bg-primary">
        <div className="container-road">
          <div className="bg-slate-950 text-white rounded-3xl p-10 md:p-14 text-center border border-slate-800 shadow-2xl">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-white mb-4">Ready to Find Your Dream Property?</h2>
            <p className="text-slate-300 text-base md:text-lg max-w-2xl mx-auto mb-8">
              Explore real projects, verified listings, and on-ground updates — all in one place.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button variant="amber" size="xl" asChild>
                <Link href="/search">Explore Properties</Link>
              </Button>
              <Button variant="outline" size="xl" asChild className="text-white border-white/20 hover:bg-white/10">
                <Link href="/projects?status=new-launch">New Launches</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
