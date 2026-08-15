import { S3Client } from "@aws-sdk/client-s3";

const getS3Client = () => {
  const region = process.env.AWS_REGION || "ap-south-2";
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error("Missing AWS configuration environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)");
  }

  return new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
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
