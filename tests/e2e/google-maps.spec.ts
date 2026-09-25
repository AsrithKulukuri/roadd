import { test, expect } from "@playwright/test";

test("Google basemap preserves style switching, zoom, and area drawing", async ({ page }) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/search?view=map");
  const map = page.locator('[data-map-provider="google"]').first();
  await expect(map).toBeVisible({ timeout: 45000 });
  await expect(page.locator('.leaflet-bottom.leaflet-left img')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('.leaflet-bottom.leaflet-right')).toContainText('Terms');
  for (const name of ["Satellite", "Terrain", "Streets"]) {
    await page.getByTitle("Map Style", { exact: true }).click();
    await page.getByRole("button", { name: new RegExp(name) }).last().click();
    await expect(map).toBeVisible({ timeout: 30000 });
    await expect(page.locator('.leaflet-google-mutant')).toHaveCount(1);
  }
  await page.getByTitle("Zoom In", { exact: true }).click();
  await page.getByTitle("Zoom Out", { exact: true }).click();
  await page.getByTitle("Draw Custom Area", { exact: true }).click();
  const box = await map.boundingBox();
  if (!box) throw new Error("Map is not visible");
  const x = box.x + box.width * 0.25;
  const y = box.y + box.height * 0.3;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 180, y, { steps: 12 });
  await page.mouse.move(x + 180, y + 180, { steps: 12 });
  await page.mouse.move(x, y + 180, { steps: 12 });
  await page.mouse.move(x, y, { steps: 12 });
  await page.mouse.up();
  await expect(page.getByText("Filtered by custom drawn boundary")).toBeVisible();
  await page.getByTitle("Clear Drawn Area", { exact: true }).first().click();
  await expect(page.getByText("Filtered by custom drawn boundary")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("blocked Google script shows a recoverable error", async ({ page }) => {
  await page.route("https://maps.googleapis.com/maps/api/js?**", route => route.abort());
  await page.goto("/search?view=map");
  await expect(page.getByText("Google Maps is unavailable. Please check your connection and reload.")).toBeVisible({ timeout: 30000 });
  await expect(page.getByRole("button", { name: "Reload map", exact: true })).toBeVisible();
});
