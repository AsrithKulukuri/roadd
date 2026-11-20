import { supabaseAdmin } from "@/lib/supabase-admin";
import { phoneSerializationQueue } from "@/lib/whatsapp/phone-queue";

export interface LockAcquisitionResult {
  acquired: boolean;
  owner: string;
  release: () => Promise<void>;
  failedOpen?: boolean;
}

/**
 * Acquires a cross-instance distributed lock for a phone number using the lock-row table
 * whatsapp_phone_processing_locks (phone, locked_until, owner).
 *
 * Rules:
 * (a) Taking over an expired lock is a conditional UPDATE ... WHERE phone = ? AND locked_until = <old value>, with a row-count check (.select()).
 * (b) TTL is at least 60 seconds (default 60000ms), and is extended via a heartbeat while processing continues.
 * (c) Waiting callers have a bounded timeout (maxWaitMs, default 10000ms) and a defined outcome: never infinite wait, fail-open on timeout with warning log.
 * (d) If the lock table errors or is unavailable, fail open: process the message and log an error.
 */
export async function acquireCrossInstancePhoneLock(
  phone: string,
  timeoutMs = 60000, // (b) TTL at least 60 seconds
  maxWaitMs = 10000   // (c) Bounded timeout
): Promise<LockAcquisitionResult> {
  const cleanPhone = phone.trim();
  const startTime = Date.now();
  const owner = `inst_${process.pid || "node"}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  let attempt = 0;
  let heartbeatTimer: NodeJS.Timeout | null = null;

  const startHeartbeat = () => {
    // Extend lock every 20s while processing continues
    heartbeatTimer = setInterval(async () => {
      try {
        const renewedUntil = new Date(Date.now() + timeoutMs).toISOString();
        await supabaseAdmin
          .from("whatsapp_phone_processing_locks")
          .update({ locked_until: renewedUntil })
          .eq("phone", cleanPhone)
          .eq("owner", owner);
      } catch (hbErr) {
        console.warn("[PHONE LOCK HEARTBEAT WARNING]", hbErr);
      }
    }, 20000);
  };

  const createReleaseCallback = () => {
    return async () => {
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
      try {
        await supabaseAdmin
          .from("whatsapp_phone_processing_locks")
          .delete()
          .eq("phone", cleanPhone)
          .eq("owner", owner);
      } catch (relErr) {
        console.warn("[PHONE LOCK RELEASE WARNING]", relErr);
      }
    };
  };

  while (Date.now() - startTime < maxWaitMs) {
    attempt++;
    const lockedUntil = new Date(Date.now() + timeoutMs).toISOString();

    try {
      // 1. Attempt initial insert
      const { data: insertData, error: insertErr } = await supabaseAdmin
        .from("whatsapp_phone_processing_locks")
        .insert({
          phone: cleanPhone,
          locked_until: lockedUntil,
          owner,
        })
        .select("phone, owner");

      if (!insertErr && insertData && insertData.length > 0) {
        startHeartbeat();
        return {
          acquired: true,
          owner,
          release: createReleaseCallback(),
        };
      }

      // If error is NOT a unique constraint violation (code 23505), fail open
      if (insertErr && insertErr.code !== "23505") {
        console.error(`[PHONE LOCK TABLE ERROR] Lock table insert error:`, insertErr);
        // (d) If the lock table errors, fail open: process message anyway
        return {
          acquired: false,
          owner,
          failedOpen: true,
          release: async () => {},
        };
      }

      // 2. Row exists -> Check if previous lock has expired (TTL exceeded)
      const { data: existing, error: selectErr } = await supabaseAdmin
        .from("whatsapp_phone_processing_locks")
        .select("locked_until, owner")
        .eq("phone", cleanPhone)
        .maybeSingle();

      if (selectErr) {
        console.error(`[PHONE LOCK TABLE ERROR] Lock table select error:`, selectErr);
        // (d) Fail open on error
        return {
          acquired: false,
          owner,
          failedOpen: true,
          release: async () => {},
        };
      }

      if (existing && new Date(existing.locked_until).getTime() < Date.now()) {
        // (a) Conditional UPDATE with old locked_until and row-count check
        const { data: updatedRows, error: updateErr } = await supabaseAdmin
          .from("whatsapp_phone_processing_locks")
          .update({
            locked_until: lockedUntil,
            owner,
          })
          .eq("phone", cleanPhone)
          .eq("locked_until", existing.locked_until)
          .select("phone, owner");

        if (!updateErr && updatedRows && updatedRows.length === 1) {
          // Exactly one caller successfully snatched the expired lock
          startHeartbeat();
          return {
            acquired: true,
            owner,
            release: createReleaseCallback(),
          };
        }
      }
    } catch (exc) {
      console.error("[PHONE LOCK EXCEPTION] Unexpected error during lock acquisition:", exc);
      // (d) Fail open on unexpected exception
      return {
        acquired: false,
        owner,
        failedOpen: true,
        release: async () => {},
      };
    }

    // Jittered backoff (40ms - 150ms)
    const wait = Math.min(150, 40 + attempt * 15) + Math.floor(Math.random() * 20);
    await new Promise((r) => setTimeout(r, wait));
  }

  // (c) Bounded timeout elapsed: log warning and fail open so message is never silently dropped
  console.warn(`[PHONE LOCK TIMEOUT] Phone lock wait timeout (${maxWaitMs}ms) exceeded for ${cleanPhone}. Failing open to prevent message drop.`);
  return {
    acquired: false,
    owner,
    failedOpen: true,
    release: async () => {},
  };
}

/**
 * High-level runner: executes task serialized per phone.
 * Combines in-memory FIFO queue with cross-instance PostgreSQL lock.
 */
export async function executeSerializedForPhone<T>(
  phone: string,
  task: () => Promise<T>
): Promise<T> {
  return phoneSerializationQueue.enqueue(phone, async () => {
    const lock = await acquireCrossInstancePhoneLock(phone, 60000, 4000);
    try {
      return await task();
    } finally {
      await lock.release();
    }
  });
}
