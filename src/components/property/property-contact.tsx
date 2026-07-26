"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Phone, Mail, MessageSquare, BadgeCheck, Lock, Calendar, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatPriceCompact, formatINR } from "@/lib/utils";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { TourBookingModal } from "@/components/property/tour-booking-modal";
import type { Property } from "@/types/property";

interface PropertyContactProps {
  property: Property;
}

export function PropertyContact({ property }: PropertyContactProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isTourModalOpen, setIsTourModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "asrithkulkuri@gmail.com",
    phone: "",
    message: `I am interested in ${property.title}, ${property.location.locality}, ${property.location.city}. Please share pricing details and arrange a site visit.`,
  });

  useEffect(() => {
    const checkAuth = async () => {
      if (isSupabaseConfigured()) {
        const { data: { session } } = await supabase.auth.getSession();
        setIsLoggedIn(!!session);
        if (session?.user) {
          setFormData((prev) => ({
            ...prev,
            fullName: session.user.user_metadata?.full_name || prev.fullName,
            email: session.user.email || prev.email,
          }));
        }
      } else {
        const stored = localStorage.getItem("road_user");
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            setIsLoggedIn(!!parsed.isLoggedIn);
            if (parsed.email) {
              setFormData((prev) => ({ ...prev, email: parsed.email, fullName: parsed.name || prev.fullName }));
            }
          } catch (e) {}
        }
      }
    };
    
    checkAuth();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success("Inquiry sent successfully!", {
        description: `ROAD FACING Property Executive will call you shortly at ${formData.phone || "your contact number"}.`,
      });
    }, 800);
  };

  const whatsappMessage = encodeURIComponent(
    `Hi ROAD FACING, I am interested in ${property.title} listed at ${formatINR(property.price)} in ${property.location.locality}, ${property.location.city}. Please connect me with the owner/agent.`
  );

  return (
    <div className="sticky top-28 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
      
      {/* Realtor.com Builder & Marketing Header Card */}
      <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="w-11 h-11 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-sm shadow-md shrink-0">
          ROAD
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-[10px] uppercase font-black text-slate-500 dark:text-slate-400 block tracking-wider">
            Listed & Brokered by:
          </span>
          <h4 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
            {property.ownerName || "ROAD FACING Premier Realty"}
          </h4>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
            <BadgeCheck className="w-3.5 h-3.5" /> RERA Verified Agent
          </span>
        </div>
      </div>

      {/* Form Section: More about this property (Realtor.com Style) */}
      <div className="space-y-4">
        <h3 className="font-heading text-xl font-bold text-slate-900 dark:text-white">
          More about this property
        </h3>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Full name *
            </label>
            <Input
              type="text"
              required
              placeholder="e.g. Asrith Kulukuri"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:border-amber-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Email *
            </label>
            <Input
              type="email"
              required
              placeholder="name@domain.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:border-amber-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Phone *
            </label>
            <Input
              type="tel"
              required
              placeholder="+91 99999 99999"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:border-amber-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              How can an agent help?
            </label>
            <textarea
              rows={3}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-amber-500 font-medium"
            />
          </div>

          {/* Owner Phone & Contact details */}
          {isLoggedIn ? (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-1 text-emerald-400 font-medium mb-3">
              <div className="flex items-center justify-between font-bold text-white">
                <span>Verified Direct Contact:</span>
                <span className="text-[10px] uppercase bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-black">Unlocked</span>
              </div>
              <p className="text-sm font-extrabold text-white flex items-center gap-1.5 pt-0.5">
                <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                <a href="tel:+918977311418" className="hover:underline">+91 8977311418</a>
              </p>
              <p className="text-xs text-slate-300 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>asrithkulkuri@gmail.com</span>
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-2 mb-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <Lock className="w-4 h-4" />
                <span>Contact Details Protected</span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">
                Sign in with WhatsApp OTP to view direct contact numbers (+91 8977311418) and send inquiries.
              </p>
              <Button
                type="button"
                variant="amber"
                onClick={() => router.push(`/login?redirect=/properties/${property.slug}`)}
                className="w-full h-11 font-extrabold text-xs rounded-xl shadow-amber-glow mt-1"
              >
                Sign In with WhatsApp OTP
              </Button>
            </div>
          )}

          {/* Primary Action Button */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-6 bg-[#d92228] hover:bg-[#b91c21] active:scale-95 text-white font-extrabold text-sm rounded-full shadow-md transition-all cursor-pointer"
          >
            {isSubmitting ? "Sending Inquiry..." : "Contact builder"}
          </Button>

          {/* WhatsApp Direct Action Button */}
          <a
            href={`https://wa.me/918977311418?text=${whatsappMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-full flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer block text-center"
          >
            <MessageSquare className="w-4 h-4" /> WhatsApp Owner (+91 8977311418)
          </a>

          {/* Schedule Tour Button */}
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsTourModalOpen(true)}
            className="w-full py-3 border-amber-500/50 text-amber-500 hover:bg-amber-500/10 font-bold text-xs rounded-full cursor-pointer flex items-center justify-center gap-2"
          >
            <Calendar className="w-4 h-4" /> Schedule Private Site Visit
          </Button>
        </form>

        {/* Legal Disclaimer Note (Realtor.com Style) */}
        <p className="text-[10px] text-slate-400 leading-tight pt-2 border-t border-slate-200 dark:border-slate-800">
          By proceeding, you consent to receive calls & WhatsApp updates from ROAD FACING Verified Property Executives regarding this inquiry. No spam guaranteed.
        </p>
      </div>

      <TourBookingModal
        isOpen={isTourModalOpen}
        onClose={() => setIsTourModalOpen(false)}
        propertyName={property.title}
        propertyLocation={`${property.location.locality}, ${property.location.city}`}
      />
    </div>
  );
}
