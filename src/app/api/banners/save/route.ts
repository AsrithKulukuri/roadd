import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/server-auth-guard";
import { bumpTagVersion } from "@/lib/redis";

export async function POST(request: Request) {
  try {
    const { errorResponse } = await requireAdmin(request);
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const { id, ...data } = body;

    let result;
    if (id) {
      // Update existing banner via admin client (bypasses anon RLS)
      result = await supabaseAdmin
        .from("banners")
        .update(data)
        .eq("id", id)
        .select()
        .single();
    } else {
      // Insert new banner via admin client (bypasses anon RLS)
      result = await supabaseAdmin
        .from("banners")
        .insert(data)
        .select()
        .single();
    }

    if (result.error) {
      console.error("[Save Banner DB Error]:", result.error);
      return NextResponse.json({ error: result.error.message }, { status: 400 });
    }

    // Invalidate cached home sections in Redis
    await bumpTagVersion("home_sections").catch(() => {});

    return NextResponse.json({ success: true, banner: result.data });
  } catch (error: any) {
    console.error("[Save Banner Server Error]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to save banner" },
      { status: 500 }
    );
  }
}
