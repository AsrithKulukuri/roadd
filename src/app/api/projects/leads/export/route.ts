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

function escapeCsvField(value: any): string {
  if (value === null || value === undefined) return '""';
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
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
      return new NextResponse("Unauthorized: Sign in required to export project leads", { status: 401 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return new NextResponse("Database connection unavailable", { status: 500 });
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
        return new NextResponse("Forbidden: Project identifier (projectId or projectSlug) required to export leads.", { status: 403 });
      }

      if (!isAuthorizedOwner) {
        return new NextResponse("Forbidden: You do not have permission to export leads for this project.", { status: 403 });
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
      console.error("[LEADS EXPORT ERROR]:", error);
      return new NextResponse(`Failed to fetch leads: ${error.message}`, { status: 500 });
    }

    const leadRows = leads || [];
    const projectName = verifiedDbProject?.name || leadRows[0]?.project_name || projectSlug || "Project";

    // CSV Header row
    const headers = [
      "S.No",
      "Date & Time (IST)",
      "Buyer Name",
      "Phone Number",
      "Email ID",
      "Project Name",
      "Project Ref ID",
      "Lead Status",
    ];

    const csvRows: string[] = [];
    csvRows.push(headers.map(escapeCsvField).join(","));

    leadRows.forEach((lead: any, index: number) => {
      const dateObj = lead.created_at ? new Date(lead.created_at) : new Date();
      const istTime = dateObj.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "short",
      });

      const row = [
        index + 1,
        istTime,
        lead.viewer_name || "Interested Buyer",
        lead.viewer_phone || "-",
        lead.viewer_email && lead.viewer_email !== "Not provided" ? lead.viewer_email : "-",
        lead.project_name || projectName,
        lead.project_ref_id || "-",
        lead.delivery_status === "instant_sent" ? "Instant Alert Sent" : "Verified View",
      ];
      csvRows.push(row.map(escapeCsvField).join(","));
    });

    // Add UTF-8 BOM so Microsoft Excel opens it seamlessly
    const csvContent = "\uFEFF" + csvRows.join("\r\n");

    const dateSlug = new Date().toISOString().slice(0, 10);
    const sanitizedProjectName = projectName.replace(/[^a-zA-Z0-9]/g, "_");
    const filename = `ROAD_Leads_${sanitizedProjectName}_${dateSlug}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    });
  } catch (err: any) {
    console.error("[LEADS EXPORT EXCEPTION]:", err);
    return new NextResponse("Internal server error generating export", { status: 500 });
  }
}
