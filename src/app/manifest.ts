import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Road Facing — Real Projects. Real People. Real Updates",
    short_name: "Road Facing",
    description:
      "Verified properties, luxury apartments, gated villas, and CRDA approved plots across Vijayawada, Guntur & Amaravati.",
    start_url: "/",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#faad13",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icon.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
  };
}
