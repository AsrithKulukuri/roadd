import { S3Client } from "@aws-sdk/client-s3";

const getS3Client = () => {
  if (!process.env.AWS_REGION || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error("Missing AWS configuration environment variables");
  }

  return new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
};

// Export a singleton instance created lazily, or just export the getter
// We'll use a lazy singleton to avoid recreating the client
let s3ClientInstance: S3Client | null = null;
export const getClient = () => {
  if (!s3ClientInstance) {
    s3ClientInstance = getS3Client();
  }
  return s3ClientInstance;
};

export const getBucketName = () => {
  const bucket = process.env.AWS_S3_BUCKET_NAME || "";
  if (!bucket) {
    throw new Error("Missing AWS_S3_BUCKET_NAME environment variable");
  }
  return bucket;
};

