export interface ClientDrivingDistanceResult {
  isDrivingDistance: boolean;
  distanceKm: number;
  durationSeconds: number | null;
  display: string;
  source: string;
}

const memoryCache = new Map<string, ClientDrivingDistanceResult>();

// Proactively clear any legacy cached values containing "straight line" or "driving distance"
if (typeof window !== "undefined") {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && (k.startsWith("driving_") || k.includes("client"))) {
        const val = sessionStorage.getItem(k);
        if (val && (val.includes("straight line") || val.includes("driving distance"))) {
          keysToRemove.push(k);
        }
      }
    }
    keysToRemove.forEach((k) => sessionStorage.removeItem(k));
  } catch {}
}

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
  const cacheKey = `driving_v5_${roundedOrigin}_${destKey}`;

  // 1. Check memory cache
  const inMem = memoryCache.get(cacheKey);
  if (inMem && inMem.display && inMem.display.includes("from me") && !inMem.display.includes("straight line")) {
    return inMem;
  }

  // 2. Check sessionStorage
  if (typeof window !== "undefined") {
    try {
      const stored = sessionStorage.getItem(cacheKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.display && parsed.display.includes("from me") && !parsed.display.includes("straight line")) {
          memoryCache.set(cacheKey, parsed);
          return parsed;
        } else {
          sessionStorage.removeItem(cacheKey);
        }
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
      if (data && data.display && !data.display.includes("straight line")) {
        const display = data.display.includes("from me")
          ? data.display
          : `${data.distanceKm} kms from me`;

        const result: ClientDrivingDistanceResult = {
          isDrivingDistance: true,
          distanceKm: data.distanceKm,
          durationSeconds: data.durationSeconds,
          display,
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

  // Client-side road distance estimation (1.25x road circuity)
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
  const display = roadKm < 1 ? `${Math.round(roadKm * 1000)} m from me` : `${roadKm} kms from me`;

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
