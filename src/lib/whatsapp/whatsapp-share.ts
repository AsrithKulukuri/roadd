/**
 * ROAD Platform — WhatsApp Messaging & Sharing Utility
 * Handles WhatsApp link generation, rich message formatting, UTM tracking, and deep links.
 */

import { formatINR, formatPriceCompact } from "../utils";
import { getRefId } from "../ref-id";
import type { Property } from "@/types/property";
import type { Project } from "@/types/project";
import { toast } from "sonner";

export interface WhatsAppShareOptions {
  item: Property | Project | any;
  type?: "property" | "project";
  recipientPhone?: string; // Optional phone number for direct wa.me/1234567890
  source?: "card" | "detail" | "admin" | "map";
}

/**
 * Returns the active production base URL or current origin
 */
export function getBaseUrl(): string {
  if (typeof window !== "undefined") {
    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname.startsWith("192.168.") ||
      window.location.hostname.startsWith("10.");

    if (!isLocalhost && window.location.origin) {
      return window.location.origin;
    }
  }

  return process.env.NEXT_PUBLIC_SITE_URL || "https://roadd-three.vercel.app";
}

/**
 * Generates an SEO-friendly, tracked property or project URL for WhatsApp
 */
export function generateTrackedPropertyUrl(item: any, type?: "property" | "project"): string {
  const baseUrl = getBaseUrl();
  const isProject =
    type === "project" ||
    item._isProject ||
    item.projectType !== undefined ||
    item.configurations !== undefined;

  const slugOrId = item.slug || item.id || "listing";
  const path = isProject ? `/projects/${slugOrId}` : `/properties/${slugOrId}`;

  // Add UTM tracking parameters
  const url = new URL(path, baseUrl);
  url.searchParams.set("utm_source", "whatsapp");
  url.searchParams.set("utm_medium", "property_share");
  url.searchParams.set("utm_campaign", isProject ? "project_share" : "property_share");
  if (item.id) {
    url.searchParams.set("ref", getRefId(item));
  }

  return url.toString();
}

/**
 * Formats a professional, high-converting WhatsApp message for ROAD listings
 */
export function formatWhatsAppPropertyMessage(item: any, type?: "property" | "project"): {
  text: string;
  url: string;
  refId: string;
  title: string;
} {
  const isProject =
    type === "project" ||
    item._isProject ||
    item.projectType !== undefined ||
    item.configurations !== undefined;

  const refId = getRefId(item);
  const title = (item.title || item.name || "Exclusive Listing").trim();

  // Price formatting
  let priceFormatted = "Price on Request";
  if (typeof item.price === "number" && item.price > 0) {
    priceFormatted =
      item.listingType === "rent" || item.listingType === "pg"
        ? `${formatINR(item.price)}/month`
        : formatPriceCompact(item.price);
  } else if (item.configurations && Array.isArray(item.configurations) && item.configurations.length > 0) {
    const min = item.configurations[0]?.priceMin;
    const max = item.configurations[0]?.priceMax || min;
    if (min) {
      priceFormatted = min === max ? formatPriceCompact(min) : `${formatPriceCompact(min)} – ${formatPriceCompact(max)}`;
    }
  }

  // Location
  const locality = item.location?.locality || item.location?.address || "";
  const city = item.location?.city || "Andhra Pradesh";
  const locationFormatted = locality ? `${locality}, ${city}` : city;

  // Specs & BHK
  const specs: string[] = [];
  if (item.bedrooms) specs.push(`🛏 ${item.bedrooms} BHK`);
  if (item.bathrooms) specs.push(`🚿 ${item.bathrooms} Baths`);
  const areaValue = item.area || item.builtUpArea || item.areaSqFt;
  if (areaValue) specs.push(`📐 ${Number(areaValue).toLocaleString()} sq.ft`);
  if (item.projectType || item.propertyType) {
    specs.push(`🏢 ${String(item.projectType || item.propertyType).toUpperCase()}`);
  }

  // Verification & Highlights
  const isVerified = Boolean(
    item.verified ||
    item.isVerified ||
    item.reraApproved ||
    item.reraId ||
    item.crdaApproved
  );
  const verifiedBadge = isVerified ? "✓ Verified on ROAD" : "";

  // Short description (first 140 chars)
  const rawDesc = item.tagline || item.description || "";
  const cleanDesc = rawDesc.replace(/<[^>]*>?/gm, "").slice(0, 140).trim();

  const propertyUrl = generateTrackedPropertyUrl(item, type);

  // Structured message layout matching ROAD luxury identity
  const lines: string[] = [
    `🏠 *${title}* — *${priceFormatted}*`,
    `📍 *Location:* ${locationFormatted}`,
    `🆔 *Ref ID:* ${refId}`,
  ];

  if (specs.length > 0) {
    lines.push(`📐 ${specs.join("  •  ")}`);
  }

  if (verifiedBadge) {
    lines.push(verifiedBadge);
  }

  if (cleanDesc) {
    lines.push(`\n"${cleanDesc}${rawDesc.length > 140 ? "..." : ""}"`);
  }

  lines.push(
    `\n✨ *View full property details, photos & walkthrough:*`,
    propertyUrl
  );

  return {
    text: lines.join("\n"),
    url: propertyUrl,
    refId,
    title,
  };
}

/**
 * Triggers client-side share event analytics
 */
export async function trackWhatsAppShare(propertyId: string, refId: string, source: string = "web") {
  try {
    if (typeof window !== "undefined" && typeof fetch === "function") {
      fetch("/api/analytics/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "property_whatsapp_share",
          propertyId,
          refId,
          source,
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {});
    }
  } catch {}
}

/**
 * Mode 1: Opens WhatsApp share with encoded message or direct recipient phone
 */
export function shareOnWhatsApp({
  item,
  type,
  recipientPhone,
  source = "card",
}: WhatsAppShareOptions) {
  if (!item) return;

  const { text, refId, title } = formatWhatsAppPropertyMessage(item, type);
  trackWhatsAppShare(item.id, refId, source);

  const encodedText = encodeURIComponent(text);

  let whatsappUrl = "";
  if (recipientPhone && recipientPhone.trim()) {
    const cleanPhone = recipientPhone.replace(/\D/g, "");
    whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;
  } else {
    // Standard WhatsApp Share deep link
    whatsappUrl = `https://wa.me/?text=${encodedText}`;
  }

  if (typeof window !== "undefined") {
    // Try opening WhatsApp in new tab/window
    const newWindow = window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    if (!newWindow || newWindow.closed || typeof newWindow.closed === "undefined") {
      // Fallback redirect if popup blocked
      window.location.href = whatsappUrl;
    }
    toast.success(`Opening WhatsApp for ${refId} (${title})`);
  }
}
