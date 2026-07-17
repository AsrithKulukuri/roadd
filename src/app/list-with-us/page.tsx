"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  LayoutDashboard, 
  Megaphone, 
  Target, 
  Users, 
  Building2,
  CheckCircle2,
  ArrowRight
} from "lucide-react";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Logo } from "@/components/shared/logo";

export default function ListWithUsPage() {
  const WHATSAPP_URL = "https://wa.me/918977311418?text=I%20want%20to%20list%20my%20properties%20as%20a%20builder/owner";

  const features = [
    {
      icon: <LayoutDashboard className="w-8 h-8 text-amber-primary" />,
      title: "Exclusive Developer Dashboard",
      description: "Get a dedicated, private dashboard to track views, clicks, and engagement in real-time. Know exactly how your properties are performing."
    },
    {
      icon: <Target className="w-8 h-8 text-amber-primary" />,
      title: "Homepage Spotlight",
      description: "Get a separate, dedicated section about your project directly on our homepage. Maximize visibility for your brand and ongoing developments."
    },
    {
      icon: <Users className="w-8 h-8 text-amber-primary" />,
      title: "Direct Verified Leads",
      description: "Connect instantly with highly motivated, verified buyers and renters looking for properties exactly like yours."
    },
    {
      icon: <BarChart3 className="w-8 h-8 text-amber-primary" />,
      title: "Actionable Analytics",
      description: "Track the user journey from impressions to enquiries. Use data to optimize your listings and close deals faster."
    }
  ];

  return (
    <div className="min-h-screen bg-bg-primary selection:bg-amber-primary/30">


      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] max-w-5xl opacity-40 dark:opacity-20 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-primary/30 rounded-full blur-[120px]" />
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-orange-500/20 rounded-full blur-[120px]" />
        </div>

        <div className="container-road relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-primary/10 border border-amber-primary/20 text-amber-primary text-sm font-medium mb-6">
              <Megaphone className="w-4 h-4" />
              <span>For Builders, Developers & Owners</span>
            </div>
            
            <h1 className="font-heading text-4xl md:text-6xl lg:text-7xl font-bold text-text-primary tracking-tight leading-tight mb-6">
              List Your Properties. <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-primary to-orange-500">
                Maximize Your Reach.
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
              Join ROAD FACING's premium network. Showcase your projects, track every interaction on a dedicated dashboard, and dominate the homepage.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="h-14 px-8 text-base rounded-full shadow-amber-glow animate-pulse-glow w-full sm:w-auto" asChild>
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                  Connect With Us Now <ArrowRight className="w-5 h-5 ml-2" />
                </a>
              </Button>
              <Button size="lg" variant="outline" className="h-14 px-8 text-base rounded-full w-full sm:w-auto" asChild>
                <Link href="/contact">Schedule a Call</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-bg-card border-y border-border-default relative">
        <div className="container-road">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-text-primary mb-4">Everything You Need to Sell Faster</h2>
            <p className="text-text-secondary text-lg">We provide you with the tools and the real estate to put your properties in front of the right buyers.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="group p-8 rounded-3xl bg-bg-primary border border-border-default hover:border-amber-primary/50 transition-all hover:shadow-elevated"
              >
                <div className="w-16 h-16 rounded-2xl bg-amber-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold text-text-primary mb-3">{feature.title}</h3>
                <p className="text-text-secondary leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-24">
        <div className="container-road">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1 space-y-8">
              <h2 className="font-heading text-3xl md:text-4xl font-bold text-text-primary">How to get started</h2>
              
              <div className="space-y-6">
                {[
                  { title: "Connect With Us", desc: "Reach out via WhatsApp or schedule a call with our onboarding team." },
                  { title: "Setup Your Dashboard", desc: "We'll create your exclusive developer profile and analytics dashboard." },
                  { title: "Go Live & Get Leads", desc: "Your properties go live, get featured on the homepage, and leads start flowing in." }
                ].map((step, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-amber-primary/10 border border-amber-primary/20 flex items-center justify-center text-amber-primary font-bold text-xl">
                      {i + 1}
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-text-primary mb-1">{step.title}</h4>
                      <p className="text-text-secondary">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-6">
                <Button size="lg" className="h-14 px-8 text-base rounded-full shadow-amber-glow" asChild>
                  <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                    Start Onboarding
                  </a>
                </Button>
              </div>
            </div>
            
            <div className="flex-1 w-full max-w-lg relative">
              <div className="aspect-[4/5] rounded-[2.5rem] bg-gradient-to-br from-bg-card to-bg-primary border border-border-default shadow-2xl overflow-hidden relative">
                {/* Abstract mockup representation */}
                <div className="absolute inset-0 bg-amber-primary/5 pattern-dots" />
                <div className="absolute inset-x-8 top-8 bottom-0 rounded-t-3xl bg-bg-card border-x border-t border-border-default shadow-xl flex flex-col overflow-hidden">
                  <div className="h-12 border-b border-border-default flex items-center px-6 gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  </div>
                  <div className="p-6 flex-1 space-y-6">
                    <div className="flex gap-4 items-center mb-8">
                      <div className="w-16 h-16 rounded-full bg-amber-primary/20 flex items-center justify-center">
                        <Building2 className="w-8 h-8 text-amber-primary" />
                      </div>
                      <div>
                        <div className="h-5 w-32 bg-border-default rounded mb-2" />
                        <div className="h-4 w-24 bg-border-default/50 rounded" />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl border border-border-default bg-bg-primary">
                        <div className="h-4 w-16 bg-border-default/50 rounded mb-3" />
                        <div className="h-8 w-24 bg-amber-primary/20 rounded" />
                      </div>
                      <div className="p-4 rounded-xl border border-border-default bg-bg-primary">
                        <div className="h-4 w-16 bg-border-default/50 rounded mb-3" />
                        <div className="h-8 w-24 bg-amber-primary/20 rounded" />
                      </div>
                    </div>
                    
                    <div className="h-32 w-full rounded-xl border border-border-default bg-bg-primary p-4 flex items-end gap-2">
                      <div className="w-full bg-amber-primary/40 rounded-t h-[40%]" />
                      <div className="w-full bg-amber-primary/60 rounded-t h-[70%]" />
                      <div className="w-full bg-amber-primary rounded-t h-[100%]" />
                      <div className="w-full bg-amber-primary/80 rounded-t h-[85%]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Footer CTA */}
      <section className="py-20 border-t border-border-default bg-amber-primary text-bg-primary text-center">
        <div className="container-road max-w-3xl">
          <h2 className="font-heading text-3xl md:text-5xl font-bold mb-6">Ready to scale your property sales?</h2>
          <p className="text-lg opacity-90 mb-10">Join the top developers leveraging our platform for high-quality leads.</p>
          <Button size="lg" variant="outline" className="h-14 px-10 text-lg rounded-full bg-transparent border-bg-primary text-bg-primary hover:bg-bg-primary hover:text-amber-primary transition-colors" asChild>
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
              Get in Touch Today
            </a>
          </Button>
        </div>
      </section>
    </div>
  );
}
