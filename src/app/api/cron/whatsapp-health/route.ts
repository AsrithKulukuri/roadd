import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

/**
 * Constant-time comparison to prevent timing attacks on CRON_SECRET.
 */
function isAuthorizedCron(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    // If running in production and CRON_SECRET is missing, deny all requests
    if (process.env.NODE_ENV === "production") {
      return false;
    }
    // In local development or testing, allow if not set
    return true;
  }

  const authHeader = request.headers.get("authorization") || "";
  const customHeader = request.headers.get("x-cron-secret") || "";

  let providedSecret = "";
  if (authHeader.startsWith("Bearer ")) {
    providedSecret = authHeader.slice(7).trim();
  } else if (customHeader) {
    providedSecret = customHeader.trim();
  }

  if (!providedSecret) return false;

  const expectedBuffer = Buffer.from(cronSecret);
  const providedBuffer = Buffer.from(providedSecret);

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}

export async function GET(request: Request) {
  // Require valid CRON_SECRET header
  if (!isAuthorizedCron(request)) {
    return NextResponse.json(
      { error: "Unauthorized: Missing or invalid CRON_SECRET authorization header" },
      { status: 401 }
    );
  }

  const start = Date.now();
  const checks: Record<string, { status: "pass" | "fail"; latencyMs: number; details?: string }> = {};

  // 1. Supabase Database & Idempotency Table Check
  const dbStart = Date.now();
  try {
    const { error } = await supabaseAdmin
      .from("whatsapp_inbound_idempotency")
      .select("provider_message_id")
      .limit(1);

    if (error && error.code !== "PGRST116") {
      checks.database_idempotency = {
        status: "fail",
        latencyMs: Date.now() - dbStart,
        details: error.message,
      };
    } else {
      checks.database_idempotency = {
        status: "pass",
        latencyMs: Date.now() - dbStart,
      };
    }
  } catch (err: any) {
    checks.database_idempotency = {
      status: "fail",
      latencyMs: Date.now() - dbStart,
      details: err?.message || String(err),
    };
  }

  // 2. Conversation State Table Check
  const stateStart = Date.now();
  try {
    const { error } = await supabaseAdmin
      .from("whatsapp_conversation_state")
      .select("phone")
      .limit(1);

    checks.database_conversation_state = {
      status: error ? "fail" : "pass",
      latencyMs: Date.now() - stateStart,
      details: error?.message,
    };
  } catch (err: any) {
    checks.database_conversation_state = {
      status: "fail",
      latencyMs: Date.now() - stateStart,
      details: err?.message,
    };
  }

  // 3. Meta WhatsApp API Credentials Check
  const metaPhoneId = process.env.META_WHATSAPP_PHONE_NUMBER_ID || process.env.META_PHONE_NUMBER_ID;
  const metaToken = process.env.META_WHATSAPP_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN;
  const isMetaConfigured = Boolean(metaPhoneId && metaToken && !metaToken.includes("placeholder"));

  checks.meta_whatsapp_config = {
    status: isMetaConfigured ? "pass" : "fail",
    latencyMs: 0,
    details: isMetaConfigured
      ? `Configured with Phone ID: ${metaPhoneId?.slice(0, 4)}***`
      : "Missing or placeholder Meta credentials",
  };

  const allPassed = Object.values(checks).every((c) => c.status === "pass");
  const overallLatency = Date.now() - start;

  return NextResponse.json(
    {
      status: allPassed ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      durationMs: overallLatency,
      checks,
    },
    { status: allPassed ? 200 : 503 }
  );
}
