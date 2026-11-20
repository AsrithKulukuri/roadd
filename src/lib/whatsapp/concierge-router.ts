import { extractAndNormalizeRefId } from "@/lib/whatsapp/whatsapp-concierge";
import { parseSearchIntent } from "@/lib/search-engine";
import { isSiteVisitIntent } from "@/lib/whatsapp/site-visit-engine";
import { parseFinancialQuery } from "@/lib/whatsapp/financial-calculators";

export type RoutingBranch =
  | "compliance_stop"
  | "compliance_start"
  | "human_agent_active"
  | "human_agent_escalation"
  | "ref_id_lookup"
  | "site_visit_booking"
  | "financial_calculator"
  | "deterministic_faq"
  | "deterministic_greeting"
  | "repeat_failure_signal"
  | "structured_search"
  | "llm_fallback";

export interface RoutingClassification {
  branch: RoutingBranch;
  normalizedQuery: string;
  extractedRefId?: string;
  repeatCount?: number;
}

/**
 * Single Fixed Routing Order:
 * compliance (STOP/START) > human-agent session > bot identity check > escalation intent > prompt-injection intercept >
 * ref-ID lookup > site visit booking > deterministic FAQ/greeting > repeat failure signal > structured search > LLM fallback
 */
export function classifyInboundRouting(params: {
  text: string;
  isAgentActiveSession: boolean;
  repeatCount: number;
}): RoutingClassification {
  const rawText = String(params.text || "").trim();
  const norm = rawText.toLowerCase();
  const normalizedKeyword = rawText.toUpperCase().replace(/[^A-Z0-9]/g, "");

  // 1. Compliance: STOP / Opt-Out
  const isStop =
    ["STOP", "UNSUBSCRIBE", "CANCEL", "END", "QUIT", "STOPALL"].includes(normalizedKeyword) ||
    /\b(?:stop\s+sending|unsubscribe\s+me|please\s+unsubscribe|opt\s*out)\b/i.test(norm);
  if (isStop) {
    return { branch: "compliance_stop", normalizedQuery: norm };
  }

  // 1b. Compliance: START / Opt-In
  const isStart = ["START", "UNSTOP", "RESUME", "RESTART", "OPTIN"].includes(normalizedKeyword);
  if (isStart) {
    return { branch: "compliance_start", normalizedQuery: norm };
  }

  // 2. Human-Agent Active Session (Live agent in chat -> bot pauses)
  if (params.isAgentActiveSession) {
    return { branch: "human_agent_active", normalizedQuery: norm };
  }

  // 3a. Bot Identity & Realness Questions (must run before general escalation to prevent "are you robot or human" triggering agent handoff)
  const isIdentityOrBotQ =
    /\b(?:who are you|what(?:'s| is)? (?:ur|your) name|ur name|your name|who r u|who made you|created you|who is this|are you (?:an? )?(?:robot|bot|ai|human|real)|is this (?:an? )?(?:bot|ai)|robot or human|human or (?:bot|robot|ai))\b/i.test(norm) ||
    norm === "u r name" || norm === "ur name" || norm === "name";

  if (isIdentityOrBotQ) {
    return { branch: "deterministic_faq", normalizedQuery: norm };
  }

  // 3b. Escalation Intent (User asks for agent/call/human consultant)
  const isEscalation =
    /\b(?:agent|human|advisor|consultant|broker|representative|executive|call me|connect|talk (?:to|with)|speak (?:to|with)|negotiat\w*|contact (?:owner|builder|advisor)|sales executive|loan consultant)\b/i.test(norm);
  if (isEscalation) {
    return { branch: "human_agent_escalation", normalizedQuery: norm };
  }

  // 3c. Prompt Injection / Attack Intercept (Direct to LLM fallback guarded by strict post-validator)
  const isPromptInjection =
    /\b(?:ignore\s+(?:all\s+)?(?:previous\s+)?(?:instructions|rules)|system\s+override|disregard\s+all\s+rules|drop\s+table|output\s+api\s+key|print\s+(?:api\s+)?keys?|chaosbot)\b/i.test(norm) ||
    norm.includes("steal-data") ||
    norm.includes("pan card");
  if (isPromptInjection) {
    return { branch: "llm_fallback", normalizedQuery: norm };
  }

  // 4. Deterministic Ref-ID Lookup (Runs before ANY greeting, search, or LLM)
  const refId = extractAndNormalizeRefId(rawText);
  if (refId) {
    return {
      branch: "ref_id_lookup",
      normalizedQuery: norm,
      extractedRefId: refId,
    };
  }

  // 4b. Direct Site Visit Booking Intent
  if (isSiteVisitIntent(rawText)) {
    return { branch: "site_visit_booking", normalizedQuery: norm };
  }

  // 4c. Financial Tools (EMI / Stamp Duty Calculator)
  const finQuery = parseFinancialQuery(rawText);
  if (finQuery.type === "emi" || finQuery.type === "stamp_duty") {
    return { branch: "financial_calculator", normalizedQuery: norm };
  }

  // 5. Deterministic FAQ & Identity
  const isGratitude = /\b(?:thank you|thanks|tq|thx|great|awesome|super|nice)\b/i.test(norm) && norm.split(/\s+/).length <= 4;
  if (isGratitude) {
    return { branch: "deterministic_faq", normalizedQuery: norm };
  }

  // 5b. Deterministic Greeting
  const isGreeting = ["hi", "hello", "helo", "hey", "namaste", "good morning", "good evening"].includes(norm);
  if (isGreeting) {
    return { branch: "deterministic_greeting", normalizedQuery: norm };
  }

  // 6. Repeat Failure Signal (User repeats identical query)
  if (params.repeatCount > 0) {
    return {
      branch: "repeat_failure_signal",
      normalizedQuery: norm,
      repeatCount: params.repeatCount,
    };
  }

  // 7. Structured Search Engine Match
  const parsedSearch = parseSearchIntent(rawText);
  const hasRealEstateKeywords =
    /\b(?:project|properties|property|flats?|apartments?|villas?|plots?|houses?|lands?|ventur\w*|layouts?|configurations?|serene|heights|residency|towers?|budget|cost|price|unnai|unnaya|kavali)\b/i.test(norm) ||
    /[\u0C00-\u0C7F]/.test(norm); // Telugu script queries

  const hasStructuredCriteria =
    parsedSearch.locationKeywords.length > 0 ||
    parsedSearch.bhks.length > 0 ||
    parsedSearch.propertyTypes.length > 0 ||
    parsedSearch.minPrice !== undefined ||
    parsedSearch.maxPrice !== undefined ||
    (parsedSearch.specificKeywords.length > 0 && hasRealEstateKeywords);

  if (hasStructuredCriteria) {
    return { branch: "structured_search", normalizedQuery: norm };
  }

  // 8. Grounded LLM Fallback (General real-estate dialogue & advice)
  return { branch: "llm_fallback", normalizedQuery: norm };
}
