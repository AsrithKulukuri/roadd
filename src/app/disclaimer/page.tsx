import { AlertCircle, ShieldAlert, FileText, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Disclaimer & Legal Notice",
  description: "Real estate disclaimer, RERA compliance, and information accuracy disclosure.",
};

export default function DisclaimerPage() {
  return (
    <div className="flex flex-col min-h-screen pt-24 pb-20 bg-bg-primary">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 w-full space-y-8">
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold text-amber-500 hover:underline">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
        </Link>

        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider">
            <ShieldAlert className="w-3.5 h-3.5" /> Notice
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-black text-text-primary tracking-tight">
            Disclaimer & Disclosures
          </h1>
          <p className="text-text-tertiary text-xs">Last updated: August 2026</p>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-sm text-text-secondary leading-relaxed">
          <section className="p-6 rounded-3xl bg-bg-card border border-border-default space-y-3">
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" /> RERA & Regulatory Notice
            </h2>
            <p>
              Road Facing is a digital marketplace connecting buyers, developers, and property owners. The project details, floor plans, pricing estimates, specifications, and timelines showcased on this platform are for informational purposes only.
            </p>
            <p>
              Prospective buyers are advised to independently verify the RERA registration details of developers and projects on the respective state RERA official portals (such as AP RERA, TG RERA, Karnataka RERA, and MahaRERA).
            </p>
          </section>

          <section className="p-6 rounded-3xl bg-bg-card border border-border-default space-y-3">
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-500" /> Visuals & Construction Updates
            </h2>
            <p>
              Ground inspection videos, drone footage, and construction progress photography displayed on Road Facing reflect conditions at the time of recording. Road Facing does not warrant that future construction will adhere strictly to early artist impressions.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
