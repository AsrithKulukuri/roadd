export type CategoryDestination = "properties" | "projects";

export function categorySearchHref(destination: CategoryDestination, type: string) {
  const params = new URLSearchParams({ type: destination === "projects" ? "projects" : "buy" });
  if (destination === "properties" && ["resale", "new"].includes(type)) params.set("saleType", type);
  else params.set("propertyType", type);
  return `/search?${params}`;
}

export function categoryDestination(href?: string): CategoryDestination {
  if (!href) return "properties";
  try {
    const url = new URL(href, "https://www.roadfacing.com");
    return url.searchParams.get("type") === "projects" || /^\/projects(\/|$)/.test(url.pathname) ? "projects" : "properties";
  } catch { return "properties"; }
}
