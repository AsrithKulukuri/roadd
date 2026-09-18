import { timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function reply(body: string, status: number) {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

// Meta verifies ownership of this callback before allowing it to be saved.
export function GET(request: Request) {
  const expectedToken = process.env.META_WHATSAPP_VERIFY_TOKEN?.trim();
  if (!expectedToken) return reply("Webhook verification is not configured.", 503);

  const params = new URL(request.url).searchParams;
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");
  if (params.get("hub.mode") !== "subscribe" || !token || !challenge) {
    return reply("Invalid verification request.", 400);
  }

  const actual = Buffer.from(token);
  const expected = Buffer.from(expectedToken);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return reply("Verification token mismatch.", 403);
  }

  return reply(challenge, 200);
}

// Do not acknowledge and discard messages before Cloud API processing is wired up.
export function POST() {
  return reply("Meta WhatsApp event processing is not configured yet.", 503);
}
