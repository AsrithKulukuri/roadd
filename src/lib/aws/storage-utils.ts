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
  entityId?: string;
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

  if (fileType && fileType.trim() && fileType !== "application/octet-stream") {
    const cleanType = fileType.toLowerCase().trim();
    if (cleanType === "image/jpg" || cleanType === "image/pjpeg") return "image/jpeg";
    if (cleanType === "image/x-png") return "image/png";
    return cleanType;
  }

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
    case "heif":
      return "image/heic";
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
 * Extracts S3 key from a full S3 URL or proxy URL
 */
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

/**
 * Ensures any media URL (including direct S3 URLs) resolves through the secure media proxy
 */
export function resolveMediaUrl(url?: string | null): string {
  if (!url) return "";
  if (url.startsWith("blob:") || url.startsWith("data:")) return url;
  if (url.startsWith("/api/media/")) return url;
  if (url.includes(".amazonaws.com/")) {
    const parts = url.split(".amazonaws.com/");
    if (parts[1]) {
      return `/api/media/${decodeURIComponent(parts[1])}`;
    }
  }
  // If it's a relative S3 key (e.g. "banners/uuid.jpg" or "properties/uuid.webp")
  if (!url.startsWith("http://") && !url.startsWith("https://") && !url.startsWith("/")) {
    return `/api/media/${url}`;
  }
  return url;
}

/**
 * Robust Upload Function:
 * Handles mobile photos, compression, and uploads reliably to AWS S3.
 */
export async function uploadToS3({
  file,
  folder,
  entityId,
  compress = true,
}: UploadOptions): Promise<UploadResult> {
  try {
    let fileToUpload: File | Blob = file;
    const effectiveMime = detectMimeType(file.name, file.type);

    // Compress images on client if supported
    const isImage = effectiveMime.startsWith("image/") && !effectiveMime.includes("svg");
    if (compress && isImage) {
      try {
        const compressedBlob = await imageCompression(file, {
          maxSizeMB: 1.5,
          maxWidthOrHeight: 1920,
          useWebWorker: typeof window !== "undefined" && typeof Worker !== "undefined",
        });
        fileToUpload = compressedBlob;
      } catch (compErr) {
        console.warn("[S3 Storage] Compression skipped, uploading original:", compErr);
        fileToUpload = file;
      }
    }

    // 1. Direct Presigned PUT Upload: Bypasses Next.js server limits (essential for videos and large media)
    try {
      const presignRes = await fetch("/api/storage/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: effectiveMime,
          folder,
          size: fileToUpload.size || file.size,
          entityId,
        }),
      });

      if (presignRes.ok) {
        const presignData = await presignRes.json();
        if (presignData?.uploadUrl && presignData?.fileUrl) {
          const s3PutRes = await fetch(presignData.uploadUrl, {
            method: "PUT",
            headers: {
              "Content-Type": effectiveMime,
            },
            body: fileToUpload,
          });

          if (s3PutRes.ok) {
            return {
              key: presignData.key,
              fileUrl: presignData.fileUrl,
              success: true,
            };
          }
          console.warn("[S3 Storage Direct Presign failed with status]:", s3PutRes.status);
        }
      }
    } catch (presignErr) {
      console.warn("[S3 Storage Presign attempt warning]:", presignErr);
    }

    // 2. Fallback: Upload via multipart FormData through Next.js server API
    const formData = new FormData();
    const finalFile = fileToUpload instanceof File 
      ? fileToUpload 
      : new File([fileToUpload], file.name, { type: effectiveMime });

    formData.append("file", finalFile);
    formData.append("folder", folder);
    if (entityId) formData.append("entityId", entityId);

    const uploadRes = await fetch("/api/storage/upload", {
      method: "POST",
      body: formData,
    });

    if (!uploadRes.ok) {
      const errData = await uploadRes.json().catch(() => ({}));
      throw new Error(errData.error || `Upload failed with status ${uploadRes.status}`);
    }

    const data = await uploadRes.json();

    if (!data.fileUrl) {
      throw new Error("No media URL returned by server");
    }

    return {
      key: data.key,
      fileUrl: data.fileUrl,
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
