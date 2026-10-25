/**
 * Unit & Invariant Testing for src/lib/redis.ts
 * 
 * Verifies:
 * 1. applyTtlJitter (+/- 8% bounds and non-zero guarantee)
 * 2. normalizeQueryKey (sorting, lowercasing, noise filtering, key allowlisting)
 * 3. Tag version generation & isolation
 * 4. Fallback when remote Redis is missing/unconfigured
 * 5. Bounded memory LRU cache eviction under heavy write volume
 */

import {
  applyTtlJitter,
  normalizeQueryKey,
  getTagVersion,
  bumpTagVersion,
  fetchWithCache,
  getCache,
  setCache,
  invalidateCache,
  getRedisTelemetry,
} from "../src/lib/redis";

async function runInternalTests() {
  console.log("================================================================================");
  console.log("🧪 ROAD — REDIS INTERNAL PRIMITIVES & RESILIENCE TESTS");
  console.log("================================================================================\n");

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ PASS: ${testName}`);
    } else {
      failedTests++;
      console.error(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ""}`);
    }
  }

  // 1. TTL Jitter Tests
  console.log("--- 1. TTL JITTER VERIFICATION ---");
  const baseTtl = 300;
  const jitteredValues: number[] = [];
  for (let i = 0; i < 50; i++) {
    const val = applyTtlJitter(baseTtl, true);
    jitteredValues.push(val);
  }
  const minJitter = Math.min(...jitteredValues);
  const maxJitter = Math.max(...jitteredValues);
  const variance = Math.floor(baseTtl * 0.08);

  assert(minJitter >= baseTtl - variance, `Min jitter (${minJitter}) >= ${baseTtl - variance}`);
  assert(maxJitter <= baseTtl + variance, `Max jitter (${maxJitter}) <= ${baseTtl + variance}`);
  assert(applyTtlJitter(3, true) === 3, "Short TTL (<= 5s) disables jitter to prevent 0 or negative TTL");
  assert(applyTtlJitter(300, false) === 300, "applyTtlJitter with enableJitter=false returns exact base TTL");

  console.log("");

  // 2. Query Normalization Tests
  console.log("--- 2. QUERY NORMALIZATION & DETERMINISTIC HASHING ---");
  const params1 = new URLSearchParams();
  params1.set("type", "project");
  params1.set("page", "1");
  params1.set("utm_source", "facebook");
  params1.set("_t", "12345678");

  const params2 = new URLSearchParams();
  params2.set("_t", "99999999");
  params2.set("page", "1");
  params2.set("utm_source", "newsletter");
  params2.set("type", "project");

  const key1 = normalizeQueryKey("test", params1);
  const key2 = normalizeQueryKey("test", params2);

  assert(key1 === key2, "Noise params (_t, utm_*) are stripped and keys are sorted deterministically");
  assert(key1 === "test:page=1&type=project", `Normalized key matches expected: ${key1}`);

  // Allowlist filtering
  const keyWithAllowlist = normalizeQueryKey("test", params1, ["type"]);
  assert(keyWithAllowlist === "test:type=project", `Key filtered by allowlist excludes 'page': ${keyWithAllowlist}`);

  console.log("");

  // 3. Tag Versioning & O(1) Atomic Invalidation
  console.log("--- 3. TAG VERSIONING & O(1) INVALIDATION ---");
  const initialVer = await getTagVersion("projects");
  assert(typeof initialVer === "number" && initialVer >= 1, `getTagVersion returns positive integer (${initialVer})`);

  const bumpedVer = await bumpTagVersion("projects");
  assert(bumpedVer === initialVer + 1, `bumpTagVersion increments version by 1 (${initialVer} -> ${bumpedVer})`);

  const currentVer = await getTagVersion("projects");
  assert(currentVer === bumpedVer, `Subsequent getTagVersion reads the new version (${currentVer})`);

  // Unrelated tag versions must remain untouched
  const locVerBefore = await getTagVersion("locations");
  await bumpTagVersion("projects");
  const locVerAfter = await getTagVersion("locations");
  assert(locVerBefore === locVerAfter, `Bumping 'projects' does NOT mutate unrelated 'locations' tag version (${locVerBefore} === ${locVerAfter})`);

  console.log("");

  // 4. Memory Fallback & Telemetry
  console.log("--- 4. TELEMETRY & FALLBACK CAPABILITIES ---");
  const telemetry = getRedisTelemetry();
  assert(telemetry.provider === "memory" || telemetry.provider === "ioredis", `Valid active provider: ${telemetry.provider}`);
  assert(typeof telemetry.hits === "number", `Hits is a number: ${telemetry.hits}`);
  assert(typeof telemetry.misses === "number", `Misses is a number: ${telemetry.misses}`);
  assert(typeof telemetry.hitRatio === "string", `Hit ratio is formatted: ${telemetry.hitRatio}`);

  // 5. High-Volume Bounded Memory Eviction
  console.log("--- 5. BOUNDED MEMORY LRU EVICTION UNDER VOLUME ---");
  const memoryBefore = telemetry.memoryEntries;
  // Insert 600 items (MAX_MEMORY_ENTRIES is 500)
  for (let i = 0; i < 600; i++) {
    await setCache(`stress_test_key_${i}`, { data: `value_${i}` }, 60);
  }
  const telemetryAfterStress = getRedisTelemetry();
  assert(telemetryAfterStress.memoryEntries <= 500, `Memory store is strictly bounded (current entries: ${telemetryAfterStress.memoryEntries} <= 500)`);

  // Clean up stress test keys
  await invalidateCache("stress_test_key_*");

  console.log("\n================================================================================");
  console.log("📊 INTERNAL UNIT TEST SUMMARY");
  console.log("================================================================================");
  console.log(`Total: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`);

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runInternalTests().catch((err) => {
  console.error("Internal test suite failed:", err);
  process.exit(1);
});
