"use client";
import type { Property } from "@/types/property";
import { ListingContactActions } from "./listing-contact-actions";
export function ContactAgentBelowMap({ property }: { property: Property }) {
  return <div className="rounded-3xl border border-border-default bg-bg-card p-6 space-y-4"><h3 className="text-xl font-bold">Contact owner / agent</h3><ListingContactActions listingType="property" listingId={property.id} /></div>;
}
