import { URL } from "url";

export interface ParsedGoogleMapsLocation {
  precision: "pin" | "viewport" | "place_query";
  lat?: number;
  lng?: number;
  placeId?: string;
  placeQuery?: string;
  cid?: string;
  rawUrl: string;
  finalUrl: string;
}

const ALLOWED_HOSTS = new Set([
  "maps.google.com",
  "www.google.com",
  "google.com",
  "maps.app.goo.gl",
  "goo.gl",
  "maps.google.co.in",
  "google.co.in",
  "www.google.co.in",
]);

const PRIVATE_IP_REGEX = /^(127\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.|169\.254\.|::1|0\.0\.0\.0|localhost)/i;

/**
 * Validates that a URL is safe against SSRF attacks.
 */
export function isSafeMapsUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== "https:") return false;
    if (parsed.port && parsed.port !== "443") return false;

    const hostname = parsed.hostname.toLowerCase();
    if (PRIVATE_IP_REGEX.test(hostname)) return false;

    // Must be in allowed hosts or a subdomain of google.com / goo.gl
    const isAllowedHost =
      ALLOWED_HOSTS.has(hostname) ||
      hostname.endsWith(".google.com") ||
      hostname.endsWith(".google.co.in");

    return isAllowedHost;
  } catch {
    return false;
  }
}

/**
 * Follows HTTP redirects safely for Google Maps short links (max 5 hops)
 */
export async function unfurlShortLink(initialUrl: string, maxHops = 5): Promise<string> {
  let currentUrl = initialUrl;
  let hops = 0;

  while (hops < maxHops) {
    if (!isSafeMapsUrl(currentUrl)) {
      throw new Error(`SSRF_BLOCKED: URL target not allowed (${currentUrl})`);
    }

    // If it's not a shortlink domain, no need to unfurl further
    const parsed = new URL(currentUrl);
    if (!parsed.hostname.includes("goo.gl")) {
      return currentUrl;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const res = await fetch(currentUrl, {
        method: "HEAD",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) RoadfacingMaps/1.0",
        },
      });

      const location = res.headers.get("location");
      if ([301, 302, 303, 307, 308].includes(res.status) && location) {
        const nextUrl = new URL(location, currentUrl).toString();
        currentUrl = nextUrl;
        hops++;
      } else {
        return currentUrl;
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        throw new Error("UPSTREAM_TIMEOUT: Shortlink redirect resolution timed out");
      }
      return currentUrl;
    } finally {
      clearTimeout(timeout);
    }
  }

  return currentUrl;
}

/**
 * Parses coordinates and place identifiers from any Google Maps link with strict precision priority:
 * 1. !3d{lat}!4d{lng} -> "pin" (exact marker coordinate placed by user)
 * 2. ?q=lat,lng, ?ll=lat,lng, query=lat,lng, or raw "lat, lng" -> "pin"
 * 3. place_id: / query_place_id= / ftid= / cid= -> "pin" (requires Places details)
 * 4. /maps/place/{NAME}/ -> "place_query" (requires Places search)
 * 5. @lat,lng -> "viewport" (approximate camera center ONLY, UI must warn)
 */
export function parseGoogleMapsUrlSync(rawInput: string): ParsedGoogleMapsLocation | null {
  const input = rawInput.trim();
  if (!input) return null;

  // Check if raw input is just comma-separated coordinates: "16.5062, 80.6480"
  const rawCoordMatch = input.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (rawCoordMatch) {
    const lat = parseFloat(rawCoordMatch[1]);
    const lng = parseFloat(rawCoordMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return {
        precision: "pin",
        lat,
        lng,
        rawUrl: input,
        finalUrl: input,
      };
    }
  }

  // 1. Check for exact pin coords in URL: !3d{lat}!4d{lng} (HIGHEST PRIORITY)
  const pinMatch = input.match(/!3d(-?\d+(?:\.\d+)+)!4d(-?\d+(?:\.\d+)+)/);
  if (pinMatch) {
    const lat = parseFloat(pinMatch[1]);
    const lng = parseFloat(pinMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) {
      return {
        precision: "pin",
        lat,
        lng,
        rawUrl: input,
        finalUrl: input,
      };
    }
  }

  // 2. Check query parameters: ?q=lat,lng or ?ll=lat,lng or query=lat,lng
  const qCoordMatch = input.match(/[?&](?:q|ll|query)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i);
  if (qCoordMatch) {
    const lat = parseFloat(qCoordMatch[1]);
    const lng = parseFloat(qCoordMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) {
      return {
        precision: "pin",
        lat,
        lng,
        rawUrl: input,
        finalUrl: input,
      };
    }
  }

  // 3. Check for Place ID, ftid, or CID
  const placeIdMatch = input.match(/[?&](?:place_id|query_place_id)=([A-Za-z0-9_-]+)/i);
  if (placeIdMatch) {
    return {
      precision: "pin",
      placeId: placeIdMatch[1],
      rawUrl: input,
      finalUrl: input,
    };
  }

  const cidMatch = input.match(/[?&]cid=([0-9]+)/i);
  if (cidMatch) {
    return {
      precision: "pin",
      cid: cidMatch[1],
      rawUrl: input,
      finalUrl: input,
    };
  }

  // 4. Check for /maps/place/{NAME}/
  const placeNameMatch = input.match(/\/maps\/place\/([^/@?]+)/i);
  let placeQuery: string | undefined;
  if (placeNameMatch && placeNameMatch[1]) {
    try {
      placeQuery = decodeURIComponent(placeNameMatch[1].replace(/\+/g, " ")).trim();
    } catch {
      placeQuery = placeNameMatch[1].replace(/\+/g, " ").trim();
    }
  }

  // 5. Check for @lat,lng viewport camera center (LOWEST PRIORITY)
  const viewportMatch = input.match(/@(-?\d+(?:\.\d+)+),(-?\d+(?:\.\d+)+)/);
  if (viewportMatch) {
    const lat = parseFloat(viewportMatch[1]);
    const lng = parseFloat(viewportMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) {
      return {
        precision: placeQuery ? "place_query" : "viewport",
        lat,
        lng,
        placeQuery,
        rawUrl: input,
        finalUrl: input,
      };
    }
  }

  if (placeQuery) {
    return {
      precision: "place_query",
      placeQuery,
      rawUrl: input,
      finalUrl: input,
    };
  }

  return null;
}

/**
 * Full parsing pipeline: unfurls shortlinks if needed, then parses URL structure.
 */
export async function parseGoogleMapsUrl(rawUrl: string): Promise<ParsedGoogleMapsLocation> {
  const cleanInput = rawUrl.trim();
  if (!cleanInput) {
    throw new Error("INVALID_URL: Empty URL provided");
  }

  let finalUrl = cleanInput;
  if (cleanInput.startsWith("http://") || cleanInput.startsWith("https://")) {
    if (!isSafeMapsUrl(cleanInput)) {
      throw new Error("SSRF_BLOCKED: URL target is not an allowed Google Maps endpoint");
    }
    finalUrl = await unfurlShortLink(cleanInput);
  }

  const result = parseGoogleMapsUrlSync(finalUrl);
  if (!result) {
    throw new Error("NOT_FOUND: Could not extract coordinates or place identifiers from link");
  }

  return {
    ...result,
    rawUrl: cleanInput,
    finalUrl,
  };
}

