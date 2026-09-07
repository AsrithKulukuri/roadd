import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/server-auth-guard";
import {
  HOME_SECTION_ICON_NAMES,
  HOME_CARD_STYLES,
  DEFAULT_CARD_STYLE,
  MAX_HOME_SECTION_ITEMS,
  MAX_HOME_SECTIONS,
  type HomeSection,
  type HomeSectionItem,
  type HomeCardStyleId,
} from "@/types/home-section";

const VALID_CARD_STYLES = new Set<string>(HOME_CARD_STYLES.map((s) => s.id));

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
    const rawCardStyle = typeof value.cardStyle === "string" ? value.cardStyle.trim() : "";
    const cardStyle: HomeCardStyleId = VALID_CARD_STYLES.has(rawCardStyle)
      ? (rawCardStyle as HomeCardStyleId)
      : DEFAULT_CARD_STYLE;

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

      const cleanItem: HomeSectionItem = { id: itemId, type };
      if (typeof entry.progressPercentage === "number" && !isNaN(entry.progressPercentage)) {
        cleanItem.progressPercentage = Math.max(0, Math.min(100, Math.round(entry.progressPercentage)));
      }
      if (typeof entry.customBadge === "string" && entry.customBadge.trim()) {
        cleanItem.customBadge = entry.customBadge.trim().slice(0, 50);
      }
      if (typeof entry.customHeadline === "string" && entry.customHeadline.trim()) {
        cleanItem.customHeadline = entry.customHeadline.trim().slice(0, 100);
      }
      if (typeof entry.customTagline === "string" && entry.customTagline.trim()) {
        cleanItem.customTagline = entry.customTagline.trim().slice(0, 120);
      }
      if (typeof entry.cardBgColor === "string" && /^#[0-9a-fA-F]{3,8}$/.test(entry.cardBgColor.trim())) {
        cleanItem.cardBgColor = entry.cardBgColor.trim();
      }
      if (typeof entry.cardTextColor === "string" && /^#[0-9a-fA-F]{3,8}$/.test(entry.cardTextColor.trim())) {
        cleanItem.cardTextColor = entry.cardTextColor.trim();
      }
      if (typeof entry.cardAccentColor === "string" && /^#[0-9a-fA-F]{3,8}$/.test(entry.cardAccentColor.trim())) {
        cleanItem.cardAccentColor = entry.cardAccentColor.trim();
      }
      return [cleanItem];
    });

    if (cleanItems.length !== items.length) return null;
    ids.add(id);

    // Color customizations (fallback to default white box, dark text, gold logo/icon)
    const cardBgColor = typeof value.cardBgColor === "string" && /^#[0-9a-fA-F]{3,8}$/.test(value.cardBgColor.trim())
      ? value.cardBgColor.trim()
      : undefined;
    const cardTextColor = typeof value.cardTextColor === "string" && /^#[0-9a-fA-F]{3,8}$/.test(value.cardTextColor.trim())
      ? value.cardTextColor.trim()
      : undefined;
    const cardAccentColor = typeof value.cardAccentColor === "string" && /^#[0-9a-fA-F]{3,8}$/.test(value.cardAccentColor.trim())
      ? value.cardAccentColor.trim()
      : undefined;

    // Label customizations
    const customBadge = typeof value.customBadge === "string" && value.customBadge.trim()
      ? value.customBadge.trim().slice(0, 50)
      : undefined;
    const customHeadline = typeof value.customHeadline === "string" && value.customHeadline.trim()
      ? value.customHeadline.trim().slice(0, 100)
      : undefined;
    const customTagline = typeof value.customTagline === "string" && value.customTagline.trim()
      ? value.customTagline.trim().slice(0, 120)
      : undefined;

    // Carousel controls
    const enableCarousel = typeof value.enableCarousel === "boolean" ? value.enableCarousel : true;
    const carouselInterval = typeof value.carouselInterval === "number" && !isNaN(value.carouselInterval)
      ? Math.max(2, Math.min(30, Math.round(value.carouselInterval)))
      : 4;

    sections.push({
      id,
      title,
      icon: icon as HomeSection["icon"],
      isActive: value.isActive !== false,
      items: cleanItems,
      cardStyle,
      cardBgColor,
      cardTextColor,
      cardAccentColor,
      customBadge,
      customHeadline,
      customTagline,
      enableCarousel,
      carouselInterval,
    });
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
  const { errorResponse } = await requireAdmin(request);
  if (errorResponse) return errorResponse;

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
