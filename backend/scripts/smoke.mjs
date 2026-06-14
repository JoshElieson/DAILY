// End-to-end smoke test against the in-memory (pg-mem) DB and mock Claude.
// Boots the real app in-process, then exercises the core flow over HTTP:
//   anonymous bootstrap → create prompt (generates today) → today payload →
//   regenerate (spends a credit) → register device → schedule → worker ticks →
//   notifications → analytics → subscription sync → health.
//
// Run: npm run smoke   (no external services required)

import assert from 'node:assert/strict';
import { initPool } from '../src/db/pool.mjs';
import { runMigrations } from '../src/db/migrate.mjs';
import { seedTemplates } from '../src/db/seed.mjs';
import { createApp } from '../src/server.mjs';
import { ticks } from '../src/workers/index.mjs';

let passed = 0;
const check = (label, cond) => {
  assert.ok(cond, `FAILED: ${label}`);
  passed++;
  console.log(`  ✓ ${label}`);
};

async function main() {
  await initPool();
  await runMigrations();
  await seedTemplates();

  const app = createApp();
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;

  const api = async (method, path, { token, body } = {}) => {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    return { status: res.status, json };
  };

  console.log('\n— Health —');
  const health = await api('GET', '/healthz');
  check('healthz ok', health.status === 200 && health.json.subsystems.db === 'up');
  check('anthropic is mock', health.json.capabilities.anthropic === 'mock');

  console.log('\n— Auth —');
  const boot = await api('POST', '/v1/auth/anonymous', {
    body: { timezone: 'America/Denver', device: { platform: 'ios', install_id: 'install-123' } },
  });
  check('anonymous bootstrap 201', boot.status === 201);
  const token = boot.json.tokens.access_token;
  const refreshToken = boot.json.tokens.refresh_token;
  check('got access + refresh tokens', Boolean(token && refreshToken));
  check('user is anonymous', boot.json.user.is_anonymous === true);

  const me = await api('GET', '/v1/me', { token });
  check('GET /me works', me.status === 200 && me.json.user.id === boot.json.user.id);

  const refreshed = await api('POST', '/v1/auth/refresh', { body: { refresh_token: refreshToken } });
  check('refresh rotates token', refreshed.status === 200 && refreshed.json.access_token);

  console.log('\n— Templates —');
  const templates = await api('GET', '/v1/templates', { token });
  check('templates seeded', templates.status === 200 && templates.json.data.length >= 5);

  console.log('\n— Prompts + generation —');
  const created = await api('POST', '/v1/prompts', {
    token,
    body: { type: 'reflection', intent: 'help me reflect each morning', time_of_day: '08:00' },
  });
  check('create prompt 201', created.status === 201);
  check('initial content generated', Boolean(created.json.content?.body));
  const promptId = created.json.prompt.id;

  const today = await api('GET', '/v1/content/today', { token });
  check('today payload has the entry', today.status === 200 && today.json.entries.length === 1);
  const contentId = today.json.entries[0].id;

  console.log('\n— Free-tier limit —');
  await api('POST', '/v1/prompts', { token, body: { type: 'motivation', intent: 'second prompt' } });
  const third = await api('POST', '/v1/prompts', { token, body: { type: 'habit', intent: 'third prompt' } });
  check('free tier caps at 2 prompts (402)', third.status === 402);

  console.log('\n— Credits + regenerate —');
  const credits = await api('GET', '/v1/credits', { token });
  check('daily regen credit granted', credits.status === 200 && credits.json.balance >= 1);
  const regen = await api('POST', `/v1/content/${contentId}/regenerate`, { token });
  check('regenerate 201 (variant 1)', regen.status === 201 && regen.json.content.variant === 1);
  const regen2 = await api('POST', `/v1/content/${contentId}/regenerate`, { token });
  check('second regenerate blocked (402, out of credits)', regen2.status === 402);

  console.log('\n— Schedules —');
  const sched = await api('GET', `/v1/prompts/${promptId}/schedules`, { token });
  check('default schedule exists with next_run_at', sched.json.data.length === 1 && sched.json.data[0].next_run_at);

  console.log('\n— Workers —');
  const gen = await ticks.generationTick();
  check('generation tick runs', typeof gen.processed === 'number');
  const notif = await ticks.notificationTick();
  check('notification tick runs', typeof notif.created === 'number');

  console.log('\n— Notifications —');
  const notifs = await api('GET', '/v1/notifications', { token });
  check('notifications listable', notifs.status === 200 && Array.isArray(notifs.json.data));

  console.log('\n— Analytics + rollup —');
  await api('POST', '/v1/analytics/events', {
    token,
    body: { events: [{ event_name: 'content_viewed', platform: 'ios' }] },
  });
  const roll = await ticks.rollupTick();
  check('rollup produces metrics', roll && typeof roll.metrics.dau === 'number');

  console.log('\n— Subscriptions —');
  const subSync = await api('POST', '/v1/subscriptions/sync', {
    token,
    body: { customer_info: { entitlements: { active: { daily_plus: { expires_date_ms: Date.now() + 86400000 } } } } },
  });
  check('subscription sync activates daily_plus', subSync.status === 200 && subSync.json.daily_plus === true);
  // Now a 3rd prompt should be allowed (Plus = unlimited).
  const fourth = await api('POST', '/v1/prompts', { token, body: { type: 'journal', intent: 'plus prompt' } });
  check('Plus user bypasses prompt cap', fourth.status === 201);

  console.log('\n— RevenueCat webhook —');
  const webhook = await api('POST', '/v1/webhooks/revenuecat', {
    body: {
      event: {
        type: 'CANCELLATION',
        id: 'evt-1',
        app_user_id: boot.json.user.id,
        product_id: 'daily_plus_annual',
        original_transaction_id: 'otx-1',
        environment: 'SANDBOX',
      },
    },
  });
  check('webhook accepted', webhook.status === 200);

  console.log('\n— Error handling —');
  const noauth = await api('GET', '/v1/prompts');
  check('401 without token', noauth.status === 401 && noauth.json.error.code === 'unauthorized');
  const badbody = await api('POST', '/v1/prompts', { token, body: { type: 'nope', intent: '' } });
  check('422 on invalid body', badbody.status === 422 && badbody.json.error.code === 'validation_error');
  const missing = await api('GET', '/v1/content/00000000-0000-7000-8000-000000000000', { token });
  check('404 envelope shape', missing.status === 404 && missing.json.error.code === 'not_found');

  server.close();
  console.log(`\n✅ smoke test passed — ${passed} checks\n`);
  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌ smoke test failed:\n', err);
  process.exit(1);
});
