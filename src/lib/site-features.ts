import { supabaseAdmin } from "@/lib/supabase-admin";

export async function readSiteFeatures() {
  const { data, error } = await supabaseAdmin.from("homepage_layouts")
    .select("sections").eq("id", "site_features").maybeSingle();
  if (error) throw new Error("Site settings could not be loaded.");
  return { propertiesEnabled: data?.sections?.propertiesEnabled !== false };
}
