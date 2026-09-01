import { Cookie, Shield, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Cookie Policy",
  description: "Learn how Road Facing uses cookies to enhance your browsing experience.",
};

export default function CookiePolicyPage() {
  return (
    <div className="flex flex-col min-h-screen pt-24 pb-20 bg-bg-primary">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 w-full space-y-8">
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold text-amber-500 hover:underline">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
        </Link>

        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider">
            <Cookie className="w-3.5 h-3.5" /> Preference Management
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-black text-text-primary tracking-tight">
            Cookie Policy
          </h1>
          <p className="text-text-tertiary text-xs">Last updated: August 2026</p>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-sm text-text-secondary leading-relaxed">
          <section className="p-6 rounded-3xl bg-bg-card border border-border-default space-y-3">
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <Cookie className="w-4 h-4 text-amber-500" /> How We Use Cookies
            </h2>
            <p>
              Road Facing uses cookies and local storage tokens to remember your saved favorite properties, search filter preferences, theme settings (dark / light mode), and session login states.
            </p>
            <p>
              We do not use intrusive cross-site ad tracking cookies. You can manage or clear your browser cookies at any time via your browser settings.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
