"use client";

import { getRefId } from "@/lib/ref-id";
import type { SessionUser } from "@/hooks/use-auth-session";

export interface ProjectNotificationData {
  id?: string;
  slug?: string;
  name?: string;
  builderPhone?: string;
  builderWhatsapp?: string;
  [key: string]: any;
}

/**
 * Triggers an immediate, non-blocking WhatsApp notification to the project builder via Wasender
 * with client-side deduplication via sessionStorage and keepalive for safe navigation.
 */
export function triggerProjectViewNotification(
  project: ProjectNotificationData | null | undefined,
  user: SessionUser | null | undefined
): boolean {
  if (!project || !user || !user.isLoggedIn) {
    if (process.env.NODE_ENV === "development") {
      console.log("[ProjectViewNotify] skipped: user not logged in or project missing");
    }
    return false;
  }

  const viewerName = (user.name || "").trim();
  const viewerPhone = (user.phone || "").trim();

  if (!viewerName || !viewerPhone) {
    if (process.env.NODE_ENV === "development") {
      console.log("[ProjectViewNotify] skipped: viewer name or phone missing");
    }
    return false;
  }

  const projectKey = project.id || project.slug;
  if (!projectKey) return false;

  const dedupeKey = `road_project_view_notified:${projectKey}:${viewerPhone}`;

  if (typeof window !== "undefined" && window.sessionStorage) {
    const alreadyNotified = sessionStorage.getItem(dedupeKey);
    if (alreadyNotified) {
      if (process.env.NODE_ENV === "development") {
        console.log("[ProjectViewNotify] already sent this session for", projectKey);
      }
      return false;
    }

    // Set dedupe flag immediately to prevent duplicate sends between click & detail page mount
    sessionStorage.setItem(dedupeKey, "1");
  }

  if (process.env.NODE_ENV === "development") {
    console.log("[ProjectViewNotify] sending notification for:", project.name || projectKey);
  }

  // Fire-and-forget API request with keepalive
  try {
    const payload = JSON.stringify({
      projectId: project.id,
      projectSlug: project.slug,
      projectName: project.name,
      projectRefId: getRefId(project),
      builderPhone: project.builderPhone,
      builderWhatsapp: project.builderWhatsapp,
      viewer: {
        name: viewerName,
        phone: viewerPhone,
        email: user.email || "",
      },
    });

    if (typeof fetch === "function") {
      fetch("/api/projects/view-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true, // Guarantees dispatch completes even during page navigation
      }).catch((err) => {
        if (process.env.NODE_ENV === "development") {
          console.warn("[ProjectViewNotify] failed:", err);
        }
      });
    }
    return true;
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[ProjectViewNotify] exception:", err);
    }
    return false;
  }
}
