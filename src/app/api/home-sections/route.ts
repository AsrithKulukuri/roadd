import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/server-auth-guard";
import {
  HOME_SECTION_ICON_NAMES,
  HOME_CARD_STYLES,
  DEFAULT_CARD_STYLE,
  MAX_HOME_SECTION_ITEMS,
  MAX_HOME_SECTIONS,
  getValidCardSize,
  type HomeSection,
  type HomeSectionItem,
  type HomeCardStyleId,
  type HomeCardSize,
} from "@/types/home-section";
import { CANONICAL_EIGHT_SHELVES } from "@/lib/shelf-builder-defaults";

const VALID_CARD_STYLES = new Set<string>(HOME_CARD_STYLES.map((s) => s.id));

function sanitizeBorder(border: any) {
  if (!border || typeof border !== "object") return undefined;
  return {
    enabled: Boolean(border.enabled),
    style: typeof border.style === "string" ? border.style : "solid",
    color: typeof border.color === "string" ? border.color : "#e2e8f0",
    width: typeof border.width === "number" ? Math.max(0, Math.min(20, border.width)) : 1,
    opacity: typeof border.opacity === "number" ? Math.max(0, Math.min(100, border.opacity)) : 100,
    radius: typeof border.radius === "number" ? Math.max(0, Math.min(100, border.radius)) : 16,
    linkCorners: border.linkCorners !== false,
    radiusTopLeft: typeof border.radiusTopLeft === "number" ? border.radiusTopLeft : undefined,
    radiusTopRight: typeof border.radiusTopRight === "number" ? border.radiusTopRight : undefined,
    radiusBottomLeft: typeof border.radiusBottomLeft === "number" ? border.radiusBottomLeft : undefined,
    radiusBottomRight: typeof border.radiusBottomRight === "number" ? border.radiusBottomRight : undefined,
    outlineEnabled: Boolean(border.outlineEnabled),
    outlineColor: typeof border.outlineColor === "string" ? border.outlineColor : undefined,
    outlineWidth: typeof border.outlineWidth === "number" ? border.outlineWidth : undefined,
    outlineOffset: typeof border.outlineOffset === "number" ? border.outlineOffset : undefined,
    shadow: typeof border.shadow === "string" ? border.shadow : undefined,
    hoverColor: typeof border.hoverColor === "string" ? border.hoverColor : undefined,
    hoverWidth: typeof border.hoverWidth === "number" ? border.hoverWidth : undefined,
    hoverShadow: typeof border.hoverShadow === "string" ? border.hoverShadow : undefined,
  };
}

function sanitizeTypography(typo: any) {
  if (!typo || typeof typo !== "object") return undefined;
  return {
    fontFamily: typeof typo.fontFamily === "string" ? typo.fontFamily.slice(0, 50) : undefined,
    fontSize: typeof typo.fontSize === "number" ? Math.max(8, Math.min(96, typo.fontSize)) : undefined,
    fontSizeUnit: typo.fontSizeUnit === "rem" || typo.fontSizeUnit === "em" ? typo.fontSizeUnit : "px",
    fontWeight: typeof typo.fontWeight === "number" ? typo.fontWeight : undefined,
    fontStyle: typo.fontStyle === "italic" ? "italic" : "normal",
    textColor: typeof typo.textColor === "string" ? typo.textColor : undefined,
    textOpacity: typeof typo.textOpacity === "number" ? typo.textOpacity : undefined,
    textTransform: typeof typo.textTransform === "string" ? typo.textTransform : undefined,
    textDecoration: typeof typo.textDecoration === "string" ? typo.textDecoration : undefined,
    textAlign: typeof typo.textAlign === "string" ? typo.textAlign : undefined,
    lineHeight: typo.lineHeight,
    letterSpacing: typo.letterSpacing,
    lineClamp: typeof typo.lineClamp === "number" ? typo.lineClamp : undefined,
    textShadow: typeof typo.textShadow === "string" ? typo.textShadow : undefined,
    hoverColor: typeof typo.hoverColor === "string" ? typo.hoverColor : undefined,
  };
}

