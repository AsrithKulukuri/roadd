import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search Properties & Projects in Vijayawada, Guntur & Amaravati",
  description:
    "Explore verified residential apartments, luxury villas, commercial spaces, and CRDA approved plots with real on-ground video updates across AP Capital Region.",
  openGraph: {
    title: "Search Properties & Projects | Road Facing",
    description:
      "Explore verified residential apartments, luxury villas, and CRDA plots across Vijayawada, Guntur & Amaravati.",
  },
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
