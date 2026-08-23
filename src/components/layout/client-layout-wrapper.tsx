"use client";

import { useEffect, Suspense } from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { usePropertiesStore } from "@/stores/properties-store";
import { useProjectsStore } from "@/stores/projects-store";


import dynamic from "next/dynamic";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { SmartPageLoader } from "@/components/shared/smart-page-loader";

const AiAssistantWidget = dynamic(
  () => import("@/components/shared/ai-assistant-widget").then((m) => ({ default: m.AiAssistantWidget })),
  { ssr: false }
);

export function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");
  const isDetailPage = 
    (pathname.startsWith("/properties/") && pathname !== "/properties" && pathname !== "/properties/map" && pathname !== "/properties/compare") ||
    (pathname.startsWith("/projects/") && pathname !== "/projects");

  const fetchProperties = usePropertiesStore((state) => state.fetchProperties);
  const fetchProjects   = useProjectsStore((state) => state.fetchProjects);

  useEffect(() => {
    fetchProperties();
    fetchProjects();
  }, [fetchProperties, fetchProjects]);

  return (
    <>
      <SmartPageLoader />
      {!isAdmin && (
        <Suspense fallback={<div className="h-[72px]" />}>
          <Navbar />
        </Suspense>
      )}
      <main className={`flex-1 ${isDetailPage ? "pb-0" : "pb-16 sm:pb-0"}`}>{children}</main>
      {!isAdmin && (
        <>
          <Footer />
          <AiAssistantWidget />
          <Suspense fallback={null}>
            <MobileBottomNav />
          </Suspense>
        </>
      )}
    </>
  );
}
