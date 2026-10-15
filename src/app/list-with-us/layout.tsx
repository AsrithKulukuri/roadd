import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { readSiteFeatures } from "@/lib/site-features";

export const metadata: Metadata = {
  title: "List Your Properties & Projects | Builder & Owner Partner Desk",
  description:
    "Showcase your real estate projects and properties on RoadFacing with on-ground video tours, dedicated developer dashboards, and direct verified leads.",
  openGraph: {
    title: "List Your Properties & Projects | RoadFacing",
    description:
      "Partner with RoadFacing to gain maximum buyer reach across Vijayawada, Guntur & Amaravati with on-ground video updates.",
  },
};

export default async function PropertyFeatureLayout({ children }: { children: React.ReactNode }) {
  if (!(await readSiteFeatures()).propertiesEnabled) redirect("/search?type=projects");
  return children;
}
