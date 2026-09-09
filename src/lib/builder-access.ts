import { authenticateServerRequest } from "@/lib/server-auth-guard";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

export class PortalError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export function portalError(error: unknown) {
  return NextResponse.json({ success: false, error: error instanceof PortalError ? error.message : "The portal service could not complete this operation. Please retry." }, { status: error instanceof PortalError ? error.status : 503 });
}
export function camelRow(row: Record<string, any>) {
  return Object.fromEntries(Object.entries(row).filter(([key]) => key !== "login_credentials_hint").map(([key, value]) => [key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()), value]));
}
export function ownsProject(assignments: unknown, project: { id: string; slug?: string }) {
  return Array.isArray(assignments) && assignments.some(id => typeof id === "string" && !!id && (id === project.id || id === project.slug));
}
export async function recordPortalActivity(builder: { id: string; company_name: string }, action: string, entityId?: string) {
  const { error } = await supabaseAdmin.from("builder_activity_logs").insert({
    builder_id: builder.id, builder_name: builder.company_name, action_type: action, entity_id: entityId || null,
  });
  if (error) console.error("Builder audit event could not be recorded:", error.code);
}
export async function portalAccess(request: Request, targetBuilderId?: string | null) {
  const auth = await authenticateServerRequest(request);
  if (!auth.authorized || !auth.user) throw new PortalError("Please sign in.", 401);
  const admin = auth.role === "admin";
  if (admin && !targetBuilderId) return { admin, builder: null, user: auth.user };
  let query = supabaseAdmin.from("builder_profiles").select("*");
  if (admin) query = query.eq("id", targetBuilderId!);
  else query = query.eq("user_id", auth.user.id);
  let { data: builder, error } = await query.maybeSingle();
  // Dedicated builder sessions contain a builder profile ID, never a client-supplied ID.
  if (!admin && !builder && auth.role === "developer") {
    const result = await supabaseAdmin.from("builder_profiles").select("*").eq("id", auth.user.id).maybeSingle();
    builder = result.data; error = result.error;
  }
  if (error) throw error;
  if (!builder || (!admin && targetBuilderId && builder.id !== targetBuilderId)) throw new PortalError("This builder account is not accessible.", 403);
  return { admin, builder, user: auth.user };
}
export async function projectAccess(request: Request, id: string, slug?: string) {
  const access = await portalAccess(request);
  if (!id && !slug) throw new PortalError("Project is required.");
  const { data: project, error } = await supabaseAdmin.from("projects").select("*").eq(id ? "id" : "slug", id || slug!).maybeSingle();
  if (error) throw error;
  if (!project || (slug && project.slug !== slug) || (!access.admin && !ownsProject(access.builder.assigned_project_ids, project))) throw new PortalError("Project access denied.", 403);
  return { ...access, project };
}
