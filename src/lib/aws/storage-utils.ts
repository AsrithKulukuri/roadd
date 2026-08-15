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
 * Normalizes and detects proper MIME type for mobile and desktop files
 */
export function detectMimeType(filename: string, fileType?: string): string {
  const ext = (filename.split(".").pop() || "").toLowerCase();

  // If browser provided a valid MIME type, normalize it
  if (fileType && fileType.trim() && fileType !== "application/octet-stream") {
    const cleanType = fileType.toLowerCase().trim();
    if (cleanType === "image/jpg" || cleanType === "image/pjpeg") return "image/jpeg";
    if (cleanType === "image/x-png") return "image/png";
    return cleanType;
  }

  // Detect from extension (crucial for mobile camera uploads)
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "avif":
      return "image/avif";
    case "heic":
      return "image/heic";
    case "heif":
      return "image/heif";
    case "pdf":
      return "application/pdf";
    case "mp4":
    case "mov":
      return "video/mp4";
    case "webm":
      return "video/webm";
    default:
      return "image/jpeg";
  }
}

/**
 * Extracts S3 key from a full S3 URL or returns the key if already formatted
 */
export function extractS3Key(urlOrKey: string): string {
  if (!urlOrKey) return "";
  
  if (urlOrKey.includes(".amazonaws.com/")) {
    const parts = urlOrKey.split(".amazonaws.com/");
    return decodeURIComponent(parts[1] || urlOrKey);
  }
  
  return urlOrKey;
}

/**
 * Direct browser-to-S3 upload using secure presigned PUT URLs
 * Fully compatible with mobile browsers (iOS Safari, Android Chrome).
 */
export async function uploadToS3({
  file,
  folder,
  entityId,
  compress = true,
}: UploadOptions): Promise<UploadResult> {
  try {
    let fileToUpload: File | Blob = file;
    let effectiveMime = detectMimeType(file.name, file.type);

    // Compress images on client (handles mobile photos smoothly)
    const isImage = effectiveMime.startsWith("image/") && !effectiveMime.includes("svg");
    if (compress && isImage) {
      try {
        const compressedBlob = await imageCompression(file, {
          maxSizeMB: 1.5,
          maxWidthOrHeight: 1920,
          useWebWorker: typeof window !== "undefined" && typeof Worker !== "undefined",
          fileType: "image/jpeg",
        });
        
        fileToUpload = compressedBlob;
        effectiveMime = "image/jpeg";
      } catch (compErr) {
        console.warn("[S3 Storage] Client compression skipped, uploading original:", compErr);
        fileToUpload = file;
      }
    }

    // 1. Request presigned upload URL from Next.js API
    const presignRes = await fetch("/api/storage/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        contentType: effectiveMime,
        folder,
        entityId,
        size: fileToUpload.size,
      }),
    });

    if (!presignRes.ok) {
      const errData = await presignRes.json().catch(() => ({}));
      throw new Error(errData.error || `Server rejected upload request (status ${presignRes.status})`);
    }

    const { uploadUrl, fileUrl, key } = await presignRes.json();

    if (!uploadUrl) {
      throw new Error("No presigned upload URL returned by server");
    }

    // 2. Direct PUT upload to AWS S3 (MIME type must match exact header signed)
    try {
      const s3Res = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": effectiveMime,
        },
        body: fileToUpload,
      });

      if (s3Res.ok) {
        return {
          key,
          fileUrl,
          success: true,
        };
      }
      console.warn(`Direct S3 PUT returned ${s3Res.status}, trying server proxy fallback...`);
    } catch (putErr) {
      console.warn("Direct S3 PUT threw error (CORS/network), trying server proxy fallback:", putErr);
    }

    // 3. Fallback: Server-side S3 upload if direct browser PUT fails (e.g. S3 CORS not set yet)
    const formData = new FormData();
    formData.append("file", fileToUpload instanceof Blob ? new File([fileToUpload], file.name, { type: effectiveMime }) : file);
    formData.append("folder", folder);
    if (entityId) formData.append("entityId", entityId);

    const fallbackRes = await fetch("/api/storage/upload", {
      method: "POST",
      body: formData,
    });

    if (fallbackRes.ok) {
      const fallbackData = await fallbackRes.json();
      if (fallbackData.fileUrl) {
        return {
          key: fallbackData.key,
          fileUrl: fallbackData.fileUrl,
          success: true,
        };
      }
    }

    const errData = await fallbackRes.json().catch(() => ({}));
    throw new Error(errData.error || "Failed to upload file to S3");
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
