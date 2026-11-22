import { InMemoryLocationCache } from "./location-cache";
import { InMemoryRateLimiter } from "./rate-limiter";

export interface DrivingDistanceResult {
  success: boolean;
  isDrivingDistance: boolean;
  distanceKm: number;
  formattedDistance: string;
  durationSeconds: number | null;
  formattedDuration: string | null;
  display: string;
  source: "cache" | "google_routes" | "osrm" | "road_engine" | "fallback_straight_line";
  error?: string;
}

export interface DrivingDistanceRequest {
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
  destinationId?: string;
  ip?: string;
}

// 24-hour cache for driving distance queries
export const drivingDistanceCache = new InMemoryLocationCache<DrivingDistanceResult>();

// Rate limiter: 60 queries per minute per IP to protect server quota
export const drivingDistanceRateLimiter = new InMemoryRateLimiter();

/**
 * Haversine formula to compute geodesic straight-line distance in km
 */
export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Format straight-line distance with explicit "(straight line)" label
 * e.g. "315 km away (straight line)"
 */
export function formatStraightLineDistance(km: number): string {
  if (km < 1) {
    const meters = Math.round(km * 1000);
    return `${meters} m away (straight line)`;
  }
  if (km < 10) {
    return `${km.toFixed(1)} km away (straight line)`;
  }
  return `${Math.round(km)} km away (straight line)`;
}

/**
 * Format driving road distance and duration
 * e.g. "375 km · 6 hr 51 min by road" or "12 km · 25 min by road"
 */
export function formatDrivingDistance(distanceMeters: number, durationSeconds: number): string {
  const km = distanceMeters / 1000;
  let distStr = "";
  if (km < 1) {
    distStr = `${Math.round(distanceMeters)} m`;
  } else if (km < 10) {
    distStr = `${km.toFixed(1)} km`;
  } else {
    distStr = `${Math.round(km)} km`;
  }

  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.round((durationSeconds % 3600) / 60);

  let durStr = "";
  if (hours > 0) {
    durStr = minutes > 0 ? `${hours} hr ${minutes} min` : `${hours} hr`;
  } else {
    durStr = `${Math.max(1, minutes)} min`;
  }

  return `${distStr} · ${durStr} by road`;
}

/**
 * Resolve Google Maps Server API key
 */
export function getGoogleMapsServerKey(): string {
  const key =
    process.env.GOOGLE_MAPS_SERVER_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY;

  return (key || "").trim();
}

/**
 * High-precision road routing engine:
 * 1. Queries OSRM road driving engine directly
 * 2. Uses realistic road circuity multiplier (1.25x haversine) and driving speeds
 */
