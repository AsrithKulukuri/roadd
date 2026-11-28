import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { projectAccess, portalError } from "@/lib/builder-access";
import { ACTION_LABELS, type ContactAction } from "@/lib/listing-actions";
import { getActivityStore, ProjectActivityRecord } from "../track/route";
import { buildXlsxBytes, formatPhoneForExcel, type ExcelCellValue } from "@/lib/excel-export";

export const dynamic = "force-dynamic";

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "0s";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const { project } = await projectAccess(req, searchParams.get("projectId") || "", searchParams.get("projectSlug") || undefined);
    const projectId = project.id;
    const projectSlug = project.slug;
    const projectName = searchParams.get("projectName") || "Project";
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const format = searchParams.get("format") || "json";

    const projectKey = projectId || projectSlug;
    const store = getActivityStore();

    // Fetch memory records
    let allRecords: ProjectActivityRecord[] = [];
    if (projectKey && store.has(projectKey)) {
      allRecords = store.get(projectKey) || [];
    } else {
      // Aggregate across matching project records
      for (const [k, records] of store.entries()) {
        if (
          k === projectId ||
          k === projectSlug ||
          records.some((r) => r.projectId === projectId || r.projectSlug === projectSlug)
        ) {
          allRecords.push(...records);
        }
      }
    }

    // Also query Supabase if available
    if (supabaseAdmin && (projectId || projectSlug)) {
      try {
        let q = supabaseAdmin.from("project_activity_logs").select("*");
        if (projectId) q = q.eq("project_id", projectId);
        else if (projectSlug) q = q.eq("project_slug", projectSlug);

        const { data: dbLogs, error: logsError } = await q;
        if (logsError) throw logsError;
        if (dbLogs && dbLogs.length > 0) {
          dbLogs.forEach((dbItem: any) => {
            if (!allRecords.some((r) => r.id === dbItem.id || r.sessionId === dbItem.session_id)) {
              allRecords.push({
                id: dbItem.id,
                projectId: dbItem.project_id || projectId,
                projectSlug: dbItem.project_slug || projectSlug,
                projectName: dbItem.project_name || projectName,
                sessionId: dbItem.session_id,
                dwellSeconds: dbItem.dwell_seconds || 0,
                detailsShared: Boolean(dbItem.details_shared),
                action: dbItem.action,
                viewerName: dbItem.viewer_name,
                viewerPhone: dbItem.viewer_phone,
                viewerEmail: dbItem.viewer_email,
                createdAt: dbItem.created_at,
                updatedAt: dbItem.updated_at || dbItem.created_at,
              });
            }
          });
        }

        // Also query listing_action_leads so every click & buyer phone number is included in reports
        let actionLeadQuery = supabaseAdmin
          .from("listing_action_leads")
          .select("*")
          .eq("listing_type", "project");
        if (projectId) actionLeadQuery = actionLeadQuery.eq("listing_id", projectId);
        else if (projectSlug) actionLeadQuery = actionLeadQuery.eq("listing_slug", projectSlug);

        const { data: dbActionLeads, error: actionLeadsError } = await actionLeadQuery;
        if (!actionLeadsError && dbActionLeads && dbActionLeads.length > 0) {
          dbActionLeads.forEach((lead: any) => {
            allRecords.push({
              id: lead.id || `action-lead-${Date.now()}`,
              projectId: lead.listing_id || projectId,
              projectSlug: lead.listing_slug || projectSlug,
              projectName: lead.listing_name || projectName,
              sessionId: `action-ses-${lead.id || Date.now()}`,
              dwellSeconds: 0,
              detailsShared: true,
              action: lead.action,
              viewerName: lead.buyer_name,
              viewerPhone: lead.buyer_phone,
              viewerEmail: lead.buyer_email,
              createdAt: lead.created_at,
              updatedAt: lead.created_at,
            });
          });
        }

        // Also query project_leads to ensure all shared members are accounted for
        let leadQuery = supabaseAdmin.from("project_leads").select("*");
        if (projectId) leadQuery = leadQuery.eq("project_id", projectId);
        else if (projectSlug) leadQuery = leadQuery.eq("project_slug", projectSlug);

        const { data: dbLeads, error: leadsError } = await leadQuery;
        if (leadsError) throw leadsError;
        if (dbLeads && dbLeads.length > 0) {
          dbLeads.forEach((lead: any) => {
            const alreadyHas = allRecords.some(
              (r) => r.detailsShared && r.viewerPhone === lead.viewer_phone && r.createdAt === lead.created_at
            );
            if (!alreadyHas) {
              allRecords.push({
                id: lead.id || `lead-${Date.now()}`,
                projectId: lead.project_id || projectId,
                projectSlug: lead.project_slug || projectSlug,
                projectName: lead.project_name || projectName,
                sessionId: `lead-ses-${lead.id || Date.now()}`,
                dwellSeconds: 0,
                detailsShared: true,
                action: "contact_builder",
                viewerName: lead.viewer_name,
                viewerPhone: lead.viewer_phone,
                viewerEmail: lead.viewer_email,
                createdAt: lead.created_at,
                updatedAt: lead.created_at,
              });
            }
          });
        }
      } catch (dbErr) {
        throw dbErr;
      }
    }

    // Determine Date Filter Bounds
    const startMs = startDateParam ? new Date(startDateParam).getTime() : 0;
    const endMs = endDateParam ? new Date(endDateParam).getTime() + 86400000 : Infinity; // inclusive of end day

    const filteredRecords = allRecords.filter((r) => {
      const recMs = new Date(r.createdAt).getTime();
      return recMs >= startMs && recMs <= endMs;
    });

    // Compute Today's Date String in Asia/Kolkata (YYYY-MM-DD)
    const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const todayClicks = allRecords.filter((r) => {
      const rDateStr = new Date(r.createdAt).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
      return rDateStr === todayStr;
    }).length;

    const totalClicks = filteredRecords.length;
    const totalDwellSeconds = filteredRecords.reduce((acc, r) => acc + (r.dwellSeconds || 0), 0);
    const avgDwellSeconds = totalClicks > 0 ? Math.round(totalDwellSeconds / totalClicks) : 0;

    const sharedMembers = filteredRecords
      .filter((r) => r.detailsShared && (r.viewerPhone || r.viewerName))
      .map((r, idx) => ({
        sNo: idx + 1,
        date: new Date(r.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
        name: r.viewerName || "Prospective Buyer",
        phone: r.viewerPhone || "Provided on call",
        email: r.viewerEmail || "-",
        action:
          (r.action && ACTION_LABELS[r.action as ContactAction]) ||
          (r.action === "save"
            ? "Saved / Shortlisted Project"
            : r.action === "contact_builder"
            ? "Clicked WhatsApp Builder"
            : r.action === "site_visit"
            ? "Scheduled Site Visit"
            : "Direct Inquiry"),
        dwellTime: formatDuration(r.dwellSeconds),
      }));

    const detailsSharedCount = sharedMembers.length;

    // Return JSON if requested
    if (format === "json") {
      const monthly = new Map<string, { month: string; views: number; leads: number }>();
      for (const record of filteredRecords) {
        const month = record.createdAt.slice(0, 7);
        const bucket = monthly.get(month) || { month, views: 0, leads: 0 };
        bucket.views += 1;
        if (record.detailsShared) bucket.leads += 1;
        monthly.set(month, bucket);
      }
      return NextResponse.json({
        success: true,
        projectName,
        projectId,
        projectSlug,
        dateRange: {
          startDate: startDateParam || "All time",
          endDate: endDateParam || "Today",
        },
        metrics: {
          todayClicks,
          totalClicks,
          avgDwellSeconds,
          avgDwellFormatted: formatDuration(avgDwellSeconds),
          detailsSharedCount,
        },
        sharedMembers,
        monthlyActivity: [...monthly.values()].sort((a, b) => a.month.localeCompare(b.month)),
      });
    }

    // Generate real Excel (.xlsx) workbook with auto-sized columns and explicit string cells
    const rows: ExcelCellValue[][] = [];
    const boldRows: number[] = [];

    const addRow = (row: ExcelCellValue[], bold = false) => {
      if (bold) boldRows.push(rows.length);
      rows.push(row);
    };

    // Header Title
    addRow(["ROADFACING — PROJECT ACTIVITY & PERFORMANCE REPORT"], true);
    addRow(["Generated on", new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })]);
    addRow([]);

    // Section 1: Project & Range Overview
    addRow(["PROJECT NAME", projectName], true);
    addRow(["PROJECT SLUG", projectSlug || "-"]);
    addRow(["REPORT DATE RANGE", `${startDateParam || "All Time"} to ${endDateParam || "Current Date"}`]);
    addRow([]);

    // Section 2: Real Key Metrics
    addRow(["REAL TRACKED PERFORMANCE METRICS"], true);
    addRow(["Metric", "Real Tracked Value"], true);
    addRow(["Today's Clicks (00:00 - 23:59 IST)", todayClicks]);
    addRow(["Total Clicks in Selected Range", totalClicks]);
    addRow(["Average Time Spent (Dwell Time)", formatDuration(avgDwellSeconds)]);
    addRow(["Total Members Details Shared with Builder", detailsSharedCount]);
    addRow([]);

    // Section 3: Members Details Shared with Builder
    addRow(["MEMBERS DETAILS SHARED WITH BUILDER"], true);
    addRow(
      [
        "S.No",
        "Date & Time (IST)",
        "Member Name",
        "WhatsApp Phone",
        "Email Address",
        "Action / Intent",
        "Time Spent Before Action",
      ],
      true
    );

    if (sharedMembers.length === 0) {
      addRow(["No buyer details were shared with builder in the selected date range."]);
    } else {
      sharedMembers.forEach((m) => {
        addRow([
          m.sNo,
          m.date,
          m.name,
          formatPhoneForExcel(m.phone),
          m.email || "-",
          m.action,
          m.dwellTime,
        ]);
      });
    }

    addRow([]);

    // Section 4: All Visitor Session Logs
    addRow(["VISITOR SESSIONS & IMPRESSION LOGS"], true);
    addRow(
      [
        "S.No",
        "Date & Time (IST)",
        "Session ID",
        "Time Spent (Seconds)",
        "Formatted Time",
        "Details Shared?",
      ],
      true
    );

    filteredRecords.forEach((r, i) => {
      addRow([
        i + 1,
        new Date(r.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
        r.sessionId,
        r.dwellSeconds || 0,
        formatDuration(r.dwellSeconds || 0),
        r.detailsShared ? "YES" : "NO",
      ]);
    });

    const xlsxBytes = buildXlsxBytes(projectName, rows, { boldFirstRow: true, boldRows });
    const sanitizedName = projectName.replace(/[^a-zA-Z0-9]/g, "_");
    const dateSlug = new Date().toISOString().slice(0, 10);
    const filename = `ROAD_Activity_${sanitizedName}_${dateSlug}.xlsx`;

    return new NextResponse(Buffer.from(xlsxBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (err: any) {
    console.error("[ACTIVITY REPORT ERROR]:", err);
    return portalError(err);
  }
}