function validateSections(input: unknown): HomeSection[] | null {
  if (!Array.isArray(input) || input.length > MAX_HOME_SECTIONS) return null;

  const ids = new Set<string>();
  const sections: HomeSection[] = [];

  for (const raw of input) {
    if (!raw || typeof raw !== "object") return null;
    const value = raw as Record<string, unknown>;
    const id = typeof value.id === "string" ? value.id.trim() : "";
    const title = typeof value.title === "string" ? value.title.trim() : "";
    const icon = typeof value.icon === "string" && HOME_SECTION_ICON_NAMES.includes(value.icon as any)
      ? value.icon
      : "Sparkles";
    const items = Array.isArray(value.items) ? value.items : [];
    const rawCardStyle = typeof value.cardStyle === "string" ? value.cardStyle.trim() : "";
    const cardStyle: HomeCardStyleId = VALID_CARD_STYLES.has(rawCardStyle)
      ? (rawCardStyle as HomeCardStyleId)
      : DEFAULT_CARD_STYLE;

    // Card sizes: separate for desktop and mobile
    const cardSizeDesktop: HomeCardSize = getValidCardSize(
      cardStyle,
      "desktop",
      typeof value.cardSizeDesktop === "string" ? (value.cardSizeDesktop as HomeCardSize) : undefined
    );
    const cardSizeMobile: HomeCardSize = getValidCardSize(
      cardStyle,
      "mobile",
      typeof value.cardSizeMobile === "string" ? (value.cardSizeMobile as HomeCardSize) : undefined
    );

    if (!id || ids.has(id) || !title || title.length > 80 || items.length > MAX_HOME_SECTION_ITEMS) {
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
      if (typeof entry.customPrice === "string" && entry.customPrice.trim()) {
        cleanItem.customPrice = entry.customPrice.trim().slice(0, 50);
      }
      if (typeof entry.customLocation === "string" && entry.customLocation.trim()) {
        cleanItem.customLocation = entry.customLocation.trim().slice(0, 100);
      }
      if (typeof entry.customBhk === "string" && entry.customBhk.trim()) {
        cleanItem.customBhk = entry.customBhk.trim().slice(0, 60);
      }
      if (typeof entry.customArea === "string" && entry.customArea.trim()) {
        cleanItem.customArea = entry.customArea.trim().slice(0, 60);
      }
      if (typeof entry.customDeveloper === "string" && entry.customDeveloper.trim()) {
        cleanItem.customDeveloper = entry.customDeveloper.trim().slice(0, 100);
      }
      if (typeof entry.customStatus === "string" && entry.customStatus.trim()) {
        cleanItem.customStatus = entry.customStatus.trim().slice(0, 60);
      }
      if (typeof entry.customCtaText === "string" && entry.customCtaText.trim()) {
        cleanItem.customCtaText = entry.customCtaText.trim().slice(0, 50);
      }
      if (typeof entry.cardBgColor === "string") cleanItem.cardBgColor = entry.cardBgColor.trim();
      if (typeof entry.cardTextColor === "string") cleanItem.cardTextColor = entry.cardTextColor.trim();
      if (typeof entry.cardAccentColor === "string") cleanItem.cardAccentColor = entry.cardAccentColor.trim();
      return [cleanItem];
    });

    ids.add(id);

    // Color customizations
    const cardBgColor = typeof value.cardBgColor === "string" ? value.cardBgColor.trim() : undefined;
    const cardTextColor = typeof value.cardTextColor === "string" ? value.cardTextColor.trim() : undefined;
    const cardAccentColor = typeof value.cardAccentColor === "string" ? value.cardAccentColor.trim() : undefined;

    // Label customizations
    const customBadge = typeof value.customBadge === "string" && value.customBadge.trim() ? value.customBadge.trim().slice(0, 50) : undefined;
    const customHeadline = typeof value.customHeadline === "string" && value.customHeadline.trim() ? value.customHeadline.trim().slice(0, 100) : undefined;
    const customTagline = typeof value.customTagline === "string" && value.customTagline.trim() ? value.customTagline.trim().slice(0, 120) : undefined;
    const customPrice = typeof value.customPrice === "string" && value.customPrice.trim() ? value.customPrice.trim().slice(0, 50) : undefined;
    const customLocation = typeof value.customLocation === "string" && value.customLocation.trim() ? value.customLocation.trim().slice(0, 100) : undefined;
    const customBhk = typeof value.customBhk === "string" && value.customBhk.trim() ? value.customBhk.trim().slice(0, 60) : undefined;
    const customArea = typeof value.customArea === "string" && value.customArea.trim() ? value.customArea.trim().slice(0, 60) : undefined;
    const customDeveloper = typeof value.customDeveloper === "string" && value.customDeveloper.trim() ? value.customDeveloper.trim().slice(0, 100) : undefined;
    const customStatus = typeof value.customStatus === "string" && value.customStatus.trim() ? value.customStatus.trim().slice(0, 60) : undefined;
    const customCtaText = typeof value.customCtaText === "string" && value.customCtaText.trim() ? value.customCtaText.trim().slice(0, 50) : undefined;

    // Carousel controls
    const enableCarousel = typeof value.enableCarousel === "boolean" ? value.enableCarousel : true;
    const carouselInterval = typeof value.carouselInterval === "number" && !isNaN(value.carouselInterval)
      ? Math.max(1.5, Math.min(30, Number(value.carouselInterval)))
      : 4;
    const carouselLoopMode = value.carouselLoopMode === "normal" || value.carouselLoopMode === "static" || value.carouselLoopMode === "infinite"
      ? value.carouselLoopMode
      : undefined;
    const carouselSpeed = value.carouselSpeed === "fast" || value.carouselSpeed === "normal" || value.carouselSpeed === "smooth" || value.carouselSpeed === "cinematic"
      ? value.carouselSpeed
      : undefined;
    const carouselPauseOnHover = typeof value.carouselPauseOnHover === "boolean" ? value.carouselPauseOnHover : undefined;
    const carouselShowArrows = typeof value.carouselShowArrows === "boolean" ? value.carouselShowArrows : undefined;
    const carouselArrowPosition = value.carouselArrowPosition === "hidden" || value.carouselArrowPosition === "sides" || value.carouselArrowPosition === "header"
      ? value.carouselArrowPosition
      : undefined;
    const carouselShowDots = typeof value.carouselShowDots === "boolean" ? value.carouselShowDots : undefined;

    // Mobile Carousel controls
    const mobileCarouselCustom = Boolean(value.mobileCarouselCustom);
    const mobileLayoutType = value.mobileLayoutType === "grid" || value.mobileLayoutType === "featured-split" || value.mobileLayoutType === "carousel"
      ? value.mobileLayoutType
      : undefined;
    const mobileEnableCarousel = typeof value.mobileEnableCarousel === "boolean" ? value.mobileEnableCarousel : undefined;
    const mobileCarouselLoopMode = value.mobileCarouselLoopMode === "normal" || value.mobileCarouselLoopMode === "static" || value.mobileCarouselLoopMode === "infinite"
      ? value.mobileCarouselLoopMode
      : undefined;
    const mobileCarouselInterval = typeof value.mobileCarouselInterval === "number" && !isNaN(value.mobileCarouselInterval)
      ? Math.max(1.5, Math.min(30, Number(value.mobileCarouselInterval)))
      : undefined;
    const mobileCarouselSpeed = value.mobileCarouselSpeed === "fast" || value.mobileCarouselSpeed === "normal" || value.mobileCarouselSpeed === "smooth" || value.mobileCarouselSpeed === "cinematic"
      ? value.mobileCarouselSpeed
      : undefined;
    const mobileCarouselPauseOnHover = typeof value.mobileCarouselPauseOnHover === "boolean" ? value.mobileCarouselPauseOnHover : undefined;
    const mobileCarouselShowArrows = typeof value.mobileCarouselShowArrows === "boolean" ? value.mobileCarouselShowArrows : undefined;
    const mobileCarouselArrowPosition = value.mobileCarouselArrowPosition === "hidden" || value.mobileCarouselArrowPosition === "sides" || value.mobileCarouselArrowPosition === "header"
      ? value.mobileCarouselArrowPosition
      : undefined;
    const mobileCarouselShowDots = typeof value.mobileCarouselShowDots === "boolean" ? value.mobileCarouselShowDots : undefined;

    // Visual Builder Extended Properties
    const name = typeof value.name === "string" ? value.name.trim().slice(0, 80) : title;
    const subtitle = typeof value.subtitle === "string" ? value.subtitle.trim().slice(0, 160) : undefined;
    const description = typeof value.description === "string" ? value.description.trim().slice(0, 300) : undefined;
    const eyebrow = typeof value.eyebrow === "string" ? value.eyebrow.trim().slice(0, 60) : undefined;
    const shelfType = typeof value.shelfType === "string" ? (value.shelfType as any) : "properties";
    const status = value.status === "draft" || value.status === "hidden" ? value.status : "published";
    const isCustom = Boolean(value.isCustom);
    const contentSource = value.contentSource === "manual" || value.contentSource === "automatic" || value.contentSource === "hybrid"
      ? value.contentSource
      : "hybrid";
    const autoFilters = typeof value.autoFilters === "object" && value.autoFilters ? value.autoFilters : undefined;
    const pinnedIds = Array.isArray(value.pinnedIds) ? value.pinnedIds.filter((p): p is string => typeof p === "string") : [];
    const pinningMode = typeof value.pinningMode === "string" ? (value.pinningMode as any) : "pinned-first";
    const maxItems = typeof value.maxItems === "number" ? Math.max(1, Math.min(12, value.maxItems)) : 8;
    const layoutType = value.layoutType === "grid" || value.layoutType === "featured-split" ? value.layoutType : "carousel";
    const gridColumnsDesktop = typeof value.gridColumnsDesktop === "number" ? Math.max(1, Math.min(6, value.gridColumnsDesktop)) : 3;
    const gridColumnsTablet = typeof value.gridColumnsTablet === "number" ? Math.max(1, Math.min(4, value.gridColumnsTablet)) : 2;
    const gridColumnsMobile = typeof value.gridColumnsMobile === "number" ? Math.max(1, Math.min(2, value.gridColumnsMobile)) : 1;

    // Borders & Elements
    const shelfBorder = sanitizeBorder(value.shelfBorder);
    const cardBorder = sanitizeBorder(value.cardBorder);
    const imageArrangement = typeof value.imageArrangement === "object" && value.imageArrangement ? value.imageArrangement : undefined;
    const elementOrder = Array.isArray(value.elementOrder) ? value.elementOrder.filter((e): e is any => typeof e === "string") : undefined;
    
    let sanitizedElements: Record<string, any> | undefined = undefined;
    if (value.elements && typeof value.elements === "object") {
      sanitizedElements = {};
      for (const [k, el] of Object.entries(value.elements as Record<string, any>)) {
        if (el && typeof el === "object") {
          sanitizedElements[k] = {
            id: k,
            label: typeof el.label === "string" ? el.label : k,
            visible: el.visible !== false,
            labelOverride: typeof el.labelOverride === "string" ? el.labelOverride : undefined,
            typography: sanitizeTypography(el.typography),
            border: sanitizeBorder(el.border),
            backgroundColor: typeof el.backgroundColor === "string" ? el.backgroundColor : undefined,
            padding: typeof el.padding === "string" ? el.padding : undefined,
            margin: typeof el.margin === "string" ? el.margin : undefined,
          };
        }
      }
    }

    sections.push({
      id,
      title,
      name,
      subtitle,
      description,
      eyebrow,
      icon: icon as HomeSection["icon"],
      shelfType,
      isActive: value.isActive !== false,
      status,
      isCustom,
      contentSource,
      autoFilters,
      pinnedIds,
      pinningMode,
      maxItems,
      layoutType,
      gridColumnsDesktop,
      gridColumnsTablet,
      gridColumnsMobile,
      cardStyle,
      cardSizeDesktop,
      cardSizeMobile,
      cardBgColor,
      cardTextColor,
      cardAccentColor,
      customBadge,
      customHeadline,
      customTagline,
      customPrice,
      customLocation,
      customBhk,
      customArea,
      customDeveloper,
      customStatus,
      customCtaText,
      enableCarousel,
      carouselInterval,
      carouselLoopMode,
      carouselSpeed,
      carouselPauseOnHover,
      carouselShowArrows,
      carouselArrowPosition,
      carouselShowDots,
      mobileCarouselCustom,
      mobileLayoutType,
      mobileEnableCarousel,
      mobileCarouselLoopMode,
      mobileCarouselInterval,
      mobileCarouselSpeed,
      mobileCarouselPauseOnHover,
      mobileCarouselShowArrows,
      mobileCarouselArrowPosition,
      mobileCarouselShowDots,
      shelfBorder,
      cardBorder,
      imageArrangement,
      elementOrder,
      elements: sanitizedElements,
      items: cleanItems,
      updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : undefined,
      updatedBy: typeof value.updatedBy === "string" ? value.updatedBy : undefined,
    });
  }

  return sections;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const isDraftRequest = searchParams.get("status") === "draft";
  const targetId = isDraftRequest ? "draft" : "default";

  try {
    const { data, error } = await supabaseAdmin
      .from("homepage_layouts")
      .select("sections, updated_at")
      .eq("id", targetId)
      .maybeSingle();

    if (error) throw error;

    let sections = validateSections(data?.sections);

    // Fallback: If requesting draft but draft is empty, read default
    if (isDraftRequest && (!sections || sections.length === 0)) {
      const { data: defaultData } = await supabaseAdmin
        .from("homepage_layouts")
        .select("sections, updated_at")
        .eq("id", "default")
        .maybeSingle();
      sections = validateSections(defaultData?.sections);
    }

    // Default Fallback: If DB has not been configured yet, return canonical 8 shelves
    const finalSections = sections && sections.length > 0 ? sections : CANONICAL_EIGHT_SHELVES;

    return NextResponse.json({
      sections: finalSections,
      configured: Boolean(sections && sections.length > 0),
      isDraft: isDraftRequest,
      updatedAt: data?.updated_at ?? null,
    });
  } catch (error) {
    console.warn("Homepage layout fetch fallback to canonical defaults:", error);
    return NextResponse.json({
      sections: CANONICAL_EIGHT_SHELVES,
      configured: false,
      isDraft: isDraftRequest,
      updatedAt: null,
    });
  }
}

