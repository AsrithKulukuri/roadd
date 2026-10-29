/**
 * ROAD Platform — WhatsApp Messaging & Sharing Utility
 * Handles WhatsApp link generation, rich message formatting, UTM tracking, and deep links.
 */

import { formatINR, formatPriceCompact, formatAvailableBhk } from "../utils";
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

  return process.env.NEXT_PUBLIC_SITE_URL || "https://www.roadfacing.com";
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

  // Extract raw configs
  const rawConfigs = item.configurations || item._originalProjectData?.configurations;
  const configs: any[] = Array.isArray(rawConfigs) ? rawConfigs : [];

  // Helper for single price formatting (handles Lakh / Cr without truncation)
  const formatProjectPrice = (num: number): string => {
    if (num >= 10000000) {
      const cr = num / 10000000;
      return `₹${cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(2).replace(/\.?0+$/, "")} Cr`;
    }
    if (num >= 100000) {
      const lakh = num / 100000;
      return `₹${lakh % 1 === 0 ? lakh.toFixed(0) : lakh.toFixed(2).replace(/\.?0+$/, "")} Lakh`;
    }
    return formatPriceCompact(num);
  };

  // Price formatting
  let priceFormatted = "Price on Request";
  if (configs.length > 0) {
    const allPrices = configs.flatMap((c: any) => [c.priceMin, c.priceMax]).filter((p): p is number => typeof p === "number" && p > 0);
    if (allPrices.length > 0) {
      const min = Math.min(...allPrices);
      const max = Math.max(...allPrices);
      if (min === max) {
        priceFormatted = formatProjectPrice(min);
      } else {
        priceFormatted = `${formatProjectPrice(min)} – ${formatProjectPrice(max)}`;
      }
    }
  } else if (typeof item.price === "number" && item.price > 0) {
    priceFormatted =
      item.listingType === "rent" || item.listingType === "pg"
        ? `${formatINR(item.price)}/mo`
        : formatPriceCompact(item.price);
  } else if ((item.priceMin || item.minPrice) && (item.priceMax || item.maxPrice)) {
    const min = item.priceMin || item.minPrice;
    const max = item.priceMax || item.maxPrice;
    priceFormatted = min === max ? formatProjectPrice(min) : `${formatProjectPrice(min)} – ${formatProjectPrice(max)}`;
  }

  // Location
  const locality = item.location?.locality || item.location?.address || "";
  const city = item.location?.city || "Andhra Pradesh";
  const locationFormatted = locality ? `${locality}, ${city}` : city;

  // Key highlights
  const bullets: string[] = [];

  if (isProject) {
    const orig = item._originalProjectData;
    const rawProjType = (item.projectType || orig?.projectType || item.propertyType || "Project").toLowerCase();
    const isPlots = rawProjType.includes("venture") || rawProjType.includes("plot");
    const isVilla = rawProjType.includes("villa");

    let pType = "Project";
    if (isPlots) pType = "Plot / Layout";
    else if (isVilla) pType = "Villa";
    else if (rawProjType.includes("apartment") || rawProjType.includes("flat")) pType = "Apartment";
    else if (item.projectType) {
      pType = String(item.projectType).charAt(0).toUpperCase() + String(item.projectType).slice(1);
    }
    bullets.push(`• Type: ${pType}`);

    // Configuration / BHK summary
    if (configs.length > 0) {
      const configLabels = configs.map((c: any) => c.label).filter(Boolean);
      const formattedBhk = formatAvailableBhk(configLabels);
      if (formattedBhk) {
        bullets.push(`• Configuration: ${formattedBhk}`);
      } else {
        const bedVals = configs
          .map((c: any) => c.bedrooms)
          .filter((b: any): b is number => typeof b === "number" && b > 0);
        if (bedVals.length > 0) {
          const minBed = Math.min(...bedVals);
          const maxBed = Math.max(...bedVals);
          bullets.push(`• Configuration: ${minBed === maxBed ? `${minBed} BHK` : `${minBed} - ${maxBed} BHK`}`);
        }
      }
    } else if (item.bedrooms) {
      bullets.push(`• Configuration: ${item.bedrooms} BHK`);
    }

    // Sft / Area Range
    const areaUnit = isPlots ? "sq.yd" : "sq.ft";
    if (configs.length > 0) {
      const allAreas = configs
        .flatMap((c: any) => isPlots
          ? [c.plotSizeMin, c.plotSizeMax]
          : [c.superBuiltUpAreaMin, c.superBuiltUpAreaMax, c.builtUpAreaMin, c.builtUpAreaMax, c.plinthAreaMin, c.plinthAreaMax, c.area]
        )
        .filter((a: any): a is number => typeof a === "number" && a > 0);

      if (allAreas.length > 0) {
        const minArea = Math.min(...allAreas);
        const maxArea = Math.max(...allAreas);
        const areaStr = minArea === maxArea
          ? `${minArea.toLocaleString("en-IN")} ${areaUnit}`
          : `${minArea.toLocaleString("en-IN")} - ${maxArea.toLocaleString("en-IN")} ${areaUnit}`;
        bullets.push(`• Built-up / Size: ${areaStr}`);
      }
    }

    const totalAreaVal = item.totalArea || orig?.totalArea || (item.location as any)?.totalArea;
    if (totalAreaVal) {
      bullets.push(`• Total Area: ${String(totalAreaVal).replace(/[`'"]/g, "").trim()}`);
    }

    const totalUnitsVal = item.totalUnits || orig?.totalUnits;
    if (totalUnitsVal) {
      bullets.push(`• Total Units: ${totalUnitsVal}`);
    }
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
 * Generates the clean WhatsApp wa.me share URL with formatted listing text
 */
export function getWhatsAppShareUrl({
  item,
  type,
  recipientPhone,
}: WhatsAppShareOptions): string {
  if (!item) return "";

  const { text } = formatWhatsAppPropertyMessage(item, type);
  const encodedText = encodeURIComponent(text);

  if (recipientPhone && recipientPhone.trim()) {
    const cleanPhone = formatWhatsAppPhone(recipientPhone);
    return `https://wa.me/${cleanPhone}?text=${encodedText}`;
  }

  return `https://wa.me/?text=${encodedText}`;
}

/**
 * Mode 1: Opens WhatsApp share with encoded message or direct recipient phone
 * Desktop: opens in a new tab.
 * Mobile: triggers WhatsApp app if installed, or web fallback in a new tab.
 * The active page and scroll position remain completely intact.
 */
export function shareOnWhatsApp({
  item,
  type,
  recipientPhone,
  source = "card",
}: WhatsAppShareOptions) {
  if (!item) return;

  const { refId, title } = formatWhatsAppPropertyMessage(item, type);
  trackWhatsAppShare(item.id, refId, source);

  const whatsappUrl = getWhatsAppShareUrl({ item, type, recipientPhone });
  if (!whatsappUrl || typeof window === "undefined") return;

  // CRITICAL RULE: Under NO circumstances redirect the active window/tab (`window.location.href`).
  // The current ROAD property page must always remain completely intact and active.
  let opened = false;

  // Method 1: Programmatic anchor dispatch with target="_blank" and rel="noopener noreferrer"
  // This triggers mobile OS Universal Links / App Links while guaranteeing the current tab is untouched.
  try {
    const anchor = document.createElement("a");
    anchor.href = whatsappUrl;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.style.position = "fixed";
    anchor.style.top = "-9999px";
    anchor.style.left = "-9999px";
    anchor.style.opacity = "0";
    anchor.style.pointerEvents = "none";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    opened = true;
  } catch {
    opened = false;
  }

  // Method 2: Fallback to window.open in a new tab if anchor click was not allowed
  if (!opened) {
    try {
      const newWin = window.open(whatsappUrl, "_blank");
      if (newWin) {
        newWin.opener = null;
        opened = true;
      }
    } catch {
      opened = false;
    }
  }

  if (opened) {
    toast.success(`Opening WhatsApp for ${refId} (${title})`);
  } else {
    toast.info(`Opening WhatsApp... If blocked by browser, please allow popups.`);
  }
}

