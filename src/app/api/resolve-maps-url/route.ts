import { NextResponse } from "next/server";
import { parseGoogleMapsUrl } from "@/lib/utils";

// Filter out generic Google bundle fallback coordinates (e.g. US default 39.0268, -77.8443)
function isValidFetchedCoords(lat: number, lng: number): boolean {
  if (isNaN(lat) || isNaN(lng)) return false;
  if (Math.abs(lat - 39.0268) < 0.1 && Math.abs(lng - (-77.8443)) < 0.1) return false;
  return true;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl || typeof targetUrl !== "string") {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  const trimmed = targetUrl.trim();

  // 1. Direct synchronous pattern check
  const directMatch = parseGoogleMapsUrl(trimmed);
  if (directMatch && isValidFetchedCoords(directMatch.latitude, directMatch.longitude)) {
    return NextResponse.json({ success: true, ...directMatch, resolvedUrl: trimmed });
  }

  // 2. Resolve shortened Google Maps URL redirect (e.g. maps.app.goo.gl / goo.gl)
  try {
    const response = await fetch(trimmed, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    const finalUrl = response.url;
    let coords = parseGoogleMapsUrl(finalUrl);
    if (coords && !isValidFetchedCoords(coords.latitude, coords.longitude)) {
      coords = null;
    }

    let placeAddress = "";

    // 3. Extract place name / address from URL path (e.g. /place/Madhurawada+Visakhapatnam...)
    if (finalUrl.includes("/place/")) {
      const placeMatch = finalUrl.match(/\/place\/([^\/]+)/);
      if (placeMatch && placeMatch[1]) {
        placeAddress = decodeURIComponent(placeMatch[1].replace(/\+/g, " "));
      }
    } else if (finalUrl.includes("q=")) {
      const qMatch = finalUrl.match(/q=([^&]+)/);
      if (qMatch && qMatch[1]) {
        placeAddress = decodeURIComponent(qMatch[1].replace(/\+/g, " "));
      }
    }

    // 4. Geocode extracted placeAddress using Nominatim
    if (placeAddress) {
      const parts = placeAddress.split(",").map((s) => s.trim()).filter(Boolean);
      const cleanQuery = parts.length > 2 ? parts.slice(-3).join(", ") : placeAddress;
      const searchQueries = [cleanQuery, placeAddress, parts.slice(-2).join(", ")];

      for (const q of searchQueries) {
        try {
          const nomRes = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1`,
            {
              headers: {
                "User-Agent": "ROADFacingApp/1.0 (contact@road.in)",
                "Accept-Language": "en",
              },
            }
          );
          if (nomRes.ok) {
            const nomData = await nomRes.json();
            if (nomData && nomData[0]) {
              const item = nomData[0];
              const lat = parseFloat(item.lat);
              const lng = parseFloat(item.lon);
              if (isValidFetchedCoords(lat, lng)) {
                const addr = item.address || {};
                const cityVal = addr.city || addr.town || addr.village || addr.county || addr.suburb || "";
                const localityVal = addr.suburb || addr.neighbourhood || addr.residential || addr.quarter || addr.town || addr.village || cityVal || "";
                
                return NextResponse.json({
                  success: true,
                  latitude: lat,
                  longitude: lng,
                  city: cityVal,
                  locality: localityVal,
                  state: addr.state || "",
                  pincode: addr.postcode || "",
                  address: item.display_name || placeAddress,
                  resolvedUrl: finalUrl,
                });
              }
            }
          }
        } catch (e) {}
      }
    }

    // 5. Final Fallback: Parse Google Maps HTML body ONLY for explicit pin coordinates (!3dlat!4dlng)
    if (!coords) {
      const htmlText = await response.text();
      const dMatch = htmlText.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
      if (dMatch) {
        const lat = parseFloat(dMatch[1]);
        const lng = parseFloat(dMatch[2]);
        if (isValidFetchedCoords(lat, lng)) {
          coords = { latitude: lat, longitude: lng };
        }
      }
    }

    if (coords) {
      // Reverse geocode extracted coords to populate city, state, pincode, locality
      try {
        const revRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.latitude}&lon=${coords.longitude}`,
          {
            headers: {
              "Accept-Language": "en",
              "User-Agent": "ROADFacingApp/1.0 (contact@road.in)",
            },
          }
        );
        if (revRes.ok) {
          const revData = await revRes.json();
          const addr = revData.address || {};
          const cityVal = addr.city || addr.town || addr.village || addr.county || addr.suburb || "";
          const localityVal = addr.suburb || addr.neighbourhood || addr.residential || addr.quarter || addr.town || addr.village || cityVal || "";

          return NextResponse.json({
            success: true,
            latitude: coords.latitude,
            longitude: coords.longitude,
            city: cityVal,
            locality: localityVal,
            state: addr.state || "",
            pincode: addr.postcode || "",
            address: revData.display_name || "",
            resolvedUrl: finalUrl,
          });
        }
      } catch (e) {}

      return NextResponse.json({ success: true, ...coords, resolvedUrl: finalUrl });
    }

    return NextResponse.json(
      { error: "Could not extract coordinates from Google Maps link" },
      { status: 422 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to resolve Google Maps link" },
      { status: 500 }
    );
  }
}
