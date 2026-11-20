import { supabaseAdmin } from "@/lib/supabase-admin";

// Fast in-memory L1 cache to avoid redundant DB roundtrips for rapid webhook delivery retries
const l1DedupCache = new Map<string, number>();
const L1_TTL_MS = 60 * 1000; // 60 seconds

function cleanL1Cache() {
  const now = Date.now();
  for (const [key, timestamp] of l1DedupCache.entries()) {
    if (now - timestamp > L1_TTL_MS) {
      l1DedupCache.delete(key);
    }
  }
}

/**
 * Claims a WhatsApp inbound message ID (wamid) atomically.
 *
 * Rules:
 * - Only Postgres error code 23505 (unique_violation) means "duplicate, skip silently" (returns false).
 * - Any other error (missing table, connection failure, DB error) logs an error and fails open: returns true (process anyway).
 */
export async function claimInboundMessage(messageId: string, phone: string): Promise<boolean> {
  const cleanId = String(messageId || "").trim();
  if (!cleanId) return true; // Can't dedup empty IDs, process anyway

  const now = Date.now();
  cleanL1Cache();

  // 1. Layer 1 In-Memory Fast Check
  if (l1DedupCache.has(cleanId)) {
    console.log(`[DEDUP L1] Skipping duplicate message ${cleanId}`);
    return false;
  }

  // 2. Layer 2 Supabase Persistent Unique Constraint
  try {
    const { error } = await supabaseAdmin
      .from("whatsapp_inbound_idempotency")
      .insert({
        provider_message_id: cleanId,
        phone: phone || "unknown",
        processed_at: new Date().toISOString(),
      });

    if (error) {
      // Postgres error 23505 = unique_violation (duplicate message)
      if (error.code === "23505" || error.message?.includes("duplicate key")) {
        l1DedupCache.set(cleanId, now);
        console.log(`[DEDUP L2] Persistent duplicate detected for ${cleanId}`);
        return false;
      }

      // Any other error (missing table, connection failure, permission denied):
      // Log loudly as an error and FAIL OPEN: process the message anyway!
      console.error(`[CRITICAL DEDUP FAILURE] whatsapp_inbound_idempotency error (failing open):`, {
        code: error.code,
        message: error.message,
        details: error.details,
      });

      return true; // Fail open
    }

    // Success: register in L1 cache
    l1DedupCache.set(cleanId, now);
    return true;
  } catch (err) {
    // Fail loudly on unexpected exceptions and FAIL OPEN
    console.error(`[CRITICAL DEDUP EXCEPTION] Failed idempotency insert for message ${cleanId} (failing open):`, err);
    return true; // Fail open
  }
}

/**
 * Resets memory cache for unit testing
 */
export function _resetL1DedupCache() {
  l1DedupCache.clear();
}
