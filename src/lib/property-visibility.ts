/** Links exclusive to individual listings; shared project search stays available. */
export function isPropertyOnlyHref(href: string) {
  let url: URL;
  try { url = new URL(href, "https://www.roadfacing.com"); } catch { return false; }
  const path = url.pathname;
  if (/^\/(properties|property|list-with-us)(\/|$)/.test(path) || /^\/dashboard\/(listings|leads)(\/|$)/.test(path)) return true;
  const params = url.searchParams;
  return path === "/search" && (["buy", "sale", "rent", "pg", "properties"].includes(params.get("type") || "") || params.has("saleType"));
}
import type { FilterState } from "@/components/search/search-filters";

/** Ignore hidden filters from old URLs or a search already open when the switch changes. */
export function projectSearchFilters(filters: FilterState): FilterState {
  return {
    ...filters,
    transactionType: "all", listingType: [], saleType: [], postedBy: [],
    subPropertyType: [], bathrooms: [], balconies: [], propertyAge: [],
    furnished: [], furnishingItems: [], verifiedBadges: [],
    waterSource: [], cultivationCrop: [], certifiedAgentsOnly: false,
    propertyType: filters.propertyType.filter(type => ["apartment", "villa", "venture", "crda-ventures", "gated-community"].includes(type)),
  };
}
