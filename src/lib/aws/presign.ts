import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getClient, getBucketName, getRegion } from "./s3";

/**
 * Generate short-lived presigned PUT URL for browser uploads
 * @param key S3 object key (e.g. properties/uuid.webp)
 * @param contentType MIME type of the file
 * @param expiresIn Expiration in seconds (default 300s / 5 mins)
 */
export async function generatePresignedUrl(
  key: string,
  contentType: string,
  expiresIn = 300
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(getClient(), command, { expiresIn });
}

/**
 * Generate short-lived presigned GET URL for viewing/downloading private objects
 * @param key S3 object key
 * @param expiresIn Expiration in seconds (default 300s / 5 mins)
 */
export async function generatePresignedGetUrl(
  key: string,
  expiresIn = 300
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: getBucketName(),
    Key: key,
  });

  return getSignedUrl(getClient(), command, { expiresIn });
}

/**
 * Construct secure media proxy URL for private S3 Objects
 * @param key S3 object key
 */
export function getPublicUrl(key: string): string {
  const cleanKey = key.replace(/^\/+/, "");
  return `/api/media/${cleanKey}`;
}

/**
 * Resolves any media URL or proxy path to a direct pre-signed S3 GET URL
 * suitable for external API consumption (e.g. WhatsApp / WASender / CDN)
 * without hitting proxy auth or deployment protection.
 */
export async function resolveExternalMediaUrl(rawUrl: string, expiresIn = 86400): Promise<string> {
  const trimmed = (rawUrl || "").trim();
  if (!trimmed) return trimmed;

  let s3Key: string | null = null;
  if (trimmed.startsWith("/api/media/")) {
    s3Key = trimmed.replace(/^\/api\/media\//, "");
  } else if (trimmed.includes("/api/media/")) {
    const match = trimmed.match(/\/api\/media\/(.+)$/);
    if (match && match[1]) {
      s3Key = match[1];
    }
  } else if (
    !trimmed.startsWith("http://") &&
    !trimmed.startsWith("https://") &&
    (trimmed.startsWith("banners/") ||
      trimmed.startsWith("properties/") ||
      trimmed.startsWith("projects/") ||
      trimmed.startsWith("categories/") ||
      trimmed.startsWith("watermarked/"))
  ) {
    s3Key = trimmed;
  }

  if (s3Key) {
    try {
      const decodedKey = decodeURIComponent(s3Key.split("?")[0]);
      const presigned = await generatePresignedGetUrl(decodedKey, expiresIn);
      if (presigned) return presigned;
    } catch (err) {
      console.warn("[Media Resolver] Failed to generate S3 presigned URL for key:", s3Key, err);
    }
  }

  return trimmed;
}
