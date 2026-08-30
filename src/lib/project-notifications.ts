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
 * - Resolves user from argument or localStorage directly
 * - Resolves builder phone from top-level or nested builder object
 * - Uses 60-second per-project throttle to prevent double-sends on navigation mount while allowing all projects to trigger
 * - Uses keepalive: true to ensure fetch completes during page transitions
 */
export function triggerProjectViewNotification(
  project: ProjectNotificationData | null | undefined,
  user?: SessionUser | null
): boolean {
  if (!project) return false;

  // 1. Resolve logged-in user from prop or directly from localStorage
  let currentUser: SessionUser | null = user || null;
  if ((!currentUser || !currentUser.phone) && typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("road_user");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && (parsed.isLoggedIn === true || parsed.phone)) {
          currentUser = {
            id: parsed.id,
            name: parsed.name || "Interested Buyer",
            phone: parsed.phone,
            email: parsed.email || "",
            isLoggedIn: true,
          };
        }
      }
    } catch {}
  }

  if (!currentUser || !currentUser.isLoggedIn) {
    console.log("[ProjectViewNotify] skipped: user not logged in");
    return false;
  }

  const viewerName = (currentUser.name || "").trim() || "Interested Buyer";
  const viewerPhone = (currentUser.phone || "").trim();

  if (!viewerPhone || viewerPhone.length < 8) {
    console.log("[ProjectViewNotify] skipped: invalid viewer phone");
    return false;
  }

  const projectKey = project.id || project.slug || project.name;
  if (!projectKey) return false;

  // 2. 60-second deduplication throttle per project to prevent double-firing on click + mount
  const dedupeKey = `road_project_view_ts_${projectKey}_${viewerPhone.replace(/\D/g, "")}`;
  if (typeof window !== "undefined" && window.sessionStorage) {
    const lastSentStr = sessionStorage.getItem(dedupeKey);
    if (lastSentStr) {
      const lastSentTime = parseInt(lastSentStr, 10);
      if (!isNaN(lastSentTime) && Date.now() - lastSentTime < 60000) {
        console.log(`[ProjectViewNotify] already sent for ${projectKey} within last 60s (throttled)`);
        return false;
      }
    }
    sessionStorage.setItem(dedupeKey, String(Date.now()));
  }

  // 3. Resolve all builder contact fields
  const resolvedBuilderPhone =
    project.builderWhatsapp ||
    project.builderPhone ||
    project.builder?.whatsapp ||
    project.builder?.phone ||
    project.builder_whatsapp ||
    project.builder_phone ||
    "8885005567";

  console.log(`[ProjectViewNotify] Dispatching WhatsApp view notification for "${project.name || projectKey}"`);

  // 4. Fire-and-forget API request with keepalive
  try {
    const payload = JSON.stringify({
      projectId: project.id,
      projectSlug: project.slug,
      projectName: project.name,
      projectRefId: getRefId(project),
      builderPhone: resolvedBuilderPhone,
      builderWhatsapp: project.builderWhatsapp || project.builder?.whatsapp,
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
      }).catch((err) => {
        console.warn("[ProjectViewNotify] POST failed:", err);
      });
    }
    return true;
  } catch (err) {
    console.warn("[ProjectViewNotify] exception:", err);
    return false;
  }
}

