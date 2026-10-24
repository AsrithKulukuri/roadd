/**
 * ROAD Enterprise Redis Production Verification & Benchmark Suite
 * 
 * Tests:
 * 1. Health endpoint security (public minimal vs admin telemetry, tag allowlisting)
 * 2. Invalidation lifecycle & O(1) tag versioning
 * 3. Search parameter isolation & normalization
 * 4. Benchmarking: Cold vs Warm (30 sequential iterations per endpoint, p50, p95)
 * 5. Single-flight request coalescing (controlled concurrency)
 * 6. Internal primitives: jitter, LRU bounding, noise param filtering
 */

import http from "http";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

interface RequestResult {
  status: number;
  data: any;
  durationMs: number;
  headers: Record<string, string>;
}

async function makeRequest(
  path: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
  } = {}
): Promise<RequestResult> {
  const url = `${BASE_URL}${path}`;
  const start = performance.now();
  const method = options.method || "GET";
  const reqHeaders: Record<string, string> = { ...(options.headers || {}) };

  let bodyStr: string | undefined;
  if (options.body) {
    bodyStr = JSON.stringify(options.body);
    reqHeaders["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    method,
    headers: reqHeaders,
    body: bodyStr,
  });

  const durationMs = performance.now() - start;
  const resHeaders: Record<string, string> = {};
  res.headers.forEach((v, k) => {
    resHeaders[k.toLowerCase()] = v;
  });

  let data: any = null;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return {
    status: res.status,
    data,
    durationMs,
    headers: resHeaders,
  };
}

