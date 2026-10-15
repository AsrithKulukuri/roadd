import { test, expect } from "@playwright/test";

test.describe("Resolve Maps URL API (/api/resolve-maps-url)", () => {
  test("resolves shortened Google Maps URL correctly", async ({ request }) => {
    const res = await request.get(
      "/api/resolve-maps-url?url=" +
        encodeURIComponent("https://maps.app.goo.gl/DGzwjhofrtCZaFky9?g_st=awb")
    );
    expect(res.status()).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.latitude).toBeCloseTo(16.5055787, 3);
    expect(data.longitude).toBeCloseTo(80.6663676, 3);
    expect(data.city).toBeTruthy();
    expect(data.locality).toBeTruthy();
  });

  test("handles raw coordinates directly", async ({ request }) => {
    const res = await request.get(
      "/api/resolve-maps-url?url=" + encodeURIComponent("16.5055787, 80.6663676")
    );
    expect(res.status()).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.latitude).toBeCloseTo(16.5055787, 3);
    expect(data.longitude).toBeCloseTo(80.6663676, 3);
  });

  test("blocks SSRF attempts on localhost and private IPs", async ({ request }) => {
    const localRes = await request.get(
      "/api/resolve-maps-url?url=" + encodeURIComponent("http://localhost:3000")
    );
    expect(localRes.status()).toBe(400);

    const awsRes = await request.get(
      "/api/resolve-maps-url?url=" +
        encodeURIComponent("http://169.254.169.254/latest/meta-data")
    );
    expect(awsRes.status()).toBe(400);
  });

  test("blocks non-Google domains", async ({ request }) => {
    const res = await request.get(
      "/api/resolve-maps-url?url=" + encodeURIComponent("https://evil-google.com/maps")
    );
    expect(res.status()).toBe(400);
  });

  test("rejects missing url parameter", async ({ request }) => {
    const res = await request.get("/api/resolve-maps-url");
    expect(res.status()).toBe(400);
  });
});
