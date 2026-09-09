import { NextResponse } from "next/server";
import { projectAccess, portalAccess, PortalError, portalError } from "@/lib/builder-access";
import { supabaseAdmin } from "@/lib/supabase-admin";
export async function POST(request: Request) {
  try {
    const access = await portalAccess(request);
    if (!access.builder) throw new PortalError("Sign in as a builder.", 403);
    const form = await request.formData();
    const { project } = await projectAccess(request, String(form.get("projectId") || ""));
    const file = form.get("file");
    if (!(file instanceof File) || file.type !== "application/pdf" || file.size > 10 * 1024 * 1024 || file.size < 5) throw new PortalError("Upload a PDF layout document up to 10 MB.");
    const buffer = new Uint8Array(await file.arrayBuffer());
    if (new TextDecoder().decode(buffer.slice(0, 5)) !== "%PDF-") throw new PortalError("The file must be a PDF.");
    const path = access.builder.id + "/" + project.id + "/" + crypto.randomUUID() + ".pdf";
    const { error } = await supabaseAdmin.storage.from("builder-evidence").upload(path, buffer, { contentType: "application/pdf", upsert: false });
    if (error) throw error;
    return NextResponse.json({ success: true, documentPath: path });
  } catch (error) { return portalError(error); }
}
export async function GET(request: Request) {
  try {
    const path = new URL(request.url).searchParams.get("path") || "";
    const parts = path.split("/");
    if (parts.length !== 3 || parts.some(part => !part || part === "." || part === "..")) throw new PortalError("Invalid document path.");
    const access = await portalAccess(request, parts[0]);
    if (!access.admin) await projectAccess(request, parts[1]);
    const { data, error } = await supabaseAdmin.storage.from("builder-evidence").createSignedUrl(path, 60);
    if (error) throw error;
    return NextResponse.redirect(data.signedUrl, { headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
  } catch (error) { return portalError(error); }
}
