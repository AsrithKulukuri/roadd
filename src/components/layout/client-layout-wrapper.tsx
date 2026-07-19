"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { usePropertiesStore } from "@/stores/properties-store";


export function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");
  const fetchProperties = usePropertiesStore((state) => state.fetchProperties);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  return (
    <>
      {!isAdmin && <Navbar />}
      <main className="flex-1">{children}</main>
      {!isAdmin && (
        <>
          <Footer />
        </>
      )}
    </>
  );
}
