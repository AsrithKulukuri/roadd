import { NextResponse } from "next/server";
import { generatePresignedGetUrl } from "@/lib/aws/presign";
import { requireAuthUser } from "@/lib/server-auth-guard";

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
    const { errorResponse } = await requireAuthUser(request);
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const { key, keys, expiresIn = 300 } = body;
    const safeExpiresIn = Math.min(Math.max(Number(expiresIn) || 300, 60), 900);

    // Single key request
    if (key && typeof key === "string") {
      const isValid = ALLOWED_PREFIXES.some((prefix) => key.startsWith(prefix));
      if (!isValid) {
        return NextResponse.json({ error: "Invalid S3 object key" }, { status: 400 });
      }

      const signedUrl = await generatePresignedGetUrl(key, safeExpiresIn);
      return NextResponse.json({ key, signedUrl, expiresIn: safeExpiresIn });
    }

    // Batch keys request
    if (keys && Array.isArray(keys)) {
      const results = await Promise.all(
        keys.map(async (k: string) => {
          if (typeof k !== "string" || !ALLOWED_PREFIXES.some((p) => k.startsWith(p))) {
            return { key: k, signedUrl: null };
          }
          try {
            const signedUrl = await generatePresignedGetUrl(k, safeExpiresIn);
            return { key: k, signedUrl };
          } catch {
            return { key: k, signedUrl: null };
          }
        })
      );

      return NextResponse.json({ urls: results });
    }

    return NextResponse.json(
      { error: "Missing required field: key or keys" },
      { status: 400 }
    );
  } catch (error: unknown) {
    console.error("[S3 Signed-Url API Error]:", error);
    return NextResponse.json(
      { error: "Failed to generate signed GET URL" },
      { status: 500 }
    );
  }
}
