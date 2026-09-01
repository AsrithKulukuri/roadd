import { Shield, FileCheck, AlertTriangle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Terms of Service",
  description: "Terms and conditions of using Road Facing real estate platform.",
};

export default function TermsOfServicePage() {
  return (
    <div className="flex flex-col min-h-screen pt-24 pb-20 bg-bg-primary">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 w-full space-y-8">
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold text-amber-500 hover:underline">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
        </Link>

        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider">
            <Shield className="w-3.5 h-3.5" /> Platform Terms
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-black text-text-primary tracking-tight">
            Terms of Service
          </h1>
          <p className="text-text-tertiary text-xs">Last updated: August 2026</p>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-sm text-text-secondary leading-relaxed">
          <section className="p-6 rounded-3xl bg-bg-card border border-border-default space-y-3">
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-amber-500" /> 1. Acceptance of Terms
            </h2>
            <p>
              By accessing and using Road Facing (&quot;the Platform&quot;), you acknowledge that you have read, understood, and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Platform.
            </p>
          </section>

          <section className="p-6 rounded-3xl bg-bg-card border border-border-default space-y-3">
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> 2. Real Estate Information & Listings
            </h2>
            <p>
              Road Facing acts as an informational platform providing verified on-ground visuals and project status. While we make every effort to ensure information accuracy, users are encouraged to perform independent legal title checks and verify RERA registrations before executing any property transactions.
            </p>
          </section>

          <section className="p-6 rounded-3xl bg-bg-card border border-border-default space-y-3">
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-500" /> 3. Contact & Inquiries
            </h2>
            <p>
              For legal inquiries or questions regarding our terms, please contact our legal desk at <a href="mailto:legal@roadfacing.in" className="text-amber-500 font-bold hover:underline">legal@roadfacing.in</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
