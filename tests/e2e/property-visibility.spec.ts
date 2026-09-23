import { expect, test } from "@playwright/test";
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

test("property switch updates the dashboard, public layout and survives reload", async ({ page, context }) => {
  test.skip(!process.env.ADMIN_SECRET_KEY, "Requires local admin test credentials.");
  await context.route("http://localhost:3000/admin/**", route => route.continue({ headers: { ...route.request().headers(), "x-admin-secret": process.env.ADMIN_SECRET_KEY! } }));
  let enabled = true;
  let failSave = false;
  await context.route("**/api/site-features", async route => {
    if (route.request().method() === "PUT") {
      if (failSave) return route.fulfill({ status: 500, json: { error: "Could not save settings." } });
      enabled = route.request().postDataJSON().propertiesEnabled;
    }
    return route.fulfill({ json: { propertiesEnabled: enabled } });
  });
  await context.route("**/api/auth/session", route => route.fulfill({ json: { authenticated: true, user: { id: "test-admin", role: "admin" } } }));
  await context.route("**/api/listings?**", route => route.fulfill({ json: { data: [], error: null } }));
  await page.goto("/admin/dashboard");
  const toggle = page.getByRole("switch", { name: "Show properties on website" });
  await expect(toggle).toBeChecked();
  await toggle.click();
  await expect(toggle).not.toBeChecked();
  await expect(page.getByText("Original website layout", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: "Properties", exact: true })).toHaveCount(0);
  await page.reload();
  await expect(toggle).not.toBeChecked();
  const visitor = await context.newPage();
  await visitor.goto("/");
  await expect(visitor.getByRole("heading", { name: "Browse projects" })).toBeVisible();
  await expect(visitor.locator('a[href^="/properties"]')).toHaveCount(0);
  await expect(visitor.getByRole("button", { name: "Projects", exact: true }).first()).toBeVisible();
  const overflow = await visitor.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  await visitor.screenshot({ path: `test-results/projects-only-${test.info().project.name}.png`, fullPage: true });
  await visitor.goto("/properties/example");
  await expect(visitor).toHaveURL(/search\?type=projects/);
  failSave = true;
  await toggle.click();
  await expect(page.getByText("Could not save settings.", { exact: true })).toBeVisible();
  await expect(toggle).not.toBeChecked();
  failSave = false;
  await toggle.click();
  await expect(toggle).toBeChecked();
  await expect(page.locator('a[href="/admin/properties"]').first()).toBeAttached();
  await visitor.goto("/");
  await expect(visitor.getByRole("heading", { name: "Browse projects" })).toHaveCount(0);
});

test("anonymous visitors cannot change property visibility", async ({ request }) => {
  const response = await request.put("/api/site-features", { data: { propertiesEnabled: false } });
  expect([401, 403]).toContain(response.status());
});

test("hiding properties preserves the original hero, navigation and project search", async ({ page, context, isMobile }) => {
  let enabled = false;
  const project = {
    id: "visibility-project", slug: "visibility-project", name: "Visibility Test Project", projectType: "apartment",
    isPublished: true, isFeatured: true, displayCategory: "featured", builderName: "Test Builder",
    constructionStatus: "ready-to-move", location: { city: "Vijayawada", locality: "Benz Circle" },
    configurations: [{ id: "config", label: "3 BHK", bedrooms: 3, priceMin: 8000000, priceMax: 9000000, builtUpAreaMin: 1500 }],
    images: [], amenities: [], highlights: [], phases: [], reraApproved: false,
  };
  await context.route("**/api/site-features", route => route.fulfill({ json: { propertiesEnabled: enabled } }));
  await context.route("**/api/listings?**", route => route.fulfill({ json: { data: route.request().url().includes("type=project") ? [project] : [], error: null } }));
  await context.route("**/api/home-sections", route => route.fulfill({ json: { configured: false, sections: [] } }));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Browse projects" })).toBeVisible();
  const hero = page.locator(isMobile ? "#hero-banner-mobile" : "#hero-banner-desktop");
  await expect(hero).toBeVisible();
  await expect(hero.getByRole("button", { name: "Projects", exact: true })).toBeVisible();
  await expect(hero.getByRole("button", { name: "Buy", exact: true })).toHaveCount(0);
  await expect(page.locator('a[href="/list-with-us"]')).toHaveCount(0);
  await expect(page.locator('a[href^="/properties/"]')).toHaveCount(0);
  const originalHeroClass = await hero.getAttribute("class");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  await page.screenshot({ path: `test-results/original-home-properties-hidden-${test.info().project.name}.png`, fullPage: true });

  enabled = true;
  await page.evaluate(() => { const channel = new BroadcastChannel("road-site-features"); channel.postMessage("refresh"); channel.close(); });
  await expect(hero.getByRole("button", { name: "Buy", exact: true })).toBeVisible();
  expect(await hero.getAttribute("class")).toBe(originalHeroClass);
  await expect(page.locator('a[href="/list-with-us"]').first()).toBeAttached();

  enabled = false;
  await page.goto("/search?type=rent&saleType=resale&openFilters=true");
  await expect(page.getByRole("button", { name: /^Properties(?: \(|$)/ })).toHaveCount(0);
  await expect(page.getByText("Resale", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /4\. Sale Type/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Projects\s*1$/ }).last()).toBeVisible();
  await page.getByRole("button", { name: /^Projects\s*1$/ }).last().click();
  await expect(page.getByText("Visibility Test Project", { exact: true }).first()).toBeVisible();
  await expect(page.locator('a[href^="/properties/"]')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});
