import { NextResponse } from "next/server";
import { parseGoogleMapsUrl, isValidCoordinateRange } from "@/lib/utils";

const MAX_REDIRECTS = 5;
const MAX_MAPS_RESPONSE_BYTES = 2 * 1024 * 1024; // 2MB limit

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

/**
 * SSRF Protection: Checks if hostname resolves to private, loopback, link-local,
 * cloud metadata (e.g. AWS 169.254.169.254), or local network addresses.
 */
function isPrivateOrLocalIp(hostname: string): boolean {
  const host = hostname.toLowerCase().trim();

  // Localhost and internal domains
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".localhost")
  ) {
    return true;
  }

  // Reject IPv6 / bracketed addresses
  if (host.startsWith("[") || host.includes(":")) {
    return true;
  }

  // Reject IPv4 addresses and numeric host encodings (Google Maps will never be an IP address)
  const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = host.match(ipv4Pattern);
  if (match) {
    const [, a, b, c, d] = match.map(Number);
    // Range sanity check
    if (a > 255 || b > 255 || c > 255 || d > 255) return true;
    // Private & loopback ranges:
    if (a === 0 || a === 10 || a === 127) return true; // 0.0.0.0/8, 10.0.0.0/8, 127.0.0.0/8
    if (a === 169 && b === 254) return true; // 169.254.0.0/16 Link-local / AWS / GCP metadata
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
    if (a >= 224) return true; // Multicast / reserved
    return true; // Block ALL IP literals
  }

  // Decimal / hex IP representations (e.g. 2130706433 or 0x7f000001)
  if (/^(?:0x[0-9a-f]+|\d+)$/i.test(host)) {
    return true;
  }

  return false;
}

/**
 * Validates that the hostname is an authentic Google Maps domain.
 * Accepts:
 * - maps.app.goo.gl, goo.gl, g.co
 * - google.com, maps.google.com, www.google.com, consent.google.com
 * - google.co.in, maps.google.co.in, www.google.co.in, and international Google ccTLDs
 */
function isAllowedGoogleHost(hostname: string): boolean {
  const host = hostname.toLowerCase().trim();

  if (isPrivateOrLocalIp(host)) {
    return false;
  }

  // Shortlink domains
  if (host === "maps.app.goo.gl" || host === "goo.gl" || host === "g.co") {
    return true;
  }

  // Google domains (e.g. google.com, maps.google.com, consent.google.com, google.co.in, maps.google.co.uk)
  // Matches: [subdomain.]google.[tld]
  const googleDomainRegex =
    /^(?:[a-z0-9-]+\.)*google\.(?:com|co\.[a-z]{2}|com\.[a-z]{2}|org\.[a-z]{2}|[a-z]{2,})$/i;
  return googleDomainRegex.test(host);
}

/**
 * Validates protocol, port, credentials, and host for SSRF safety.
 */
function validateSafeGoogleUrl(url: URL): boolean {
  if (url.protocol !== "https:") return false;
  if (url.port !== "" && url.port !== "443") return false;
  if (url.username || url.password) return false;
  return isAllowedGoogleHost(url.hostname);
}

/**
 * Safely parses and normalizes user input into a validated Google URL.
 */
function parseInitialGoogleUrl(value: string): URL | null {
  try {
    let clean = value.trim();
    if (!clean) return null;

    // Auto-prefix protocol if missing
    if (!/^https?:\/\//i.test(clean)) {
      clean = "https://" + clean;
    } else if (clean.startsWith("http://")) {
      clean = "https://" + clean.slice(7);
    }

    const url = new URL(clean);
    return validateSafeGoogleUrl(url) ? url : null;
  } catch {
    return null;
  }
}

/**
 * Safely reads the text of an HTTP response with a strict byte limit.
 */
