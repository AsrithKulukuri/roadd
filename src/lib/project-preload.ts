"use client";

import type { Project } from "@/types/project";
import { resolveMediaUrl } from "@/lib/aws/storage-utils";
import { readActionSession } from "@/lib/action-auth";

const MAX_PRELOAD_PROJECTS = 30;
const memoryProjectCache = new Map<string, Project>();
const prewarmedMediaUrls = new Set<string>();

/**
 * Pre-warms an image asset in the browser cache using an Image object.
 */
export function prewarmImageUrl(rawUrl: string | null | undefined): void {
  if (!rawUrl || typeof window === "undefined") return;
  const clean = rawUrl.trim();
  if (!clean || clean.endsWith(".pdf") || prewarmedMediaUrls.has(clean)) return;

  const resolved = resolveMediaUrl(clean);
  if (prewarmedMediaUrls.has(resolved)) return;

  prewarmedMediaUrls.add(clean);
  prewarmedMediaUrls.add(resolved);

  const img = new Image();
  img.src = resolved;
}

/**
 * Pre-warms cover image and initial above-the-fold gallery images for a project.
 */
export function prewarmProjectMedia(project: Partial<Project> | null | undefined): void {
  if (!project || typeof window === "undefined") return;

  // 1. Prioritize Cover image
  if (project.coverImage) {
    prewarmImageUrl(project.coverImage);
  }

  // 2. Pre-warm first 2 visible gallery images
  if (Array.isArray(project.images)) {
    for (let i = 0; i < Math.min(2, project.images.length); i++) {
      const item = project.images[i];
      const url = typeof item === "string" ? item : item?.url;
      if (url && url !== project.coverImage) {
        prewarmImageUrl(url);
      }
    }
  }

  // 3. Pre-warm video thumbnail if available
  if (project.videoThumbnail) {
    prewarmImageUrl(project.videoThumbnail);
  }
}

/**
 * Pre-warms the action session (user credentials/phone) in the background
 * so WhatsApp and Schedule buttons are immediately ready.
 */
export function prewarmProjectSession(): void {
  if (typeof window === "undefined") return;
  try {
    void readActionSession().catch(() => {});
  } catch {}
}

/**
 * Seeds project data into fast in-memory cache and sessionStorage
 * so project navigation renders with zero delay.
 */
export function seedProjectCache(project: Project | Record<string, any> | null | undefined): void {
  if (!project) return;

  const proj = project as Project;

  // Cache in memory Map (0ms instant access)
  if (proj.slug) {
    if (memoryProjectCache.size >= MAX_PRELOAD_PROJECTS) {
      const first = memoryProjectCache.keys().next().value;
      if (first) memoryProjectCache.delete(first);
    }
    memoryProjectCache.set(proj.slug, proj);
  }
  if (proj.id) {
    memoryProjectCache.set(proj.id, proj);
  }

  // Sync to sessionStorage and pre-warm media when running in browser
  if (typeof window !== "undefined") {
    try {
      const key = `road_cached_project_${project.slug || project.id}`;
      sessionStorage.setItem(key, JSON.stringify(project));
    } catch {}

    // Immediately pre-warm media and session in parallel
    prewarmProjectMedia(project);
    prewarmProjectSession();
  }
}

/**
 * Synchronously retrieves preloaded project data from memory or sessionStorage.
 */
export function getPreloadedProject(slugOrId: string | null | undefined): Project | null {
  if (!slugOrId) return null;

  // 1. Fast in-memory check (0ms)
  const mem = memoryProjectCache.get(slugOrId);
  if (mem) return mem;

  // 2. SessionStorage fallback in browser
  if (typeof window !== "undefined") {
    try {
      const key = `road_cached_project_${slugOrId}`;
      const raw = sessionStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as Project;
        if (parsed && typeof parsed === "object" && parsed.id) {
          memoryProjectCache.set(slugOrId, parsed);
          return parsed;
        }
      }
    } catch {}
  }

  return null;
}

