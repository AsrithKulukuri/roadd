import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Properties for Sale & Rent in Vijayawada, Guntur & Amaravati | RoadFacing",
  description:
    "Browse verified apartments, independent houses, commercial spaces, and CRDA approved plots in Vijayawada, Guntur, and Amaravati with real on-ground video tours.",
  openGraph: {
    title: "Properties for Sale & Rent | RoadFacing",
    description:
      "Browse verified apartments, independent houses, and CRDA plots in Vijayawada, Guntur, and Amaravati with real on-ground video tours.",
    url: "https://www.roadfacing.com/properties",
    type: "website",
  },
};

export default function PropertiesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
