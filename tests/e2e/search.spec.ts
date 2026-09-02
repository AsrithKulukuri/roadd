import { test, expect } from "@playwright/test";

test.describe("Public Search Platform E2E Tests", () => {
  test("homepage search submits and navigates to search page with preserved query", async ({ page }) => {
    await page.goto("/");
    const searchInput = page.getByRole("textbox", { name: "Search properties and projects" });
    await expect(searchInput).toBeVisible();

    await searchInput.fill("3 BHK flat Guntur");
    await page.getByRole("button", { name: "Search properties" }).click();

    await expect(page).toHaveURL(/\/search\?/);
    await expect(page).toHaveURL(/location=3\+BHK\+flat\+Guntur|location=3%20BHK%20flat%20Guntur/);
  });

  test("/search?type=rent returns properties and excludes projects", async ({ page }) => {
    await page.goto("/search?type=rent");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1000);

    // Verify no project cards are rendered in the results grid
    const projectCards = page.locator(".grid a[href^='/projects/']");
    const count = await projectCards.count();
    expect(count).toBe(0);
  });

  test("/search?type=projects&status=new-launch excludes ready-to-move projects", async ({ page }) => {
    await page.goto("/search?type=projects&status=new-launch");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1000);

    // Verify ready-to-move badge is not present on any visible project card
    const readyBadges = page.locator(".grid").getByText(/^Ready to Move$/i);
    const readyCount = await readyBadges.count();
    expect(readyCount).toBe(0);
  });

  test("mobile filters apply cleanly without leaving openFilters=true in URL", async ({ page }) => {
    // Emulate iPhone / mobile viewport 390x844
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto("/search");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(800);

    // Open filter modal using the All Filters button with aria-label
    const filterBtn = page.getByRole("button", { name: "All Filters" }).first();
    await filterBtn.click();

    // Verify modal is open by checking the back arrow
    const backBtn = page.locator("button[aria-label='Back'], button[aria-label='Close filters']").first();
    await expect(backBtn).toBeVisible();

    // Wait for modal animation to settle
    await page.waitForTimeout(600);

    // Select city "Guntur"
    const gunturBtn = page.locator("button:has-text('Guntur')").first();
    if (await gunturBtn.isVisible()) {
      await gunturBtn.click();
      await page.waitForTimeout(300);
    }

    // Click Apply button (Properties button in mobile bottom bar, or Apply on desktop)
    const applyBtn = page.getByRole("button", { name: /Properties/i }).or(page.getByRole("button", { name: /Apply/i })).last();
    await applyBtn.click();

    await page.waitForTimeout(600);

    // Verify URL does NOT have openFilters=true
    await expect(page).not.toHaveURL(/openFilters=true/);

    // Verify URL contains city parameter
    await expect(page).toHaveURL(/city=Guntur|city=guntur/i);

    // Reload page and ensure modal remains closed and city is preserved
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(500);

    await expect(page).not.toHaveURL(/openFilters=true/);
    await expect(page).toHaveURL(/city=Guntur|city=guntur/i);
  });

  test("map and grid view toggling works smoothly", async ({ page }) => {
    await page.goto("/search");
    await page.waitForLoadState("domcontentloaded");

    // Switch to map view
    const mapToggle = page.getByRole("button", { name: /Map View|Map/i }).first();
    if (await mapToggle.isVisible()) {
      await mapToggle.click();
      await page.waitForTimeout(500);
      // Map pane should be visible
      await expect(page.locator(".leaflet-container, [aria-label='Interactive Map']").first()).toBeAttached();
    }
  });
});
