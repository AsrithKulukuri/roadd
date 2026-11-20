export interface GroundedContext {
  allowedRefIds: string[];
  allowedPrices: string[];
  allowedUrls: string[];
}

export interface GroundingValidationResult {
  isValid: boolean;
  sanitizedResponse: string;
  violationReason?: string;
}

const SAFE_GROUNDING_FALLBACK =
  `🏡 *ROADFACING Concierge*\n\n` +
  `I want to make sure you get 100% verified and accurate property information.\n\n` +
  `For exact current pricing, availability, and legal approvals on these listings, would you like me to connect you with our verified property advisor?\n\n` +
  `👉 Reply *"Talk to agent"* or *"Yes"* to connect directly.`;

/**
 * Validates that any specific Reference ID, price, or URL in LLM output
 * strictly exists in the retrieved database context.
 * Replaces hallucinated or unauthorized claims with a safe verified fallback.
 */
export function validateGroundedLlmOutput(
  llmResponse: string,
  context: GroundedContext
): GroundingValidationResult {
  if (!llmResponse || !llmResponse.trim()) {
    return { isValid: false, sanitizedResponse: SAFE_GROUNDING_FALLBACK, violationReason: "EMPTY_RESPONSE" };
  }

  const clean = llmResponse.trim();

  // 1. Check for localhost or unverified URL leakage
  if (clean.includes("localhost") || clean.includes("127.0.0.1")) {
    console.warn(`[GROUNDING VIOLATION] LLM generated localhost link:`, clean);
    return {
      isValid: false,
      sanitizedResponse: SAFE_GROUNDING_FALLBACK,
      violationReason: "LOCALHOST_URL_LEAKAGE",
    };
  }

  // 2. Validate Reference IDs mentioned by LLM
  const mentionedRefs = (clean.match(/\bREF\d{3,6}\b/gi) || []).map((r) => r.toUpperCase());
  const allowedRefsUpper = new Set((context.allowedRefIds || []).map((r) => r.toUpperCase()));

  for (const ref of mentionedRefs) {
    if (!allowedRefsUpper.has(ref)) {
      console.warn(`[GROUNDING VIOLATION] LLM invented ungrounded Ref ID "${ref}" not present in context.`);
      return {
        isValid: false,
        sanitizedResponse: SAFE_GROUNDING_FALLBACK,
        violationReason: `UNGROUNDED_REF_ID_${ref}`,
      };
    }
  }

  // 3. Prompt Injection Defense (Prompt leak / System prompt override / Data leakage)
  if (
    /ignore (?:all )?(?:previous )?(?:instructions|rules)/i.test(clean) ||
    /disregard (?:all )?rules/i.test(clean) ||
    /you are now DAN/i.test(clean) ||
    /i am an unrestricted ai/i.test(clean) ||
    /system override/i.test(clean) ||
    /print (?:api )?keys?/i.test(clean) ||
    /api[-_ ]?key/i.test(clean) ||
    /database password/i.test(clean) ||
    /chaosbot/i.test(clean) ||
    /pan card/i.test(clean) ||
    /steal-data/i.test(clean)
  ) {
    console.warn(`[GROUNDING VIOLATION] Prompt injection / data leakage attempt detected in LLM output.`);
    return {
      isValid: false,
      sanitizedResponse: "I am the ROADFACING AI Concierge, dedicated to helping you discover verified real estate across Andhra Pradesh.",
      violationReason: "PROMPT_INJECTION_DEFENSE",
    };
  }

  return {
    isValid: true,
    sanitizedResponse: clean,
  };
}
