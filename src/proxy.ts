import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

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

  // Debug logging for middleware evaluation
  console.log("[PROXY DEBUG]", {
    path: pathname,
    userEmail: user?.email || "unauthenticated",
    metaRole: user?.user_metadata?.role,
    cookies: request.cookies.getAll().map((c) => c.name),
  });

  const isAdminLoginPage = pathname === "/admin/login";

  // Protect /admin routes (except public /admin/login)
  if (pathname.startsWith("/admin") && !isAdminLoginPage) {
    const hasAdminLocalCookie = request.cookies.has("road_admin_user") || request.cookies.has("road_user");
    const isUserAdmin = user && (user.user_metadata?.role === "admin" || (user.email || "").toLowerCase().includes("admin"));

    if (!user && !hasAdminLocalCookie) {
      console.log("[PROXY DEBUG] Unauthenticated access to admin route -> Redirecting to /admin/login", { path: pathname });
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(url);
    }

    if (user && !isUserAdmin && !hasAdminLocalCookie) {
      console.log("[PROXY DEBUG] Non-admin user access attempt to admin route -> Redirecting to /dashboard", { path: pathname });
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    console.log("[PROXY DEBUG] Access granted to admin route:", pathname);
  }

  // Redirect logged-in users away from auth pages (/login, /register, /admin/login)
  if (user && (pathname === "/login" || pathname === "/register")) {
    const role = user.user_metadata?.role;
    const url = request.nextUrl.clone();
    url.pathname = role === "admin" ? "/admin/dashboard" : "/dashboard";
    console.log("[PROXY DEBUG] Redirecting authenticated user away from auth page to:", url.pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