async function readTextWithLimit(response: Response): Promise<string> {
  const contentLength = Number(response.headers.get("content-length") || "0");
  if (contentLength > MAX_MAPS_RESPONSE_BYTES) {
    throw new Error("Google Maps response is too large.");
  }

  if (!response.body) return response.text();

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let totalBytes = 0;
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_MAPS_RESPONSE_BYTES) {
      await reader.cancel();
      throw new Error("Google Maps response is too large.");
    }
    text += decoder.decode(value, { stream: true });
  }

  return text + decoder.decode();
}

/**
 * Extracts coordinates from an HTML response body (fallback).
 */
function extractCoordsFromHtml(html: string): { latitude: number; longitude: number } | null {
  // 1. Contiguous Protobuf coordinates: !3dLAT!4dLNG
  const match3d4d = html.match(/(?:!|%21)3d(-?\d+(?:\.\d+)?)(?:!|%21)4d(-?\d+(?:\.\d+)?)/);
  if (match3d4d) {
    const lat = parseFloat(match3d4d[1]);
    const lng = parseFloat(match3d4d[2]);
    if (isValidCoordinateRange(lat, lng)) return { latitude: lat, longitude: lng };
  }

  // 2. Google JSON state array with coordinates: [null,null,LAT,LNG]
  const jsonCoords = html.match(/\[null,null,(-?\d+\.\d+),(-?\d+\.\d+)\]/);
  if (jsonCoords) {
    const lat = parseFloat(jsonCoords[1]);
    const lng = parseFloat(jsonCoords[2]);
    if (isValidCoordinateRange(lat, lng)) return { latitude: lat, longitude: lng };
  }

  // NOTE: NEVER match staticmap?center or og:image with center= because Google Maps sets those to the
  // client's current IP geolocation when JavaScript is disabled, which causes false extraction of the user's
  // current location rather than the actual place in the link!
  return null;
}

/**
 * Extracts place name from URL path or query params.
 */
