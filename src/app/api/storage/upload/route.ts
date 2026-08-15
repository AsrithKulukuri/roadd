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

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "properties";
    const entityId = formData.get("entityId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_FOLDERS.includes(folder)) {
      return NextResponse.json({ error: "Invalid folder" }, { status: 400 });
    }

    const rawExt = (file.name.split(".").pop() || "").toLowerCase();
    const cleanExt = rawExt.replace(/[^a-zA-Z0-9]/g, "") || "jpg";
    const uuid = crypto.randomUUID();

    let key: string;
    if (entityId && typeof entityId === "string") {
      const cleanEntityId = entityId.replace(/[^a-zA-Z0-9_-]/g, "");
      key = `${folder}/${cleanEntityId}/${uuid}.${cleanExt}`;
    } else {
      key = `${folder}/${uuid}.${cleanExt}`;
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const command = new PutObjectCommand({
      Bucket: getBucketName(),
      Key: key,
      Body: buffer,
      ContentType: file.type || "image/jpeg",
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
      { error: error.message || "Failed to upload file to S3 via server" },
      { status: 500 }
    );
  }
}
