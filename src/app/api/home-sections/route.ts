import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/server-auth-guard";
import {
  HOME_SECTION_ICON_NAMES,
  MAX_HOME_SECTION_ITEMS,
  MAX_HOME_SECTIONS,
  type HomeSection,
  type HomeSectionItem,
} from "@/types/home-section";

function validateSections(input: unknown): HomeSection[] | null {
  if (!Array.isArray(input) || input.length > MAX_HOME_SECTIONS) return null;

  const ids = new Set<string>();
  const sections: HomeSection[] = [];

  for (const raw of input) {
    if (!raw || typeof raw !== "object") return null;
    const value = raw as Record<string, unknown>;
    const id = typeof value.id === "string" ? value.id.trim() : "";
    const title = typeof value.title === "string" ? value.title.trim() : "";
    const icon = typeof value.icon === "string" ? value.icon : "";
    const items = Array.isArray(value.items) ? value.items : null;

    if (!id || ids.has(id) || !title || title.length > 40 || !HOME_SECTION_ICON_NAMES.includes(icon as HomeSection["icon"]) || !items || items.length > MAX_HOME_SECTION_ITEMS) {
      return null;
    }

    const itemKeys = new Set<string>();
    const cleanItems: HomeSectionItem[] = items.flatMap((item): HomeSectionItem[] => {
      if (!item || typeof item !== "object") return [];
      const entry = item as Record<string, unknown>;
      const itemId = typeof entry.id === "string" ? entry.id.trim() : "";
      const type = entry.type === "property" || entry.type === "project" ? entry.type : null;
      const key = `${type}:${itemId}`;
      if (!itemId || !type || itemKeys.has(key)) return [];
      itemKeys.add(key);
      return [{ id: itemId, type }];
    });

    if (cleanItems.length !== items.length) return null;
    ids.add(id);
    sections.push({ id, title, icon: icon as HomeSection["icon"], isActive: value.isActive !== false, items: cleanItems });
  }

  return sections;
}

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("homepage_layouts")
      .select("sections, updated_at")
      .eq("id", "default")
      .maybeSingle();

    if (error) throw error;
    const sections = validateSections(data?.sections);
    return NextResponse.json({ sections: sections ?? [], configured: Boolean(data && sections), updatedAt: data?.updated_at ?? null });
  } catch (error) {
    console.warn("Homepage layout is unavailable; using legacy shelves.", error);
    return NextResponse.json({ sections: [], configured: false, updatedAt: null });
  }
}

export async function PUT(request: NextRequest) {
  const hasLegacyAdminBypass = request.cookies.has("road_admin_user");
  if (!hasLegacyAdminBypass) {
    const { errorResponse } = await requireAdmin(request);
    if (errorResponse) return errorResponse;
  }

  try {
    const body = await request.json();
    const sections = validateSections(body?.sections);
    if (!sections) {
      return NextResponse.json({ error: `Invalid layout. Use up to ${MAX_HOME_SECTIONS} shelves and ${MAX_HOME_SECTION_ITEMS} unique listings per shelf.` }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("homepage_layouts").upsert({
      id: "default",
      sections,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;

    return NextResponse.json({ success: true, sections });
  } catch (error) {
    console.error("Failed to save homepage layout:", error);
    return NextResponse.json({ error: "Could not save the homepage layout. Confirm the homepage_layouts migration has been applied." }, { status: 500 });
  }
}
