import imageCompression from "browser-image-compression";
import { addWatermarkToImage } from "@/lib/watermark-utils";

export type StorageFolder =
  | "properties"
  | "projects"
  | "banners"
  | "categories"
  | "brochures"
  | "avatars"
  | "videos";

export interface UploadProgressInfo {
  percent: number;
  loaded: number;
  total: number;
  speedBytesPerSec: number;
  remainingSec: number;
}

export interface UploadOptions {
  file: File;
  folder: StorageFolder;
  entityId?: string;
  compress?: boolean;
  watermark?: boolean;
  onProgress?: (info: UploadProgressInfo) => void;
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
 * Handles mobile photos, compression, and uploads reliably to AWS S3 with live progress callbacks.
 */
export async function uploadToS3({
  file,
  folder,
  entityId,
  compress = true,
  watermark = true,
  onProgress,
}: UploadOptions): Promise<UploadResult> {
  try {
    let fileToUpload: File | Blob = file;
    const effectiveMime = detectMimeType(file.name, file.type);

    // 1. Watermark images automatically with roadfacing.com (left side in middle)
    const isImage = effectiveMime.startsWith("image/") && !effectiveMime.includes("svg");
    const shouldWatermark = watermark !== false && isImage && folder !== "avatars" && folder !== "brochures";
    if (shouldWatermark) {
      try {
        fileToUpload = await addWatermarkToImage(fileToUpload, {
          text: "roadfacing.com",
          position: "left-middle",
        });
      } catch (wmErr) {
        console.warn("[S3 Storage] Watermark application skipped:", wmErr);
      }
    }

    // 2. Compress images on client if supported
    if (compress && isImage) {
      try {
        const compressedBlob = await imageCompression(fileToUpload as File, {
          maxSizeMB: 1.5,
          maxWidthOrHeight: 1920,
          useWebWorker: typeof window !== "undefined" && typeof Worker !== "undefined",
        });
        fileToUpload = compressedBlob;
      } catch (compErr) {
        console.warn("[S3 Storage] Compression skipped, uploading original:", compErr);
      }
    }

    const fileSize = fileToUpload.size || file.size;

    // 1. Direct Presigned PUT Upload with accurate real-time progress tracking
    try {
      const presignRes = await fetch("/api/storage/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: effectiveMime,
          folder,
          size: fileSize,
          entityId,
        }),
      });

      if (presignRes.ok) {
        const presignData = await presignRes.json();
        if (presignData?.uploadUrl && presignData?.fileUrl) {
          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const startTime = Date.now();

            xhr.open("PUT", presignData.uploadUrl, true);
            xhr.setRequestHeader("Content-Type", effectiveMime);

            xhr.upload.onprogress = (evt) => {
              if (evt.lengthComputable && onProgress) {
                const percent = Math.min(99, Math.round((evt.loaded / evt.total) * 100));
                const elapsedSec = Math.max(0.1, (Date.now() - startTime) / 1000);
                const speed = evt.loaded / elapsedSec; // bytes per second
                const remainingBytes = Math.max(0, evt.total - evt.loaded);
                const remainingSec = speed > 0 ? Math.round(remainingBytes / speed) : 0;

                onProgress({
                  percent,
                  loaded: evt.loaded,
                  total: evt.total,
                  speedBytesPerSec: speed,
                  remainingSec,
                });
              }
            };

            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                if (onProgress) {
                  onProgress({
                    percent: 100,
                    loaded: fileSize,
                    total: fileSize,
                    speedBytesPerSec: 0,
                    remainingSec: 0,
                  });
                }
                resolve();
              } else {
                reject(new Error(`S3 upload failed with status ${xhr.status}`));
              }
            };

            xhr.onerror = () => reject(new Error("Network error during upload to S3"));
            xhr.ontimeout = () => reject(new Error("Upload to S3 timed out"));

            xhr.send(fileToUpload);
          });

          return {
            key: presignData.key,
            fileUrl: presignData.fileUrl,
            success: true,
          };
        }
      }
    } catch (presignErr) {
      console.warn("[S3 Storage Direct Presign fallback]:", presignErr);
    }

    // 2. Direct streaming upload to Next.js API via raw binary body (100% bypasses multipart/form-data buffer limits)
    const uploadApiUrl = `/api/storage/upload?folder=${encodeURIComponent(folder)}&filename=${encodeURIComponent(file.name)}${entityId ? `&entityId=${encodeURIComponent(entityId)}` : ""}`;

    const serverUploadResult = await new Promise<UploadResult>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const startTime = Date.now();

      xhr.open("POST", uploadApiUrl, true);
      xhr.setRequestHeader("Content-Type", effectiveMime);
      xhr.setRequestHeader("x-filename", encodeURIComponent(file.name));
      xhr.setRequestHeader("x-folder", folder);
      if (entityId) xhr.setRequestHeader("x-entity-id", entityId);

      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable && onProgress) {
          const percent = Math.min(99, Math.round((evt.loaded / evt.total) * 100));
          const elapsedSec = Math.max(0.1, (Date.now() - startTime) / 1000);
          const speed = evt.loaded / elapsedSec;
          const remainingBytes = Math.max(0, evt.total - evt.loaded);
          const remainingSec = speed > 0 ? Math.round(remainingBytes / speed) : 0;

          onProgress({
            percent,
            loaded: evt.loaded,
            total: evt.total,
            speedBytesPerSec: speed,
            remainingSec,
          });
        }
      };

      xhr.onload = () => {
        try {
          const res = JSON.parse(xhr.responseText || "{}");
          if (xhr.status >= 200 && xhr.status < 300 && res.fileUrl) {
            if (onProgress) {
              onProgress({
                percent: 100,
                loaded: fileSize,
                total: fileSize,
                speedBytesPerSec: 0,
                remainingSec: 0,
              });
            }
            resolve({
              key: res.key,
              fileUrl: res.fileUrl,
              success: true,
            });
          } else {
            reject(new Error(res.error || `Upload failed with status ${xhr.status}`));
          }
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.ontimeout = () => reject(new Error("Upload timed out"));

      xhr.send(fileToUpload);
    });

    return serverUploadResult;
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
