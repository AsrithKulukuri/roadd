import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth-guard";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { normalizeWhatsAppPhone } from "@/lib/whatsapp-audience";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LooseRecord = Record<string, unknown>;

function str(val: unknown): string {
  return typeof val === "string" ? val.trim() : "";
}

export async function GET(request: Request) {
  const { errorResponse } = await requireAdmin(request);
  if (errorResponse) return errorResponse;

  try {
    // 1. Fetch from all sources in parallel
    const [userProfilesRes, profilesRes, authUsersRes, contactsRes] = await Promise.all([
      supabaseAdmin.from("user_profiles").select("*").limit(2000),
      supabaseAdmin.from("profiles").select("*").limit(2000),
      supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }).catch(() => ({ data: { users: [] }, error: null })),
      supabaseAdmin.from("whatsapp_contacts").select("*").limit(2000),
    ]);

    const userProfiles = (userProfilesRes.data || []) as LooseRecord[];
    const profiles = (profilesRes.data || []) as LooseRecord[];
    const authUsers = (authUsersRes.data?.users || []) as LooseRecord[];
    const contacts = (contactsRes.data || []) as LooseRecord[];

    // Index by ID and Phone/Email for rich joining
    const profileById = new Map<string, LooseRecord>();
    const profileByPhone = new Map<string, LooseRecord>();
    const profileByEmail = new Map<string, LooseRecord>();

    for (const p of [...profiles, ...userProfiles]) {
      const id = str(p.id);
      const phone = normalizeWhatsAppPhone(str(p.phone));
      const email = str(p.email).toLowerCase();
      if (id) profileById.set(id, { ...profileById.get(id), ...p });
      if (phone) profileByPhone.set(phone, { ...profileByPhone.get(phone), ...p });
      if (email) profileByEmail.set(email, { ...profileByEmail.get(email), ...p });
    }

    const contactByPhone = new Map<string, LooseRecord>();
    for (const c of contacts) {
      const phone = normalizeWhatsAppPhone(str(c.phone));
      if (phone) contactByPhone.set(phone, c);
    }

    // Master map of unified users
    const unifiedMap = new Map<string, any>();

    // 2. Ingest Auth Users
    for (const u of authUsers) {
      const id = str(u.id);
      const rawPhone = str(u.phone) || str((u.user_metadata as LooseRecord)?.phone);
      const phone = normalizeWhatsAppPhone(rawPhone) || "";
      const email = str(u.email).toLowerCase();
      const meta = (u.user_metadata as LooseRecord) || {};
      const appMeta = (u.app_metadata as LooseRecord) || {};

      const prof = profileById.get(id) || profileByPhone.get(phone) || (email ? profileByEmail.get(email) : null);
      const contact = phone ? contactByPhone.get(phone) : null;

      let name = str(prof?.full_name) || str(prof?.name) || str(meta.full_name) || str(meta.name) || str(contact?.name);
      if (!name || name.toLowerCase() === "google user" || name.toLowerCase() === "mock user") {
        if (email && email.includes("@") && !email.endsWith("@road.internal") && !email.endsWith("@phone.auth")) {
          name = email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
        } else if (phone) {
          name = `Member (+${phone.slice(0, 2)} ${phone.slice(2, 6)}***${phone.slice(-3)})`;
        } else {
          name = "Registered User";
        }
      }

      const cleanEmail = email && !email.endsWith("@road.internal") && !email.endsWith("@phone.auth") ? email : str(prof?.email);
      const role = str(prof?.role) || str(meta.role) || "buyer";
      const isVerified = Boolean(prof?.is_verified ?? prof?.isVerified ?? u.email_confirmed_at ?? u.phone_confirmed_at);
      const isProfileComplete = Boolean(prof?.is_profile_complete ?? (name && cleanEmail && cleanEmail.includes("@")));
      const provider = str(appMeta.provider) || (phone ? "whatsapp" : email ? "email" : "google");

      unifiedMap.set(id || phone || email, {
        id: id || `user-${Date.now()}`,
        name,
        email: cleanEmail,
        phone: phone ? (phone.startsWith("+") ? phone : `+${phone}`) : (str(prof?.phone) || ""),
        role,
        provider,
        isVerified,
        isProfileComplete,
        createdAt: str(u.created_at) || str(prof?.created_at) || new Date().toISOString(),
        lastSignInAt: str(u.last_sign_in_at) || str(prof?.updated_at) || "",
      });
    }

    // 3. Ingest any remaining records from user_profiles / profiles not in Auth Users
    for (const p of [...userProfiles, ...profiles]) {
      const id = str(p.id);
      const rawPhone = str(p.phone);
      const phone = normalizeWhatsAppPhone(rawPhone) || "";
      const email = str(p.email).toLowerCase();

      const existingKey = id || phone || email;
      if (existingKey && !unifiedMap.has(existingKey)) {
        let name = str(p.full_name) || str(p.name);
        if (!name || name.toLowerCase() === "google user" || name.toLowerCase() === "mock user") {
          if (email && email.includes("@") && !email.endsWith("@road.internal")) {
            name = email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
          } else if (phone) {
            name = `Member (+${phone.slice(0, 2)} ${phone.slice(2, 6)}***${phone.slice(-3)})`;
          } else {
            name = "Registered User";
          }
        }

        const cleanEmail = email && !email.endsWith("@road.internal") ? email : "";
        const role = str(p.role) || "buyer";
        const isVerified = Boolean(p.is_verified ?? p.isVerified);
        const isProfileComplete = Boolean(p.is_profile_complete ?? (name && cleanEmail));

        unifiedMap.set(existingKey, {
          id: id || `prof-${Date.now()}`,
          name,
          email: cleanEmail,
          phone: phone ? (phone.startsWith("+") ? phone : `+${phone}`) : rawPhone,
          role,
          provider: phone ? "whatsapp" : "email",
          isVerified,
          isProfileComplete,
          createdAt: str(p.created_at) || new Date().toISOString(),
          lastSignInAt: str(p.updated_at) || "",
        });
      }
    }

    const users = Array.from(unifiedMap.values()).sort((a, b) => {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

    return NextResponse.json({
      success: true,
      users,
      count: users.length,
    });
  } catch (err: unknown) {
    console.error("[ADMIN USERS API ERROR]", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to load users" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const { errorResponse } = await requireAdmin(request);
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json().catch(() => ({}));
    const { userId, action, role } = body;

    if (!userId || !action) {
      return NextResponse.json({ success: false, error: "userId and action are required" }, { status: 400 });
    }

    if (action === "verify" || action === "revoke") {
      const isVerified = action === "verify";

      // Update both user_profiles and profiles
      await Promise.allSettled([
        supabaseAdmin.from("user_profiles").update({ is_verified: isVerified }).eq("id", userId),
        supabaseAdmin.from("profiles").update({ is_verified: isVerified }).eq("id", userId),
      ]);

      return NextResponse.json({
        success: true,
        message: isVerified ? "User verified successfully" : "User verification revoked",
      });
    }

    if (action === "updateRole" && role) {
      await Promise.allSettled([
        supabaseAdmin.from("user_profiles").update({ role }).eq("id", userId),
        supabaseAdmin.from("profiles").update({ role }).eq("id", userId),
      ]);

      return NextResponse.json({
        success: true,
        message: `User role updated to ${role}`,
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    console.error("[ADMIN USER ACTION ERROR]", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Action failed" },
      { status: 500 }
    );
  }
}
