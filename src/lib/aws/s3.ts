import { S3Client, DeleteObjectsCommand } from "@aws-sdk/client-s3";

const getS3Client = () => {
  const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "ap-south-2";
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID || process.env.WS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || process.env.WS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error("Missing AWS configuration environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)");
  }

  return new S3Client({
    region,
    credentials: {
      accessKeyId: accessKeyId.trim(),
      secretAccessKey: secretAccessKey.trim(),
    },
  });
};

// Singleton instance created lazily
let s3ClientInstance: S3Client | null = null;

export const getClient = (): S3Client => {
  if (!s3ClientInstance) {
    s3ClientInstance = getS3Client();
  }
  return s3ClientInstance;
};

export const getBucketName = (): string => {
  const bucket = process.env.AWS_S3_BUCKET_NAME || "roadfacing-media-prod";
  return bucket;
};

export const getRegion = (): string => {
  return process.env.AWS_REGION || "ap-south-2";
};

export function extractS3Key(urlOrKey: string): string {
  if (!urlOrKey) return "";

  if (urlOrKey.startsWith("/api/media/")) {
    return urlOrKey.replace(/^\/api\/media\//, "");
  }

  if (urlOrKey.includes(".amazonaws.com/")) {
    const parts = urlOrKey.split(".amazonaws.com/");
    return decodeURIComponent(parts[1] || urlOrKey);
  }

  return urlOrKey;
}

const ALLOWED_DELETE_PREFIXES = [
  "properties/",
  "projects/",
  "banners/",
  "categories/",
  "brochures/",
  "avatars/",
  "videos/",
  "watermarked/",
];

/**
 * Direct server-side deletion of objects from AWS S3 using AWS SDK.
 */
export async function deleteS3Objects(urlsOrKeys: string[]): Promise<boolean> {
  if (!urlsOrKeys || !Array.isArray(urlsOrKeys) || urlsOrKeys.length === 0) {
    return true;
  }

  const validKeys = urlsOrKeys
    .map(extractS3Key)
    .map((k) => k.replace(/^\/+/, ""))
    .filter((k) => {
      if (!k || k.startsWith("blob:") || k.startsWith("data:")) return false;
      return ALLOWED_DELETE_PREFIXES.some((prefix) => k.startsWith(prefix));
    });

  if (validKeys.length === 0) {
    return true;
  }

  try {
    const client = getClient();
    const command = new DeleteObjectsCommand({
      Bucket: getBucketName(),
      Delete: {
        Objects: validKeys.map((key) => ({ Key: key })),
        Quiet: false,
      },
    });

    const response = await client.send(command);
    if (response.Errors && response.Errors.length > 0) {
      console.warn("[S3 Direct Delete Warning] Some objects could not be deleted:", response.Errors);
    }
    return true;
  } catch (error) {
    console.error("[S3 Direct Delete Error]:", error);
    return false;
  }
}

