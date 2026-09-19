import { Metadata } from "next";
import Link from "next/link";
import {
  ShieldAlert,
  ArrowLeft,
  Mail,
  UserX,
  Database,
  Clock,
  CheckCircle2,
  FileText,
  Lock,
} from "lucide-react";

export const metadata: Metadata = {
  title: "User Data Deletion | Road Facing",
  description:
    "Instructions and policy for requesting account and personal data deletion from the Road Facing real estate platform.",
};

export default function UserDataDeletionPage() {
  return (
    <div className="flex flex-col min-h-screen pt-24 pb-20 bg-bg-primary">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 w-full space-y-8">
        {/* Back to Home Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-amber-500 hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
        </Link>

        {/* Header */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider">
            <ShieldAlert className="w-3.5 h-3.5" /> Privacy & Data Rights
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-black text-text-primary tracking-tight">
            User Data Deletion
          </h1>
          <p className="text-text-tertiary text-xs">
            Road Facing Platform &bull; Last updated: September 2026
          </p>
        </div>

        {/* Introduction */}
        <div className="p-6 rounded-3xl bg-bg-card border border-border-default space-y-3 text-sm text-text-secondary leading-relaxed">
          <p>
            At <strong>Road Facing</strong> (<code>roadfacing.com</code>), we respect your privacy and give you full control over your personal information. In accordance with applicable data protection regulations and Meta platform developer policies, you have the right to request the permanent deletion of your account and all associated personal data stored on our servers.
          </p>
        </div>

        {/* Details & Policy Sections */}
        <div className="space-y-6 text-sm text-text-secondary leading-relaxed">
          {/* Section 1: Eligible Data */}
          <section className="p-6 rounded-3xl bg-bg-card border border-border-default space-y-4">
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <Database className="w-4 h-4 text-amber-500" /> 1. What Data Can Be Deleted
            </h2>
            <p>
              When an account and data deletion request is processed, the following categories of data are permanently purged or anonymized from our production and backup systems:
            </p>
            <ul className="space-y-2.5 list-none pl-1 text-xs sm:text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <span>
                  <strong className="text-text-primary">Account & Profile Data:</strong> Full name, registered phone number, email address, role, avatar, and authentication session tokens.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <span>
                  <strong className="text-text-primary">Property Inquiries & Leads:</strong> Contact requests submitted to builders, developers, or agents through listing detail views or quick inquiry forms.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <span>
                  <strong className="text-text-primary">Saved Properties & Preferences:</strong> Bookmarked properties, saved searches, custom filters, and comparison history.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <span>
                  <strong className="text-text-primary">Site Visits & Tour Bookings:</strong> Scheduled project visits, time slot selections, and customer appointment notes.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <span>
                  <strong className="text-text-primary">WhatsApp & Messaging Records:</strong> Inbound conversation history with the ROAD AI Concierge, opt-in/opt-out preferences, and broadcast recipient records.
                </span>
              </li>
            </ul>
          </section>

          {/* Section 2: Instructions to Request Deletion */}
          <section className="p-6 rounded-3xl bg-bg-card border border-border-default space-y-4">
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <UserX className="w-4 h-4 text-amber-500" /> 2. How to Request Data Deletion
            </h2>
            <p>
              Users can request deletion of their account and personal data at any time by contacting our dedicated support desk:
            </p>

            <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">
                  Direct Contact Email
                </div>
                <a
                  href="mailto:care@roadfacing.com?subject=User%20Data%20Deletion%20Request"
                  className="text-lg font-bold text-amber-500 hover:underline flex items-center gap-2"
                >
                  <Mail className="w-4 h-4" /> care@roadfacing.com
                </a>
              </div>
              <a
                href="mailto:care@roadfacing.com?subject=User%20Data%20Deletion%20Request"
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs uppercase tracking-wider transition-colors inline-flex items-center gap-2 shadow-sm"
              >
                Send Deletion Request
              </a>
            </div>

            <p className="text-xs text-text-tertiary">
              Please include the following details in your email to help us locate and verify your records quickly:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-xs text-text-secondary pl-1">
              <li>Your registered phone number (including country code, e.g. <code>+91XXXXXXXXXX</code>) used for login or WhatsApp inquiries.</li>
              <li>Your registered email address (if added to your profile).</li>
              <li>A brief statement requesting account deletion and data purge.</li>
            </ol>
          </section>

          {/* Section 3: Processing Timeline */}
          <section className="p-6 rounded-3xl bg-bg-card border border-border-default space-y-4">
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" /> 3. Processing Timeline & Verification
            </h2>
            <p>
              Once your deletion request is submitted:
            </p>
            <ul className="space-y-2 list-none pl-1 text-xs sm:text-sm">
              <li className="flex items-start gap-2">
                <span className="font-bold text-amber-500">1.</span>
                <span>
                  <strong className="text-text-primary">Acknowledgment:</strong> Our support team will confirm receipt of your request within <strong>24 to 48 business hours</strong>.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-amber-500">2.</span>
                <span>
                  <strong className="text-text-primary">Security Verification:</strong> We may send a verification code to your registered phone number or email to ensure unauthorized parties cannot request deletion of your account.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-amber-500">3.</span>
                <span>
                  <strong className="text-text-primary">Execution:</strong> Upon verification, all your account records, inquiries, saved listings, and conversation logs will be permanently deleted within <strong>15 to 30 days</strong>.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-amber-500">4.</span>
                <span>
                  <strong className="text-text-primary">Confirmation:</strong> A final written confirmation will be delivered to your contact email.
                </span>
              </li>
            </ul>
          </section>

          {/* Section 4: Data Retention Mandates */}
          <section className="p-6 rounded-3xl bg-bg-card border border-border-default space-y-3">
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-500" /> 4. Statutory Retention Exceptions
            </h2>
            <p className="text-xs text-text-secondary leading-relaxed">
              Certain operational or security audit logs, payment transaction records, or tax receipts may be retained for the minimum duration strictly mandated by Indian law or regulatory authorities. These records are isolated, encrypted, and automatically purged once the statutory retention period lapses.
            </p>
          </section>

          {/* Section 5: Related Links */}
          <section className="p-6 rounded-3xl bg-bg-card border border-border-default space-y-3">
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-500" /> 5. Related Policies
            </h2>
            <p className="text-xs">
              Learn more about our data protection standards across the platform:
            </p>
            <div className="flex flex-wrap gap-4 pt-1">
              <Link href="/privacy" className="text-xs font-bold text-amber-500 hover:underline">
                Privacy Policy &rarr;
              </Link>
              <Link href="/terms" className="text-xs font-bold text-amber-500 hover:underline">
                Terms of Service &rarr;
              </Link>
              <Link href="/cookies" className="text-xs font-bold text-amber-500 hover:underline">
                Cookie Policy &rarr;
              </Link>
              <Link href="/grievance" className="text-xs font-bold text-amber-500 hover:underline">
                Grievance Redressal &rarr;
              </Link>
            </div>
          </section>
        </div>

        {/* Footer Link Back to Home */}
        <div className="pt-4 border-t border-border-default flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-amber-500 hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
          </Link>
          <a
            href="mailto:care@roadfacing.com"
            className="text-xs text-text-tertiary hover:text-amber-500 hover:underline"
          >
            care@roadfacing.com
          </a>
        </div>
      </div>
    </div>
  );
}
