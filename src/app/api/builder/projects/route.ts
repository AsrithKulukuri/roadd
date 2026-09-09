import { NextResponse } from "next/server";
import { projectAccess, PortalError, portalError, recordPortalActivity } from "@/lib/builder-access";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { z } from "zod";

const content = z.object({
  description: z.string().max(20000).optional(),
  highlights: z.array(z.string().max(500)).max(50).optional(),
  facilities: z.array(z.string().max(500)).max(100).optional(),
  constructionStatus: z.enum(["under-construction", "ready-to-move", "new-launch"]).optional(),
}).strict();
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { project, builder } = await projectAccess(request, body.projectId);
    const validation = content.safeParse(body.payload);
    if (!validation.success) throw new PortalError("Invalid project fields. Legal, approval and identity changes require admin review.");
    const { data, error } = await supabaseAdmin.from("projects").update({ ...validation.data, updatedAt: new Date().toISOString() }).eq("id", project.id).select("*").single();
    if (error) throw error;
    if (builder) await recordPortalActivity(builder, "edit_project", project.id);
    return NextResponse.json({ success: true, project: data });
  } catch (error) { return portalError(error); }
}
