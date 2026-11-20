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
 * If in production and misconfigured to localhost, safely resolves to Vercel production domain.
 */
export function getPublicSiteUrl(): string {
  let rawUrl = (
    process.env.PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    ""
  ).trim();

  const isProduction =
    process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";

  // If in production and environment variable contains localhost or is missing,
  // resolve via Vercel system environment variables or canonical production domain
  if (isProduction && (!rawUrl || rawUrl.includes("localhost") || rawUrl.includes("127.0.0.1"))) {
    if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
      rawUrl = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
    } else if (process.env.VERCEL_URL) {
      rawUrl = `https://${process.env.VERCEL_URL}`;
    } else {
      rawUrl = "https://roadd-three.vercel.app";
    }
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
