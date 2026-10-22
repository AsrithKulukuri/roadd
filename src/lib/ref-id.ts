import type { Property } from "@/types/property";
import type { Project } from "@/types/project";

/**
 * Returns a standardized reference ID for any property or project (e.g. "REF101", "REF123")
 */
export function getRefId(item: Property | Project | { id?: string; slug?: string; title?: string; name?: string; refId?: string; location?: Record<string, unknown>; attributes?: Record<string, unknown> } | null | undefined): string {
  if (!item) return "";
  const rawRecord = item as Record<string, unknown>;
  const loc = (typeof rawRecord.location === "object" && rawRecord.location !== null) ? (rawRecord.location as Record<string, unknown>) : undefined;
  const attr = (typeof rawRecord.attributes === "object" && rawRecord.attributes !== null) ? (rawRecord.attributes as Record<string, unknown>) : undefined;
  const explicitRef = (typeof item.refId === "string" && item.refId.trim())
    || (typeof loc?.refId === "string" && (loc.refId as string).trim())
    || (typeof attr?.refId === "string" && (attr.refId as string).trim())
    || (typeof rawRecord.ref_id === "string" && (rawRecord.ref_id as string).trim())
    || undefined;

  if (explicitRef) {
    const rawRef = explicitRef.trim().toUpperCase().replace(/[\s-_]/g, "");
    return rawRef.startsWith("REF") ? rawRef : `REF${rawRef}`;
  }

  // Fallback: Generate clean deterministic ref ID if refId is not explicitly set.
  // Guard against extracting timestamps from entity IDs like "proj-1791887791922" or UUIDs.
  const rawId = String(item.id || item.slug || "");
  if (!/^(proj|prop|usr)-/i.test(rawId) && !/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(rawId)) {
    const digits = rawId.replace(/\D/g, "");
    if (digits && digits.length >= 2 && digits.length <= 4) {
      return `REF${digits.padStart(4, "0")}`;
    }
  }

  // Deterministic fallback using stable hash
  const label = "title" in item && item.title ? item.title : "name" in item && item.name ? item.name : "";
  const str = String(item.id || item.slug || label || "000");
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) % 900;
  }
  return `REF${String(100 + Math.abs(hash)).padStart(4, "0")}`;
}

/**
 * Backward compatibility alias for properties
 */
export const getPropertyRefId = getRefId;

/**
 * Backward compatibility alias for projects
 */
export const getProjectRefId = getRefId;

/**
 * Checks if search text resembles a Reference ID query (e.g. "ref123", "REF-123", "#ref123", "REF 123")
 */
