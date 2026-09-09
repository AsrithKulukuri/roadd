import { test, expect } from "@playwright/test";
import { loadEnvConfig } from "@next/env";
import { signSessionPayload } from "@/lib/server-auth-guard";
loadEnvConfig(process.cwd());
const builder = {
  id: "90000000-0000-4000-8000-000000000001", companyName: "Fixture Builder", contactEmail: "builder@example.test",
  contactPhone: "+919000000001", slug: "fixture-builder", tier: "starter", assignedProjectIds: ["fixture-project"],
  assignedPropertyIds: [], isVerified: false, chatEnabled: true,
};
const project = {
  id: "fixture-project", slug: "fixture-plot", name: "Fixture Plot Venture", projectType: "venture", description: "Original project description",
  constructionStatus: "Under Construction", location: { city: "Vijayawada", locality: "Fixture locality" },
  configurations: [], images: [], highlights: [], facilities: [], totalUnits: 10, builderName: builder.companyName,
};
async function fixture(page: import("@playwright/test").Page, authenticated = true) {
  if (authenticated) {
    const user = { id: builder.id, name: builder.companyName, phone: builder.contactPhone, email: builder.contactEmail, role: "developer", builderSessionVersion: 2 };
    await page.context().addCookies([{ name: "road_auth_token", value: signSessionPayload(user), url: test.info().project.use.baseURL as string }]);
  }
  await page.route("**/api/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/builder/session") return route.fulfill({ status: authenticated ? 200 : 401, json: authenticated ? { success: true, currentBuilderId: builder.id, builders: [builder], projects: [project], requests: [], messages: [] } : { success: false, error: "Please sign in." } });
    if (path === "/api/builder/schedules") return route.fulfill({ json: { success: true, schedules: [] } });
    if (path === "/api/projects/activity/report") return route.fulfill({ json: { success: true, metrics: { todayClicks: 2, totalClicks: 5, avgDwellSeconds: 10, avgDwellFormatted: "10s", detailsSharedCount: 0 }, sharedMembers: [], monthlyActivity: [{ month: "2026-09", views: 5, leads: 0 }] } });
    if (path === "/api/builder/chat") return route.fulfill({ json: { success: true, messages: [], senderRole: "admin" } });
    return route.fulfill({ status: 503, json: { success: false, error: "Fixture service unavailable" } });
  });
}
test("builder login sends a real OTP request and includes the code in verification", async ({ page }) => {
  await fixture(page, false);
  let sent = false;
  let submitted: any;
  await page.route("**/api/auth/send-otp", route => { sent = true; return route.fulfill({ json: { success: true } }); });
  await page.route("**/api/builder/login", route => { submitted = route.request().postDataJSON(); return route.fulfill({ status: 401, json: { success: false, error: "Fixture invalid OTP" } }); });
  await page.goto("/builder/login");
  await page.getByRole("button", { name: "WhatsApp OTP" }).click();
  await page.getByPlaceholder("+91 98490 12345").fill(builder.contactPhone);
  await page.getByRole("button", { name: "Send WhatsApp Code" }).click();
  expect(sent).toBe(true);
  await page.getByPlaceholder("Enter 6-digit OTP code").fill("123456");
  await page.getByRole("button", { name: "Verify & Enter Portal" }).click();
  await expect(page.getByText("Fixture invalid OTP")).toBeVisible();
  expect(submitted).toEqual({ phone: builder.contactPhone, otp: "123456" });
  await expect(page).toHaveURL(/builder\/login/);
});
test("builder project saves use the builder API and retain edits after failure", async ({ page }) => {
  await fixture(page);
  let saved: any;
  let fail = true;
  await page.route("**/api/builder/projects", route => {
    saved = route.request().postDataJSON();
    return route.fulfill({ status: fail ? 503 : 200, json: fail ? { success: false, error: "Fixture save failed" } : { success: true, project: { ...project, ...saved.payload } } });
  });
  await page.goto("/builder/projects");
  await page.getByRole("button", { name: "Edit Text & Milestones" }).click();
  await page.getByPlaceholder("Provide full project narrative, lifestyle appeal, architecture details...").fill("Updated fixture description");
  await page.getByRole("button", { name: /Save/ }).click();
  await expect(page.getByText("Fixture save failed")).toBeVisible();
  await expect(page.getByPlaceholder("Provide full project narrative, lifestyle appeal, architecture details...")).toHaveValue("Updated fixture description");
  fail = false;
  await page.getByRole("button", { name: /Save/ }).click();
  await expect(page.getByText("Project text and milestones updated successfully!")).toBeVisible();
  expect(saved.projectId).toBe(project.id);
  expect(saved.payload.description).toBe("Updated fixture description");
  await page.getByRole("button", { name: "Submit plot documents" }).click();
  await expect(page.getByText("Official CRDA LP number", { exact: true })).toBeVisible();
});
test("request shortcuts open the requested form and show failed submissions", async ({ page }) => {
  await fixture(page);
  await page.goto("/builder/requests?type=publish_banner");
  await expect(page.getByRole("heading", { name: "New publish banner request" })).toBeVisible();
  await page.getByPlaceholder("https://images.unsplash.com/... or hosted image link").fill("https://example.test/banner.jpg");
  await page.getByPlaceholder("e.g. Amaravati's Most Anticipated Road-Facing Luxury Community").fill("Fixture banner headline");
  await page.getByRole("button", { name: "Submit Request to Admin" }).click();
  await expect(page.getByText("Fixture service unavailable")).toBeVisible();
});
