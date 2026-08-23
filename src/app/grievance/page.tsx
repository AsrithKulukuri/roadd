import { Mail, Phone, MapPin, MessageSquare, ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Grievance Redressal | Road Facing",
  description: "Official Grievance Redressal & Customer Support Officer contact details for Road Facing.",
};

export default function GrievancePage() {
  return (
    <div className="flex flex-col min-h-screen pt-24 pb-20 bg-bg-primary">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 w-full space-y-8">
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold text-amber-500 hover:underline">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
        </Link>

        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider">
            <MessageSquare className="w-3.5 h-3.5" /> Customer Support
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-black text-text-primary tracking-tight">
            Grievance Redressal
          </h1>
          <p className="text-text-secondary text-sm">
            In accordance with IT Rules and Consumer Protection regulations, Road Facing maintains a dedicated Grievance Officer.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-6 rounded-3xl bg-bg-card border border-border-default space-y-4">
            <h2 className="text-base font-bold text-text-primary">Grievance Officer Contact</h2>
            <div className="space-y-3 text-sm text-text-secondary">
              <p className="font-bold text-text-primary">Koteswara Rao / Support Lead</p>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-amber-500 shrink-0" />
                <a href="mailto:grievance@roadfacing.in" className="hover:text-amber-500 transition-colors">
                  grievance@roadfacing.in
                </a>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-amber-500 shrink-0" />
                <span>+91 89773 11418</span>
              </div>
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>RoadFacing Desk, Vijayawada, Andhra Pradesh, India</span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-amber-500/10 border border-amber-500/20 space-y-3">
            <h3 className="text-base font-bold text-text-primary">Resolution Timeline</h3>
            <ul className="space-y-2 text-xs text-text-secondary leading-relaxed">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Acknowledgment of grievance within <strong>24 hours</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Investigation and resolution within <strong>15 business days</strong></span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
