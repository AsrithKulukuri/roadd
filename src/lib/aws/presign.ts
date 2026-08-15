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
