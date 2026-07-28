import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New Projects — Apartments, Villas & Ventures | ROAD FACING",
  description:
    "Explore builder projects across Andhra Pradesh — RERA-approved apartments, luxury villas, and gated ventures. Compare floor plans, pricing, and amenities from top builders.",
  keywords: [
    "new projects in Andhra Pradesh",
    "apartments for sale",
    "villas for sale",
    "gated ventures plots",
    "RERA approved projects",
    "builder projects Vijayawada",
    "builder projects Visakhapatnam",
    "under construction projects",
    "ready to move apartments",
  ],
  openGraph: {
    title: "New Builder Projects | ROAD FACING",
    description:
      "Discover RERA-approved apartments, villas & ventures from top builders in Andhra Pradesh.",
    url: "https://road.in/projects",
    type: "website",
  },
};

export default function ProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
