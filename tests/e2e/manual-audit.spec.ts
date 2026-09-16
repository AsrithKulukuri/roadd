import { test, expect } from "@playwright/test";
import { parseSearchIntent, evaluatePropertyFilters, matchesPropertySearch } from "@/lib/search-engine";
import { getSeededProperties } from "@/lib/seeded-dataset";
import type { Property } from "@/types/property";

test("manual 1.1 exact natural-language intent", () => {
  const intent = parseSearchIntent("3 BHK flats in Benz Circle under 1.5 Cr");
  expect(intent.bhks).toContain(3);
  expect(intent.propertyTypes).toContain("apartment");
  expect(intent.maxPrice).toBe(15000000);
  expect(intent.locationKeywords.join(" ")).toContain("benz circle");
});

test("manual 1.1 typo still matches Benz Circle", () => {
  const base = getSeededProperties()[0];
  const property = { ...base, title: "Two bedroom apartment", bedrooms: 2, propertyType: "apartment" as const, location: { ...base.location, locality: "Benz Circle" } };
  expect(matchesPropertySearch(property, "bens circle 2bhk")).toBe(true);
});

test("manual 2.8 unknown facing must not match East", () => {
  // Deliberately exercise incomplete legacy/API records at the runtime boundary.
  const property = { ...getSeededProperties()[0], facing: undefined } as unknown as Property;
  expect(evaluatePropertyFilters(property, { facing: ["East"] })).toBe(false);
});

test("manual 2.9 unknown furnishing must not match furnished", () => {
  const property = { ...getSeededProperties()[0], furnishing: undefined } as unknown as Property;
  expect(evaluatePropertyFilters(property, { furnished: ["furnished"] })).toBe(false);
});

test("manual 2.8 South-East must not match exact East", () => {
  const property: Property = { ...getSeededProperties()[0], facing: "south-east" };
  expect(evaluatePropertyFilters(property, { facing: ["East", "North-East"] })).toBe(false);
});

test("manual 2.2 five equal mobile category buttons", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/search");
  await page.getByRole("button", { name: "All Filters", exact: true }).first().click();
  for (const name of ["Flat / Apartment", "House / Villa", "CRDA Ventures", "Plot / Land", "Commercial"]) {
    const button = page.getByRole("button", { name, exact: true }).filter({ visible: true }).first();
    await expect(button).toBeVisible();
    const box = await button.boundingBox();
    expect(box?.width).toBe(112);
    expect(box?.height).toBe(86);
  }
});

test("manual 1.2 denied GPS gives feedback and keeps map usable", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, "geolocation", { value: { getCurrentPosition: (_success: unknown, failure: (error: unknown) => void) => failure({ code: 1, message: "Permission denied" }), watchPosition: () => 0, clearWatch: () => {} } }));
  await page.goto("/search?nearMe=true");
  await expect(page.getByText("Location access denied or unavailable. Showing all properties.").first()).toBeVisible();
  await expect(page.locator(".leaflet-container").first()).toBeVisible();
});

test("manual 3.1 street tile source is Esri without key watermark provider", async ({ page }) => {
  await page.goto("/search?view=map");
  await expect(page.locator(".leaflet-container").first()).toBeVisible();
  await expect.poll(async () => page.locator("img.leaflet-tile").count()).toBeGreaterThan(0);
  const urls = await page.locator("img.leaflet-tile").evaluateAll(images => images.map(image => (image as HTMLImageElement).src));
  expect(urls.some(url => url.includes("World_Street_Map"))).toBe(true);
  expect(urls.some(url => url.includes("cartocdn"))).toBe(false);
});
