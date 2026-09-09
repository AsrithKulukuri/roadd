import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { signSessionPayload } from "@/lib/server-auth-guard";
import { POST as verifyOtp } from "@/app/api/auth/verify-otp/route";
import { camelRow, PortalError, portalError, recordPortalActivity } from "@/lib/builder-access";

export async function POST(request: Request) {
  try {
    const body = await request.clone().json();
    let builder;
    if (typeof body.email === "string" && typeof body.password === "string" && body.password) {
      const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data, error } = await client.auth.signInWithPassword({ email: body.email.trim(), password: body.password });
      if (error || !data.user) throw new PortalError("Invalid builder credentials. Use your registered WhatsApp number or contact admin.", 401);
      const result = await supabaseAdmin.from("builder_profiles").select("*").eq("user_id", data.user.id).maybeSingle();
      if (result.error) throw result.error;
      builder = result.data;
    } else if (typeof body.phone === "string" && /^\d{6}$/.test(body.otp || "")) {
      const response = await verifyOtp(request);
      const result = await response.json();
      if (!response.ok || !result.success) throw new PortalError(result.error?.message || "OTP verification failed.", response.status);
      const normalize = (phone: string) => phone.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
      const { data, error } = await supabaseAdmin.from("builder_profiles").select("*");
      if (error) throw error;
      const matches = (data || []).filter(row => normalize(row.contact_phone || "") === normalize(result.user.phone));
      if (matches.length === 1) builder = matches[0];
    } else throw new PortalError("Provide email and password, or phone and a six-digit OTP.");
    if (!builder) throw new PortalError("No registered builder account matches these credentials.", 403);
    const now = new Date().toISOString();
    const { error: activityError } = await supabaseAdmin.from("builder_profiles").update({ last_login_at: now, last_active_at: now }).eq("id", builder.id);
    if (activityError) throw activityError;
    await recordPortalActivity(builder, "login");
    const user = { id: builder.id, name: builder.company_name, email: builder.contact_email, phone: builder.contact_phone, role: "developer", builderSessionVersion: 2, exp: Date.now() + 86400000 };
    const response = NextResponse.json({ success: true, builder: camelRow(builder), user });
    response.cookies.set("road_auth_token", signSessionPayload(user), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 86400 });
    response.cookies.set("road_user", "true", { sameSite: "lax", path: "/", maxAge: 86400 });
    return response;
  } catch (error) { return portalError(error); }
}
