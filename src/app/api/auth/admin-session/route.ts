import { NextResponse } from "next/server";
import { requireAdmin, signSessionPayload } from "@/lib/server-auth-guard";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { errorResponse, user } = await requireAdmin(request);
  if (errorResponse) return errorResponse;
  if (!user) return NextResponse.json({ success: false, error: "Admin authentication required." }, { status: 401 });

  const token = signSessionPayload({
    id: user.id,
    phone: user.phone || "",
    name: user.name,
    email: user.email,
    role: "admin",
  });

  const response = NextResponse.json({
    success: true,
    user: { id: user.id, phone: user.phone, name: user.name, email: user.email, role: "admin" },
  });
  response.cookies.set("road_auth_token", token, {
    path: "/",
    maxAge: 24 * 60 * 60,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
  response.cookies.set("road_user", "true", {
    path: "/",
    maxAge: 24 * 60 * 60,
    sameSite: "lax",
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