function extractPlaceNameFromUrl(urlStr: string): string {
  try {
    const decoded = decodeURIComponent(urlStr);
    if (decoded.includes("/place/")) {
      const match = decoded.match(/\/place\/([^\/@?#]+)/);
      if (match && match[1]) {
        // If it's just raw coordinates in the path, ignore as place name
        if (!/^-?\d+(?:\.\d+)?[,\s]+-?\d+(?:\.\d+)?$/.test(match[1])) {
          return match[1].replace(/\+/g, " ").trim();
        }
      }
    }
    const qMatch = decoded.match(/[?&]q=([^&#]+)/);
    if (qMatch && qMatch[1]) {
      if (!/^-?\d+(?:\.\d+)?[,\s]+-?\d+(?:\.\d+)?$/.test(qMatch[1])) {
        return qMatch[1].replace(/\+/g, " ").trim();
      }
    }
  } catch {}
  return "";
}

export interface SublocationCandidate {
  name: string;
  type: string;
  confidence: "high" | "medium" | "low";
}

function extractCandidateSublocations(addr: any, city: string): SublocationCandidate[] {
  const candidates: SublocationCandidate[] = [];
  const seen = new Set<string>();

  const normalize = (val: string) => val.trim().toLowerCase();
  const cityNorm = normalize(city || "");

  const addCandidate = (name: any, type: string, confidence: "high" | "medium" | "low") => {
    if (!name || typeof name !== "string") return;
    const clean = name.trim();
    if (!clean || clean.length < 2) return;
    const lower = clean.toLowerCase();

    // Ignore if it's the city name itself or generic administrative labels
    if (lower === cityNorm) return;
    if (
      lower.includes("district") ||
      lower.includes("mandal") ||
      lower.includes("andhra pradesh") ||
      lower.includes("telangana") ||
      lower === "india"
    ) {
      return;
    }
    if (/^\d+$/.test(lower)) return; // Ignore zipcodes

    if (!seen.has(lower)) {
      seen.add(lower);
      candidates.push({ name: clean, type, confidence });
    }
  };

  // 1. High confidence: Suburb, neighbourhood, commercial zone, village
  addCandidate(addr.suburb, "suburb", "high");
  addCandidate(addr.neighbourhood, "neighbourhood", "high");
  addCandidate(addr.commercial, "commercial", "high");
  addCandidate(addr.village, "village", "high");
  addCandidate(addr.hamlet, "hamlet", "high");
  addCandidate(addr.quarter, "quarter", "medium");
  addCandidate(addr.residential, "residential", "medium");
  addCandidate(addr.subdistrict, "subdistrict", "low");
  addCandidate(addr.road, "road", "low");

  return candidates;
}

/**
 * Reverse geocodes coordinates to address details using OpenStreetMap Nominatim.
 */
async function reverseGeocode(
  lat: number,
  lng: number
): Promise<{
  city: string;
  locality: string;
  candidateSublocations: SublocationCandidate[];
  state: string;
  pincode: string;
  address: string;
} | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
      {
        signal: AbortSignal.timeout(4000),
        headers: {
          "Accept-Language": "en",
          "User-Agent": "ROADFacingApp/1.0 (care@roadfacing.com)",
        },
      }
    );

    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const city =
        addr.city || addr.town || addr.village || addr.county || addr.suburb || "";
      const locality =
        addr.suburb ||
        addr.neighbourhood ||
        addr.residential ||
        addr.quarter ||
        addr.town ||
        addr.village ||
        city ||
        "";

      const candidateSublocations = extractCandidateSublocations(addr, city);

      return {
        city,
        locality,
        candidateSublocations,
        state: addr.state || "",
        pincode: addr.postcode || "",
        address: data.display_name || "",
      };
    }
  } catch {}

  // Fallback to Photon reverse API
  try {
    const photonRes = await fetch(
      `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`,
      {
        signal: AbortSignal.timeout(3000),
      }
    );
    if (photonRes.ok) {
      const data = await photonRes.json();
      if (data.features && data.features[0]) {
        const props = data.features[0].properties || {};
        const city = props.city || props.county || props.district || props.state || "";
        const locality = props.locality || props.name || props.street || props.suburb || city;
        const formatted = [props.name, props.street, props.locality || props.city, props.state, props.postcode]
          .filter(Boolean)
          .join(", ");

        const candidateSublocations: SublocationCandidate[] = [];
        const seen = new Set<string>();
        const addProp = (name: any, type: string, confidence: "high" | "medium" | "low") => {
          if (!name || typeof name !== "string") return;
          const clean = name.trim();
          if (!clean || clean.length < 2) return;
          const lower = clean.toLowerCase();
          if (lower === city.toLowerCase()) return;
          if (!seen.has(lower)) {
            seen.add(lower);
            candidateSublocations.push({ name: clean, type, confidence });
          }
        };

        addProp(props.suburb, "suburb", "high");
        addProp(props.locality, "locality", "high");
        addProp(props.name, "place", "medium");
        addProp(props.street, "street", "low");

        return {
          city,
          locality,
          candidateSublocations,
          state: props.state || "",
          pincode: props.postcode || "",
          address: formatted || "",
        };
      }
    }
  } catch {}

  return null;
}

async function geocodeSearch(query: string): Promise<{
  latitude: number;
  longitude: number;
  city: string;
  locality: string;
  state: string;
  pincode: string;
  address: string;
} | null> {
  const clean = (query || "").trim();
  if (!clean) return null;

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(clean)}&format=json&addressdetails=1&limit=1`,
      {
        signal: AbortSignal.timeout(4000),
        headers: {
          "User-Agent": "ROADFacingApp/1.0 (care@roadfacing.com)",
          "Accept-Language": "en",
        },
      }
    );
    if (res.ok) {
      const items = await res.json();
      if (items && items[0]) {
        const lat = parseFloat(items[0].lat);
        const lng = parseFloat(items[0].lon);
        if (isValidCoordinateRange(lat, lng)) {
          const addr = items[0].address || {};
          const city = addr.city || addr.town || addr.village || addr.county || addr.suburb || "";
          const locality = addr.suburb || addr.neighbourhood || addr.residential || addr.quarter || addr.town || addr.village || city;
          return {
            latitude: lat,
            longitude: lng,
            city,
            locality,
            state: addr.state || "",
            pincode: addr.postcode || "",
            address: items[0].display_name || clean,
          };
        }
      }
    }
  } catch {}

  // Fallback to Photon
  try {
    const photonRes = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(clean)}&limit=1`,
      { signal: AbortSignal.timeout(3000) }
    );
    if (photonRes.ok) {
      const pData = await photonRes.json();
      if (pData.features && pData.features[0]) {
        const coords = pData.features[0].geometry?.coordinates;
        if (coords && coords.length >= 2) {
          const lng = coords[0];
          const lat = coords[1];
          const props = pData.features[0].properties || {};
          return {
            latitude: lat,
            longitude: lng,
            city: props.city || props.county || "",
            locality: props.locality || props.name || props.suburb || "",
            state: props.state || "",
            pincode: props.postcode || "",
            address: props.name || clean,
          };
        }
      }
    }
  } catch {}

  return null;
}

