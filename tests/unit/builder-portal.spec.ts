import { test, expect } from "@playwright/test";
import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { signSessionPayload, verifySignedSessionToken } from "@/lib/server-auth-guard";
import { ownsProject, projectAccess } from "@/lib/builder-access";
import { verificationEvidenceSchema } from "@/lib/builder-validation";
import { PATCH as saveProject } from "@/app/api/builder/projects/route";
import { GET as report } from "@/app/api/projects/activity/report/route";
import { POST as login } from "@/app/api/builder/login/route";
import { POST as message } from "@/app/api/builder/chat/route";
import { PATCH as review } from "@/app/api/builder/requests/route";

test.describe.configure({ mode: "serial" });
const builder = { id: "builder-a", company_name: "Builder A", assigned_project_ids: ["project-a"], contact_email: "builder@example.test" };
const project = { id: "project-a", slug: "plot-a", projectType: "venture" };
let originalFrom: ReturnType<typeof getSupabaseAdmin>["from"];
let writes: Array<{ table: string; payload: unknown }> = [];
let failWrite = false;
function session() {
  const user = { id: builder.id, phone: "+919000000001", role: "developer", builderSessionVersion: 2 };
  return { cookie: "road_auth_token=" + signSessionPayload(user), "Content-Type": "application/json" };
}
test.beforeAll(() => {
  process.env.SESSION_SECRET = "isolated-test-session-secret-at-least-32-characters";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:1";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "isolated-test-service-key";
  originalFrom = getSupabaseAdmin().from;
});
test.beforeEach(() => {
  writes = []; failWrite = false;
  getSupabaseAdmin().from = ((table: string) => {
    let rows: Record<string, any>[] = table === "builder_profiles" ? [builder] : table === "projects" ? [project, { id: "project-ab", slug: "plot-ab" }] : [];
    let mutation = false;
    const query: any = {
      select: () => query, order: () => query, limit: () => query, or: () => query,
      eq: (key: string, value: unknown) => { rows = rows.filter(row => row[key] === value); return query; },
      update: (payload: unknown) => { mutation = true; writes.push({ table, payload }); return query; },
      insert: (payload: any) => { mutation = true; writes.push({ table, payload }); rows = [payload]; return query; },
      single: async () => ({ data: rows[0] || null, error: mutation && failWrite ? { message: "fixture write failure" } : null }),
      maybeSingle: async () => ({ data: rows[0] || null, error: null }),
      then: (resolve: (value: unknown) => void) => resolve({ data: rows, error: null }),
    };
    return query;
  }) as typeof originalFrom;
});
test.afterAll(() => { getSupabaseAdmin().from = originalFrom; });

test("assignment matching rejects empty and partial identifiers", () => {
  expect(ownsProject(["project-a"], project)).toBe(true);
  expect(ownsProject(["plot-a"], project)).toBe(true);
  expect(ownsProject(["project"], project)).toBe(false);
  expect(ownsProject([""], project)).toBe(false);
  expect(ownsProject(["project-a"], { id: "project-ab" })).toBe(false);
});
test("old insecure developer sessions must authenticate again", () => {
  const legacyPayload = { id: builder.id, phone: "", role: "developer", builderId: builder.id };
  const old = signSessionPayload(legacyPayload);
  expect(verifySignedSessionToken(old)).toBeNull();
});
test("phone-only builder login cannot create a session", async () => {
  const response = await login(new Request("http://localhost/api/builder/login", { method: "POST", body: JSON.stringify({ phone: "+919000000001" }) }));
  expect(response.status).toBe(400);
  expect(response.headers.get("set-cookie")).toBeNull();
});
test("anonymous reports do not expose members", async () => {
  const response = await report(new NextRequest("http://localhost/api/projects/activity/report?projectId=project-a"));
  expect(response.status).toBe(401);
  expect((await response.json()).sharedMembers).toBeUndefined();
});
test("a builder cannot read another project or mix project ID and slug", async () => {
  const request = new Request("http://localhost", { headers: session() });
  await expect(projectAccess(request, "project-ab")).rejects.toMatchObject({ status: 403 });
  await expect(projectAccess(request, "project-a", "plot-ab")).rejects.toMatchObject({ status: 403 });
  expect((await projectAccess(request, "project-a")).project.id).toBe("project-a");
});
test("project saving rejects approval fields and reports database failures", async () => {
  const request = (payload: unknown) => new Request("http://localhost/api/builder/projects", { method: "PATCH", headers: session(), body: JSON.stringify({ projectId: "project-a", payload }) });
  expect((await saveProject(request({ crdaApproved: true }))).status).toBe(400);
  expect(writes).toHaveLength(0);
  failWrite = true;
  expect((await saveProject(request({ description: "Updated description" }))).status).toBe(503);
});
test("chat sender role is derived from the session", async () => {
  const response = await message(new Request("http://localhost/api/builder/chat", { method: "POST", headers: session(), body: JSON.stringify({ builderId: builder.id, senderRole: "admin", message: "Test message" }) }));
  expect(response.status).toBe(200);
  expect(writes[0].payload).toMatchObject({ sender_role: "builder", builder_id: builder.id });
});
test("builders cannot approve their own requests", async () => {
  const response = await review(new Request("http://localhost/api/builder/requests", { method: "PATCH", headers: session(), body: JSON.stringify({ id: "request-a", status: "approved" }) }));
  expect(response.status).toBe(403);
  expect(writes).toHaveLength(0);
});
test("verification rejects demo references, missing boundaries and invalid dimensions", () => {
  const proof = { crdaLpNumber: "LP 42/2024", surveyNumber: "142/2B", plotDimensions: "30 × 60 ft", north: "30 ft road", south: "30 ft plot", east: "60 ft plot", west: "60 ft plot", borewell: "no", electricity: "yes", facing: "East", roadWidth: 40, documentPath: "builder/project/file.pdf" };
  expect(verificationEvidenceSchema.safeParse(proof).success).toBe(true);
  expect(verificationEvidenceSchema.safeParse({ ...proof, crdaLpNumber: "CRDA-DEMO-001" }).success).toBe(false);
  expect(verificationEvidenceSchema.safeParse({ ...proof, north: "" }).success).toBe(false);
  expect(verificationEvidenceSchema.safeParse({ ...proof, plotDimensions: "0 × 60 ft" }).success).toBe(false);
});