export function isRefIdQuery(query: string): boolean {
  if (!query || !query.trim()) return false;
  const raw = query.trim().toUpperCase().replace(/^#/, "").replace(/[\s-_]/g, "");
  return /^REF\d+$/i.test(raw) || /^REF-[A-Z0-9]+$/i.test(raw);
}

export interface RefMatchResult {
  type: "property" | "project";
  item: Property | Project;
  url: string;
  refId: string;
  title: string;
}

/**
 * Checks if search text matches a property or project reference ID.
 * Returns matching result with direct URL if found, or null.
 */
export function findItemByRefId(
  query: string,
  properties: Property[] = [],
  projects: Project[] = []
): RefMatchResult | null {
  if (!query || !query.trim()) return null;

  const raw = query.trim().toUpperCase().replace(/^#/, "").replace(/[\s-_]/g, "");
  if (!raw) return null;

  // 1. Search Properties
  for (const p of properties) {
    const ref = getRefId(p).toUpperCase().replace(/[\s-_]/g, "");

    // Direct match against clean ref e.g. REF123 vs REF123
    if (raw === ref) {
      return {
        type: "property",
        item: p,
        url: `/properties/${p.slug || p.id}`,
        refId: ref,
        title: p.title,
      };
    }

    // Match "REF123" if user types "123" or "ref 123"
    if (ref.startsWith("REF") && (raw === ref.replace("REF", "") || raw === `REF${ref.replace("REF", "")}`)) {
      return {
        type: "property",
        item: p,
        url: `/properties/${p.slug || p.id}`,
        refId: ref,
        title: p.title,
      };
    }

    // Direct match against property id or slug
    if (raw === (p.id || "").toUpperCase().replace(/[\s-_]/g, "") || raw === (p.slug || "").toUpperCase().replace(/[\s-_]/g, "")) {
      return {
        type: "property",
        item: p,
        url: `/properties/${p.slug || p.id}`,
        refId: ref,
        title: p.title,
      };
    }
  }

  // 2. Search Projects
  for (const proj of projects) {
    const ref = getRefId(proj).toUpperCase().replace(/[\s-_]/g, "");

    if (raw === ref) {
      return {
        type: "project",
        item: proj,
        url: `/projects/${proj.slug || proj.id}`,
        refId: ref,
        title: proj.name,
      };
    }

    if (ref.startsWith("REF") && (raw === ref.replace("REF", "") || raw === `REF${ref.replace("REF", "")}`)) {
      return {
        type: "project",
        item: proj,
        url: `/projects/${proj.slug || proj.id}`,
        refId: ref,
        title: proj.name,
      };
    }

    if (raw === (proj.id || "").toUpperCase().replace(/[\s-_]/g, "") || raw === (proj.slug || "").toUpperCase().replace(/[\s-_]/g, "")) {
      return {
        type: "project",
        item: proj,
        url: `/projects/${proj.slug || proj.id}`,
        refId: ref,
        title: proj.name,
      };
    }
  }

  return null;
}

/**
 * Backward compatibility alias for finding property
 */
export function findPropertyByRefId<T extends { id: string; slug?: string; title?: string; refId?: string } = Property>(
  query: string,
  properties: T[]
): T | null {
  if (!query || !query.trim()) return null;
  const raw = query.trim().toUpperCase().replace(/^#/, "").replace(/[\s-_]/g, "");
  if (!raw) return null;

  for (const p of properties) {
    const ref = getRefId(p).toUpperCase().replace(/[\s-_]/g, "");
    if (
      raw === ref ||
      (ref.startsWith("REF") && (raw === ref.replace("REF", "") || raw === `REF${ref.replace("REF", "")}`)) ||
      raw === (p.id || "").toUpperCase().replace(/[\s-_]/g, "") ||
      raw === (p.slug || "").toUpperCase().replace(/[\s-_]/g, "")
    ) {
      return p;
    }
  }
  return null;
}

/**
 * Extracts the numeric sequence and padding length from any reference ID string.
 * Supports patterns like "REF0002", "ref0002v", "REF-0002", "ref 0002", "0002".
 * Ignores raw entity timestamps (like "proj-1791887791922") and UUIDs.
 */
export function extractRefNumber(rawRef: unknown): { num: number; padLength: number; digitStr: string } | null {
  if (!rawRef || typeof rawRef !== "string") return null;
  const trimmed = rawRef.trim();
  if (!trimmed) return null;

  // Ignore raw entity IDs like "proj-1791887791922" or UUIDs
  if (/^(proj|prop|usr)-/i.test(trimmed)) return null;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(trimmed)) return null;
  // Ignore timestamp-derived values (e.g. REF17923 generated from Date.now() timestamp prefixes)
  if (/^#?REF[\s-_]*1[6-9]\d{3,}/i.test(trimmed)) return null;

  // Match prefix (REF, ref, #, REF-) followed by digits, or find the primary digit sequence
  const match = trimmed.match(/^(?:#?REF[\s-_]*)?(\d+)/i) || trimmed.match(/(\d+)/);
  if (!match) return null;

  const digitStr = match[1] || match[0];
  if (!digitStr || !/^\d+$/.test(digitStr)) return null;

  const num = parseInt(digitStr, 10);
  if (isNaN(num) || num <= 0 || num > 9999) return null;

  return {
    num,
    padLength: Math.max(digitStr.length, 4),
    digitStr,
  };
}

/**
 * Computes the next sequential Reference ID for a new project based on existing projects.
 * Considers the most recent and greatest refId (e.g. if the recent one is "ref0002v" or "REF0002",
 * it automatically fills "REF0003").
 */
export function getNextProjectRefId(
  existingProjects: (Project | Record<string, unknown>)[] = []
): string {
  const existingRefs = new Set<string>();
  let maxNum = 0;
  let padLength = 4; // Default to 4 digits (e.g. REF0001, REF0002, REF0003)

  // 1. Scan all existing projects for greatest numeric refId
  for (const item of existingProjects) {
    if (!item || typeof item !== "object") continue;
    const raw = item as Record<string, unknown>;
    const loc = typeof raw.location === "object" && raw.location !== null
      ? (raw.location as Record<string, unknown>)
      : undefined;

    // Check explicit ref fields
    const explicitRef = (typeof raw.refId === "string" && raw.refId.trim())
      || (typeof loc?.refId === "string" && (loc.refId as string).trim())
      || (typeof raw.ref_id === "string" && (raw.ref_id as string).trim())
      || undefined;

    if (explicitRef) {
      const cleanUpper = explicitRef.trim().toUpperCase();
      existingRefs.add(cleanUpper);
      const normalized = cleanUpper.startsWith("REF") ? cleanUpper : `REF${cleanUpper}`;
      existingRefs.add(normalized);

      const extracted = extractRefNumber(explicitRef);
      if (extracted) {
        if (extracted.num > maxNum) {
          maxNum = extracted.num;
          padLength = Math.max(extracted.padLength, 4);
        }
      }
    }
  }

  // 2. Also inspect the most recent project sorted by creation/update timestamp
  const sortedProjects = [...existingProjects].sort((a, b) => {
    const aDate = (a as any).createdAt || (a as any).updatedAt || "";
    const bDate = (b as any).createdAt || (b as any).updatedAt || "";
    return String(bDate).localeCompare(String(aDate));
  });

  for (const item of sortedProjects) {
    const raw = item as Record<string, unknown>;
    const loc = typeof raw.location === "object" && raw.location !== null
      ? (raw.location as Record<string, unknown>)
      : undefined;

    const explicitRef = (typeof raw.refId === "string" && raw.refId.trim())
      || (typeof loc?.refId === "string" && (loc.refId as string).trim())
      || (typeof raw.ref_id === "string" && (raw.ref_id as string).trim())
      || undefined;

    if (explicitRef) {
      const extracted = extractRefNumber(explicitRef);
      if (extracted) {
        if (extracted.num > maxNum) {
          maxNum = extracted.num;
          padLength = Math.max(extracted.padLength, 4);
        }
        break; // Found the most recent project with a valid refId
      }
    }
  }

  // Calculate next number: greatest/recent + 1 (if no projects exist, starts at 1 -> REF0001)
  let nextNum = maxNum + 1;
  let candidate = `REF${String(nextNum).padStart(padLength, "0")}`;

  // Ensure candidate does not collide with any existing reference ID
  while (existingRefs.has(candidate.toUpperCase())) {
    nextNum++;
    candidate = `REF${String(nextNum).padStart(padLength, "0")}`;
  }

  return candidate;
}

/**
 * Helper to generate a new unique refId not currently in use
 */
export function generateNewRefId(existingItems: (Property | Project)[] = []): string {
  const existingRefs = new Set(existingItems.map((item) => getRefId(item).toUpperCase()));
  for (let i = 101; i <= 9999; i++) {
    const candidate = `REF${i}`;
    if (!existingRefs.has(candidate)) {
      return candidate;
    }
  }
  return `REF${Math.floor(1000 + Math.random() * 9000)}`;
}

