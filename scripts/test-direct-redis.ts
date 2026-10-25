import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { setCache, getCache, getRedisTelemetry, invalidateCache } from "../src/lib/redis";

async function main() {
  console.log("Checking Direct Redis Connection...");
  // Give IORedis a moment to establish connection
  await new Promise((r) => setTimeout(r, 600));

  const initialTelemetry = getRedisTelemetry();
  console.log("Initial Telemetry:", initialTelemetry);

  // Write a key
  await setCache("road:test:direct_redis", { verified: true, timestamp: Date.now() }, 120);

  // Read key
  const val = await getCache<{ verified: boolean; timestamp: number }>("road:test:direct_redis");
  console.log("Read from Cache:", val);

  const finalTelemetry = getRedisTelemetry();
  console.log("Final Telemetry:", finalTelemetry);

  // Clean up
  await invalidateCache("road:test:direct_redis");
  console.log("Test key deleted. Direct Redis verification complete!");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
