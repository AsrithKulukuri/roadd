import { test, expect } from "@playwright/test";
const config = { id: "three", label: "3 BHK", superBuiltUpAreaMin: 2430, priceMin: 11400000, priceMax: 11400000, pricePerUnit: 4700 };
const base = { slug: "fixture-one", id: "fixture-one", name: "Serene Grande", projectType: "apartment", reraApproved: true, totalArea: "12 Acres", totalUnits: 70, possessionDate: "March 2027", isPublished: true, constructionStatus: "under-construction", location: { locality: "Edupugallu", city: "Vijayawada", latitude: 16.5, longitude: 80.6 }, coverImage: "/images/categories/new_apartments_img_1786320061003.png", configurations: [config], images: [{ url: "/images/categories/new_apartments_img_1786320061003.png" }], facilities: [], highlights: [], phases: [], builderName: "Avenue Realty" };
const projects = [base, { ...base, id: "fixture-many", slug: "fixture-many", name: "Serene Grande Residences", configurations: [config, { ...config, id: "four", label: "4 BHK", superBuiltUpAreaMin: 3200, priceMin: 15000000 }, { ...config, id: "five", label: "5 BHK", superBuiltUpAreaMin: 4100, priceMin: 19000000 }, { ...config, id: "six", label: "Penthouse" }] }, { ...base, id: "villa", slug: "villa", name: "The Grove Villas", projectType: "villa", totalUnits: 28, coverImage: "/images/categories/new_villas_img_1786320073700.png" }, { ...base, id: "plots", slug: "plots", name: "Greenfield Layout", projectType: "venture", reraApproved: false, coverImage: "/images/categories/plots_img_1786320122995.png", configurations: [{ id: "plot", label: "East-facing Plot", plotSizeMin: 200, priceMin: 5000000, priceMax: 5000000, pricePerUnit: 25000 }] }];
projects.push({ ...base, id: "missing", slug: "missing", name: "Upcoming Homes", configurations: [] });
test("project cards keep equal dimensions across configuration counts and types", async ({ page }, testInfo) => {
  await page.route("**/api/**", route => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/listings") return route.fulfill({ json: { data: url.searchParams.get("type") === "project" ? projects : [], error: null } });
    if (url.pathname === "/api/auth/session") return route.fulfill({ status: 401, json: { authenticated: false } });
    return route.fulfill({ json: { data: [], success: true, phrases: [], layouts: [] } });
  });
  await page.goto("/search?type=projects");
  const cards = page.getByTestId("search-project-card");
  await expect(cards).toHaveCount(5);
  await page.goto("/search?type=projects&q=3bhk%20in%20edupugallu");
  await expect(cards.filter({ hasText: "Serene Grande" }).first()).toBeVisible();
  await page.goto("/search?type=projects");
  await expect(cards).toHaveCount(5);
  const sizes = await cards.evaluateAll(nodes => nodes.map(node => { const r = node.getBoundingClientRect(); return { width: r.width, height: r.height }; }));
  for (const size of sizes) { expect(Math.abs(size.height - ((size.width - 2) * 0.75 + 302))).toBeLessThan(2); expect(Math.abs(size.height - sizes[0].height)).toBeLessThan(2); expect(Math.abs(size.width - sizes[0].width)).toBeLessThan(2); }
  await expect(cards.filter({ hasText: "Greenfield Layout" })).toContainText("200 sq.yd");
  await expect(cards.filter({ hasText: "The Grove Villas" })).toContainText("Total villas");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const multiple = cards.filter({ hasText: "Serene Grande Residences" });
  await multiple.getByRole("button", { name: /Next configurations/ }).click();
  await expect.poll(() => multiple.getByLabel("Available configurations", { exact: true }).evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath("project-cards.png"), fullPage: true });
  await cards.first().screenshot({ path: testInfo.outputPath("single-config.png"), style: ".fixed, .sticky { visibility: hidden !important; }" });
  await multiple.screenshot({ path: testInfo.outputPath("multiple-configs.png"), style: ".fixed, .sticky { visibility: hidden !important; }" });
  if (testInfo.project.name === "desktop-chromium") {
    for (const width of [768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      const boxes = await cards.evaluateAll(nodes => nodes.map(node => { const r = node.getBoundingClientRect(); return { width: r.width, height: r.height }; }));
      expect(new Set(boxes.map(b => Math.round(b.width))).size).toBe(1);
      expect(new Set(boxes.map(b => Math.round(b.height))).size).toBe(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
  }
});
