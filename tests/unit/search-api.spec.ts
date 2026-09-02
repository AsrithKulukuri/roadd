import { test, expect } from "@playwright/test";

test.describe("Search API Tests", () => {
  test.describe("Properties Search API (/api/properties/search)", () => {
    test("handles city filter parameter without error", async ({ request }) => {
      const res = await request.get("/api/properties/search?city=Guntur&limit=10");
      expect(res.status()).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.properties)).toBe(true);

      for (const prop of data.properties) {
        const city = (prop.location?.city || "").toLowerCase();
        const address = (prop.location?.address || "").toLowerCase();
        expect(city.includes("guntur") || address.includes("guntur")).toBe(true);
      }
    });

    test("handles propertyType aliases like residential-plot", async ({ request }) => {
      const res = await request.get("/api/properties/search?propertyType=residential-plot&limit=10");
      expect(res.status()).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.properties)).toBe(true);

      for (const prop of data.properties) {
        expect(["residential-land", "commercial-lands", "agricultural-land"]).toContain(prop.propertyType);
      }
    });

    test("handles reraApproved filter flag", async ({ request }) => {
      const res = await request.get("/api/properties/search?reraApproved=true&limit=10");
      expect(res.status()).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);

      for (const prop of data.properties) {
        expect(Boolean(prop.reraId && prop.reraId.trim().length > 0)).toBe(true);
      }
    });

    test("handles pagination limits correctly", async ({ request }) => {
      const res = await request.get("/api/properties/search?limit=3&page=1");
      expect(res.status()).toBe(200);

      const data = await res.json();
      expect(data.limit).toBe(3);
      expect(data.page).toBe(1);
      expect(data.properties.length).toBeLessThanOrEqual(3);
    });
  });

  test.describe("AI Search API Error Handling (/api/ai-search)", () => {
    test("rejects empty prompt with HTTP 400 and structured error code", async ({ request }) => {
      const res = await request.post("/api/ai-search", {
        data: { prompt: "" },
      });
      expect(res.status()).toBe(400);

      const data = await res.json();
      expect(data.code).toBe("INVALID_INPUT");
      expect(data.error).toBeDefined();
      expect(data.isSearch).toBeUndefined();
    });

    test("rejects missing body with HTTP 400", async ({ request }) => {
      const res = await request.post("/api/ai-search", {
        data: {},
      });
      expect(res.status()).toBe(400);

      const data = await res.json();
      expect(data.code).toBe("INVALID_INPUT");
    });
  });
});
