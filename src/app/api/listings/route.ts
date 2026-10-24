import { readSiteFeatures } from "@/lib/site-features";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/server-auth-guard";
import { publicListing } from "@/lib/public-listing";
import { PortalError, portalError } from "@/lib/builder-access";
import { fetchWithCache, normalizeQueryKey } from "@/lib/redis";

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const type = params.get("type");
    if (type !== "project" && type !== "property") throw new PortalError("Invalid listing type.");
    const admin = params.get("scope") === "admin";
    if (admin) {
      const auth = await requireAdmin(request);
      if (auth.errorResponse) return auth.errorResponse;
    }
    if (!admin && type === "property" && !(await readSiteFeatures()).propertiesEnabled) {
      return NextResponse.json({ data: [], error: null }, { headers: { "Cache-Control": "no-store" } });
    }

    if (admin) {
      const { data, error } = await supabaseAdmin.from(type === "project" ? "projects" : "properties").select("*").order("id");
      if (error) throw error;
      return NextResponse.json({ data, error: null }, { headers: { "Cache-Control": "no-store" } });
    }

    // Public listings cached in Redis with versioned tag and auto-invalidation on updates
    const cacheKey = `listings:${type}`;
    const tag = type === "project" ? "projects" : "properties";

    const rows = await fetchWithCache(
      cacheKey,
      async () => {
        const { data, error } = await supabaseAdmin.from(type === "project" ? "projects" : "properties").select("*").order("id");
        if (error) throw error;
        return publicListing((data || []).filter(row => row.isPublished !== false && !["draft", "archived", "deleted"].includes(row.status)));
      },
      { ttlSeconds: 180, tag, enableJitter: true }
    );

    return NextResponse.json({ data: rows, error: null }, { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" } });
  } catch (error) {
    return portalError(error);
  }
}

