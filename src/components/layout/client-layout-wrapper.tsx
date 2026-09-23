"use client";

import { useSiteFeatures } from "@/components/providers/site-features-provider";
import { useEffect, Suspense } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
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

function ConditionalFooter() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isMapView =
    (pathname === "/search" && searchParams.get("view") === "map") ||
    (pathname === "/properties" && searchParams.get("view") === "map") ||
    pathname === "/properties/map";

  if (isMapView) return null;
  return <Footer />;
}

export function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { propertiesEnabled, ready, error, refresh } = useSiteFeatures();
  const router = useRouter();
  const hiddenPropertyRoute = !propertiesEnabled && /^\/(properties|property|list-with-us|dashboard\/listings)(\/|$)/.test(pathname);
  useEffect(() => {
    if (ready && hiddenPropertyRoute) router.replace("/search?type=projects");
  }, [ready, hiddenPropertyRoute, router]);
  const isStandalonePortal = pathname.startsWith("/admin") || pathname.startsWith("/builder");
  const hasNestedMain =
    isStandalonePortal ||
    pathname.startsWith("/dashboard") ||
    pathname === "/search" ||
    pathname === "/properties";
  const ContentElement = hasNestedMain ? "div" : "main";
  const isDetailPage = 
    (pathname.startsWith("/properties/") && pathname !== "/properties" && pathname !== "/properties/map") ||
    (pathname.startsWith("/projects/") && pathname !== "/projects");

  const fetchProperties = usePropertiesStore((state) => state.fetchProperties);
  const fetchProjects   = useProjectsStore((state) => state.fetchProjects);

  useEffect(() => {
    if (!ready) return;
    if (propertiesEnabled || isStandalonePortal) fetchProperties();
    fetchProjects();
  }, [fetchProperties, fetchProjects, ready, propertiesEnabled, isStandalonePortal]);

  if (!isStandalonePortal && !ready) return <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4" aria-live="polite"><p>{error || "Loading your experience…"}</p>{error && <button className="cursor-pointer underline" onClick={() => void refresh()}>Retry</button>}</main>;

  return (
    <>
      <Suspense fallback={null}>
        <SmartPageLoader />
      </Suspense>
      {!isStandalonePortal && (
        <>
          <Suspense fallback={<div className="h-[72px]" />}>
            <Navbar />
          </Suspense>
          <Suspense fallback={null}>
            <MobileStickySearchHeader />
          </Suspense>
        </>
      )}
      <ContentElement className={`flex-1 ${isDetailPage ? "pb-0" : "pb-16 sm:pb-0"}`}>{hiddenPropertyRoute ? null : children}</ContentElement>
      {!isStandalonePortal && (
        <>
          <Suspense fallback={null}>
            <ConditionalFooter />
          </Suspense>
          <Suspense fallback={null}>
            {propertiesEnabled && <AiAssistantWidget />}
          </Suspense>
          <Suspense fallback={null}>
            <MobileBottomNav />
          </Suspense>
        </>
      )}
    </>
  );
}
