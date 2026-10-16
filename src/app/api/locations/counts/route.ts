import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [propsRes, projsRes] = await Promise.all([
      supabaseAdmin.from("properties").select("location"),
      supabaseAdmin.from("projects").select("name, location"),
    ]);

    return NextResponse.json(
      {
        properties: propsRes.data || [],
        projects: projsRes.data || [],
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=180",
        },
      }
    );
  } catch (error: any) {
    console.error("[Locations Counts API Error]:", error);
    return NextResponse.json(
      { properties: [], projects: [] },
      { status: 500 }
    );
  }
}
