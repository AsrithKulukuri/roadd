export function searchNavigationCategory(params: Pick<URLSearchParams, "get">): string | null {
  const types = (params.get("propertyType") || params.get("projectType") || "").split(",");
  if (types.some(type => ["venture", "crda", "crda-venture", "crda-ventures"].includes(type)) || params.get("category") === "crda-ventures") return "crda";
  if (types.includes("gated-community") || params.get("gatedCommunity") === "true") return "gated";
  if (types.includes("commercial")) return "commercial";
  return params.get("type") === "projects" ? "projects" : null;
}
