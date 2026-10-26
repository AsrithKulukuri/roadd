import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getClient, getBucketName } from "@/lib/aws/s3";
import { Readable } from "stream";

// Approved public S3 folder prefixes served by this proxy
const ALLOWED_PREFIXES = [
  "properties/",
  "projects/",
  "banners/",
  "categories/",
  "brochures/",
  "avatars/",
  "videos/",
] as const;

// Supported extensions and their verified MIME types and media categories
const SUPPORTED_EXTENSIONS: Record<
  string,
  { mime: string; category: "image" | "video" | "audio" | "document" }
> = {
  // Images
  jpg: { mime: "image/jpeg", category: "image" },
  jpeg: { mime: "image/jpeg", category: "image" },
  png: { mime: "image/png", category: "image" },
  webp: { mime: "image/webp", category: "image" },
  avif: { mime: "image/avif", category: "image" },
  gif: { mime: "image/gif", category: "image" },
  // Videos
  mp4: { mime: "video/mp4", category: "video" },
  mov: { mime: "video/quicktime", category: "video" },
  webm: { mime: "video/webm", category: "video" },
  m4v: { mime: "video/mp4", category: "video" },
  // Audio
  mp3: { mime: "audio/mpeg", category: "audio" },
  wav: { mime: "audio/wav", category: "audio" },
  m4a: { mime: "audio/mp4", category: "audio" },
  // Documents (brochures)
  pdf: { mime: "application/pdf", category: "document" },
};

// Transparent / Placeholder fallback SVG if S3 file cannot be fetched
const FALLBACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="600" viewBox="0 0 1200 600" fill="none">
  <rect width="1200" height="600" fill="#1e293b"/>
  <path d="M540 340L580 290L630 350L660 310L720 380H480L540 340Z" fill="#334155"/>
  <circle cx="530" cy="270" r="25" fill="#f59e0b" fill-opacity="0.3"/>
  <text x="600" y="430" text-anchor="middle" fill="#94a3b8" font-family="system-ui" font-size="20" font-weight="bold">ROADFACING Media</text>
