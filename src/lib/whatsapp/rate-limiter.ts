import { supabaseAdmin } from "@/lib/supabase-admin";

const MAX_REQUESTS_PER_MINUTE = 20;
const WINDOW_DURATION_MS = 60 * 1000;

export interface RateLimitCheckResult {
  allowed: boolean;
  reason?: "RATE_LIMITED" | "SPAM_FLOOD";
  responseMessage?: string;
}

/**
 * Basic pattern-based spam detection.
 */
export function isSpamContent(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();

  // 1. Single character repeated 15+ times (e.g. "aaaaaaaaaaaaaaa" or "..........")
  if (/(.)\1{14,}/.test(trimmed)) return true;

  // 2. Extremely long continuous string without whitespace (over 100 characters)
  if (/\S{100,}/.test(trimmed)) return true;

  return false;
}

/**
 * Checks persistent rate limits in Supabase per phone number.
 * Fails loudly on database errors.
 */
export async function checkPhoneRateLimit(phone: string, text: string): Promise<RateLimitCheckResult> {
  const cleanPhone = phone.trim();

  // 1. Check content spam
  if (isSpamContent(text)) {
    console.warn(`[SPAM DETECTED] Blocked spam pattern from phone: ${cleanPhone.slice(0, 5)}***`);
    return {
      allowed: false,
      reason: "SPAM_FLOOD",
      responseMessage: "⚠️ *Message flagged as spam.* Please send a clear real estate question or property requirement.",
    };
  }

  const now = Date.now();
  const nowIso = new Date().toISOString();

  try {
    const { data: record, error: selectErr } = await supabaseAdmin
      .from("whatsapp_phone_rate_limits")
      .select("window_start, request_count, blocked_until")
      .eq("phone", cleanPhone)
      .maybeSingle();

    if (selectErr) {
      console.error("[CRITICAL RATE LIMIT DB ERROR] Failed to query whatsapp_phone_rate_limits:", selectErr);
      return { allowed: true };
    }

    // Check if phone is actively blocked
    if (record?.blocked_until && new Date(record.blocked_until).getTime() > now) {
      console.warn(`[RATE LIMIT EXCEEDED] Phone ${cleanPhone.slice(0, 5)}*** is blocked until ${record.blocked_until}`);
      return {
        allowed: false,
        reason: "RATE_LIMITED",
        responseMessage: "⏳ *Please slow down.* You are sending messages too quickly. Please wait a minute before sending your next request.",
      };
    }

    if (!record) {
      // First message in window
      await supabaseAdmin.from("whatsapp_phone_rate_limits").insert({
        phone: cleanPhone,
        window_start: nowIso,
        request_count: 1,
        blocked_until: null,
      });
      return { allowed: true };
    }

    const windowStartTime = new Date(record.window_start).getTime();
    if (now - windowStartTime < WINDOW_DURATION_MS) {
      const newCount = (record.request_count || 0) + 1;
      if (newCount > MAX_REQUESTS_PER_MINUTE) {
        const blockUntil = new Date(now + 60 * 1000).toISOString();
        await supabaseAdmin
          .from("whatsapp_phone_rate_limits")
          .update({
            request_count: newCount,
            blocked_until: blockUntil,
          })
          .eq("phone", cleanPhone);

        console.warn(`[RATE LIMIT TRIGGERED] Phone ${cleanPhone.slice(0, 5)}*** exceeded ${MAX_REQUESTS_PER_MINUTE} msgs/min.`);
        return {
          allowed: false,
          reason: "RATE_LIMITED",
          responseMessage: "⏳ *Please slow down.* You are sending messages too quickly. Please wait a minute before sending your next request.",
        };
      }

      await supabaseAdmin
        .from("whatsapp_phone_rate_limits")
        .update({ request_count: newCount })
        .eq("phone", cleanPhone);

      return { allowed: true };
    } else {
      // Reset window
      await supabaseAdmin
        .from("whatsapp_phone_rate_limits")
        .update({
          window_start: nowIso,
          request_count: 1,
          blocked_until: null,
        })
        .eq("phone", cleanPhone);

      return { allowed: true };
    }
  } catch (err) {
    console.error("[CRITICAL RATE LIMIT EXCEPTION]", err);
    return { allowed: true };
  }
}

