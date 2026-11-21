import { supabaseAdmin } from "@/lib/supabase-admin";
import { VIJAYAWADA_LOCALITIES, GUNTUR_LOCALITIES } from "@/lib/seeded-dataset";

export interface SublocationRecord {
  id: string;
  city_id: string;
  name: string;
  slug: string;
  lat: number | null;
  lng: number | null;
  status: "active" | "inactive" | "pending";
  created_at?: string;
  updated_at?: string;
}

export interface SublocationAliasRecord {
  id: string;
  city_id: string;
  sublocation_id: string;
  alias: string;
  alias_normalized: string;
  source: "admin" | "auto";
  created_at?: string;
}

function normalizeAlias(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ");
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Seeded fallback list when database is cold or unmigrated in dev/test
 */
function getSeededFallbackSublocations(cityId?: string): SublocationRecord[] {
  const normCity = (cityId || "").toLowerCase().trim();
  const list: SublocationRecord[] = [];

  if (!normCity || normCity === "vijayawada") {
    VIJAYAWADA_LOCALITIES.forEach((loc, idx) => {
      list.push({
        id: `seed-vja-${idx}`,
        city_id: "vijayawada",
        name: loc.name,
        slug: slugify(loc.name),
        lat: loc.lat,
        lng: loc.lng,
        status: "active",
      });
    });
  }

  if (!normCity || normCity === "guntur") {
    GUNTUR_LOCALITIES.forEach((loc, idx) => {
      list.push({
        id: `seed-gtr-${idx}`,
        city_id: "guntur",
        name: loc.name,
        slug: slugify(loc.name),
        lat: loc.lat,
        lng: loc.lng,
        status: "active",
      });
    });
  }

  return list;
}

/**
 * Fetch all master sublocations, optionally filtered by city_id
 */
export async function getMasterSublocations(cityId?: string): Promise<SublocationRecord[]> {
  try {
    let query = supabaseAdmin
      .from("sublocations")
      .select("*")
      .eq("status", "active")
      .order("name", { ascending: true });

    if (cityId) {
      query = query.eq("city_id", cityId.toLowerCase().trim());
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      return getSeededFallbackSublocations(cityId);
    }
    return data as SublocationRecord[];
  } catch {
    return getSeededFallbackSublocations(cityId);
  }
}

/**
 * Fetch aliases for a given city
 */
export async function getSublocationAliases(cityId?: string): Promise<SublocationAliasRecord[]> {
  try {
    let query = supabaseAdmin
      .from("sublocation_aliases")
      .select("*");

    if (cityId) {
      query = query.eq("city_id", cityId.toLowerCase().trim());
    }

    const { data, error } = await query;
    if (error || !data) {
      return [];
    }
    return data as SublocationAliasRecord[];
  } catch {
    return [];
  }
}

/**
 * Create a new master sublocation (Admin operation)
 */
export async function createSublocation(payload: {
  city_id: string;
  name: string;
  lat?: number | null;
  lng?: number | null;
  status?: "active" | "inactive" | "pending";
}): Promise<SublocationRecord | null> {
  const city_id = payload.city_id.toLowerCase().trim();
  const name = payload.name.trim();
  const slug = slugify(name);

  try {
    const { data, error } = await supabaseAdmin
      .from("sublocations")
      .insert({
        city_id,
        name,
        slug,
        lat: payload.lat ?? null,
        lng: payload.lng ?? null,
        status: payload.status || "active",
      })
      .select()
      .maybeSingle();

    if (error) {
      console.warn("[createSublocation error]:", error.message);
      return null;
    }
    return data as SublocationRecord;
  } catch (err) {
    console.warn("[createSublocation exception]:", err);
    return null;
  }
}

/**
 * Register or update an alias mapping for a sublocation (Admin operation)
 */
export async function addSublocationAlias(payload: {
  city_id: string;
  sublocation_id: string;
  alias: string;
  source?: "admin" | "auto";
}): Promise<SublocationAliasRecord | null> {
  const city_id = payload.city_id.toLowerCase().trim();
  const alias = payload.alias.trim();
  const alias_normalized = normalizeAlias(alias);

  if (!alias_normalized) return null;

  try {
    const { data, error } = await supabaseAdmin
      .from("sublocation_aliases")
      .upsert(
        {
          city_id,
          sublocation_id: payload.sublocation_id,
          alias,
          alias_normalized,
          source: payload.source || "auto",
        },
        { onConflict: "city_id,alias_normalized" }
      )
      .select()
      .maybeSingle();

    if (error) {
      console.warn("[addSublocationAlias error]:", error.message);
      return null;
    }
    return data as SublocationAliasRecord;
  } catch (err) {
    console.warn("[addSublocationAlias exception]:", err);
    return null;
  }
}

