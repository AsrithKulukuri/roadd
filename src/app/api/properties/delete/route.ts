import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { deleteFromS3 } from "@/lib/aws/storage-utils";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, ids, deleteAll } = body;

    if (deleteAll) {
      // 1. Fetch all properties to clean up S3 files
      const { data: allProps } = await supabaseAdmin
        .from("properties")
        .select("*");

      // 2. Delete all records from Supabase directly
      const { error } = await supabaseAdmin
        .from("properties")
        .delete()
        .neq("id", "___all___");

      if (error) {
        console.error("[Delete All Properties DB Error]:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // 3. Clean S3 media asynchronously
      if (allProps && allProps.length > 0) {
        const urlsToDelete: string[] = [];
        allProps.forEach((property: any) => {
          if (property.coverImage) urlsToDelete.push(property.coverImage);
          if (property.videoUrl) urlsToDelete.push(property.videoUrl);
          if (property.layoutMapUrl) urlsToDelete.push(property.layoutMapUrl);
          if (property.floorPlanUrl) urlsToDelete.push(property.floorPlanUrl);
          if (property.brochureUrl) urlsToDelete.push(property.brochureUrl);
          property.images?.forEach((img: any) => { if (img?.url) urlsToDelete.push(img.url); });
          property.galleryImages?.forEach((url: string) => { if (url) urlsToDelete.push(url); });
        });
        if (urlsToDelete.length > 0) {
          deleteFromS3(urlsToDelete).catch((err) => console.warn("S3 delete warning:", err));
        }
      }

      return NextResponse.json({ success: true, message: "All properties deleted from database" });
    }

    const targetIds: string[] = [];
    if (id) targetIds.push(id);
    if (Array.isArray(ids)) targetIds.push(...ids);

    if (targetIds.length === 0) {
      return NextResponse.json({ error: "No property ID provided" }, { status: 400 });
    }

    // 1. Fetch properties to collect media URLs before deleting
    const { data: propsToDelete } = await supabaseAdmin
      .from("properties")
      .select("*")
      .in("id", targetIds);

    // 2. Direct Delete in Supabase Database (Guaranteed with service role client)
    const { error } = await supabaseAdmin
      .from("properties")
      .delete()
      .in("id", targetIds);

    if (error) {
      console.error("[Delete Property DB Error]:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 3. Delete associated files from S3
    if (propsToDelete && propsToDelete.length > 0) {
      const urlsToDelete: string[] = [];
      propsToDelete.forEach((property: any) => {
        if (property.coverImage) urlsToDelete.push(property.coverImage);
        if (property.videoUrl) urlsToDelete.push(property.videoUrl);
        if (property.layoutMapUrl) urlsToDelete.push(property.layoutMapUrl);
        if (property.floorPlanUrl) urlsToDelete.push(property.floorPlanUrl);
        if (property.brochureUrl) urlsToDelete.push(property.brochureUrl);
        property.images?.forEach((img: any) => { if (img?.url) urlsToDelete.push(img.url); });
        property.galleryImages?.forEach((url: string) => { if (url) urlsToDelete.push(url); });
      });
      if (urlsToDelete.length > 0) {
        deleteFromS3(urlsToDelete).catch((err) => console.warn("S3 delete warning:", err));
      }
    }

    return NextResponse.json({ success: true, deletedIds: targetIds });
  } catch (error: any) {
    console.error("[Delete Property Server Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to delete property" }, { status: 500 });
  }
}
