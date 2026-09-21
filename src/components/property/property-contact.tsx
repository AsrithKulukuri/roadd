"use client";
import { useState } from "react";
import { toast } from "sonner";
import { TourBookingModal } from "./tour-booking-modal";
import { ListingContactActions, performListingAction } from "./listing-contact-actions";
import type { Property } from "@/types/property";
export function PropertyContact({ property }: { property: Property }) {
  const [open, setOpen] = useState(false);
  async function brochure(download: boolean) {
    try {
      const result = await performListingAction("property", property.id, "brochure_download");
      if (!result?.brochureUrl) return;
      const link = document.createElement("a");
      link.href = result.brochureUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      if (download) link.download = "brochure.pdf";
      link.click();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Please retry."); }
  }
  return <div className="sticky top-28 bg-bg-card border border-border-default rounded-3xl p-6 shadow-xl space-y-5">
    <h3 className="text-xl font-bold">Contact owner / agent</h3>
    <button type="button" className="w-full rounded-2xl border border-border-default p-3 font-bold" onClick={async () => {
      try { if (await performListingAction("property", property.id, "schedule_visit")) setOpen(true); }
      catch { toast.error("Unable to verify your session. Please try again."); }
    }}>Schedule Private Site Visit</button>
    <ListingContactActions listingType="property" listingId={property.id} />
    {(property.brochureUrl || (property as Property & { hasBrochure?: boolean }).hasBrochure) && <div className="flex gap-3">
      <button type="button" className="rounded-xl border p-3 font-semibold" onClick={() => void brochure(false)}>View brochure</button>
      <button type="button" className="rounded-xl border p-3 font-semibold" onClick={() => void brochure(true)}>Download brochure</button>
    </div>}
    <TourBookingModal isOpen={open} onClose={() => setOpen(false)} property={{ id: property.id, slug: property.slug, title: property.title, location: property.location }} propertyName={property.title} propertyLocation={property.location.locality + ", " + property.location.city} />
  </div>;
}
