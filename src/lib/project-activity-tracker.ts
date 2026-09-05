"use client";

import { formatWhatsAppPhone } from "@/lib/whatsapp/whatsapp-share";

export interface ActivityViewerInfo {
  name?: string;
  phone?: string;
  email?: string;
}

function getSessionId(): string {
  if (typeof window === "undefined") return "server";
  try {
    let sid = sessionStorage.getItem("road_project_session_id");
    if (!sid) {
      sid = `ses-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      sessionStorage.setItem("road_project_session_id", sid);
    }
    return sid;
  } catch {
    return `ses-${Date.now()}`;
  }
}

export function getCurrentUserViewer(): ActivityViewerInfo | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("road_user");
    if (raw) {
      const u = JSON.parse(raw);
      if (u && (u.phone || u.name)) {
        return {
          name: u.name || "Interested Buyer",
          phone: u.phone || "",
          email: u.email || "",
        };
      }
    }
  } catch {}
  return null;
}

/**
 * Records a real project impression / click without notifying the builder.
 */
export async function trackProjectImpression(payload: {
  projectId?: string;
  projectSlug?: string;
  projectName: string;
}) {
  if (typeof window === "undefined") return;

  const sessionId = getSessionId();
  const viewer = getCurrentUserViewer();

  try {
    const body = JSON.stringify({
      eventType: "view",
      projectId: payload.projectId || "",
      projectSlug: payload.projectSlug || "",
      projectName: payload.projectName,
      sessionId,
      viewerName: viewer?.name || null,
      viewerPhone: viewer?.phone || null,
      viewerEmail: viewer?.email || null,
      timestamp: new Date().toISOString(),
    });

    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/projects/activity/track", blob);
    } else {
      fetch("/api/projects/activity/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => null);
    }
  } catch (err) {
    console.warn("[ActivityTracker] Impression logging skipped:", err);
  }
}

/**
 * Initializes active dwell time tracking for a project.
 * Updates time spent while the tab is active and visible.
 */
export function initProjectDwellTracker(payload: {
  projectId?: string;
  projectSlug?: string;
  projectName: string;
}) {
  if (typeof window === "undefined") return () => {};

  const sessionId = getSessionId();
  let startTime = Date.now();
  let totalDwellSeconds = 0;
  let isTracking = true;

  const flushDwellTime = () => {
    if (!totalDwellSeconds || totalDwellSeconds < 1) return;

    const body = JSON.stringify({
      eventType: "dwell",
      projectId: payload.projectId || "",
      projectSlug: payload.projectSlug || "",
      projectName: payload.projectName,
      sessionId,
      dwellSeconds: Math.round(totalDwellSeconds),
      timestamp: new Date().toISOString(),
    });

    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([body], { type: "application/json" });
        navigator.sendBeacon("/api/projects/activity/track", blob);
      } else {
        fetch("/api/projects/activity/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        }).catch(() => null);
      }
    } catch {}
  };

  // Heartbeat interval every 15s to update dwell duration progressively
  const intervalId = setInterval(() => {
    if (document.visibilityState === "visible") {
      const now = Date.now();
      totalDwellSeconds += (now - startTime) / 1000;
      startTime = now;
      flushDwellTime();
    }
  }, 15000);

  const handleVisibilityChange = () => {
    const now = Date.now();
    if (document.visibilityState === "hidden") {
      totalDwellSeconds += (now - startTime) / 1000;
      flushDwellTime();
    } else {
      startTime = now;
    }
  };

  const handleBeforeUnload = () => {
    if (isTracking) {
      const now = Date.now();
      totalDwellSeconds += (now - startTime) / 1000;
      flushDwellTime();
    }
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("beforeunload", handleBeforeUnload);

  return () => {
    isTracking = false;
    clearInterval(intervalId);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    window.removeEventListener("beforeunload", handleBeforeUnload);
    const now = Date.now();
    totalDwellSeconds += (now - startTime) / 1000;
    flushDwellTime();
  };
}

/**
 * Triggers automated notification to builder and records lead when user saves, contacts, or schedules.
 */
export async function trackShareDetailsWithBuilder(params: {
  projectId?: string;
  projectSlug?: string;
  projectName: string;
  builderPhone?: string;
  action: "save" | "contact_builder" | "site_visit";
  viewer?: ActivityViewerInfo | null;
  notes?: string;
}) {
  if (typeof window === "undefined") return;

  const viewer = params.viewer || getCurrentUserViewer();
  const sessionId = getSessionId();

  try {
    const res = await fetch("/api/projects/activity/share-details", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: params.projectId || "",
        projectSlug: params.projectSlug || "",
        projectName: params.projectName,
        builderPhone: params.builderPhone || "",
        action: params.action,
        sessionId,
        viewerName: viewer?.name || "Interested Buyer",
        viewerPhone: viewer?.phone || "",
        viewerEmail: viewer?.email || "",
        notes: params.notes || "",
        timestamp: new Date().toISOString(),
      }),
    });
    return await res.json().catch(() => ({ success: false }));
  } catch (err) {
    console.warn("[ActivityTracker] Share details error:", err);
    return { success: false };
  }
}