async function geocodePlaceAddress(rawAddress: string): Promise<{
  latitude: number;
  longitude: number;
  city: string;
  locality: string;
  candidateSublocations: SublocationCandidate[];
  state: string;
  pincode: string;
  address: string;
} | null> {
  const clean = rawAddress.replace(/\+/g, " ").trim();
  if (!clean) return null;

  // Split into components by comma
  const parts = clean
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  // Progressive search:
  // 1. Try full address
  // 2. If not found, drop leading parts (builder / project title)
  const candidates: string[] = [clean];
  for (let i = 1; i < parts.length; i++) {
    const sub = parts.slice(i).join(", ");
    if (sub.length >= 4) candidates.push(sub);
  }

  // Extract explicit pincode if present (e.g. 521151)
  const pincodeMatch = clean.match(/\b([1-9]\d{5})\b/);
  const explicitPincode = pincodeMatch ? pincodeMatch[1] : "";

  // Check for known AP cities in address
  const knownCities = [
    "Vijayawada",
    "Guntur",
    "Amaravati",
    "Visakhapatnam",
    "Mangalagiri",
    "Tadepalli",
    "Tenali",
    "Hyderabad",
    "Bengaluru",
  ];
  const matchedCity = knownCities.find((c) => clean.toLowerCase().includes(c.toLowerCase())) || "";

  // If a known city is present, construct explicit "part, city, Andhra Pradesh" queries
  if (matchedCity) {
    for (const part of parts) {
      const pLower = part.toLowerCase();
      if (
        pLower !== matchedCity.toLowerCase() &&
        !pLower.includes("andhra") &&
        !pLower.includes("pradesh") &&
        !pLower.includes("realty") &&
        !pLower.includes("builders") &&
        !pLower.includes("developers") &&
        !/^\d+$/.test(pLower)
      ) {
        candidates.push(`${part}, ${matchedCity}, Andhra Pradesh`);
      }
    }
  }

  const uniqueCandidates = Array.from(new Set(candidates));

  for (const candidate of uniqueCandidates) {
    const geo = await geocodeSearch(candidate);
    if (geo && isValidCoordinateRange(geo.latitude, geo.longitude)) {
      // Do reverse geocoding to get full candidate sublocations for these coordinates
      const rev = await reverseGeocode(geo.latitude, geo.longitude);

      // Determine the best locality:
      // If one of the address parts matches a candidate sublocation or is before the city in parts
      let bestLocality = rev?.locality || geo.locality || "";
      if (matchedCity) {
        const cityIndex = parts.findIndex((p) => p.toLowerCase().includes(matchedCity.toLowerCase()));
        if (cityIndex > 0) {
          const prevPart = parts[cityIndex - 1];
          if (
            prevPart &&
            !prevPart.toLowerCase().includes("realty") &&
            !prevPart.toLowerCase().includes("builder") &&
            !prevPart.toLowerCase().includes("road") &&
            !prevPart.toLowerCase().includes("rd")
          ) {
            bestLocality = prevPart;
          }
        }
      }

      return {
        latitude: geo.latitude,
        longitude: geo.longitude,
        city: matchedCity || rev?.city || geo.city,
        locality: bestLocality,
        candidateSublocations: rev?.candidateSublocations || [],
        state: rev?.state || geo.state || "Andhra Pradesh",
        pincode: explicitPincode || rev?.pincode || geo.pincode,
        address: clean,
      };
    }
  }

  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // 1. Direct reverse geocoding via lat and lng
  const latParam = searchParams.get("lat");
  const lngParam = searchParams.get("lng") || searchParams.get("lon");
  if (latParam && lngParam) {
    const lat = parseFloat(latParam);
    const lng = parseFloat(lngParam);
    if (!isNaN(lat) && !isNaN(lng) && isValidCoordinateRange(lat, lng)) {
      const geo = await reverseGeocode(lat, lng);
      return NextResponse.json(
        {
          success: true,
          latitude: lat,
          longitude: lng,
          city: geo?.city || "",
          locality: geo?.locality || "",
          candidateSublocations: geo?.candidateSublocations || [],
          state: geo?.state || "",
          pincode: geo?.pincode || "",
          address: geo?.address || "",
        },
        { headers: CORS_HEADERS }
      );
    }
    return NextResponse.json(
      { error: "Invalid coordinate range" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  // 2. Direct forward geocoding via query (q)
  const queryParam = searchParams.get("q") || searchParams.get("query");
  if (queryParam) {
    const result = await geocodeSearch(queryParam);
    if (result) {
      return NextResponse.json(
        {
          success: true,
          ...result,
        },
        { headers: CORS_HEADERS }
      );
    }
    return NextResponse.json(
      { error: "Could not geocode location" },
      { status: 404, headers: CORS_HEADERS }
    );
  }

  const targetUrl = searchParams.get("url");

  if (!targetUrl || typeof targetUrl !== "string") {
    return NextResponse.json(
      { error: "Missing url, lat/lng, or q parameter" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const trimmed = targetUrl.trim();

  // 1. Direct synchronous check for raw coordinates or @lat,lng in the input string
  const directMatch = parseGoogleMapsUrl(trimmed);
  if (directMatch && isValidCoordinateRange(directMatch.latitude, directMatch.longitude)) {
    const geo = await reverseGeocode(directMatch.latitude, directMatch.longitude);
    return NextResponse.json(
      {
        success: true,
        latitude: directMatch.latitude,
        longitude: directMatch.longitude,
        city: geo?.city || "",
        locality: geo?.locality || "",
        candidateSublocations: geo?.candidateSublocations || [],
        state: geo?.state || "",
        pincode: geo?.pincode || "",
        address: geo?.address || "",
        resolvedUrl: trimmed,
      },
      { headers: CORS_HEADERS }
    );
  }

  // 2. Validate URL format and SSRF guard
  const allowedInitialUrl = parseInitialGoogleUrl(trimmed);
  if (!allowedInitialUrl) {
    return NextResponse.json(
      {
        error:
          "Only valid Google Maps links (e.g. maps.app.goo.gl, maps.google.com, google.com/maps) can be resolved.",
      },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  try {
    let currentUrl = allowedInitialUrl;
    let coords: { latitude: number; longitude: number } | null = null;
    let finalUrl = currentUrl.toString();
    let placeAddress = extractPlaceNameFromUrl(finalUrl);

    // 3. Follow redirects with strict SSRF checking & early coordinate extraction
    for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount++) {
      if (!validateSafeGoogleUrl(currentUrl)) {
        return NextResponse.json(
          { error: "Redirected to an unauthorized or invalid destination." },
          { status: 400, headers: CORS_HEADERS }
        );
      }

      // If Google redirected to consent wall, extract destination from 'continue' param
      if (currentUrl.hostname.toLowerCase().startsWith("consent.google.")) {
        const continueTarget = currentUrl.searchParams.get("continue");
        if (continueTarget) {
          const continueCoords = parseGoogleMapsUrl(continueTarget);
          if (
            continueCoords &&
            isValidCoordinateRange(continueCoords.latitude, continueCoords.longitude)
          ) {
            coords = continueCoords;
            finalUrl = continueTarget;
            placeAddress = placeAddress || extractPlaceNameFromUrl(continueTarget);
            break;
          }
        }
      }

      const response = await fetch(currentUrl.toString(), {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(6000),
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          Cookie: "CONSENT=YES+; SOCS=CAESHAgBEhJnd3NfMjAyNDA2MDktMF9SQzIaAmVuIAEaBgiA_LuuBg",
        },
      });

      // Handle Redirects
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location) break;

        const nextUrl = new URL(location, currentUrl);
        if (!validateSafeGoogleUrl(nextUrl)) {
          return NextResponse.json(
            { error: "Redirected to an unauthorized or invalid destination." },
            { status: 400, headers: CORS_HEADERS }
          );
        }

        finalUrl = nextUrl.toString();
        placeAddress = placeAddress || extractPlaceNameFromUrl(finalUrl);

        // Check if redirect location header already contains coordinates
        const locCoords = parseGoogleMapsUrl(finalUrl);
        if (locCoords && isValidCoordinateRange(locCoords.latitude, locCoords.longitude)) {
          coords = locCoords;
          break; // Coordinates resolved early from redirect header!
        }

        currentUrl = nextUrl;
      } else {
        // Reached destination page (200 OK)
        finalUrl = currentUrl.toString();
        placeAddress = placeAddress || extractPlaceNameFromUrl(finalUrl);

        coords = parseGoogleMapsUrl(finalUrl);
        if (!coords || !isValidCoordinateRange(coords.latitude, coords.longitude)) {
          // Read HTML body fallback
          const html = await readTextWithLimit(response);
          coords = extractCoordsFromHtml(html);
        }
        break;
      }
    }

    // 4. If coordinates resolved, reverse geocode and return
    if (coords && isValidCoordinateRange(coords.latitude, coords.longitude)) {
      const geo = await reverseGeocode(coords.latitude, coords.longitude);
      return NextResponse.json(
        {
          success: true,
          latitude: coords.latitude,
          longitude: coords.longitude,
          city: geo?.city || "",
          locality: geo?.locality || "",
          candidateSublocations: geo?.candidateSublocations || [],
          state: geo?.state || "Andhra Pradesh",
          pincode: geo?.pincode || "",
          address: geo?.address || placeAddress,
          resolvedUrl: finalUrl,
        },
        { headers: CORS_HEADERS }
      );
    }

    // 5. Fallback: If place address was extracted but no coordinates found in link, geocode place address
    if (placeAddress) {
      const geoResult = await geocodePlaceAddress(placeAddress);
      if (geoResult) {
        return NextResponse.json(
          {
            success: true,
            latitude: geoResult.latitude,
            longitude: geoResult.longitude,
            city: geoResult.city || "",
            locality: geoResult.locality || "",
            candidateSublocations: geoResult.candidateSublocations || [],
            state: geoResult.state || "Andhra Pradesh",
            pincode: geoResult.pincode || "",
            address: geoResult.address || placeAddress,
            resolvedUrl: finalUrl,
          },
          { headers: CORS_HEADERS }
        );
      }
    }

    return NextResponse.json(
      {
        error:
          "Could not extract coordinates from the provided Google Maps link. Please verify the link has a selected pin or location.",
      },
      { status: 422, headers: CORS_HEADERS }
    );
  } catch (err: any) {
    if (err.name === "TimeoutError" || err.message?.includes("timeout")) {
      return NextResponse.json(
        { error: "Google Maps request timed out. Please try again." },
        { status: 504, headers: CORS_HEADERS }
      );
    }
    return NextResponse.json(
      { error: err.message || "Failed to resolve Google Maps link" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