export async function PUT(request: NextRequest) {
  const { errorResponse, user } = await requireAdmin(request);
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();
    const action = body?.action || "publish"; // 'publish' | 'save_draft' | 'restore_defaults'

    if (action === "restore_defaults") {
      const defaultSections = CANONICAL_EIGHT_SHELVES;
      await supabaseAdmin.from("homepage_layouts").upsert([
        { id: "default", sections: defaultSections, updated_at: new Date().toISOString() },
        { id: "draft", sections: defaultSections, updated_at: new Date().toISOString() },
      ]);
      return NextResponse.json({ success: true, action: "restore_defaults", sections: defaultSections });
    }

    const sections = validateSections(body?.sections);
    if (!sections) {
      return NextResponse.json(
        { error: `Invalid layout configuration. Use up to ${MAX_HOME_SECTIONS} shelves.` },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const userIdentifier = user?.name || user?.email || user?.phone || "Admin";

    if (action === "save_draft") {
      // Save exclusively to draft record (does not affect live homepage!)
      const { error } = await supabaseAdmin.from("homepage_layouts").upsert({
        id: "draft",
        sections: sections.map((s) => ({ ...s, status: "draft", updatedAt: now, updatedBy: userIdentifier })),
        updated_at: now,
      });
      if (error) throw error;
      return NextResponse.json({ success: true, action: "save_draft", sections });
    }

    // Action: Publish
    // 1. Save to default (live public homepage)
    const publishedSections = sections.map((s) => ({
      ...s,
      status: "published",
      updatedAt: now,
      updatedBy: userIdentifier,
    }));

    const { error: pubError } = await supabaseAdmin.from("homepage_layouts").upsert({
      id: "default",
      sections: publishedSections,
      updated_at: now,
    });
    if (pubError) throw pubError;

    // 2. Also sync draft to match published
    await supabaseAdmin.from("homepage_layouts").upsert({
      id: "draft",
      sections: publishedSections,
      updated_at: now,
    });

    // 3. Snapshot to revisions table if available
    try {
      await supabaseAdmin.from("homepage_layout_revisions").insert({
        layout_id: "default",
        sections: publishedSections,
        saved_at: now,
      });
    } catch {
      // Non-fatal if revision table hasn't been migrated
    }

    return NextResponse.json({ success: true, action: "publish", sections: publishedSections });
  } catch (error) {
    console.error("Failed to save homepage layout:", error);
    return NextResponse.json(
      { error: "Could not save the homepage layout. Confirm admin permissions." },
      { status: 500 }
    );
  }
}
