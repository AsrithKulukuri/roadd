import { NextRequest, NextResponse } from "next/server";
import { authenticateServerRequest } from "@/lib/server-auth-guard";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await authenticateServerRequest(request);
  if (!auth.authorized || !auth.user) {
    return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
  }

  const { slug } = await params;
  const { data, error } = await supabaseAdmin
    .from("projects")
    .select("id, slug, builderPhone, builderWhatsapp")
    .or(`slug.eq.${slug},id.eq.${slug}`)
    .maybeSingle();

  if (error) {
    console.error("[PROJECT CONTACT ERROR]", error.message);
    return NextResponse.json({ success: false, error: "Unable to load builder contact" }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json(
    {
      success: true,
      contact: {
        phone: data.builderPhone || null,
        whatsapp: data.builderWhatsapp || data.builderPhone || null,
      },
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
