import { MetadataRoute } from "next";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { mockProperties } from "@/lib/mock-data";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://www.roadfacing.com";

  // Static core routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/projects`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/properties`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/mortgage-calculator`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];

  // City & Regional Hub Landing Pages
  const cityHubs = [
    "vijayawada",
    "guntur",
    "amaravati",
    "mangalagiri",
    "tadepalli",
    "benz-circle",
    "kanuru",
    "poranki",
    "gorantla",
  ];

  const cityRoutes: MetadataRoute.Sitemap = cityHubs.map((city) => ({
    url: `${baseUrl}/search?city=${city}`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.85,
  }));

  // Dynamic Properties from DB
  let propertyRoutes: MetadataRoute.Sitemap = [];
  try {
    if (isSupabaseConfigured()) {
      const { data: properties } = await supabase
        .from("properties")
        .select("slug, updatedAt")
        .eq("status", "active")
        .limit(1000);

      if (properties && properties.length > 0) {
        propertyRoutes = properties.map((p) => ({
          url: `${baseUrl}/properties/${p.slug}`,
          lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
          changeFrequency: "weekly",
          priority: 0.8,
        }));
      }
    }
  } catch (err) {
    console.error("Error generating sitemap properties:", err);
  }

  // Fallback to mock properties if DB is empty
  if (propertyRoutes.length === 0) {
    propertyRoutes = mockProperties.map((p) => ({
      url: `${baseUrl}/properties/${p.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    }));
  }

  // Dynamic Projects from DB
  let projectRoutes: MetadataRoute.Sitemap = [];
  try {
    if (isSupabaseConfigured()) {
      const { data: projects } = await supabase
        .from("projects")
        .select("slug, updatedAt")
        .eq("isPublished", true)
        .limit(500);

      if (projects && projects.length > 0) {
        projectRoutes = projects.map((p) => ({
          url: `${baseUrl}/projects/${p.slug}`,
          lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
          changeFrequency: "weekly",
          priority: 0.85,
        }));
      }
    }
  } catch (err) {
    console.error("Error generating sitemap projects:", err);
  }

  return [...staticRoutes, ...cityRoutes, ...propertyRoutes, ...projectRoutes];
}
