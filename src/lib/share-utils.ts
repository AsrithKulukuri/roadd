import { toast } from "sonner";
import { formatINR, formatPriceCompact } from "./utils";
import { getRefId } from "./ref-id";
import type { Property } from "@/types/property";
import type { Project } from "@/types/project";

export interface ShareItemOptions {
  item: Property | Project | any;
  type?: "property" | "project";
}

/**
 * Shares a property or project card including its Reference ID, Price, Location, Specs,
 * and direct redirect link to Road Facing.
 */
export async function shareItem({ item, type }: ShareItemOptions) {
  if (!item) return;

  const isProject =
    type === "project" ||
    item._isProject ||
    item.projectType !== undefined ||
    item.configurations !== undefined;

  const refId = getRefId(item);
  const title = item.title || item.name || "Real Estate Listing";

  // Format price
  let priceStr = "";
  if (typeof item.price === "number" && item.price > 0) {
    priceStr =
      item.listingType === "rent" || item.listingType === "pg"
        ? `${formatINR(item.price)}/mo`
        : formatPriceCompact(item.price);
  } else if (item.configurations && Array.isArray(item.configurations) && item.configurations.length > 0) {
    const min = item.configurations[0]?.priceMin;
    const max = item.configurations[0]?.priceMax || min;
    if (min) {
      priceStr = min === max ? formatPriceCompact(min) : `${formatPriceCompact(min)} – ${formatPriceCompact(max)}`;
    }
  }

  // Location
  const locality = item.location?.locality || item.location?.address || "";
  const city = item.location?.city || "Andhra Pradesh";
  const locationStr = locality ? `${locality}, ${city}` : city;

  // Specs / Details
  const specs: string[] = [];
  if (item.bedrooms) specs.push(`${item.bedrooms} BHK`);
  if (item.propertyType) specs.push(item.propertyType);
  if (item.area || item.builtUpArea) {
    specs.push(`${(item.area || item.builtUpArea).toLocaleString()} sq.ft`);
  }
  const specsStr = specs.join(" • ");

  // Direct redirect URL to our website: Always use production domain when on localhost so WhatsApp / Social media can fetch the Open Graph card preview
  const isLocalhost =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname.startsWith("192.168.") ||
      window.location.hostname.startsWith("10."));

  const origin =
    !isLocalhost && typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : "https://www.roadfacing.com";

  const path = isProject
    ? `/projects/${item.slug || item.id}`
    : `/properties/${item.slug || item.id}`;
  const shareUrl = `${origin}${path}`;

  // Formatted share text for WhatsApp, Telegram, SMS, Social Media
  const shareTitle = `${refId}: ${title}`;
  const shareSummaryText = `🏡 *${title}*\n🆔 Reference ID: *${refId}*${priceStr ? `\n💰 Price: *${priceStr}*` : ""}${locationStr ? `\n📍 Location: ${locationStr}` : ""}${specsStr ? `\n📐 Specs: ${specsStr}` : ""}\n\n✨ View verified details, photos & video on Road Facing:`;

  // Try native Web Share API
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({
        title: shareTitle,
        text: shareSummaryText,
        url: shareUrl,
      });
      toast.success(`Shared ${refId} (${title})`);
      return;
    } catch (err: any) {
      if (err?.name === "AbortError") {
        return; // User closed the share sheet
      }
    }
  }

  // Fallback: Copy formatted text and link to clipboard
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(`${shareSummaryText}\n${shareUrl}`);
      toast.success(`📋 Copied ${refId} link to clipboard!`);
    } catch {
      toast.error("Failed to copy link");
    }
  }
}
