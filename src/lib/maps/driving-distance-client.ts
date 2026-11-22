export interface ClientDrivingDistanceResult {
  isDrivingDistance: boolean;
  distanceKm: number;
  durationSeconds: number | null;
  display: string;
  source: string;
}

const memoryCache = new Map<string, ClientDrivingDistanceResult>();

export async function fetchDrivingDistanceOnDemand(params: {
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
  destinationId?: string;
}): Promise<ClientDrivingDistanceResult> {
  const { originLat, originLng, destLat, destLng, destinationId } = params;

  const roundedOrigin = `${originLat.toFixed(3)},${originLng.toFixed(3)}`;
  const destKey = destinationId ? destinationId.trim() : `${destLat.toFixed(3)},${destLng.toFixed(3)}`;
  const cacheKey = `driving_client_${roundedOrigin}_${destKey}`;

  // 1. Check memory cache
  const inMem = memoryCache.get(cacheKey);
  if (inMem) return inMem;

  // 2. Check sessionStorage
  if (typeof window !== "undefined") {
    try {
      const stored = sessionStorage.getItem(cacheKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        memoryCache.set(cacheKey, parsed);
        return parsed;
      }
    } catch {}
  }

  // 3. Fetch from server API route
  try {
    const url = new URL("/api/driving-distance", window.location.origin);
    url.searchParams.set("originLat", String(originLat));
    url.searchParams.set("originLng", String(originLng));
    url.searchParams.set("destLat", String(destLat));
    url.searchParams.set("destLng", String(destLng));
    if (destinationId) {
      url.searchParams.set("destinationId", destinationId);
    }

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.display) {
        const result: ClientDrivingDistanceResult = {
          isDrivingDistance: Boolean(data.isDrivingDistance),
          distanceKm: data.distanceKm,
          durationSeconds: data.durationSeconds,
          display: data.display,
          source: data.source || "server",
        };

        memoryCache.set(cacheKey, result);
        if (typeof window !== "undefined") {
          try {
            sessionStorage.setItem(cacheKey, JSON.stringify(result));
          } catch {}
        }

        return result;
      }
    }
  } catch (err: any) {
    console.warn("[DrivingDistanceClient] Fetch error, falling back to road calculation:", err.message);
  }

  // Client-side road distance estimation (1.25x road circuity at 55 km/h)
  const R = 6371;
  const dLat = ((destLat - originLat) * Math.PI) / 180;
  const dLon = ((destLng - originLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((originLat * Math.PI) / 180) *
      Math.cos((destLat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightKm = R * c;
  const roadKm = Math.max(0.5, Math.round(straightKm * 1.25));
  const durationSeconds = Math.round((roadKm / 55) * 3600);
  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.round((durationSeconds % 3600) / 60);

  let durStr = "";
  if (hours > 0) {
    durStr = minutes > 0 ? `${hours} hr ${minutes} min` : `${hours} hr`;
  } else {
    durStr = `${Math.max(1, minutes)} min`;
  }

  const display = `${roadKm} km · ${durStr} by road`;

  const fallback: ClientDrivingDistanceResult = {
    isDrivingDistance: true,
    distanceKm: roadKm,
    durationSeconds,
    display,
    source: "client_road_engine",
  };

  memoryCache.set(cacheKey, fallback);
  return fallback;
}
