"use client";

import { useEffect, Suspense } from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { usePropertiesStore } from "@/stores/properties-store";
import { useProjectsStore } from "@/stores/projects-store";


import { MobileStickySearchHeader } from "@/components/layout/mobile-sticky-search-header";
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
  const isLaunchPage = pathname === "/";
  const showPublicChrome = !isAdmin && !isLaunchPage;
  const isDetailPage = 
    (pathname.startsWith("/properties/") && pathname !== "/properties" && pathname !== "/properties/map" && pathname !== "/properties/compare") ||
    (pathname.startsWith("/projects/") && pathname !== "/projects");

  const fetchProperties = usePropertiesStore((state) => state.fetchProperties);
  const fetchProjects   = useProjectsStore((state) => state.fetchProjects);

  useEffect(() => {
    if (isLaunchPage) return;

    fetchProperties();
    fetchProjects();
  }, [fetchProperties, fetchProjects, isLaunchPage]);

  return (
    <>
      {!isLaunchPage && (
        <Suspense fallback={null}>
          <SmartPageLoader />
        </Suspense>
      )}
      {showPublicChrome && (
        <>
          <Suspense fallback={<div className="h-[72px]" />}>
            <Navbar />
          </Suspense>
          <Suspense fallback={null}>
            <MobileStickySearchHeader />
          </Suspense>
        </>
      )}
      <main className={`flex-1 ${isLaunchPage || isDetailPage ? "pb-0" : "pb-16 sm:pb-0"}`}>{children}</main>
      {showPublicChrome && (
        <>
          <Footer />
          <Suspense fallback={null}>
            <AiAssistantWidget />
          </Suspense>
          <Suspense fallback={null}>
            <MobileBottomNav />
          </Suspense>
        </>
      )}
    </>
  );
}
