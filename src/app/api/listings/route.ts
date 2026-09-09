import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/server-auth-guard";
import { publicListing } from "@/lib/public-listing";
import { PortalError, portalError } from "@/lib/builder-access";
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const type = params.get("type");
    if (type !== "project" && type !== "property") throw new PortalError("Invalid listing type.");
    const admin = params.get("scope") === "admin";
    if (admin) { const auth = await requireAdmin(request); if (auth.errorResponse) return auth.errorResponse; }
    const { data, error } = await supabaseAdmin.from(type === "project" ? "projects" : "properties").select("*").order("id");
    if (error) throw error;
    const rows = admin ? data : publicListing((data || []).filter(row => row.isPublished !== false && !["draft", "archived", "deleted"].includes(row.status)));
    return NextResponse.json({ data: rows, error: null }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return portalError(error); }
}
