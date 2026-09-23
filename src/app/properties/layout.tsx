import { redirect } from "next/navigation";
import { readSiteFeatures } from "@/lib/site-features";

export default async function PropertyFeatureLayout({ children }: { children: React.ReactNode }) {
  if (!(await readSiteFeatures()).propertiesEnabled) redirect("/search?type=projects");
  return children;
}
