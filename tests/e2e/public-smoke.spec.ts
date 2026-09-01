import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const publicRoutes = [
  "/",
  "/search",
  "/properties",
  "/properties/map",
  "/properties/compare",
  "/about",
  "/contact",
  "/blog",
  "/mortgage-calculator",
  "/privacy",
  "/terms",
];

async function collectRuntimeErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

for (const route of publicRoutes) {
  test(`${route} renders without runtime failures or horizontal overflow`, async ({ page }) => {
    const errors = await collectRuntimeErrors(page);
    const response = await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(response?.status(), `${route} HTTP status`).toBeLessThan(400);
    await expect(page.locator("body")).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${route} horizontal overflow`).toBeLessThanOrEqual(1);

    const brokenVisibleImages = await page.locator("img:visible").evaluateAll((images) =>
      images.filter((image) => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth === 0)
        .map((image) => (image as HTMLImageElement).currentSrc || (image as HTMLImageElement).src)
    );
    expect(brokenVisibleImages, `${route} broken visible images`).toEqual([]);
    expect(errors, `${route} console/page errors`).toEqual([]);
  });
}

test("homepage search preserves input and routes to results", async ({ page }) => {
  await page.goto("/");
  const search = page.getByRole("textbox", { name: "Search properties and projects" });
  await search.fill("3 BHK flat Guntur");
  await page.getByRole("button", { name: "Search properties" }).click();
  await expect(page).toHaveURL(/\/search\?/);
  await expect(page.getByRole("heading", { name: "Search properties and projects" })).toBeAttached();
});

test("unknown routes show the custom not-found experience", async ({ page }) => {
  const response = await page.goto("/this-route-must-not-exist");
  expect(response?.status()).toBe(404);
  await expect(page.getByText(/page.*not found|couldn.t find/i).first()).toBeVisible();
});

for (const route of ["/", "/search", "/mortgage-calculator"]) {
  test(`${route} has no serious or critical axe violations`, async ({ page }) => {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    const blockers = results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact || ""));
    expect(blockers, blockers.map((item) => `${item.id}: ${item.help}`).join("\n")).toEqual([]);
  });
}
