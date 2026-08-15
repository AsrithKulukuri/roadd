import { NextResponse } from "next/server";
import { generatePresignedUrl, getPublicUrl } from "@/lib/aws/presign";

const ALLOWED_FOLDERS = [
  "properties",
  "projects",
  "banners",
  "categories",
  "brochures",
  "avatars",
  "videos",
];

const ALLOWED_IMAGE_MIMES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/heic",
  "image/heif",
  "image/pjpeg",
  "image/x-png",
  "image/gif",
];

const ALLOWED_VIDEO_MIMES = [
  "video/mp4",
  "video/webm",
  "video/quicktime", // iOS MOV videos
  "video/x-m4v",
];

const ALLOWED_DOC_MIMES = [
  "application/pdf",
];

const MAX_SIZES_MB = {
  images: 20,
  videos: 500,
  documents: 30,
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let { filename, contentType, folder, size, entityId } = body;

    if (!filename || !folder || size === undefined) {
      return NextResponse.json(
        { error: "Missing required fields (filename, folder, size)" },
        { status: 400 }
      );
    }

    if (!ALLOWED_FOLDERS.includes(folder)) {
      return NextResponse.json(
        { error: `Invalid folder. Allowed: ${ALLOWED_FOLDERS.join(", ")}` },
        { status: 400 }
      );
    }

    const rawExt = (filename.split(".").pop() || "").toLowerCase();

    // If contentType is generic or empty, infer from extension
    if (!contentType || contentType === "application/octet-stream" || !contentType.includes("/")) {
      if (["jpg", "jpeg"].includes(rawExt)) contentType = "image/jpeg";
      else if (rawExt === "png") contentType = "image/png";
      else if (rawExt === "webp") contentType = "image/webp";
      else if (["heic", "heif"].includes(rawExt)) contentType = "image/heic";
      else if (rawExt === "pdf") contentType = "application/pdf";
      else if (["mp4", "mov"].includes(rawExt)) contentType = "video/mp4";
      else contentType = "image/jpeg";
    }

    const cleanContentType = contentType.toLowerCase().trim();
    const sizeMb = size / (1024 * 1024);

    let isAllowed = false;

    if (ALLOWED_IMAGE_MIMES.includes(cleanContentType) || cleanContentType.startsWith("image/")) {
      isAllowed = true;
      if (sizeMb > MAX_SIZES_MB.images) {
        return NextResponse.json(
          { error: `Image file exceeds maximum limit of ${MAX_SIZES_MB.images}MB` },
          { status: 400 }
        );
      }
    } else if (ALLOWED_VIDEO_MIMES.includes(cleanContentType) || cleanContentType.startsWith("video/")) {
      isAllowed = true;
      if (sizeMb > MAX_SIZES_MB.videos) {
        return NextResponse.json(
          { error: `Video file exceeds maximum limit of ${MAX_SIZES_MB.videos}MB` },
          { status: 400 }
        );
      }
    } else if (ALLOWED_DOC_MIMES.includes(cleanContentType) || rawExt === "pdf") {
      isAllowed = true;
      if (sizeMb > MAX_SIZES_MB.documents) {
        return NextResponse.json(
          { error: `Document file exceeds maximum limit of ${MAX_SIZES_MB.documents}MB` },
          { status: 400 }
        );
      }
    }

    if (!isAllowed) {
      return NextResponse.json(
        { error: `Unsupported file format: ${cleanContentType}` },
        { status: 400 }
      );
    }

    // Sanitize extension and generate safe UUID filename
    const cleanExt = rawExt.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "jpg";
    const uuid = crypto.randomUUID();

    // Construct safe S3 key (prevent directory traversal)
    let key: string;
    if (entityId && typeof entityId === "string") {
      const cleanEntityId = entityId.replace(/[^a-zA-Z0-9_-]/g, "");
      key = `${folder}/${cleanEntityId}/${uuid}.${cleanExt}`;
    } else {
      key = `${folder}/${uuid}.${cleanExt}`;
    }

    const expiresIn = 300; // 5 minutes
    const uploadUrl = await generatePresignedUrl(key, cleanContentType, expiresIn);
    const fileUrl = getPublicUrl(key);

    return NextResponse.json({
      uploadUrl,
      fileUrl,
      key,
      contentType: cleanContentType,
      expiresIn,
    });
  } catch (error: any) {
    console.error("[S3 Upload-Url API Error]:", error);
    return NextResponse.json(
      { error: "Failed to generate presigned upload URL" },
      { status: 500 }
    );
  }
}
