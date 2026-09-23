import { test, expect } from "@playwright/test";
import { isPropertyOnlyHref, projectSearchFilters } from "@/lib/property-visibility";
import { initialFilterState } from "@/components/search/search-filters";

test("property-only links are hidden without removing shared project controls", () => {
  for (const href of ["/properties", "/property/example", "/list-with-us", "/dashboard/listings/new", "/search?type=rent", "/search?saleType=resale", "https://www.roadfacing.com/properties/example"]) expect(isPropertyOnlyHref(href), href).toBe(true);
  for (const href of ["/", "/search?type=projects", "/search?view=map", "/search?city=Guntur", "/dashboard/saved", "/contact", "/projects/example"]) expect(isPropertyOnlyHref(href), href).toBe(false);
});

test("hidden filters cannot exclude projects and the original filter state is preserved", () => {
  const original = { ...initialFilterState, transactionType: "rent" as const, listingType: ["rent"], saleType: ["resale"], postedBy: ["owner"], propertyType: ["villa", "farmhouse"], cities: ["Guntur"], budget: [1000000, 9000000] as [number, number] };
  const active = projectSearchFilters(original);
  expect(active.transactionType).toBe("all");
  expect(active.listingType).toEqual([]);
  expect(active.saleType).toEqual([]);
  expect(active.postedBy).toEqual([]);
  expect(active.propertyType).toEqual(["villa"]);
  expect(active.cities).toEqual(["Guntur"]);
  expect(active.budget).toEqual(original.budget);
  expect(original.saleType).toEqual(["resale"]);
  expect(original.listingType).toEqual(["rent"]);
});
