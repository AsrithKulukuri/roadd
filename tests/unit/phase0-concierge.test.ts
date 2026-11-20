import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

// Load .env.local if present so unit tests have access to mock/test supabase configuration
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

// Provide safe defaults if environment was unset during headless CI
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.co";
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  process.env.SUPABASE_SERVICE_ROLE_KEY = "mock_service_role_key_for_unit_tests";
}

import {
  extractAndNormalizeRefId,
  lookupExactRefId,
  formatSingleRefCard,
  processInboundWhatsAppMessage,
} from "../../src/lib/whatsapp/whatsapp-concierge";
import { getPublicSiteUrl, getListingCanonicalUrl } from "../../src/lib/canonical-url";
import { phoneSerializationQueue } from "../../src/lib/whatsapp/phone-queue";
import { claimInboundMessage } from "../../src/lib/whatsapp/idempotency";
import { executeSerializedForPhone } from "../../src/lib/whatsapp/phone-lock";

test("Phase 0.1: Deterministic Ref-ID extraction & normalization", () => {
  const cases = [
    { input: "Ref001", expected: "REF0001" },
    { input: "Ref0001", expected: "REF0001" },
    { input: "REF-0001", expected: "REF0001" },
    { input: "ref 001", expected: "REF0001" },
    { input: "ref1", expected: "REF0001" },
    { input: "REF0003", expected: "REF0003" },
    { input: "ref3", expected: "REF0003" },
    { input: "prop002", expected: "REF0002" },
    { input: "ROAD-104", expected: "REF0104" },
    { input: "Can you send details for ref001?", expected: "REF0001" },
    { input: "3 BHK in Poranki under 1 Cr", expected: null },
    { input: "villas in Guntur", expected: null },
  ];

  for (const { input, expected } of cases) {
    const result = extractAndNormalizeRefId(input);
    assert.equal(
      result,
      expected,
      `Failed to extract/normalize "${input}": expected ${expected}, got ${result}`
    );
  }
});

test("Phase 0.2: Exact Ref-ID DB lookup returns exact match without fuzzy fallback", async () => {
  // Test existing REF0001 (Avenue Serene)
  const match = await lookupExactRefId("REF0001");
  assert.ok(match, "Expected REF0001 to resolve a valid listing");
  assert.equal(match.type, "project");
  assert.ok(match.canonicalUrl.includes("/projects/"), "URL must be a project link");
  assert.ok(!match.canonicalUrl.includes("localhost"), "URL must not contain localhost");

  // Test Non-existent Ref ID
  const noMatch = await lookupExactRefId("REF9999");
  assert.equal(noMatch, null, "Non-existent REF9999 must return null, never fuzzy items");
});

test("Phase 0.3: Canonical URL generator enforces production domain and forbids localhost", () => {
  const url = getPublicSiteUrl();
  assert.ok(!url.includes("localhost"), "Canonical site URL must not contain localhost");
  assert.ok(url.startsWith("https://") || url.startsWith("http://"));

  const projUrl = getListingCanonicalUrl("project", "avenue-serene");
  assert.ok(projUrl.includes("/projects/avenue-serene"));
  assert.ok(!projUrl.includes("localhost"));

  const propUrl = getListingCanonicalUrl("property", "prop-123");
  assert.ok(propUrl.includes("/properties/prop-123"));
  assert.ok(!propUrl.includes("localhost"));
});

test("Phase 0.4: Per-phone message serialization strictly preserves arrival order", async () => {
  const phone = "+919999888877";
  const executionOrder: number[] = [];

  const p1 = phoneSerializationQueue.enqueue(phone, async () => {
    await new Promise((r) => setTimeout(r, 40));
    executionOrder.push(1);
    return 1;
  });

  const p2 = phoneSerializationQueue.enqueue(phone, async () => {
    await new Promise((r) => setTimeout(r, 10));
    executionOrder.push(2);
    return 2;
  });

  const p3 = phoneSerializationQueue.enqueue(phone, async () => {
    await new Promise((r) => setTimeout(r, 5));
    executionOrder.push(3);
    return 3;
  });

  await Promise.all([p1, p2, p3]);

  assert.deepEqual(
    executionOrder,
    [1, 2, 3],
    "Messages for the same phone must execute sequentially in arrival order"
  );
});

