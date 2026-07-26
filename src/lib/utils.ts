import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a number as Indian Rupee currency with lakh/crore grouping.
 * Examples:
 *   formatINR(8500000) => "₹85,00,000"
 *   formatINR(15000000) => "₹1,50,00,000"
 *   formatINR(2500) => "₹2,500"
 */
export function formatINR(amount: number): string {
  const formatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return formatter.format(amount);
}

/**
 * Formats price in compact Indian notation (L for Lakh, Cr for Crore).
 * Examples:
 *   formatPriceCompact(8500000) => "₹85L"
 *   formatPriceCompact(15000000) => "₹1.5Cr"
 *   formatPriceCompact(250000000) => "₹25Cr"
 */
export function formatPriceCompact(amount: number): string {
  if (amount >= 10000000) {
    const crore = amount / 10000000;
    const formatted =
      crore % 1 === 0 ? crore.toFixed(0) : crore.toFixed(1).replace(/\.0$/, "");
    return `₹${formatted}Cr`;
  }
  if (amount >= 100000) {
    const lakh = amount / 100000;
    const formatted =
      lakh % 1 === 0 ? lakh.toFixed(0) : lakh.toFixed(1).replace(/\.0$/, "");
    return `₹${formatted}L`;
  }
  if (amount >= 1000) {
    const thousands = amount / 1000;
    const formatted =
      thousands % 1 === 0
        ? thousands.toFixed(0)
        : thousands.toFixed(1).replace(/\.0$/, "");
    return `₹${formatted}K`;
  }
  return `₹${amount}`;
}

/**
 * Formats area with unit label.
 * @param sqft - Area in square feet
 * @param unit - Display unit (sqft or sqm)
 */

/**
 * Extracts and formats YouTube video embed URLs from any format:
 * Standard watch URLs, Share (youtu.be) links, Shorts, Live streams, or raw 11-char IDs.
 */
export function getYoutubeEmbedUrl(url?: string): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // 1. YouTube Shorts: youtube.com/shorts/VIDEO_ID
  const shortsMatch = trimmed.match(/(?:youtube\.com|youtu\.be)\/shorts\/([a-zA-Z0-9_-]{11})/i);
  if (shortsMatch && shortsMatch[1]) return `https://www.youtube.com/embed/${shortsMatch[1]}`;

  // 2. YouTube Live: youtube.com/live/VIDEO_ID
  const liveMatch = trimmed.match(/(?:youtube\.com|youtu\.be)\/live\/([a-zA-Z0-9_-]{11})/i);
  if (liveMatch && liveMatch[1]) return `https://www.youtube.com/embed/${liveMatch[1]}`;

  // 3. YouTube Embed: youtube.com/embed/VIDEO_ID
  const embedMatch = trimmed.match(/(?:youtube\.com|youtu\.be)\/embed\/([a-zA-Z0-9_-]{11})/i);
  if (embedMatch && embedMatch[1]) return `https://www.youtube.com/embed/${embedMatch[1]}`;

  // 4. Standard watch / youtu.be share URLs
  const standardMatch = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:v\/|watch\?v=|watch\?.+&v=))([a-zA-Z0-9_-]{11})/i);
  if (standardMatch && standardMatch[1]) return `https://www.youtube.com/embed/${standardMatch[1]}`;

  // 5. Raw 11-char Video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return `https://www.youtube.com/embed/${trimmed}`;

  return null;
}

/**
 * Checks if a given video URL is a vertical YouTube Short.
 */
export function isYoutubeShort(url?: string): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  return /(?:youtube\.com|youtu\.be)\/shorts\//i.test(trimmed) || /shorts/i.test(trimmed);
}

/**
 * Extracts latitude and longitude from any Google Maps share URL, place URL, or raw coordinates.
 * Supports: @lat,lng, ?q=lat,lng, ?ll=lat,lng, /place/lat,lng, or 16.5062, 80.6480.
 */
