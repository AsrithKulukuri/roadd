import { NextResponse } from "next/server";
export function GET() { return NextResponse.json({ success: false, error: "Use the listing contact buttons to explicitly share your details." }, { status: 410 }); }
export const POST = GET;
