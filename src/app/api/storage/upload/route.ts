import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getClient, getBucketName } from "@/lib/aws/s3";
import { getPublicUrl } from "@/lib/aws/presign";
import { authenticateServerRequest } from "@/lib/server-auth-guard";

const ALLOWED_FOLDERS = [
  "properties",
  "projects",
  "banners",
  "categories",
  "brochures",
  "avatars",
  "videos",
];

const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "pdf", "mp4", "mov", "webm"]);
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

const MAX_IMAGE_SIZE = 15 * 1024 * 1024; // 15MB
const MAX_VIDEO_SIZE = 60 * 1024 * 1024; // 60MB

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    // 1. Authorization Guard (Require valid user session or admin)
    const auth = await authenticateServerRequest(request);
    // Allow upload if user is authenticated or has valid role
    if (!auth.authorized) {
      return NextResponse.json(
        { error: "Authentication required to upload media files" },
        { status: 401 }
      );
    }

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
      const bytes = await request.arrayBuffer();
      if (!bytes || bytes.byteLength === 0) {
        return NextResponse.json({ error: "Empty upload stream" }, { status: 400 });
      }
      buffer = Buffer.from(bytes);
    }

    // 2. Folder Sanitization
    if (!ALLOWED_FOLDERS.includes(folder)) {
      return NextResponse.json({ error: "Invalid upload folder" }, { status: 400 });
    }

    if (
      auth.role !== "admin" &&
      (folder !== "avatars" || !auth.user || entityId !== auth.user.id)
    ) {
      return NextResponse.json(
        { error: "Admin privileges are required for listing media uploads." },
        { status: 403 }
      );
    }

    // 3. Extension & MIME Validation
    const rawExt = (filename.split(".").pop() || "").toLowerCase();
    const cleanExt = rawExt.replace(/[^a-zA-Z0-9]/g, "") || "jpg";

    if (!ALLOWED_EXTENSIONS.has(cleanExt)) {
      return NextResponse.json(
        { error: `Unsupported file extension .${cleanExt}. Allowed: jpg, png, webp, pdf, mp4` },
        { status: 400 }
      );
    }

    // 4. File Size Limits
    const isVideo = ["mp4", "mov", "webm"].includes(cleanExt);
    const maxAllowedSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;

    if (buffer.length > maxAllowedSize) {
      return NextResponse.json(
        {
          error: `File size (${(buffer.length / (1024 * 1024)).toFixed(1)}MB) exceeds maximum allowed limit (${maxAllowedSize / (1024 * 1024)}MB).`,
        },
        { status: 413 }
      );
    }

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

    contentType = contentType.split(";")[0].trim().toLowerCase();
    const expectedMimeByExtension: Record<string, Set<string>> = {
      jpg: new Set(["image/jpeg"]),
      jpeg: new Set(["image/jpeg"]),
      png: new Set(["image/png"]),
      webp: new Set(["image/webp"]),
      pdf: new Set(["application/pdf"]),
      mp4: new Set(["video/mp4"]),
      mov: new Set(["video/quicktime", "video/mp4"]),
      webm: new Set(["video/webm"]),
    };
    if (!ALLOWED_MIME_TYPES.has(contentType) || !expectedMimeByExtension[cleanExt]?.has(contentType)) {
      return NextResponse.json({ error: "File extension and MIME type do not match." }, { status: 400 });
    }
    if (folder === "avatars" && (!contentType.startsWith("image/") || buffer.length > 5 * 1024 * 1024)) {
      return NextResponse.json({ error: "Avatar uploads must be an image no larger than 5MB." }, { status: 400 });
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
