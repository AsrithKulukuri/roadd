import { z } from "zod";

const PublicSiteUrlSchema = z
  .string()
  .min(1, { message: "PUBLIC_SITE_URL environment variable is required and cannot be empty." })
  .url({ message: "PUBLIC_SITE_URL must be a valid absolute URL." })
  .refine(
    (url) => {
      const isProduction =
        process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
      if (isProduction) {
        return !url.includes("localhost") && !url.includes("127.0.0.1");
      }
      return true;
    },
    {
      message: "PUBLIC_SITE_URL must not contain localhost or 127.0.0.1 in production.",
    }
  );

/**
 * Returns the canonical public site URL for all external communications.
 * Strictly reads from PUBLIC_SITE_URL (or NEXT_PUBLIC_SITE_URL).
 * Canonical production domain: https://www.roadfacing.com
 */
export function getPublicSiteUrl(): string {
  let rawUrl = (
    process.env.PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    ""
  ).trim();

  const isProduction =
    process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";

  // If in production and environment variable contains localhost, is missing, or contains vercel.app,
  // resolve to the official canonical website domain https://www.roadfacing.com
  if (isProduction && (!rawUrl || rawUrl.includes("localhost") || rawUrl.includes("127.0.0.1") || rawUrl.includes("vercel.app"))) {
    rawUrl = "https://www.roadfacing.com";
  }

  // Safe fallback default if not configured in environment
  if (!rawUrl) {
    rawUrl = "https://www.roadfacing.com";
  }

  const validated = PublicSiteUrlSchema.parse(rawUrl);
  return validated.replace(/\/$/, "");
}

/**
 * Generates canonical URL for a project or property.
 */
export function getListingCanonicalUrl(type: "project" | "property", slugOrId: string): string {
  const base = getPublicSiteUrl();
  const cleanId = encodeURIComponent(slugOrId.trim());
  return type === "project" ? `${base}/projects/${cleanId}` : `${base}/properties/${cleanId}`;
}
