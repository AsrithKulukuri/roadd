import { NextRequest, NextResponse } from "next/server";
import { computeDrivingDistance } from "@/lib/maps/driving-distance-service";

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
  return handleDrivingDistance(request);
}

export async function POST(request: NextRequest) {
  return handleDrivingDistance(request);
}

async function handleDrivingDistance(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "anonymous";

    let originLat: number = NaN;
    let originLng: number = NaN;
    let destLat: number = NaN;
    let destLng: number = NaN;
    let destinationId: string | undefined = undefined;

    if (request.method === "POST") {
      try {
        const body = await request.json();
        originLat = Number(body.originLat);
        originLng = Number(body.originLng);
        destLat = Number(body.destLat);
        destLng = Number(body.destLng);
        destinationId = body.destinationId ? String(body.destinationId) : undefined;
      } catch {}
    }

    if (isNaN(originLat) || isNaN(originLng)) {
      const searchParams = request.nextUrl.searchParams;
      originLat = Number(searchParams.get("originLat"));
      originLng = Number(searchParams.get("originLng"));
      destLat = Number(searchParams.get("destLat"));
      destLng = Number(searchParams.get("destLng"));
      const qDestId = searchParams.get("destinationId");
      if (qDestId) destinationId = qDestId;
    }

    if (isNaN(originLat) || isNaN(originLng) || isNaN(destLat) || isNaN(destLng)) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing or invalid coordinates (originLat, originLng, destLat, destLng)",
        },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const result = await computeDrivingDistance({
      originLat,
      originLng,
      destLat,
      destLng,
      destinationId,
      ip,
    });

    return NextResponse.json(result, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=43200",
      },
    });
  } catch (err: any) {
    console.error("[DrivingDistanceRoute] Error:", err.message);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error calculating driving distance",
      },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
