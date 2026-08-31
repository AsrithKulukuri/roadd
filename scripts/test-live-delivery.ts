import fs from "node:fs";
import path from "node:path";

// Load .env.local
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

import { getSupabaseAdmin } from "../src/lib/supabase-admin";
import { WasenderService } from "../src/lib/wasender";
import { OTPCryptoService } from "../src/lib/otp";

async function testLiveFlow() {
  const targetPhone = "+918074674228"; // Authorized test number
  const maskedPhone = `${targetPhone.slice(0, 4)}****${targetPhone.slice(-3)}`;
  const requestId = `test_live_${Date.now()}`;

  console.log(`[TEST] Starting live WhatsApp OTP flow for ${maskedPhone}...`);

  // Step 1: Secure 6-digit OTP generation & hashing
  const rawOTP = OTPCryptoService.generateOTP();
  const otpHash = OTPCryptoService.hashOTP(rawOTP);
  const expiresAt = new Date(Date.now() + 300 * 1000).toISOString();

  // Step 2: Persistence in Supabase
  const client = getSupabaseAdmin();
  await client.from("phone_otps").delete().eq("phone", targetPhone);

  const { error: dbError } = await client.from("phone_otps").insert({
    phone: targetPhone,
    otp_hash: otpHash,
    expires_at: expiresAt,
    attempts: 0,
    verified: false,
  });

  if (dbError) {
    console.error("❌ Database persistence failed:", dbError);
    process.exit(1);
  }

  console.log("[OTP_FLOW] Database persistence succeeded; invoking Wasender");

  // Step 3: Dispatch via Wasender
  const wasenderResult = await WasenderService.sendOTPMessage(targetPhone, rawOTP, { requestId });

  console.log(
    `[OTP_FLOW] Wasender completed status=${wasenderResult.statusCode || (wasenderResult.success ? 200 : "ERROR")} success=${wasenderResult.success} requestId=${requestId}`
  );

  if (!wasenderResult.success) {
    console.error("❌ Wasender dispatch failed:", wasenderResult.error);
    process.exit(1);
  }

  console.log("✅ Wasender successfully dispatched OTP to WhatsApp!");

  // Step 4: Verification Simulation
  const { data: records, error: fetchErr } = await client
    .from("phone_otps")
    .select("*")
    .eq("phone", targetPhone)
    .eq("verified", false)
    .limit(1);

  if (fetchErr || !records || records.length === 0) {
    console.error("❌ Could not fetch persisted OTP for verification");
    process.exit(1);
  }

  const isValid = OTPCryptoService.verifyOTP(rawOTP, records[0].otp_hash);
  if (!isValid) {
    console.error("❌ Hash verification failed!");
    process.exit(1);
  }
  console.log("✅ OTP successfully verified against stored cryptographic hash!");

  // Step 5: Clean up record
  await client.from("phone_otps").delete().eq("phone", targetPhone);
  console.log("✅ OTP record cleaned up. End-to-end flow confirmed working!");
}

testLiveFlow().catch((e) => {
  console.error("Live test failed:", e);
  process.exit(1);
});
