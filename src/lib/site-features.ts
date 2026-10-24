import { supabaseAdmin } from "@/lib/supabase-admin";
import { fetchWithCache } from "@/lib/redis";

export async function readSiteFeatures() {
  return await fetchWithCache(
    "site:features",
    async () => {
      const { data, error } = await supabaseAdmin.from("homepage_layouts")
        .select("sections").eq("id", "site_features").maybeSingle();
      if (error) throw new Error("Site settings could not be loaded.");
      return { propertiesEnabled: data?.sections?.propertiesEnabled !== false };
    },
    { ttlSeconds: 120, tag: "site_features", enableJitter: true }
  );
}

