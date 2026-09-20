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
  await f.trackWhatsAppSend({ ...input, provider: 'meta' }, async () => ({ success: true, simulated: true, id: 'mock-1' }));
  assert.equal(f.calls[0].args.p_status, 'simulated');
  assert.equal(f.calls[0].args.p_message_id, 'mock-1');
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
  await f.recordWhatsAppReceipt('meta', 'two', 'read', 1751297488000);
  await f.recordWhatsAppReceipt('meta', 'two', 'pending', 1751297488000);
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
  });
  assert.equal((await route.GET(new Request('https://example.test/api/admin/whatsapp/logs'))).status, 403);
});

function webhookFixture(provider, record = async () => {}) {
  return load('src/app/api/webhooks/meta-whatsapp/route.ts', {
    'next/server': { NextResponse: Response },
    '@/lib/whatsapp-service': { getSanitizedEnv: () => 'test-secret', WhatsAppService: {} },
    '@/lib/whatsapp-audience': { normalizeWhatsAppPhone: value => value },
    '@/lib/supabase-admin': { supabaseAdmin: {} },
    '@/lib/whatsapp/whatsapp-concierge': { processInboundWhatsAppMessage: () => { throw new Error('Receipt routed to bot'); } },
    '@/lib/whatsapp/message-log': { recordWhatsAppReceipt: record },
  });
}
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

test('all send methods use Meta and log exactly once even if legacy provider is configured', async () => {
  const calls = [], logs = [];
  const previous = process.env.WHATSAPP_PROVIDER;
  process.env.WHATSAPP_PROVIDER = 'wasender';
  const service = load('src/lib/whatsapp-service.ts', {
    '@/lib/meta-whatsapp': { getMetaWhatsAppMode: () => 'live', MetaWhatsAppService: Object.fromEntries(['sendOTPMessage','sendTextMessage','sendImageMessage','sendTemplateMessage'].map(name => [name, async () => { calls.push(name); return { success: true, id: 'wamid.test' }; }])) },
    '@/lib/whatsapp/message-log': { trackWhatsAppSend: async (input, send) => { logs.push(input); return send(); } },
  });
  try {
    await service.WhatsAppService.sendOTPMessage('919000000001','123456');
    await service.WhatsAppService.sendTextMessage('919000000001','hello');
    await service.WhatsAppService.sendImageMessage('919000000001','https://example.com/photo','caption');
    await service.WhatsAppService.sendTemplateMessage('919000000001','template');
    assert.equal(service.getWhatsAppProvider(),'meta');
    assert.equal(calls.length,4); assert.equal(logs.length,4);
    assert.ok(logs.every(x => x.provider === 'meta'));
    assert.ok(!JSON.stringify(logs).includes('123456'));
  } finally {
    if(previous === undefined) delete process.env.WHATSAPP_PROVIDER; else process.env.WHATSAPP_PROVIDER=previous;
  }
});
test('site visit notification uses approved template and normalized one-body parameter', async () => {
  let args;
  const helper = load('src/lib/whatsapp/site-visit-notification.ts', {
    '@/lib/whatsapp-service': { WhatsAppService: { sendTextMessage: async (...value) => { args=value; return { success:true }; } } },
  });
  await helper.sendSiteVisitNotification('919000000001','Visit\n\nTomorrow\t3PM',{ requestId:'visit-test', recipientType:'builder' });
  assert.equal(args[2].templateName,process.env.META_SITE_VISIT_TEMPLATE_NAME || 'road_alert_notification');
  assert.equal(args[2].components[0].parameters[0].text,'Visit Tomorrow 3PM');
  assert.equal(args[2].recipientType,'builder');
});
test('valid Meta read receipt preserves provider timestamp', async () => {
  const calls=[]; const previous=process.env.META_APP_SECRET;
  process.env.META_APP_SECRET='test-app-secret';
  try {
    const payload=JSON.stringify({object:'whatsapp_business_account',entry:[{changes:[{field:'messages',value:{statuses:[{id:'wamid.test',status:'read',timestamp:'1751297488'}]}}]}]});
    const signature='sha256='+require('node:crypto').createHmac('sha256','test-app-secret').update(payload).digest('hex');
    const response=await webhookFixture('meta',async(...args)=>calls.push(args)).POST(new Request('https://example.test/webhook',{method:'POST',headers:{'x-hub-signature-256':signature},body:payload}));
    assert.equal(response.status,200); assert.deepEqual(calls[0].slice(0,4),['meta','wamid.test','read','1751297488']);
  } finally {if(previous===undefined)delete process.env.META_APP_SECRET;else process.env.META_APP_SECRET=previous;}
});
