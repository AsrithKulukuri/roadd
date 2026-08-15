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
    const key = pathArray.join("/");

    if (!key) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const command = new GetObjectCommand({
      Bucket: getBucketName(),
      Key: key,
    });

    const response = await getClient().send(command);

    if (!response.Body) {
      return new NextResponse("Object Body Empty", { status: 404 });
    }

    const contentType = response.ContentType || "application/octet-stream";
    const cacheControl = "public, max-age=31536000, immutable";

    // Convert AWS SDK stream to Web ReadableStream
    const stream = response.Body.transformToWebStream();

    return new NextResponse(stream, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": cacheControl,
        ...(response.ContentLength ? { "Content-Length": String(response.ContentLength) } : {}),
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