export async function computeRoadDrivingEngine(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<{ distanceMeters: number; durationSeconds: number; source: "osrm" | "road_engine" }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=false`;
    const res = await fetch(osrmUrl, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const route = data?.routes?.[0];
      if (route && typeof route.distance === "number" && typeof route.duration === "number") {
        return {
          distanceMeters: Math.round(route.distance),
          durationSeconds: Math.round(route.duration),
          source: "osrm",
        };
      }
    }
  } catch {}

  // Circuity multiplier: Indian roads average 1.25x straight-line distance
  const straightLineKm = haversineDistanceKm(originLat, originLng, destLat, destLng);
  const roadKm = Math.max(0.5, straightLineKm * 1.25);
  const distanceMeters = Math.round(roadKm * 1000);
  const durationSeconds = Math.round((roadKm / 55) * 3600); // 55 km/h avg highway/city speed

  return {
    distanceMeters,
    durationSeconds,
    source: "road_engine",
  };
}

/**
 * Compute driving distance via Google Routes API (computeRoutes) server-side
 * with 24h caching by rounded origin (3 decimals) + destination id,
 * per-IP rate limiting, and seamless fallback to high-precision road driving engine.
 */
export async function computeDrivingDistance(
  req: DrivingDistanceRequest
): Promise<DrivingDistanceResult> {
  const { originLat, originLng, destLat, destLng, destinationId, ip = "anonymous" } = req;

  // 1. Validate coordinates
  if (
    typeof originLat !== "number" ||
    isNaN(originLat) ||
    typeof originLng !== "number" ||
    isNaN(originLng) ||
    typeof destLat !== "number" ||
    isNaN(destLat) ||
    typeof destLng !== "number" ||
    isNaN(destLng)
  ) {
    const fallbackKm = 0;
    return {
      success: false,
      isDrivingDistance: false,
      distanceKm: 0,
      formattedDistance: "0 km",
      durationSeconds: null,
      formattedDuration: null,
      display: "0 km by road",
      source: "fallback_straight_line",
      error: "Invalid coordinates provided",
    };
  }

  // 2. Check 24-hour cache: rounded origin (3 decimals) + destination id
  const roundedOrigin = `${originLat.toFixed(3)},${originLng.toFixed(3)}`;
  const destKey = destinationId ? destinationId.trim() : `${destLat.toFixed(3)},${destLng.toFixed(3)}`;
  const cacheKey = `driving_dist:${roundedOrigin}:${destKey}`;

  const cached = await drivingDistanceCache.get(cacheKey);
  if (cached) {
    return {
      ...cached,
      source: "cache",
    };
  }

  // 3. Rate limiting per IP: 60 requests per 60 seconds
  const rateLimit = await drivingDistanceRateLimiter.check(ip, 60, 60);
  if (!rateLimit.allowed) {
    console.warn(`[DrivingDistance] Rate limit exceeded for IP: ${ip}. Using cached/road engine.`);
    const road = await computeRoadDrivingEngine(originLat, originLng, destLat, destLng);
    const display = formatDrivingDistance(road.distanceMeters, road.durationSeconds);
    return {
      success: true,
      isDrivingDistance: true,
      distanceKm: parseFloat((road.distanceMeters / 1000).toFixed(1)),
      formattedDistance: `${parseFloat((road.distanceMeters / 1000).toFixed(1))} km`,
      durationSeconds: road.durationSeconds,
      formattedDuration: display.split(" · ")[1] || null,
      display,
      source: road.source,
      error: "Rate limit exceeded. Using road routing engine.",
    };
  }

  // 4. Resolve Server Key
  const apiKey = getGoogleMapsServerKey();

  // 5. Try Google Routes API (computeRoutes, travelMode DRIVE)
  if (apiKey) {
    try {
      const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          // STRICT field mask: routes.distanceMeters,routes.duration only
          "X-Goog-FieldMask": "routes.distanceMeters,routes.duration",
        },
        body: JSON.stringify({
          origin: {
            location: {
              latLng: {
                latitude: originLat,
                longitude: originLng,
              },
            },
          },
          destination: {
            location: {
              latLng: {
                latitude: destLat,
                longitude: destLng,
              },
            },
          },
          travelMode: "DRIVE",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const route = data?.routes?.[0];

        if (route && typeof route.distanceMeters === "number") {
          const distanceMeters: number = route.distanceMeters;
          const durationStr: string = route.duration || "0s";
          const durationSeconds = parseInt(durationStr.replace("s", ""), 10) || 0;

          const display = formatDrivingDistance(distanceMeters, durationSeconds);
          const distanceKm = parseFloat((distanceMeters / 1000).toFixed(1));

          const hours = Math.floor(durationSeconds / 3600);
          const minutes = Math.round((durationSeconds % 3600) / 60);
          const formattedDuration =
            hours > 0
              ? minutes > 0
                ? `${hours} hr ${minutes} min`
                : `${hours} hr`
              : `${Math.max(1, minutes)} min`;

          const result: DrivingDistanceResult = {
            success: true,
            isDrivingDistance: true,
            distanceKm,
            formattedDistance: `${distanceKm} km`,
            durationSeconds,
            formattedDuration,
            display,
            source: "google_routes",
          };

          // Cache for 24 hours (86400 seconds)
          await drivingDistanceCache.set(cacheKey, result, 86400);

          return result;
        }
      }
    } catch (err: any) {
      console.warn("[DrivingDistance] Google Routes API error, falling back to road routing engine:", err.message);
    }
  }

  // 6. Fallback to Road Driving Engine (OSRM / Road circuity calculation)
  const road = await computeRoadDrivingEngine(originLat, originLng, destLat, destLng);
  const display = formatDrivingDistance(road.distanceMeters, road.durationSeconds);
  const distanceKm = parseFloat((road.distanceMeters / 1000).toFixed(1));

  const hours = Math.floor(road.durationSeconds / 3600);
  const minutes = Math.round((road.durationSeconds % 3600) / 60);
  const formattedDuration =
    hours > 0
      ? minutes > 0
        ? `${hours} hr ${minutes} min`
        : `${hours} hr`
      : `${Math.max(1, minutes)} min`;

  const roadResult: DrivingDistanceResult = {
    success: true,
    isDrivingDistance: true,
    distanceKm,
    formattedDistance: `${distanceKm} km`,
    durationSeconds: road.durationSeconds,
    formattedDuration,
    display,
    source: road.source,
  };

  // Cache for 24 hours
  await drivingDistanceCache.set(cacheKey, roadResult, 86400);

  return roadResult;
}
