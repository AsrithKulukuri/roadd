import { test, expect, type Page } from "@playwright/test";
const buyer = { id: "fixture-buyer", name: "Fixture Buyer", phone: "+919000000001", email: "buyer@example.test", role: "buyer", isLoggedIn: true };
const project = { id: "fixture-project", slug: "fixture-plot", name: "Fixture Plot Venture", projectType: "venture", description: "Public project description", isPublished: true, constructionStatus: "under-construction", location: { city: "Vijayawada", locality: "Fixture locality", latitude: 16.5062, longitude: 80.648 }, coverImage: "/images/property-placeholder.jpg", configurations: [], images: [], highlights: [], facilities: [], totalUnits: 10, builderName: "Fixture Builder" };
async function fixture(page: Page, signedIn: boolean) {
  const actions: any[] = [];
  await page.route("**/api/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/session") return route.fulfill({ status: signedIn ? 200 : 401, json: { authenticated: signedIn, user: signedIn ? buyer : null } });
    if (path === "/api/listings") return route.fulfill({ json: { data: [project], error: null } });
    if (path === "/api/auth/send-otp") return route.fulfill({ json: { success: true } });
    if (path === "/api/auth/verify-otp") { signedIn = true; return route.fulfill({ json: { success: true, user: buyer, isProfileComplete: true } }); }
    if (path === "/api/listing-actions") { actions.push(route.request().postDataJSON()); return route.fulfill({ json: { success: true, phone: "919000000002" } }); }
    if (path === "/api/favorites") return route.fulfill({ json: { success: true, ids: [] } });
    return route.fulfill({ json: { success: true, data: [], phrases: [], layouts: [] } });
  });
  await page.goto("/projects/fixture-plot");
  return actions;
}
test("public browsing does not require OTP; signed-in users still explicitly reveal", async ({ page }) => {
  const actions = await fixture(page, true);
  await expect(page.getByRole("heading", { name: project.name, exact: true }).first()).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Verify your phone" })).toHaveCount(0);
  expect(actions).toHaveLength(0);
  await expect(page.locator('a[href="tel:+919000000002"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Reveal number", exact: true }).first().click();
  await expect(page.locator('a[href="tel:+919000000002"]').first()).toBeVisible();
  expect(actions).toHaveLength(1);
  expect(actions[0]).toMatchObject({ action: "reveal_phone", consent: true, listingId: project.id });
});
test("cancelled OTP shares nothing; successful OTP resumes the original reveal", async ({ page }) => {
  const actions = await fixture(page, false);
  const reveal = page.getByRole("button", { name: "Reveal number", exact: true }).first();
  await reveal.click();
  const dialog = page.getByRole("dialog", { name: "Verify your phone" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Close login" }).click();
  expect(actions).toHaveLength(0);
  await reveal.click();
  await dialog.getByPlaceholder("98765 43210").fill("9000000001");
  await dialog.getByRole("button", { name: "Send OTP via WhatsApp" }).click();
  const digits = dialog.locator('input[maxlength="1"]');
  await expect(digits).toHaveCount(6);
  for (let i = 0; i < 6; i++) await digits.nth(i).fill(String(i + 1));
  // The existing OTP component submits automatically after the sixth digit.
  await expect(page.locator('a[href="tel:+919000000002"]').first()).toBeVisible();
  expect(actions).toHaveLength(1);
  await expect(page).toHaveURL(/projects\/fixture-plot/);
});
