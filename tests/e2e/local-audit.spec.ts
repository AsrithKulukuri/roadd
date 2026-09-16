import { test, expect, type Page } from "@playwright/test";
import { loadEnvConfig } from "@next/env";
import { signSessionPayload } from "@/lib/server-auth-guard";

loadEnvConfig(process.cwd());
const buyer = { id: "local-audit-buyer", name: "Local Audit Buyer", phone: "+919000000001", email: "audit@example.test", role: "buyer" };
const propertyPath = "/properties/1bhk-flat-benz-circle-vijayawada-1";
const project = { id: "local-audit-project", slug: "local-audit-project", name: "Local Audit Project", projectType: "venture", isPublished: true, constructionStatus: "under-construction", description: "Local test fixture", location: { locality: "Benz Circle", city: "Vijayawada", latitude: 16.5062, longitude: 80.648 }, coverImage: "/images/property-placeholder.jpg", configurations: [], phases: [], highlights: [], facilities: [], images: [], builderName: "Fixture Builder" };

// Every mutation in these audit cases is intercepted, including analytics.
async function protectMutations(page: Page) {
  await page.context().route("**/*", route => {
    if (!["GET", "HEAD", "OPTIONS"].includes(route.request().method())) return route.fulfill({ status: 409, json: { success: false, error: "Local audit blocked this mutation" } });
    return route.continue();
  });
}

for (const path of ["/projects", "/login", "/register", "/forgot-password", "/builder/login", "/admin/login", "/list-with-us", "/cookies", "/disclaimer", "/grievance", propertyPath]) {
  test(`additional public route ${path}`, async ({ page }) => {
    await protectMutations(page);
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    const response = await page.goto(path);
    expect(response?.status()).toBeLessThan(400);
    await expect(page.getByRole("heading").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Something went wrong", exact: true })).toHaveCount(0);
    await page.waitForTimeout(1200);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
  });
}

for (const path of ["/admin/dashboard", "/admin/properties", "/admin/projects", "/admin/properties/new", "/admin/projects/new", "/admin/builders", "/admin/inquiries", "/admin/schedules", "/admin/users", "/admin/locations", "/admin/banners", "/admin/content", "/admin/homepage", "/admin/settings", "/admin/support", "/admin/broadcasts"]) {
  test(`admin screen with isolated data ${path}`, async ({ page, baseURL }) => {
    await protectMutations(page);
    const admin = { ...buyer, id: "local-audit-admin", name: "Local Audit Admin", email: "admin@road.com", role: "admin" };
    await page.context().addCookies([{ name: "road_auth_token", value: signSessionPayload(admin), url: baseURL! }]);
    await page.route("**/rest/v1/**", route => route.fulfill({ json: [] }));
    await page.route("**/api/**", route => {
      const path = new URL(route.request().url()).pathname;
      if (path === "/api/auth/session") return route.fulfill({ json: { authenticated: true, user: admin } });
      return route.fulfill({ json: { success: true, data: [], users: [], leads: [], schedules: [], builders: [], requests: [], messages: [], activities: [], campaigns: [], registeredUsers: [], externalContacts: [], content: [], conversations: [], categories: [], sections: [], phrases: [], layouts: [], deliveryMode: "disabled" } });
    });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(path.replaceAll("/", "\\/") + "$"));
    await expect(page.getByRole("heading").first()).toBeVisible();
    await page.waitForTimeout(800);
    await expect(page.getByRole("heading", { name: "Something went wrong", exact: true })).toHaveCount(0);
    expect(errors).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  });
}

async function listingFixture(page: Page, type: "project" | "property", signedIn: boolean) {
  await protectMutations(page);
  const actions: any[] = [];
  const visits: any[] = [];
  await page.route("**/api/**", route => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/session") return route.fulfill({ status: signedIn ? 200 : 401, json: { authenticated: signedIn, user: signedIn ? buyer : null } });
    if (path === "/api/listings") return route.fulfill({ json: { data: new URL(route.request().url()).searchParams.get("type") === "project" ? [project] : [], error: null } });
    if (path === "/api/auth/send-otp") return route.fulfill({ json: { success: true } });
    if (path === "/api/auth/verify-otp") { signedIn = true; return route.fulfill({ json: { success: true, user: buyer, isProfileComplete: true } }); }
    if (path === "/api/listing-actions") { actions.push(route.request().postDataJSON()); return route.fulfill({ json: { success: true, phone: "919000000002" } }); }
    if (path === "/api/projects/schedule-visit") { visits.push(route.request().postDataJSON()); return route.fulfill({ json: { success: true, schedule: { id: "local-audit-visit" }, customerNotified: false, builderNotified: false } }); }
    return route.fulfill({ json: { success: true, data: [], ids: [], phrases: [], layouts: [] } });
  });
  await page.context().route("https://wa.me/**", route => route.fulfill({ contentType: "text/html", body: "<p>WhatsApp handoff intercepted by local audit</p>" }));
  await page.goto(type === "project" ? "/projects/local-audit-project" : propertyPath);
  return { actions, visits };
}
async function finishOtp(page: Page) {
  const dialog = page.getByRole("dialog", { name: "Verify your phone" });
  await dialog.getByPlaceholder("98765 43210").fill("9000000001");
  await dialog.getByRole("button", { name: "Send OTP via WhatsApp" }).click();
  const digits = dialog.locator('input[maxlength="1"]');
  for (let i = 0; i < 6; i++) await digits.nth(i).fill(String(i + 1));
  await expect(dialog).toHaveCount(0);
}
for (const type of ["project", "property"] as const) {
  test(`${type} mobile schedule verifies OTP and sends only on confirmation`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const { visits, actions } = await listingFixture(page, type, false);
    await page.getByRole("button", { name: "Schedule Visit", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Verify your phone" })).toBeVisible();
    expect(visits).toHaveLength(0);
    await finishOtp(page);
    await expect(page.getByRole("heading", { name: /Schedule (Private )?Site Visit/ })).toBeVisible();
    expect(visits).toHaveLength(0);
    await page.getByRole("button", { name: "Confirm Site Visit", exact: true }).click();
    await expect.poll(() => visits.length).toBe(1);
    expect(visits[0]).toMatchObject({ consent: true, customerName: buyer.name, customerPhone: buyer.phone });
    expect(actions).toHaveLength(0);
  });
  test(`${type} mobile WhatsApp verifies OTP and logs the action before handoff`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const { actions } = await listingFixture(page, type, false);
    await page.getByRole("button", { name: "WhatsApp", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Verify your phone" })).toBeVisible();
    expect(actions).toHaveLength(0);
    await finishOtp(page);
    await expect.poll(() => actions.length).toBe(1);
    expect(actions[0]).toMatchObject({ listingType: type, action: "whatsapp_click", consent: true });
  });
}

test("project map stays still after loading, including distance updates", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 16.5, longitude: 80.64 });
  await listingFixture(page, "project", false);
  const map = page.locator(".leaflet-container").first();
  await map.scrollIntoViewIfNeeded();
  await expect(map).toBeVisible();
  await page.waitForTimeout(1800);
  const pane = map.locator(".leaflet-map-pane");
  const initial = await pane.getAttribute("style");
  await context.setGeolocation({ latitude: 16.51, longitude: 80.65 });
  for (let i = 0; i < 4; i++) {
    await page.waitForTimeout(400);
    expect(await pane.getAttribute("style")).toBe(initial);
  }
});