</svg>`;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const pathArray = resolvedParams?.path;

    if (!pathArray || !Array.isArray(pathArray) || pathArray.length === 0) {
      return new NextResponse("Not Found", {
        status: 404,
        headers: { "Cache-Control": "no-store" },
      });
    }

    // In Next.js App Router, catch-all route segments are already URL-decoded by the router.
    // Avoid double-decoding (which can break valid filenames containing '%' or bypass sanitization).
    const validSegments: string[] = [];
    for (const rawSeg of pathArray) {
      if (typeof rawSeg !== "string" || !rawSeg.trim()) {
        return new NextResponse("Not Found", {
          status: 404,
          headers: { "Cache-Control": "no-store" },
        });
      }

      // Reject path traversal, separators, null bytes, control characters, and double-encoding patterns
      if (
        rawSeg === "." ||
        rawSeg === ".." ||
        rawSeg.includes("..") ||
        rawSeg.includes("/") ||
        rawSeg.includes("\\") ||
        rawSeg.includes("\0") ||
        /%2[fFeE]/i.test(rawSeg) || // Encoded / or .
        /%5[cC]/i.test(rawSeg) ||   // Encoded \
        /[\x00-\x1f\x7f]/.test(rawSeg)
      ) {
        return new NextResponse("Not Found", {
          status: 404,
          headers: { "Cache-Control": "no-store" },
        });
      }

      validSegments.push(rawSeg.trim());
    }

    const key = validSegments.join("/");

    // Verify key starts with one of the approved public S3 prefixes and has content after it
    const isAllowedPrefix = ALLOWED_PREFIXES.some(
      (prefix) => key.startsWith(prefix) && key.length > prefix.length
    );
    if (!isAllowedPrefix) {
      return new NextResponse("Not Found", {
        status: 404,
        headers: { "Cache-Control": "no-store" },
      });
    }

    // Validate supported file extension
    const ext = (key.split(".").pop() || "").toLowerCase();
    const mediaConfig = SUPPORTED_EXTENSIONS[ext];
    if (!mediaConfig) {
      // Reject unsupported extensions safely before touching S3
      return new NextResponse("Not Found", {
        status: 404,
        headers: { "Cache-Control": "no-store" },
      });
    }

    const rangeHeader = request.headers.get("range");

    try {
      const command = new GetObjectCommand({
        Bucket: getBucketName(),
        Key: key,
        ...(rangeHeader ? { Range: rangeHeader } : {}),
      });

      const response = await getClient().send(command, {
        abortSignal: request.signal,
      });

      if (response.Body) {
        // Resolve and validate Content-Type against supported extensions
        let contentType = response.ContentType;
        if (!contentType || contentType === "application/octet-stream") {
          contentType = mediaConfig.mime;
        } else {
          // Normalize and verify S3 Content-Type is consistent with the extension category
          const cleanType = contentType.split(";")[0].trim().toLowerCase();
          const categoryMatches =
            (mediaConfig.category === "image" && cleanType.startsWith("image/")) ||
            (mediaConfig.category === "video" && cleanType.startsWith("video/")) ||
            (mediaConfig.category === "audio" && cleanType.startsWith("audio/")) ||
            (mediaConfig.category === "document" && cleanType === "application/pdf");

          contentType = categoryMatches ? cleanType : mediaConfig.mime;
        }

        const isImage = mediaConfig.category === "image";

        // Determine if S3 honored the range request with a valid Content-Range
        const isPartial = Boolean(rangeHeader && response.ContentRange);
        const status = isPartial ? 206 : 200;

        // Cache policy assignment:
        // - Public immutable images: 1-year immutable cache (only for full 200 responses)
        // - Range requests (206): 1-day cache to avoid immutably caching byte slices
        // - Videos, audio, and PDF brochures: 1-day cache
        let cacheControl: string;
        if (isPartial) {
          cacheControl = "public, max-age=86400";
        } else if (isImage) {
          cacheControl = "public, max-age=31536000, immutable";
        } else {
          cacheControl = "public, max-age=86400";
        }

        const responseBody = response.Body as {
          transformToByteArray?: () => Promise<Uint8Array>;
          transformToWebStream?: () => ReadableStream;
        } | null;

        // For static full images, read bytes into buffer for atomic delivery with Content-Length.
        // This avoids chunked transfer encoding and prevents early stream dropouts during fast scroll.
        if (isImage && !rangeHeader && responseBody?.transformToByteArray) {
          const bytes = await responseBody.transformToByteArray();
          return new NextResponse(Buffer.from(bytes), {
            status: 200,
            headers: {
              "Content-Type": contentType,
              "Content-Length": String(bytes.length),
              "Accept-Ranges": "bytes",
              "Cache-Control": cacheControl,
              ...(response.ETag ? { ETag: response.ETag } : {}),
            },
          });
        }

        // Convert S3 body stream to web ReadableStream for videos, audio, PDFs, and range requests
        let stream: ReadableStream;
        if (responseBody && typeof responseBody.transformToWebStream === "function") {
          stream = responseBody.transformToWebStream();
        } else if (responseBody instanceof Readable) {
          stream = Readable.toWeb(responseBody) as unknown as ReadableStream;
        } else if (responseBody?.transformToByteArray) {
          const bytes = await responseBody.transformToByteArray();
          return new NextResponse(Buffer.from(bytes), {
            status,
            headers: {
              "Content-Type": contentType,
              "Content-Length": String(bytes.length),
              "Accept-Ranges": "bytes",
              ...(isPartial && response.ContentRange ? { "Content-Range": response.ContentRange } : {}),
              "Cache-Control": cacheControl,
              ...(response.ETag ? { ETag: response.ETag } : {}),
            },
          });
        } else {
          return new NextResponse("Unable to process media stream", {
            status: 500,
            headers: { "Cache-Control": "no-store" },
          });
        }

        const filename = key.split("/").pop() || "document.pdf";

        return new NextResponse(stream, {
          status,
          headers: {
            "Content-Type": contentType,
            "Accept-Ranges": "bytes",
            "Content-Disposition": mediaConfig.category === "document" ? `inline; filename="${encodeURIComponent(filename)}"` : "inline",
            ...(response.ContentLength ? { "Content-Length": String(response.ContentLength) } : {}),
            ...(isPartial && response.ContentRange ? { "Content-Range": response.ContentRange } : {}),
            "Cache-Control": cacheControl,
            ...(response.ETag ? { ETag: response.ETag } : {}),
          },
        });
      }
    } catch (s3Error: unknown) {
      const err = s3Error as { name?: string; message?: string; $metadata?: { httpStatusCode?: number } } | null;

      // Handle HTTP 416 Range Not Satisfiable
      if (err?.name === "InvalidRange" || err?.$metadata?.httpStatusCode === 416) {
        return new NextResponse("Requested Range Not Satisfiable", {
          status: 416,
          headers: {
            "Cache-Control": "no-store",
            "Accept-Ranges": "bytes",
          },
        });
      }

      // Handle client abort / disconnect
      if (err?.name === "AbortError" || request.signal.aborted) {
        return new NextResponse(null, {
          status: 499,
          headers: { "Cache-Control": "no-store" },
        });
      }

      console.warn("[Media Proxy Warning]:", err?.message || s3Error);
    }

    // For non-images (videos, audio, PDFs), return 404 with no-store if not found
    if (mediaConfig.category !== "image") {
      return new NextResponse("Media file not found", {
        status: 404,
        headers: { "Cache-Control": "no-store" },
      });
    }

    // If S3 image fetch fails, serve placeholder SVG with no-cache headers
    return new NextResponse(FALLBACK_SVG, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error: unknown) {
    console.error("[Media Proxy Fallback Error]:", error);
    return new NextResponse(FALLBACK_SVG, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "no-store",
      },
    });
  }
}
