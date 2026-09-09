import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const response = NextResponse.json({ success: true });
  const providerCookies = (request.headers.get("cookie") || "").split(";").map(item => item.trim().split("=")[0]).filter(name => /^sb-.+-auth-token(?:\.\d+)?$/.test(name));
  for (const cookieName of ["road_auth_token", "road_user", "road_admin_user", "road_builder_id", ...providerCookies]) {
    response.cookies.set(cookieName, "", {
      path: "/",
      maxAge: 0,
      sameSite: "lax",
      httpOnly: cookieName === "road_auth_token",
      secure: process.env.NODE_ENV === "production",
    });
  }
  return response;
}
