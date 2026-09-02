import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/server-auth-guard";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { normalizeWhatsAppPhone } from "@/lib/whatsapp-audience";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const consentFields = {
  consentConfirmed: z.literal(true),
  consentSource: z.string().trim().min(3).max(120),
  consentEvidence: z.string().trim().max(500).optional(),
};

const contactMutationSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("register_user_consent"),
    profileId: z.string().trim().min(1).max(150),
    ...consentFields,
  }),
  z.object({
    action: z.literal("add_external"),
    name: z.string().trim().min(2).max(100),
    phone: z.string().trim().min(10).max(24),
    ...consentFields,
  }),
  z.object({
    action: z.literal("unsubscribe"),
    contactId: z.string().uuid(),
  }),
  z.object({
    action: z.literal("resubscribe"),
    contactId: z.string().uuid(),
    ...consentFields,
  }),
]);

export async function POST(request: Request) {
  const { errorResponse, user } = await requireAdmin(request);
  if (errorResponse) return errorResponse;

  const parsed = contactMutationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message || "Invalid contact request." },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();

  try {
    if (parsed.data.action === "unsubscribe") {
      const { data, error } = await supabaseAdmin
        .from("whatsapp_contacts")
        .update({ is_subscribed: false, opted_out_at: now, updated_at: now })
        .eq("id", parsed.data.contactId)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) return NextResponse.json({ success: false, error: "Contact not found." }, { status: 404 });
      return NextResponse.json({ success: true });
    }

    if (parsed.data.action === "resubscribe") {
      const { data, error } = await supabaseAdmin
        .from("whatsapp_contacts")
        .update({
          is_subscribed: true,
          opted_in_at: now,
          opted_out_at: null,
          consent_source: parsed.data.consentSource,
          consent_evidence: parsed.data.consentEvidence || null,
          updated_at: now,
        })
        .eq("id", parsed.data.contactId)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) return NextResponse.json({ success: false, error: "Contact not found." }, { status: 404 });
      return NextResponse.json({ success: true, contactId: data.id });
    }

    if (parsed.data.action === "register_user_consent") {
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, phone")
        .eq("id", parsed.data.profileId)
        .maybeSingle();
      if (profileError) throw profileError;
      if (!profile) return NextResponse.json({ success: false, error: "Registered user not found." }, { status: 404 });

      const phone = normalizeWhatsAppPhone(String(profile.phone || ""));
      if (!phone) {
        return NextResponse.json({ success: false, error: "This user has no valid WhatsApp number." }, { status: 400 });
      }

      const [{ data: profileContact, error: profileContactError }, { data: phoneContact, error: phoneContactError }] =
        await Promise.all([
          supabaseAdmin
            .from("whatsapp_contacts")
            .select("id, profile_id")
            .eq("profile_id", String(profile.id))
            .maybeSingle(),
          supabaseAdmin
            .from("whatsapp_contacts")
            .select("id, profile_id")
            .eq("phone", phone)
            .maybeSingle(),
        ]);
      if (profileContactError) throw profileContactError;
      if (phoneContactError) throw phoneContactError;
      if (profileContact && phoneContact && profileContact.id !== phoneContact.id) {
        return NextResponse.json(
          { success: false, error: "This user's updated number already belongs to another broadcast contact." },
          { status: 409 }
        );
      }
      if (phoneContact?.profile_id && phoneContact.profile_id !== String(profile.id)) {
        return NextResponse.json(
          { success: false, error: "This WhatsApp number is already linked to another registered user." },
          { status: 409 }
        );
      }

      const payload = {
        profile_id: String(profile.id),
        name: String(profile.full_name || "Registered user"),
        phone,
        source_type: "registered",
        consent_source: parsed.data.consentSource,
        consent_evidence: parsed.data.consentEvidence || null,
        is_subscribed: true,
        opted_in_at: now,
        opted_out_at: null,
        created_by: user!.id,
        updated_at: now,
      };
      const existingContact = profileContact || phoneContact;
      const mutation = existingContact
        ? supabaseAdmin.from("whatsapp_contacts").update(payload).eq("id", existingContact.id)
        : supabaseAdmin.from("whatsapp_contacts").insert(payload);
      const { data, error } = await mutation.select("id").single();
      if (error) throw error;
      return NextResponse.json({ success: true, contactId: data.id });
    }

    const phone = normalizeWhatsAppPhone(parsed.data.phone);
    if (!phone) {
      return NextResponse.json({ success: false, error: "Enter a valid WhatsApp number with country code." }, { status: 400 });
    }

    const { data: existing, error: lookupError } = await supabaseAdmin
      .from("whatsapp_contacts")
      .select("id, profile_id")
      .eq("phone", phone)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (existing?.profile_id) {
      return NextResponse.json(
        { success: false, error: "This number belongs to a registered user. Record consent from the registered users list." },
        { status: 409 }
      );
    }

    const payload = {
      name: parsed.data.name,
      phone,
      source_type: "external",
      consent_source: parsed.data.consentSource,
      consent_evidence: parsed.data.consentEvidence || null,
      is_subscribed: true,
      opted_in_at: now,
      opted_out_at: null,
      created_by: user!.id,
      updated_at: now,
    };
    const mutation = existing
      ? supabaseAdmin.from("whatsapp_contacts").update(payload).eq("id", existing.id)
      : supabaseAdmin.from("whatsapp_contacts").insert({ ...payload, profile_id: null });
    const { data, error } = await mutation.select("id").single();
    if (error) throw error;
    return NextResponse.json({ success: true, contactId: data.id });
  } catch (error: unknown) {
    console.error("[WHATSAPP CONTACT MUTATION ERROR]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Contact could not be saved." },
      { status: 500 }
    );
  }
}
