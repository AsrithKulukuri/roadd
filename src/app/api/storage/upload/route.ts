import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getClient, getBucketName } from "@/lib/aws/s3";
import { getPublicUrl } from "@/lib/aws/presign";

const ALLOWED_FOLDERS = [
  "properties",
  "projects",
  "banners",
  "categories",
  "brochures",
  "avatars",
  "videos",
];

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const contentTypeHeader = request.headers.get("content-type") || "";

    let buffer: Buffer;
    let filename = url.searchParams.get("filename") || request.headers.get("x-filename") || "upload.jpg";
    let folder = url.searchParams.get("folder") || request.headers.get("x-folder") || "properties";
    let entityId = url.searchParams.get("entityId") || request.headers.get("x-entity-id") || null;
    let contentType = contentTypeHeader;

    try {
      filename = decodeURIComponent(filename);
    } catch {}

    if (contentTypeHeader.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }
      filename = file.name;
      folder = (formData.get("folder") as string) || folder;
      entityId = (formData.get("entityId") as string) || entityId;
      contentType = file.type || contentType;
      const bytes = await file.arrayBuffer();
      buffer = Buffer.from(bytes);
    } else {
      // Direct raw binary stream (Bypasses Next.js FormData body parser limits!)
      const bytes = await request.arrayBuffer();
      if (!bytes || bytes.byteLength === 0) {
        return NextResponse.json({ error: "Empty upload stream" }, { status: 400 });
      }
      buffer = Buffer.from(bytes);
    }

    if (!ALLOWED_FOLDERS.includes(folder)) {
      folder = "properties";
    }

    const rawExt = (filename.split(".").pop() || "").toLowerCase();
    const cleanExt = rawExt.replace(/[^a-zA-Z0-9]/g, "") || "jpg";
    const uuid = crypto.randomUUID();

    let key: string;
    if (entityId && typeof entityId === "string" && entityId.trim()) {
      const cleanEntityId = entityId.replace(/[^a-zA-Z0-9_-]/g, "");
      key = `${folder}/${cleanEntityId}/${uuid}.${cleanExt}`;
    } else {
      key = `${folder}/${uuid}.${cleanExt}`;
    }

    if (!contentType || contentType === "application/octet-stream" || !contentType.includes("/")) {
      if (["jpg", "jpeg"].includes(cleanExt)) contentType = "image/jpeg";
      else if (cleanExt === "png") contentType = "image/png";
      else if (cleanExt === "webp") contentType = "image/webp";
      else if (cleanExt === "pdf") contentType = "application/pdf";
      else if (["mp4", "mov"].includes(cleanExt)) contentType = "video/mp4";
      else if (cleanExt === "webm") contentType = "video/webm";
      else contentType = "image/jpeg";
    }

    const command = new PutObjectCommand({
      Bucket: getBucketName(),
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    await getClient().send(command);
    const fileUrl = getPublicUrl(key);

    return NextResponse.json({
      success: true,
      fileUrl,
      key,
    });
  } catch (error: any) {
    console.error("[Server S3 Upload Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload file to S3" },
      { status: 500 }
    );
  }
}
