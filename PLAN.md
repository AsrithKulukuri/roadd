# ROADFACING WhatsApp Concierge 10/10 Upgrade Plan & Verification Report

## 1. System Architecture Audit

| Subsystem | Baseline State | Problems / Root Causes | Upgrade Status |
| :--- | :--- | :--- | :--- |
| **Webhook Delivery** (`/api/webhooks/meta-whatsapp`) | Synchronous processing inside HTTP POST handler. In-memory `processedMessageIds` map. | In-memory dedup lost on server restart. Parallel message delivery causes race conditions and out-of-order responses. Long processing risks Meta webhook timeouts (Meta retries after 15-20s). | **Complete (Phase 1)**: HMAC verification + immediate HTTP 200 response. Processing runs in background via Next.js `after()` + cross-instance distributed locks. |
| **Ref ID Intelligence** | Queries passed to intent classifier or fuzzy text search. `findItemByRefId` wasn't first-order deterministic interceptor in WhatsApp webhook. | "Ref001" treated as fuzzy search or conversational question. "Ref0001" fell into multi-item fuzzy result with count mismatch. | **Complete (Phase 0 & 2)**: Deterministic interceptor runs before LLM or fuzzy search. Normalizes `ref1`, `ref001`, `ref-0001`, `prop104`, `road-104` to `REF0001` / `REF0104`. Multi-Ref extraction & side-by-side comparison. Exact DB match. Single card. Clear not-found message on invalid IDs. |
| **Count Integrity** | Message template said `Found ${totalMatches}` while slicing top 2 projects and top 2 properties (`slice(0, 2)`). | "Found 3" but rendering only 2 items caused user confusion and contradicted the header. | **Complete (Phase 0)**: `renderedCount = renderedItems.length`. Header strictly matches rendered count. Verified with automated regression test. |
| **Site URL & Domain** | `process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://roadd-three.vercel.app"` | In dev/staging, `NEXT_PUBLIC_SITE_URL` could point to `http://localhost:3000`, sending broken links to WhatsApp users. | **Complete (Phase 0 & 1)**: `src/lib/canonical-url.ts` with Zod schema. Strictly validates absolute URL and fails in production if containing `localhost` or `127.0.0.1`. |
| **User Recognition & Greeting** | Fallback string was `"Valued Member"`, but greeting fallback previously output `"User"` or awkward headers. | Greeted with "Hello User!" when phone was not in user table instead of welcoming naturally and asking for their name once. | **Complete (Phase 0 & 4)**: Greets with natural "Hi 👋 Welcome to ROADFACING!", asks for name once, persists to `whatsapp_contacts`. Never outputs "User" or "Hello User!". Localized for Telugu script and Tenglish. |
| **Routing Order** | Ad-hoc conditional checks scattered across webhook handler and concierge. | Race conditions and priority inversion between compliance, agents, ref IDs, and searches. | **Complete (Phase 1)**: Single fixed routing function `classifyInboundRouting` strictly ordered: compliance (STOP/START) > active agent session > escalation intent > prompt injection > ref-ID lookup > deterministic FAQ/greeting > repeat failure signal > structured search > LLM fallback. |
| **Grounding & Trust** | Raw Gemini generation without output validation. | Risks hallucinating prices, availability, approvals, or unverified listings. | **Complete (Phase 1)**: `src/lib/whatsapp/grounded-guard.ts` post-validates every Ref ID, price, and URL against retrieved DB context. Replaces invalid output with safe advisor handoff. Intercepts prompt injections. |
| **Conversation Memory** | Transient memory limited to last 3 text messages in DB table. No structured slot memory. | Bot forgot preferred BHK, location, budget, or previous search results on subsequent turns. | **Complete (Phase 2)**: `whatsapp_conversation_state` stores structured slots: `stage`, `buyingRentingIntent`, `preferredLocation`, `preferredBhk`, `minBudget`, `maxBudget`, `lastDisplayedRefIds`, `lastViewedRefId`, `selectedPropertyId`, `shortlistedRefIds`, `preferredLanguage`. |
| **Anaphoric Queries** | Could not understand "show the second one", "compare them", "ready to move only". | User had to re-type queries from scratch. | **Complete (Phase 2)**: `src/lib/whatsapp/property-intelligence.ts` resolves anaphoric follow-up queries using `lastDisplayedRefIds` and conversation context. |
| **Site Visits & Financials** | No direct scheduling or financial tools in WhatsApp chat. | User had to leave chat or wait for human manual response. | **Complete (Phase 3)**: Automatic site-visit scheduling with date/time extraction, CRM ticket sync in `whatsapp_support_tickets`, plus standard Home Loan EMI and Andhra Pradesh Stamp Duty & Registration fee calculator (7.5% breakdown). |
| **Bilingual Engine** | English-only prompts and canned greetings. | Poor experience for Telugu and Tenglish speakers in AP region. | **Complete (Phase 4)**: Auto-detects Telugu script, Tenglish (Romanized Telugu), and English. Localizes greetings and passes context to Gemini 2.5 Flash for natural bilingual interactions. |
| **Evaluation Suite** | No formal automated test suite or CI evals. | Regressions could not be caught before deployment. | **Complete (Phase 1)**: 118-case comprehensive eval suite in `/evals` covering all categories. Pass rate: 100.0%. Added `npm run test:evals` and `.github/workflows/evals.yml` to block failing PRs. |
| **Observability** | Unstructured `console.log` statements without latency or SLA monitoring. | No visibility into LLM fallback rates, p95 latency, or permanent send failures. | **Complete (Phase 1)**: `src/lib/whatsapp/observability.ts` records structured metrics with SHA-256 DPDP phone anonymization, p95 latency tracking (>3s alert), and send failure alerts (>5%). |
| **Rate Limiting & Spam** | In-memory rate limits lost across serverless invocations. | Vulnerable to WhatsApp spam floods or abusive token consumption. | **Complete (Phase 1)**: `src/lib/whatsapp/rate-limiter.ts` provides persistent rate limiting (20 req/min) and pattern spam detection (repeated characters, long token flood). |
| **Health Monitoring** | No synthetic endpoint to evaluate webhook & DB health. | Outages went unnoticed until user complaints. | **Complete (Phase 4)**: `src/app/api/cron/whatsapp-health/route.ts` evaluates database connectivity, idempotency, conversation state table, and Meta Cloud API credentials. |

