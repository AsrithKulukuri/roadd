/**
 * Comprehensive verification of Admin endpoints, actions, and invalidation
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";

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
  console.log("🧪 TESTING ADMIN POST OPERATIONS & ALLOWLIST VALIDATION");
  console.log("================================================================================\n");

  const adminToken = generateAdminToken();

  // Test 1: Authenticated POST bump_tag with valid tag "projects"
  console.log("  1. Sending authenticated POST bump_tag for 'projects'...");
  const bumpRes = await fetch("http://localhost:3000/api/redis/health", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ action: "bump_tag", tag: "projects" }),
  });
  const bumpJson = await bumpRes.json();
  console.log(`     Status: ${bumpRes.status}`);
  console.log("     Response Payload:", JSON.stringify(bumpJson, null, 2));

  // Test 2: Authenticated POST with INVALID tag (attempting unauthorized injection)
  console.log("\n  2. Sending authenticated POST bump_tag for unauthorized tag 'users_passwords'...");
  const invalidTagRes = await fetch("http://localhost:3000/api/redis/health", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ action: "bump_tag", tag: "users_passwords" }),
  });
  const invalidTagJson = await invalidTagRes.json();
  console.log(`     Status: ${invalidTagRes.status}`);
  console.log("     Response Payload:", JSON.stringify(invalidTagJson, null, 2));

  // Test 3: Authenticated POST with INVALID action
  console.log("\n  3. Sending authenticated POST with unauthorized action 'flushall'...");
  const invalidActionRes = await fetch("http://localhost:3000/api/redis/health", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ action: "flushall" }),
  });
  const invalidActionJson = await invalidActionRes.json();
  console.log(`     Status: ${invalidActionRes.status}`);
  console.log("     Response Payload:", JSON.stringify(invalidActionJson, null, 2));

  console.log("\n--------------------------------------------------------------------------------");
  if (bumpRes.status === 200 && bumpJson.success === true) {
    console.log(`  ✅ Tag bump succeeded: 'projects' bumped to version ${bumpJson.newVersion}`);
  } else {
    console.log("  ❌ Tag bump FAILED");
  }

  if (invalidTagRes.status === 400) {
    console.log("  ✅ Tag allowlist enforcement verified: Unauthorized tag rejected with HTTP 400.");
  } else {
    console.log(`  ❌ Tag allowlist failed (Status: ${invalidTagRes.status})`);
  }

  if (invalidActionRes.status === 400) {
    console.log("  ✅ Action allowlist enforcement verified: Arbitrary action rejected with HTTP 400.");
  } else {
    console.log(`  ❌ Action allowlist failed (Status: ${invalidActionRes.status})`);
  }
}

run().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
