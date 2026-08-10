import { NextResponse } from "next/server";
import { DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { s3Client, BUCKET_NAME } from "@/lib/aws/s3";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { keys } = body;

    if (!keys || !Array.isArray(keys) || keys.length === 0) {
      return NextResponse.json({ error: "Missing or invalid keys array" }, { status: 400 });
    }

    const command = new DeleteObjectsCommand({
      Bucket: BUCKET_NAME,
      Delete: {
        Objects: keys.map((key: string) => ({ Key: key })),
        Quiet: false,
      },
    });

    const response = await s3Client.send(command);

    return NextResponse.json({ 
      success: true, 
      deleted: response.Deleted?.map((d) => d.Key) || [] 
    });
  } catch (error: any) {
    console.error("Error deleting objects from S3:", error);
    return NextResponse.json({ error: "Failed to delete objects" }, { status: 500 });
  }
}
