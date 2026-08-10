import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getClient, getBucketName } from "./s3";

export async function generatePresignedUrl(key: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: key,
    ContentType: contentType,
  });

  // 300 seconds (5 minutes) expiration
  return getSignedUrl(getClient(), command, { expiresIn: 300 });
}

export function getPublicUrl(key: string): string {
  // Assuming the bucket is public-read or fronted by CloudFront
  // Format: https://[BUCKET_NAME].s3.[REGION].amazonaws.com/[KEY]
  return `https://${getBucketName()}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}
