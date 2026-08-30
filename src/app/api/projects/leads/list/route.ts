import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { formatWhatsAppPhone } from "@/lib/whatsapp/whatsapp-share";
import { authenticateServerRequest } from "@/lib/server-auth-guard";

export const dynamic = "force-dynamic";

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const builderPhone = searchParams.get("builderPhone");
    const projectSlug = searchParams.get("projectSlug");
    const projectId = searchParams.get("projectId");
    const token = searchParams.get("token");

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
    const isValidSecretToken = token && process.env.ADMIN_SECRET_KEY && token === process.env.ADMIN_SECRET_KEY;

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

    // If not admin and not using secret token, project-level builder ownership is mandatory
    if (!isAdmin && !isValidSecretToken) {
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

    if (projectId) {
      query = query.eq("project_id", projectId);
    } else if (projectSlug) {
      query = query.eq("project_slug", projectSlug);
    } else if (builderPhone) {
      const cleanPhone = formatWhatsAppPhone(builderPhone);
      query = query.or(`builder_phone.ilike.%${cleanPhone}%,builder_phone.ilike.%${builderPhone}%`);
    }

    const { data: leads, error } = await query;

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      count: leads?.length || 0,
      leads: leads || [],
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
