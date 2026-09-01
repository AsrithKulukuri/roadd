"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/admin/login";
  const [isLoading, setIsLoading] = useState(!isLoginPage);
  const [isAuthorized, setIsAuthorized] = useState(isLoginPage);

  useEffect(() => {
    if (isLoginPage) return;
    const controller = new AbortController();

    fetch("/api/auth/session", { cache: "no-store", signal: controller.signal })
      .then(async (response) => ({ response, data: await response.json() }))
      .then(({ response, data }) => {
        if (!response.ok || data.user?.role !== "admin") {
          router.replace(`/admin/login?redirectTo=${encodeURIComponent(pathname)}`);
          return;
        }
        setIsAuthorized(true);
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") return;
        router.replace(`/admin/login?redirectTo=${encodeURIComponent(pathname)}`);
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [isLoginPage, pathname, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white space-y-4">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return isAuthorized ? <>{children}</> : null;
}
