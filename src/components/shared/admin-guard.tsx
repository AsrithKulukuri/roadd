"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { verifyAdminSession } from "@/lib/admin-auth";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Perform light verification without triggering continuous page reloads
    verifyAdminSession();
  }, [pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white space-y-4">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
