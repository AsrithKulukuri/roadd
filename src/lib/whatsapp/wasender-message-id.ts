/** WaSender's API msgId differs from the WhatsApp key.id used in receipts. */
export async function resolveWasenderMessageId(messageId: string): Promise<string> {
  if (!/^\d+$/.test(messageId)) return messageId;
  const clean = (value?: string) => (value || "").trim().replace(/^["']|["']$/g, "").trim();
  const apiKey = clean(process.env.WASENDER_API_KEY);
  if (!apiKey) return messageId;
  const base = (clean(process.env.WASENDER_API_URL) || clean(process.env.WASENDER_BASE_URL) || "https://www.wasenderapi.com/api")
    .replace(/\/+$/, "").replace(/\/send-message$/, "");
  try {
    const response = await fetch(`${base}/messages/${encodeURIComponent(messageId)}/info`, {
      headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(3000), cache: "no-store",
    });
    if (!response.ok) return messageId;
    const body = await response.json();
    return String(body.data?.key?.id || body.data?.id || messageId);
  } catch {
    return messageId;
  }
}
