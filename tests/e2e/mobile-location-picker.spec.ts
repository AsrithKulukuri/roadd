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

test("mobile search input has search button on the right", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Mobile search icon position test");
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const form = page.locator("#hero-banner-mobile form");
  const input = form.locator("#hero-search-input-mobile");
  const searchBtn = form.locator("button[type='submit']");
  await expect(input).toBeVisible();
  await expect(searchBtn).toBeVisible();
  const inputBox = await input.boundingBox();
  const btnBox = await searchBtn.boundingBox();
  expect(btnBox!.x).toBeGreaterThan(inputBox!.x);
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
  await expect(hero.getByRole("button", { name: /Apply/i })).toBeVisible();
  await page.screenshot({ path: "test-results/compact-mobile-home.png" });
  await picker.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: /Areas in Vijayawada/i })).toBeVisible();
  await page.screenshot({ path: "test-results/mobile-location-picker.png" });
  const subBtn = dialog.locator("button").filter({ hasText: /Edupugallu|Benz Circle|Whole City/i }).first();
  await subBtn.click();
  await dialog.getByRole("button", { name: /^Apply/ }).click();
  await expect(page).toHaveURL(/city=Vijayawada/);
  await expect(picker).toHaveText(/Vijayawada/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});
