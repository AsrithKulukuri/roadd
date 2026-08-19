import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/dashboard/saved", "/api/"],
      },
      {
        userAgent: "Googlebot-Image",
        allow: ["/api/og", "/images/"],
      },
    ],
    sitemap: "https://www.roadfacing.com/sitemap.xml",
  };
}
