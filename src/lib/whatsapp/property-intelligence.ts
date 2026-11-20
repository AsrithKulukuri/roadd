import { extractAndNormalizeRefId, formatLocation, lookupExactRefId } from "@/lib/whatsapp/whatsapp-concierge";
import { formatPriceCompact } from "@/lib/utils";

/**
 * Extracts all distinct Reference IDs mentioned in a single user message.
 * Supports:
 * - "compare REF0001 and REF0002" -> ["REF0001", "REF0002"]
 * - "details of ref 001, ref003 and prop104" -> ["REF0001", "REF0003", "REF0104"]
 */
export function extractAllRefIds(text: string): string[] {
  if (!text || !text.trim()) return [];

  const found = new Set<string>();
  const patterns = [
    /\bref[\s\-_]*0*(\d{1,6})\b/gi,
    /\b(?:prop|property|road)[\s\-_]*0*(\d{1,6})\b/gi,
    /#?REF[\s\-_]*0*(\d{1,6})\b/gi,
  ];

  for (const regex of patterns) {
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (match[1]) {
        found.add(`REF${match[1].padStart(4, "0")}`);
      }
    }
  }

  return Array.from(found);
}

export interface AnaphoraResolution {
  isAnaphoric: boolean;
  type: "single_selection" | "comparison" | "refinement" | "none";
  targetRefId?: string;
  compareRefIds?: string[];
  refinementFilters?: {
    maxPrice?: number;
    minPrice?: number;
    bhk?: number;
    location?: string;
    readyToMoveOnly?: boolean;
    gatedOnly?: boolean;
  };
}

/**
 * Resolves conversational follow-up queries that reference previously displayed items.
 * Handles:
 * - "show the second one", "2nd one", "#2", "view the 1st one", "open third"
 * - "compare 1 and 2", "compare both", "compare first and second"
 * - "ready to move only", "under 90 lakhs", "only 3 bhk"
 */
export function resolveAnaphoricQuery(text: string, lastDisplayedRefIds: string[] = []): AnaphoraResolution {
  if (!text || !text.trim()) {
    return { isAnaphoric: false, type: "none" };
  }

  const norm = text.toLowerCase().trim();

  // 1. Comparison of previously displayed items (e.g. "compare 1 and 2", "compare both", "compare first and second")
  const isCompareBoth =
    /\b(?:compare\s+(?:both|the\s+two|them)|compare\s+(?:1\s*(?:and|&)\s*2|first\s*(?:and|&)\s*second))\b/i.test(norm);

  if (isCompareBoth && lastDisplayedRefIds.length >= 2) {
    return {
      isAnaphoric: true,
      type: "comparison",
      compareRefIds: [lastDisplayedRefIds[0], lastDisplayedRefIds[1]],
    };
  }

  // 2. Single item selection by ordinal or index (check specific ordinals before generic 'one')
  const ordinalMap: Array<{ pattern: RegExp; index: number }> = [
    { pattern: /\b(?:the\s+)?(?:2nd|second)\b|\b(?:the\s+)?second\s+one\b|(?:^|\s)#\s*2\b/i, index: 1 },
    { pattern: /\b(?:the\s+)?(?:3rd|third)\b|\b(?:the\s+)?third\s+one\b|(?:^|\s)#\s*3\b/i, index: 2 },
    { pattern: /\b(?:the\s+)?(?:4th|fourth)\b|\b(?:the\s+)?fourth\s+one\b|(?:^|\s)#\s*4\b/i, index: 3 },
    { pattern: /\b(?:the\s+)?(?:1st|first)\b|\b(?:the\s+)?first\s+one\b|(?:^|\s)#\s*1\b/i, index: 0 },
  ];

  const isSelectionIntent =
    /\b(?:show|view|open|details|tell me about|send|select|give me|check)\b/i.test(norm) ||
    /^(?:1st|2nd|3rd|#1|#2|#3|first|second|third|the second one|the first one|the 2nd one)$/i.test(norm);

  if (isSelectionIntent && lastDisplayedRefIds.length > 0) {
    for (const { pattern, index } of ordinalMap) {
      if (pattern.test(norm)) {
        const refId = lastDisplayedRefIds[index];
        if (refId) {
          return {
            isAnaphoric: true,
            type: "single_selection",
            targetRefId: refId,
          };
        }
      }
    }
  }

  // 3. Contextual search refinement without location (e.g. "ready to move only", "gated community only")
  const isRefinementOnly =
    /^(?:ready\s*to\s*move(?:\s*only)?|under\s*\d+(?:\.\d+)?\s*(?:cr|crore|lakhs?|l)|only\s*\d+\s*bhk|gated\s*only)$/i.test(norm);

  if (isRefinementOnly) {
    const readyToMove = /ready\s*to\s*move/i.test(norm);
    const gated = /gated/i.test(norm);
    return {
      isAnaphoric: true,
      type: "refinement",
      refinementFilters: {
        readyToMoveOnly: readyToMove,
        gatedOnly: gated,
      },
    };
  }

  return { isAnaphoric: false, type: "none" };
}

/**
 * Formats a clean, side-by-side WhatsApp comparison card for 2 listings.
 */
export function formatMultiPropertyComparisonCard(
  items: Array<{ item: any; type: "project" | "property"; refId: string; canonicalUrl: string }>
): string {
  if (items.length === 0) return "";

  const refLabels = items.map((i) => i.refId).join(" vs ");
  let card = `⚖️ *ROADFACING Listing Comparison (${refLabels})*\n\n`;

  items.forEach((entry, idx) => {
    const it = entry.item;
    const title = it.name || it.title || "Verified Listing";
    const loc = formatLocation(it);

    let priceStr = "Contact for Pricing";
    if (it.minPrice && it.maxPrice) {
      priceStr = `${formatPriceCompact(it.minPrice)} - ${formatPriceCompact(it.maxPrice)}`;
    } else if (it.minPrice) {
      priceStr = `Starting at ${formatPriceCompact(it.minPrice)}`;
    } else if (typeof it.price === "number") {
      priceStr = formatPriceCompact(it.price);
    }

    const configs = Array.isArray(it.configurations)
      ? it.configurations.map((c: any) => c.label || `${c.bedrooms} BHK`).join(", ")
      : it.bedrooms ? `${it.bedrooms} BHK` : "Custom";

    const status = it.constructionStatus || it.status || "Ready to Move";

    card += `📌 *Option ${idx + 1}: ${entry.refId} — ${title}*\n`;
    card += `📍 *Location:* ${loc || "Andhra Pradesh"}\n`;
    card += `💰 *Price:* ${priceStr}\n`;
    card += `🛏️ *Configurations:* ${configs}\n`;
    card += `📊 *Status:* ${String(status).replace("-", " ").toUpperCase()}\n`;
    card += `🔗 *View Listing:* ${entry.canonicalUrl}\n\n`;
  });

  card += `💡 *Summary Advice:*\n`;
  if (items.length >= 2) {
    const i1 = items[0];
    const i2 = items[1];
    card += `• *${i1.refId}* (${i1.item.name || i1.item.title}) offers great accessibility in ${formatLocation(i1.item)}.\n`;
    card += `• *${i2.refId}* (${i2.item.name || i2.item.title}) offers premium specifications in ${formatLocation(i2.item)}.\n\n`;
  }

  card += `_Reply "Book site visit for ${items[0].refId}" or "Talk to agent" anytime!_`;
  return card;
}
