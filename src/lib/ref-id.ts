import type { Property } from "@/types/property";
import type { Project } from "@/types/project";

/**
 * Returns a standardized reference ID for any property or project (e.g. "REF101", "REF123")
 */
export function getRefId(item: Property | Project | any): string {
  if (!item) return "";
  if (item.refId && item.refId.trim()) {
    const rawRef = item.refId.trim().toUpperCase().replace(/[\s-_]/g, "");
    return rawRef.startsWith("REF") ? rawRef : `REF${rawRef}`;
  }

  // Fallback: Generate clean deterministic ref ID from ID string if refId is not explicitly set
  const digits = (item.id || item.slug || "").replace(/\D/g, "");
  if (digits && digits.length >= 2) {
    return `REF${digits.slice(0, 4)}`;
  }

  // Fallback using simple char-code hash
  const str = String(item.id || item.slug || item.title || item.name || "000");
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) % 900;
  }
  return `REF${100 + Math.abs(hash)}`;
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
export function findPropertyByRefId(query: string, properties: Property[]): Property | null {
  const res = findItemByRefId(query, properties, []);
  return res && res.type === "property" ? (res.item as Property) : null;
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
