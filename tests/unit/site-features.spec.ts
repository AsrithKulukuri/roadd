import { expect, test } from "@playwright/test";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { readSiteFeatures } from "@/lib/site-features";
import { GET as listings } from "@/app/api/listings/route";
import { GET as read, PUT as save } from "@/app/api/site-features/route";
import { signSessionPayload } from "@/lib/server-auth-guard";
import { getActionListing } from "@/lib/listing-leads";

let originalFrom: ReturnType<typeof getSupabaseAdmin>["from"];
let enabled: boolean | undefined;
let fail = false;
let writes = 0;
test.beforeAll(() => {
  process.env.SESSION_SECRET = "isolated-site-features-test-secret-32-characters";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:1";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "isolated-test-service-key";
  originalFrom = getSupabaseAdmin().from;
});
test.beforeEach(() => {
  enabled = undefined; fail = false; writes = 0;
  getSupabaseAdmin().from = ((table: string) => {
    const query = {
      select: () => query, eq: () => query, order: () => query,
      maybeSingle: async () => ({ data: table === "profiles" ? { id: "admin-test", role: "admin" } : enabled === undefined ? null : { sections: { propertiesEnabled: enabled } }, error: fail ? { message: "Unavailable" } : null }),
      upsert: async (row: { sections: { propertiesEnabled: boolean } }) => { if (!fail) { enabled = row.sections.propertiesEnabled; writes++; } return { error: fail ? { message: "Unavailable" } : null }; },
      then: (resolve: (value: unknown) => void) => resolve({ data: [{ id: "listing-test", isPublished: true }], error: null }),
    };
    return query;
  }) as unknown as typeof originalFrom;
});
test.afterAll(() => { getSupabaseAdmin().from = originalFrom; });
function request(value: unknown) {
  const token = signSessionPayload({ id: "admin-test", role: "admin", phone: "+919000000000", name: "Test Admin", email: "test@example.test" });
  return new Request("http://localhost/api/site-features", { method: "PUT", headers: { cookie: `road_auth_token=${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ propertiesEnabled: value }) });
}
test("defaults to enabled and persists both transitions", async () => {
  expect(await readSiteFeatures()).toEqual({ propertiesEnabled: true });
  expect((await save(request(false))).status).toBe(200);
  expect(await (await read()).json()).toEqual({ propertiesEnabled: false });
  expect((await save(request(true))).status).toBe(200);
  expect(await readSiteFeatures()).toEqual({ propertiesEnabled: true });
  expect(writes).toBe(2);
});
test("rejects invalid values and does not report failed writes as success", async () => {
  expect((await save(request("false"))).status).toBe(400);
  enabled = false; fail = true;
  expect((await save(request(true))).status).toBe(500);
  expect(enabled).toBe(false);
  expect(writes).toBe(0);
  expect((await read()).status).toBe(503);
});
test("disabled property data and contact actions are unavailable while projects remain accessible", async () => {
  enabled = false;
  expect((await (await listings(new Request("http://localhost/api/listings?type=property"))).json()).data).toEqual([]);
  expect((await (await listings(new Request("http://localhost/api/listings?type=project"))).json()).data).toHaveLength(1);
  await expect(getActionListing("property", "listing-test")).rejects.toThrow("currently unavailable");
});
