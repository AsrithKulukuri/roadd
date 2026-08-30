"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MessageSquare, Phone, Calendar, CheckCircle2, Lock, ShieldCheck, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TourBookingModal } from "@/components/property/tour-booking-modal";
import { useAuthSession } from "@/hooks/use-auth-session";
import { formatWhatsAppPhone } from "@/lib/whatsapp/whatsapp-share";
import type { Property } from "@/types/property";

interface PropertyContactProps {
  property: Property;
}

export function PropertyContact({ property }: PropertyContactProps) {
  const router = useRouter();
  const { isLoggedIn, user, getLoginUrl } = useAuthSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTourModalOpen, setIsTourModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    message: `I'm interested in ${property.title}.`,
  });

  // Pre-fill user data when logged in
  useEffect(() => {
    if (isLoggedIn && user) {
      setFormData((prev) => ({
        ...prev,
        fullName: user.name || prev.fullName,
        email: user.email || prev.email,
        phone: user.phone || prev.phone,
      }));
    }
  }, [isLoggedIn, user]);

  const targetRedirect = `/properties/${property.slug}`;

  const handleAction = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLoggedIn) {
      router.push(getLoginUrl(targetRedirect));
      return;
    }

    setIsSubmitting(true);
    const whatsappMsg = encodeURIComponent(
      `Hi! I am interested in ${property.title} located at ${property.location.locality}, ${property.location.city}.\n\nMy Details:\nName: ${formData.fullName || "Buyer"}\nEmail: ${formData.email}\nPhone: ${formData.phone}`
    );

    // TODO: For future production hardening, strip private owner contact fields from unauthenticated public Supabase queries / API responses
    const targetPhone = formatWhatsAppPhone(property.ownerPhone || "918977311418");

    setTimeout(() => {
      setIsSubmitting(false);
      toast.success("Opening WhatsApp to connect with owner...");
      window.open(`https://wa.me/${targetPhone}?text=${whatsappMsg}`, "_blank");
    }, 400);
  };

  const handleScheduleClick = () => {
    if (!isLoggedIn) {
      router.push(getLoginUrl(targetRedirect));
      return;
    }
    setIsTourModalOpen(true);
  };

  return (
    <div className="sticky top-28 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
      {/* Title */}
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          {isLoggedIn ? "Contact Owner & Agent" : "More about this property"}
        </h3>
        {isLoggedIn && (
          <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" /> Unlocked
          </span>
        )}
      </div>

      {!isLoggedIn ? (
        /* Unauthenticated Premium Locked Card */
        <div className="space-y-4 pt-1">
          <div className="p-5 rounded-2xl bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-500 border border-amber-500/40 flex items-center justify-center mx-auto shadow-sm">
              <Lock className="w-6 h-6 text-amber-500" />
            </div>

            <div>
              <h4 className="font-heading font-black text-slate-900 dark:text-white text-base">
                Log in to view contact details
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                Sign in to connect directly with the verified owner on WhatsApp, view direct phone numbers, and schedule private site visits.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 pt-2 text-left border-t border-amber-500/20 text-[11px] font-bold text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Verified Owner &amp; Agent Contact</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Instant WhatsApp Direct Chat</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Free Private Site Visit Booking</span>
              </div>
            </div>
          </div>

          {/* Primary Action Button: Sign In */}
          <Button
            type="button"
            onClick={() => router.push(getLoginUrl(targetRedirect))}
            className="w-full h-14 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black text-base rounded-full shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Lock className="w-5 h-5 fill-slate-950 text-slate-950" />
            <span>Sign in to Contact Owner</span>
          </Button>

          {/* Schedule Tour Button */}
          <Button
            type="button"
            variant="outline"
            onClick={handleScheduleClick}
            className="w-full h-11 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs rounded-full cursor-pointer flex items-center justify-center gap-2"
          >
            <Calendar className="w-4 h-4 text-amber-500" /> Schedule Private Site Visit
          </Button>

          {/* Disclaimer */}
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed pt-2 border-t border-slate-200 dark:border-slate-800 text-center">
            Zero spam. Your phone number is safely encrypted and authenticated via WhatsApp OTP.
          </p>
        </div>
      ) : (
        /* Authenticated Form & Contact Box */
        <form onSubmit={handleAction} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Full name *
            </label>
            <Input
              type="text"
              required
              placeholder="e.g. Asrith Kulukuri"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="h-12 rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:border-amber-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Email *
            </label>
            <Input
              type="email"
              required
              placeholder="name@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="h-12 rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:border-amber-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Phone *
            </label>
            <Input
              type="tel"
              required
              placeholder="+91 8977311418"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="h-12 rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:border-amber-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              How can an agent help?
            </label>
            <textarea
              rows={3}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-amber-500 font-medium"
            />
          </div>

          {/* Primary Action Button: WhatsApp agent */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-14 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black text-base rounded-full shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <MessageSquare className="w-5 h-5 fill-slate-950 text-slate-950" />
            <span>WhatsApp Agent</span>
          </Button>

          {/* Direct Call Info when Logged In */}
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-500 dark:text-amber-400 font-bold">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-amber-500" />
              <span>Owner Direct:</span>
            </span>
            <a
              href={`tel:${(property.ownerPhone || "+91 8977311418").replace(/\s/g, "")}`}
              className="hover:underline text-sm font-extrabold text-slate-900 dark:text-white"
            >
              {property.ownerPhone || "+91 8977311418"}
            </a>
          </div>

          {/* Schedule Tour Button */}
          <Button
            type="button"
            variant="outline"
            onClick={handleScheduleClick}
            className="w-full h-11 border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 font-bold text-xs rounded-full cursor-pointer flex items-center justify-center gap-2"
          >
            <Calendar className="w-4 h-4" /> Schedule Private Site Visit
          </Button>

          {/* Legal Disclaimer */}
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed pt-2 border-t border-slate-200 dark:border-slate-800">
            By proceeding, you consent to receive WhatsApp updates and calls from ROAD verified property agents regarding your inquiry.
          </p>
        </form>
      )}

      <TourBookingModal
        isOpen={isTourModalOpen}
        onClose={() => setIsTourModalOpen(false)}
        propertyName={property.title}
        propertyLocation={`${property.location.locality}, ${property.location.city}`}
      />
    </div>
  );
}

