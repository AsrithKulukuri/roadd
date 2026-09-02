import { expect, test } from "@playwright/test";

test("protected pages redirect anonymous visitors", async ({ page }) => {
  await page.context().clearCookies();

  await page.goto("/admin/dashboard");
  await expect(page).toHaveURL(/\/admin\/login/);

  await page.goto("/dashboard/saved");
  await expect(page).toHaveURL(/\/login\?redirect=/);

  await page.goto("/projects/meridian-skyline-towers-vijayawada");
  await expect(page).toHaveURL(/\/login\?redirect=/);
});

const protectedRequests = [
  { path: "/api/auth/complete-profile", body: { phone: "918977311418", name: "Test User", email: "test@example.com" }, status: 401 },
  { path: "/api/locations/sync", body: { action: "add_sublocation", city: "Test", locality: "Test" }, status: 403 },
  { path: "/api/locations/delete", body: { type: "city", cityName: "Test" }, status: 403 },
  { path: "/api/banners/delete", body: { id: "test" }, status: 403 },
  { path: "/api/projects/save", body: { mode: "create", payload: {} }, status: 403 },
  { path: "/api/properties/save", body: { mode: "create", payload: {} }, status: 403 },
  { path: "/api/projects/delete", body: { id: "test" }, status: 403 },
  { path: "/api/properties/delete", body: { id: "test" }, status: 403 },
  { path: "/api/ai-generate-desc", body: { title: "test" }, status: 403 },
  { path: "/api/whatsapp/property", body: { propertyId: "test", recipientPhone: "918977311418" }, status: 403 },
  { path: "/api/projects/leads/retry-failed", body: {}, status: 403 },
  { path: "/api/storage/delete", body: { key: "properties/test.jpg" }, status: 403 },
  { path: "/api/storage/upload", body: { filename: "test.jpg" }, status: 401 },
  { path: "/api/storage/upload-url", body: { filename: "test.jpg", folder: "properties", size: 100, contentType: "image/jpeg" }, status: 401 },
  { path: "/api/storage/signed-url", body: { key: "properties/test.jpg" }, status: 401 },
  { path: "/api/admin/whatsapp/contacts", body: { action: "unsubscribe", contactId: "00000000-0000-0000-0000-000000000000" }, status: 403 },
  { path: "/api/admin/whatsapp/campaigns", body: { name: "test", message: "test message", contentType: "custom", selectedContactIds: [] }, status: 403 },
  { path: "/api/admin/whatsapp/process", body: { campaignId: "00000000-0000-0000-0000-000000000000" }, status: 403 },
];

for (const entry of protectedRequests) {
  test(`${entry.path} rejects anonymous mutation/access`, async ({ request }) => {
    const response = await request.post(entry.path, { data: entry.body });
    expect(response.status()).toBe(entry.status);
  });
}

for (const path of ["/api/admin/whatsapp/audience", "/api/admin/whatsapp/campaigns"]) {
  test(`${path} rejects anonymous reads`, async ({ request }) => {
    const response = await request.get(path);
    expect(response.status()).toBe(403);
  });
}

test("Wasender webhook rejects an invalid signature", async ({ request }) => {
  const response = await request.post("/api/webhooks/wasender", {
    headers: { "x-webhook-signature": "invalid" },
    data: { event: "messages.received", data: {} },
  });
  expect([401, 503]).toContain(response.status());
});

test("OTP endpoints reject malformed input without contacting the provider", async ({ request }) => {
  const sendResponse = await request.post("/api/auth/send-otp", { data: { phone: "123" } });
  expect(sendResponse.status()).toBe(400);
  await expect(sendResponse.json()).resolves.toMatchObject({
    success: false,
    error: { code: "INVALID_PHONE_NUMBER" },
  });

  const verifyResponse = await request.post("/api/auth/verify-otp", {
    data: { phone: "123", otp: "12" },
  });
  expect(verifyResponse.status()).toBe(400);
  await expect(verifyResponse.json()).resolves.toMatchObject({
    success: false,
    error: { code: "INVALID_PAYLOAD" },
  });
});

test("forged legacy admin cookies do not grant access", async ({ page, context }) => {
  await context.addCookies([
    { name: "road_admin_user", value: "true", url: "http://127.0.0.1:3100" },
    { name: "road_user", value: "true", url: "http://127.0.0.1:3100" },
  ]);
  await page.goto("/admin/dashboard");
  await expect(page).toHaveURL(/\/admin\/login/);
});
