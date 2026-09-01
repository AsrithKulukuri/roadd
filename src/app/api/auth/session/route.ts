import { NextResponse } from "next/server";
import { authenticateServerRequest, signSessionPayload } from "@/lib/server-auth-guard";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await authenticateServerRequest(request);
  if (!auth.authorized || !auth.user) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: auth.user.id,
      phone: auth.user.phone,
      name: auth.user.name,
      email: auth.user.email,
      role: auth.role,
    },
  });
}

export async function POST(request: Request) {
  const auth = await authenticateServerRequest(request);
  if (!auth.authorized || !auth.user) {
    return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
  }

  const user = {
    id: auth.user.id,
    phone: auth.user.phone,
    name: auth.user.name,
    email: auth.user.email,
    role: auth.role,
  };
  const token = signSessionPayload(user);
  const response = NextResponse.json({ success: true, user });
  response.cookies.set("road_auth_token", token, {
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
  response.cookies.set("road_user", "true", {
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
    sameSite: "lax",
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
