// Analytics ingest + rollups (BACKEND-SCHEMA-API.md §8). A thin first-party
// layer: batch event ingest, session tracking, and a nightly rollup that
// aggregates events + joins live tables (cost, open-rate, DAU) into
// metric_rollups_daily. In production, raw events would also/instead flow to
// PostHog; this layer is what dashboards join against.

import { analyticsRepo } from '../repositories/index.mjs';
import { todayInTz, formatYmdInTz } from '../lib/time.mjs';
import { childLogger } from '../config/logger.mjs';

const log = childLogger('analytics.service');

/** Batch-ingest client events. Tolerant: bad rows are skipped, not fatal. */
export async function ingest(userId, deviceId, events) {
  const rows = (events ?? [])
    .filter((e) => e && typeof e.event_name === 'string')
    .map((e) => ({
      user_id: userId ?? null,
      device_id: deviceId ?? null,
      session_id: e.session_id ?? null,
      event_name: e.event_name,
      properties: e.properties ?? null,
      app_version: e.app_version ?? null,
      platform: e.platform ?? null,
      ts: e.ts ? new Date(e.ts) : new Date(),
    }));
  await analyticsRepo.insertEvents(rows);
  return { ingested: rows.length };
}

/** Record a single server-side event (used by services for funnel tracking). */
export async function track(eventName, { userId, deviceId, properties } = {}) {
  try {
    await analyticsRepo.insertEvent({
      user_id: userId ?? null,
      device_id: deviceId ?? null,
      event_name: eventName,
      properties: properties ?? null,
    });
  } catch (err) {
    // Analytics must never break the request path.
    log.warn({ err, eventName }, 'analytics track failed (ignored)');
  }
}

/**
 * Compute and upsert daily metric rollups for a day (defaults to today UTC).
 * Run nightly by the rollup worker.
 */
export async function rollupDay(day = todayInTz('UTC')) {
  const [dau, promptsCreated, contentViewed, paywallShown, costMicros, openRate] = await Promise.all([
    analyticsRepo.dailyActiveUsers(day),
    analyticsRepo.countEvents('prompt_created', day),
    analyticsRepo.countEvents('content_viewed', day),
    analyticsRepo.countEvents('paywall_shown', day),
    analyticsRepo.generationCostMicros(day),
    analyticsRepo.notificationOpenRate(day),
  ]);

  const metrics = {
    dau,
    prompts_created: promptsCreated,
    content_viewed: contentViewed,
    paywall_shown: paywallShown,
    gen_cost_usd: costMicros / 1e6,
    notif_open_rate: Number(openRate.toFixed(4)),
  };

  for (const [metric, value] of Object.entries(metrics)) {
    await analyticsRepo.upsertRollup(day, metric, {}, value);
  }
  log.info({ day, metrics }, 'daily rollup complete');
  return { day, metrics };
}

export async function metricsForDay(day) {
  return analyticsRepo.rollupsForDay(day);
}

export { formatYmdInTz };
