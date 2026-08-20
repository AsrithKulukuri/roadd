import { redirect } from "next/navigation";

export default async function LegacyPropertyRedirectPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { slug } = await params;
  const search = await searchParams;

  const queryString = new URLSearchParams();
  Object.entries(search).forEach(([key, value]) => {
    if (typeof value === "string") {
      queryString.set(key, value);
    }
  });

  const query = queryString.toString();
  redirect(`/properties/${slug}${query ? `?${query}` : ""}`);
}
