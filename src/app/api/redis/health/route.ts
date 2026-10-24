import { NextResponse } from "next/server";
import { getRedisTelemetry, invalidateCache, bumpTagVersion, type CacheTag } from "@/lib/redis";
import { requireAdmin } from "@/lib/server-auth-guard";

export const dynamic = "force-dynamic";

const ALLOWED_TAGS: Set<CacheTag> = new Set([
  "projects",
  "properties",
  "locations",
  "home_sections",
  "site_features",
]);

export async function GET(request: Request) {
  const telemetry = getRedisTelemetry();

  // Check if caller is authenticated admin
  const { user } = await requireAdmin(request);

  // Unauthenticated / public callers: expose only minimal, non-sensitive health info
  if (!user) {
    const isHealthy = telemetry.status === "connected" || telemetry.status === "unconfigured";
    return NextResponse.json({
      ok: true,
      status: isHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
    }, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }

  // Authenticated administrators: return full telemetry
  return NextResponse.json({
    ok: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
    telemetry,
  }, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: Request) {
  // 1. Strict Server-Side Admin Authorization
  const { errorResponse } = await requireAdmin(request);
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
    }

    const action = body.action || (body.tag ? "bump_tag" : "invalidate_all");

    if (action === "invalidate_all") {
      await Promise.allSettled([
        bumpTagVersion("projects"),
        bumpTagVersion("properties"),
        bumpTagVersion("locations"),
        bumpTagVersion("home_sections"),
        bumpTagVersion("site_features"),
        invalidateCache("listings:*"),
        invalidateCache("locations:*"),
        invalidateCache("home:sections:*"),
      ]);
      return NextResponse.json({
        success: true,
        message: "All cache tags bumped and application keys invalidated.",
        telemetry: getRedisTelemetry(),
      });
    }

    if (action === "bump_tag") {
      const tag = body.tag as CacheTag;
      if (!tag || typeof tag !== "string" || !ALLOWED_TAGS.has(tag)) {
        return NextResponse.json({
          error: `Invalid tag '${body.tag}'. Allowed tags: ${Array.from(ALLOWED_TAGS).join(", ")}`,
        }, { status: 400 });
      }

      const newVersion = await bumpTagVersion(tag);
      return NextResponse.json({
        success: true,
        message: `Tag '${tag}' bumped to version ${newVersion}.`,
        tag,
        newVersion,
        telemetry: getRedisTelemetry(),
      });
    }

    return NextResponse.json({
      error: `Invalid action '${action}'. Allowed actions: invalidate_all, bump_tag.`,
    }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Cache management error" }, { status: 500 });
  }
}

