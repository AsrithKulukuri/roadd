export interface ApiEndpointAudit {
  endpoint: string;
  status: number;
  coldLatencyMs: number;
  warmLatencyMs: number;
  payloadBytes: number;
  cacheControl: string | null;
  speedup: string;
}

const API_ENDPOINTS = [
  "/api/redis/health",
  "/api/listings",
  "/api/properties/search?city=vijayawada",
  "/api/locations/counts",
  "/api/content/locations",
  "/api/content/categories",
  "/api/site-features",
  "/api/home-sections",
];

async function measureEndpoint(baseUrl: string, path: string): Promise<ApiEndpointAudit> {
  const url = `${baseUrl}${path}`;

  // 1. Cold Call
  const t0 = performance.now();
  const resCold = await fetch(url, { headers: { "Accept": "application/json" } });
  const coldLatencyMs = performance.now() - t0;
  const status = resCold.status;
  const bodyCold = await resCold.text();
  const payloadBytes = Buffer.byteLength(bodyCold, "utf8");
  const cacheControl = resCold.headers.get("cache-control");

  // 2. Warm Call
  const t1 = performance.now();
  const resWarm = await fetch(url, { headers: { "Accept": "application/json" } });
  const warmLatencyMs = performance.now() - t1;
  await resWarm.text();

  const speedup = (coldLatencyMs / Math.max(1, warmLatencyMs)).toFixed(1);

  return {
    endpoint: path,
    status,
    coldLatencyMs: Math.round(coldLatencyMs),
    warmLatencyMs: Math.round(warmLatencyMs),
    payloadBytes,
    cacheControl,
    speedup: `${speedup}x`,
  };
}

async function main() {
  const baseUrl = process.env.BASE_URL || "http://localhost:3000";
  console.log("================================================================================");
  console.log("🚀 ROAD — PHASE 5: API & DATABASE ENDPOINT PERFORMANCE AUDIT");
  console.log(`   Base URL: ${baseUrl}`);
  console.log("================================================================================\n");

  const results: ApiEndpointAudit[] = [];

  for (const ep of API_ENDPOINTS) {
    try {
      const res = await measureEndpoint(baseUrl, ep);
      results.push(res);
      console.log(`📡 [${res.endpoint}] Status: ${res.status} | Cold: ${res.coldLatencyMs}ms | Warm: ${res.warmLatencyMs}ms (${res.speedup}) | Size: ${(res.payloadBytes / 1024).toFixed(1)} KB`);
    } catch (err: any) {
      console.error(`❌ [${ep}] Failed:`, err?.message);
    }
  }

  console.log("\n================================================================================");
  console.log("📊 API ENDPOINTS PERFORMANCE SUMMARY");
  console.log("================================================================================");
  console.table(
    results.map((r) => ({
      Endpoint: r.endpoint,
      Status: r.status,
      "Cold Latency (ms)": r.coldLatencyMs,
      "Warm Latency (ms)": r.warmLatencyMs,
      Speedup: r.speedup,
      "Size (KB)": (r.payloadBytes / 1024).toFixed(1),
      "Cache-Control": r.cacheControl || "none",
    }))
  );

  import("fs").then((fs) => {
    fs.writeFileSync("scripts/api-audit-results.json", JSON.stringify(results, null, 2));
    console.log("API audit data saved to scripts/api-audit-results.json");
  });
}

main().catch((err) => {
  console.error("API audit failed:", err);
  process.exit(1);
});
