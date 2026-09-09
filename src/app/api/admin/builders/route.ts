import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { INITIAL_BUILDERS } from "@/stores/builder-store";

export async function GET(req: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: true, builders: INITIAL_BUILDERS });
    }

    const { data: builders, error } = await supabase
      .from("builder_profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Supabase builder_profiles fetch error, using initial:", error.message);
      return NextResponse.json({ success: true, builders: INITIAL_BUILDERS });
    }

    if (!builders || builders.length === 0) {
      return NextResponse.json({ success: true, builders: INITIAL_BUILDERS });
    }

    const mapped = builders.map((b: any) => ({
      id: b.id,
      companyName: b.company_name,
      slug: b.slug,
      logoUrl: b.logo_url,
      bannerUrl: b.banner_url,
      description: b.description,
      tagline: b.tagline,
      reraNumber: b.rera_number,
      crdaApproved: b.crda_approved,
      contactEmail: b.contact_email,
      contactPhone: b.contact_phone,
      whatsappNumber: b.whatsapp_number,
      officeAddress: b.office_address,
      experienceYears: b.experience_years,
      tier: b.tier || "premium",
      isVerified: b.is_verified,
      assignedProjectIds: b.assigned_project_ids || [],
      assignedPropertyIds: b.assigned_property_ids || [],
      chatEnabled: b.chat_enabled ?? true,
      promotedAtTop: b.promoted_at_top ?? false,
      bannerActive: b.banner_active ?? false,
      lastLoginAt: b.last_login_at,
      lastActiveAt: b.last_active_at,
      loginCredentialsHint: b.login_credentials_hint,
      createdAt: b.created_at,
      updatedAt: b.updated_at,
    }));

    return NextResponse.json({ success: true, builders: mapped });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      companyName,
      slug,
      logoUrl,
      bannerUrl,
      description,
      tagline,
      reraNumber,
      crdaApproved,
      contactEmail,
      contactPhone,
      whatsappNumber,
      officeAddress,
      experienceYears,
      tier,
      isVerified,
      assignedProjectIds,
      assignedPropertyIds,
      chatEnabled,
      promotedAtTop,
      bannerActive,
      loginCredentialsHint,
    } = body;

    if (!companyName || !contactEmail || !contactPhone) {
      return NextResponse.json(
        { success: false, error: "Company Name, Email, and Phone are required." },
        { status: 400 }
      );
    }

    const builderId = id || `bld-${Date.now()}`;
    const cleanSlug =
      slug ||
      companyName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

    const now = new Date().toISOString();

    if (isSupabaseConfigured()) {
      const { error } = await supabase.from("builder_profiles").upsert({
        id: builderId,
        company_name: companyName,
        slug: cleanSlug,
        logo_url: logoUrl,
        banner_url: bannerUrl,
        description: description || "",
        tagline: tagline || "",
        rera_number: reraNumber || "",
        crda_approved: Boolean(crdaApproved),
        contact_email: contactEmail,
        contact_phone: contactPhone,
        whatsapp_number: whatsappNumber || contactPhone,
        office_address: officeAddress || "",
        experience_years: experienceYears || 0,
        tier: tier || "premium",
        is_verified: isVerified ?? false,
        assigned_project_ids: assignedProjectIds || [],
        assigned_property_ids: assignedPropertyIds || [],
        chat_enabled: chatEnabled ?? true,
        promoted_at_top: promotedAtTop ?? false,
        banner_active: bannerActive ?? false,
        login_credentials_hint: loginCredentialsHint || `${contactEmail} / road2026`,
        updated_at: now,
      });

      if (error) {
        console.error("Supabase upsert error:", error);
      }
    }

    return NextResponse.json({
      success: true,
      builder: {
        id: builderId,
        companyName,
        slug: cleanSlug,
        contactEmail,
        contactPhone,
        assignedProjectIds: assignedProjectIds || [],
        updatedAt: now,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "ID required" }, { status: 400 });
    }

    if (isSupabaseConfigured()) {
      await supabase.from("builder_profiles").delete().eq("id", id);
    }

    return NextResponse.json({ success: true, message: "Builder removed successfully" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
