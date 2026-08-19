import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { deleteFromS3 } from "@/lib/aws/storage-utils";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, ids, deleteAll } = body;

    if (deleteAll) {
      const { data: allProjects } = await supabaseAdmin.from("projects").select("*");

      const { error } = await supabaseAdmin.from("projects").delete().neq("id", "___all___");
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (allProjects && allProjects.length > 0) {
        const urlsToDelete: string[] = [];
        allProjects.forEach((project: any) => {
          if (project.coverImage) urlsToDelete.push(project.coverImage);
          if (project.builderLogoUrl) urlsToDelete.push(project.builderLogoUrl);
          if (project.videoUrl) urlsToDelete.push(project.videoUrl);
          if (project.brochureUrl) urlsToDelete.push(project.brochureUrl);
          project.images?.forEach((img: any) => { if (img?.url) urlsToDelete.push(img.url); });
        });
        if (urlsToDelete.length > 0) {
          deleteFromS3(urlsToDelete).catch(() => {});
        }
      }

      return NextResponse.json({ success: true, message: "All projects deleted from database" });
    }

    const targetIds: string[] = [];
    if (id) targetIds.push(id);
    if (Array.isArray(ids)) targetIds.push(...ids);

    if (targetIds.length === 0) {
      return NextResponse.json({ error: "No project ID provided" }, { status: 400 });
    }

    const { data: projectsToDelete } = await supabaseAdmin.from("projects").select("*").in("id", targetIds);

    const { error } = await supabaseAdmin.from("projects").delete().in("id", targetIds);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (projectsToDelete && projectsToDelete.length > 0) {
      const urlsToDelete: string[] = [];
      projectsToDelete.forEach((project: any) => {
        if (project.coverImage) urlsToDelete.push(project.coverImage);
        if (project.builderLogoUrl) urlsToDelete.push(project.builderLogoUrl);
        if (project.videoUrl) urlsToDelete.push(project.videoUrl);
        if (project.brochureUrl) urlsToDelete.push(project.brochureUrl);
        project.images?.forEach((img: any) => { if (img?.url) urlsToDelete.push(img.url); });
      });
      if (urlsToDelete.length > 0) {
        deleteFromS3(urlsToDelete).catch(() => {});
      }
    }

    return NextResponse.json({ success: true, deletedIds: targetIds });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete project" }, { status: 500 });
  }
}