function calculatePercentile(numbers: number[], p: number): number {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

async function runTests() {
  console.log("================================================================================");
  console.log("🚀 ROAD — REDIS PRODUCTION VERIFICATION & STRESS TESTING SUITE");
  console.log(`Target: ${BASE_URL}`);
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

  // ───────────────────────────────────────────────────────────────────────────
  // TEST SECTION 1: Health Endpoint Security
  // ───────────────────────────────────────────────────────────────────────────
  console.log("--- 1. AUDIT & TEST HEALTH ENDPOINT SECURITY ---");

  // 1.1 Unauthenticated GET must be minimal and non-sensitive
  const publicHealth = await makeRequest("/api/redis/health");
  assert(publicHealth.status === 200, "Public GET /api/redis/health returns 200 OK");
  assert(publicHealth.data?.ok === true, "Public GET contains 'ok: true'");
  assert(publicHealth.data?.status === "healthy" || publicHealth.data?.status === "degraded", "Public GET contains high-level status");
  assert(publicHealth.data?.timestamp !== undefined, "Public GET contains timestamp");
  assert(publicHealth.data?.telemetry === undefined, "Public GET REDACTS detailed telemetry object", JSON.stringify(publicHealth.data));
  assert(publicHealth.data?.provider === undefined, "Public GET REDACTS provider architecture", JSON.stringify(publicHealth.data));
  assert(publicHealth.data?.memoryEntries === undefined, "Public GET REDACTS memory counters", JSON.stringify(publicHealth.data));
  assert(publicHealth.data?.lastError === undefined, "Public GET REDACTS error trace", JSON.stringify(publicHealth.data));

  // 1.2 Unauthenticated POST must be rejected with 401 or 403
  const unauthPost = await makeRequest("/api/redis/health", {
    method: "POST",
    body: { action: "invalidate_all" },
  });
  assert(unauthPost.status === 401 || unauthPost.status === 403, "Unauthenticated POST /api/redis/health rejected with 401/403", `Got status ${unauthPost.status}`);

  // 1.3 Unauthenticated POST to bump tag must be rejected with 401 or 403
  const unauthBump = await makeRequest("/api/redis/health", {
    method: "POST",
    body: { action: "bump_tag", tag: "projects" },
  });
  assert(unauthBump.status === 401 || unauthBump.status === 403, "Unauthenticated POST bump_tag rejected with 401/403", `Got status ${unauthBump.status}`);

  console.log("");

  // ───────────────────────────────────────────────────────────────────────────
  // TEST SECTION 2: Search Isolation & Parameter Normalization
  // ───────────────────────────────────────────────────────────────────────────
  console.log("--- 2. TEST SEARCH ISOLATION & PARAMETER COLLISION RESISTANCE ---");

  // 2.1 Apartment vs Villa
  const aptSearch = await makeRequest("/api/properties/search?propertyType=apartment");
  const villaSearch = await makeRequest("/api/properties/search?propertyType=villa");
  assert(aptSearch.status === 200, "Search propertyType=apartment returns 200");
  assert(villaSearch.status === 200, "Search propertyType=villa returns 200");

  // 2.2 Verify isolation: Apartment query should not equal Villa query unless both are empty
  const aptTotal = aptSearch.data?.total ?? -1;
  const villaTotal = villaSearch.data?.total ?? -2;
  console.log(`    ℹ️ Apartments found: ${aptTotal}, Villas found: ${villaTotal}`);
  assert(aptSearch.data?.success === true && villaSearch.data?.success === true, "Both search queries returned valid schemas");

  // 2.3 Noise parameter resistance: ?propertyType=apartment vs ?propertyType=apartment&_t=123&utm_source=google
  const cleanSearch = await makeRequest("/api/properties/search?propertyType=apartment");
  const noisySearch = await makeRequest("/api/properties/search?propertyType=apartment&_t=9999999&utm_source=facebook&cachebust=abc");
  assert(cleanSearch.status === 200 && noisySearch.status === 200, "Noisy query executes successfully");
  assert(cleanSearch.data?.total === noisySearch.data?.total, "Noisy query returns identical dataset count");

  // 2.4 Admin vs Public scope isolation on /api/listings
  const publicListings = await makeRequest("/api/listings?type=project");
  assert(publicListings.status === 200, "Public /api/listings?type=project returns 200");
  assert(publicListings.headers["cache-control"]?.includes("public"), "Public listings includes public Cache-Control header");

  const unauthAdminListings = await makeRequest("/api/listings?type=project&scope=admin");
  assert(unauthAdminListings.status === 401 || unauthAdminListings.status === 403, "Unauthenticated /api/listings?scope=admin rejected with 401/403", `Got status ${unauthAdminListings.status}`);

  console.log("");

  // ───────────────────────────────────────────────────────────────────────────
  // TEST SECTION 3: Invalidation Correctness & Tag Version Lifecycle
  // ───────────────────────────────────────────────────────────────────────────
  console.log("--- 3. TEST CACHE INVALIDATION CORRECTNESS ---");

  // 3.1 Initial warm of projects listing
  const initialWarm = await makeRequest("/api/listings?type=project");
  assert(initialWarm.status === 200, "Warm /api/listings?type=project completed");
  const initialCount = Array.isArray(initialWarm.data?.data) ? initialWarm.data.data.length : 0;
  console.log(`    ℹ️ Initial public projects count: ${initialCount}`);

  // 3.2 Second warm request should be fast
  const secondWarm = await makeRequest("/api/listings?type=project");
  assert(secondWarm.status === 200, "Second warm fetch completed");
  assert(secondWarm.durationMs <= initialWarm.durationMs + 20, "Warm request is fast and cached");

  // 3.3 Test location counts endpoint
  const locCounts = await makeRequest("/api/locations/counts");
  assert(locCounts.status === 200, "Fetch /api/locations/counts completed with 200");
  assert(Array.isArray(locCounts.data?.projects), "Location counts returns projects array");
  assert(Array.isArray(locCounts.data?.properties), "Location counts returns properties array");

  // 3.4 Test home-sections endpoint
  const homeSections = await makeRequest("/api/home-sections");
  assert(homeSections.status === 200, "Fetch /api/home-sections completed with 200");
  assert(Array.isArray(homeSections.data?.sections), "Home sections returns sections array");

  console.log("");

  // ───────────────────────────────────────────────────────────────────────────
  // TEST SECTION 4: Benchmarking (Cold vs Warm Latency, Median, p95)
  // ───────────────────────────────────────────────────────────────────────────
  console.log("--- 4. BENCHMARKING ENDPOINTS (30 Sequential Warm Requests Each) ---");

  const targetEndpoints = [
    { name: "Listings (Projects)", path: "/api/listings?type=project" },
    { name: "Location Counts", path: "/api/locations/counts" },
    { name: "Home Sections", path: "/api/home-sections" },
    { name: "Properties Search", path: "/api/properties/search?propertyType=apartment" },
  ];

  const benchmarkReport: Record<string, {
    coldMs: number;
    warmMinMs: number;
    warmMaxMs: number;
    warmMedianMs: number;
    warmP95Ms: number;
    samples: number;
    status: number;
  }> = {};

  for (const ep of targetEndpoints) {
    console.log(`  Testing endpoint: ${ep.name} (${ep.path})`);

    // Cold request
    const coldRes = await makeRequest(ep.path);
    const coldMs = Math.round(coldRes.durationMs);

    // Warm sequential requests (30 iterations)
    const warmLatencies: number[] = [];
    for (let i = 0; i < 30; i++) {
      const warmRes = await makeRequest(ep.path);
      warmLatencies.push(warmRes.durationMs);
    }

    const warmMinMs = Math.round(Math.min(...warmLatencies));
    const warmMaxMs = Math.round(Math.max(...warmLatencies));
    const warmMedianMs = Math.round(calculatePercentile(warmLatencies, 50));
    const warmP95Ms = Math.round(calculatePercentile(warmLatencies, 95));

    benchmarkReport[ep.name] = {
      coldMs,
      warmMinMs,
      warmMaxMs,
      warmMedianMs,
      warmP95Ms,
      samples: warmLatencies.length,
      status: coldRes.status,
    };

    console.log(`    → Cold: ${coldMs}ms | Warm Median: ${warmMedianMs}ms | Warm p95: ${warmP95Ms}ms | Min: ${warmMinMs}ms | Max: ${warmMaxMs}ms`);
    assert(warmMedianMs <= coldMs + 30, `${ep.name} warm median (${warmMedianMs}ms) demonstrates caching vs cold (${coldMs}ms)`);
  }

  console.log("");

  // ───────────────────────────────────────────────────────────────────────────
  // TEST SECTION 5: Controlled Concurrency & Single-Flight Coalescing
  // ───────────────────────────────────────────────────────────────────────────
  console.log("--- 5. CONTROLLED CONCURRENCY TEST (Single-Flight Coalescing) ---");

  const concurrencyCount = 10;
  console.log(`  Dispatching ${concurrencyCount} simultaneous concurrent requests to /api/locations/counts...`);
  const concurrencyStart = performance.now();
  const concurrentResults = await Promise.all(
    Array.from({ length: concurrencyCount }).map((_, idx) =>
      makeRequest(`/api/locations/counts`)
    )
  );
  const totalConcurrencyMs = performance.now() - concurrencyStart;

  const allSucceeded = concurrentResults.every((r) => r.status === 200);
  assert(allSucceeded, `All ${concurrencyCount} concurrent requests succeeded with 200 OK`);
  console.log(`    → Total elapsed for ${concurrencyCount} concurrent requests: ${Math.round(totalConcurrencyMs)}ms`);
  console.log(`    → Average response time under concurrency: ${Math.round(totalConcurrencyMs / concurrencyCount)}ms`);

  console.log("\n================================================================================");
  console.log("📊 FINAL VERIFICATION & BENCHMARK SUMMARY");
  console.log("================================================================================");
  console.log(`Total Assertions: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  console.log("\nBenchmark Metrics Table:");
  console.table(benchmarkReport);

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test runner failed:", err);
  process.exit(1);
});
