import Image from "next/image";
import { Users, Award, Shield, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen pt-24 pb-16">
      {/* Hero Section */}
      <section className="py-16 md:py-24 relative overflow-hidden">
        <div className="container-road">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-text-primary">
              Redefining <span className="text-amber-primary">Real Estate</span> in India
            </h1>
            <p className="text-lg md:text-xl text-text-secondary leading-relaxed">
              ROAD FACING (Real Owner Agent Developer) is India's most trusted and transparent
              real estate platform, bridging the gap between property seekers and verified listings.
            </p>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16 bg-bg-card border-y border-border-default/50">
        <div className="container-road">
          <div className="grid md:grid-cols-2 gap-12 lg:gap-24 items-center">
            <div className="relative aspect-square md:aspect-[4/3] rounded-3xl overflow-hidden shadow-elevated">
              <Image
                src="https://images.unsplash.com/photo-1554469384-e58fac16e23a?w=800&q=80"
                alt="ROAD FACING Team"
                fill
                className="object-cover"
              />
            </div>
            <div className="space-y-8">
              <div>
                <h3 className="font-heading text-2xl font-bold text-amber-primary mb-3">Our Mission</h3>
                <p className="text-text-secondary text-lg leading-relaxed">
                  To organize India's real estate market through technology, ensuring every property transaction is transparent, secure, and hassle-free for buyers, sellers, and agents alike.
                </p>
              </div>
              <div>
                <h3 className="font-heading text-2xl font-bold text-amber-primary mb-3">Our Vision</h3>
                <p className="text-text-secondary text-lg leading-relaxed">
                  To become the ultimate standard of trust in the Indian real estate ecosystem, empowering millions to find their dream spaces with absolute confidence.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-24">
        <div className="container-road">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-text-primary mb-4">
              Our Core Values
            </h2>
            <p className="text-text-secondary text-lg">
              The principles that guide every feature we build and every service we offer.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Shield,
                title: "Trust & Transparency",
                desc: "We verify every listing and user to ensure a safe environment.",
              },
              {
                icon: Target,
                title: "Customer First",
                desc: "Every decision we make is centered around the user's best interest.",
              },
              {
                icon: Users,
                title: "Empowering Agents",
                desc: "We provide tools for genuine professionals to grow their business.",
              },
              {
                icon: Award,
                title: "Excellence",
                desc: "We strive for perfection in design, technology, and service.",
              },
            ].map((value, i) => (
              <div key={i} className="p-8 rounded-3xl bg-bg-card border border-border-default hover:border-amber-primary/30 transition-all text-center group">
                <div className="w-16 h-16 mx-auto rounded-full bg-amber-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <value.icon className="h-8 w-8 text-amber-primary" />
                </div>
                <h4 className="font-heading text-xl font-bold text-text-primary mb-3">{value.title}</h4>
                <p className="text-text-secondary">{value.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Join Us CTA */}
      <section className="py-16">
        <div className="container-road">
          <div className="bg-gradient-to-br from-bg-card to-amber-primary/10 rounded-3xl p-10 md:p-16 text-center border border-border-default">
            <h2 className="font-heading text-3xl font-bold text-text-primary mb-4">Join the ROAD FACING Network</h2>
            <p className="text-text-secondary text-lg max-w-2xl mx-auto mb-8">
              Whether you're looking for a home, want to sell your property, or are a real estate professional, ROAD FACING is built for you.
            </p>
            <Button variant="amber" size="xl" asChild>
              <Link href="/login">Get Started Today</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
