"use client";

import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { navigationLinks, siteConfig } from "@/config/site";
import {
  Mail,
  Phone,
  MapPin,
  ArrowRight,
  Shield,
} from "lucide-react";

const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
);
const InstagramIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
);
const LinkedinIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
);
const TwitterIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>
);
const YoutubeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3z"/></svg>
);

const socialLinks = [
  { icon: TwitterIcon, href: siteConfig.socials.twitter, label: "Twitter" },
  { icon: InstagramIcon, href: siteConfig.socials.instagram, label: "Instagram" },
  { icon: LinkedinIcon, href: siteConfig.socials.linkedin, label: "LinkedIn" },
  { icon: YoutubeIcon, href: siteConfig.socials.youtube, label: "YouTube" },
  { icon: FacebookIcon, href: siteConfig.socials.facebook, label: "Facebook" },
];

export function Footer() {
  return (
    <footer className="relative bg-bg-primary border-t border-border-default">
      {/* Amber accent line at top */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-primary/50 to-transparent" />

      <div className="container-road">
        {/* Main Footer Content */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-6 gap-8 sm:gap-10 py-10 sm:py-16">
          {/* Brand Column */}
          <div className="col-span-2 space-y-5">
            <Logo size="lg" />
            <p className="text-text-secondary text-sm leading-relaxed max-w-sm">
              India&apos;s most premium real estate platform. Discover verified
              properties, connect with trusted agents, and find your dream home
              with AI-powered search.
            </p>
            <div className="space-y-3">
              <a
                href={`mailto:${siteConfig.email}`}
                className="flex items-center gap-2.5 text-sm text-text-secondary hover:text-amber-primary transition-colors"
              >
                <Mail className="h-4 w-4 text-amber-primary/70" />
                {siteConfig.email}
              </a>
              <a
                href={`tel:${siteConfig.phone.replace(/\s/g, "")}`}
                className="flex items-center gap-2.5 text-sm text-text-secondary hover:text-amber-primary transition-colors"
              >
                <Phone className="h-4 w-4 text-amber-primary/70" />
                {siteConfig.phone}
              </a>
              <div className="flex items-center gap-2.5 text-sm text-text-secondary">
                <MapPin className="h-4 w-4 text-amber-primary/70 flex-shrink-0" />
                Vijayawada, Andhra Pradesh, India
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="flex items-center justify-center w-10 h-10 sm:w-9 sm:h-9 rounded-xl bg-bg-card border border-border-default text-text-tertiary hover:text-amber-primary hover:border-amber-primary/30 transition-all duration-200"
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Link Columns */}
          <div className="space-y-4">
            <h4 className="font-heading text-sm font-bold text-text-primary uppercase tracking-wider">
              Company
            </h4>
            <ul className="space-y-2.5">
              {navigationLinks.footer.company.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-text-secondary hover:text-amber-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-heading text-sm font-bold text-text-primary uppercase tracking-wider">
              For Buyers
            </h4>
            <ul className="space-y-2.5">
              {navigationLinks.footer.forBuyers.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-text-secondary hover:text-amber-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-heading text-sm font-bold text-text-primary uppercase tracking-wider">
              For Owners
            </h4>
            <ul className="space-y-2.5">
              {navigationLinks.footer.forOwners.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-text-secondary hover:text-amber-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-heading text-sm font-bold text-text-primary uppercase tracking-wider">
              Top Cities
            </h4>
            <ul className="space-y-2.5">
              {navigationLinks.footer.cities.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-text-secondary hover:text-amber-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Newsletter Strip */}
        <div className="border-t border-border-default py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h4 className="font-heading text-lg font-bold text-text-primary">
                Stay ahead in real estate
              </h4>
              <p className="text-sm text-text-secondary mt-1">
                Get property insights, market trends, and exclusive listings delivered weekly.
              </p>
            </div>
            <form
              className="flex w-full md:w-auto gap-2"
              onSubmit={(e) => e.preventDefault()}
            >
              <Input
                type="email"
                placeholder="Enter your email"
                className="w-full md:w-72"
                required
              />
              <Button variant="amber" className="flex-shrink-0 gap-2">
                Subscribe
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border-default py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-text-tertiary">
              <span>© {new Date().getFullYear()} ROAD FACING. All rights reserved.</span>
              <span className="hidden md:inline">•</span>
              <span className="hidden md:inline">Made with ❤️ in India</span>
            </div>
            <div className="flex items-center gap-4">
              {navigationLinks.footer.legal.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-xs text-text-tertiary hover:text-amber-primary transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <div className="flex items-center gap-2 text-xs text-text-tertiary">
              <Shield className="h-3.5 w-3.5 text-success" />
              <span>RERA Compliant Platform</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