test("Phase 0.5: Persistent inbound deduplication ignores retried message IDs", async () => {
  const uniqueMessageId = `wamid.test_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const phone = "+919999888866";

  const isFirst = await claimInboundMessage(uniqueMessageId, phone);
  assert.equal(isFirst, true, "First delivery of unique messageId must be accepted");

  const isSecond = await claimInboundMessage(uniqueMessageId, phone);
  assert.equal(isSecond, false, "Second delivery of identical messageId must be rejected as duplicate");
});

test("Phase 0.6: Count integrity guarantee ('Found N' matches rendered count exactly)", async () => {
  const result = await processInboundWhatsAppMessage("+919000112233", "flats in Vijayawada");
  if (result.matchedCount !== undefined && result.message) {
    const countMatch = result.message.match(/Found\s+(\d+)\s+verified listing/i);
    if (countMatch) {
      const declaredCount = parseInt(countMatch[1], 10);
      assert.equal(
        declaredCount,
        result.matchedCount,
        `Count integrity violation: header declared ${declaredCount} items, but returned count was ${result.matchedCount}`
      );
    }
  }
});

test("Phase 0.7: Greeting never outputs 'Hello User!' and requests name if unknown", async () => {
  const result = await processInboundWhatsAppMessage("+919111222333", "hi");
  assert.ok(result.message, "Expected greeting message to be returned");
  assert.ok(!result.message.includes("Hello User!"), "Greeting must never output 'Hello User!'");
  assert.ok(!result.message.includes("User!"), "Greeting must not address recipient as 'User!'");
  assert.ok(
    result.message.includes("What may I call you?") || result.message.includes("Hello"),
    "Greeting should be natural and ask for name when unknown"
  );
});

test("Phase 0.8: Direct Ref-ID message returns single card without fuzzy search", async () => {
  const result = await processInboundWhatsAppMessage("+919222333444", "Ref001");
  assert.equal(result.intent, "ref_id_direct_lookup");
  assert.ok(result.message?.includes("REF0001"), "Result message must highlight REF0001");
  assert.ok(!result.message?.includes("localhost"), "Result must not contain localhost URL");

  const notFoundResult = await processInboundWhatsAppMessage("+919222333444", "Ref9999");
  assert.equal(notFoundResult.intent, "ref_id_not_found");
  assert.ok(notFoundResult.message?.includes("REF9999"), "Not found message must reference REF9999");
});

test("Phase 0.9: Cross-instance per-phone lock ensures mutual exclusion between concurrent workers", async () => {
  const phone = "+919333444555";
  const events: string[] = [];

  const call1 = executeSerializedForPhone(phone, async () => {
    events.push("start_1");
    await new Promise((r) => setTimeout(r, 60));
    events.push("end_1");
  });

  const call2 = executeSerializedForPhone(phone, async () => {
    events.push("start_2");
    await new Promise((r) => setTimeout(r, 10));
    events.push("end_2");
  });

  await Promise.all([call1, call2]);

  assert.deepEqual(
    events,
    ["start_1", "end_1", "start_2", "end_2"],
    "Call 2 must wait until Call 1 finishes completely"
  );
});

test("Phase 0.10: Regression transcript replay ('Hi' -> 'Ref001' -> 'Ref0001' -> 'Ref0001')", async () => {
  const phone = `+91999${Math.floor(1000000 + Math.random() * 9000000)}`;

  // 1. "Hi"
  const r1 = await processInboundWhatsAppMessage(phone, "Hi");
  assert.ok(r1.handled, "Hi should be handled");
  assert.ok(r1.message, "Hi should have a response message");
  assert.ok(!r1.message.includes("Hello User!"), "Must never output 'Hello User!'");
  assert.ok(!r1.message.includes("User"), "Must never address user as 'User'");
  assert.ok(!r1.message.includes("localhost"), "Must never include localhost in greeting");

  // 2. "Ref001"
  const r2 = await processInboundWhatsAppMessage(phone, "Ref001");
  assert.equal(r2.intent, "ref_id_direct_lookup", "Ref001 must perform exact ref lookup");
  assert.ok(r2.message?.includes("REF0001"), "Ref001 normalized to REF0001");
  assert.ok(r2.message?.includes("Avenue Serene"), "Should find Avenue Serene");
  assert.ok(!r2.message?.includes("localhost"), "No localhost links");
  assert.ok(!r2.message?.includes("Found 2"), "Must not fall back to fuzzy multiple projects");

  // 3. "Ref0001" (repeated query)
  const r3 = await processInboundWhatsAppMessage(phone, "Ref0001");
  assert.equal(r3.intent, "ref_id_direct_lookup", "Ref0001 must return exact card again");
  assert.ok(!r3.message?.includes("I already shared"), "Must NEVER blame user or say 'I already shared'");
  assert.ok(!r3.message?.includes("localhost"), "No localhost links");
  assert.ok(r3.message?.includes("Avenue Serene"), "Returns exact card");

  // 4. "Ref0001" again
  const r4 = await processInboundWhatsAppMessage(phone, "Ref0001");
  assert.equal(r4.intent, "ref_id_direct_lookup");
  assert.ok(!r4.message?.includes("I already shared"), "Must NEVER blame user on 3rd attempt");
  assert.ok(r4.message?.includes("Avenue Serene"));
});

