import { Shield, Lock, Eye, FileText, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | Road Facing",
  description: "Privacy Policy and Data Protection standards at Road Facing real estate platform.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="flex flex-col min-h-screen pt-24 pb-20 bg-bg-primary">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 w-full space-y-8">
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold text-amber-500 hover:underline">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
        </Link>

        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider">
            <Shield className="w-3.5 h-3.5" /> Legal & Compliance
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-black text-text-primary tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-text-tertiary text-xs">Last updated: August 2026</p>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-sm text-text-secondary leading-relaxed">
          <section className="p-6 rounded-3xl bg-bg-card border border-border-default space-y-3">
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-500" /> 1. Information We Collect
            </h2>
            <p>
              At Road Facing, we collect information you provide directly to us when you browse properties, create an inquiry, submit property requirements, or contact builders and agents. This includes your name, phone number, email address, and property preferences.
            </p>
          </section>

          <section className="p-6 rounded-3xl bg-bg-card border border-border-default space-y-3">
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <Eye className="w-4 h-4 text-amber-500" /> 2. How We Use Your Information
            </h2>
            <p>
              We use your information solely to facilitate direct communication with verified builders, property owners, and certified channel partners. We do not sell or monetize your personal contact details to third-party telemarketing networks.
            </p>
          </section>

          <section className="p-6 rounded-3xl bg-bg-card border border-border-default space-y-3">
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-500" /> 3. Data Security & Storage
            </h2>
            <p>
              Your personal data and inquiry details are secured using modern encryption standards. You have the right at any time to request data modification or deletion by reaching out to us at <a href="mailto:hello@roadfacing.in" className="text-amber-500 font-bold hover:underline">hello@roadfacing.in</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
