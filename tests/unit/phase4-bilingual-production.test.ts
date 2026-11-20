import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

// Load .env.local if present
try {
  if (fs.existsSync(".env.local")) {
    const envContent = fs.readFileSync(".env.local", "utf8");
    for (const line of envContent.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = trimmed.match(/^([\w.-]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
} catch {}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.co";
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  process.env.SUPABASE_SERVICE_ROLE_KEY = "mock_service_role_key_for_unit_tests";
}

import { detectLanguage, getLocalizedGreeting } from "../../src/lib/whatsapp/bilingual-engine";
import { GET as healthCheckGet } from "../../src/app/api/cron/whatsapp-health/route";

test("Phase 4.1: Bilingual language auto-detection (Telugu Script, Tenglish, English)", () => {
  // Telugu Script
  assert.equal(detectLanguage("విజయవాడ లో 3 BHK ఫ్లాట్లు"), "te");
  assert.equal(detectLanguage("నాకు పోరంకి లో ఇల్లు కావాలి"), "te");

  // Tenglish (Romanized Telugu)
  assert.equal(detectLanguage("poranki lo 3bhk kavali"), "tenglish");
  assert.equal(detectLanguage("budget 80 lakhs lo em unnai"), "tenglish");
  assert.equal(detectLanguage("guntur lo villas unnaaya"), "tenglish");
  assert.equal(detectLanguage("namaskaram andi"), "tenglish");

  // English
  assert.equal(detectLanguage("3 BHK flats in Poranki under 80 Lakhs"), "en");
  assert.equal(detectLanguage("show details for REF0001"), "en");
  assert.equal(detectLanguage("book site visit tomorrow"), "en");
});

test("Phase 4.2: Localized greeting generation", () => {
  const teGreet = getLocalizedGreeting("te", "Ramesh");
  assert.ok(teGreet.includes("నమస్కారం Ramesh"));
  assert.ok(teGreet.includes("స్వాగతం"));

  const tenglishGreet = getLocalizedGreeting("tenglish", "Suresh");
  assert.ok(tenglishGreet.includes("Namaskaram Suresh"));
  assert.ok(tenglishGreet.includes("verified properties"));

  const enGreet = getLocalizedGreeting("en", "Anil");
  assert.ok(enGreet.includes("Hi Anil"));
  assert.ok(!enGreet.includes("User!"));
});

test("Phase 4.3: Synthetic health-check endpoint evaluates system connectivity and requires CRON_SECRET", async () => {
  // Test unauthorized access when CRON_SECRET is set
  process.env.CRON_SECRET = "production_cron_secret_key_12345";

  const unauthReq = new Request("http://localhost:3000/api/cron/whatsapp-health");
  const unauthRes = await healthCheckGet(unauthReq);
  assert.equal(unauthRes.status, 401, "Expected 401 Unauthorized when CRON_SECRET is missing");

  // Test authorized access with Bearer header
  const authReq = new Request("http://localhost:3000/api/cron/whatsapp-health", {
    headers: {
      Authorization: "Bearer production_cron_secret_key_12345",
    },
  });
  const authRes = await healthCheckGet(authReq);
  const data = await authRes.json();

  assert.ok(authRes.status === 200 || authRes.status === 503);
  assert.ok(data.timestamp);
  assert.ok(data.checks);
  assert.ok(data.checks.database_idempotency);
  assert.ok(data.checks.meta_whatsapp_config);

  delete process.env.CRON_SECRET;
});

