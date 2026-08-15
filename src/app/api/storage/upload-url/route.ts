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

const ALLOWED_MIME_TYPES = {
  images: ["image/jpeg", "image/png", "image/webp", "image/jpg", "image/avif"],
  videos: ["video/mp4", "video/webm"],
  documents: ["application/pdf"],
};

const MAX_SIZES_MB = {
  images: 15,
  videos: 500,
  documents: 25,
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { filename, contentType, folder, size, entityId } = body;

    if (!filename || !contentType || !folder || size === undefined) {
      return NextResponse.json(
        { error: "Missing required fields (filename, contentType, folder, size)" },
        { status: 400 }
      );
    }

    if (!ALLOWED_FOLDERS.includes(folder)) {
      return NextResponse.json(
        { error: `Invalid folder. Allowed: ${ALLOWED_FOLDERS.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate MIME type and size
    let isAllowed = false;
    const sizeMb = size / (1024 * 1024);

    if (ALLOWED_MIME_TYPES.images.includes(contentType)) {
      isAllowed = true;
      if (sizeMb > MAX_SIZES_MB.images) {
        return NextResponse.json(
          { error: `Image file exceeds maximum limit of ${MAX_SIZES_MB.images}MB` },
          { status: 400 }
        );
      }
    } else if (ALLOWED_MIME_TYPES.videos.includes(contentType)) {
      isAllowed = true;
      if (sizeMb > MAX_SIZES_MB.videos) {
        return NextResponse.json(
          { error: `Video file exceeds maximum limit of ${MAX_SIZES_MB.videos}MB` },
          { status: 400 }
        );
      }
    } else if (ALLOWED_MIME_TYPES.documents.includes(contentType)) {
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
        { error: `Unsupported file type: ${contentType}` },
        { status: 400 }
      );
    }

    // Sanitize extension and generate safe UUID filename
    const rawExt = filename.split(".").pop() || "";
    const cleanExt = rawExt.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "webp";
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
    const uploadUrl = await generatePresignedUrl(key, contentType, expiresIn);
    const fileUrl = getPublicUrl(key);

    return NextResponse.json({
      uploadUrl,
      fileUrl,
      key,
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
