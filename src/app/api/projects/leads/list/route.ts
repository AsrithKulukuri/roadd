import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { formatWhatsAppPhone } from "@/lib/whatsapp/whatsapp-share";
import { authenticateServerRequest } from "@/lib/server-auth-guard";

export const dynamic = "force-dynamic";

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const builderPhone = searchParams.get("builderPhone");
    const projectSlug = searchParams.get("projectSlug");
    const projectId = searchParams.get("projectId");

    // 1. Mandatory Server-Side Authentication
    const auth = await authenticateServerRequest(req);
    if (!auth.authorized || !auth.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Sign in required to view project leads" },
        { status: 401 }
      );
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 500 });
    }

    const userPhone = auth.user.phone ? formatWhatsAppPhone(auth.user.phone) : "";
    const isAdmin = auth.role === "admin";

    let isAuthorizedOwner = false;
    let verifiedDbProject: any = null;

    // Check project-level builder ownership strictly from Database
    if (projectId || projectSlug) {
      try {
        let projQuery = supabase.from("projects").select("*");
        if (projectId) projQuery = projQuery.eq("id", projectId);
        else if (projectSlug) projQuery = projQuery.eq("slug", projectSlug);

        const { data: dbProj } = await projQuery.maybeSingle();
        if (dbProj) {
          verifiedDbProject = dbProj;
          if (userPhone) {
            const rawDbPhone =
              dbProj.builder_whatsapp ||
              dbProj.builderWhatsapp ||
              dbProj.builder_phone ||
              dbProj.builderPhone ||
              dbProj.builder?.whatsapp ||
              dbProj.builder?.phone ||
              "";
            const cleanDbPhone = formatWhatsAppPhone(rawDbPhone);
            if (cleanDbPhone && userPhone === cleanDbPhone) {
              isAuthorizedOwner = true;
            }
          }
        }
      } catch {}
    }

    // Non-admin users must prove project ownership from the database.
    if (!isAdmin) {
      if (!projectId && !projectSlug) {
        return NextResponse.json(
          {
            success: false,
            error: "Forbidden: Project identifier (projectId or projectSlug) required to access leads.",
          },
          { status: 403 }
        );
      }

      if (!isAuthorizedOwner) {
        return NextResponse.json(
          {
            success: false,
            error: "Forbidden: You do not have permission to view leads for this project.",
          },
          { status: 403 }
        );
      }
    }

    let query = supabase
      .from("project_leads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);

    let actionQuery = supabase
      .from("listing_action_leads")
      .select("*")
      .eq("listing_type", "project")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (projectId) {
      query = query.eq("project_id", projectId);
      actionQuery = actionQuery.eq("listing_id", projectId);
    } else if (projectSlug) {
      query = query.eq("project_slug", projectSlug);
      actionQuery = actionQuery.eq("listing_slug", projectSlug);
    } else if (builderPhone) {
      const cleanPhone = formatWhatsAppPhone(builderPhone);
      query = query.or(`builder_phone.ilike.%${cleanPhone}%,builder_phone.ilike.%${builderPhone}%`);
      actionQuery = actionQuery.or(`recipient_phone.ilike.%${cleanPhone}%,recipient_phone.ilike.%${builderPhone}%`);
    }

    const [{ data: leads, error }, { data: actionLeads, error: actionError }] = await Promise.all([
      query,
      actionQuery,
    ]);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    if (actionError) {
      console.error("[ACTION LEADS LIST ERROR]:", actionError);
    }

    const mappedActionLeads = (actionLeads || []).map((row: any) => ({
      id: row.id,
      created_at: row.created_at,
      viewer_name: row.buyer_name || "Interested Buyer",
      viewer_phone: row.buyer_phone || "-",
      viewer_email: row.buyer_email || "-",
      project_id: row.listing_id,
      project_slug: row.listing_slug,
      project_name: row.listing_name,
      project_ref_id: "-",
      builder_phone: row.recipient_phone || "-",
      action: row.action,
      delivery_status: row.builder_notified ? "instant_sent" : "recorded",
    }));

    const combinedLeads = [...mappedActionLeads, ...(leads || [])].sort((a: any, b: any) =>
      String(b.created_at || "").localeCompare(String(a.created_at || ""))
    );

    return NextResponse.json({
      success: true,
      count: combinedLeads.length,
      leads: combinedLeads,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