---

## 2. Test & Verification Results Summary

### Unit Tests (`npm run test:concierge`)
- **Total Tests**: 28
- **Passed**: 28 (100.0%)
- **Failed**: 0
- **Suites Covered**:
  - `tests/unit/phase0-concierge.test.ts` (10 tests)
    - Phase 0.1: Deterministic Ref-ID extraction & normalization
    - Phase 0.2: Exact Ref-ID DB lookup without fuzzy fallback
    - Phase 0.3: Canonical URL generator enforces production domain & forbids localhost
    - Phase 0.4: Per-phone message serialization strictly preserves arrival order
    - Phase 0.5: Persistent inbound deduplication ignores retried message IDs
    - Phase 0.6: Count integrity guarantee ("Found N" matches rendered count exactly)
    - Phase 0.7: Greeting never outputs "Hello User!" and requests name if unknown
    - Phase 0.8: Direct Ref-ID message returns single card without fuzzy search
    - Phase 0.9: Cross-instance per-phone distributed lock ensures mutual exclusion
    - Phase 0.10: Regression transcript replay (`"Hi"` $\to$ `"Ref001"` $\to$ `"Ref0001"` $\to$ `"Ref0001"`)
  - `tests/unit/phase1-reliability.test.ts` (4 tests)
    - Phase 1.1: Single fixed router correctly routes every branch
    - Phase 1.2: Grounded guard sanitizes ungrounded Ref IDs and forbidden leaks
    - Phase 1.3: Rate limiting and spam detection protects concierge
    - Phase 1.4: Observability and structured telemetry hashing complies with DPDP
  - `tests/unit/phase2-memory-intelligence.test.ts` (5 tests)
    - Phase 2.1: Multi-property ID extraction captures multiple distinct identifiers
    - Phase 2.2: Side-by-side comparison card formatting
    - Phase 2.3: Contextual anaphoric query resolution ('show the second one', 'compare 1 and 2')
    - Phase 2.4: Conversation state memory slot updates and retrieval
    - Phase 2.5: Multi-turn dialogue: search $\to$ follow-up 'show the second one' $\to$ comparison
  - `tests/unit/phase3-site-visits-calculators.test.ts` (6 tests)
    - Phase 3.1: Site visit intent detection and time-slot parsing
    - Phase 3.2: Site visit booking generates rich confirmation card & CRM lead sync
    - Phase 3.3: Home loan EMI calculator accurately computes monthly installment & interest
    - Phase 3.4: AP Stamp duty estimator calculates exact 7.5% breakdown
    - Phase 3.5: Financial calculation query parser recognizes user inquiries
    - Phase 3.6: End-to-end WhatsApp turn: EMI calculation and Site visit request
  - `tests/unit/phase4-bilingual-production.test.ts` (3 tests)
    - Phase 4.1: Bilingual language auto-detection (Telugu Script, Tenglish, English)
    - Phase 4.2: Localized greeting generation
    - Phase 4.3: Synthetic health-check endpoint evaluates system connectivity

### Concierge Eval Suite (`npm run test:evals`)
- **Total Cases**: 118
- **Passed**: 118 (100.0%)
- **Failed**: 0
- **Duration**: ~27ms
- **Category Breakdown**:
  - `ref_variants`: 18/18 (100%)
  - `structured_search`: 16/16 (100%)
  - `typos`: 10/10 (100%)
  - `telugu_tenglish`: 10/10 (100%)
  - `voice_note_transcript`: 8/8 (100%)
  - `repeats`: 6/6 (100%)
  - `compliance`: 8/8 (100%)
  - `agent_requests`: 10/10 (100%)
  - `nonsense`: 8/8 (100%)
  - `prompt_injection`: 8/8 (100%)
  - `faq_identity`: 8/8 (100%)
  - `greetings`: 8/8 (100%)

### TypeScript Compilation Check (`npm run typecheck`)
- `tsc --noEmit` exited with code 0 (0 errors).
