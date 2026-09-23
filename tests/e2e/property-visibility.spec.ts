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
  await expect(page.getByText("Projects-only experience", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: "Properties", exact: true })).toHaveCount(0);
  await page.reload();
  await expect(toggle).not.toBeChecked();
  const visitor = await context.newPage();
  await visitor.goto("/");
  await expect(visitor.getByRole("heading", { name: "Find a place to build your future." })).toBeVisible();
  await expect(visitor.locator('a[href^="/properties"]')).toHaveCount(0);
  await expect(visitor.getByLabel("Project type", { exact: true })).toBeVisible();
  const overflow = await visitor.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  await visitor.screenshot({ path: `test-results/projects-only-${test.info().project.name}.png`, fullPage: true });
  await visitor.goto("/properties/example");
  await expect(visitor.getByRole("heading", { name: "Discover your next project" })).toBeVisible();
  failSave = true;
  await toggle.click();
  await expect(page.getByText("Could not save settings.", { exact: true })).toBeVisible();
  await expect(toggle).not.toBeChecked();
  failSave = false;
  await toggle.click();
  await expect(toggle).toBeChecked();
  await expect(page.locator('a[href="/admin/properties"]').first()).toBeAttached();
  await visitor.goto("/");
  await expect(visitor.getByRole("heading", { name: "Find a place to build your future." })).toHaveCount(0);
});

test("anonymous visitors cannot change property visibility", async ({ request }) => {
  const response = await request.put("/api/site-features", { data: { propertiesEnabled: false } });
  expect([401, 403]).toContain(response.status());
});

test("projects-only public experience hides property entry points and adapts on refresh", async ({ page, context }) => {
  let enabled = false;
  await context.route("**/api/site-features", route => route.fulfill({ json: { propertiesEnabled: enabled } }));
  await context.route("**/api/listings?**", route => route.fulfill({ json: { data: [], error: null } }));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Find a place to build your future." })).toBeVisible();
  await expect(page.locator('a[href^="/properties"]')).toHaveCount(0);
  await expect(page.getByLabel("Project type", { exact: true })).toBeVisible();
  await page.getByLabel("Project type", { exact: true }).selectOption("villa");
  await expect(page.getByRole("heading", { name: "No projects found" })).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.getByLabel("Project type", { exact: true })).toHaveValue("all");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  await page.screenshot({ path: `test-results/projects-only-${test.info().project.name}.png`, fullPage: true });
  await page.goto("/properties/example");
  await expect(page.getByRole("heading", { name: "Discover your next project" })).toBeVisible();
  enabled = true;
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Find a place to build your future." })).toHaveCount(0);
});
