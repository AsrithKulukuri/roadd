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
    const [profilesResult, userProfilesResult, authUsersResult, contactsResult, propertiesResult, projectsResult, bannersResult] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").limit(2000),
      supabaseAdmin.from("user_profiles").select("*").limit(2000),
      supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }).catch(() => ({ data: { users: [] }, error: null })),
      supabaseAdmin.from("whatsapp_contacts").select("*").order("created_at", { ascending: false }).limit(2000),
      supabaseAdmin.from("properties").select("*").order("createdAt", { ascending: false }).limit(100),
      supabaseAdmin.from("projects").select("*").order("createdAt", { ascending: false }).limit(100),
      supabaseAdmin.from("banners").select("*").order("order_index", { ascending: true }).limit(100),
    ]);

    const profiles = (profilesResult.data || []) as LooseRecord[];
    const userProfiles = (userProfilesResult.data || []) as LooseRecord[];
    const authUsers = (authUsersResult.data?.users || []) as LooseRecord[];
    const existingContacts = (contactsResult.data || []) as LooseRecord[];

    const contactByPhone = new Map<string, LooseRecord>();
    const contactByProfile = new Map<string, LooseRecord>();
    for (const c of existingContacts) {
      const phone = normalizeWhatsAppPhone(stringValue(c.phone));
      const profId = stringValue(c.profile_id);
      if (phone) contactByPhone.set(phone, c);
      if (profId) contactByProfile.set(profId, c);
    }

    // Aggregate all registered profiles
    const profileMap = new Map<string, LooseRecord>();
    for (const p of [...profiles, ...userProfiles]) {
      const id = stringValue(p.id);
      const phone = normalizeWhatsAppPhone(stringValue(p.phone));
      const email = stringValue(p.email).toLowerCase();
      const key = id || phone || email;
      if (key) {
        profileMap.set(key, { ...profileMap.get(key), ...p });
      }
    }

    // Ingest auth.users
    for (const u of authUsers) {
      const id = stringValue(u.id);
      const rawPhone = stringValue(u.phone) || stringValue((u.user_metadata as LooseRecord)?.phone);
      const phone = normalizeWhatsAppPhone(rawPhone);
      const email = stringValue(u.email).toLowerCase();
      const meta = (u.user_metadata as LooseRecord) || {};

      const key = id || phone || email;
      if (key) {
        const existing = profileMap.get(key) || {};
        profileMap.set(key, {
          ...existing,
          id: id || existing.id,
          phone: phone || existing.phone,
          email: email || existing.email,
          full_name: stringValue(existing.full_name) || stringValue(meta.full_name) || stringValue(meta.name),
        });
      }
    }

    // Auto-create whatsapp_contacts for any registered user who has a phone number
    const newContactsToUpsert: LooseRecord[] = [];
    const registeredUsers: any[] = [];

    for (const profile of Array.from(profileMap.values())) {
      const id = stringValue(profile.id);
      const rawPhone = stringValue(profile.phone);
      const phone = normalizeWhatsAppPhone(rawPhone);
      const email = stringValue(profile.email);

      let name = stringValue(profile.full_name) || stringValue(profile.name);
      if (!name || name.toLowerCase() === "google user" || name.toLowerCase() === "mock user") {
        if (email && email.includes("@") && !email.endsWith("@road.internal") && !email.endsWith("@phone.auth")) {
          name = email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
        } else if (phone) {
          name = `Member (+${phone.slice(0, 2)} ${phone.slice(2, 6)}***${phone.slice(-3)})`;
        } else {
          name = "Registered User";
        }
      }

      let contact = (phone ? contactByPhone.get(phone) : null) || (id ? contactByProfile.get(id) : null);

      if (phone && !contact) {
        // Prepare contact record
        const newContactRecord = {
          profile_id: id || null,
          name,
          phone,
          is_subscribed: true,
          consent_source: "road_website_registration",
          opted_in_at: new Date().toISOString(),
        };
        newContactsToUpsert.push(newContactRecord);
        contact = newContactRecord;
      }

      const isSubscribed = contact ? Boolean(contact.is_subscribed) && !contact.opted_out_at : false;

      registeredUsers.push({
        id: id || phone || `reg-${Date.now()}`,
        contactId: stringValue(contact?.id) || id || phone,
        name,
        email: email && !email.endsWith("@road.internal") && !email.endsWith("@phone.auth") ? email : "",
        phone: phone || "",
        maskedPhone: phone ? maskWhatsAppPhone(phone) : "No mobile number",
        eligible: Boolean(phone && isSubscribed),
        consentSource: stringValue(contact?.consent_source) || "road_website_registration",
        optedInAt: stringValue(contact?.opted_in_at) || new Date().toISOString(),
        optedOutAt: stringValue(contact?.opted_out_at),
      });
    }

    // Asynchronously insert newly discovered registered contacts into whatsapp_contacts
    if (newContactsToUpsert.length > 0) {
      try {
        await supabaseAdmin
          .from("whatsapp_contacts")
          .upsert(newContactsToUpsert, { onConflict: "phone", ignoreDuplicates: false });
      } catch (err) {
        console.warn("[AUDIENCE AUTO-SYNC ERROR]", err);
      }
    }

    const externalContacts = existingContacts
      .filter((contact: LooseRecord) => stringValue(contact.source_type) === "external")
      .map((contact: LooseRecord) => {
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
