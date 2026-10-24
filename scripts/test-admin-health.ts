/**
 * Test authenticated admin diagnostic path on GET /api/redis/health
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";

// Manually load .env.local into process.env before running
const envPath = path.resolve(process.cwd(), ".env.local");
let sessionSecret = "";
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
      if (key === "SESSION_SECRET") sessionSecret = val;
    }
  }
}

function generateAdminToken(): string {
  const payload = {
    id: "admin-sre-verifier",
    phone: "9999999999",
    name: "SRE Admin Verifier",
    email: "admin@road.com",
    role: "admin",
    exp: Date.now() + 24 * 3600 * 1000,
  };
  const b64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", sessionSecret)
    .update(b64)
    .digest("base64url");
  return `${b64}.${signature}`;
}

async function run() {
  console.log("================================================================================");
  console.log("🔍 TESTING AUTHENTICATED ADMIN ACCESS TO /api/redis/health");
  console.log("================================================================================\n");

  const adminToken = generateAdminToken();

  console.log("  1. Sending GET /api/redis/health with Bearer <Admin Signed Session Token>...");
  const adminRes = await fetch("http://localhost:3000/api/redis/health", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });

  const adminJson = await adminRes.json();
  console.log(`     Status: ${adminRes.status}`);
  console.log("     Response Payload:", JSON.stringify(adminJson, null, 2));

  console.log("\n  2. Sending unauthenticated public GET /api/redis/health...");
  const publicRes = await fetch("http://localhost:3000/api/redis/health");
  const publicJson = await publicRes.json();
  console.log(`     Status: ${publicRes.status}`);
  console.log("     Response Payload:", JSON.stringify(publicJson, null, 2));

  const isAdminAuthenticated = adminRes.status === 200 && adminJson?.telemetry !== undefined;
  const isPublicRestricted = publicRes.status === 200 && publicJson?.telemetry === undefined;

  console.log("\n--------------------------------------------------------------------------------");
  if (isAdminAuthenticated) {
    console.log("  ✅ Admin diagnostic access confirmed: Detailed telemetry exposed ONLY to admin.");
    console.log(`     Reported Provider: ${adminJson.telemetry.provider}`);
    console.log(`     Reported Connection Status: ${adminJson.telemetry.status}`);
    console.log(`     Reported Hits: ${adminJson.telemetry.hits}`);
    console.log(`     Reported Misses: ${adminJson.telemetry.misses}`);
    console.log(`     Reported Memory Entries: ${adminJson.telemetry.memoryEntries}`);
  } else {
    console.log("  ❌ Admin diagnostic access FAILED.");
  }

  if (isPublicRestricted) {
    console.log("  ✅ Public health access confirmed: Telemetry is strictly REDACTED for public users.");
  } else {
    console.log("  ❌ Public telemetry redaction FAILED.");
  }
}

run().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
