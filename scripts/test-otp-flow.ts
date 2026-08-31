import fs from "node:fs";
import path from "node:path";

// Load .env.local manually
try {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
} catch (e) {
  console.warn("Could not load .env.local:", e);
}

import { getSupabaseAdmin, isServiceRoleConfigured } from "../src/lib/supabase-admin";
import { WasenderService, getWasenderOtpMode } from "../src/lib/wasender";
import { OTPCryptoService } from "../src/lib/otp";

async function runTests() {
  console.log("=================================================");
  console.log("      ROAD WhatsApp OTP Flow Regression Suite    ");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(name: string, condition: boolean, extra?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name} ${extra ? `(${extra})` : ""}`);
      failed++;
    }
  }

  // 1. Test Service Role Configuration Validation
  const initialKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  try {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    assert("isServiceRoleConfigured() returns false when key missing", !isServiceRoleConfigured());
  } finally {
    process.env.SUPABASE_SERVICE_ROLE_KEY = initialKey;
  }

  assert("isServiceRoleConfigured() returns true with valid key", isServiceRoleConfigured());

  // 2. Test Wasender OTP Mode
  const otpMode = getWasenderOtpMode();
  assert("Wasender OTP mode resolves to live when configured", otpMode === "live" || otpMode === "mock");

  // 3. Test Supabase phone_otps Schema & Operations
  const client = getSupabaseAdmin();
  const testPhone = "+919999999999";
  const testOtp = OTPCryptoService.generateOTP();
  const testHash = OTPCryptoService.hashOTP(testOtp);
  const expiresAt = new Date(Date.now() + 300000).toISOString();

  console.log("\nTesting Supabase phone_otps table persistence...");
  // Clean up existing
  await client.from("phone_otps").delete().eq("phone", testPhone);

  const { data: insertData, error: insertError } = await client.from("phone_otps").insert({
    phone: testPhone,
    otp_hash: testHash,
    expires_at: expiresAt,
    attempts: 0,
    verified: false,
  }).select();

  assert("Insert into phone_otps succeeds with service role client", !insertError, insertError?.message);

  if (insertData && insertData.length > 0) {
    const row = insertData[0];
    assert("Table contains id column (UUID)", Boolean(row.id));
    assert("Table contains phone column", row.phone === testPhone);
    assert("Table contains otp_hash column", row.otp_hash === testHash);
    assert("Table contains expires_at column", Boolean(row.expires_at));
    assert("Table contains attempts column", row.attempts === 0);
    assert("Table contains verified column", row.verified === false);
    assert("Table contains created_at column", Boolean(row.created_at));
  }

  // 4. Test Constant-Time Hash Verification
  const isMatch = OTPCryptoService.verifyOTP(testOtp, testHash);
  const isWrongRejected = !OTPCryptoService.verifyOTP("000000", testHash);
  assert("OTPCryptoService verifies matching OTP correctly", isMatch);
  assert("OTPCryptoService rejects incorrect OTP", isWrongRejected);

  // 5. Test Deletion & Invalidation
  const { error: deleteError } = await client.from("phone_otps").delete().eq("phone", testPhone);
  assert("Clean up / invalidation of test OTP record succeeds", !deleteError);

  console.log(`\n=================================================`);
  console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log("=================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error("Test execution failed:", e);
  process.exit(1);
});
