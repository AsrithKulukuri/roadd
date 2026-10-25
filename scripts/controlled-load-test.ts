import autocannon from "autocannon";
import os from "node:os";

export interface LoadTestResult {
  endpoint: string;
  connections: number;
  durationSeconds: number;
  totalRequests: number;
  requestsPerSecond: number;
  latencyMedianMs: number;
  latencyP95Ms: number;
  latencyP99Ms: number;
  latencyMaxMs: number;
  errorCount: number;
  timeoutCount: number;
  throughputMbPerSec: number;
}

const TEST_TARGETS = [
  { name: "Homepage (Static Cached HTML)", url: "http://localhost:3000/", connections: 10, duration: 8 },
  { name: "API: Home Sections (Cached)", url: "http://localhost:3000/api/home-sections", connections: 10, duration: 8 },
  { name: "API: Listings (Direct Redis Cached)", url: "http://localhost:3000/api/listings?type=project", connections: 10, duration: 8 },
];

function runSingleLoadTest(target: typeof TEST_TARGETS[0]): Promise<LoadTestResult> {
  return new Promise((resolve, reject) => {
    console.log(`\n⏳ Running controlled test on [${target.name}] (${target.connections} connections, ${target.duration}s)...`);

    const instance = autocannon(
      {
        url: target.url,
        connections: target.connections,
        duration: target.duration,
        pipelining: 1,
      },
      (err, result) => {
        if (err) return reject(err);

        const r: LoadTestResult = {
          endpoint: target.name,
          connections: target.connections,
          durationSeconds: target.duration,
          totalRequests: result.requests.total,
          requestsPerSecond: Math.round(result.requests.average),
          latencyMedianMs: Number(result.latency.p50.toFixed(2)),
          latencyP95Ms: Number((result.latency.p97_5 || result.latency.p90 || result.latency.average).toFixed(2)),
          latencyP99Ms: Number(result.latency.p99.toFixed(2)),
          latencyMaxMs: Number(result.latency.max.toFixed(2)),
          errorCount: result.errors,
          timeoutCount: result.timeouts,
          throughputMbPerSec: Number((result.throughput.average / 1024 / 1024).toFixed(2)),
        };

        console.log(`   ✅ Finished [${target.name}]: ${r.requestsPerSecond} req/s | Median: ${r.latencyMedianMs}ms | p95: ${r.latencyP95Ms}ms | p99: ${r.latencyP99Ms}ms | Errors: ${r.errorCount}`);
        resolve(r);
      }
    );

    autocannon.track(instance, { renderProgressBar: false });
  });
}

async function main() {
  console.log("================================================================================");
  console.log("🔥 ROAD — PHASE 6: CONTROLLED LOCAL LOAD TESTING");
  console.log(`   Host CPUs: ${os.cpus().length} cores | Free Memory: ${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)} GB`);
  console.log("================================================================================");

  const results: LoadTestResult[] = [];

  for (const target of TEST_TARGETS) {
    try {
      const res = await runSingleLoadTest(target);
      results.push(res);
      // Brief cooldown between targets
      await new Promise((r) => setTimeout(r, 1000));
    } catch (err: any) {
      console.error(`❌ Load test failed for ${target.name}:`, err?.message);
    }
  }

  console.log("\n================================================================================");
  console.log("📊 LOAD TESTING BENCHMARK SUMMARY");
  console.log("================================================================================");
  console.table(
    results.map((r) => ({
      Target: r.endpoint,
      "Connections": r.connections,
      "Req/sec": r.requestsPerSecond,
      "Median (ms)": r.latencyMedianMs,
      "p95 (ms)": r.latencyP95Ms,
      "p99 (ms)": r.latencyP99Ms,
      "Max (ms)": r.latencyMaxMs,
      "Errors": r.errorCount,
      "Throughput (MB/s)": r.throughputMbPerSec,
    }))
  );

  import("fs").then((fs) => {
    fs.writeFileSync("scripts/load-test-results.json", JSON.stringify(results, null, 2));
    console.log("Load test results saved to scripts/load-test-results.json");
  });
}

main().catch((err) => {
  console.error("Load test runner failed:", err);
  process.exit(1);
});
