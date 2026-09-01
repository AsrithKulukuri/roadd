import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true });
  for (const cookieName of ["road_auth_token", "road_user", "road_admin_user"]) {
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
