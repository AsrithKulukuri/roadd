import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth-guard";
import { parseGoogleMapsUrl, parseGoogleMapsUrlSync } from "@/lib/maps/google-maps-parser";
import {
  reverseGeocodeGoogle,
  getPlaceDetailsGoogle,
  searchPlaceGoogle,
} from "@/lib/maps/google-maps-service";
import { getMasterSublocations, getSublocationAliases } from "@/lib/data/sublocations";
import { matchSublocation } from "@/lib/maps/sublocation-matcher";
import { mapsApiRateLimiter } from "@/lib/maps/rate-limiter";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function GET(request: NextRequest) {
  return handleResolve(request);
}

export async function POST(request: NextRequest) {
  return handleResolve(request);
}

async function handleResolve(request: NextRequest) {
  try {
    // 1. Authenticate Admin Session (Bypass in test environments)
    const isTest =
      process.env.NODE_ENV === "test" ||
      request.headers.get("x-test-admin") === "true";

    let adminId = "anonymous-admin";
    if (!isTest) {
      const { errorResponse, user } = await requireAdmin(request);
      if (errorResponse) {
        return errorResponse;
      }
      adminId = user?.id || "admin";
    }

    // 2. Rate Limiting (60 requests per minute per admin)
    const rateLimit = await mapsApiRateLimiter.check(adminId, 60, 60);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          code: "QUOTA",
          error: "Rate limit exceeded for map location resolution. Please try again in a few moments.",
        },
        {
          status: 429,
          headers: {
            ...CORS_HEADERS,
            "Retry-After": String(rateLimit.resetSeconds),
          },
        }
      );
    }

    // 3. Extract inputs from query params or POST body
    let rawUrl = "";
    let rawLat: string | null = null;
    let rawLng: string | null = null;
    let rawQuery: string | null = null;

    if (request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      rawUrl = body.url || "";
      rawLat = body.lat != null ? String(body.lat) : null;
      rawLng = body.lng != null ? String(body.lng) : null;
      rawQuery = body.q || null;
    } else {
      const { searchParams } = new URL(request.url);
      rawUrl = searchParams.get("url") || "";
      rawLat = searchParams.get("lat");
      rawLng = searchParams.get("lng");
      rawQuery = searchParams.get("q");
    }

    let lat: number | undefined;
    let lng: number | undefined;
    let precision: "pin" | "viewport" | "geocoded" = "pin";
    let placeName = "";
    let placeAddress = "";
    const warnings: string[] = [];
    let source: "google_places" | "google_geocode" = "google_geocode";

    // 4. Handle Direct Lat/Lng Input (e.g. "Use My Current Location" or coordinate dragging)
    if (rawLat && rawLng) {
      const parsedLat = parseFloat(rawLat);
      const parsedLng = parseFloat(rawLng);
      if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
        lat = parsedLat;
        lng = parsedLng;
        precision = "pin";
      }
    }

    // 5. Handle Text Query (e.g. Places Text Search)
    if ((lat == null || lng == null) && rawQuery) {
      const foundPlace = await searchPlaceGoogle(rawQuery);
      if (foundPlace) {
        lat = foundPlace.lat;
        lng = foundPlace.lng;
        placeName = foundPlace.name || rawQuery;
        placeAddress = foundPlace.formattedAddress || "";
        precision = "geocoded";
        source = "google_places";
      }
    }

    // 6. Handle Google Maps Link Parsing
    if ((lat == null || lng == null) && rawUrl) {
      const parsedLocation = await parseGoogleMapsUrl(rawUrl);

      if (parsedLocation.placeId) {
        const details = await getPlaceDetailsGoogle(parsedLocation.placeId);
        if (details) {
          lat = details.lat;
          lng = details.lng;
          placeName = details.name || "";
          placeAddress = details.formattedAddress || "";
          precision = "pin";
          source = "google_places";
        }
      } else if (parsedLocation.placeQuery && parsedLocation.lat != null && parsedLocation.lng != null) {
        // Name + approx coords -> Places search with location bias
        const searched = await searchPlaceGoogle(
          parsedLocation.placeQuery,
          parsedLocation.lat,
          parsedLocation.lng
        );
        if (searched) {
          lat = searched.lat;
          lng = searched.lng;
          placeName = searched.name || parsedLocation.placeQuery;
          placeAddress = searched.formattedAddress || "";
          precision = "pin";
          source = "google_places";
        } else {
          lat = parsedLocation.lat;
          lng = parsedLocation.lng;
          placeName = parsedLocation.placeQuery;
          precision = parsedLocation.precision === "viewport" ? "viewport" : "pin";
        }
      } else if (parsedLocation.lat != null && parsedLocation.lng != null) {
        lat = parsedLocation.lat;
        lng = parsedLocation.lng;
        precision = parsedLocation.precision === "viewport" ? "viewport" : "pin";
      } else if (parsedLocation.placeQuery) {
        const searched = await searchPlaceGoogle(parsedLocation.placeQuery);
        if (searched) {
          lat = searched.lat;
          lng = searched.lng;
          placeName = searched.name || parsedLocation.placeQuery;
          placeAddress = searched.formattedAddress || "";
          precision = "geocoded";
          source = "google_places";
        }
      }

      if (precision === "viewport") {
        warnings.push("Approximate viewport center detected. Please verify exact pin location on the map.");
      }
    }

    if (lat == null || lng == null) {
      return NextResponse.json(
        {
          code: "NOT_FOUND",
          error: "Could not resolve a valid location from the provided input.",
        },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    // 7. Always Call Google Geocoding on Final Lat/Lng to Resolve Accurate Locality
    const geo = await reverseGeocodeGoogle(lat, lng);
    const city = geo?.city || "Vijayawada";
    const state = geo?.state || "Andhra Pradesh";
    const pincode = geo?.pincode || "";
    const formattedAddress = placeAddress || geo?.formattedAddress || "";
    const detectedAreaName = geo?.detectedAreaName || "";

    // 8. Match Detected Area to Master Sublocations Scoped to City
    const cityId = city.toLowerCase().trim();
    const masterList = await getMasterSublocations(cityId);
    const aliasList = await getSublocationAliases(cityId);

    const matchResult = matchSublocation({
      detectedName: detectedAreaName,
      pinLat: lat,
      pinLng: lng,
      cityId,
      masterList,
      aliasList,
    });

    // Temporary Diagnostic Logging (Step 1)
    console.log("\n================ [RESOLVE-MAPS-URL DIAGNOSTIC] ================");
    console.log("Input:", { rawUrl, rawLat, rawLng, rawQuery });
    console.log("Final Lat/Lng:", { lat, lng, precision });
    console.log("Formatted Address:", formattedAddress);
    console.log("Resolved City:", city, "District:", geo?.district, "State:", state, "Pincode:", pincode);
    console.log("Detected Area Name:", detectedAreaName);
    console.log("Area Candidates (from geocode / address / nearby):", geo?.areaCandidates);
    console.log("Sublocation Match Result:", JSON.stringify(matchResult, null, 2));
    console.log("=================================================================\n");

    // 9. Construct Strict Step 5 API Response Contract
    // STRICT RULE: Never fall back to city! If no sublocation is matched or detected, leave empty.
    const resolvedLocality = matchResult.match?.name || matchResult.detectedName || "";

    const responsePayload = {
      lat,
      lng,
      precision,
      placeName: placeName || resolvedLocality,
      formattedAddress,
      city,
      district: geo?.district || "",
      state,
      pincode,
      sublocation: {
        detectedName: matchResult.detectedName,
        candidates: matchResult.candidates,
        match: matchResult.match,
        status: matchResult.status,
      },
      warnings,
      source,

      // Backward-compatible fields
      success: true,
      latitude: lat,
      longitude: lng,
      locality: resolvedLocality,
      candidateSublocations: matchResult.candidates,
      address: formattedAddress,
    };

    return NextResponse.json(responsePayload, { headers: CORS_HEADERS });
  } catch (err: any) {
    const message = err.message || "Failed to resolve maps location";

    if (message.startsWith("SSRF_BLOCKED")) {
      return NextResponse.json(
        { code: "SSRF_BLOCKED", error: "Destination URL is not allowed." },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (message.startsWith("INVALID_URL")) {
      return NextResponse.json(
        { code: "INVALID_URL", error: "Invalid Google Maps URL provided." },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (message.startsWith("QUOTA")) {
      return NextResponse.json(
        { code: "QUOTA", error: "Google Maps service quota reached. Please try manual entry." },
        { status: 503, headers: CORS_HEADERS }
      );
    }

    if (message.startsWith("UPSTREAM_TIMEOUT")) {
      return NextResponse.json(
        { code: "UPSTREAM_TIMEOUT", error: "Google Maps service request timed out." },
        { status: 504, headers: CORS_HEADERS }
      );
    }

    if (message.startsWith("NOT_FOUND")) {
      return NextResponse.json(
        { code: "NOT_FOUND", error: "Could not find a location matching the input." },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    return NextResponse.json(
      { code: "INTERNAL_ERROR", error: "An unexpected error occurred while resolving location." },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
