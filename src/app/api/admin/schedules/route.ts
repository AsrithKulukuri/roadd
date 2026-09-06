import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SQL_MIGRATION_TEXT = `-- Run in Supabase SQL Editor:
CREATE TABLE IF NOT EXISTS public.project_site_visits (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    project_slug TEXT,
    project_name TEXT NOT NULL,
    project_location TEXT,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    builder_name TEXT,
    builder_phone TEXT,
    visit_date TEXT NOT NULL,
    time_slot TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled',
    customer_notified BOOLEAN NOT NULL DEFAULT false,
    builder_notified BOOLEAN NOT NULL DEFAULT false,
    reminder_sent BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_site_visits_status ON public.project_site_visits(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_visits_created ON public.project_site_visits(created_at DESC);
ALTER TABLE public.project_site_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public insert on project_site_visits" ON public.project_site_visits FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public select on project_site_visits" ON public.project_site_visits FOR SELECT TO public USING (true);
CREATE POLICY "Allow public update on project_site_visits" ON public.project_site_visits FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete on project_site_visits" ON public.project_site_visits FOR DELETE TO public USING (true);`;

/**
 * GET: Retrieve all site visit schedules with fallback to project_leads table
 */
export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({
        success: false,
        error: "Supabase admin client is not configured",
        schedules: [],
      });
    }

    let primarySchedules: any[] = [];
    let tableMissing = false;

    // 1. Try querying project_site_visits table
    const { data: siteVisits, error: visitError } = await supabaseAdmin
      .from("project_site_visits")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (visitError) {
      if (
        visitError.code === "42P01" ||
        visitError.message?.includes("does not exist") ||
        visitError.message?.includes("project_site_visits")
      ) {
        tableMissing = true;
      } else {
        console.warn("[ADMIN SCHEDULES API] Error querying project_site_visits:", visitError);
      }
    } else if (siteVisits) {
      primarySchedules = siteVisits.map((d: any) => ({
        id: d.id,
        projectId: d.project_id || "",
        projectSlug: d.project_slug || "",
        projectName: d.project_name || "Project Tour",
        projectLocation: d.project_location || "",
        customerName: d.customer_name || "Customer",
        customerPhone: d.customer_phone || "",
        customerEmail: d.customer_email || undefined,
        builderName: d.builder_name || undefined,
        builderPhone: d.builder_phone || undefined,
        visitDate: d.visit_date,
        timeSlot: d.time_slot,
        status: d.status || "scheduled",
        customerNotified: Boolean(d.customer_notified),
        builderNotified: Boolean(d.builder_notified),
        reminderSent: Boolean(d.reminder_sent),
        notes: d.notes || undefined,
        createdAt: d.created_at || new Date().toISOString(),
      }));
    }

    // 2. Also check project_leads for any visits logged as leads
    let fallbackSchedules: any[] = [];
    try {
      const { data: leadVisits } = await supabaseAdmin
        .from("project_leads")
        .select("*")
        .or("delivery_status.ilike.%scheduled_visit%,viewer_email.ilike.%scheduled%")
        .order("created_at", { ascending: false })
        .limit(200);

      if (leadVisits && leadVisits.length > 0) {
        const existingIds = new Set(primarySchedules.map((s) => s.id));
        const existingKeys = new Set(primarySchedules.map((s) => `${s.customerPhone}_${s.visitDate}`));

        for (const lead of leadVisits) {
          const rawStatus = lead.delivery_status || "";
          let visitDate = new Date(lead.created_at).toISOString().slice(0, 10);
          let timeSlot = "11:00 AM";

          if (rawStatus.startsWith("scheduled_visit:")) {
            const parts = rawStatus.split(":");
            if (parts[1]) visitDate = parts[1];
            if (parts[2]) timeSlot = parts.slice(2).join(":");
          }

          const dedupKey = `${lead.viewer_phone}_${visitDate}`;
          if (!existingIds.has(lead.id) && !existingKeys.has(dedupKey)) {
            fallbackSchedules.push({
              id: lead.id,
              projectId: lead.project_id || "",
              projectSlug: lead.project_slug || "",
              projectName: lead.project_name || "Site Visit",
              projectLocation: "",
              customerName: lead.viewer_name || "Customer",
              customerPhone: lead.viewer_phone || "",
              customerEmail: lead.viewer_email || undefined,
              builderPhone: lead.builder_phone || undefined,
              visitDate,
              timeSlot,
              status: "scheduled" as const,
              customerNotified: true,
              builderNotified: true,
              reminderSent: false,
              notes: undefined,
              createdAt: lead.created_at,
            });
          }
        }
      }
    } catch {
      // Best effort fallback
    }

    const combined = [...primarySchedules, ...fallbackSchedules];

    return NextResponse.json({
      success: true,
      count: combined.length,
      schedules: combined,
      tableMissing,
      sqlFix: tableMissing ? SQL_MIGRATION_TEXT : undefined,
    });
  } catch (err: any) {
    console.error("[ADMIN SCHEDULES GET ERROR]:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error", schedules: [] },
      { status: 500 }
    );
  }
}

/**
 * PATCH: Update schedule status (e.g. scheduled, completed, cancelled) or reminder flag
 */
export async function PATCH(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: "Database unavailable" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const { id, status, reminderSent } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing schedule ID" }, { status: 400 });
    }

    const updates: Record<string, any> = {};
    if (status) updates.status = status;
    if (typeof reminderSent === "boolean") updates.reminder_sent = reminderSent;

    const { error } = await supabaseAdmin
      .from("project_site_visits")
      .update(updates)
      .eq("id", id);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Schedule updated successfully" });
  } catch (err: any) {
    console.error("[ADMIN SCHEDULES PATCH ERROR]:", err);
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}

/**
 * DELETE: Remove a visit schedule
 */
export async function DELETE(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: "Database unavailable" }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing schedule ID parameter" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("project_site_visits")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Schedule deleted successfully" });
  } catch (err: any) {
    console.error("[ADMIN SCHEDULES DELETE ERROR]:", err);
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
