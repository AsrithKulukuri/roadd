import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getClient, getBucketName } from "@/lib/aws/s3";

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

    const command = new GetObjectCommand({
      Bucket: getBucketName(),
      Key: key,
    });

    const response = await getClient().send(command);

    if (!response.Body) {
      return new NextResponse("Media Empty", { status: 404 });
    }

    // Convert S3 body reliably to byte array buffer
    const byteArray = await response.Body.transformToByteArray();
    const buffer = Buffer.from(byteArray);

    const ext = (key.split(".").pop() || "").toLowerCase();
    let contentType = response.ContentType;
    if (!contentType || contentType === "application/octet-stream") {
      if (["jpg", "jpeg"].includes(ext)) contentType = "image/jpeg";
      else if (ext === "png") contentType = "image/png";
      else if (ext === "webp") contentType = "image/webp";
      else if (ext === "pdf") contentType = "application/pdf";
      else if (ext === "mp4") contentType = "video/mp4";
      else contentType = "image/jpeg";
    }

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(buffer.length),
        "Cache-Control": "public, max-age=31536000, immutable",
        ...(response.ETag ? { ETag: response.ETag } : {}),
      },
    });
  } catch (error: any) {
    console.error("[Media Proxy Error]:", error?.message || error);
    if (error?.name === "NoSuchKey" || error?.$metadata?.httpStatusCode === 404) {
      return new NextResponse("Media Not Found", { status: 404 });
    }
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
