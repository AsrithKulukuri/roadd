"use client";

import { useState } from "react";
import { Calendar } from "lucide-react";
import { toast } from "sonner";
import type { Property } from "@/types/property";
import { requireActionSession } from "@/lib/action-auth";
import { performListingAction } from "./listing-contact-actions";
import { TourBookingModal } from "./tour-booking-modal";
import { WhatsAppIcon } from "./whatsapp-share-button";

export function MobilePropertyCta({ property }: { property: Property }) {
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);

  async function openWhatsApp() {
    try {
      const action = await performListingAction("property", property.id, "whatsapp_click");
      if (!action?.phone) return;
      const anchor = document.createElement("a");
      anchor.href = `https://wa.me/${action.phone}?text=${encodeURIComponent(`Hi, I am interested in ${property.title}`)}`;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.click();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Please retry.");
    }
  }

  async function openSchedule() {
    try {
      if (await requireActionSession("schedule_visit")) setIsScheduleOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Please retry.");
    }
  }

  const location = `${property.location?.locality || ""}, ${property.location?.city || ""}`.replace(/^,\s*|,\s*$/g, "");

  return <>
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200/70 bg-white/90 p-3 shadow-[0_-8px_32px_rgba(0,0,0,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/90" style={{ paddingBottom: "env(safe-area-inset-bottom, 12px)" }}>
      <div className="flex items-center gap-3">
        <button type="button" onClick={openWhatsApp} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-[#25D366] to-[#128C7E] text-sm font-bold text-white shadow-lg shadow-green-500/25 transition-transform active:scale-95">
          <WhatsAppIcon className="h-5 w-5 shrink-0" color="#FFFFFF" phoneColor="#25D366" />
          <span>WhatsApp</span>
        </button>
        <button type="button" onClick={openSchedule} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-sm font-bold text-white shadow-lg shadow-amber-500/30 transition-transform active:scale-95">
          <Calendar className="h-5 w-5 shrink-0" />
          <span>Schedule Visit</span>
        </button>
      </div>
    </div>
    <TourBookingModal isOpen={isScheduleOpen} onClose={() => setIsScheduleOpen(false)} property={{ id: property.id, slug: property.slug, title: property.title, location: property.location }} propertyName={property.title} propertyLocation={location} />
  </>;
}
