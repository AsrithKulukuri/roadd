const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(file, mocks) {
  const module = { exports: {} };
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  new Function('require', 'module', 'exports', output)((name) => {
    if (name in mocks) return mocks[name];
    if (name.startsWith('@/')) throw new Error('Unexpected dependency: ' + name);
    return require(name);
  }, module, module.exports);
  return module.exports;
}
function fixture(dbError = null) {
  const inserts = [], calls = [];
  const db = {
    from: () => ({ insert: async (value) => { inserts.push(value); return { error: dbError }; } }),
    rpc: async (name, args) => { calls.push({ name, args }); return { error: dbError }; },
  };
  const api = load('src/lib/whatsapp/message-log.ts', {
    '@/lib/supabase-admin': { supabaseAdmin: db },
    '@/lib/whatsapp/whatsapp-share': { formatWhatsAppPhone: value => value.replace(/\D/g, '') },
    './wasender-message-id': { resolveWasenderMessageId: async () => 'WA-RECEIPT-ID' },
  });
  return { ...api, inserts, calls };
}
const input = { phone: '+919000000001', provider: 'meta', messageType: 'text', message: 'Visit tomorrow', recipientType: 'builder' };
test('send accepted is not reported as delivered; recipient and content retained', async () => {
  const f = fixture();
  await f.trackWhatsAppSend(input, async () => ({ success: true, id: 'wamid.1' }));
  assert.equal(f.inserts[0].recipient_type, 'builder');
  assert.equal(f.inserts[0].message_body, input.message);
  assert.equal(f.calls[0].args.p_status, 'accepted');
  assert.equal(f.calls[0].args.p_message_id, 'wamid.1');
});
test('OTP and failure echo are redacted; signed media query is stripped', async () => {
  const f = fixture();
  await f.trackWhatsAppSend({ ...input, messageType: 'otp', message: 'Code 123456', mediaUrl: 'https://s3.example/file?secret=x' }, async () => ({ success: false, error: 'Code 123456 rejected' }));
  assert.ok(!JSON.stringify([f.inserts, f.calls]).includes('123456'));
  assert.equal(f.inserts[0].media_url, 'https://s3.example/file');
  assert.equal(f.calls[0].args.p_status, 'failed');
});
test('simulated sends stay simulated and do not resolve a provider receipt id', async () => {
  const f = fixture();
  await f.trackWhatsAppSend({ ...input, provider: 'wasender' }, async () => ({ success: true, simulated: true, id: 'mock-1' }));
  assert.equal(f.calls[0].args.p_status, 'simulated');
  assert.equal(f.calls[0].args.p_message_id, 'mock-1');
});
test('fallback provider and its receipt ID are tracked', async () => {
  const f = fixture();
  await f.trackWhatsAppSend(input, async () => ({ success: true, provider: 'wasender', id: '123' }));
  assert.equal(f.calls[0].args.p_provider, 'wasender');
  assert.equal(f.calls[0].args.p_message_id, 'WA-RECEIPT-ID');
});
test('unexpected send exception becomes a failed log', async () => {
  const f = fixture();
  const result = await f.trackWhatsAppSend(input, async () => { throw new Error('network'); });
  assert.equal(result.success, false);
  assert.equal(f.calls[0].args.p_status, 'failed');
});
test('database failure never resends a message', async () => {
  const f = fixture({ message: 'offline' });
  let sends = 0;
  const result = await f.trackWhatsAppSend(input, async () => { sends++; return { success: true }; });
  assert.equal(sends, 1);
  assert.equal(result.success, true);
});
test('receipt seconds and milliseconds normalize equally; unsupported events ignored', async () => {
  const f = fixture();
  await f.recordWhatsAppReceipt('meta', 'one', 'read', '1751297488');
  await f.recordWhatsAppReceipt('wasender', 'two', 'read', 1751297488000);
  await f.recordWhatsAppReceipt('wasender', 'two', 'pending', 1751297488000);
  assert.equal(f.calls.length, 2);
  assert.equal(f.calls[0].args.p_occurred_at, f.calls[1].args.p_occurred_at);
});
test('receipt persistence failure propagates so webhook can request retry', async () => {
  const f = fixture({ message: 'offline' });
  await assert.rejects(f.recordWhatsAppReceipt('meta', 'one', 'read', 1751297488));
});
test('admin logs endpoint rejects unauthorized access before database lookup', async () => {
  const route = load('src/app/api/admin/whatsapp/logs/route.ts', {
    'next/server': { NextResponse: Response },
    '@/lib/server-auth-guard': { requireAdmin: async () => ({ errorResponse: new Response('Forbidden', { status: 403 }) }) },
    '@/lib/supabase-admin': { supabaseAdmin: { from: () => { throw new Error('Must not query'); } } },
    '@/lib/whatsapp/wasender-message-id': {},
  });
  assert.equal((await route.GET(new Request('https://example.test/api/admin/whatsapp/logs'))).status, 403);
});

function webhookFixture(provider, record = async () => {}) {
  return load(`src/app/api/webhooks/${provider === 'meta' ? 'meta-whatsapp' : 'wasender'}/route.ts`, {
    'next/server': { NextResponse: Response },
    '@/lib/wasender': { getSanitizedEnv: () => 'test-secret', WasenderService: {} },
    '@/lib/whatsapp-audience': { normalizeWhatsAppPhone: value => value },
    '@/lib/supabase-admin': { supabaseAdmin: {} },
    '@/lib/whatsapp/whatsapp-concierge': { processInboundWhatsAppMessage: () => { throw new Error('Receipt routed to bot'); } },
    '@/lib/whatsapp/message-log': { recordWhatsAppReceipt: record },
  });
}
test('Wasender numeric read receipt records the message key and timestamp', async () => {
  const calls = [];
  const route = webhookFixture('wasender', async (...args) => calls.push(args));
  const response = await route.POST(new Request('https://example.test/webhook', { method: 'POST', headers: { 'x-webhook-signature': 'test-secret' }, body: JSON.stringify({ event: 'messages.update', timestamp: 1751297488000, data: { key: { id: 'WA1' }, update: { status: 4 } } }) }));
  assert.equal(response.status, 200);
  assert.deepEqual(calls[0].slice(0, 4), ['wasender', 'WA1', 'read', 1751297488000]);
});
test('Wasender missing webhook secret header is rejected', async () => {
  const response = await webhookFixture('wasender').POST(new Request('https://example.test/webhook', { method: 'POST', body: '{}' }));
  assert.equal(response.status, 401);
});
test('Meta missing signature is rejected when app secret is configured', async () => {
  const previous = process.env.META_APP_SECRET;
  process.env.META_APP_SECRET = 'test-app-secret';
  try {
    const response = await webhookFixture('meta').POST(new Request('https://example.test/webhook', { method: 'POST', body: '{}' }));
    assert.equal(response.status, 401);
  } finally {
    if (previous === undefined) delete process.env.META_APP_SECRET; else process.env.META_APP_SECRET = previous;
  }
});
