"use client";

import { getRefId } from "@/lib/ref-id";
import type { SessionUser } from "@/hooks/use-auth-session";

export interface ProjectNotificationData {
  id?: string;
  slug?: string;
  name?: string;
  builderPhone?: string;
  builderWhatsapp?: string;
  builder?: {
    phone?: string | null;
    whatsapp?: string | null;
    name?: string;
  };
  [key: string]: any;
}

/**
 * Triggers an immediate, non-blocking WhatsApp notification to the project builder via Wasender.
 * - Authenticates automatically via secure same-origin HTTP-only cookie
 * - Uses stable dedupe key road_project_view_notified:{projectKey}:{viewerPhone}
 * - Uses an in-flight pending lock and commits 24h dedupe ONLY when API JSON returns success: true
 * - Clears pending lock on failure so detail page mount or subsequent navigation can safely retry
 */
export function triggerProjectViewNotification(
  project: ProjectNotificationData | null | undefined,
  user?: SessionUser | null
): boolean {
  if (!project) return false;

  // 1. Resolve logged-in user from prop or directly from localStorage UI state
  let currentUser: SessionUser | null = user || null;

  if (typeof window !== "undefined") {
    try {
      if (!currentUser || !currentUser.phone) {
        const stored = localStorage.getItem("road_user");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && (parsed.isLoggedIn === true || parsed.phone)) {
            currentUser = {
              id: parsed.id,
              name: parsed.name || "",
              phone: parsed.phone,
              email: parsed.email || "",
              isLoggedIn: true,
            };
          }
        }
      }
    } catch {}
  }

  if (!currentUser || !currentUser.isLoggedIn) {
    return false;
  }

  const viewerPhone = (currentUser.phone || "").trim();
  const viewerName = (currentUser.name || "").trim();

  if (!viewerPhone || viewerPhone.length < 8) {
    return false;
  }

  const projectKey = String(project.id || project.slug || project.name || "").trim();
  if (!projectKey) return false;

  const cleanViewerPhone = viewerPhone.replace(/\D/g, "");
  const dedupeKey = `road_project_view_notified:${projectKey}:${cleanViewerPhone}`;
  const pendingKey = `${dedupeKey}:pending`;

  if (typeof window !== "undefined") {
    try {
      // Check if already permanently confirmed in last 24h
      const sessionSent = window.sessionStorage?.getItem(dedupeKey);
      const localSent = window.localStorage?.getItem(dedupeKey);
      const lastSentStr = sessionSent || localSent;

      if (lastSentStr) {
        const lastSentTime = parseInt(lastSentStr, 10);
        if (!isNaN(lastSentTime) && Date.now() - lastSentTime < 86400000) {
          return false;
        }
      }

      // Check if a request is already in-flight (within last 15s)
      const pendingStr = window.sessionStorage?.getItem(pendingKey);
      if (pendingStr) {
        const pendingTime = parseInt(pendingStr, 10);
        if (!isNaN(pendingTime) && Date.now() - pendingTime < 15000) {
          return false;
        }
      }

      window.sessionStorage?.setItem(pendingKey, String(Date.now()));
    } catch {}
  }

  // 2. Dispatch API Request with keepalive (Cookie sent automatically)
  try {
    const payload = JSON.stringify({
      projectId: project.id,
      projectSlug: project.slug,
      projectName: project.name,
      projectRefId: getRefId(project),
      viewer: {
        name: viewerName,
        phone: viewerPhone,
        email: currentUser.email || "",
      },
    });

    if (typeof fetch === "function") {
      fetch("/api/projects/view-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      })
        .then(async (res) => {
          if (typeof window !== "undefined") {
            window.sessionStorage?.removeItem(pendingKey);
            if (res.ok) {
              const data = await res.json().catch(() => ({}));
              // Only confirm permanent 24h dedupe when API confirms real dispatch/record
              if (
                data &&
                data.success === true &&
                (data.mode === "single_instant" ||
                  data.mode === "surge_alert" ||
                  data.mode === "surge_silent_record")
              ) {
                const nowStr = String(Date.now());
                window.sessionStorage?.setItem(dedupeKey, nowStr);
                window.localStorage?.setItem(dedupeKey, nowStr);
              }
            }
          }
        })
        .catch((err) => {
          console.warn("[ProjectViewNotify] POST failed:", err);
          if (typeof window !== "undefined") {
            window.sessionStorage?.removeItem(pendingKey);
          }
        });
    }
    return true;
  } catch (err) {
    console.warn("[ProjectViewNotify] exception:", err);
    if (typeof window !== "undefined") {
      window.sessionStorage?.removeItem(pendingKey);
    }
    return false;
  }
}
