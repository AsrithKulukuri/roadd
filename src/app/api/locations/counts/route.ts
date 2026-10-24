import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { fetchWithCache } from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await fetchWithCache(
      "locations:counts",
      async () => {
        const [propsRes, projsRes] = await Promise.all([
          supabaseAdmin.from("properties").select("location"),
          supabaseAdmin.from("projects").select("name, location"),
        ]);
        return {
          properties: propsRes.data || [],
          projects: projsRes.data || [],
        };
      },
      { ttlSeconds: 300, tag: "locations", enableJitter: true }
    );

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
      },
    });
  } catch (error: any) {
    console.error("[Locations Counts API Error]:", error);
    return NextResponse.json(
      { properties: [], projects: [] },
      { status: 500 }
    );
  }
}

