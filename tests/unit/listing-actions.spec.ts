import { test, expect } from "@playwright/test";
import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { signSessionPayload } from "@/lib/server-auth-guard";
import { WasenderService } from "@/lib/wasender";
import { POST as action } from "@/app/api/listing-actions/route";
import { POST as visit } from "@/app/api/projects/schedule-visit/route";
import { GET as listings } from "@/app/api/listings/route";
import { GET as leads } from "@/app/api/listing-leads/route";
import { publicListing } from "@/lib/public-listing";

test.describe.configure({ mode: "serial" });
const user = { id: "buyer-a", name: "Verified Buyer", phone: "+919000000001", email: "buyer@example.test", role: "buyer" };
const project = { id: "project-a", slug: "plot-a", name: "Test Project", isPublished: true, builderPhone: "+919000000002", brochureUrl: "https://example.test/brochure.pdf" };
let originalFrom: ReturnType<typeof getSupabaseAdmin>["from"];
let originalSend: typeof WasenderService.sendTextMessage;
let writes: Array<{ table: string; payload: any }> = [];
let messages: Array<{ phone: string; message: string }> = [];
let failure: string | null = null;
function request(body: unknown, authenticated = true) {
  return new NextRequest("http://localhost/api/listing-actions", { method: "POST", headers: { "Content-Type": "application/json", ...(authenticated ? { cookie: "road_auth_token=" + signSessionPayload(user) } : {}) }, body: JSON.stringify(body) });
}
const payload = { listingType: "project", listingId: project.id, action: "reveal_phone", consent: true };
test.beforeAll(() => {
  process.env.SESSION_SECRET = "isolated-test-session-secret-at-least-32-characters";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:1";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "isolated-test-service-key";
  process.env.ADMIN_WHATSAPP_PHONE = "+919000000003";
  originalFrom = getSupabaseAdmin().from;
  originalSend = WasenderService.sendTextMessage;
});
test.beforeEach(() => {
  writes = []; messages = []; failure = null;
  getSupabaseAdmin().from = ((table: string) => {
    let rows: any[] = table === "projects" ? [project] : [];
    let mutation = false;
    const result = () => ({ data: rows, error: mutation && failure ? { code: failure } : null });
    const query: any = {
      select: () => query, order: () => query, limit: () => query, or: () => query,
      eq: (key: string, value: unknown) => { rows = rows.filter(row => row[key] === value); return query; },
      in: (key: string, values: unknown[]) => { rows = rows.filter(row => values.includes(row[key])); return query; },
      insert: (value: any) => { mutation = true; writes.push({ table, payload: value }); rows = [{ id: "lead-a", ...value }]; return query; },
      update: (value: any) => { writes.push({ table, payload: value }); return query; },
      single: async () => ({ ...result(), data: failure ? null : rows[0] || null }),
      maybeSingle: async () => ({ ...result(), data: rows[0] || null }),
      then: (resolve: (value: unknown) => void) => resolve(result()),
    };
    return query;
  }) as typeof originalFrom;
  WasenderService.sendTextMessage = (async (phone: string, message: string) => {
    expect(writes.some(write => write.table === "listing_action_leads" || write.table === "project_site_visits")).toBe(true);
    messages.push({ phone, message });
    return { success: true };
  }) as typeof originalSend;
});
test.afterAll(() => { getSupabaseAdmin().from = originalFrom; WasenderService.sendTextMessage = originalSend; });

test("anonymous contact and visit requests do not create or send leads", async () => {
  expect((await action(request(payload, false))).status).toBe(401);
  expect((await visit(request({}, false))).status).toBe(401);
  expect(writes).toHaveLength(0); expect(messages).toHaveLength(0);
});
test("reveal records verified identity and notifies only database recipient and configured admin", async () => {
  const response = await action(request(payload));
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ phone: "919000000002", duplicate: false });
  expect(writes[0].payload).toMatchObject({ buyer_name: user.name, buyer_phone: user.phone, buyer_email: user.email, action: "reveal_phone", listing_id: project.id });
  expect(messages.map(message => message.phone)).toEqual(["919000000002", "919000000003"]);
  expect(messages[0].message).toContain(user.name);
});
test("forged identity or recipient and missing consent are rejected", async () => {
  expect((await action(request({ ...payload, buyerPhone: "+919000000009", builderPhone: "+919000000008" }))).status).toBe(400);
  expect((await action(request({ ...payload, consent: false }))).status).toBe(400);
  expect(messages).toHaveLength(0);
});
test("storage failure does not reveal contact or send messages", async () => {
  failure = "XX000";
  const response = await action(request(payload));
  expect(response.status).toBe(503);
  expect((await response.json()).phone).toBeUndefined();
  expect(messages).toHaveLength(0);
});
test("duplicate daily action does not send another notification", async () => {
  failure = "23505";
  const response = await action(request(payload));
  expect(response.status).toBe(200);
  expect((await response.json()).duplicate).toBe(true);
  expect(messages).toHaveLength(0);
});
test("public payload removes nested contacts and brochure links", async () => {
  const response = await listings(new Request("http://localhost/api/listings?type=project"));
  const data = await response.json();
  expect(data.data[0]).toMatchObject({ id: project.id, hasBrochure: true });
  expect(data.data[0].builderPhone).toBeUndefined();
  expect(data.data[0].brochureUrl).toBeUndefined();
  expect(publicListing({ builder: { phone: "secret", email: "secret", name: "Builder" } })).toEqual({ builder: { name: "Builder" } });
});
test("buyers cannot read the builder or admin lead inbox", async () => {
  expect((await leads(new Request("http://localhost/api/listing-leads", { headers: { cookie: "road_auth_token=" + signSessionPayload(user) } }))).status).toBe(403);
});
test("visit identity comes from session, persists before notification and deduplicates", async () => {
  const body = { projectId: project.id, projectName: project.name, customerName: "Forged", customerPhone: "+919000000009", visitDate: "2026-10-10", timeSlot: "11:00 AM", consent: true };
  expect((await visit(request(body))).status).toBe(200);
  expect(writes[0].payload).toMatchObject({ customer_name: user.name, customer_phone: "919000000001" });
  expect(messages.map(message => message.phone)).toEqual(["919000000001", "919000000002", "919000000003"]);
  messages = []; failure = "23505";
  expect((await visit(request(body))).status).toBe(200);
  expect(messages).toHaveLength(0);
});
