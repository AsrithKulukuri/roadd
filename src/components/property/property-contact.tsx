"use client";
import { useState } from "react";
import { toast } from "sonner";
import { TourBookingModal } from "./tour-booking-modal";
import { ListingContactActions } from "./listing-contact-actions";
import { requireActionSession } from "@/lib/action-auth";
import type { Property } from "@/types/property";
export function PropertyContact({ property }: { property: Property }) {
  const [open, setOpen] = useState(false);
  return <div className="sticky top-28 bg-bg-card border border-border-default rounded-3xl p-6 shadow-xl space-y-5">
    <h3 className="text-xl font-bold">Contact owner / agent</h3>
    <button type="button" className="w-full rounded-2xl border border-border-default p-3 font-bold" onClick={async () => {
      try { if (await requireActionSession("schedule_visit")) setOpen(true); }
      catch { toast.error("Unable to verify your session. Please try again."); }
    }}>Schedule Private Site Visit</button>
    <ListingContactActions listingType="property" listingId={property.id} />
    <TourBookingModal isOpen={open} onClose={() => setOpen(false)} property={{ id: property.id, slug: property.slug, title: property.title, location: property.location }} propertyName={property.title} propertyLocation={property.location.locality + ", " + property.location.city} />
  </div>;
}
