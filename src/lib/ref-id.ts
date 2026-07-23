import type { Property } from "@/types/property";

/**
 * Returns clean reference ID for a property (e.g. "REF345", "REF101")
 */
export function getPropertyRefId(p: Property | any): string {
  if (!p) return "";
  if (p.refId && p.refId.trim()) {
    return p.refId.trim().toUpperCase();
  }
  // Fallback: Generate deterministic ref ID from ID string if refId is not explicitly set
  const digits = (p.id || "").replace(/\D/g, "");
  if (digits) {
    return `REF${digits.padStart(3, "0")}`;
  }
  return `REF-${(p.id || "000").slice(-4).toUpperCase()}`;
}

/**
 * Checks if search text matches a property reference ID (e.g. "ref345", "REF345", "#REF345", "ref-345")
 * Returns matching property if found, or null.
 */
export function findPropertyByRefId(query: string, properties: Property[]): Property | null {
  if (!query || !query.trim()) return null;
  
  const raw = query.trim().toUpperCase().replace(/^#/, "").replace(/[\s-]/g, "");
  if (!raw) return null;

  for (const p of properties) {
    const ref = getPropertyRefId(p).toUpperCase().replace(/[\s-]/g, "");
    
    // Direct match against clean ref e.g. REF345 vs REF345
    if (raw === ref) {
      return p;
    }
    
    // Match "REF345" if user types "345" or "REF-345" or "ref 345"
    if (ref.startsWith("REF") && (raw === ref.replace("REF", "") || raw === `REF${ref.replace("REF", "")}`)) {
      return p;
    }

    // Direct match against property id or slug
    if (raw === (p.id || "").toUpperCase().replace(/[\s-]/g, "") || raw === (p.slug || "").toUpperCase().replace(/[\s-]/g, "")) {
      return p;
    }
  }

  return null;
}
