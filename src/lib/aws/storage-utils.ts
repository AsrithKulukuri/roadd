import imageCompression from "browser-image-compression";

export type StorageFolder =
  | "properties"
  | "projects"
  | "banners"
  | "categories"
  | "brochures"
  | "avatars"
  | "videos";

export interface UploadOptions {
  file: File;
  folder: StorageFolder;
  entityId?: string; // Optional propertyId, projectId, categoryId, etc.
  compress?: boolean;
}

export interface UploadResult {
  key: string;
  fileUrl: string;
  success: boolean;
  error?: string;
}

/**
 * Extracts S3 key from a full S3 URL or returns the key if already formatted
 */
export function extractS3Key(urlOrKey: string): string {
  if (!urlOrKey) return "";
  
  // If it's a full S3 URL: https://bucket.s3.region.amazonaws.com/folder/...
  if (urlOrKey.includes(".amazonaws.com/")) {
    const parts = urlOrKey.split(".amazonaws.com/");
    return parts[1] || urlOrKey;
  }
  
  // If it's already a relative key
  return urlOrKey;
}

/**
 * Direct browser-to-S3 upload using secure presigned PUT URLs
 */
export async function uploadToS3({
  file,
  folder,
  entityId,
  compress = true,
}: UploadOptions): Promise<UploadResult> {
  try {
    let fileToUpload = file;

    // Compress images on client to save bandwidth and storage
    if (compress && file.type.startsWith("image/") && !file.type.includes("svg")) {
      try {
        fileToUpload = await imageCompression(file, {
          maxSizeMB: 1.5,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        });
      } catch (compErr) {
        console.warn("[S3 Storage] Image compression skipped, uploading original:", compErr);
      }
    }

    // 1. Request presigned upload URL from Next.js server
    const presignRes = await fetch("/api/storage/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type || "application/octet-stream",
        folder,
        entityId,
        size: fileToUpload.size,
      }),
    });

    if (!presignRes.ok) {
      const errData = await presignRes.json().catch(() => ({}));
      throw new Error(errData.error || `Failed to get upload URL (status ${presignRes.status})`);
    }

    const { uploadUrl, fileUrl, key } = await presignRes.json();

    if (!uploadUrl) {
      throw new Error("Presigned upload URL was not returned by server");
    }

    // 2. Direct PUT upload to S3
    const s3Res = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
      },
      body: fileToUpload,
    });

    if (!s3Res.ok) {
      throw new Error(`S3 direct upload failed with status: ${s3Res.status}`);
    }

    return {
      key,
      fileUrl,
      success: true,
    };
  } catch (error: any) {
    console.error("[S3 Storage Upload Error]:", error);
    return {
      key: "",
      fileUrl: "",
      success: false,
      error: error.message || "Failed to upload file to S3",
    };
  }
}

/**
 * Delete S3 objects by keys or URLs
 */
export async function deleteFromS3(urlsOrKeys: string[]): Promise<boolean> {
  const cleanKeys = urlsOrKeys
    .map(extractS3Key)
    .filter((k) => Boolean(k) && !k.startsWith("blob:") && !k.startsWith("data:"));

  if (cleanKeys.length === 0) return true;

  try {
    const res = await fetch("/api/storage/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keys: cleanKeys }),
    });

    return res.ok;
  } catch (error) {
    console.error("[S3 Storage Delete Error]:", error);
    return false;
  }
}
