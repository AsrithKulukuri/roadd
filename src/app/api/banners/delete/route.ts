import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { deleteFromS3 } from "@/lib/aws/storage-utils";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, imageUrl, mobileImageUrl } = body;

    if (!id) {
      return NextResponse.json({ error: "No banner ID provided" }, { status: 400 });
    }

    // 1. Direct Delete in Supabase Database (Guaranteed with service role client)
    const { error } = await supabaseAdmin
      .from("banners")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[Delete Banner DB Error]:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 2. Delete associated files from S3 asynchronously
    const urlsToDelete: string[] = [];
    if (imageUrl) urlsToDelete.push(imageUrl);
    if (mobileImageUrl) urlsToDelete.push(mobileImageUrl);

    if (urlsToDelete.length > 0) {
      deleteFromS3(urlsToDelete).catch((err) => console.warn("S3 delete warning for banner:", err));
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    console.error("[Delete Banner Server Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to delete banner" }, { status: 500 });
  }
}
