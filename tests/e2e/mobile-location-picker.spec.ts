import { expect, test } from "@playwright/test";

test("mobile search animates admin phrases when the mobile list is empty", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Mobile placeholder regression");
  await page.route("**/api/content/search-phrases", route => route.fulfill({ json: {
    desktop: ["Admin test homes"], mobile: [], typingSpeed: 80, pauseDuration: 1000, textColor: "dark",
  } }));
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const phrase = page.locator("#hero-banner-mobile form span.truncate.text-slate-900");
  await expect(phrase).toHaveText("Admin test homes", { timeout: 15000 });
  await expect(phrase).not.toHaveText("Admin test homes", { timeout: 5000 });
  await expect(phrase).toHaveText("Admin test homes", { timeout: 5000 });
  await page.locator("#hero-search-input-mobile").fill("My search");
  await expect(phrase).toHaveCount(0);
});

test("mobile header selects a city then an area without the old hero pills", async ({ page, isMobile }) => {
  await page.route("**/api/site-features", route => route.fulfill({ json: { propertiesEnabled: false } }));
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const picker = page.getByRole("button", { name: /^Choose location:/ });
  if (!isMobile) {
    await expect(picker).toBeHidden();
    await expect(page.locator("#hero-banner-desktop")).toBeVisible();
    return;
  }
  await expect(picker).toBeVisible();
  await expect(page.locator("#hero-banner-mobile").getByRole("button", { name: "Guntur", exact: true })).toHaveCount(0);
  const hero = page.locator("#hero-banner-mobile");
  const budget = hero.locator("details");
  await expect(budget).not.toHaveAttribute("open", "");
  await expect(hero.getByRole("button", { name: /Apply Budget Filter/ })).toBeHidden();
  await budget.locator("summary").click();
  await expect(hero.getByRole("button", { name: /Apply Budget Filter/ })).toBeVisible();
  await budget.locator("summary").click();
  await expect(hero.getByRole("button", { name: /Apply Budget Filter/ })).toBeHidden();
  await page.screenshot({ path: "test-results/compact-mobile-home.png" });
  await picker.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Choose your city" })).toBeVisible();
  await dialog.getByRole("button", { name: "Guntur", exact: true }).click();
  await expect(dialog.getByRole("heading", { name: "Areas in Guntur" })).toBeVisible();
  await dialog.getByRole("textbox", { name: "Search sublocations" }).fill("Gorantla");
  await page.screenshot({ path: "test-results/mobile-location-picker.png" });
  await dialog.getByRole("button", { name: "Gorantla", exact: true }).click();
  await expect(page).toHaveURL(/city=Guntur/);
  await expect(page).toHaveURL(/locality=Gorantla/);
  await expect(page).toHaveURL(/type=projects/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});