export function parseGoogleMapsUrl(url?: string): { latitude: number; longitude: number } | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // 1. Pattern: @16.5062,80.6480
  const atMatch = trimmed.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) return { latitude: lat, longitude: lng };
  }

  // 2. Pattern: ?q=16.5062,80.6480 or ?ll=16.5062,80.6480 or /place/16.5062,80.6480 or center=16.5062,80.6480
  const paramMatch = trimmed.match(/(?:q|ll|query|center|place)=(-?\d+\.\d+),(-?\d+\.\d+)/i) ||
                     trimmed.match(/\/(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (paramMatch) {
    const lat = parseFloat(paramMatch[1]);
    const lng = parseFloat(paramMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) return { latitude: lat, longitude: lng };
  }

  // 3. Pattern: 16.5062, 80.6480
  const rawMatch = trimmed.match(/^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/);
  if (rawMatch) {
    const lat = parseFloat(rawMatch[1]);
    const lng = parseFloat(rawMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) return { latitude: lat, longitude: lng };
  }

  // 4. Pattern: !3d16.5062451!4d80.6480123 (Google Maps Place Data Embeds)
  const dMatch = trimmed.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (dMatch) {
    const lat = parseFloat(dMatch[1]);
    const lng = parseFloat(dMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) return { latitude: lat, longitude: lng };
  }

  return null;
}
export function formatArea(sqft: number, unit: "sqft" | "sqm" = "sqft"): string {
  if (unit === "sqm") {
    const sqm = Math.round(sqft * 0.092903);
    return `${new Intl.NumberFormat("en-IN").format(sqm)} sq.m`;
  }
  return `${new Intl.NumberFormat("en-IN").format(sqft)} sq.ft`;
}

/**
 * Formats area in acres (for plots/land).
 */
export function formatAcres(sqft: number): string {
  const acres = sqft / 43560;
  if (acres < 1) {
    return `${(acres * 100).toFixed(0)} cents`;
  }
  return `${acres.toFixed(2)} acres`;
}

/**
 * Formats a phone number in Indian format.
 */
export function formatPhoneIN(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  return phone;
}

/**
 * Formats a number using Indian locale.
 */
export function formatNumberIN(num: number): string {
  return new Intl.NumberFormat("en-IN").format(num);
}

/**
 * Formats a date using Indian locale.
 */
export function formatDateIN(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

/**
 * Formats relative time (e.g., "2 hours ago", "3 days ago").
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffWeek < 4) return `${diffWeek}w ago`;
  if (diffMonth < 12) return `${diffMonth}mo ago`;
  return formatDateIN(d);
}

/**
 * Generate a slug from a string.
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Truncate text to a maximum length with ellipsis.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength).trim() + "…";
}

/**
 * Calculate EMI for Indian home loans.
 * @param principal - Loan amount in INR
 * @param annualRate - Annual interest rate (e.g., 8.5 for 8.5%)
 * @param tenureYears - Loan tenure in years
 * @returns Monthly EMI amount
 */
export function calculateEMI(
  principal: number,
  annualRate: number,
  tenureYears: number
): number {
  const monthlyRate = annualRate / 12 / 100;
  const months = tenureYears * 12;
  if (monthlyRate === 0) return principal / months;
  const emi =
    (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
    (Math.pow(1 + monthlyRate, months) - 1);
  return Math.round(emi);
}

/**
 * Generate amortization schedule for EMI calculator.
 */
export function generateAmortizationSchedule(
  principal: number,
  annualRate: number,
  tenureYears: number
): Array<{
  year: number;
  principalPaid: number;
  interestPaid: number;
  balance: number;
}> {
  const monthlyRate = annualRate / 12 / 100;
  const months = tenureYears * 12;
  const emi = calculateEMI(principal, annualRate, tenureYears);
  let balance = principal;
  const schedule: Array<{
    year: number;
    principalPaid: number;
    interestPaid: number;
    balance: number;
  }> = [];

  for (let year = 1; year <= tenureYears; year++) {
    let yearPrincipal = 0;
    let yearInterest = 0;
    for (let month = 0; month < 12; month++) {
      if (balance <= 0) break;
      const interest = balance * monthlyRate;
      const principalPart = Math.min(emi - interest, balance);
      yearPrincipal += principalPart;
      yearInterest += interest;
      balance -= principalPart;
    }
    schedule.push({
      year,
      principalPaid: Math.round(yearPrincipal),
      interestPaid: Math.round(yearInterest),
      balance: Math.max(0, Math.round(balance)),
    });
  }

  return schedule;
}

/**
 * Debounce utility.
 */
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), wait);
  };
}
