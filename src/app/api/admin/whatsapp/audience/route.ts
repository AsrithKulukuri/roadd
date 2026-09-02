import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth-guard";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { maskWhatsAppPhone, normalizeWhatsAppPhone, readImageUrl } from "@/lib/whatsapp-audience";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LooseRecord = Record<string, unknown>;

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export async function GET(request: Request) {
  const { errorResponse } = await requireAdmin(request);
  if (errorResponse) return errorResponse;

  try {
    const [profilesResult, contactsResult, propertiesResult, projectsResult, bannersResult] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").order("updated_at", { ascending: false }).limit(2000),
      supabaseAdmin.from("whatsapp_contacts").select("*").order("created_at", { ascending: false }).limit(2000),
      supabaseAdmin.from("properties").select("*").order("createdAt", { ascending: false }).limit(100),
      supabaseAdmin.from("projects").select("*").order("createdAt", { ascending: false }).limit(100),
      supabaseAdmin.from("banners").select("*").order("order_index", { ascending: true }).limit(100),
    ]);

    if (profilesResult.error) throw profilesResult.error;
    if (contactsResult.error) throw contactsResult.error;

    const contacts = (contactsResult.data || []) as LooseRecord[];
    const contactByProfile = new Map(
      contacts
        .filter((contact) => stringValue(contact.profile_id))
        .map((contact) => [stringValue(contact.profile_id), contact])
    );

    const registeredUsers = ((profilesResult.data || []) as LooseRecord[]).map((profile) => {
      const id = stringValue(profile.id);
      const phone = normalizeWhatsAppPhone(stringValue(profile.phone));
      const contact = contactByProfile.get(id);
      const isSubscribed = Boolean(contact?.is_subscribed) && !contact?.opted_out_at;
      return {
        id,
        contactId: stringValue(contact?.id),
        name: stringValue(profile.full_name) || "Registered user",
        email: stringValue(profile.email),
        phone: phone || "",
        maskedPhone: phone ? maskWhatsAppPhone(phone) : "No mobile number",
        eligible: Boolean(phone && isSubscribed),
        consentSource: stringValue(contact?.consent_source),
        optedInAt: stringValue(contact?.opted_in_at),
        optedOutAt: stringValue(contact?.opted_out_at),
      };
    });

    const externalContacts = contacts
      .filter((contact) => stringValue(contact.source_type) === "external")
      .map((contact) => {
        const phone = stringValue(contact.phone);
        return {
          id: stringValue(contact.id),
          name: stringValue(contact.name),
          phone,
          maskedPhone: maskWhatsAppPhone(phone),
          eligible: Boolean(contact.is_subscribed) && !contact.opted_out_at,
          consentSource: stringValue(contact.consent_source),
          optedInAt: stringValue(contact.opted_in_at),
          optedOutAt: stringValue(contact.opted_out_at),
        };
      });

    const mapContent = (kind: "property" | "project" | "banner", item: LooseRecord) => ({
      id: stringValue(item.id),
      kind,
      title:
        stringValue(item.title) ||
        stringValue(item.name) ||
        (kind === "banner" ? "Homepage banner" : "Untitled listing"),
      imageUrl: readImageUrl(item),
      slug: stringValue(item.slug),
    });

    return NextResponse.json({
      success: true,
      registeredUsers,
      externalContacts,
      content: [
        ...(((propertiesResult.data || []) as LooseRecord[]).map((item) => mapContent("property", item))),
        ...(((projectsResult.data || []) as LooseRecord[]).map((item) => mapContent("project", item))),
        ...(((bannersResult.data || []) as LooseRecord[]).map((item) => mapContent("banner", item))),
      ],
      warnings: [propertiesResult.error, projectsResult.error, bannersResult.error]
        .filter(Boolean)
        .map((error) => (error as { message?: string }).message || "Content source unavailable"),
    });
  } catch (error: unknown) {
    console.error("[WHATSAPP AUDIENCE ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unable to load the WhatsApp audience.",
      },
      { status: 500 }
    );
  }
}
