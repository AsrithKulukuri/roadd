import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/server-auth-guard";
import {
  DEFAULT_DESKTOP_SEARCH_PHRASES,
  DEFAULT_MOBILE_SEARCH_PHRASES,
} from "@/stores/content-store";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("homepage_layouts")
      .select("sections, updated_at")
      .eq("id", "search_phrases")
      .maybeSingle();

    if (error) {
      console.warn("[Search Phrases API] GET error:", error);
    }

    if (
      data?.sections &&
      typeof data.sections === "object" &&
      !Array.isArray(data.sections)
    ) {
      const payload = data.sections as {
        desktop?: unknown;
        mobile?: unknown;
        typingSpeed?: unknown;
        pauseDuration?: unknown;
      };
      const desktop = Array.isArray(payload.desktop) ? payload.desktop : DEFAULT_DESKTOP_SEARCH_PHRASES;
      const mobile = Array.isArray(payload.mobile) ? payload.mobile : DEFAULT_MOBILE_SEARCH_PHRASES;
      const typingSpeed = typeof payload.typingSpeed === "number" && !isNaN(payload.typingSpeed)
        ? Math.max(20, Math.min(200, Math.round(payload.typingSpeed)))
        : 60;
      const pauseDuration = typeof payload.pauseDuration === "number" && !isNaN(payload.pauseDuration)
        ? Math.max(500, Math.min(6000, Math.round(payload.pauseDuration)))
        : 2200;

      const textColor = (payload as any).textColor === "light" ? "light" : "dark";

      return NextResponse.json({
        desktop,
        mobile,
        typingSpeed,
        pauseDuration,
        textColor,
        configured: true,
        updatedAt: data.updated_at,
        source: "database",
      });
    }

    // Default fallback if not yet customized in database
    return NextResponse.json({
      desktop: DEFAULT_DESKTOP_SEARCH_PHRASES,
      mobile: DEFAULT_MOBILE_SEARCH_PHRASES,
      typingSpeed: 60,
      pauseDuration: 2200,
      textColor: "dark",
      configured: false,
      updatedAt: null,
      source: "fallback",
    });
  } catch (err: any) {
    console.error("[Search Phrases API] GET exception:", err);
    return NextResponse.json(
      {
        error: err.message,
        desktop: DEFAULT_DESKTOP_SEARCH_PHRASES,
        mobile: DEFAULT_MOBILE_SEARCH_PHRASES,
        typingSpeed: 60,
        pauseDuration: 2200,
        textColor: "dark",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { errorResponse } = await requireAdmin(request);
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const desktop = body?.desktop;
    const mobile = body?.mobile;

    if (!Array.isArray(desktop) || !Array.isArray(mobile)) {
      return NextResponse.json(
        { error: "Invalid format. 'desktop' and 'mobile' must be string arrays." },
        { status: 400 }
      );
    }

    const cleanDesktop = desktop
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);

    const cleanMobile = mobile
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);

    const typingSpeed = typeof body?.typingSpeed === "number" && !isNaN(body.typingSpeed)
      ? Math.max(20, Math.min(200, Math.round(body.typingSpeed)))
      : 60;
    const pauseDuration = typeof body?.pauseDuration === "number" && !isNaN(body.pauseDuration)
      ? Math.max(500, Math.min(6000, Math.round(body.pauseDuration)))
      : 2200;
    const textColor = body?.textColor === "light" ? "light" : "dark";

    const { error } = await supabaseAdmin.from("homepage_layouts").upsert({
      id: "search_phrases",
      sections: {
        desktop: cleanDesktop,
        mobile: cleanMobile,
        typingSpeed,
        pauseDuration,
        textColor,
      },
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error("[Search Phrases API] Upsert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      desktop: cleanDesktop,
      mobile: cleanMobile,
      typingSpeed,
      pauseDuration,
      textColor,
      configured: true,
    });
  } catch (err: any) {
    console.error("[Search Phrases API] PUT exception:", err);
    return NextResponse.json(
      { error: err.message || "Failed to persist search phrases" },
      { status: 500 }
    );
  }
}
