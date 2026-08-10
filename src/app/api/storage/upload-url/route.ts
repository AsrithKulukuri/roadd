import { NextResponse } from "next/server";
import { generatePresignedUrl, getPublicUrl } from "@/lib/aws/presign";

const ALLOWED_FOLDERS = [
  "properties",
  "projects",
  "brochures",
  "banners",
  "avatars",
  "videos",
];

const ALLOWED_MIME_TYPES = {
  images: ["image/jpeg", "image/png", "image/webp", "image/jpg"],
  videos: ["video/mp4", "video/webm"],
  documents: ["application/pdf"],
};

const MAX_SIZES_MB = {
  images: 15,
  videos: 300,
  documents: 25,
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { filename, contentType, folder, size } = body;

    if (!filename || !contentType || !folder || !size) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!ALLOWED_FOLDERS.includes(folder)) {
      return NextResponse.json({ error: "Invalid folder" }, { status: 400 });
    }

    // Validate MIME type and size
    let isAllowed = false;
    let sizeMb = size / (1024 * 1024);

    if (ALLOWED_MIME_TYPES.images.includes(contentType)) {
      isAllowed = true;
      if (sizeMb > MAX_SIZES_MB.images) return NextResponse.json({ error: `Image exceeds ${MAX_SIZES_MB.images}MB` }, { status: 400 });
    } else if (ALLOWED_MIME_TYPES.videos.includes(contentType)) {
      isAllowed = true;
      if (sizeMb > MAX_SIZES_MB.videos) return NextResponse.json({ error: `Video exceeds ${MAX_SIZES_MB.videos}MB` }, { status: 400 });
    } else if (ALLOWED_MIME_TYPES.documents.includes(contentType)) {
      isAllowed = true;
      if (sizeMb > MAX_SIZES_MB.documents) return NextResponse.json({ error: `Document exceeds ${MAX_SIZES_MB.documents}MB` }, { status: 400 });
    }

    if (!isAllowed) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }

    // Generate UUID filename preserving extension
    const extension = filename.split(".").pop();
    const uuid = crypto.randomUUID();
    const key = `${folder}/${uuid}.${extension}`;

    const uploadUrl = await generatePresignedUrl(key, contentType);
    const fileUrl = getPublicUrl(key);

    return NextResponse.json({ uploadUrl, fileUrl, key });
  } catch (error: any) {
    console.error("Error generating presigned URL:", error);
    return NextResponse.json({ error: "Failed to generate upload URL" }, { status: 500 });
  }
}
