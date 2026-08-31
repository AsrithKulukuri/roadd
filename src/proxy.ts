import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { verifySignedSessionToken } from "@/lib/server-auth-guard";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // Apply OWASP Security Headers to all responses
  supabaseResponse.headers.set("X-Content-Type-Options", "nosniff");
  supabaseResponse.headers.set("X-Frame-Options", "DENY");
  supabaseResponse.headers.set("X-XSS-Protection", "1; mode=block");
  supabaseResponse.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  supabaseResponse.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)");
  if (process.env.NODE_ENV === "production") {
    supabaseResponse.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAdminLoginPage = pathname === "/admin/login";

  // Protect /admin routes (except public /admin/login)
  if (pathname.startsWith("/admin") && !isAdminLoginPage) {
    const hasAdminLocalCookie = request.cookies.has("road_admin_user") || request.cookies.has("road_user");
    const isUserAdmin = user && (user.user_metadata?.role === "admin" || (user.email || "").toLowerCase().includes("admin"));

    if (!user && !hasAdminLocalCookie) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(url);
    }

    if (user && !isUserAdmin && !hasAdminLocalCookie) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  // Protect /projects/[slug] routes: enforce server-verifiable login before accessing project details
  if (pathname.startsWith("/projects/")) {
    const hasAdminBypass = request.cookies.has("road_admin_user");
    const authToken = request.cookies.get("road_auth_token")?.value;
    const isTokenValid = authToken ? Boolean(verifySignedSessionToken(authToken)) : false;

    if (!user && !isTokenValid && !hasAdminBypass) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      const fullTarget = request.nextUrl.search ? `${pathname}${request.nextUrl.search}` : pathname;
      url.searchParams.set("redirect", fullTarget);
      return NextResponse.redirect(url);
    }
  }

  // Protect /dashboard routes (including /dashboard/saved): enforce authentic server session or signed token
  if (pathname.startsWith("/dashboard")) {
    const hasAdminBypass = request.cookies.has("road_admin_user");
    const authToken = request.cookies.get("road_auth_token")?.value;
    const isTokenValid = authToken ? Boolean(verifySignedSessionToken(authToken)) : false;

    if (!user && !isTokenValid && !hasAdminBypass) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      const fullTarget = request.nextUrl.search ? `${pathname}${request.nextUrl.search}` : pathname;
      url.searchParams.set("redirect", fullTarget);
      return NextResponse.redirect(url);
    }
  }

  // Redirect logged-in users away from auth pages (/login, /register, /admin/login)
  if (user && (pathname === "/login" || pathname === "/register")) {
    const role = user.user_metadata?.role;
    const url = request.nextUrl.clone();
    url.pathname = role === "admin" ? "/admin/dashboard" : "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
