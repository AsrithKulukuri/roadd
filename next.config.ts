import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  devIndicators: false,
  allowedDevOrigins: [
    "interpretive-imaginatively-melida.ngrok-free.dev",
    "lazy-shrimps-prove.loca.lt",
    "tricky-toys-fly.loca.lt"
  ],
  ...(process.env.DOCKER_BUILD === "true" ? { output: "standalone" } : {}),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "plus.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
        pathname: "/**",
      },
      {
        // Supabase Storage (all projects)
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        // Amazon S3
        protocol: "https",
        hostname: "*.amazonaws.com",
        pathname: "/**",
      },
      {
        // Google OAuth profile pictures
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
    ],
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
      "@radix-ui/react-tooltip",
    ],
  },
};

export default nextConfig;
