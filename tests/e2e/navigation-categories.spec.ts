import { test, expect } from "@playwright/test";
import { getSeededProperties } from "@/lib/seeded-dataset";
import type { Project } from "@/types/project";

const base = getSeededProperties()[0];
const properties = [
  { ...base, id: "test-gated", slug: "test-gated", title: "Fixture Gated Home", propertyType: "apartment", category: "residential", subtype: "flat", listingType: "sale", attributes: { gatedCommunity: "yes" }, price: 5000000 },
  { ...base, id: "test-commercial", slug: "test-commercial", title: "Fixture Commercial Shop", propertyType: "shops", category: "commercial", subtype: "shop", listingType: "sale", attributes: { gatedCommunity: "no" }, price: 5000000 },
];
const project: Project = {
  id: "test-approved", slug: "test-approved", name: "Fixture Approved Venture", projectType: "venture", builderName: "Fixture Builder", location: base.location,
  reraApproved: false, crdaApproved: true, constructionStatus: "ready-to-move", phases: [], configurations: [{ id: "cfg", label: "Plot", plotSizeMin: 200, priceMin: 5000000, priceMax: 5000000 }],
  images: [], highlights: [], facilities: [], isFeatured: false, isPublished: true, createdAt: "2026-09-01", updatedAt: "2026-09-01",
};
const projects = [project, { ...project, id: "test-unapproved", slug: "test-unapproved", name: "Fixture Unapproved Venture", crdaApproved: false }, { ...project, id: "test-apartment", slug: "test-apartment", name: "Fixture Apartment Project", projectType: "apartment", crdaApproved: false }];

test("headers replace filters, counts, and active state across history and refresh", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.route("**/rest/v1/**", async route => {
    const table = new URL(route.request().url()).pathname.split("/").pop();
    await route.fulfill({ json: table === "properties" ? properties : table === "projects" ? projects : [] });
  });
  await page.goto("/search?type=projects");
  const nav = page.getByRole("navigation", { name: "Main navigation", exact: true });
  const title = (text: string) => page.getByText(text, { exact: true }).first();
  await expect(title("Fixture Apartment Project")).toBeVisible();
  await expect(nav.locator('[aria-current="page"]')).toHaveText("New Projects");
  await nav.getByRole("link", { name: "Gated Communities", exact: true }).click();
  await expect(title("Fixture Gated Home")).toBeVisible();
  await expect(title("Fixture Apartment Project")).toHaveCount(0);
  await expect(title("Fixture Commercial Shop")).toHaveCount(0);
  await nav.getByRole("link", { name: "Commercial", exact: true }).click();
  await expect(title("Fixture Commercial Shop")).toBeVisible();
  await expect(title("Fixture Gated Home")).toHaveCount(0);
  await nav.getByRole("link", { name: "CRDA Ventures", exact: true }).click();
  await expect(title("Fixture Approved Venture")).toBeVisible();
  await expect(title("Fixture Unapproved Venture")).toHaveCount(0);
  await expect(nav.locator('[aria-current="page"]')).toHaveText("CRDA Ventures");
  await expect(page.getByRole("button", { name: /^Projects\s*\(1\)$/ })).toBeVisible();
  await page.goBack();
  await expect(title("Fixture Commercial Shop")).toBeVisible();
  await page.goForward();
  await expect(title("Fixture Approved Venture")).toBeVisible();
  await page.reload();
  await expect(title("Fixture Unapproved Venture")).toHaveCount(0);
  await expect(title("Fixture Approved Venture")).toBeVisible();
  await page.goto("/search?type=projects&propertyType=venture&city=NonexistentCity");
  await expect(title("Fixture Approved Venture")).toHaveCount(0);
  await expect(nav.locator('[aria-current="page"]')).toHaveText("CRDA Ventures");
});
