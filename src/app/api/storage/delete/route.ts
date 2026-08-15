import { NextResponse } from "next/server";
import { DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { getClient, getBucketName } from "@/lib/aws/s3";

const ALLOWED_PREFIXES = [
  "properties/",
  "projects/",
  "banners/",
  "categories/",
  "brochures/",
  "avatars/",
  "videos/",
];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { keys } = body;

    if (!keys || !Array.isArray(keys) || keys.length === 0) {
      return NextResponse.json(
        { error: "Missing or invalid keys array" },
        { status: 400 }
      );
    }

    // Filter and sanitize keys - only allow keys starting with known folder prefixes
    const validKeys = keys.filter((k: string) => {
      if (typeof k !== "string" || !k.trim()) return false;
      return ALLOWED_PREFIXES.some((prefix) => k.startsWith(prefix));
    });

    if (validKeys.length === 0) {
      return NextResponse.json({ success: true, deleted: [] });
    }

    const command = new DeleteObjectsCommand({
      Bucket: getBucketName(),
      Delete: {
        Objects: validKeys.map((key: string) => ({ Key: key })),
        Quiet: false,
      },
    });

    const response = await getClient().send(command);

    return NextResponse.json({
      success: true,
      deleted: response.Deleted?.map((d) => d.Key) || [],
    });
  } catch (error: any) {
    console.error("[S3 Delete API Error]:", error);
    return NextResponse.json(
      { error: "Failed to delete objects from S3 storage" },
      { status: 500 }
    );
  }
}
