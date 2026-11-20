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

import {
  extractAllRefIds,
  resolveAnaphoricQuery,
  formatMultiPropertyComparisonCard,
} from "../../src/lib/whatsapp/property-intelligence";
import {
  getConversationState,
  updateConversationState,
  mergeSearchContext,
} from "../../src/lib/whatsapp/conversation-state";
import { processInboundWhatsAppMessage } from "../../src/lib/whatsapp/whatsapp-concierge";

test("Phase 2.1: Multi-property ID extraction captures multiple distinct identifiers", () => {
  const cases = [
    {
      input: "compare REF0001 and REF0002",
      expected: ["REF0001", "REF0002"],
    },
    {
      input: "details of ref 001, ref003 and prop104",
      expected: ["REF0001", "REF0003", "REF0104"],
    },
    {
      input: "what is difference between ref1 and ref3",
      expected: ["REF0001", "REF0003"],
    },
    {
      input: "just 3bhk in poranki",
      expected: [],
    },
  ];

  for (const { input, expected } of cases) {
    const result = extractAllRefIds(input);
    assert.deepEqual(result.sort(), expected.sort(), `Failed for "${input}"`);
  }
});

test("Phase 2.2: Side-by-side comparison card formatting", () => {
  const mockItems = [
    {
      refId: "REF0001",
      type: "project" as const,
      canonicalUrl: "https://www.roadfacing.com/projects/avenue-serene",
      item: {
        name: "Avenue Serene",
        location: "Poranki, Vijayawada",
        minPrice: 7500000,
        maxPrice: 9500000,
        configurations: [{ label: "3 BHK", bedrooms: 3 }],
        status: "under-construction",
      },
    },
    {
      refId: "REF0002",
      type: "project" as const,
      canonicalUrl: "https://www.roadfacing.com/projects/bs-heights",
      item: {
        name: "BS Heights",
        location: "Patamata, Vijayawada",
        minPrice: 8500000,
        maxPrice: 12000000,
        configurations: [{ label: "3 BHK", bedrooms: 3 }, { label: "4 BHK", bedrooms: 4 }],
        status: "ready-to-move",
      },
    },
  ];

  const card = formatMultiPropertyComparisonCard(mockItems);
  assert.ok(card.includes("REF0001 vs REF0002"), "Header must include compared IDs");
  assert.ok(card.includes("Avenue Serene"), "Option 1 title");
  assert.ok(card.includes("BS Heights"), "Option 2 title");
  assert.ok(card.includes("Poranki"), "Option 1 location");
  assert.ok(card.includes("Patamata"), "Option 2 location");
  assert.ok(card.includes("https://www.roadfacing.com/projects/avenue-serene"));
  assert.ok(card.includes("https://www.roadfacing.com/projects/bs-heights"));
  assert.ok(!card.includes("localhost"), "Never localhost");
});

test("Phase 2.3: Contextual anaphoric query resolution ('show the second one', 'compare 1 and 2')", () => {
  const displayed = ["REF0001", "REF0002", "REF0003"];

  // 1. "show the second one"
  const r1 = resolveAnaphoricQuery("show the second one", displayed);
  assert.equal(r1.isAnaphoric, true);
  assert.equal(r1.type, "single_selection");
  assert.equal(r1.targetRefId, "REF0002");

  // 2. "open #1"
  const r2 = resolveAnaphoricQuery("open #1", displayed);
  assert.equal(r2.isAnaphoric, true);
  assert.equal(r2.targetRefId, "REF0001");

  // 3. "compare 1 and 2"
  const r3 = resolveAnaphoricQuery("compare 1 and 2", displayed);
  assert.equal(r3.isAnaphoric, true);
  assert.equal(r3.type, "comparison");
  assert.deepEqual(r3.compareRefIds, ["REF0001", "REF0002"]);

  // 4. "ready to move only"
  const r4 = resolveAnaphoricQuery("ready to move only", displayed);
  assert.equal(r4.isAnaphoric, true);
  assert.equal(r4.type, "refinement");
  assert.equal(r4.refinementFilters?.readyToMoveOnly, true);
});

test("Phase 2.4: Conversation state memory slot updates and retrieval", async () => {
  const phone = `+91988${Math.floor(1000000 + Math.random() * 9000000)}`;

  await updateConversationState({
    phone,
    lastDisplayedRefIds: ["REF0001", "REF0002"],
    preferredLocation: "Poranki",
    preferredBhk: 3,
    maxBudget: 8000000,
    stage: "discovery",
  });

  const state = await getConversationState(phone);
  assert.deepEqual(state.lastDisplayedRefIds, ["REF0001", "REF0002"]);
  assert.equal(state.preferredLocation, "Poranki");
  assert.equal(state.preferredBhk, 3);
  assert.equal(state.maxBudget, 8000000);
  assert.equal(state.stage, "discovery");
});

test("Phase 2.5: Multi-turn dialogue: search -> follow-up 'show the second one' -> comparison", async () => {
  const phone = `+91977${Math.floor(1000000 + Math.random() * 9000000)}`;

  // Turn 1: Search properties in Vijayawada
  const t1 = await processInboundWhatsAppMessage(phone, "flats in Vijayawada");
  assert.ok(t1.handled);
  assert.ok(t1.message);

  // Turn 2: Follow-up asking for the second one
  const t2 = await processInboundWhatsAppMessage(phone, "show the second one");
  assert.ok(t2.handled, "Second one follow-up should be handled");
  assert.ok(t2.message?.includes("REF"), "Response should present the selected Ref ID");
  assert.ok(!t2.message?.includes("localhost"));

  // Turn 3: Multi-property comparison
  const t3 = await processInboundWhatsAppMessage(phone, "compare REF0001 and REF0002");
  assert.equal(t3.intent, "multi_property_comparison");
  assert.ok(t3.message?.includes("REF0001 vs REF0002"));
  assert.ok(t3.message?.includes("Avenue Serene"));
  assert.ok(t3.message?.includes("BS Heights"));
});

