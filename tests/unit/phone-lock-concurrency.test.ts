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

import { acquireCrossInstancePhoneLock, executeSerializedForPhone } from "../../src/lib/whatsapp/phone-lock";

test("Block A.2: Lock-row table audit and concurrent callers mutual exclusion test", async () => {
  const testPhone = `+91987${Math.floor(1000000 + Math.random() * 9000000)}`;

  // Test 1: executeSerializedForPhone strictly sequences two concurrent tasks
  const trace: string[] = [];
  const task1 = executeSerializedForPhone(testPhone, async () => {
    trace.push("task1_start");
    await new Promise((r) => setTimeout(r, 80));
    trace.push("task1_end");
  });

  const task2 = executeSerializedForPhone(testPhone, async () => {
    trace.push("task2_start");
    await new Promise((r) => setTimeout(r, 20));
    trace.push("task2_end");
  });

  await Promise.all([task1, task2]);

  assert.deepEqual(
    trace,
    ["task1_start", "task1_end", "task2_start", "task2_end"],
    "Task 2 must execute strictly after Task 1 completes"
  );
});

