import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getClient, getBucketName } from "@/lib/aws/s3";
import { Readable } from "stream";

// Transparent / Placeholder fallback SVG if S3 file cannot be fetched
const FALLBACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="600" viewBox="0 0 1200 600" fill="none">
  <rect width="1200" height="600" fill="#1e293b"/>
  <path d="M540 340L580 290L630 350L660 310L720 380H480L540 340Z" fill="#334155"/>
  <circle cx="530" cy="270" r="25" fill="#f59e0b" fill-opacity="0.3"/>
  <text x="600" y="430" text-anchor="middle" fill="#94a3b8" font-family="system-ui" font-size="20" font-weight="bold">ROAD FACING Media</text>
</svg>`;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const pathArray = resolvedParams?.path || [];
    const key = pathArray.map((seg) => decodeURIComponent(seg)).join("/");

    if (!key) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const rangeHeader = request.headers.get("range");

    try {
      const command = new GetObjectCommand({
        Bucket: getBucketName(),
        Key: key,
        ...(rangeHeader ? { Range: rangeHeader } : {}),
      });

      const response = await getClient().send(command);

      if (response.Body) {
        const ext = (key.split(".").pop() || "").toLowerCase();
        let contentType = response.ContentType;
        if (!contentType || contentType === "application/octet-stream") {
          if (["jpg", "jpeg"].includes(ext)) contentType = "image/jpeg";
          else if (ext === "png") contentType = "image/png";
          else if (ext === "webp") contentType = "image/webp";
          else if (ext === "pdf") contentType = "application/pdf";
          else if (["mp4", "mov"].includes(ext)) contentType = "video/mp4";
          else if (ext === "webm") contentType = "video/webm";
          else contentType = "image/jpeg";
        }

        const isVideoOrAudio = contentType.startsWith("video/") || contentType.startsWith("audio/") || ext === "pdf";

        // If it's a streaming response (like video with Range request or web stream)
        const responseBody = response.Body as any;

        // Convert S3 body stream to web ReadableStream
        let stream: ReadableStream;
        if (typeof responseBody.transformToWebStream === "function") {
          stream = responseBody.transformToWebStream();
        } else if (responseBody instanceof Readable) {
          stream = Readable.toWeb(responseBody) as unknown as ReadableStream;
        } else {
          const bytes = await responseBody.transformToByteArray();
          return new NextResponse(Buffer.from(bytes), {
            status: rangeHeader && response.ContentRange ? 206 : 200,
            headers: {
              "Content-Type": contentType,
              "Content-Length": String(bytes.length),
              "Accept-Ranges": "bytes",
              ...(response.ContentRange ? { "Content-Range": response.ContentRange } : {}),
              "Cache-Control": "public, max-age=31536000, immutable",
            },
          });
        }

        const status = rangeHeader && response.ContentRange ? 206 : 200;
        const filename = key.split('/').pop() || 'document.pdf';

        return new NextResponse(stream, {
          status,
          headers: {
            "Content-Type": contentType,
            "Accept-Ranges": "bytes",
            "Content-Disposition": ext === "pdf" ? `inline; filename="${encodeURIComponent(filename)}"` : "inline",
            ...(response.ContentLength ? { "Content-Length": String(response.ContentLength) } : {}),
            ...(response.ContentRange ? { "Content-Range": response.ContentRange } : {}),
            "Cache-Control": isVideoOrAudio ? "public, max-age=86400" : "public, max-age=31536000, immutable",
            ...(response.ETag ? { ETag: response.ETag } : {}),
          },
        });
      }
    } catch (s3Error: any) {
      console.warn("[Media Proxy Warning]:", s3Error?.message || s3Error);
    }

    // If S3 fetch fails, serve placeholder
    return new NextResponse(FALLBACK_SVG, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error: any) {
    console.error("[Media Proxy Fallback Error]:", error);
    return new NextResponse(FALLBACK_SVG, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml",
      },
    });
  }
}
