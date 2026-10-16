import { NextResponse } from "next/server";
import { deleteS3Objects } from "@/lib/aws/s3";
import { requireAdmin } from "@/lib/server-auth-guard";

export async function POST(request: Request) {
  try {
    // 1. Strict Server Admin Guard
    const { errorResponse } = await requireAdmin(request);
    if (errorResponse) {
      return errorResponse;
    }

    const body = await request.json();
    const { keys } = body;

    if (!keys || !Array.isArray(keys) || keys.length === 0) {
      return NextResponse.json(
        { error: "Missing or invalid keys array" },
        { status: 400 }
      );
    }

    const success = await deleteS3Objects(keys);

    return NextResponse.json({
      success,
      deleted: keys,
    });
  } catch (error: any) {
    console.error("[S3 Delete API Error]:", error);
    return NextResponse.json(
      { error: "Failed to delete objects from S3 storage" },
      { status: 500 }
    );
  }
}

