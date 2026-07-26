import { NextResponse } from "next/server";
import { parseGoogleMapsUrl } from "@/lib/utils";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl || typeof targetUrl !== "string") {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  const trimmed = targetUrl.trim();

  // 1. Direct synchronous pattern check
  const directMatch = parseGoogleMapsUrl(trimmed);
  if (directMatch) {
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

    // 3. Fallback: Extract place name from URL path (e.g. /place/Madhurawada+Visakhapatnam...)
    if (!coords && finalUrl.includes("/place/")) {
      const placeMatch = finalUrl.match(/\/place\/([^\/]+)/);
      if (placeMatch && placeMatch[1]) {
        const rawPlaceName = decodeURIComponent(placeMatch[1].replace(/\+/g, " "));
        // Clean address query for geocoding
        const placeName = rawPlaceName.replace(/Dr\s*no:[^,]+,/i, "").trim();
        try {
          const nomRes = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(placeName)}&format=json`,
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
              coords = {
                latitude: parseFloat(nomData[0].lat),
                longitude: parseFloat(nomData[0].lon),
              };
            }
          }
        } catch (e) {}
      }
    }

    // 4. Fallback: Parse Google Maps HTML body for coordinates
    if (!coords) {
      const htmlText = await response.text();

      // Search for @lat,lng in HTML or meta content
      const atMatch = htmlText.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (atMatch) {
        coords = {
          latitude: parseFloat(atMatch[1]),
          longitude: parseFloat(atMatch[2]),
        };
      } else {
        const dMatch = htmlText.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
        if (dMatch) {
          coords = {
            latitude: parseFloat(dMatch[1]),
            longitude: parseFloat(dMatch[2]),
          };
        } else {
          const centerMatch = htmlText.match(/center=(-?\d+\.\d+)%2C(-?\d+\.\d+)/i) ||
                              htmlText.match(/\[null,null,(-?\d+\.\d+),(-?\d+\.\d+)\]/);
          if (centerMatch) {
            coords = {
              latitude: parseFloat(centerMatch[1]),
              longitude: parseFloat(centerMatch[2]),
            };
          }
        }
      }
    }

    if (coords) {
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
