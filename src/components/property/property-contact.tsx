"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MessageSquare, Calendar, CheckCircle2, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const [isTourModalOpen, setIsTourModalOpen] = useState(false);

  const targetRedirect = `/properties/${property.slug}`;

  const handleScheduleClick = () => {
    setIsTourModalOpen(true);
  };

  const handleWhatsAppAgent = () => {
    if (!isLoggedIn) {
      router.push(getLoginUrl(targetRedirect));
      return;
    }

    const userName = user?.name || "Buyer";
    const userPhone = user?.phone || "";
    const whatsappMsg = encodeURIComponent(
      `Hi! I am interested in ${property.title} located at ${property.location.locality}, ${property.location.city}.\n\nMy Details:\nName: ${userName}${userPhone ? `\nPhone: ${userPhone}` : ""}`
    );

    const targetPhone = formatWhatsAppPhone(property.ownerPhone || "918977311418");
    toast.success("Connecting with owner/agent on WhatsApp...");
    window.open(`https://wa.me/${targetPhone}?text=${whatsappMsg}`, "_blank");
  };

  return (
    <div className="sticky top-28 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Schedule a Visit
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Book a private site tour or connect with verified owner
          </p>
        </div>
        {isLoggedIn && (
          <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" /> Verified
          </span>
        )}
      </div>

      {/* Clean Action Buttons: Schedule Visit + WhatsApp */}
      <div className="space-y-3 pt-1">
        {/* Schedule Tour Button - White box, black text, amber icon */}
        <button
          type="button"
          onClick={handleScheduleClick}
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-white hover:bg-neutral-50 text-neutral-900 border border-neutral-300 font-bold text-sm shadow-xs transition-all cursor-pointer active:scale-98"
        >
          <Calendar className="w-4.5 h-4.5 text-amber-500 shrink-0" />
          <span>Schedule Private Site Visit</span>
        </button>

        {/* WhatsApp Agent Button */}
        {isLoggedIn ? (
          <button
            type="button"
            onClick={handleWhatsAppAgent}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-98 text-slate-950 font-black text-sm shadow-md transition-all cursor-pointer"
          >
            <MessageSquare className="w-4.5 h-4.5 fill-slate-950 text-slate-950 shrink-0" />
            <span>WhatsApp Agent</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => router.push(getLoginUrl(targetRedirect))}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-98 text-slate-950 font-black text-sm shadow-md transition-all cursor-pointer"
          >
            <Lock className="w-4.5 h-4.5 fill-slate-950 text-slate-950 shrink-0" />
            <span>Sign in for Direct WhatsApp Chat</span>
          </button>
        )}

        {/* Direct Call Info when Logged In */}
        {isLoggedIn && property.ownerPhone && (
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-600 dark:text-amber-400 font-bold">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Owner Direct:</span>
            </span>
            <a
              href={`tel:${property.ownerPhone.replace(/\s/g, "")}`}
              className="hover:underline text-sm font-extrabold text-slate-900 dark:text-white"
            >
              {property.ownerPhone}
            </a>
          </div>
        )}

        {/* Trust Badges */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Direct WhatsApp confirmation &amp; 1-hour visit reminder</span>
          </div>
        </div>
      </div>

      <TourBookingModal
        isOpen={isTourModalOpen}
        onClose={() => setIsTourModalOpen(false)}
        property={{
          id: property.id,
          slug: property.slug,
          title: property.title,
          location: property.location,
          ownerPhone: property.ownerPhone,
        }}
        propertyName={property.title}
        propertyLocation={`${property.location.locality}, ${property.location.city}`}
        ownerPhone={property.ownerPhone}
      />
    </div>
  );
}
