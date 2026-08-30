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
 * Generates an SEO-friendly, clean property or project URL for WhatsApp
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

  return `${baseUrl}${path}`;
}

/**
 * Formats a clean, luxury, organized WhatsApp message for ROAD listings
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
        ? `${formatINR(item.price)}/mo`
        : formatPriceCompact(item.price);
  } else if (item.configurations && Array.isArray(item.configurations) && item.configurations.length > 0) {
    const allPrices = item.configurations.flatMap((c: any) => [c.priceMin, c.priceMax]).filter(Boolean);
    if (allPrices.length > 0) {
      const min = Math.min(...allPrices);
      const max = Math.max(...allPrices);
      priceFormatted = min >= 10000000 
        ? `₹${(min / 10000000).toFixed(2)} Cr${max && max !== min ? ` – ₹${(max / 10000000).toFixed(2)} Cr` : ""}`
        : `₹${(min / 100000).toFixed(2)} Lakh`;
    }
  }

  // Location
  const locality = item.location?.locality || item.location?.address || "";
  const city = item.location?.city || "Andhra Pradesh";
  const locationFormatted = locality ? `${locality}, ${city}` : city;

  // Key highlights
  const bullets: string[] = [];

  if (isProject) {
    const pType = item.projectType ? String(item.projectType).charAt(0).toUpperCase() + String(item.projectType).slice(1) : "Project";
    bullets.push(`• Type: ${pType}`);
    if (item.totalArea) bullets.push(`• Total Area: ${item.totalArea}`);
    if (item.totalUnits) bullets.push(`• Total Units: ${item.totalUnits}`);
  } else {
    const specs: string[] = [];
    if (item.bedrooms) specs.push(`${item.bedrooms} BHK`);
    if (item.bathrooms) specs.push(`${item.bathrooms} Baths`);
    const areaVal = item.area || item.builtUpArea || item.areaSqFt;
    if (areaVal) specs.push(`${Number(areaVal).toLocaleString()} sq.ft`);
    if (specs.length > 0) bullets.push(`• Specs: ${specs.join(" • ")}`);
    if (item.propertyType) {
      const propType = String(item.propertyType).replace("-", " ");
      bullets.push(`• Type: ${propType.charAt(0).toUpperCase() + propType.slice(1)}`);
    }
  }

  bullets.push(`• Ref ID: ${refId}`);
  bullets.push(`• Status: Verified on ROAD`);

  const propertyUrl = generateTrackedPropertyUrl(item, type);

  // Clean, organized, luxury layout
  const lines: string[] = [
    `*${title}*`,
    `💰 *${priceFormatted}*`,
    `📍 ${locationFormatted}`,
    ``,
    ...bullets,
    ``,
    `Explore complete details & photos:`,
    propertyUrl,
  ];

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
 * Formats any phone number into standard international format for WhatsApp wa.me links
 * e.g., "8885005567" -> "918885005567"
 *       "+91 88850 05567" -> "918885005567"
 *       "08885005567" -> "918885005567"
 */
export function formatWhatsAppPhone(phone?: string | null): string {
  if (!phone) return "";
  let digits = String(phone).replace(/\D/g, "");
  
  // Strip leading zero if 11 digits (e.g. 08885005567)
  if (digits.startsWith("0") && digits.length === 11) {
    digits = digits.slice(1);
  }
  
  // Standard 10-digit Indian numbers default to country code 91
  if (digits.length === 10) {
    digits = `91${digits}`;
  }
  
  return digits;
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
    const cleanPhone = formatWhatsAppPhone(recipientPhone);
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
