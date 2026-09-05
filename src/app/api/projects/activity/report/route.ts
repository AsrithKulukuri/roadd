import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getActivityStore, ProjectActivityRecord } from "../track/route";

export const dynamic = "force-dynamic";

function escapeCsv(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  const safe = /^[=+\-@\t\r]/.test(str.trimStart()) ? "'" + str : str;
  return '"' + safe.replace(/"/g, '""') + '"';
}

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
    const projectId = searchParams.get("projectId") || "";
    const projectSlug = searchParams.get("projectSlug") || "";
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

        const { data: dbLogs } = await q;
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

        // Also query project_leads to ensure all shared members are accounted for
        let leadQuery = supabaseAdmin.from("project_leads").select("*");
        if (projectId) leadQuery = leadQuery.eq("project_id", projectId);
        else if (projectSlug) leadQuery = leadQuery.eq("project_slug", projectSlug);

        const { data: dbLeads } = await leadQuery;
        if (dbLeads && dbLeads.length > 0) {
          dbLeads.forEach((lead: any) => {
            const alreadyHas = allRecords.some(
              (r) => r.detailsShared && r.viewerPhone === lead.viewer_phone
            );
            if (!alreadyHas) {
              allRecords.push({
                id: lead.id || `lead-${Date.now()}`,
                projectId: lead.project_id || projectId,
                projectSlug: lead.project_slug || projectSlug,
                projectName: lead.project_name || projectName,
                sessionId: `lead-ses-${lead.id || Date.now()}`,
                dwellSeconds: 30,
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
        console.warn("[ACTIVITY REPORT] Supabase query skipped:", dbErr);
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
          r.action === "save"
            ? "Saved / Shortlisted Project"
            : r.action === "contact_builder"
            ? "Clicked WhatsApp Builder"
            : r.action === "site_visit"
            ? "Scheduled Site Visit"
            : "Direct Inquiry",
        dwellTime: formatDuration(r.dwellSeconds),
      }));

    const detailsSharedCount = sharedMembers.length;

    // Return JSON if requested
    if (format === "json") {
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
      });
    }

    // Generate Excel / CSV format with UTF-8 BOM
    const lines: string[] = [];

    // Header Title
    lines.push(escapeCsv("ROAD FACING — PROJECT ACTIVITY & PERFORMANCE REPORT"));
    lines.push(escapeCsv("Generated on: " + new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })));
    lines.push("");

    // Section 1: Project & Range Overview
    lines.push([escapeCsv("PROJECT NAME"), escapeCsv(projectName)].join(","));
    lines.push([escapeCsv("PROJECT SLUG"), escapeCsv(projectSlug || "-")].join(","));
    lines.push([escapeCsv("REPORT DATE RANGE"), escapeCsv(`${startDateParam || "All Time"} to ${endDateParam || "Current Date"}`)].join(","));
    lines.push("");

    // Section 2: Real Key Metrics
    lines.push(escapeCsv("--- REAL TRACKED PERFORMANCE METRICS ---"));
    lines.push([escapeCsv("Metric"), escapeCsv("Real Tracked Value")].join(","));
    lines.push([escapeCsv("Today's Clicks (00:00 - 23:59 IST)"), escapeCsv(todayClicks)].join(","));
    lines.push([escapeCsv("Total Clicks in Selected Range"), escapeCsv(totalClicks)].join(","));
    lines.push([escapeCsv("Average Time Spent (Dwell Time)"), escapeCsv(formatDuration(avgDwellSeconds))].join(","));
    lines.push([escapeCsv("Total Members Details Shared with Builder"), escapeCsv(detailsSharedCount)].join(","));
    lines.push("");

    // Section 3: Members Details Shared with Builder
    lines.push(escapeCsv("--- MEMBERS DETAILS SHARED WITH BUILDER ---"));
    lines.push(
      [
        escapeCsv("S.No"),
        escapeCsv("Date & Time (IST)"),
        escapeCsv("Member Name"),
        escapeCsv("WhatsApp Phone"),
        escapeCsv("Email Address"),
        escapeCsv("Action / Intent"),
        escapeCsv("Time Spent Before Action"),
      ].join(",")
    );

    if (sharedMembers.length === 0) {
      lines.push(escapeCsv("No buyer details were shared with builder in the selected date range."));
    } else {
      sharedMembers.forEach((m) => {
        lines.push(
          [
            escapeCsv(m.sNo),
            escapeCsv(m.date),
            escapeCsv(m.name),
            escapeCsv(m.phone),
            escapeCsv(m.email),
            escapeCsv(m.action),
            escapeCsv(m.dwellTime),
          ].join(",")
        );
      });
    }

    lines.push("");

    // Section 4: All Visitor Session Logs
    lines.push(escapeCsv("--- VISITOR SESSIONS & IMPRESSION LOGS ---"));
    lines.push(
      [
        escapeCsv("S.No"),
        escapeCsv("Date & Time (IST)"),
        escapeCsv("Session ID"),
        escapeCsv("Time Spent (Seconds)"),
        escapeCsv("Formatted Time"),
        escapeCsv("Details Shared?"),
      ].join(",")
    );

    filteredRecords.forEach((r, i) => {
      lines.push(
        [
          escapeCsv(i + 1),
          escapeCsv(new Date(r.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })),
          escapeCsv(r.sessionId),
          escapeCsv(r.dwellSeconds || 0),
          escapeCsv(formatDuration(r.dwellSeconds || 0)),
          escapeCsv(r.detailsShared ? "YES" : "NO"),
        ].join(",")
      );
    });

    // Prepend UTF-8 BOM so Excel opens with perfect UTF-8 characters and formatting
    const csvContent = "\uFEFF" + lines.join("\r\n");
    const sanitizedName = projectName.replace(/[^a-zA-Z0-9]/g, "_");
    const dateSlug = new Date().toISOString().slice(0, 10);
    const filename = `ROAD_Activity_${sanitizedName}_${dateSlug}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (err: any) {
    console.error("[ACTIVITY REPORT ERROR]:", err);
    return NextResponse.json({ success: false, error: err?.message || "Failed to generate report" }, { status: 500 });
  }
}
