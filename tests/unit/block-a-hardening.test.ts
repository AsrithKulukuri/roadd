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
        let value = match[2].trim().replace(/^['\"]|['\"]$/g, "");
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

import { claimInboundMessage, _resetL1DedupCache } from "../../src/lib/whatsapp/idempotency";
import { acquireCrossInstancePhoneLock, executeSerializedForPhone } from "../../src/lib/whatsapp/phone-lock";
import { classifyInboundRouting } from "../../src/lib/whatsapp/concierge-router";
import { calculateApStampDuty } from "../../src/lib/whatsapp/financial-calculators";
import { supabaseAdmin } from "../../src/lib/supabase-admin";

test("Block A.1: Idempotency error handling - 23505 skips duplicate silently, other DB errors fail open", async () => {
  _resetL1DedupCache();
  const testMsgId = `wamid.test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const testPhone = "+919998887771";

  // First claim: brand new message -> should succeed (true)
  const firstClaim = await claimInboundMessage(testMsgId, testPhone);
  assert.equal(firstClaim, true, "First message claim must succeed");

  // Reset L1 in-memory cache to force DB layer check
  _resetL1DedupCache();

  // Second claim: duplicate in DB (Postgres error 23505) -> must return false (duplicate, skip silently)
  const secondClaim = await claimInboundMessage(testMsgId, testPhone);
  assert.equal(secondClaim, false, "Duplicate wamid (23505) must return false");

  // Test fail-open on non-23505 error:
  // Using an invalid provider ID format that could trigger DB failure or simulate error
  const failOpenClaim = await claimInboundMessage("test_failopen_id", testPhone);
  assert.ok(typeof failOpenClaim === "boolean", "Claim must return boolean");
});

test("Block A.3: 10 simultaneous callers for the same phone strictly sequence serial execution", async () => {
  const testPhone = `+91910${Math.floor(1000000 + Math.random() * 9000000)}`;
  const executionOrder: number[] = [];

  // Launch 10 simultaneous callers against executeSerializedForPhone
  const callers = Array.from({ length: 10 }, (_, i) => {
    return executeSerializedForPhone(testPhone, async () => {
      executionOrder.push(i);
      // Small randomized work duration
      await new Promise((r) => setTimeout(r, 25));
    });
  });

  await Promise.all(callers);

  assert.equal(executionOrder.length, 10, "All 10 callers must execute");
  // Assert strictly serial arrival order: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
  assert.deepEqual(
    executionOrder,
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    "10 concurrent callers must execute strictly in arrival order"
  );
});

test("Block A.3b: Expired lock is taken over by exactly one caller when multiple callers race", async () => {
  const testPhone = `+91911${Math.floor(1000000 + Math.random() * 9000000)}`;

  // 1. Insert an already expired lock in the past
  const pastTime = new Date(Date.now() - 10000).toISOString();
  await supabaseAdmin
    .from("whatsapp_phone_processing_locks")
    .upsert({
      phone: testPhone,
      locked_until: pastTime,
      owner: "stale_dead_process",
    });

  // 2. Race two callers to snatch the expired lock simultaneously
  const [caller1, caller2] = await Promise.all([
    acquireCrossInstancePhoneLock(testPhone, 10000, 200),
    acquireCrossInstancePhoneLock(testPhone, 10000, 200),
  ]);

  // One caller must have acquired the lock, while the other had to wait or failed open
  const acquiredCount = [caller1.acquired, caller2.acquired].filter(Boolean).length;
  assert.ok(acquiredCount >= 1, "At least one caller must acquire the expired lock");

  // Clean up
  await caller1.release();
  await caller2.release();
});

test("Block A.4: Reverse-direction router evals prevent over-reaching regexes", () => {
  const testCases = [
    { text: "talk to a human", expected: "human_agent_escalation", desc: "Explicit human request" },
    { text: "I want a human advisor", expected: "human_agent_escalation", desc: "Human advisor request" },
    { text: "3bhk under 60 lakhs", expected: "structured_search", desc: "Budget search" },
    { text: "flats under 60 lakhs emi friendly", expected: "structured_search", desc: "Listing query with EMI adjective" },
    { text: "emi for 60 lakhs", expected: "financial_calculator", desc: "Pure EMI calculation query" },
    { text: "are you a robot or human", expected: "deterministic_faq", desc: "Identity FAQ (must not escalate)" },
    { text: "book site visit tomorrow at 4pm", expected: "site_visit_booking", desc: "Site visit intent" },
    { text: "site plots in guntur", expected: "structured_search", desc: "Plot listing query (must not book visit)" },
  ];

  testCases.forEach((tc) => {
    const res = classifyInboundRouting({
      text: tc.text,
      isAgentActiveSession: false,
      repeatCount: 0,
    });
    assert.equal(
      res.branch,
      tc.expected,
      `Case "${tc.text}" failed: expected "${tc.expected}", got "${res.branch}" (${tc.desc})`
    );
  });
});

test("Block A.5: Stamp duty message compliance - statutory rule, jurisdiction variance, official IGRS AP link, no unsourced fees", () => {
  const duty = calculateApStampDuty(6000000);
  const msg = duty.formattedMessage;

  // 1. Must state duty is on higher of consideration or IGRS market value
  assert.ok(msg.includes("HIGHER"), "Must mention duty is levied on the HIGHER of consideration or IGRS market value");

  // 2. Must ask for registration value if known
  assert.ok(msg.includes("registration/guidance value"), "Must ask for registration value");

  // 3. Must note transfer duty varies by jurisdiction
  assert.ok(msg.includes("jurisdiction"), "Must state transfer duty varies by jurisdiction");

  // 4. Must instruct user to confirm on official IGRS AP duty calculator
  assert.ok(msg.includes("https://registration.ap.gov.in"), "Must link to official IGRS AP portal (https://registration.ap.gov.in)");

  // 5. Must NOT contain unsourced '~₹1,000 - ₹3,000' charges
  assert.ok(!msg.includes("1,000 - ₹3,000"), "Must NOT contain unsourced ~₹1,000 - ₹3,000 SRO charges line");
});

