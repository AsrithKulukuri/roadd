import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export interface ProjectActivityRecord {
  id: string;
  projectId: string;
  projectSlug: string;
  projectName: string;
  sessionId: string;
  dwellSeconds: number;
  detailsShared: boolean;
  action?: string;
  viewerName?: string;
  viewerPhone?: string;
  viewerEmail?: string;
  createdAt: string;
  updatedAt: string;
}

declare global {
  var __road_project_activity_store: Map<string, ProjectActivityRecord[]> | undefined;
}

export function getActivityStore(): Map<string, ProjectActivityRecord[]> {
  if (!globalThis.__road_project_activity_store) {
    globalThis.__road_project_activity_store = new Map<string, ProjectActivityRecord[]>();
  }
  return globalThis.__road_project_activity_store;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      eventType,
      projectId,
      projectSlug,
      projectName,
      sessionId,
      dwellSeconds = 0,
      viewerName,
      viewerPhone,
      viewerEmail,
      timestamp = new Date().toISOString(),
    } = body;

    const projectKey = projectId || projectSlug || "unknown_project";
    const store = getActivityStore();
    const existingList = store.get(projectKey) || [];

    if (eventType === "view") {
      // Check if session already logged for this project in last 30 minutes
      const existingRecord = existingList.find(
        (r) => r.sessionId === sessionId && Date.now() - new Date(r.createdAt).getTime() < 1800000
      );

      if (!existingRecord) {
        const newRecord: ProjectActivityRecord = {
          id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          projectId: projectId || "",
          projectSlug: projectSlug || "",
          projectName: projectName || "ROAD Project",
          sessionId,
          dwellSeconds: 0,
          detailsShared: false,
          viewerName: viewerName || undefined,
          viewerPhone: viewerPhone || undefined,
          viewerEmail: viewerEmail || undefined,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        existingList.push(newRecord);
        store.set(projectKey, existingList);

        // Record in Supabase if configured
        if (supabaseAdmin) {
          try {
            await supabaseAdmin.from("project_activity_logs").insert({
              id: newRecord.id,
              project_id: projectId || null,
              project_slug: projectSlug || null,
              project_name: projectName || null,
              session_id: sessionId,
              dwell_seconds: 0,
              details_shared: false,
              viewer_name: viewerName || null,
              viewer_phone: viewerPhone || null,
              viewer_email: viewerEmail || null,
              created_at: timestamp,
              updated_at: timestamp,
            });
          } catch {}
        }
      }
    } else if (eventType === "dwell") {
      // Update dwell time for this session
      const targetRecord = existingList.find((r) => r.sessionId === sessionId);
      if (targetRecord) {
        targetRecord.dwellSeconds = Math.max(targetRecord.dwellSeconds, Number(dwellSeconds));
        targetRecord.updatedAt = timestamp;
      } else {
        const newRecord: ProjectActivityRecord = {
          id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          projectId: projectId || "",
          projectSlug: projectSlug || "",
          projectName: projectName || "ROAD Project",
          sessionId,
          dwellSeconds: Number(dwellSeconds),
          detailsShared: false,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        existingList.push(newRecord);
      }
      store.set(projectKey, existingList);

      if (supabaseAdmin) {
        try {
          await supabaseAdmin
            .from("project_activity_logs")
            .update({
              dwell_seconds: Number(dwellSeconds),
              updated_at: timestamp,
            })
            .eq("session_id", sessionId);
        } catch {}
      }
    }

    return NextResponse.json({ success: true, recorded: true });
  } catch (error: any) {
    console.warn("[ACTIVITY TRACK API ERROR]:", error);
    return NextResponse.json({ success: true, recorded: false });
  }
}
